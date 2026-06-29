import React, { useState } from "react";
import { Task } from "../types";
import { computeUrgencyScore, getRelativeTimeISO } from "../data";
import { Plus, Search, Calendar, Zap, Clock, ShieldCheck, Trash2, Check, Sparkles, Filter, Music, VolumeX, RefreshCw, Loader } from "lucide-react";

interface TaskManagementProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, "id" | "createdAt">) => void;
  onToggleTaskComplete: (id: string) => void;
  onDeleteTask: (id: string) => void;
  currentTime: Date;
}

export default function TaskManagementView({ tasks, onAddTask, onToggleTaskComplete, onDeleteTask, currentTime }: TaskManagementProps) {
  // Creation Form state
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>("high");
  const [deadlinePreset, setDeadlinePreset] = useState("4"); // hours relative
  const [customDeadline, setCustomDeadline] = useState("");
  const [duration, setDuration] = useState<number>(30);
  const [energy, setEnergy] = useState<'high' | 'medium' | 'low'>("medium");
  const [useCustomDeadline, setUseCustomDeadline] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  const handleAiEnrich = async () => {
    if (!title.trim()) {
      setEnrichError("Please type a quick descriptive draft first.");
      return;
    }
    setIsEnriching(true);
    setEnrichError(null);
    try {
      const response = await fetch("/api/suggest-task-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() })
      });
      if (!response.ok) {
        throw new Error("AI Suggestion service completed with error.");
      }
      const data = await response.json();
      if (data) {
        if (data.refinedTitle) setTitle(data.refinedTitle);
        if (data.priority) setPriority(data.priority.toLowerCase());
        if (data.energy) setEnergy(data.energy.toLowerCase());
        if (data.duration) setDuration(Number(data.duration));
      }
    } catch (err: any) {
      console.warn("AI enrich prediction failed:", err);
      setEnrichError("Recommended details preview failed. Keep editing manually.");
    } finally {
      setIsEnriching(false);
    }
  };

  // Search & Filters state
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [energyFilter, setEnergyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"pending" | "completed" | "all">("pending");
  const [sortBy, setSortBy] = useState<"urgency" | "deadline" | "duration">("urgency");

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalDeadlineISO = "";
    if (useCustomDeadline && customDeadline) {
      finalDeadlineISO = new Date(customDeadline).toISOString();
    } else {
      const hours = parseFloat(deadlinePreset);
      finalDeadlineISO = getRelativeTimeISO(hours);
    }

    onAddTask({
      title: title.trim(),
      priority,
      deadlineTime: finalDeadlineISO,
      duration,
      energy,
      completed: false
    });

    // Reset fields
    setTitle("");
    setPriority("high");
    setDeadlinePreset("4");
    setCustomDeadline("");
    setDuration(30);
    setEnergy("medium");
    setUseCustomDeadline(false);
  };

  // Enhance tasks with live urgency metadata
  const liveTasks = tasks.map(t => {
    const urgencyDetail = computeUrgencyScore(t, currentTime.toISOString());
    return {
      ...t,
      urgency: urgencyDetail.score,
      hoursRemaining: urgencyDetail.hoursRemaining,
      urgencyLabel: urgencyDetail.label
    };
  });

  // Filter Tasks
  const filteredTasks = liveTasks.filter(t => {
    const searchMatch = t.title.toLowerCase().includes(search.toLowerCase());
    const priorityMatch = priorityFilter === "all" || t.priority === priorityFilter;
    const energyMatch = energyFilter === "all" || t.energy === energyFilter;
    
    let statusMatch = true;
    if (statusFilter === "pending") statusMatch = !t.completed;
    if (statusFilter === "completed") statusMatch = t.completed;

    return searchMatch && priorityMatch && energyMatch && statusMatch;
  });

  // Sort Tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "urgency") {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      return b.urgency - a.urgency;
    }
    if (sortBy === "deadline") {
      return new Date(a.deadlineTime).getTime() - new Date(b.deadlineTime).getTime();
    }
    if (sortBy === "duration") {
      return b.duration - a.duration;
    }
    return 0;
  });

  // Count items
  const totalCount = tasks.length;
  const pendingCount = tasks.filter(t => !t.completed).length;
  const completedCount = totalCount - pendingCount;

  // Format countdown label
  const getCountdownLabel = (hoursRemaining: number) => {
    if (hoursRemaining <= 0) return "🔴 Overdue!";
    if (hoursRemaining < 1) {
      const mins = Math.round(hoursRemaining * 60);
      return `🔴 Due in ${mins}m`;
    }
    if (hoursRemaining < 24) {
      return `⚡ Due in ${hoursRemaining.toFixed(1)}h`;
    }
    const days = Math.floor(hoursRemaining / 24);
    const extraHours = Math.round(hoursRemaining % 24);
    return `📅 Due in ${days}d ${extraHours}h`;
  };

  // Translate urgency score to cohesive soft-light levels
  const getUrgencyBadgeStyle = (score: number) => {
    if (score >= 3.0) {
      return "text-rose-800 bg-rose-100 border-rose-300 animate-pulse";
    } else if (score >= 1.5) {
      return "text-amber-800 bg-amber-100 border-amber-200";
    } else if (score >= 0.6) {
      return "text-blue-800 bg-blue-100 border-blue-200";
    }
    return "text-emerald-800 bg-emerald-100 border-emerald-200";
  };

  return (
    <div id="tasks-view-root" className="space-y-8 animate-fade-in text-[#2D312E] font-sans">
      
      {/* Upper Grid: Task Creator + Progress Insights */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Soft Modern Task Creator Form */}
        <div className="lg:col-span-2 bg-white border border-[#2D312E]/10 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 border-b border-[#2D312E]/10 pb-3">
            <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1C1E1B] font-serif">Plan a New Commitment Target</h3>
              <p className="text-xs text-[#7A827B] mt-0.5">Define your tasks with soft scheduling anchors.</p>
            </div>
          </div>

          <form onSubmit={handleSubmitTask} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-[#7A827B] font-mono uppercase tracking-wider">Task Title</label>
                <button
                  type="button"
                  onClick={handleAiEnrich}
                  disabled={isEnriching || !title.trim()}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1.5 cursor-pointer transition ${
                    title.trim()
                      ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                      : "text-stone-400 bg-stone-100 border-stone-200 cursor-not-allowed opacity-50 font-normal"
                  }`}
                  title="Optimize and compute best priority, energy, and duration using AI"
                  id="ai-enrich-btn"
                >
                  {isEnriching ? (
                    <Loader className="h-2.5 w-2.5 animate-spin text-amber-600" />
                  ) : (
                    <Sparkles className="h-2.5 w-2.5 text-amber-600 animate-pulse" />
                  )}
                  <span>{isEnriching ? "Refining..." : "✨ AI Assist Suggest"}</span>
                </button>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (enrichError) setEnrichError(null);
                }}
                placeholder="e.g. Write initial project presentation draft"
                className="w-full bg-[#FAF9F6] border border-[#2D312E]/10 text-[#1C1E1B] rounded-xl px-4 py-2.5 text-xs focus:outline-hidden focus:border-amber-500/50 font-sans placeholder-[#7A827B]"
                required
              />
              {enrichError && (
                <p className="text-[10px] text-rose-600 mt-1 font-sans">{enrichError}</p>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              
              {/* Priority Selection */}
              <div>
                <label className="text-[10px] font-bold text-[#7A827B] font-mono uppercase tracking-wider">Priority Weight</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-[#FAF9F6] border border-[#2D312E]/10 text-[#1C1E1B] rounded-xl px-3 py-2.5 text-xs mt-1 focus:outline-hidden cursor-pointer"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Energy match filter */}
              <div>
                <label className="text-[10px] font-bold text-[#7A827B] font-mono uppercase tracking-wider">Energy Demand</label>
                <select
                  value={energy}
                  onChange={(e) => setEnergy(e.target.value as any)}
                  className="w-full bg-[#FAF9F6] border border-[#2D312E]/10 text-[#1C1E1B] rounded-xl px-3 py-2.5 text-xs mt-1 focus:outline-hidden cursor-pointer"
                >
                  <option value="high">🔥 High Energy</option>
                  <option value="medium">⚡ Medium Energy</option>
                  <option value="low">💤 Calm Low Energy</option>
                </select>
              </div>

              {/* Estimated minutes */}
              <div>
                <label className="text-[10px] font-bold text-[#7A827B] font-mono uppercase tracking-wider">Target Duration (Min)</label>
                <input
                  type="number"
                  value={duration || ""}
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 0))}
                  min={1}
                  className="w-full bg-[#FAF9F6] border border-[#2D312E]/10 text-[#1C1E1B] rounded-xl px-3 py-2 text-xs mt-1 focus:outline-hidden"
                />
              </div>

            </div>

            {/* Deadline preset bar */}
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#2D312E]/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#7A827B] uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-700" /> Deadline Allocation
                </span>
                
                <button
                  type="button"
                  onClick={() => setUseCustomDeadline(!useCustomDeadline)}
                  className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline leading-none cursor-pointer transition-all underline-offset-2"
                >
                  {useCustomDeadline ? "Use simple hour presets" : "Select specific date"}
                </button>
              </div>

              {useCustomDeadline ? (
                <div>
                  <input
                    type="datetime-local"
                    value={customDeadline}
                    onChange={(e) => setCustomDeadline(e.target.value)}
                    className="w-full bg-white border border-[#2D312E]/10 text-[#1C1E1B] rounded-xl px-3 py-2 text-xs focus:outline-hidden"
                    required={useCustomDeadline}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2" id="task-creation-presets">
                  {[
                    { label: "2 Hrs", val: "2" },
                    { label: "4 Hrs", val: "4" },
                    { label: "6 Hrs", val: "6" },
                    { label: "Tomorrow", val: "24" },
                    { label: "3 Days", val: "72" }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setDeadlinePreset(p.val)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        deadlinePreset === p.val
                          ? "bg-[#1C1E1B] text-white border-transparent shadow-xs"
                          : "bg-white text-[#2D312E] border-[#2D312E]/10 hover:bg-[#FAF9F6]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#1C1E1B] hover:bg-amber-700 text-white py-3 px-4 rounded-xl font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-3"
            >
              <Sparkles className="h-3.5 w-3.5" /> Inject Focus Target
            </button>
          </form>
        </div>

        {/* Commitment Insights Info Block */}
        <div className="bg-white border border-[#2D312E]/10 p-6 rounded-2xl flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold font-mono">
              <Zap className="h-3.5 w-3.5 text-amber-600" /> Focus Load Dynamics
            </span>
            <h3 className="text-base font-bold text-[#1C1E1B] font-serif tracking-tight">Active Commitment Status</h3>
            <p className="text-xs text-[#7A827B] leading-relaxed">
              Currently holding <strong className="text-[#1C1E1B]">{pendingCount} pending items</strong> in your queue, representing <strong className="text-[#1C1E1B]">{tasks.filter(t => !t.completed).reduce((sum, t) => sum + t.duration, 0)} total minutes</strong> of focus capacity.
            </p>

            <div className="border-t border-[#2D312E]/5 pt-4 mt-6 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#7A827B]">Completion Progress</span>
                <span className="text-emerald-700 font-bold">
                  {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden border border-[#2D312E]/5">
                <div 
                  className="bg-emerald-600 h-full transition-all duration-300" 
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#2D312E]/5 text-[11px] text-[#4E5450] leading-normal font-sans my-4">
            💪 <b>Pacing Suggestion:</b> Pushing tasks sequentially is proven to reduce mental switching costs. Block deep work blocks cleanly using presets.
          </div>

          {/* 🎵 Zen Background Sound Controller Card */}
          <div className="bg-[#FAF9F5] border border-amber-200/50 rounded-xl p-4 text-xs space-y-2.5">
            <div className="flex items-center gap-1.5 border-b border-[#2D312E]/5 pb-1.5">
              <Music className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
              <span className="font-bold text-[#1C1E1B] tracking-tight uppercase font-mono text-[10px]">Zen Sound Station</span>
            </div>
            
            <p className="text-[10px] text-stone-500 leading-normal font-sans">
              Shut down or swap therapeutic background waves on-the-fly while sorting focus commitment lists.
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("zen-audio-control", { detail: { action: "toggle" } }));
                }}
                className="w-full bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 py-1.5 px-2 rounded-lg font-mono text-[9px] uppercase tracking-wide font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <RefreshCw className="h-2.5 w-2.5 text-teal-600" />
                <span>Toggle Music</span>
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("zen-audio-control", { detail: { action: "stop" } }));
                }}
                className="w-full bg-stone-900 hover:bg-stone-800 text-amber-400 py-1.5 px-2 rounded-lg font-mono text-[9px] uppercase tracking-wide font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <VolumeX className="h-2.5 w-2.5 text-amber-500" />
                <span>Stop Track</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Main Filterable Lists of Tasks */}
      <div className="bg-white border border-[#2D312E]/10 rounded-2xl px-6 py-6 space-y-6 shadow-xs">
        
        {/* Toggle + Search */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2D312E]/5 pb-4">
          
          {/* Status selector tabs */}
          <div className="flex border border-[#2D312E]/10 bg-[#FAF9F6] p-1 rounded-xl self-start">
            {(["pending", "completed", "all"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === status
                    ? "bg-white text-[#1C1E1B] shadow-xs border border-[#2D312E]/5 font-bold"
                    : "text-[#7A827B] hover:text-[#1C1E1B]"
                }`}
              >
                <span className="capitalize">{status}</span> ({
                  status === "pending" ? pendingCount : status === "completed" ? completedCount : totalCount
                })
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-[#7A827B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search commitment goals..."
              className="w-full bg-[#FAF9F6] border border-[#2D312E]/10 text-[#1C1E1B] rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-hidden placeholder:text-[#7A827B]"
            />
          </div>

        </div>

        {/* Secondary detailed filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FAF9F6] p-4 rounded-xl border border-[#2D312E]/10">
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#7A827B]" />
              <span className="text-xs text-[#7A827B] font-mono">Filters:</span>
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white border border-[#2D312E]/10 text-[#2D312E] rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">Priority: All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={energyFilter}
              onChange={(e) => setEnergyFilter(e.target.value)}
              className="bg-white border border-[#2D312E]/10 text-[#2D312E] rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">Energy: All</option>
              <option value="high">High Demand</option>
              <option value="medium">Medium Demand</option>
              <option value="low">Low Demand</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7A827B] font-mono">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-[#2D312E]/10 text-[#1C1E1B] rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden cursor-pointer font-bold"
            >
              <option value="urgency">Urgency Metric</option>
              <option value="deadline">Chronological Date</option>
              <option value="duration">Task Duration</option>
            </select>
          </div>

        </div>

        {/* List display */}
        <div className="space-y-3" id="task-management-list">
          {sortedTasks.map((t) => {
            const isTaskAtRisk = t.hoursRemaining > 0 && t.hoursRemaining < 3 && !t.completed;
            return (
              <div
                key={t.id}
                className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all ${
                  t.completed
                    ? "bg-[#FAF9F6]/50 border-stone-200/50 text-[#7A827B]/60"
                    : isTaskAtRisk
                    ? "bg-rose-50/70 border-rose-200 shadow-xs"
                    : "bg-white border-[#2D312E]/10 hover:border-stone-300"
                }`}
              >
                
                <div className="flex items-start gap-4 flex-1">
                  <button
                    onClick={() => {
                      onToggleTaskComplete(t.id);
                      if (!t.completed) {
                        try {
                          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                          const osc = audioCtx.createOscillator();
                          const gain = audioCtx.createGain();
                          osc.connect(gain);
                          gain.connect(audioCtx.destination);
                          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
                          osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
                          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                          osc.start();
                          osc.stop(audioCtx.currentTime + 0.3);
                        } catch (err) {}
                      }
                    }}
                    className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                      t.completed
                        ? "bg-emerald-600 border-transparent text-white"
                        : "bg-white border-[#2D312E]/20 text-transparent hover:border-amber-600"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[4]" />
                  </button>

                  <div className="space-y-1">
                    <h4 className={`text-sm font-semibold font-sans ${t.completed ? "line-through text-[#7A827B]/65" : "text-[#1C1E1B]"}`}>
                      {t.title}
                    </h4>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#7A827B] font-mono">
                      <span className={`font-bold ${
                        t.priority === 'critical' ? 'text-rose-700' : t.priority === 'high' ? 'text-amber-700' : t.priority === 'medium' ? 'text-blue-700' : 'text-stone-600'
                      }`}>
                        {t.priority.toUpperCase()} priority
                      </span>

                      <span className="border-l border-[#2D312E]/10 pl-3">
                        {t.energy} energy match
                      </span>

                      <span className="border-l border-[#2D312E]/10 pl-3">
                        {t.duration} min
                      </span>

                      <span className="border-l border-[#2D312E]/10 pl-3">
                        Added: {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-4 mt-3 md:mt-0 justify-between border-t border-[#2D312E]/5 pt-3 md:pt-0 md:border-transparent pl-9 md:pl-0">
                  
                  {!t.completed && (
                    <div className="text-right">
                      <span className={`text-xs font-semibold font-mono ${isTaskAtRisk ? "text-rose-700 font-bold" : "text-[#7A827B]"}`}>
                        {getCountdownLabel(t.hoursRemaining)}
                      </span>
                      <div className="text-[10px] text-[#7A827B] mt-0.5 font-mono">
                        Due: {new Date(t.deadlineTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {!t.completed && (
                      <div className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${getUrgencyBadgeStyle(t.urgency)}`}>
                        load: {t.urgency.toFixed(1)}
                      </div>
                    )}

                    <button
                      onClick={() => onDeleteTask(t.id)}
                      className="p-1.5 hover:bg-stone-50 text-[#7A827B] hover:text-stone-900 rounded-lg transition cursor-pointer"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}

          {sortedTasks.length === 0 && (
            <div className="text-center py-12 bg-[#FAF9F6]/50 border border-dashed border-[#2D312E]/10 rounded-2xl">
              <Search className="h-8 w-8 text-[#7A827B]/60 mx-auto" />
              <h4 className="text-xs font-semibold text-[#1C1E1B] mt-2">No commitment items found</h4>
              <p className="text-xs text-[#7A827B] mt-1 font-sans">Modify search letters or filters to find matching items.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
