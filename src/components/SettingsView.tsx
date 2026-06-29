import React, { useState } from "react";
import { AppPreferences } from "../types";
import { Shield, Sparkles, User, ToggleLeft, ToggleRight } from "lucide-react";

interface SettingsProps {
  preferences: AppPreferences;
  onUpdatePreferences: (updates: Partial<AppPreferences>) => void;
}

export default function SettingsView({ preferences, onUpdatePreferences }: SettingsProps) {
  const [username, setUsername] = useState(preferences.username);
  const [peakFocusTime, setPeakFocusTime] = useState(preferences.peakFocusTime);
  const [dailyTarget, setDailyTarget] = useState(preferences.dailyFocusHoursTarget);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePreferences({
      username,
      peakFocusTime,
      dailyFocusHoursTarget: dailyTarget
    });
  };

  return (
    <div id="settings-view-root" className="max-w-4xl mx-auto space-y-8 animate-fade-in text-[#2D312E] font-sans">
      
      {/* Settings Form Card */}
      <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-6 md:p-8 shadow-xs">
        <div className="flex items-center gap-2 mb-6 border-b border-[#2D312E]/5 pb-4">
          <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1C1E1B] font-serif tracking-tight">Preferences & Profile</h3>
            <p className="text-xs text-[#7A827B] mt-0.5">Customize your general workflow patterns and peak working windows.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* User name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold font-mono text-[#7A827B] uppercase tracking-wider">User Call-Sign / Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#FAF9F6] border border-[#2D312E]/10 text-[#1C1E1B] rounded-xl px-3 py-2.5 text-xs font-sans mt-1 focus:outline-hidden"
              />
            </div>

            {/* Hours Daily Target */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold font-mono text-[#7A827B] uppercase tracking-wider">Daily Focus Hours Target</label>
              <input
                type="number"
                value={dailyTarget}
                onChange={(e) => setDailyTarget(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                className="w-full bg-[#FAF9F6] border border-[#2D312E]/10 text-[#1C1E1B] rounded-xl px-3 py-2.5 text-xs font-sans mt-1 focus:outline-hidden"
              />
            </div>

          </div>

          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Focus Timing */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold font-mono text-[#7A827B] uppercase tracking-wider font-mono">My High Energy Window</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[
                  { id: "morning", label: "🌅 Morning" },
                  { id: "afternoon", label: "☀️ Mid-day" },
                  { id: "evening", label: "🌃 Evening" }
                ].map(op => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setPeakFocusTime(op.id as any)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-center cursor-pointer ${
                      peakFocusTime === op.id
                        ? "bg-[#1C1E1B] text-white border-transparent shadow-xs"
                        : "bg-white text-[#2D312E] border-[#2D312E]/10 hover:bg-[#FAF9F6]"
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Anti procrastination coaching toggler */}
            <div className="flex items-center justify-between bg-[#FAF9F6] p-4 rounded-xl border border-[#2D312E]/10 mt-1">
              <div className="space-y-1.5 max-w-[80%] text-left">
                <span className="text-xs font-bold text-[#1C1E1B] flex items-center gap-1 font-sans">
                  🔒 Anti-Procrastination Prompts
                </span>
                <p className="text-[10px] text-[#7A827B] font-sans leading-relaxed">
                  Triggers 2-minute emergency reminders and visual milestone segmentations on high-urgency timelines.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onUpdatePreferences({ antiProcrastinationEnabled: !preferences.antiProcrastinationEnabled })}
                className="text-[#7A827B] hover:text-[#1C1E1B] transition-colors cursor-pointer"
              >
                {preferences.antiProcrastinationEnabled ? (
                  <ToggleRight className="h-9 w-9 text-[#1C1E1B]" />
                ) : (
                  <ToggleLeft className="h-9 w-9 text-slate-300" />
                )}
              </button>
            </div>

          </div>

          <button
            type="submit"
            className="bg-[#1C1E1B] hover:bg-amber-700 text-white font-semibold text-xs py-2.5 px-6 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4" /> Save Preferences
          </button>
        </form>
      </div>

      {/* Guide Card context */}
      <div className="bg-amber-50/40 border border-amber-200 p-6 md:p-8 rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl">
            <Shield className="h-5 w-5" />
          </div>
          <div className="space-y-2 flex-1 text-left">
            <h3 className="text-xs font-bold tracking-widest font-mono text-amber-800 uppercase">
              Secure Companion Config
            </h3>
            <p className="text-xs text-[#4E5450] leading-relaxed font-sans">
              Athena reads variables on the server-side, completely shielding your critical parameters from browser debuggers or bundle bundles.
            </p>
            
            <p className="text-xs text-[#4E5450] leading-relaxed font-sans bg-white/70 p-4 rounded-xl border border-amber-100 font-mono shadow-xs">
              🔑 LifeSaver reads any API payload secret variables securely on the server-side. Key values can be declared inside the <strong>Settings &gt; Secrets</strong> developer workspace panel for instant activation.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
