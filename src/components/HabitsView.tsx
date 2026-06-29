import React, { useState } from "react";
import { Habit } from "../types";
import { getCurrentDateString } from "../data";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { ShieldAlert, CheckCircle, Zap, Sparkles, Smile, Trophy, Trash2 } from "lucide-react";

interface HabitsProps {
  habits: Habit[];
  onToggleHabitToday: (id: string) => void;
  onAddHabit: (name: string, category: "work" | "health" | "mind" | "routine") => void;
  onDeleteHabit: (id: string) => void;
  currentTime: Date;
}

export default function HabitsView({ habits, onToggleHabitToday, onAddHabit, onDeleteHabit, currentTime }: HabitsProps) {
  const [newHabitName, setNewHabitName] = useState("");
  const [category, setCategory] = useState<"work" | "health" | "mind" | "routine">("mind");

  const todayStr = getCurrentDateString();

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    onAddHabit(newHabitName.trim(), category);
    setNewHabitName("");
  };

  // Historic week completions
  const weeklyData = [
    { name: "Mon", completions: 2 },
    { name: "Tue", completions: 3 },
    { name: "Wed", completions: 1 },
    { name: "Thu", completions: 2 },
    { name: "Fri", completions: 3 },
    { name: "Sat", completions: 1 },
    { name: "Sun", completions: 2 },
    { name: "Today", completions: habits.filter(h => h.completedDays.includes(todayStr)).length }
  ];

  const atRiskHabits = habits.filter(h => h.streak > 4 && !h.completedDays.includes(todayStr));

  return (
    <div id="habits-view-root" className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in text-[#2D312E] font-sans">
      
      {/* Habits list */}
      <div className="lg:col-span-2 space-y-6">
        
        <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#2D312E]/5 pb-3">
            <div>
              <h3 className="text-base font-bold text-[#1C1E1B] font-serif tracking-tight">Intentional Small Habits</h3>
              <p className="text-xs text-[#7A827B] mt-0.5">Focus on daily repetition. Consistency multiplies focus margins.</p>
            </div>
            
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-200 rounded-md font-mono">
              Multiplier Active
            </span>
          </div>

          <div className="space-y-3" id="habits-list-holder">
            {habits.map((h) => {
              const completedToday = h.completedDays.includes(todayStr);
              return (
                <div
                  key={h.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    completedToday
                      ? "bg-emerald-50/50 border-emerald-200/60 text-emerald-950"
                      : "bg-white border-[#2D312E]/10 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    
                    <button
                      onClick={() => {
                        onToggleHabitToday(h.id);
                        if (!completedToday) {
                          try {
                            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                            const osc = audioCtx.createOscillator();
                            const gain = audioCtx.createGain();
                            osc.connect(gain);
                            gain.connect(audioCtx.destination);
                            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
                            osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); 
                            osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); 
                            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                            osc.start();
                            osc.stop(audioCtx.currentTime + 0.35);
                          } catch (err) {}
                        }
                      }}
                      className={`mt-0.5 h-6 w-6 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                        completedToday
                          ? "bg-emerald-600 border-transparent text-white"
                          : "border-[#2D312E]/20 text-transparent hover:border-amber-600 hover:text-amber-700"
                      }`}
                      title={completedToday ? "Mark Incomplete" : "Mark Complete Today"}
                    >
                      <CheckCircle className="h-4.5 w-4.5 stroke-[2]" />
                    </button>

                    <div className="space-y-0.5">
                      <h4 className={`text-sm font-semibold ${completedToday ? "text-[#7A827B]/70 line-through" : "text-[#1C1E1B]"}`}>
                        {h.name}
                      </h4>
                      
                      <div className="flex items-center gap-2 text-xs text-[#7A827B] font-mono">
                        <span className="capitalize bg-[#FAF9F6] text-[#2D312E] border border-[#2D312E]/10 px-2 py-0.5 rounded-md font-mono font-bold text-[9px] uppercase">
                          {h.category}
                        </span>

                        <span className="border-l border-[#2D312E]/5 pl-2">
                          Active Streak: <strong className="text-[#1C1E1B]">{h.streak} days</strong>
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Actions & Streaks */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg shadow-2xs">
                      <Zap className={`h-4 w-4 ${completedToday ? "text-amber-600 fill-amber-500 animate-bounce" : "text-amber-500/50"}`} />
                      <span className="text-xs font-bold text-amber-800 font-mono">{h.streak}d</span>
                    </div>

                    <button
                      onClick={() => onDeleteHabit(h.id)}
                      className="p-1.5 hover:bg-stone-50 text-[#7A827B] hover:text-[#1C1E1B] rounded-lg transition cursor-pointer"
                      title="Remove Habit Container"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                </div>
              );
            })}

            {habits.length === 0 && (
              <div className="text-center py-10 bg-[#FAF9F6]/50 border border-dashed border-[#2D312E]/10 rounded-2xl">
                <Smile className="h-8 w-8 text-[#7A827B]/60 mx-auto" />
                <h4 className="text-xs font-semibold text-[#1C1E1B] mt-2">No Habits Listed</h4>
                <p className="text-xs text-[#7A827B] mt-1">Form custom habit goals in the provision selector below to begin tracking.</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Habits */}
        <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-semibold text-[#1C1E1B] font-serif">Provision New Habit Container</h3>
          
          <form onSubmit={handleCreateHabit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold font-mono text-[#7A827B] uppercase tracking-wider">Habit Descriptive Title</label>
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="e.g. Read three physical book pages post lunch"
                className="w-full bg-[#FAF9F6] border border-[#2D312E]/10 text-[#1C1E1B] rounded-xl px-3 py-2 text-xs font-sans mt-1 focus:outline-hidden placeholder:text-[#7A827B]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "mind", label: "🧘 Mindfulness" },
                { id: "health", label: "🍎 Wellness" },
                { id: "work", label: "⚙️ Professional" },
                { id: "routine", label: "🔄 Structure Routine" }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id as any)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-left cursor-pointer ${
                    category === cat.id
                      ? "bg-[#1C1E1B] text-white border-transparent shadow-xs"
                      : "bg-white text-[#2D312E] border-[#2D312E]/10 hover:bg-[#FAF9F6]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="w-full bg-[#1C1E1B] hover:bg-amber-700 text-white py-2.5 px-4 rounded-xl text-xs font-semibold transition"
            >
              Initialize Habit Anchor
            </button>
          </form>
        </div>

      </div>

      {/* Habits Analytics column */}
      <div className="lg:col-span-1 space-y-6">
        
        {atRiskHabits.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl space-y-3 relative overflow-hidden shadow-xs">
            <div className="flex gap-3 items-start">
              <div className="p-2 bg-rose-100 border border-rose-200 text-rose-700 rounded-lg shrink-0">
                <ShieldAlert className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1C1E1B] uppercase tracking-wider font-mono">Streak At Risk Notice</h4>
                <p className="text-xs text-[#4E5450] mt-0.5 leading-relaxed">
                  These high streak habits have not been checked today. Completing them maintains momentum:
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {atRiskHabits.map((h) => (
                <div key={h.id} className="bg-white border border-rose-200 p-2.5 rounded-xl flex justify-between items-center text-xs text-[#2D312E] shadow-2xs">
                  <span className="font-semibold">{h.name}</span>
                  <span className="text-amber-850 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px] font-mono">{h.streak}d streak</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Graph completions card */}
        <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-6 space-y-4 shadow-xs">
          <div>
            <h3 className="text-xs font-bold text-[#7A827B] font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-amber-600" /> Weekly Output Index
            </h3>
            <p className="text-[10px] text-[#7A827B] mt-0.5">Average habit updates across seven previous calendar cycles.</p>
          </div>

          <div className="h-56 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d312e0d" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#7A827B" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#7A827B" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(45,49,46,0.01)' }}
                  contentStyle={{ background: '#ffffff', border: '1px solid rgba(45,49,46,0.1)', fontSize: '10px', borderRadius: '12px', color: '#1C1E1B' }}
                />
                <Bar dataKey="completions" fill="#E6E5DF" radius={[4, 4, 0, 0]}>
                  {weeklyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === weeklyData.length - 1 ? "#D97706" : "#E2E1DA"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-center pt-2 leading-tight">
            <span className="text-[11px] text-[#7A827B]">
              Consistency multipliers are proven to peak in standard midweek blocks.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
