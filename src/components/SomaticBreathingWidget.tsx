import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wind, Volume2, VolumeX, Sparkles, X, ChevronUp, ChevronDown } from "lucide-react";

export default function SomaticBreathingWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [breathState, setBreathState] = useState<"inhale" | "hold" | "exhale" | "rest">("rest");
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [soundActive, setSoundActive] = useState(false);

  // Web Audio Synth references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<{
    oscillator: OscillatorNode;
    subOscillator: OscillatorNode;
    gainNode: GainNode;
  } | null>(null);

  // Timer reference
  const stateTimerRef = useRef<any>(null);

  // Handle breathing phase state machine
  useEffect(() => {
    stateTimerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Switch phase
          setBreathState((curr) => {
            if (curr === "rest") return "inhale";
            if (curr === "inhale") return "hold";
            if (curr === "hold") return "exhale";
            return "rest";
          });
          return 4; // Reset to 4 seconds phase
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (stateTimerRef.current) clearInterval(stateTimerRef.current);
    };
  }, []);

  // Sync synthesizer frequencies with the breathing cycles dynamic state
  useEffect(() => {
    if (!soundActive || !audioCtxRef.current || !synthNodesRef.current) return;
    const ctx = audioCtxRef.current;
    const { oscillator, subOscillator } = synthNodesRef.current;

    const baseFreq = 528; // 528Hz Solfeggio frequency (transformational rest)
    const now = ctx.currentTime;

    if (breathState === "inhale") {
      // Ascending pitch simulation during inhalation for sensory synergy
      oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 1.1, now + 3.8);
      subOscillator.frequency.exponentialRampToValueAtTime((baseFreq / 2) * 1.1, now + 3.8);
    } else if (breathState === "hold") {
      // Steady harmonic plateau
      oscillator.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.5);
      subOscillator.frequency.exponentialRampToValueAtTime(baseFreq / 2, now + 0.5);
    } else if (breathState === "exhale") {
      // Descending pitch simulation during exhalation
      oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + 3.8);
      subOscillator.frequency.exponentialRampToValueAtTime((baseFreq / 2) * 0.9, now + 3.8);
    } else {
      // Super deep resting sub-vibe
      oscillator.frequency.exponentialRampToValueAtTime(110, now + 1);
      subOscillator.frequency.exponentialRampToValueAtTime(55, now + 1);
    }
  }, [breathState, soundActive]);

  const toggleSound = () => {
    if (soundActive) {
      stopSound();
    } else {
      startSound();
    }
  };

  const startSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const gainNode = ctx.createGain();
      
      // Lead frequency
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(528, ctx.currentTime);

      // Deep, soothing sub-octave support
      const subOsc = ctx.createOscillator();
      subOsc.type = "triangle";
      subOsc.frequency.setValueAtTime(264, ctx.currentTime);

      // Connect nodes
      osc.connect(gainNode);
      subOsc.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Softer, eye-safe low volume
      gainNode.gain.setValueAtTime(0.04, ctx.currentTime);

      osc.start();
      subOsc.start();

      audioCtxRef.current = ctx;
      synthNodesRef.current = { oscillator: osc, subOscillator: subOsc, gainNode };
      setSoundActive(true);
    } catch (e) {
      console.warn("Autoplay / audio initialization blocked:", e);
    }
  };

  const stopSound = () => {
    if (synthNodesRef.current) {
      try { synthNodesRef.current.oscillator.stop(); } catch(e) {}
      try { synthNodesRef.current.subOscillator.stop(); } catch(e) {}
      synthNodesRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch(e) {}
      audioCtxRef.current = null;
    }
    setSoundActive(false);
  };

  // Clean elements on unmount
  useEffect(() => {
    return () => {
      stopSound();
    };
  }, []);

  // Handle external somatic-breathing-control events (e.g. from the GenAI workspace Agent)
  useEffect(() => {
    const handleExternalSomatic = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail) return;
      const { action } = customEvent.detail;
      if (action === "expand" || action === "start") {
        setIsExpanded(true);
        // Safely start audio on interaction
        startSound();
      } else if (action === "collapse" || action === "stop") {
        setIsExpanded(false);
        stopSound();
      }
    };
    window.addEventListener("somatic-breathing-control", handleExternalSomatic);
    return () => window.removeEventListener("somatic-breathing-control", handleExternalSomatic);
  }, []);

  const getBreathInstructions = () => {
    switch (breathState) {
      case "inhale":
        return {
          title: "Breathe In Slowly",
          desc: "Inhale crisp, vitalizing energy through your nose.",
          colorClass: "text-blue-600 border-blue-200 bg-blue-50/50",
          ringColor: "rgba(37, 99, 235, 0.3)",
          scale: 1.3
        };
      case "hold":
        return {
          title: "Suspend & Align",
          desc: "Hold your breath in complete physical calmness.",
          colorClass: "text-amber-600 border-amber-200 bg-amber-50/50",
          ringColor: "rgba(217, 119, 6, 0.3)",
          scale: 1.3
        };
      case "exhale":
        return {
          title: "Sigh Out Weight",
          desc: "Exhale all stress and digital weariness through your mouth.",
          colorClass: "text-emerald-700 border-emerald-200 bg-emerald-50/50",
          ringColor: "rgba(16, 185, 129, 0.3)",
          scale: 0.95
        };
      case "rest":
        return {
          title: "Absolute Rest",
          desc: "Allow your lungs to remain empty and peaceful.",
          colorClass: "text-stone-600 border-stone-200 bg-stone-50/50",
          ringColor: "rgba(120, 113, 108, 0.3)",
          scale: 0.85
        };
    }
  };

  const config = getBreathInstructions();

  return (
    <div id="interactive-somatic-breathing-anchor" className="relative select-none">
      <AnimatePresence>
        {!isExpanded ? (
          // MINIMIZED MODE: Tiny pulsing breathing ring
          <motion.button
            key="minimized-halo"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2.5 bg-white backdrop-blur-md border border-stone-200 p-2 rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer relative h-[38px]"
          >
            {/* Pulsing breathing bubble halo */}
            <div className="relative h-6 w-6 flex items-center justify-center shrink-0">
              <motion.div
                animate={{
                  scale: [1, config.scale, 1],
                  opacity: [0.2, 0.6, 0.2]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: config.ringColor }}
              />
              <Wind className={`h-3.5 w-3.5 relative z-10 transition-colors duration-500 ${
                breathState === "inhale" ? "text-blue-600" : breathState === "exhale" ? "text-emerald-600" : "text-stone-500"
              }`} />
            </div>

            <div className="text-left pr-2 font-sans truncate max-w-[85px] hidden xs:block">
              <p className="text-[10px] font-bold text-stone-800 capitalize leading-none">{breathState}</p>
            </div>
          </motion.button>
        ) : (
          // EXPANDED MODE: Rich, beautiful glassmorphic breathing guide card
          <motion.div
            key="expanded-guide"
            initial={{ y: 20, scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.95, opacity: 0 }}
            className="absolute bottom-full mb-3.5 left-0 bg-white/95 backdrop-blur-lg border border-stone-200/80 rounded-3xl p-5 shadow-2xl w-72 space-y-4 text-left z-50 animate-in fade-in slide-in-from-bottom-3 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200/40 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500 animate-spin" />
                <span className="text-[10px] font-extrabold font-mono uppercase tracking-wider text-stone-800">Somatic Breath Sync</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="hover:bg-stone-100 p-1 rounded-lg text-stone-400 hover:text-stone-700 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Central massive dynamic torus breathe ring */}
            <div className="flex flex-col items-center justify-center py-4 relative">
              <div className="relative h-28 w-28 flex items-center justify-center">
                {/* Dual overlapping breathing gradient halos */}
                <motion.div
                  animate={{
                    scale: config.scale,
                  }}
                  transition={{
                    duration: 3.8,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 rounded-full bg-gradient-to-tr opacity-25 blur-sm transition-all duration-[1000ms]"
                  style={{
                    backgroundImage: 
                      breathState === "inhale" ? "radial-gradient(circle, #3b82f6 0%, transparent 70%)" :
                      breathState === "hold" ? "radial-gradient(circle, #f59e0b 0%, transparent 70%)" :
                      breathState === "exhale" ? "radial-gradient(circle, #10b981 0%, transparent 70%)" :
                      "radial-gradient(circle, #a8a29e 0%, transparent 70%)"
                  }}
                />
                
                {/* Physical solid ring expansion */}
                <motion.div
                  animate={{
                    scale: config.scale,
                  }}
                  transition={{
                    duration: 3.5,
                    ease: "easeInOut"
                  }}
                  className="h-16 w-16 rounded-full border-4 border-dashed relative z-10 flex items-center justify-center transition-colors duration-1000"
                  style={{
                    borderColor: 
                      breathState === "inhale" ? "#3b82f6" :
                      breathState === "hold" ? "#f59e0b" :
                      breathState === "exhale" ? "#10b981" :
                      "#a8a29e"
                  }}
                >
                  <span className="text-lg font-mono font-black text-stone-800">
                    {secondsLeft}s
                  </span>
                </motion.div>
              </div>

              {/* Status Indicator text badge */}
              <div className={`mt-3 px-3 py-1 rounded-full border border-stone-200 text-[10px] font-bold font-mono uppercase text-center ${config.colorClass} transition-colors duration-500`}>
                {config.title}
              </div>
            </div>

            {/* Explanatory instruction description */}
            <p className="text-[11px] text-stone-500 leading-normal text-center px-1 h-8">
              {config.desc}
            </p>

            {/* Interactive controls (Sound wave activate) */}
            <div className="border-t border-stone-200/40 pt-3 flex items-center justify-between">
              <button
                onClick={toggleSound}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  soundActive 
                    ? "bg-[#1C1E1B] text-white border-stone-800" 
                    : "bg-white hover:bg-stone-50 border-stone-200 text-stone-700"
                }`}
              >
                {soundActive ? (
                  <>
                    <Volume2 className="h-3 w-3 text-amber-400 animate-bounce" />
                    <span>528Hz Hum Active</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3 w-3 text-stone-400" />
                    <span>Enable 528Hz Drone</span>
                  </>
                )}
              </button>

              <span className="text-[9px] font-mono text-stone-400 uppercase">
                Square Breathe Protocol
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
