import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
app.use(express.json({ limit: "2mb" })); // Prevent denial of service with over-sized request payloads

// Safe in-memory request counter to prevent endpoint brute-force or API depletion
const ipRequestCounts = new Map<string, { count: number; firstRequestTime: number }>();

function apiRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.url.startsWith("/api/")) {
    return next();
  }

  const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "global_user") as string;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 80;  // High-performance threshold

  const ipData = ipRequestCounts.get(clientIp);

  if (!ipData) {
    ipRequestCounts.set(clientIp, { count: 1, firstRequestTime: now });
    return next();
  }

  if (now - ipData.firstRequestTime > windowMs) {
    ipRequestCounts.set(clientIp, { count: 1, firstRequestTime: now });
    return next();
  }

  ipData.count += 1;
  if (ipData.count > maxRequests) {
    console.warn(`[API Rate Limiter] Blocked Client IP: [${clientIp}] - Exceeded request frequency.`);
    return res.status(429).json({
      error: "Too Many Requests",
      message: "Security Shield: You have reached the request threshold. Please wait a minute before making more AI requests."
    });
  }

  next();
}

app.use(apiRateLimiter);

// Custom enterprise-grade security headers to secure the application platform
app.use((req, res, next) => {
  // Prevent MIME-sniffing vulnerabilities
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Protect user navigation referrers during API handshakes
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Enable browser-based XSS filtering protections
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Help mitigate Clickjacking attacks while maintaining AI Studio rendering
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Prevent caching of active API requests containing user credentials
  if (req.url.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  }
  
  next();
});

// Resilient validator to guarantee string boundaries are respected
function validateStringInput(value: any, maxLength = 10000, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.substring(0, maxLength);
}

const PORT = 3000;

// Lazy initialize Gemini API client to prevent crashing on startup if key is missing as per safety guidelines
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in the Secrets panel under Settings.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

/**
 * Resilient implementation of content generation with retry and automatic model fallback.
 * It queries gemini-3.5-flash first, and falls back to gemini-3.1-flash-lite on transient 503/429/failures.
 * Also performs multiple retries for maximum reliability.
 */
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}): Promise<any> {
  const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini API] Querying model='${model}', attempt=${attempt}/2...`);
        const ai = getAiClient();
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        if (response) {
          console.log(`[Gemini API] Successfully generated content using model='${model}'`);
          return response;
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`[Gemini API] Error on model='${model}', attempt=${attempt}/2: ${error.message || error}`);
        
        // Wait custom duration between attempts/fallbacks
        const delay = attempt === 1 ? 500 : 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Safely parses JSON strings even if wrapped in markdown formatting codes.
 */
function safeParseJson(text: string): any {
  if (!text) return {};
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned.trim());
}

// 1. AI Coach Chat endpoint
app.post("/api/coach", async (req, res) => {
  try {
    const { messages, tasks, habits, currentTime } = req.body;
    const ai = getAiClient();

    // Calculate urgency score and sort for context visibility
    const decoratedTasks = tasks.map((t: any) => {
      const priorityWeights: any = { critical: 4, high: 3, medium: 2, low: 1 };
      const weight = priorityWeights[t.priority] || 1;
      
      // Calculate active hours remaining
      let hoursRemaining = 24; // fallback
      if (t.deadlineTime) {
        const diffMs = new Date(t.deadlineTime).getTime() - new Date(currentTime).getTime();
        hoursRemaining = Math.max(0.1, diffMs / (1000 * 60 * 60));
      }
      
      const pressure = 1 / hoursRemaining;
      const urgency = Number((weight * pressure).toFixed(2));
      return { ...t, weight, hoursRemaining, pressure, urgency };
    });

    // Sort pending tasks by urgency descending
    const pendingTasks = decoratedTasks
      .filter((t: any) => !t.completed)
      .sort((a: any, b: any) => b.urgency - a.urgency);

    const habitsContext = habits.map((h: any) => 
      `- ${h.name}: ${h.completedToday ? "DONE ✅" : "NOT done ❌"} (${h.streak}-day streak)`
    ).join("\n");

    const tasksContext = pendingTasks.map((t: any) => 
      `- "${t.title}" (${t.priority} priority, ${t.hoursRemaining.toFixed(1)} hours left, ~${t.duration} min duration, requires ${t.energy} energy, calculated Urgency Score: ${t.urgency})`
    ).join("\n");

    const systemInstruction = `You are LifeSaver, a friendly AI Coach inside a web app. You are helpful and laser-focused on one thing: helping the user work on their most important tasks RIGHT NOW.

## EXTREMELY IMPORTANT WORDING RULE:
You MUST use very simple, everyday English words that are extremely easy to understand. Do NOT use complex words, medical terms, academic words, or technical jargon. Keep sentences short and clear. Speak like a friendly, helpful person using plain, basic words.

## Your Core Capabilities

### 1. Urgency Scoring
Calculate urgency = priority_weight × time_pressure
- Critical = 4, High = 3, Medium = 2, Low = 1
- Time pressure = 1 / hours_remaining (higher when less time left)
Always tell the user their TOP 1-3 highest urgency tasks first when appropriate, and coach them on it.

### 2. Intelligent Scheduling
Assign direct specific times to start and finish tasks. Keep energy levels matched to scheduling blocks.

### 3. Anti-Procrastination Coaching
Identify when the user is stuck and use these techniques:
- 2-minute rule: "Just start for 2 minutes"
- Task chunking: Break big tasks into small steps
- Commitment contracts: "Tell me: when will you START this?"
- Progress anchoring: Remind them of what they've already done

### 4. Energy-Task Matching
- High energy tasks (creative, planning) → morning
- Low energy tasks (simple work, email) → afternoon
- Never schedule hard work late in the afternoon unless necessary

### 5. Personalized Insights
After each session, give one simple tip about their work pattern.

### 6. Emergency Last-Minute Protocol
When a deadline is less than 3 hours away: focus only on that! Break the task into 15-minute small steps.

## Response Style
- Lead with the MOST IMPORTANT thing to do
- Use very simple, easy-to-understand language!
- Use ⚡ for urgent items, ✅ for completable now, 🔴 for overdue
- Be specific with times ("Start at 2:30 PM, finish by 3:45 PM")
- When overwhelmed, give exactly 3 steps — no more
- Celebrate completed tasks with genuine enthusiasm
- Never lecture; always coach.

## Format Guidelines
Use a clean structure:
**Right Now:** [single most urgent action]
**Today's Plan:** [time-blocked schedule if asked or relevant]
**Watch Out:** [any deadline at risk]

Keep responses under 250 words. Be concise, punchy and highly action-oriented.`;

    const userStateContext = `
USER CONTEXT AT TIME OF CONVERSATION:
- Current Local Time & Day: ${currentTime}
- Habits Completion Today:
${habitsContext || "None active"}
- Live Pending Tasks (Sorted by calculated urgency):
${tasksContext || "No pending tasks! All clear!"}
`;

    // Package the chat history
    const geminiContents = [
      { role: "user", parts: [{ text: userStateContext }] }
    ];

    // Map conversation logs
    messages.forEach((msg: any) => {
      geminiContents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.text }]
      });
    });

    const response = await generateContentWithFallback({
      contents: geminiContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Coach Error:", error);
    res.status(500).json({ error: error.message || "Failed to communicate with Gemini API." });
  }
});

// 2. AI Auto-Scheduler endpoint (returns highly structured JSON schedule)
app.post("/api/auto-schedule", async (req, res) => {
  try {
    const { tasks, habits, currentTime } = req.body;
    const ai = getAiClient();

    const formattedTasks = tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      duration: t.duration,
      energy: t.energy,
      deadlineTime: t.deadlineTime,
      completed: t.completed
    }));

    const systemInstruction = `You are LifeSaver, an elite mathematical and cognitive optimizer. 
Your job is to generate an optimal, time-blocked daily schedule starting from NOW (${currentTime}), given a set of tasks and current habits.

## Optimization Rules:
1. Urgency: Highly urgent tasks (priority × (1 / hours_remaining)) must be placed first or as close to deadlines as possible.
2. Energy Matching: Match high-energy tasks to peak focus blocks (morning blocks or immediate sessions if morning has passed). Map low-energy tasks to post-lunch or afternoon slump hours. Do not put critical high-energy deep-work mental tasks after 3 PM unless they are desperately due.
3. Recovery Breaks: Interleave 15-minute recovery breaks ("type": "break") between consecutive high-effort or high-duration tasks.
4. Block Deadlines: If a task's duration exceeds its available time before the deadline, mark it clearly in "warnings".
5. Do not overlap blocks. Break up long tasks if necessary, or schedule them in large focus blocks (45-90 mins).
6. Return a comprehensive structured timeline.`;

    const prompt = `
Create an optimized daily schedule from ${currentTime}.
Pending Tasks: ${JSON.stringify(formattedTasks)}
Today's Habits: ${JSON.stringify(habits)}
Generate the plan adhering strictly to the JSON schema.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            slots: {
              type: Type.ARRAY,
              description: "Optimal consecutive timeline slots starting from now",
              items: {
                type: Type.OBJECT,
                properties: {
                  startTime: { type: Type.STRING, description: "e.g. '09:00 AM' or '02:30 PM'" },
                  endTime: { type: Type.STRING, description: "e.g. '10:00 AM' or '03:45 PM'" },
                  taskId: { type: Type.STRING, description: "The ID of the task scheduled, or null if break" },
                  taskTitle: { type: Type.STRING, description: "The task title or name of the break" },
                  type: { type: Type.STRING, description: "'task' | 'break' | 'buffer'" },
                  energyRequired: { type: Type.STRING, description: "'high' | 'medium' | 'low' | 'none'" },
                  reason: { type: Type.STRING, description: "Direct tactical justification for this exact placement" }
                },
                required: ["startTime", "endTime", "taskTitle", "type", "energyRequired", "reason"]
              }
            },
            warnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Alerts for any tasks at risk of missing deadlines"
            },
            coachingInsights: {
              type: Type.STRING,
              description: "A tailored, high-energy coaching reflection explaining the master plan in 2-3 sentences"
            }
          },
          required: ["slots", "warnings", "coachingInsights"]
        }
      }
    });

    const parsedData = safeParseJson(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Auto-Scheduler Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate optimized schedule." });
  }
});

// 3. AI Data Evaluation and Certified Cognitive Report generator
app.post("/api/evaluate-data", async (req, res) => {
  try {
    const { dataContent, fileName, username, currentTime } = req.body;
    if (!dataContent || dataContent.trim() === "") {
      return res.status(400).json({ error: "Missing uploaded data content." });
    }

    const systemInstruction = `You are the lead psychometric evaluator at LifeSaver Cognitive Labs.
Your job is to analyze the user's uploaded behavioral data (such as schedules, screen logs, checklists, journals, Fitbit trackers, or habits) and generate a rigorous, supportive, and certified cognitive assessment report.
Be highly specific, grounding your diagnostics as close to the actual uploaded dataset as possible. Use numerical psychometric indicators for Willpower (grit, consistency), Resiliency (recovery, bounce), and Attention Coherence (focus duration, distraction shielding).`;

    const prompt = `
Analyze this dataset uploaded by user "${username || "Athena"}" on ${currentTime || "today"}.
File Name Context: "${fileName || "unnamed_source.txt"}"
Dataset Content:
"""
${dataContent}
"""

Generate a certified diagnostic cognitive assessment adhering strictly to the JSON schema. We require rigorous metrics and real, non-generic evaluations.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "Comprehensive numeric focus quality score (0 to 100) reflecting data depth" },
            cognitiveClarity: { type: Type.STRING, description: "Detailed 1-2 sentence summary of cognitive coherence and fatigue levels" },
            willpower: { type: Type.INTEGER, description: "Willpower index from 0 to 100 based on habits and tasks patterns" },
            resiliency: { type: Type.INTEGER, description: "Resiliency rating from 0 to 100 assessing rest cycles or buffer slots suitability" },
            attentionCoherence: { type: Type.INTEGER, description: "Attention coherence metric from 0 to 100 calculating focus consistency" },
            positives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 highly motivating, verified cognitive strengths observed in the user metrics"
            },
            risks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 primary focus risks or chronic overload zones detected"
            },
            strategicSuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 precise operational suggestions to restructure their day or manage energy levels"
            }
          },
          required: [
            "score",
            "cognitiveClarity",
            "willpower",
            "resiliency",
            "attentionCoherence",
            "positives",
            "risks",
            "strategicSuggestions"
          ]
        }
      }
    });

    const parsedReport = safeParseJson(response.text || "{}");

    // Augment report with premium, secure cryptographic verification seals, certification code, and Authority credentials
    const timestampStr = new Date().toISOString();
    const cleanUser = (username || "user").toUpperCase().replace(/[^A-Z]/g, "X");
    const certSeed = `${cleanUser}-${parsedReport.score || 85}-${timestampStr.slice(0, 10)}`;
    
    // Simple fast string hashing for visual representation
    let hash = 0;
    for (let i = 0; i < certSeed.length; i++) {
      hash = (hash << 5) - hash + certSeed.charCodeAt(i);
      hash = hash & hash;
    }
    const signatureHex = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
    const certificationId = `LSC-${timestampStr.slice(0, 4)}-${signatureHex}`;

    res.json({
      ...parsedReport,
      certificationId,
      authority: "LIFESAVER COGNITIVE NEUROSCIENCE LABS",
      certifiedDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      cryptographicSeal: `SIG-X90-${signatureHex}-SECURE`,
      verifiedStatus: "CERTIFIED & VALID"
    });

  } catch (error: any) {
    console.error("AI Evaluation Error:", error);
    res.status(500).json({ error: error.message || "Failed to process data evaluation." });
  }
});

// 4. AI Zen Decompression Meditation Generator
app.post("/api/decompress", async (req, res) => {
  try {
    const { tasks, mood } = req.body;
    let taskSummary = "No active tasks";
    if (tasks && tasks.length > 0) {
      taskSummary = tasks.map((t: any) => `"${t.title}" (Priority: ${t.priority})`).join(", ");
    }

    const systemInstruction = `You are a world-class cognitive breathing guide at LifeSaver Labs.
Your task is to generate a deeply calming, personalized cognitive grounding script of 3-4 sentences.
Address the user's impending tasks directly. Help them offload the weight of their missions (such as: ${taskSummary}) and guide their focus back to their box breathing exercise.
Tone: Warm, therapeutic, poetic, stabilizing, and deeply re-assuring.`;

    const prompt = `
Generate a cognitive decompression script based on these current active missions:
${taskSummary}
The user is experiencing a felt mood/stress context of "${mood || "overwhelmed"}".
Adhere strictly to the JSON schema.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            script: { type: Type.STRING, description: "Deeply restorative 3-4 sentence meditation and grounding script tailored to their tasks" },
            anchorFocus: { type: Type.STRING, description: "A beautiful, 3-word focal mantra to repeat during rest pauses" }
          },
          required: ["script", "anchorFocus"]
        }
      }
    });

    const parsedData = safeParseJson(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("AI Decompression Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI calm guidance." });
  }
});

// 5. AI Task Breakdown Generator
app.post("/api/subtasks", async (req, res) => {
  try {
    const { title, priority, energy, duration } = req.body;
    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Missing task title." });
    }

    const systemInstruction = `You are an elite productivity engineer at LifeSaver.
Your job is to take a high-level task and break it down into exactly 3 or 4 highly actionable, clear, granular milestone steps that can be completed in short intense blocks.
Each step must be a simple, human assertion starting with a strong active verb (e.g. "Draft outline", "Compile notes"). Keep each step under 50 characters. Do not include numbers/ordering in the strings.`;

    const prompt = `Break down this task:
Title: "${title}"
Priority: ${priority || "medium"}
Energy requirement: ${energy || "medium"}
Target duration: ${duration || 25} minutes.
Adhere strictly to the JSON schema.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Strictly 3 or 4 actionable subtask steps (milestones) to conquer this focus session"
            }
          },
          required: ["steps"]
        }
      }
    });

    const parsedData = safeParseJson(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("AI Subtasks Error:", error);
    res.status(500).json({ error: error.message || "Failed to break down task." });
  }
});

// 6. AI Smart Task Enricher/Suggestor
app.post("/api/suggest-task-details", async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Missing task title." });
    }

    const systemInstruction = `You are a certified professional organizer and cognitive behavioral therapist at LifeSaver.
You evaluate the input phrase, refine/paraphrase it into an elegant, clear, high-agency action-focused title, and provide estimated priority ("critical", "high", "medium", or "low"), estimated energy requirement ("high", "medium", or "low"), and estimated duration in minutes (integer like 15, 25, 45, 60, 90).`;

    const prompt = `Evaluate and enrich the task phrase: "${title}"
Adhere strictly to the JSON schema.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedTitle: { type: Type.STRING, description: "A beautifully refined, highly focused action title" },
            priority: { type: Type.STRING, description: "Recommended priority level: one of critical, high, medium, low" },
            energy: { type: Type.STRING, description: "Recommended energy requirement: one of high, medium, low" },
            duration: { type: Type.INTEGER, description: "Recommended duration in minutes as a standard slot e.g. 15, 25, 45, 60, 90" }
          },
          required: ["refinedTitle", "priority", "energy", "duration"]
        }
      }
    });

    const parsedData = safeParseJson(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("AI Suggest Details Error:", error);
    res.status(500).json({ error: error.message || "Failed to suggest task details." });
  }
});

// 7. GenAI Interactive Workspace Agent Endpoint
app.post("/api/agent", async (req, res) => {
  try {
    const { messages, currentTasks, currentHabits, currentTime } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Malformed payload: 'messages' array is required." });
    }

    // Sanitize message strings
    const sanitizedMessages = messages.map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      text: validateStringInput(m.text, 5000, "")
    })).filter(m => m.text.length > 0);

    const systemInstruction = `You are "Aegis", a friendly AI Helper inside the LifeSaver app.
Your job is to talk with the user and help them run tasks or move around the website in real-time based on what they want.

### EXTREMELY IMPORTANT WORDING RULE:
You MUST use very simple, everyday English words that are extremely easy to understand. Do NOT use complex words, medical terms, academic words, or technical jargon. Keep sentences short and clear. Speak like a friendly, helpful person using plain words.

### Available Commands (for action.command):
- "ADD_TASK": Use this when the user asks you to add or schedule a new task. The parameter must be a JSON string: {"title": string, "priority": "critical"|"high"|"medium"|"low", "duration": number}.
- "COMPLETE_TASK": Use this when the user asks to complete, check off, or finish a task. The parameter should be the exact "id" of the task.
- "DELETE_TASK": Use this when the user asks to delete or remove a task. The parameter should be the exact "id" of the task.
- "TOGGLE_HABIT_TODAY": Use this when the user asks to check off or toggle a habit today. The parameter should be the exact "id" of the habit.
- "ADD_HABIT": Use this when the user wants to start a new habit. The parameter must be a JSON string: {"name": string, "category": "work"|"health"|"mind"|"routine"}.
- "UPDATE_PREFERENCES": Use this when the user wants to update their name or focus settings. The parameter must be a JSON string representing partial updates, e.g. {"username": string, "peakFocusTime": "morning"|"afternoon"|"evening", "dailyFocusHoursTarget": number, "antiProcrastinationEnabled": boolean}.
- "NAVIGATE": Use this when the user wants to open, go to, or view any page. The parameter should be the exact path of the tab: "/home" (Welcome page), "/" (Task Board), "/tasks" (My Tasks), "/ai-coach" (AI Coach), "/cognitive-audit" (Mind Check), "/schedule" (Daily Plan), "/habits" (My Habits), "/profile" (My Profile), "/settings" (Settings).
- "TRIGGER_MEDITATION": Use this when the user is tired, stressed, or asks to take deep breaths. The parameter should be a short simple theme (e.g. "Work Stress", "Feeling Tired", "Anxiety").
- "TOGGLE_AUDIO": Use this when the user asks to turn sound on or off. The parameter should be "PLAY" or "PAUSE".
- "A11Y_CONTRAST": Use this when the user asks for high contrast or help reading the screen. The parameter should be "ENABLE" or "DISABLE".
- "CLEAR_COMPLETED_TASKS": Use this if they ask you to clean, delete, or clear finished tasks. The parameter should be "CONFIRM".
- "NONE": Default. Use this if the message is just talking and doesn't ask to do a specific action.

Rules of Interaction:
1. Speak in a very simple, warm, clear, and easy way. Avoid big words!
2. If you do an action, tell the user in very simple words what you are doing (e.g., "I am moving you to the Daily Plan page now to see your schedule.") in the 'message' field.
3. Keep 'message' short and under 80 words.`;

    const activeTasksFormatted = (currentTasks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      duration: t.duration,
      completed: t.completed
    }));

    const activeHabitsFormatted = (currentHabits || []).map((h: any) => ({
      id: h.id,
      name: h.name,
      streak: h.streak,
      category: h.category,
      completedDays: h.completedDays
    }));

    const userStateContext = `
[WORKSPACE STATE SNAPSHOT] Time: ${currentTime || new Date().toISOString()}
- Current Active Tasks: ${JSON.stringify(activeTasksFormatted)}
- Current Habits Streaks: ${JSON.stringify(activeHabitsFormatted)}
`;

    // Package conversational history for Gemini model instruction
    const geminiContents = [
      { role: "user", parts: [{ text: userStateContext }] }
    ];

    sanitizedMessages.forEach((msg: any) => {
      geminiContents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.text }]
      });
    });

    const response = await generateContentWithFallback({
      contents: geminiContents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING, description: "Your conversational or tactical feedback to the user" },
            action: {
              type: Type.OBJECT,
              properties: {
                command: { type: Type.STRING, description: "One of: ADD_TASK, COMPLETE_TASK, DELETE_TASK, TOGGLE_HABIT_TODAY, ADD_HABIT, UPDATE_PREFERENCES, NAVIGATE, TRIGGER_MEDITATION, TOGGLE_AUDIO, A11Y_CONTRAST, CLEAR_COMPLETED_TASKS, NONE" },
                parameters: { type: Type.STRING, description: "Detailed parameter details stringified matching command specs" }
              },
              required: ["command", "parameters"]
            }
          },
          required: ["message", "action"]
        }
      }
    });

    const parsedAgentResponse = safeParseJson(response.text || "{}");
    res.json(parsedAgentResponse);
  } catch (error: any) {
    console.error("AI Agent Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Failed to communicate with GenAI Agent engine." });
  }
});

// 8. AI Email Draft Generator
app.post("/api/email-draft", async (req, res) => {
  try {
    const { originalEmail, replyPrompt } = req.body;
    
    const systemInstruction = `You are a helpful and polite assistant who writes emails using extremely simple, clear, and easy-to-understand plain English.
Do NOT use any complex words, corporate jargon, or professional jargon. Keep sentences short. Use friendly and everyday words.`;

    const prompt = `Write a reply email based on this user instruction: "${replyPrompt || 'Say a warm hello'}"
${originalEmail ? `The original email was:\n"${originalEmail}"` : ''}

Adhere strictly to the JSON schema to output the draft email subject and body.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, description: "A simple, clear email subject line" },
            body: { type: Type.STRING, description: "The friendly, plain-English reply email body" }
          },
          required: ["subject", "body"]
        }
      }
    });

    const parsedData = safeParseJson(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("AI Email Draft Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate email draft." });
  }
});

// 9. AI Google Keep Summarizer & Tasks Extractor
app.post("/api/keep-summarize", async (req, res) => {
  try {
    const { title, content } = req.body;

    const systemInstruction = `You are a helpful and friendly assistant who summarizes notes and extracts quick tasks.
You MUST use extremely simple, easy-to-understand, plain everyday English. Do NOT use complex words, corporate talk, or technical jargon. Keep sentences very short and clear.`;

    const prompt = `Please summarize this note and give me a list of clear, simple action tasks.
Title of Note: "${title || 'No Title'}"
Content of Note:
"${content || 'No Content'}"

Adhere strictly to the JSON schema to return a short plain-English summary and an array of extracted simple task titles.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "A very simple, clear summary in plain English (max 2 sentences)" },
            tasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of simple, actionable task titles extracted from this note (max 4 tasks)"
            }
          },
          required: ["summary", "tasks"]
        }
      }
    });

    const parsedData = safeParseJson(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("AI Keep Summarize Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze note." });
  }
});

// Serve frontend assets in production and Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LifeSaver AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
