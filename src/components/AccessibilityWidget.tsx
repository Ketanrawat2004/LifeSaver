import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { safeStorage } from "../utils/safeStorage";
import { 
  Eye, 
  EyeOff, 
  Type, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Accessibility, 
  Info, 
  Check, 
  Sun, 
  CloudSun, 
  Undo2 
} from "lucide-react";

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [dyslexicLens, setDyslexicLens] = useState(false);
  const [isVoiceAssisted, setIsVoiceAssisted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Initialize accessibility presets from localStorage
  useEffect(() => {
    const savedHighContrast = safeStorage.getItem("access-high-contrast") === "true";
    const savedFontSize = (safeStorage.getItem("access-font-size") as any) || "normal";
    const savedDyslexic = safeStorage.getItem("access-dyslexic") === "true";
    const savedVoice = safeStorage.getItem("access-voice") === "true";
    const savedMotion = safeStorage.getItem("access-motion") === "true";

    setHighContrast(savedHighContrast);
    setFontSize(savedFontSize);
    setDyslexicLens(savedDyslexic);
    setIsVoiceAssisted(savedVoice);
    setReducedMotion(savedMotion);
  }, []);

  // Sync state changes with document root
  useEffect(() => {
    // 1. Root Core Font Scaling (Perfect Rem scale mapping)
    const root = document.documentElement;
    if (fontSize === "large") {
      root.style.fontSize = "18px";
    } else if (fontSize === "xlarge") {
      root.style.fontSize = "20px";
    } else {
      root.style.fontSize = "16px"; // base browser standard default
    }
    safeStorage.setItem("access-font-size", fontSize);
  }, [fontSize]);

  useEffect(() => {
    // 2. High Contrast enhancements
    const body = document.body;
    if (highContrast) {
      body.style.filter = "contrast(1.22) saturate(1.15)";
      body.classList.add("high-contrast-mode");
    } else {
      body.style.filter = "none";
      body.classList.remove("high-contrast-mode");
    }
    safeStorage.setItem("access-high-contrast", String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    // 3. Dyslexic tracking & letter spacings lens
    const body = document.body;
    if (dyslexicLens) {
      body.style.letterSpacing = "0.08em";
      body.style.wordSpacing = "0.15em";
      body.classList.add("font-mono");
    } else {
      body.style.letterSpacing = "normal";
      body.style.wordSpacing = "normal";
      body.classList.remove("font-mono");
    }
    safeStorage.setItem("access-dyslexic", String(dyslexicLens));
  }, [dyslexicLens]);

  useEffect(() => {
    // 4. Voice Assist Screen Reader Setup
    safeStorage.setItem("access-voice", String(isVoiceAssisted));
  }, [isVoiceAssisted]);

  useEffect(() => {
    // 5. Reduced Motion setup
    const root = document.documentElement;
    if (reducedMotion) {
      root.style.setProperty("--motion-duration-multiplier", "0");
      root.classList.add("motion-reduce");
    } else {
      root.style.removeProperty("--motion-duration-multiplier");
      root.classList.remove("motion-reduce");
    }
    safeStorage.setItem("access-motion", String(reducedMotion));
  }, [reducedMotion]);

  // Handle external accessibility control events (e.g. from the GenAI workspace Agent)
  useEffect(() => {
    const handleExternalAccessibility = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail) return;
      const { type, enabled } = customEvent.detail;
      if (type === "contrast") {
        setHighContrast(!!enabled);
      }
    };
    window.addEventListener("accessibility-control", handleExternalAccessibility);
    return () => window.removeEventListener("accessibility-control", handleExternalAccessibility);
  }, []);

  // Handle Speech Reader Trigger
  const speakNarrative = (text: string) => {
    if (!isVoiceAssisted) return;
    try {
      if (typeof window !== "undefined" && window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined") {
        window.speechSynthesis.cancel(); // Stop playing preceding voice loops
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.05;
        u.volume = 0.8;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {
      console.warn("Speech Synthesis error: ", e);
    }
  };

  // Helper text triggers
  const announceState = (message: string) => {
    speakNarrative(message);
  };

  const resetAllSettings = () => {
    setHighContrast(false);
    setFontSize("normal");
    setDyslexicLens(false);
    setIsVoiceAssisted(false);
    setReducedMotion(false);
    announceState("Accessibility modes reset to default alignment.");
  };

  return (
    <div className="relative non-printable">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            announceState("Accessibility tools panel opened.");
          }
        }}
        className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full shadow-lg border transition-all duration-300 cursor-pointer ${
          isOpen 
            ? "bg-[#1C1E1B] text-white border-teal-500/50" 
            : "bg-white text-stone-700 border-stone-200 hover:border-teal-500/30"
        }`}
        title="Interactive Accessibility Settings (A11Y)"
        id="accessibility-launcher"
      >
        <Accessibility className={`h-4 w-4 ${isOpen ? "text-teal-400 rotate-12" : "text-stone-500"}`} />
        <span className="text-[11px] font-bold font-mono tracking-wide uppercase">
          A11Y Help
        </span>
        {highContrast || fontSize !== "normal" || dyslexicLens ? (
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping absolute -top-0.5 -right-0.5" />
        ) : null}
      </button>

      {/* Slide up settings panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="absolute bottom-full mb-3.5 left-0 text-stone-800 sm:-left-12 z-50 bg-white/95 border border-stone-200 shadow-2xl rounded-2xl w-80 max-w-[calc(100vw-2rem)] p-4 space-y-4 backdrop-blur-md font-sans text-left text-stone-850 non-printable animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            {/* Panel Title */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Accessibility className="h-4 w-4 text-teal-600" />
                <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-stone-900">A11Y Optimization Deck</h4>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-xs font-bold font-mono select-none"
              >
                ✕
              </button>
            </div>

            {/* Read Page Out Loud Catalyst */}
            <div className="bg-[#FAF9F5] rounded-xl p-3 border border-stone-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold font-mono text-[9px] text-[#1C1E1B] uppercase tracking-wide">Interactive Reading Aid</span>
                <span className="text-[8px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded font-mono">
                  Synthesizer Active
                </span>
              </div>
              <p className="text-[10px] text-stone-500 leading-normal font-sans">
                Turn on voice guidance to hear high-level system logs and focus card values announced.
              </p>
              
              <button
                onClick={() => {
                  const targetState = !isVoiceAssisted;
                  setIsVoiceAssisted(targetState);
                  if (targetState) {
                    setTimeout(() => {
                      announceState("Voice narrative enabled. Ready to assist reading visual modules.");
                    }, 100);
                  }
                }}
                className={`w-full py-1.5 px-3 rounded-lg border text-[10px] font-mono uppercase tracking-wide font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isVoiceAssisted 
                    ? "bg-teal-500/10 border-teal-500/30 text-teal-900" 
                    : "bg-white hover:bg-stone-50 border-stone-200 text-[#7A827B]"
                }`}
              >
                {isVoiceAssisted ? <Volume2 className="h-3 w-3 text-teal-600" /> : <VolumeX className="h-3 w-3 text-stone-450" />}
                <span>{isVoiceAssisted ? "Narrative Voice Enabled" : "Enable Narrative Voice"}</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Feature 1: High Contrast */}
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-50">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-stone-900 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-orange-600" /> High Vision Contrast
                  </span>
                  <p className="text-[9px] text-stone-500 leading-none">Increases background readability saturation</p>
                </div>
                <button
                  onClick={() => {
                    setHighContrast(!highContrast);
                    announceState(`High contrast mode ${!highContrast ? 'enabled' : 'disabled'}`);
                  }}
                  className={`h-5 w-9 rounded-full p-0.5 transition-colors duration-200 focus:outline-hidden ${
                    highContrast ? "bg-amber-600" : "bg-stone-200"
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                    highContrast ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Feature 2: Font resizing presets */}
              <div className="space-y-1.5 pb-1.5 border-b border-stone-50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-900 flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5 text-blue-600" /> Rem Typographic Scale
                  </span>
                  <span className="text-[9px] font-mono text-stone-400 capitalize">{fontSize} Scale</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(["normal", "large", "xlarge"] as const).map((sz) => {
                    const isSel = fontSize === sz;
                    return (
                      <button
                        key={sz}
                        onClick={() => {
                          setFontSize(sz);
                          announceState(`Font scaling set to ${sz}`);
                        }}
                        className={`py-1 rounded text-[9px] font-mono uppercase tracking-tight font-bold border transition ${
                          isSel 
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-900" 
                            : "bg-white border-stone-100 hover:bg-stone-50 text-stone-500"
                        }`}
                      >
                        {sz === "normal" ? "Base" : sz === "large" ? "Medium" : "Max (+30%)"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feature 3: Dyslexia readable typeface spacings layout lens */}
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-50">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600" /> Dyslexic Tracking Font
                  </span>
                  <p className="text-[9px] text-stone-500 leading-none">Widens spatial letters & word spacing vectors</p>
                </div>
                <button
                  onClick={() => {
                    setDyslexicLens(!dyslexicLens);
                    announceState(`Dyslexia layout mode ${!dyslexicLens ? 'enabled' : 'disabled'}`);
                  }}
                  className={`h-5 w-9 rounded-full p-0.5 transition-colors duration-200 focus:outline-hidden ${
                    dyslexicLens ? "bg-amber-600" : "bg-stone-200"
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                    dyslexicLens ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Feature 4: Motion Reduction */}
              <div className="flex items-center justify-between pb-1">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-stone-900 flex items-center gap-1.5">
                    <EyeOff className="h-3.5 w-3.5 text-rose-600" /> Reduce Interface motion
                  </span>
                  <p className="text-[9px] text-stone-500 leading-none">Suspends complex frame renders</p>
                </div>
                <button
                  onClick={() => {
                    setReducedMotion(!reducedMotion);
                    announceState(`Motion reduction ${!reducedMotion ? 'enabled' : 'disabled'}`);
                  }}
                  className={`h-5 w-9 rounded-full p-0.5 transition-colors duration-200 focus:outline-hidden ${
                    reducedMotion ? "bg-amber-600" : "bg-stone-200"
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                    reducedMotion ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>
            </div>

            {/* Clear All Reset button */}
            <button
              onClick={resetAllSettings}
              className="w-full text-center hover:bg-stone-50 border border-stone-200 text-stone-600 hover:text-stone-900 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer font-bold"
            >
              <Undo2 className="h-3 w-3" />
              <span>Reset parameters to defaults</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
