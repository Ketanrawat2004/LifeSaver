import React, { useState, useEffect } from "react";
import { Task, Habit, ScheduleSlot } from "../types";
import { safeStorage } from "../utils/safeStorage";
import { Sparkles, Calendar, Clock, AlertTriangle, CheckCircle, Coffee, ShieldAlert, Zap, Cpu } from "lucide-react";

interface ScheduleProps {
  tasks: Task[];
  habits: Habit[];
  currentTime: Date;
}

export default function ScheduleView({ tasks, habits, currentTime }: ScheduleProps) {
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [coaching, setCoaching] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Load schedule from localStorage if it exists or build initial fallback blocks
  useEffect(() => {
    const saved = safeStorage.getItem("lifesaver_ai_schedule");
    const savedWarn = safeStorage.getItem("lifesaver_ai_schedule_warnings");
    const savedCoach = safeStorage.getItem("lifesaver_ai_schedule_coaching");
    if (saved) {
      try {
        setSchedule(JSON.parse(saved));
        if (savedWarn) setWarnings(JSON.parse(savedWarn));
        if (savedCoach) setCoaching(savedCoach);
        return;
      } catch (e) {
        console.error("Failed to parse saved schedule", e);
      }
    }
    buildLocalSchedule();
  }, [tasks.length]);

  const buildLocalSchedule = () => {
    const active = tasks.filter(t => !t.completed);
    if (active.length === 0) {
      setSchedule([
        {
          startTime: "09:00 AM",
          endTime: "10:00 AM",
          taskId: null,
          taskTitle: "Restorative Self-Care & Reflection",
          type: "break",
          energyRequired: "none",
          reason: "Zero pending tasks. Highly recommended to perform mental rest locks."
        }
      ]);
      setWarnings([]);
      setCoaching("Your focus queue is completely clear! Take some time to celebrate.");
      return;
    }

    const sorted = [...active].sort((a,b) => new Date(a.deadlineTime).getTime() - new Date(b.deadlineTime).getTime());
    
    const slots: ScheduleSlot[] = [];
    let baseTime = new Date(currentTime);
    baseTime.setMinutes(Math.ceil(baseTime.getMinutes() / 15) * 15); // snap to 15m intervals

    sorted.forEach((t, index) => {
      // Add recovery break between large blocks
      if (index > 0 && slots[slots.length-1].type === "task") {
        const breakStartStr = formatTimeLabel(baseTime);
        baseTime.setTime(baseTime.getTime() + 15 * 60 * 1000); // 15 min break
        slots.push({
          startTime: breakStartStr,
          endTime: formatTimeLabel(baseTime),
          taskId: null,
          taskTitle: "Restorative Coffee / Walking Break",
          type: "break",
          energyRequired: "none",
          reason: "Take a deep breath and change posture to maintain concentration."
        });
      }

      const startStr = formatTimeLabel(baseTime);
      baseTime.setTime(baseTime.getTime() + t.duration * 60 * 1000);
      slots.push({
        startTime: startStr,
        endTime: formatTimeLabel(baseTime),
        taskId: t.id,
        taskTitle: t.title,
        type: "task",
        energyRequired: t.energy,
        reason: `Matched priority of ${t.priority} tasks close to imminent deadlines.`
      });
    });

    setSchedule(slots);
    setWarnings(active.length > 3 ? ["⚠️ Pacing Check: You have 4 or more tasks waiting. Consider using the AI optimizer button below to balance them."] : []);
    setCoaching("Standard scheduling algorithm loaded. Need a smarter timeline? Click Optimize Daily Timeline.");
  };

  const formatTimeLabel = (d: Date): string => {
    let hrs = d.getHours();
    const mins = d.getMinutes();
    const ampm = hrs >= 12 ? "PM" : "AM";
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${ampm}`;
  };

  const handleRunOptimizer = async () => {
    setLoading(true);
    setErrorText(null);
    try {
      const response = await fetch("/api/auto-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks,
          habits,
          currentTime: currentTime.toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP Error ${response.status}`);
      }

      const data = await response.json();
      if (data.slots && data.slots.length > 0) {
        setSchedule(data.slots);
        setWarnings(data.warnings || []);
        setCoaching(data.coachingInsights || "");
        
        safeStorage.setItem("lifesaver_ai_schedule", JSON.stringify(data.slots));
        safeStorage.setItem("lifesaver_ai_schedule_warnings", JSON.stringify(data.warnings || []));
        safeStorage.setItem("lifesaver_ai_schedule_coaching", data.coachingInsights || "");
      } else {
        throw new Error("Optimizer returned empty schedule structure.");
      }
    } catch (err: any) {
      console.error("Optimizer Error:", err);
      setErrorText(err.message || "Failed to contact optimizer server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="schedule-view-root" className="space-y-8 animate-fade-in text-[#2D312E] font-sans">
      
      {/* Top Banner section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white border border-[#2D312E]/10 p-6 rounded-2xl gap-4 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold font-mono">
            <Cpu className="h-3.5 w-3.5 text-amber-600 animate-spin" /> Focus Routing Compass
          </span>
          <h2 className="text-base font-bold text-[#1C1E1B] font-serif mt-1.5 tracking-tight">Timeline Hour Blocks</h2>
          <p className="text-xs text-[#7A827B] mt-0.5 max-w-xl">
            Automatically schedules restorative coffee breaks between intensive tasks to optimize long-term cognitive endurance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={buildLocalSchedule}
            className="px-4 py-2.5 bg-white border border-[#2D312E]/10 hover:bg-[#FAF9F6] text-[#2D312E] rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Reset to local chronological plan"
          >
            Reset Plan
          </button>
          
          <button
            onClick={handleRunOptimizer}
            disabled={loading}
            className="flex items-center gap-1.5 bg-[#1C1E1B] hover:bg-[#2D312E] text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition shadow-xs cursor-pointer disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500 animate-pulse" /> 
            {loading ? "Modeling Daily blocks..." : "Optimize Daily Timeline"}
          </button>
        </div>
      </div>

      {errorText && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between font-mono">
          <span>⚠️ Note: Server optimizer was busy. A reliable chronological route is loaded below.</span>
          <button onClick={handleRunOptimizer} className="underline font-bold text-rose-950 hover:text-rose-900 cursor-pointer">Retry Optimizer</button>
        </div>
      )}

      {/* Main Grid: Insights, Timeline */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left column: Analytics box */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-6 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold tracking-widest text-[#7A827B] font-mono uppercase flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-600" /> Focus Coach Note
            </h3>
            
            <p className="text-xs text-[#2D312E] leading-relaxed italic bg-[#FAF9F6] p-4 border-l-4 border-amber-600 rounded-r-xl shadow-xs">
              "{coaching || "Clicking 'Optimize Daily Timeline' will run an AI cognitive sweep to output custom tips match on task weight offsets."}"
            </p>

            <div className="border-t border-[#2D312E]/5 pt-4 mt-2">
              <span className="text-[10px] font-bold text-[#7A827B] font-mono tracking-wider block uppercase">Timeline Statistics</span>
              <div className="grid grid-cols-2 gap-2 mt-2 text-center text-xs">
                <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-[#2D312E]/5 shadow-xs">
                  <span className="text-[#7A827B] block font-mono">Work Items</span>
                  <strong className="text-xs text-[#1C1E1B] font-bold mt-1 block">{schedule.filter(s=>s.type === 'task').length} blocks</strong>
                </div>
                <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-[#2D312E]/5 shadow-xs">
                  <span className="text-[#7A827B] block font-mono">Break Items</span>
                  <strong className="text-xs text-[#1C1E1B] font-bold mt-1 block">{schedule.filter(s=>s.type === 'break').length} recovery</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Risks warning box */}
          <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-6 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold tracking-widest text-[#7A827B] font-mono uppercase flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-amber-600" /> Imminent Risks
            </h3>

            <div className="space-y-2">
              {warnings.map((w, idx) => (
                <div key={idx} className="bg-rose-50 border border-rose-100 text-rose-800 rounded-xl p-3 text-xs flex items-start gap-2 leading-relaxed shadow-xs">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-sans font-medium">{w}</span>
                </div>
              ))}
              
              {warnings.length === 0 && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3 text-xs flex items-start gap-2 leading-relaxed shadow-xs">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-sans font-medium">All tasks are nicely achievable given current timing constraints. Doing great!</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right timeline agenda */}
        <div className="lg:col-span-2 bg-white border border-[#2D312E]/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs">
          <div className="border-b border-[#2D312E]/5 pb-3">
            <h3 className="text-base font-bold text-[#1C1E1B] font-serif tracking-tight">Today's Focus Map</h3>
            <p className="text-xs text-[#7A827B] mt-0.5">Chronological checklist. Follow sequences exactly for best results.</p>
          </div>

          {/* Timeline segments */}
          <div className="space-y-4 relative" id="schedule-slots-timeline">
            {schedule.map((s, idx) => {
              const isTask = s.type === "task";
              return (
                <div key={idx} className="relative pl-6 md:pl-8 flex items-start group">
                  {/* Stem */}
                  {idx < schedule.length - 1 && (
                    <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-[#2D312E]/5 group-hover:bg-[#2D312E]/10 transition-colors" />
                  )}

                  {/* Bullet */}
                  <div className={`absolute left-0 mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center bg-white z-10 transition-transform group-hover:scale-105 ${
                    isTask ? "border-amber-600 text-amber-700" : "border-emerald-600 text-emerald-700"
                  }`}>
                    {isTask ? <Clock className="h-2.5 w-2.5" /> : <Coffee className="h-2.5 w-2.5" />}
                  </div>

                  {/* Bubble card */}
                  <div className="flex-1 grid md:grid-cols-4 gap-4 bg-[#FAF9F6] border border-[#2D312E]/10 p-4 rounded-xl group-hover:border-[#2D312E]/25 transition-all shadow-xs">
                    
                    {/* Hourly block */}
                    <div className="md:col-span-1">
                      <span className="text-xs font-bold text-[#1C1E1B] font-mono tracking-tight block">
                        {s.startTime}
                      </span>
                      <span className="text-[10px] text-[#7A827B] font-mono mt-0.5 block">
                        until {s.endTime}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="md:col-span-2 space-y-1">
                      <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono tracking-wider uppercase ${
                        isTask ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {s.type}
                      </span>
                      <h4 className="text-xs font-bold text-[#1C1E1B] font-sans block mt-1">{s.taskTitle}</h4>
                      
                      <p className="text-xs text-[#7A827B] font-sans leading-relaxed pt-1">
                        {s.reason}
                      </p>
                    </div>

                    {/* Requirements */}
                    <div className="md:col-span-1 flex flex-col justify-between items-end">
                      {s.energyRequired !== "none" ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider uppercase ${
                          s.energyRequired === "high" ? "bg-amber-100 text-amber-800" : s.energyRequired === "medium" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          <Zap className="h-2.5 w-2.5 text-amber-600 fill-amber-500" /> {s.energyRequired}
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold text-[#7A827B] bg-white border border-[#2D312E]/5 px-2 py-0.5 rounded-lg shadow-2xs">REST</span>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}

            {schedule.length === 0 && (
              <div className="text-center py-12 border border-dashed border-[#2D312E]/10 rounded-2xl bg-[#FAF9F6]/50">
                <Calendar className="h-10 w-10 text-stone-300 mx-auto" />
                <h4 className="text-xs font-semibold text-[#1C1E1B] mt-2">Zero Agenda blocks constructed</h4>
                <p className="text-xs text-[#7A827B] mt-1 font-sans">Please populate some pending task targets first, then select Optimize.</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
