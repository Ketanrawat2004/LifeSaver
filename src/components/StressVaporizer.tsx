import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Wind, Volume2, VolumeX, ShieldCheck, HelpCircle, RefreshCw } from "lucide-react";
import { Task } from "../types";

interface StressVaporizerProps {
  tasks: Task[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label: string;
  alpha: number;
  targetX: number;
  targetY: number;
}

export default function StressVaporizer({ tasks }: StressVaporizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [breathState, setBreathState] = useState<"inhale" | "hold" | "exhale" | "rest">("rest");
  const [breathProgress, setBreathProgress] = useState(0); // 0 to 1
  const [isVaporizing, setIsVaporizing] = useState(false);
  const [calmLevel, setCalmLevel] = useState(100); // 0 (stressed) to 100 (fully calm)

  // AI grounding script states
  const [aiScript, setAiScript] = useState<string>("");
  const [aiMantra, setAiMantra] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [selectedMood, setSelectedMood] = useState<string>("overwhelmed");
  
  // Web Audio instances
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<{
    oscillators: OscillatorNode[];
    gains: GainNode[];
    filter: BiquadFilterNode;
  } | null>(null);

  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 200, y: 150 });

  const activeTasks = tasks.filter(t => !t.completed);

  // Initialize interactive dynamic gravity particles
  useEffect(() => {
    const parentWidth = canvasRef.current?.parentElement?.clientWidth || 400;
    const canvasHeight = 220;

    // Create main gravity centers corresponding to each active pending task
    const initialParticles: Particle[] = activeTasks.map((t, i) => {
      const angle = (i / Math.max(1, activeTasks.length)) * Math.PI * 2;
      return {
        x: parentWidth / 2 + Math.cos(angle) * 80,
        y: canvasHeight / 2 + Math.sin(angle) * 60,
        targetX: parentWidth / 2,
        targetY: canvasHeight / 2,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.max(12, Math.min(26, 10 + t.duration / 4)),
        color: t.priority === "critical" ? "rgba(225, 29, 72, 0.7)" : t.priority === "high" ? "rgba(217, 119, 6, 0.7)" : "rgba(13, 148, 136, 0.7)",
        label: t.title.substring(0, 15) + "...",
        alpha: 1
      };
    });

    // Populate extra ambient stress clouds/dust
    for (let i = 0; i < 25; i++) {
      initialParticles.push({
        x: Math.random() * parentWidth,
        y: Math.random() * canvasHeight,
        targetX: Math.random() * parentWidth,
        targetY: Math.random() * canvasHeight,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 3 + 2,
        color: "rgba(120, 113, 108, 0.25)",
        label: "",
        alpha: 0.6
      });
    }

    particlesRef.current = initialParticles;
  }, [tasks.length]);

  // Handle high-density dynamic canvas resizing (compliant with ResizeObserver stage sizing guidelines)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const width = canvas.parentElement?.clientWidth || 400;
      canvas.width = width;
      canvas.height = 220;
    };
    
    resizeCanvas();

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      resizeObserver.disconnect();
    };
  }, []);

  // Main Canvas orbital rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      // Draw subtle orbital rings
      ctx.strokeStyle = "rgba(45, 49, 46, 0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 110, 0, Math.PI * 2);
      ctx.stroke();

      particles.forEach((p) => {
        // Apply interactive custom gravity pulls
        if (isVaporizing) {
          // Attract towards center to vaporize
          const dxSub = canvas.width / 2 - p.x;
          const dySub = canvas.height / 2 - p.y;
          const dist = Math.sqrt(dxSub * dxSub + dySub * dySub);
          if (dist > 5) {
            p.vx += (dxSub / dist) * 0.45;
            p.vy += (dySub / dist) * 0.45;
          } else {
            // Dissolve alpha as it touches the calm core
            p.alpha = Math.max(0, p.alpha - 0.08);
          }
        } else {
          // Orbital pull from mouse cursor
          const dxMouse = mouseRef.current.x - p.x;
          const dyMouse = mouseRef.current.y - p.y;
          const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
          if (distMouse < 140) {
            const pullStrength = (140 - distMouse) / 140;
            p.vx += (dxMouse / distMouse) * pullStrength * 0.12;
            p.vy += (dyMouse / distMouse) * pullStrength * 0.12;
          }

          // Gentle central gravitation
          const dxCenter = canvas.width / 2 - p.x;
          const dyCenter = canvas.height / 2 - p.y;
          const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);
          p.vx += (dxCenter / Math.max(100, distCenter)) * 0.03;
          p.vy += (dyCenter / Math.max(100, distCenter)) * 0.03;
        }

        // Apply drag & update positional bounds
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.x += p.vx;
        p.y += p.vy;

        // Bounce from bounds elegantly
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Render Particle Body
        ctx.save();
        ctx.globalAlpha = p.alpha;
        
        // Draw main circle glowing effect
        const gradient = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, "transparent");
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Write mini compact title labels for the actual task orbiters
        if (p.label && p.alpha > 0.3) {
          ctx.font = "bold 9px JetBrains Mono, monospace";
          ctx.fillStyle = "#1C1E1B";
          ctx.textAlign = "center";
          ctx.fillText(p.label, p.x, p.y - p.radius - 4);
        }

        ctx.restore();
      });

      // Render breathing halo guide in the background
      ctx.save();
      ctx.beginPath();
      const circleRadius = 35 + breathProgress * 30; // 35 to 65
      const gradientCalm = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 5,
        canvas.width / 2, canvas.height / 2, circleRadius
      );
      
      let basePulseColor = "rgba(13, 148, 136, 0.15)";
      if (breathState === "inhale") basePulseColor = "rgba(59, 130, 246, 0.25)";
      if (breathState === "exhale") basePulseColor = "rgba(16, 185, 129, 0.25)";
      
      gradientCalm.addColorStop(0, basePulseColor);
      gradientCalm.addColorStop(1, "transparent");
      
      ctx.fillStyle = gradientCalm;
      ctx.arc(canvas.width / 2, canvas.height / 2, circleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVaporizing, breathProgress, breathState, activeTasks.length]);

  // Handle pointer coordinate tracking
  const handlePointerMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Breathing simulation loop with state machines (Inhale (4s) -> Hold (4s) -> Exhale (4s) -> Rest (4s))
  useEffect(() => {
    let breathTimer: any = null;
    let secondsCounter = 0;

    breathTimer = setInterval(() => {
      secondsCounter += 0.05; // tick every 50ms
      const cycleTime = secondsCounter % 16; // 16 second total square breathing

      if (cycleTime < 4) {
        // INHALE
        setBreathState("inhale");
        const prog = cycleTime / 4;
        setBreathProgress(prog);
        
        // Dynamically shift audio synth frequencies upwards during inhalation
        if (isPlayingAudio && synthNodesRef.current) {
          const { oscillators, filter } = synthNodesRef.current;
          oscillators[0].frequency.setValueAtTime(110 + prog * 55, audioCtxRef.current!.currentTime); // A2 to C#3
          oscillators[1].frequency.setValueAtTime(165 + prog * 82.5, audioCtxRef.current!.currentTime); // E3 to G#3
          filter.frequency.setValueAtTime(400 + prog * 600, audioCtxRef.current!.currentTime); // filter opening
        }
      } else if (cycleTime < 8) {
        // HOLD
        setBreathState("hold");
        setBreathProgress(1);
      } else if (cycleTime < 12) {
        // EXHALE
        setBreathState("exhale");
        const prog = 1 - ((cycleTime - 8) / 4);
        setBreathProgress(prog);

        // Dynamically fold frequencies downwards during exhalation
        if (isPlayingAudio && synthNodesRef.current) {
          const { oscillators, filter } = synthNodesRef.current;
          oscillators[0].frequency.setValueAtTime(165 - (1 - prog) * 55, audioCtxRef.current!.currentTime);
          oscillators[1].frequency.setValueAtTime(247.5 - (1 - prog) * 82.5, audioCtxRef.current!.currentTime);
          filter.frequency.setValueAtTime(1000 - (1 - prog) * 700, audioCtxRef.current!.currentTime); // filter closing
        }
      } else {
        // REST
        setBreathState("rest");
        setBreathProgress(0);
      }
    }, 50);

    return () => {
      clearInterval(breathTimer);
    };
  }, [isPlayingAudio]);

  // Audio start & stop Web Audio synth handlers
  const handleToggleSound = () => {
    if (isPlayingAudio) {
      stopAudioContext();
    } else {
      startAudioContext();
    }
  };

  const startAudioContext = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      // Design an incredibly deep, rich cinematic synthesizer chord
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const osc3 = audioCtx.createOscillator(); // Sub-bass anchor

      const gain1 = audioCtx.createGain();
      const gain2 = audioCtx.createGain();
      const gain3 = audioCtx.createGain();
      
      const filter = audioCtx.createBiquadFilter();
      const masterVolume = audioCtx.createGain();

      // Configure beautiful wave types
      osc1.type = "sine";
      osc2.type = "triangle";
      osc3.type = "sine";

      // Golden chords base
      osc1.frequency.setValueAtTime(110.00, audioCtx.currentTime); // A2
      osc2.frequency.setValueAtTime(164.81, audioCtx.currentTime); // E3
      osc3.frequency.setValueAtTime(55.00, audioCtx.currentTime);  // A1 sub-bass

      // Set elegant levels
      gain1.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0.03, audioCtx.currentTime);
      gain3.gain.setValueAtTime(0.12, audioCtx.currentTime);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(300, audioCtx.currentTime);
      filter.Q.setValueAtTime(2, audioCtx.currentTime);

      masterVolume.gain.setValueAtTime(0.0, audioCtx.currentTime);
      // Soft start fade-in to prevent sharp clicks
      masterVolume.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 2);

      // Connect Synthesizer Node lines
      osc1.connect(gain1);
      osc2.connect(gain2);
      osc3.connect(gain3);

      gain1.connect(filter);
      gain2.connect(filter);
      gain3.connect(filter);

      filter.connect(masterVolume);
      masterVolume.connect(audioCtx.destination);

      // Start frequencies
      osc1.start();
      osc2.start();
      osc3.start();

      synthNodesRef.current = {
        oscillators: [osc1, osc2, osc3],
        gains: [gain1, gain2, gain3],
        filter
      };

      setIsPlayingAudio(true);
    } catch (err) {
      console.warn("Failed to activate synthesizer context:", err);
    }
  };

  const stopAudioContext = () => {
    if (synthNodesRef.current) {
      try {
        synthNodesRef.current.oscillators.forEach((osc) => osc.stop());
      } catch (e) {}
      synthNodesRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  // Clean elements on destroy
  useEffect(() => {
    return () => {
      if (synthNodesRef.current) {
        try {
          synthNodesRef.current.oscillators.forEach(osc => osc.stop());
        } catch (e) {}
      }
    };
  }, []);

  const handleGenerateCalmScript = async () => {
    setAiLoading(true);
    try {
      const response = await fetch("/api/decompress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: activeTasks,
          mood: selectedMood
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAiScript(data.script || "");
        setAiMantra(data.anchorFocus || "");
      } else {
        setAiScript("Observe your mind. The weight of your missions is transient. Realize that breathing exists in the pure present. Let go.");
        setAiMantra("BREATHE IN DEEP");
      }
    } catch (e) {
      console.error(e);
      setAiScript("Focus fully on the expansion. Breathe in safety, breathe out tension.");
      setAiMantra("RELEASE THE LOAD");
    } finally {
      setAiLoading(false);
    }
  };

  const triggerVaporization = () => {
    setIsVaporizing(true);
    setCalmLevel(100);

    // Play restorative high chime
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(987.77, ctx.currentTime + 0.3); // B5 string
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch (e) {}

    setTimeout(() => {
      setIsVaporizing(false);
      // Re-initialize particles
      const parentWidth = canvasRef.current?.width || 400;
      const canvasHeight = 220;
      particlesRef.current = activeTasks.map((t, i) => {
        const angle = (i / Math.max(1, activeTasks.length)) * Math.PI * 2;
        return {
          x: parentWidth / 2 + Math.cos(angle) * 80,
          y: canvasHeight / 2 + Math.sin(angle) * 60,
          targetX: parentWidth / 2,
          targetY: canvasHeight / 2,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          radius: Math.max(12, Math.min(26, 10 + t.duration / 4)),
          color: t.priority === "critical" ? "rgba(225, 29, 72, 0.7)" : t.priority === "high" ? "rgba(217, 119, 6, 0.7)" : "rgba(13, 148, 136, 0.7)",
          label: t.title.substring(0, 15) + "...",
          alpha: 1
        };
      });
    }, 4500);
  };

  return (
    <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col justify-between space-y-4">
      {/* Visual Header */}
      <div className="flex items-center justify-between border-b border-[#2D312E]/5 pb-3">
        <div className="space-y-0.5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#7A827B] font-mono flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#EA3900]" /> EXCLUSIVE NEUROSENSE MODULE
          </span>
          <h3 className="text-base font-bold text-[#1C1E1B] font-serif tracking-tight">
            Stress Vaporizer & Cognitive Sandbox
          </h3>
          <p className="text-xs text-[#7A827B]">
            Interactive physical gravity representing your active cognitive load.
          </p>
        </div>

        {/* Ambient controls */}
        <button
          onClick={handleToggleSound}
          className={`p-2 rounded-xl border transition-all ${
            isPlayingAudio 
              ? "bg-[#0B71E1]/10 text-[#0B71E1] border-[#0B71E1]/30 animate-pulse" 
              : "bg-stone-50 text-[#7A827B] border-[#2D312E]/10 hover:bg-[#FAF9F6]"
          }`}
          title={isPlayingAudio ? "Mute neuro-acoustic hum" : "Enable ambient therapeutic synth sound"}
        >
          {isPlayingAudio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      {/* Physics Sandbox stage */}
      <div className="relative bg-[#FAF9F6] border border-[#2D312E]/5 rounded-xl overflow-hidden h-[220px]">
        
        {/* Floating guidance caption overlay */}
        <div className="absolute top-3 left-3 bg-white/90 border border-[#2D312E]/5 px-2.5 py-1 rounded-lg text-[9px] font-mono text-[#4E5450] select-none shadow-3xs">
          📍 Hover mouse around canvas to pull stress vectors
        </div>

        <canvas
          ref={canvasRef}
          onMouseMove={handlePointerMouseMove}
          className="w-full h-full block cursor-crosshair"
          title="Interactive Gravity Space. Tasks materialize as weight circles."
        />

        {/* Vaporizing full-screen visual modal alert inside context */}
        {isVaporizing && (
          <div className="absolute inset-0 bg-[#1C1E1B]/95 flex flex-col items-center justify-center text-center p-6 space-y-3 z-30 transition-all duration-500">
            <Wind className="h-10 w-10 text-[#30AAFF] animate-spin" />
            <h4 className="text-sm font-serif font-bold text-white tracking-wide">
              Vaporizing Mind Clutter...
            </h4>
            <p className="text-xs text-[#7A827B] max-w-xs leading-normal">
              Releasing cognitive energy blocks. Synchronize your breathing to the glowing white ring expansion.
            </p>
            <div className="w-16 bg-white/20 h-1 rounded-full overflow-hidden">
              <div className="bg-[#30AAFF] h-full animate-pulse w-full" />
            </div>
          </div>
        )}
      </div>

      {/* Breathing Guide controller */}
      <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#2D312E]/10 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* State description */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className={`h-11 w-11 rounded-full border-2 flex items-center justify-center transition-all ${
            breathState === "inhale" 
              ? "border-blue-500 bg-blue-50" 
              : breathState === "exhale" 
              ? "border-emerald-500 bg-emerald-50" 
              : "border-stone-200 bg-white"
          }`}>
            <Wind className={`h-5 w-5 ${
              breathState === "inhale" 
                ? "text-blue-600 animate-bounce" 
                : breathState === "exhale" 
                ? "text-emerald-600 animate-pulse" 
                : "text-stone-400"
            }`} />
          </div>

          <div className="text-left">
            <span className="text-[10px] font-bold font-mono tracking-widest text-[#7A827B] uppercase block">
              Continuous Breathing Rescuer
            </span>
            <span className="text-sm font-bold text-[#1C1E1B] capitalize font-serif block">
              {breathState === "inhale" && "🌬️ Breathe In (4s)"}
              {breathState === "hold" && "🧘 Hold Calm (4s)"}
              {breathState === "exhale" && "🍃 Breathe Out (4s)"}
              {breathState === "rest" && "✨ Pause Rest (4s)"}
            </span>
          </div>
        </div>

        {/* Call to Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={triggerVaporization}
            disabled={activeTasks.length === 0 || isVaporizing}
            className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-[#EA3900] hover:bg-[#C02E00] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40"
          >
            <Wind className="h-4 w-4" />
            <span>Vaporize Overwhelm</span>
          </button>
        </div>

      </div>

      {/* AI Grounding / Cognitive Decompression Catalyst */}
      <div className="bg-[#FAF9F5] p-5 rounded-xl border border-amber-200/60 text-left space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-200/40 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 animate-pulse" />
            <div>
              <h4 className="text-xs font-bold font-mono text-[#1C1E1B] uppercase tracking-wide">AI Zen Decompressor</h4>
              <p className="text-[10px] text-[#7A827B]">Real-time clinical breathing script customized specifically to your stress load</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-stone-500 font-mono">Felt state:</span>
            <select
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
              className="text-[10px] bg-white border border-stone-200 rounded px-1.5 py-0.5 font-sans focus:outline-hidden text-stone-700"
            >
              <option value="overwhelmed">Scattered & Overwhelmed</option>
              <option value="fatigued">Mentally Fatigued</option>
              <option value="nervous">Imminent Deadline Anxiety</option>
              <option value="distracted">Hyperactive / Distracted</option>
            </select>
          </div>
        </div>

        {aiScript ? (
          <div className="space-y-3 bg-white p-4 rounded-xl border border-stone-100 shadow-3xs animate-fade-in">
            <div className="text-xs text-stone-700 italic leading-relaxed font-serif relative">
              " {aiScript} "
            </div>
            {aiMantra && (
              <div className="flex items-center gap-2 bg-amber-500/[0.04] px-3 py-1.5 rounded-lg border border-amber-600/10 w-fit">
                <span className="text-[9px] font-mono text-amber-800 uppercase tracking-widest font-bold">Anchoring Mantra:</span>
                <span className="text-xs font-serif italic text-stone-805 font-bold">"{aiMantra}"</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-stone-500 leading-normal">
            Need localized support? LifeSaver's AI guide can synthesize your current {activeTasks.length} pending stress nodes and feeling context into a personalized mental anchor.
          </p>
        )}

        <button
          onClick={handleGenerateCalmScript}
          disabled={aiLoading}
          className="w-full bg-white hover:bg-stone-50 border border-stone-200 hover:border-amber-500/20 text-[#1C1E1B] font-bold py-2 px-4 rounded-xl text-xs transition duration-200 cursor-pointer flex items-center justify-center gap-2 text-center"
        >
          {aiLoading ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-600" />
              <span>Calibrating Neural Grounding Script...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Generate Personalized Decompression Script</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
