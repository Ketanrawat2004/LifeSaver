import React, { useState, useEffect, useRef } from "react";
import { User, Activity, Flame, ShieldAlert, Award, Timer, BatteryCharging, Zap, Compass, RefreshCw, Star, HeartCrack, Music, VolumeX, Volume2 } from "lucide-react";
import { Task, Habit, AppPreferences } from "../types";

interface ProfileViewProps {
  tasks: Task[];
  habits: Habit[];
  preferences: AppPreferences;
  currentTime: Date;
}

export default function ProfileView({ tasks, habits, preferences, currentTime }: ProfileViewProps) {
  // Session focus timer ticker
  const [secondsActive, setSecondsActive] = useState<number>(0);
  const [realtimeMilliPercent, setRealtimeMilliPercent] = useState<number>(0);
  const [cardiacPulse, setCardiacPulse] = useState<number>(72);
  const [coherenceIndex, setCoherenceIndex] = useState<number>(85);
  const [selectedFocusPreset, setSelectedFocusPreset] = useState<"equilibrium" | "hyperfocus" | "ventilation">("equilibrium");

  // Dynamic calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = tasks.filter(t => !t.completed);
  const criticalTasksCount = pendingTasks.filter(t => t.priority === "critical" || t.priority === "high").length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  
  // Calculate aggregate habit streaks
  const maxStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak), 0) : 0;
  const activeHabitsCompletedToday = habits.filter(h => {
    const todayStr = new Date().toISOString().split("T")[0];
    return h.completedDays.includes(todayStr);
  }).length;

  // Session millisecond and seconds timer ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsActive(prev => prev + 1);
    }, 1000);

    const milliTimer = setInterval(() => {
      setRealtimeMilliPercent(Math.floor(Math.random() * 99));
    }, 120);

    return () => {
      clearInterval(timer);
      clearInterval(milliTimer);
    };
  }, []);

  // Micro-fluctuation simulation of heart-rate & cardiac coherence to make UI alive & "real-time"
  useEffect(() => {
    const bioTimer = setInterval(() => {
      let multiplier = 1;
      if (selectedFocusPreset === "hyperfocus") multiplier = 1.12;
      if (selectedFocusPreset === "ventilation") multiplier = 0.88;

      setCardiacPulse(prev => {
        const base = selectedFocusPreset === "hyperfocus" ? 82 : selectedFocusPreset === "ventilation" ? 64 : 70;
        const drift = (Math.random() - 0.5) * 4;
        return Math.round(base + drift);
      });

      setCoherenceIndex(prev => {
        const target = selectedFocusPreset === "ventilation" ? 94 : selectedFocusPreset === "hyperfocus" ? 78 : 88;
        const drift = (Math.random() - 0.5) * 3;
        return Math.max(50, Math.min(100, Math.round(target + drift)));
      });
    }, 2000);

    return () => clearInterval(bioTimer);
  }, [selectedFocusPreset]);

  // Formatted active work session duration
  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Safe cognitive battery calculation
  const cognitiveDebt = pendingTasks.reduce((acc, t) => {
    const w = t.priority === "critical" ? 25 : t.priority === "high" ? 15 : t.priority === "medium" ? 8 : 4;
    return acc + w;
  }, 0);
  const cognitiveBattery = Math.max(12, Math.min(100, 100 - cognitiveDebt));

  // Render a live sinusoidal wave to simulate heart-rate variability coherence state live
  const svgWavePath = () => {
    let period = 20;
    let amplitude = 15;
    if (selectedFocusPreset === "hyperfocus") {
      period = 14; 
      amplitude = 12;
    } else if (selectedFocusPreset === "ventilation") {
      period = 28;
      amplitude = 22;
    }

    let points = [];
    for (let x = 0; x <= 320; x += 4) {
      // Create continuous sine coordinate
      const angle = (x / period) + (secondsActive * 1.5);
      const y = 35 + Math.sin(angle) * amplitude;
      points.push(`${x},${y}`);
    }
    return `M ${points.join(" L ")}`;
  };

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* 🚀 FIRST BLOCK: USER CARD WITH LIVE RE-DOCKING CLOCKS */}
      <div className="bg-gradient-to-br from-[#1C1E1B] to-[#343935] text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-md">
        {/* Subtle decorative glowing mesh */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 left-1/4 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          {/* Avatar & Profile Identity */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#EA3900] to-amber-500 flex items-center justify-center font-black text-xl text-white shadow-md border-2 border-white/20 uppercase">
                {preferences.username ? preferences.username.substring(0, 2) : "LS"}
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-emerald-500 border-4 border-[#1C1E1B] flex items-center justify-center text-[9px] font-bold" title="Operational">
                ●
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-serif font-black tracking-tight text-white capitalize">
                  {preferences.username || "Authorized Guest"}
                </h2>
                <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-sm">
                  Identity Verified
                </span>
              </div>
              <p className="text-xs text-[#7A827B]">
                Primary email address: <span className="font-mono text-stone-300">{preferences.username ? `${preferences.username.toLowerCase()}@gmail.com` : "temporary@workspace.net"}</span>
              </p>
              <div className="flex items-center gap-3 text-[11px] text-[#A6AFAB] pt-1">
                <span className="flex items-center gap-1"><Compass className="h-3.5 w-3.5 text-amber-500" /> Focus Target: <b className="capitalize text-white">{preferences.peakFocusTime}</b></span>
                <span className="text-[#4E5450]">•</span>
                <span>Hours: <b>{preferences.dailyFocusHoursTarget || 4}hrs/day</b></span>
              </div>
            </div>
          </div>

          {/* Session Duration Real-time Counter */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[200px] text-right space-y-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
              ● Active Gated Focus Timer
            </span>
            <div className="text-2xl font-mono font-bold tracking-tight text-white">
              {formatDuration(secondsActive)}<span className="text-xs text-[#7A827B] font-normal">.{realtimeMilliPercent.toString().padStart(2, "0")}s</span>
            </div>
            <span className="text-[10px] text-[#7A827B] block">
              Continuous live ticking state synchronization
            </span>
          </div>

        </div>
      </div>

      {/* 📊 MID GRID: COGNITIVE BATTERY & CARDIAC COHERENCE LIVE GRAPH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Cardiac HRV monitor */}
        <div className="lg:col-span-8 bg-white border border-[#2D312E]/10 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2D312E]/5 pb-3">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-[#7A827B] flex items-center gap-1">
                <Activity className="h-3 w-3 text-[#EA3900]" /> REAL-TIME CARDIO-COHERENCE SCANNER
              </span>
              <h3 className="text-base font-serif font-bold text-[#1C1E1B] tracking-tight">
                Heart Rate Variability & Respiration Vibe
              </h3>
              <p className="text-xs text-[#7A827B]">
                Synthesizing HRV sinus waves with your real-time desktop breathing cadence.
              </p>
            </div>

            {/* Presets controllers */}
            <div className="flex items-center gap-1.5 bg-[#FAF9F6] border border-[#2D312E]/10 rounded-xl p-1 self-start">
              {[
                { id: "equilibrium", label: "Equilibrium" },
                { id: "hyperfocus", label: "Hyperfocus" },
                { id: "ventilation", label: "Deep Recovery" }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedFocusPreset(opt.id as any)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    selectedFocusPreset === opt.id 
                      ? "bg-[#1C1E1B] text-white shadow-xs" 
                      : "text-[#7A827B] hover:text-[#1C1E1B]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Heart rate & coherence live reading bars */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Live digital stats */}
            <div className="md:col-span-4 grid grid-cols-2 gap-4">
              <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#2D312E]/5">
                <span className="text-[9px] font-mono text-[#7A827B] uppercase block">PULSE BIORHYTHM</span>
                <span className="text-xl font-mono font-bold text-[#1C1E1B] block">{cardiacPulse} <span className="text-[10px] font-sans font-normal text-[#7A827B]">BPM</span></span>
                <span className="text-[9px] text-[#7A827B] block mt-0.5">Live Fluctuating State</span>
              </div>

              <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#2D312E]/5">
                <span className="text-[9px] font-mono text-[#0B71E1] uppercase block">HRV COHERENCE</span>
                <span className="text-xl font-mono font-bold text-[#0B71E1] block">{coherenceIndex}%</span>
                <span className="text-[9px] text-[#7A827B] block mt-0.5">Optimal sinus balance</span>
              </div>
            </div>

            {/* Live Vector ECG/Waveform Drawing */}
            <div className="md:col-span-8 bg-[#1C1E1B] rounded-xl p-4 h-20 flex items-center justify-center overflow-hidden relative border border-[#2D312E]/20">
              <div className="absolute top-1 right-2 font-mono text-[8px] text-[#7A827B] uppercase select-none flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0B71E1] animate-ping" /> OSCILLATING VIBE SIGNAL
              </div>
              
              <svg className="w-full h-full" viewBox="0 0 320 70">
                <path
                  d={svgWavePath()}
                  fill="none"
                  stroke={selectedFocusPreset === "hyperfocus" ? "#E11D48" : selectedFocusPreset === "ventilation" ? "#10B981" : "#0B71E1"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
            </div>

          </div>

          <p className="text-[10px] text-[#7A827B] leading-relaxed italic text-center md:text-left">
            💡 <b>Tip:</b> High heart-rate variability (HRV) correlates with supreme executive attention. Choose the <b>"Deep Recovery"</b> option to open up broader wave periods and decrease stress.
          </p>
        </div>

        {/* Cognitive Battery gauge */}
        <div className="lg:col-span-4 bg-white border border-[#2D312E]/10 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-[#7A827B] flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" /> COGNITIVE FUEL GAUGE
            </span>
            <h3 className="text-base font-serif font-bold text-[#1C1E1B] tracking-tight">
              Calculated Energy levels
            </h3>
            <p className="text-xs text-[#7A827B]">
              Real-time available willpower calculated from pending vs completed tasks.
            </p>
          </div>

          {/* Core circular or block battery representation */}
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[10px] uppercase font-bold text-[#7A827B]">WILLPOWER METRIC</span>
              <span className="font-mono font-bold text-lg text-emerald-600">{cognitiveBattery}%</span>
            </div>
            
            <div className="h-4 bg-stone-100 border border-[#2D312E]/10 rounded-full overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  cognitiveBattery > 70 
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                    : cognitiveBattery > 40 
                    ? "bg-gradient-to-r from-amber-500 to-amber-400" 
                    : "bg-gradient-to-r from-rose-600 to-rose-400"
                }`} 
                style={{ width: `${cognitiveBattery}%` }} 
              />
            </div>

            <div className="flex text-[10px] text-[#7A827B] justify-between">
              <span>{pendingTasks.length} pending missions</span>
              <span>Load rating: {cognitiveDebt > 40 ? "⚠️ Intense" : "✅ Restorative"}</span>
            </div>
          </div>

          {/* Advice card based on load */}
          <div className="bg-[#FAF9F6] border border-[#2D312E]/5 rounded-xl p-3 text-xs text-[#4E5450] mb-3">
            {cognitiveBattery < 50 ? (
              <span className="block leading-relaxed">
                🚨 <b>Willpower low:</b> Your mind limits are stretched. Break down your next task with the <b>Tactical Coach</b> instead of powering through blindly.
              </span>
            ) : (
              <span className="block leading-relaxed">
                ✨ <b>Willpower optimal:</b> Great moment to tackle high-energy critical goals. Begin your focus flow now.
              </span>
            )}
          </div>

          {/* 🎵 Zen Background Sound Controller Card */}
          <div className="bg-[#FAF9F5] border border-amber-200/50 rounded-xl p-4 text-xs space-y-2.5">
            <div className="flex items-center gap-1.5 border-b border-[#2D312E]/5 pb-1.5">
              <Music className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
              <span className="font-bold text-[#1C1E1B] tracking-tight uppercase font-mono text-[10px]">Ambient Sound Station</span>
            </div>
            
            <p className="text-[10px] text-stone-500 leading-normal font-sans">
              Control the therapeutic client-side background resonance during bio-energy assessment cycles.
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("zen-audio-control", { detail: { action: "toggle" } }));
                }}
                className="w-full bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 py-1.5 px-2 rounded-lg font-mono text-[9px] uppercase tracking-wide font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <RefreshCw className="h-2.5 w-2.5 text-teal-600" />
                <span>Toggle Sound</span>
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

      {/* 🏆 THIRD BLOCK: WORKSPACE MILESTONES & DISCOVERED STATS */}
      <section className="space-y-4">
        <h3 className="text-base font-serif font-bold text-[#1C1E1B] tracking-tight">
          Current Workspace Milestones
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-[#7A827B] uppercase block">Mission Success</span>
              <span className="text-lg font-mono font-bold text-[#1C1E1B]">{completionRate}%</span>
              <span className="text-[10px] text-[#7A827B] block mt-0.5">{completedTasks} of {totalTasks} finished</span>
            </div>
          </div>

          <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Flame className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-[#7A827B] uppercase block">Discipline Streak</span>
              <span className="text-lg font-mono font-bold text-[#1C1E1B]">{maxStreak} Days</span>
              <span className="text-[10px] text-[#7A827B] block mt-0.5">{activeHabitsCompletedToday} completed today</span>
            </div>
          </div>

          <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-[#7A827B] uppercase block">Biolink Rest Minutes</span>
              <span className="text-lg font-mono font-bold text-[#1C1E1B]">{Math.max(1, Math.round(secondsActive / 60))} Mins</span>
              <span className="text-[10px] text-[#7A827B] block mt-0.5">Continuous cardiac breath sync</span>
            </div>
          </div>

          <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-[#7A827B] uppercase block">Critical Blockers</span>
              <span className="text-lg font-mono font-bold text-[#1C1E1B]">{criticalTasksCount} Left</span>
              <span className="text-[10px] text-rose-600 block mt-0.5 font-bold">Needs prompt attention</span>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
