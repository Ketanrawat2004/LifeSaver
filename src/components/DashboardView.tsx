import React, { useState, useEffect } from "react";
import { Task, Habit } from "../types";
import { computeUrgencyScore } from "../data";
import { AlertTriangle, Play, Pause, RotateCcw, CheckCircle, Zap, Shield, Sparkles, ArrowRight, Hourglass, Target, Loader } from "lucide-react";
import StressVaporizer from "./StressVaporizer";

interface DashboardProps {
  tasks: Task[];
  habits: Habit[];
  onCompleteTask: (id: string) => void;
  onNavigateToCoach: () => void;
  currentTime: Date;
}

export default function DashboardView({ tasks, habits, onCompleteTask, onNavigateToCoach, currentTime }: DashboardProps) {
  // Focus Session State
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [focusTimeLeft, setFocusTimeLeft] = useState<number>(25 * 60); // 25 min default
  const [isFocusActive, setIsFocusActive] = useState<boolean>(false);
  const [totalFocusToday, setTotalFocusToday] = useState<number>(0); // in minutes
  const [microMilestones, setMicroMilestones] = useState<{ id: string; text: string; done: boolean }[]>([]);
  const [newMilestoneText, setNewMilestoneText] = useState<string>("");
  const [isAiBreakingDown, setIsAiBreakingDown] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiBreakdown = async () => {
    if (!selectedTask) return;
    setIsAiBreakingDown(true);
    setAiError(null);
    try {
      const response = await fetch("/api/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedTask.title,
          priority: selectedTask.priority,
          energy: selectedTask.energy,
          duration: selectedTask.duration
        })
      });
      if (!response.ok) {
        throw new Error("AI failed to decompose this task.");
      }
      const data = await response.json();
      if (data && Array.isArray(data.steps) && data.steps.length > 0) {
        const milestones = data.steps.map((step: string, index: number) => ({
          id: `ai-ms-${Date.now()}-${index}`,
          text: step.replace(/^[\s\d.-]+/, "").trim(),
          done: false
        }));
        setMicroMilestones(milestones);
      } else {
        throw new Error("Could not parse structured subtasks.");
      }
    } catch (err: any) {
      console.warn("AI breakdown error:", err);
      setAiError(err.message || "Failed to generate AI breakdown. Please try again.");
    } finally {
      setIsAiBreakingDown(false);
    }
  };

  // Find active tasks
  const activeTasks = tasks.filter(t => !t.completed);
  const emergencyTasks = activeTasks.filter(t => {
    const detail = computeUrgencyScore(t, currentTime.toISOString());
    return detail.hoursRemaining > 0 && detail.hoursRemaining < 3;
  });

  const hasEmergency = emergencyTasks.length > 0;
  // If there's an emergency, auto-select the highest urgency one
  const primaryEmergencyTask = emergencyTasks[0];

  // Auto-fill target task on load or when tasks change
  useEffect(() => {
    if (primaryEmergencyTask) {
      setSelectedTaskId(primaryEmergencyTask.id);
      setMicroMilestones([
        { id: "ms-1", text: "Isolate other tabs and write down step 1", done: false },
        { id: "ms-2", text: "Create initial draft / outline outline", done: false },
        { id: "ms-3", text: "Build out the core content block", done: false },
        { id: "ms-4", text: "Review against simple goals and final check", done: false },
      ]);
    } else if (activeTasks.length > 0 && !selectedTaskId) {
      const sortedByUrgency = [...activeTasks].sort((a, b) => {
        return computeUrgencyScore(b, currentTime.toISOString()).score - computeUrgencyScore(a, currentTime.toISOString()).score;
      });
      setSelectedTaskId(sortedByUrgency[0].id);
      setMicroMilestones([
        { id: "ms-1", text: "Define minimum viable outline", done: false },
        { id: "ms-2", text: "Perform 5 minutes of focused reading/drafting", done: false },
        { id: "ms-3", text: "Execute main layout polish", done: false }
      ]);
    }
  }, [primaryEmergencyTask, tasks.length]);

  // Handle active focus timer
  useEffect(() => {
    let timer: any = null;
    if (isFocusActive) {
      timer = setInterval(() => {
        setFocusTimeLeft(prev => {
          if (prev <= 1) {
            setIsFocusActive(false);
            setTotalFocusToday(curr => curr + 25);
            // soft audio chime feedback
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.type = "sine";
              oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note (softer, warmer note)
              gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
              oscillator.start();
              oscillator.stop(audioCtx.currentTime + 0.35);
            } catch (e) {
              console.log("Audio feedback blocked or unavailable:", e);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isFocusActive]);

  const toggleFocus = () => {
    setIsFocusActive(!isFocusActive);
  };

  const resetFocus = (durationMins = 25) => {
    setIsFocusActive(false);
    setFocusTimeLeft(durationMins * 60);
  };

  const addMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneText.trim()) return;
    setMicroMilestones([
      ...microMilestones,
      { id: `custom-ms-${Date.now()}`, text: newMilestoneText, done: false }
    ]);
    setNewMilestoneText("");
  };

  const toggleMilestone = (id: string) => {
    setMicroMilestones(prev => prev.map(m => m.id === id ? { ...m, done: !m.done } : m));
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || activeTasks[0];

  // Calculate Urgency details
  const maxUrgencyScore = activeTasks.reduce((max, t) => {
    const s = computeUrgencyScore(t, currentTime.toISOString()).score;
    return s > max ? s : max;
  }, 0);

  const avgUrgencyScore = activeTasks.length > 0
    ? activeTasks.reduce((acc, t) => acc + computeUrgencyScore(t, currentTime.toISOString()).score, 0) / activeTasks.length
    : 0;

  const formatSecs = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard-view-root">
      
      {/* 🔴 COZY FOCUS ALERT FOR HIGH PRIORITY TARGET */}
      {hasEmergency && primaryEmergencyTask && (
        <div 
          id="dashboard-crisis-box"
          className="relative overflow-hidden bg-rose-50 border border-rose-200/60 rounded-2xl p-6 md:p-8 shadow-xs text-[#2D312E]"
        >
          {/* Decorative soft glowing radar ring */}
          <div className="absolute right-6 top-6 h-12 w-12 rounded-full border border-rose-400/15 flex items-center justify-center animate-ping pointer-events-none" />
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-100 border border-rose-200 text-rose-700 rounded-xl shrink-0">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wider font-mono">
                  <Zap className="h-3 w-3" /> Imminent Deadline
                </span>
                <h2 className="text-xl md:text-2xl font-bold font-serif text-[#1C1E1B] tracking-tight mt-1.5">
                  Action Recommendation: "{primaryEmergencyTask.title}"
                </h2>
                <p className="text-sm text-[#4E5450] mt-1 max-w-2xl font-sans">
                  This work is scheduled with a due constraint in <span className="font-bold text-amber-700">{Math.max(0.1, (new Date(primaryEmergencyTask.deadlineTime).getTime() - currentTime.getTime()) / (1000 * 60 * 60)).toFixed(1)} hours</span>. 
                  We cleared away other scheduling noise. Take the first baby step below to initiate flow.
                </p>
              </div>

              {/* Anti-procrastination micro-steps */}
              <div className="bg-white/90 p-5 rounded-xl border border-[#2D312E]/10 space-y-4 shadow-xs">
                <div className="flex justify-between items-center border-b border-[#2D312E]/5 pb-2">
                  <h4 className="text-xs font-bold text-[#1C1E1B] tracking-wider uppercase flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-amber-600" /> Focus Milestones
                  </h4>
                  <span className="text-xs text-[#7A827B] bg-[#FAF9F6] px-2 py-0.5 rounded-lg border border-[#2D312E]/5 font-medium">
                    {microMilestones.filter(m => m.done).length} / {microMilestones.length} Done
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-3" id="crisis-milestone-list">
                  {microMilestones.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleMilestone(m.id)}
                      className={`flex items-start text-left gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        m.done
                          ? "bg-stone-50 border-stone-200 text-[#7A827B]/80 line-through"
                          : "bg-white border-[#2D312E]/85 hover:border-amber-600 text-[#1C1E1B] hover:bg-[#FEFAF4]"
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        m.done ? "border-amber-600 bg-amber-600 text-white" : "border-[#2D312E]/20 bg-white"
                      }`}>
                        {m.done && <CheckCircle className="h-3.5 w-3.5 stroke-[3] text-white" />}
                      </div>
                      <span className="text-xs font-medium">{m.text}</span>
                    </button>
                  ))}
                </div>

                {/* Milestone Adding */}
                <form onSubmit={addMilestone} className="flex gap-2">
                  <input
                    type="text"
                    value={newMilestoneText}
                    onChange={(e) => setNewMilestoneText(e.target.value)}
                    placeholder="Break this down into an incredibly small, easy step..."
                    className="flex-1 bg-[#FAF9F6] text-[#1C1E1B] border border-[#2D312E]/10 rounded-xl px-4 py-2 text-xs focus:outline-hidden focus:border-amber-500/50 placeholder:text-[#7A827B] font-sans"
                  />
                  <button
                    type="submit"
                    className="bg-[#1C1E1B] hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Add Step
                  </button>
                </form>
              </div>

              {/* Crisis Countdown controls */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <div className="flex items-center gap-3">
                  <div className="font-mono text-2xl font-bold tracking-widest text-[#1C1E1B] bg-white px-4 py-2 rounded-xl border border-[#2D312E]/10 shadow-xs">
                    {formatSecs(focusTimeLeft)}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={toggleFocus}
                      className="p-2.5 bg-[#1C1E1B] hover:bg-amber-700 text-white font-semibold rounded-xl transition cursor-pointer shadow-xs"
                      title={isFocusActive ? "Pause Timer" : "Start Focus Timer"}
                    >
                      {isFocusActive ? <Pause className="h-4.5 w-4.5 fill-white" /> : <Play className="h-4.5 w-4.5 fill-white ml-0.5" />}
                    </button>
                    <button
                      onClick={() => resetFocus(15)}
                      className="p-2.5 bg-white hover:bg-[#FAF9F6] text-[#2D312E] rounded-xl border border-[#2D312E]/10 transition cursor-pointer shadow-xs"
                      title="Reset standard 15-minute chunk"
                    >
                      <RotateCcw className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#7A827B]">
                  <span>or</span>
                  <button
                    onClick={() => {
                      onCompleteTask(primaryEmergencyTask.id);
                      try {
                        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
                        osc.frequency.setValueAtTime(659.25, oscillator_time => audioCtx.currentTime + 0.15); // E5
                        osc.frequency.setValueAtTime(783.99, last_time => audioCtx.currentTime + 0.3); // G5
                        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                        osc.start();
                        osc.stop(audioCtx.currentTime + 0.55);
                      } catch (err) {}
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition cursor-pointer font-bold"
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Complete Task
                  </button>
                  <button
                    onClick={onNavigateToCoach}
                    className="flex items-center gap-1 px-3 py-2 bg-white border border-[#2D312E]/10 hover:bg-stone-50 rounded-xl text-[#2D312E] transition cursor-pointer"
                  >
                    Consult AI Companion <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout: Stats / Workspace selection */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Organic Progress Meter */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Soft Progress Wheel / Gauge */}
          <div className="bg-white border border-[#2D312E]/10 p-6 rounded-2xl shadow-xs" id="urgency-meter-card">
            <h3 className="text-xs font-bold tracking-wider text-[#7A827B] uppercase font-mono flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-600" /> Focus Status Overview
            </h3>
            
            <div className="flex flex-col items-center justify-center py-6">
              {/* Premium, Non-Clipped Soft Dial Display */}
              <div className="relative w-48 h-28 flex items-end justify-center">
                <svg className="w-48 h-24 absolute bottom-0 select-none overflow-visible" viewBox="0 0 100 55">
                  {/* Gauge background track */}
                  <path
                    d="M 15,50 A 35,35 0 0,1 85,50"
                    fill="none"
                    stroke="#E6E5DF"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  {/* Gauge colored progress track */}
                  <path
                    d="M 15,50 A 35,35 0 0,1 85,50"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray="110"
                    strokeDashoffset={110 - Math.min(110, (maxUrgencyScore / 10) * 110)}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                {/* Meter Value positioned at center focal point */}
                <div className="z-10 text-center select-none pb-2 relative">
                  <div className="text-3xl font-extrabold font-mono text-[#1C1E1B] tracking-tight leading-none">
                    {maxUrgencyScore.toFixed(1)}
                  </div>
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-widest font-mono mt-1">
                    {maxUrgencyScore >= 3.0 ? "High Load" : maxUrgencyScore >= 1.5 ? "Steady Pace" : "Clear Space"}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-[#7A827B] text-center mt-4 max-w-[210px] leading-relaxed">
                Urgency algorithm assesses pending work vs timer durations dynamically.
              </p>
            </div>

            <div className="border-t border-[#2D312E]/5 pt-4 mt-1 grid grid-cols-2 text-center text-xs">
              <div>
                <span className="text-[#7A827B] font-medium font-sans">Average Load</span>
                <p className="text-base font-bold text-[#1C1E1B] mt-0.5 font-mono">{avgUrgencyScore.toFixed(1)}</p>
              </div>
              <div className="border-l border-[#2D312E]/5">
                <span className="text-[#7A827B] font-medium font-sans">Active Tasks</span>
                <p className={`text-base font-bold mt-0.5 font-mono ${emergencyTasks.length > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {activeTasks.length}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics of the Day */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[#2D312E]/10 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
              <span className="text-xs text-[#7A827B] font-semibold">Today's Focus</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-xl font-bold text-[#1C1E1B] font-mono">
                  {Math.min(10, Math.max(1, Math.round(5 + (totalFocusToday / 15) - (activeTasks.length * 0.3))))}/10
                </span>
              </div>
              <p className="text-[10px] text-[#7A827B] mt-1">Based on workflow sessions completed.</p>
            </div>

            <div className="bg-white border border-[#2D312E]/10 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
              <span className="text-xs text-[#7A827B] font-semibold">Habit Streaks</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-xl font-bold text-[#1C1E1B] font-mono">
                  {habits.reduce((max, h) => h.streak > max ? h.streak : max, 0)}d
                </span>
                <span className="text-[10px] text-emerald-700 font-bold font-mono">Max</span>
              </div>
              <p className="text-[10px] text-[#7A827B] mt-1">Daily consistency score keeps multiplying!</p>
            </div>
          </div>

          {/* Professional simple organic tip box */}
          <div className="bg-[#FAF9F6] border border-[#2D312E]/10 p-5 rounded-2xl flex gap-3.5 items-start shadow-xs">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl shrink-0 border border-amber-100">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-semibold text-[#1C1E1B] font-sans uppercase tracking-wider">Mindful Insight</h4>
              <p className="text-xs text-[#4E5450] leading-relaxed font-sans">
                "Small steps are highly effective. If you feel hesitant, committing to working for just 3 minutes is proven to reliably trigger creative momentum."
              </p>
            </div>
          </div>

        </div>

        {/* RIGHT TWO-THIRDS: Focus State Workspace */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Focus Card Board */}
          <div className="bg-white border border-[#2D312E]/10 p-6 md:p-8 rounded-2xl shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#2D312E]/5 pb-4 gap-4">
              <div>
                <h3 className="text-base font-bold text-[#1C1E1B] font-serif">Focus Builder Workspace</h3>
                <p className="text-xs text-[#7A827B] mt-0.5">Pick any pending target task to map sub-tasks or focus focus blocks.</p>
              </div>
              
              <div className="flex items-center gap-1.5 self-start bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg text-[10px] font-bold text-emerald-800 uppercase font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Target</span>
              </div>
            </div>

            {/* Selector Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#7A827B] uppercase tracking-widest font-mono">Select Target for Focus Session</label>
              <select
                value={selectedTaskId}
                onChange={(e) => {
                  setSelectedTaskId(e.target.value);
                  const t = tasks.find(item => item.id === e.target.value);
                  if (t) {
                    setMicroMilestones([
                      { id: "ms-1", text: "Outline core objectives for: " + t.title, done: false },
                      { id: "ms-2", text: "Block distractions & execute key session", done: false },
                      { id: "ms-3", text: "Clean finish and final status review", done: false }
                    ]);
                  }
                }}
                className="w-full bg-[#FAF9F6] border border-[#2D312E]/10 text-[#2D312E] rounded-xl px-4 py-3 text-xs focus:outline-hidden focus:border-amber-500/50 font-sans cursor-pointer font-medium"
              >
                {activeTasks.map(t => {
                  const detail = computeUrgencyScore(t, currentTime.toISOString());
                  return (
                    <option key={t.id} value={t.id} className="text-[#2D312E] bg-white">
                      [{t.priority.toUpperCase()} - {t.energy} energy] {t.title} (~{t.duration} min)
                    </option>
                  );
                })}
                {activeTasks.length === 0 && (
                  <option value="" className="text-[#7A827B]">No tasks remaining! Create a new task in Missions & Tasks Zone to begin.</option>
                )}
              </select>
            </div>

            {/* Interactive Workspace Panel */}
            {selectedTask ? (
              <div className="grid md:grid-cols-5 gap-6 p-6 bg-[#FAF9F6]/40 rounded-2xl border border-[#2D312E]/10">
                
                {/* Visual Timer Display */}
                <div className="md:col-span-2 flex flex-col items-center justify-center space-y-4 border-b md:border-b-0 md:border-r border-[#2D312E]/10 pb-6 md:pb-0 md:pr-6">
                  
                  <div className="text-center">
                    <span className="text-4xl font-mono font-bold tracking-wider text-[#1C1E1B] block">
                      {formatSecs(focusTimeLeft)}
                    </span>
                    <span className="text-[10px] text-[#7A827B] font-mono mt-1 block uppercase tracking-wider">
                      {isFocusActive ? "Focus Block Active" : "Session Pending"}
                    </span>
                  </div>

                  {/* Timer Controls */}
                  <div className="flex gap-2">
                    <button
                      onClick={toggleFocus}
                      className={`px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                        isFocusActive
                          ? "bg-stone-100 hover:bg-stone-200 text-[#1C1E1B]"
                          : "bg-[#1C1E1B] hover:bg-amber-700 text-white"
                      }`}
                    >
                      {isFocusActive ? (
                        <>
                          <Pause className="h-3.5 w-3.5 fill-current animate-pulse" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-current ml-0.5" /> Start Block
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => resetFocus(25)}
                      className="p-2.5 bg-white border border-[#2D312E]/10 hover:bg-[#FAF9F6] text-[#2D312E] rounded-full transition cursor-pointer shadow-xs"
                      title="Reset focus"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[9px] text-[#7A827B] font-mono uppercase font-bold">Presets:</span>
                    <button onClick={() => resetFocus(25)} className="text-[9px] font-bold bg-white border border-[#2D312E]/10 text-[#2D312E] px-2 py-0.5 rounded-sm hover:bg-[#FAF9F6] transition cursor-pointer">
                      25m
                    </button>
                    <button onClick={() => resetFocus(15)} className="text-[9px] font-bold bg-white border border-[#2D312E]/10 text-[#2D312E] px-2 py-0.5 rounded-sm hover:bg-[#FAF9F6] transition cursor-pointer">
                      15m
                    </button>
                    <button onClick={() => resetFocus(5)} className="text-[9px] font-bold bg-white border border-[#2D312E]/10 text-[#2D312E] px-2 py-0.5 rounded-sm hover:bg-[#FAF9F6] transition cursor-pointer">
                      5m
                    </button>
                  </div>
                </div>

                {/* Subtasks checklists */}
                <div className="md:col-span-3 space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-[#2D312E]/10 relative shadow-xs">
                    
                    {/* Energy tag */}
                    <div className="absolute right-3 top-3 flex items-center gap-1.5 bg-[#FAF9F6] border border-[#2D312E]/5 px-2 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selectedTask.energy === "high" ? "bg-amber-600" : selectedTask.energy === "medium" ? "bg-cyan-600" : "bg-emerald-600"
                      }`} />
                      <span className="text-[#1C1E1B]">{selectedTask.energy} energy match</span>
                    </div>

                    <h4 className="text-[#7A827B] font-mono font-bold text-[9px] uppercase tracking-wider">Current Focus Goal</h4>
                    <h3 className="font-bold text-[#1C1E1B] mt-1 text-sm leading-tight max-w-[80%]">{selectedTask.title}</h3>
                    
                    <div className="flex items-center gap-4 mt-2.5 text-xs text-[#7A827B] font-mono pt-1">
                      <div>
                        Priority: <span className="text-[#1C1E1B] font-semibold uppercase">{selectedTask.priority}</span>
                      </div>
                      <div className="border-l border-[#2D312E]/10 pl-3">
                        Duration: <span className="text-[#1C1E1B] font-semibold">{selectedTask.duration}m</span>
                      </div>
                    </div>
                  </div>

                  {/* Micro milestones list */}
                  <div className="space-y-1.5 animate-fade-in">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[9px] font-bold tracking-widest text-[#7A827B] uppercase font-mono">Actions Breakdown Checklist</span>
                      {selectedTask && (
                        <button
                          type="button"
                          onClick={handleAiBreakdown}
                          disabled={isAiBreakingDown}
                          className="text-[10px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 bg-amber-50/50 hover:bg-amber-50 cursor-pointer border border-amber-100 px-2 py-0.5 rounded-lg transition"
                          id="ai-breakdown-btn"
                        >
                          {isAiBreakingDown ? (
                            <Loader className="h-3 w-3 animate-spin text-amber-600" />
                          ) : (
                            <Sparkles className="h-3 w-3 text-amber-600 animate-pulse" />
                          )}
                          <span>{isAiBreakingDown ? "Decomposing..." : "✨ AI Breakdown"}</span>
                        </button>
                      )}
                    </div>

                    {aiError && (
                      <p className="text-[10px] text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5 font-sans">
                        {aiError}
                      </p>
                    )}

                    <div className="space-y-1">
                      {microMilestones.map(m => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between bg-white border border-[#2D312E]/10 rounded-xl p-2.5 hover:border-amber-500/30 transition shadow-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={m.done}
                              onChange={() => toggleMilestone(m.id)}
                              className="h-4.5 w-4.5 rounded border-[#2D312E]/20 text-[#1C1E1B] focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                            />
                            <span className={`text-xs font-sans ${m.done ? "line-through text-[#7A827B]/60" : "text-[#2D312E]"}`}>{m.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-[#FAF9F6] border border-dashed border-[#2D312E]/10 rounded-2xl">
                <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-semibold text-[#1C1E1B] mt-2">All tasks completed. Nicely done!</h4>
                <p className="text-xs text-[#7A827B] mt-1 max-w-sm mx-auto font-sans">
                  Take a restful breath or write suggestions into your Habit check streak.
                </p>
              </div>
            )}
          </div>

          {/* Neuro-Relaxation Stress Vaporizer Particle & Audio Sandbox */}
          <StressVaporizer tasks={tasks} />
        </div>

      </div>

    </div>
  );
}
