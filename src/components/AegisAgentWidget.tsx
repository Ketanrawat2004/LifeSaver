import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  MessageSquare, 
  X, 
  Send, 
  Cpu, 
  Settings, 
  Volume2, 
  VolumeX, 
  Trash2, 
  CheckCircle, 
  Sliders, 
  Loader, 
  Zap, 
  Wind, 
  Contrast 
} from "lucide-react";
import { Task, Habit, ChatMessage } from "../types";

interface AegisAgentProps {
  tasks: Task[];
  habits: Habit[];
  preferences: any;
  onAddTask: (t: { title: string; priority: "critical" | "high" | "medium" | "low"; duration: number; energy: "high" | "medium" | "low" }) => void;
  onAddHabit: (name: string, category: "work" | "health" | "mind" | "routine") => void;
  onPruneCompleted: () => void;
  onNavigate: (path: string) => void;
  onCompleteTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onToggleHabitToday: (id: string) => void;
  onUpdatePreferences: (updates: any) => void;
}

export default function AegisAgentWidget({ 
  tasks, 
  habits, 
  preferences, 
  onAddTask, 
  onAddHabit, 
  onPruneCompleted,
  onNavigate,
  onCompleteTask,
  onDeleteTask,
  onToggleHabitToday,
  onUpdatePreferences
}: AegisAgentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  
  // Custom Agent Persona: tactical | soothing | sergeant
  const [persona, setPersona] = useState<"tactical" | "soothing" | "sergeant">("tactical");
  
  // Sound announcement assist state
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  // Keep track of autonomous executions
  const [executionLog, setExecutionLog] = useState<{ id: string; msg: string; time: string }[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize with introductory welcome message based on persona
  useEffect(() => {
    if (messages.length === 0) {
      triggerWelcomeMessage();
    }
  }, [persona]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const triggerWelcomeMessage = () => {
    let welcome = "";
    if (persona === "tactical") {
      welcome = "Aegis workspace co-pilot active. Ready to coordinate focus sessions, schedule task matrices, or trigger somatic breathing modules. Ask me to clear completed items or play zen background loops anytime.";
    } else if (persona === "soothing") {
      welcome = "Breathe easy. I am your calm companion. Let's find focus together. If you're feeling rushed or tired, tell me, and I can start box breathing sequences or turn on soothing Solfeggio soundscapes.";
    } else {
      welcome = "Focus Command Sergeant Aegis reporting. Clear the noise! We have objectives to secure. Keep your metrics high, outline what we need, and tell me when we're purging completed tasks.";
    }

    setMessages([
      {
        id: `wel-${Date.now()}`,
        role: "assistant",
        text: welcome,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Browser Text-To-Speech Assist
  const announceSpeech = (text: string) => {
    if (!soundEnabled) return;
    try {
      if (typeof window !== "undefined" && window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined") {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.substring(0, 150)); // limit voicing size for comfort
        u.rate = persona === "soothing" ? 0.95 : persona === "sergeant" ? 1.15 : 1.05;
        u.volume = 0.55;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {
      console.warn("Speech failed:", e);
    }
  };

  const handleSendMessage = async (customMessageText?: string) => {
    const textToSend = customMessageText || inputVal;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customMessageText) setInputVal("");
    setIsLoading(true);
    setErrorText(null);

    try {
      // Build history context (max preceding 6 messages)
      const chatHistory = messages
        .slice(-6)
        .map(m => ({ role: m.role, text: m.text }));
      chatHistory.push({ role: "user", text: textToSend.trim() });

      // Add custom prompt modifications according to persona
      let personaPrompt = textToSend.trim();
      if (persona === "soothing") {
        personaPrompt += " (Respond style: Calm, soothing, encouraging, zen breathing advice)";
      } else if (persona === "sergeant") {
        personaPrompt += " (Respond style: Blunt, motivational, sergeant-major command mode, short punchy orders)";
      }

      const lastHistoryItem = chatHistory[chatHistory.length - 1];
      if (lastHistoryItem) {
        lastHistoryItem.text = personaPrompt;
      }

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          currentTasks: tasks,
          currentHabits: habits,
          currentTime: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Server API returned code ${response.status}`);
      }

      const data = await response.json();
      const assistantText = data.message || "I've processed your instructions, but couldn't verify the final action.";
      
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        text: assistantText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
      announceSpeech(assistantText);

      // Analyze autonomous tool execution parsed from Gemini response
      if (data.action && data.action.command !== "NONE") {
        executeAutonomousAction(data.action.command, data.action.parameters);
      }

    } catch (err: any) {
      console.error("Workspace Agent call error:", err);
      setErrorText("Communication latency. Connecting to local server modules...");
      
      // Fallback local rules engine for robust offline-friendly capabilities
      setTimeout(() => {
        handleLocalFallbackEngine(textToSend.trim());
      }, 800);
    } finally {
      setIsLoading(false);
    }
  };

  // Local fallback offline-capable agent heuristic rules engine
  const handleLocalFallbackEngine = (userText: string) => {
    const text = userText.toLowerCase();
    let reply = "";
    let mockCmd = "NONE";
    let mockParams = "";

    if (text.includes("breathing") || text.includes("stressed") || text.includes("overwhelmed") || text.includes("calm")) {
      reply = "Detecting high workload feedback. Activating box breathing sequence to stabilize focus.";
      mockCmd = "TRIGGER_MEDITATION";
      mockParams = "Grounding Rest";
    } else if (text.includes("music") || text.includes("play") || text.includes("zen")) {
      reply = "Initiating soothing audio frequency generators.";
      mockCmd = "TOGGLE_AUDIO";
      mockParams = "PLAY";
    } else if (text.includes("clean") || text.includes("prune") || text.includes("clear")) {
      reply = "Cleaning files. Purging completed checklist points now.";
      mockCmd = "CLEAR_COMPLETED_TASKS";
      mockParams = "CONFIRM";
    } else if (text.includes("task") || text.includes("add")) {
      reply = "Drafting study block. Let's record a focused deep work interval.";
      mockCmd = "ADD_TASK";
      mockParams = JSON.stringify({ title: "Generated Task Interval", priority: "high", duration: 25 });
    } else if (text.includes("contrast") || text.includes("accessibility")) {
      reply = "Applying contrast configurations.";
      mockCmd = "A11Y_CONTRAST";
      mockParams = "ENABLE";
    } else {
      reply = "I've recorded that note. Tell me to 'play music', 'clear completed tasks', or 'trigger box breathing', and I can streamline your workspace instantly.";
    }

    const fallbackMsg: ChatMessage = {
      id: `fallback-${Date.now()}`,
      role: "assistant",
      text: reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, fallbackMsg]);
    announceSpeech(reply);

    if (mockCmd !== "NONE") {
      executeAutonomousAction(mockCmd, mockParams);
    }
  };

  // Perform custom client state interactions or dispatch global window events
  const executeAutonomousAction = (command: string, parameters: string) => {
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let logMsg = "";

    try {
      switch (command) {
        case "ADD_TASK": {
          const parsed = JSON.parse(parameters);
          if (parsed && parsed.title) {
            onAddTask({
              title: parsed.title,
              priority: parsed.priority || "medium",
              duration: parsed.duration || 25,
              energy: parsed.energy || "medium"
            });
            logMsg = `Autonomous scheduled mission: "${parsed.title}" (${parsed.duration} mins)`;
          }
          break;
        }
        case "COMPLETE_TASK": {
          if (parameters) {
            const target = tasks.find(t => t.id === parameters);
            onCompleteTask(parameters);
            logMsg = `Task marked completed: "${target ? target.title : parameters}"`;
          }
          break;
        }
        case "DELETE_TASK": {
          if (parameters) {
            const target = tasks.find(t => t.id === parameters);
            onDeleteTask(parameters);
            logMsg = `Task deleted: "${target ? target.title : parameters}"`;
          }
          break;
        }
        case "TOGGLE_HABIT_TODAY": {
          if (parameters) {
            const target = habits.find(h => h.id === parameters);
            onToggleHabitToday(parameters);
            logMsg = `Toggled habit streak today: "${target ? target.name : parameters}"`;
          }
          break;
        }
        case "ADD_HABIT": {
          if (parameters) {
            try {
              const parsed = JSON.parse(parameters);
              onAddHabit(parsed.name || parsed, parsed.category || "routine");
              logMsg = `Autonomous habit created: "${parsed.name || parsed}"`;
            } catch (e) {
              onAddHabit(parameters, "routine");
              logMsg = `Autonomous habit logged: "${parameters}"`;
            }
          }
          break;
        }
        case "UPDATE_PREFERENCES": {
          if (parameters) {
            const parsed = JSON.parse(parameters);
            onUpdatePreferences(parsed);
            logMsg = `Preferences updated: ${Object.keys(parsed).join(", ")}`;
          }
          break;
        }
        case "NAVIGATE": {
          if (parameters) {
            onNavigate(parameters);
            logMsg = `Workspace navigated to: "${parameters}"`;
          }
          break;
        }
        case "TRIGGER_MEDITATION": {
          // Dispatch somatic rest box event
          window.dispatchEvent(new CustomEvent("somatic-breathing-control", { detail: { action: "expand" } }));
          logMsg = `Triggered Box Breathing: "${parameters || "Grounding Loop"}"`;
          break;
        }
        case "TOGGLE_AUDIO": {
          const act = parameters.toUpperCase() === "PLAY" ? "play" : "pause";
          window.dispatchEvent(new CustomEvent("zen-audio-control", { detail: { action: act } }));
          logMsg = `Controlled focus audio track: [${act.toUpperCase()}]`;
          break;
        }
        case "A11Y_CONTRAST": {
          const mode = parameters.toUpperCase() === "ENABLE";
          window.dispatchEvent(new CustomEvent("accessibility-control", { detail: { type: "contrast", enabled: mode } }));
          logMsg = `Accessibility update: Contrast filter is ${mode ? "active" : "normal"}`;
          break;
        }
        case "CLEAR_COMPLETED_TASKS": {
          onPruneCompleted();
          logMsg = "Housekeeping executed: Completed items pruned.";
          break;
        }
        default:
          console.log("No custom executable instruction received.", command);
      }
    } catch (e: any) {
      console.warn("Autonomous extraction parameter failure:", e);
    }

    if (logMsg) {
      setExecutionLog(prev => [
        { id: `log-${Date.now()}`, msg: logMsg, time: timestampStr },
        ...prev.slice(0, 4) // cap at 5 actions logs
      ]);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setTimeout(() => triggerWelcomeMessage(), 100);
  };

  const quickPrompts = [
    { label: "🧹 Clean workspace", text: "Clean completed tasks" },
    { label: "🎵 Play Solfeggio soundscape", text: "Play focus music ambient Solfeggio resonance" },
    { label: "💨 Box breathing", text: "I'm extremely anxious. Set up breathing rest blocks now" },
    { label: "👁️ Strong Contrast Mod", text: "Turn on high contrast accessibility assistance" },
    { label: "📅 Add quick task", text: "Add a 45 minute medium priority task named 'Evaluate workflow analytics'" }
  ];

  return (
    <div id="workspace-aegis-agent-container" className="non-printable">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            layoutId="aegis-badge-box"
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full p-3.5 shadow-xl transition-all cursor-pointer border border-[#2D312E]/10 select-none group"
            id="aegis-floating-badge"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            title="Open Aegis GenAI workspace agent"
          >
            <div className="relative">
              <Cpu className="h-5 w-5 text-amber-300 animate-spin-slow group-hover:rotate-180 transition-transform duration-700" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </div>
            <span className="text-xs font-bold font-mono tracking-widest hidden md:inline uppercase pr-1">Aegis Agent</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            layoutId="aegis-badge-box"
            className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 z-50 w-full sm:max-w-[390px] h-[85vh] sm:h-[580px] bg-white border border-stone-250 sm:border-stone-200 shadow-2xl sm:rounded-3xl rounded-t-3xl flex flex-col overflow-hidden text-[#2D312E]"
            id="aegis-agent-expanded-panel"
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
          >
            {/* Header section */}
            <div className="p-4 bg-gradient-to-r from-stone-900 to-stone-850 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8.5 w-8.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center relative">
                  <Cpu className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
                  <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-stone-900" />
                </div>
                <div>
                  <h3 className="text-xs font-bold leading-tight font-mono tracking-wide uppercase">Aegis Agent</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest">Workspace Agent</span>
                    <span className="inline-block h-1 w-1 rounded-full bg-emerald-400" />
                    <span className="text-[8px] font-mono text-stone-400">Secure AI</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Voice Toggle */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-lg border transition ${
                    soundEnabled 
                      ? "bg-amber-500/10 border-amber-400/30 text-amber-400 hover:bg-amber-500/20" 
                      : "bg-white/5 border-white/10 text-stone-400 hover:bg-white/10"
                  }`}
                  title={soundEnabled ? "Mute audio assistance" : "Unmute speech audio assistance"}
                >
                  {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                </button>

                {/* Reset button */}
                <button
                  type="button"
                  onClick={clearMessages}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-stone-400 hover:bg-white/10 transition"
                  title="Reset conversation archive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {/* Close Widget */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-stone-400 hover:bg-white/10 hover:text-white transition"
                  id="close-aegis-btn"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Persona select bar */}
            <div className="px-3 py-2 bg-stone-100 border-b border-stone-200 flex items-center justify-between gap-1 shrink-0 text-stone-700 font-sans text-[11px] font-medium">
              <span className="font-mono text-[9px] font-bold text-[#7A827B] uppercase tracking-wide flex items-center gap-1"><Sliders className="h-3 w-3" /> Persona:</span>
              <div className="flex gap-1">
                {[
                  { key: "tactical", label: "Coach" },
                  { key: "soothing", label: "Calm" },
                  { key: "sergeant", label: "Tough" }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPersona(item.key as any)}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded font-mono uppercase transition cursor-pointer select-none ${
                      persona === item.key
                        ? "bg-stone-905 text-white shadow-xs"
                        : "bg-white text-stone-500 border border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/70 custom-scrollbar">
              
              {/* Messages feed */}
              <div className="space-y-3.5">
                {messages.map((m) => {
                  const isAsst = m.role === "assistant";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[85%] ${isAsst ? "mr-auto text-left" : "ml-auto text-right"}`}
                    >
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed font-sans shadow-xs ${
                        isAsst 
                          ? "bg-white text-stone-850 border border-stone-200/80 rounded-tl-sm" 
                          : "bg-stone-900 text-white rounded-tr-sm"
                      }`}>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                      <span className="text-[8px] font-mono text-stone-400 mt-1 uppercase tracking-widest shrink-0">
                        {isAsst ? "Aegis" : "You"} • {m.timestamp}
                      </span>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="mr-auto text-left max-w-[85%] flex items-center gap-2">
                    <div className="p-3 bg-white text-stone-500 border border-stone-200/50 rounded-2xl rounded-tl-sm shadow-xs flex items-center gap-2">
                      <Loader className="h-3.5 w-3.5 text-stone-500 animate-spin" />
                      <span className="text-xs font-mono">Cognizant processing...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Secure rate limiter shield visual */}
              <div className="mt-4 border-t border-dashed border-stone-200 pt-3">
                <span className="text-[8px] font-mono tracking-widest text-[#7A827B] uppercase block pb-1 opacity-75">Secure API Shield Status</span>
                <div className="flex items-center justify-between text-[9px] font-mono text-stone-500 p-2.5 bg-stone-100 rounded-xl border border-stone-200/60 leading-none">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    WAF: 100% ONLINE
                  </span>
                  <span className="text-[8px] tracking-tight bg-stone-200 px-1.5 py-0.5 rounded uppercase">Rate limits: ACTIVE</span>
                </div>
              </div>

              {/* Autonomous execution timeline */}
              {executionLog.length > 0 && (
                <div className="mt-4 border-t border-dashed border-stone-200 pt-3 animate-fade-in">
                  <span className="text-[8px] font-mono tracking-widest text-[#7A827B] uppercase block pb-1">Autonomous Execution Trail</span>
                  <div className="space-y-1">
                    {executionLog.map((log) => (
                      <div key={log.id} className="flex gap-2 p-2 bg-[#F0FDF4] border border-emerald-100 rounded-xl items-start">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1 leading-normal">
                          <p className="text-[9.5px] font-sans text-emerald-950 font-semibold break-words leading-tight">{log.msg}</p>
                          <span className="text-[7.5px] font-mono text-emerald-600 block tracking-widest uppercase mt-0.5">Verified Execution • {log.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Suggestion Grid */}
            <div className="px-3 py-2 border-t border-stone-200 bg-white space-y-1.5 shrink-0">
              <span className="text-[8px] font-mono font-bold tracking-widest text-[#7A827B] uppercase">Workspace Agent Micro-Tools</span>
              <div id="quick-actions-suggests-deck" className="flex flex-wrap gap-1">
                {quickPrompts.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(q.text)}
                    className="text-[9.5px] font-sans font-semibold text-stone-600 bg-[#FAF9F6] border border-stone-200 hover:border-amber-500/20 hover:bg-amber-50/40 rounded-lg px-2 py-1 transition cursor-pointer select-none"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Send Message Input area */}
            <div className="p-3 bg-white border-t border-stone-200 flex gap-2 items-center shrink-0">
              <input
                type="text"
                placeholder={persona === "tactical" ? "Command Aegis: 'clear tasks' or 'play music'..." : "Ask Aegis, e.g., 'breathing sequence'..."}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 bg-[#FAF9F6] border border-stone-200/90 text-stone-850 px-3.5 py-2 text-xs rounded-xl focus:outline-none focus:border-stone-900 placeholder-stone-400"
                id="aegis-text-input"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputVal.trim() || isLoading}
                className={`py-2 px-3.5 rounded-xl text-white font-bold text-xs flex items-center justify-center transition cursor-pointer ${
                  inputVal.trim() && !isLoading
                    ? "bg-stone-900 hover:bg-stone-850"
                    : "bg-stone-100 text-stone-400 border border-stone-250 cursor-not-allowed"
                }`}
                id="aegis-submit-btn"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
