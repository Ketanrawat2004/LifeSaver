import React, { useState, useEffect, useRef } from "react";
import { Task, Habit, ChatMessage } from "../types";
import { computeUrgencyScore } from "../data";
import { MessageSquare, Send, Sparkles, ShieldAlert, Cpu, ArrowRight, Zap, RefreshCw } from "lucide-react";

interface AiCoachProps {
  tasks: Task[];
  habits: Habit[];
  messages: ChatMessage[];
  onAddMessage: (role: "user" | "assistant", text: string) => void;
  onClearHistory: () => void;
  currentTime: Date;
}

export default function AiCoachView({ tasks, habits, messages, onAddMessage, onClearHistory, currentTime }: AiCoachProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages length updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    // Add user message to history
    onAddMessage("user", textToSend.trim());
    if (!customText) setInput("");
    setLoading(true);
    setErrorStatus(null);

    try {
      const payloadMessages = [
        ...messages.map(m => ({ role: m.role, text: m.text })),
        { role: "user", text: textToSend.trim() }
      ];

      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          tasks,
          habits,
          currentTime: currentTime.toISOString()
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `HTTP ${response.status} Error`);
      }

      const data = await response.json();
      onAddMessage("assistant", data.text || "I was unable to formulate a response at this time.");
    } catch (err: any) {
      console.error("Coach API Error:", err);
      setErrorStatus(err.message || "Failed to contact your server's Gemini API.");
      onAddMessage("assistant", `⚠️ NOTICE: ${err.message || "Unable to reach the Gemini engine. Please check your API Key settings."}`);
    } finally {
      setLoading(false);
    }
  };

  const triggerstarter = () => {
    handleSendMessage("I'm completely overwhelmed. I don't know where to start.");
  };

  // Simple, easy prompt starters
  const starters = [
    { label: "🤝 How to start my tasks?", prompt: "Help me plan my very first step for my most important task." },
    { label: "⚡ How to plan my energy?", prompt: "Help me plan my day around when I have the most energy today." },
    { label: "🎯 How to build good habits?", prompt: "Give me simple tips on how to keep my habits every day without getting tired." }
  ];

  return (
    <div id="ai-coach-view-root" className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in text-[#2D312E]">
      
      {/* LEFT COLUMN: Organic Task Load Inspector */}
      <div className="lg:col-span-1 space-y-6 font-sans">
        <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#2D312E]/10 pb-3">
            <Cpu className="h-4 w-4 text-amber-600" />
            <div>
              <h3 className="text-xs font-bold tracking-wider uppercase font-mono text-[#1C1E1B]">Integrated Context</h3>
              <p className="text-[10px] text-[#7A827B] font-mono">Live list details matched with companion</p>
            </div>
          </div>

          <div className="space-y-4 font-mono text-[10px] text-[#2D312E]">
            <div>
              <span className="text-[#7A827B] font-bold block uppercase pb-0.5">Reference Time:</span>
              <span className="text-[#1C1E1B] break-all">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (YMD: {currentTime.toISOString().split('T')[0]})</span>
            </div>

            <div>
              <span className="text-[#7A827B] font-bold block pb-1.5 uppercase">Pending Missions ({tasks.filter(t=>!t.completed).length}):</span>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1" id="inspector-tasks-list">
                {tasks.filter(t=>!t.completed).map(t => {
                  const u = computeUrgencyScore(t, currentTime.toISOString());
                  return (
                    <div key={t.id} className="bg-[#FAF9F6] border border-[#2D312E]/5 p-2.5 rounded-xl text-xs font-sans text-[#2D312E]">
                      <span className="text-[#1C1E1B] font-bold block">"{t.title}"</span>
                      <div className="flex justify-between text-[10px] text-[#7A827B] mt-1 font-mono">
                        <span>Pri: {t.priority}</span>
                        <span>Load: {u.score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-[#7A827B] font-bold block pb-1.5 uppercase">Streaks Status Matrix:</span>
              <div className="space-y-1.5 font-sans">
                {habits.map(h => {
                  const completedToday = h.completedDays.includes(currentTime.toISOString().split("T")[0]);
                  return (
                    <div key={h.id} className="flex justify-between items-center bg-[#FAF9F6] px-3 py-2 rounded-xl border border-[#2D312E]/5 text-xs">
                      <span className="truncate max-w-[110px] text-[#1C1E1B] font-medium">{h.name}</span>
                      <span className={completedToday ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                        {completedToday ? "Done" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-[#2D312E]/5 pt-3 text-[11px] text-[#7A827B] leading-relaxed">
            The workspace feeds current scheduling values directly, enabling human-guided advice loops without repetitive typing.
          </div>
        </div>

        {/* Action presets card */}
        <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-4 space-y-2.5 shadow-xs">
          <span className="text-[10px] font-bold tracking-wider text-[#7A827B] font-mono uppercase">Quick Presets</span>
          <div className="space-y-2">
            {starters.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(s.prompt)}
                className="w-full text-left bg-[#FAF9F6] hover:bg-amber-50/50 border border-[#2D312E]/10 px-3.5 py-2.5 text-xs font-medium rounded-xl text-[#2D312E] transition-all hover:border-amber-500/20 flex items-center justify-between group cursor-pointer"
              >
                <span className="max-w-[85%]">{s.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#7A827B] group-hover:translate-x-1 group-hover:text-amber-700 transition-all shrink-0 ml-1/2" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Custom Warm Chat Interface */}
      <div className="lg:col-span-3 flex flex-col bg-white border border-[#2D312E]/10 rounded-2xl h-[560px] overflow-hidden shadow-xs">
        
        {/* Header bar */}
        <div className="bg-[#FAF9F6] text-[#2D312E] px-6 py-4 flex items-center justify-between border-b border-[#2D312E]/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-amber-500/10 text-amber-800 border border-amber-200 rounded-full flex items-center justify-center font-bold relative">
              <MessageSquare className="h-4.5 w-4.5 stroke-[2]" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[#1C1E1B] flex items-center gap-1">
                Focal Coach Companion <Sparkles className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
              </h2>
              <p className="text-[10px] text-[#7A827B] font-mono">Powered by responsive local API models</p>
            </div>
          </div>

          <button
            onClick={onClearHistory}
            className="text-xs font-semibold text-[#7A827B] hover:text-[#1C1E1B] border border-[#2D312E]/10 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 transition cursor-pointer"
          >
            Clear Conversation
          </button>
        </div>

        {/* Message feed stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" id="coach-messages-container">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-full">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-base text-[#1C1E1B] font-serif">Initiate Collaborative Plan</h3>
              <p className="text-xs text-[#7A827B] leading-relaxed font-sans">
                I am your focal coach companion. I monitor timing constraint margins, mapping realistic milestones, and providing tailored scheduling support.
              </p>
              <button
                onClick={triggerstarter}
                className="bg-[#1C1E1B] hover:bg-amber-700 text-white font-semibold text-xs py-2.5 px-5 rounded-xl shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
              >
                Let me begin with a Quick Assessment <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            messages.map((m) => {
              const isCoach = m.role === "assistant";
              return (
                <div
                  key={m.id}
                  className={`flex ${isCoach ? "justify-start" : "justify-end"} items-start gap-3`}
                >
                  {isCoach && (
                    <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-200 text-amber-800 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">
                      FC
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                    isCoach
                      ? "bg-[#FAF9F6] border border-[#2D312E]/5 text-[#2D312E] font-sans shadow-xs"
                      : "bg-[#1C1E1B] text-white font-sans"
                  }`}>
                    {/* Multi-tier clean item parser for friendly rich layouts */}
                    <div className="whitespace-pre-wrap select-text">
                      {m.text.split("\n").map((line, idx) => {
                        if (line.startsWith("**Right Now:**")) {
                          return (
                            <div key={idx} className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 font-semibold mb-3 mt-1 flex items-start gap-1.5 shadow-xs">
                              <Zap className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                              <span><b>Right Now:</b> {line.replace("**Right Now:**", "").trim()}</span>
                            </div>
                          );
                        }
                        if (line.startsWith("**Today's Plan:**")) {
                          return (
                            <div key={idx} className="bg-stone-50 border border-stone-200 p-3 rounded-xl text-stone-900 font-semibold mb-3 mt-1 flex items-start gap-1.5 shadow-xs">
                              <Cpu className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                              <span><b>Today's Plan:</b> {line.replace("**Today's Plan:**", "").trim()}</span>
                            </div>
                          );
                        }
                        if (line.startsWith("**Watch Out:**")) {
                          return (
                            <div key={idx} className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-rose-900 font-semibold mb-3 mt-1 flex items-start gap-1.5 shadow-xs">
                              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                              <span><b>Consideration:</b> {line.replace("**Watch Out:**", "").trim()}</span>
                            </div>
                          );
                        }

                        if (line.trim().startsWith("- ")) {
                          return (
                            <div key={idx} className="pl-4 py-0.5 flex items-start gap-2 text-[#4E5450] font-sans">
                              <span className="text-amber-600 mt-1 shrink-0">•</span>
                              <span>{line.trim().substring(2)}</span>
                            </div>
                          );
                        }

                        return <p key={idx} className="mb-2 last:mb-0 font-sans">{line}</p>;
                      })}
                    </div>
                    <span className="text-[9px] font-mono opacity-50 block mt-2 text-right">
                      {m.timestamp}
                    </span>
                  </div>

                  {!isCoach && (
                    <div className="h-8 w-8 rounded-full bg-stone-100 text-[#2D312E] font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs border border-[#2D312E]/10">
                      Me
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex justify-start items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-200 text-amber-800 font-bold flex items-center justify-center shrink-0 text-xs animate-spin">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div className="bg-[#FAF9F6] border border-[#2D312E]/5 rounded-xl px-4 py-3 text-xs text-[#7A827B] flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-600 animate-ping" />
                <span>Coach is reflecting on schedule priorities and organizing advice...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Error notification display */}
        {errorStatus && (
          <div className="bg-amber-50 border-t border-b border-amber-200 text-amber-850 text-xs px-4 py-2 flex items-center justify-between font-mono">
            <span>⚠️ Focus Note: API call had an issue. Click below to retry.</span>
            <button
              onClick={() => handleSendMessage()}
              className="underline font-bold text-amber-900 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
            >
              Retry Call Direct
            </button>
          </div>
        )}

        {/* Input Form Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="border-t border-[#2D312E]/10 p-4 bg-[#FAF9F6] flex gap-3 items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder={loading ? "Companion is writing..." : "Type here to map workflow details or get high urgency check assistance..."}
            className="flex-1 bg-white border border-[#2D312E]/10 text-[#2D312E] rounded-xl px-4 py-2.5 text-xs font-sans focus:outline-hidden focus:border-amber-500 placeholder:text-[#7A827B]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-[#1C1E1B] hover:bg-amber-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition cursor-pointer shrink-0"
          >
            <Send className="h-4 w-4 stroke-[2]" />
          </button>
        </form>

      </div>

    </div>
  );
}
