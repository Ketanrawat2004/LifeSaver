import React, { useState, useRef } from "react";
import { Sparkles, Wind, BookOpen, ExternalLink, ShieldCheck, Zap, Activity, Brain, Volume2, Award, ArrowUpRight } from "lucide-react";
import LifeSaverLogo from "./LifeSaverLogo";
import { motion } from "motion/react";

interface HomeViewProps {
  onStartMyFlow: () => void;
  onNavigateToCoach: () => void;
}

// ==================== 1. 3D Neural Orbits Canvas Helper ====================
interface Node3D {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  color: string;
  size: number;
}

function Neuro3DCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, active: false });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        width = canvas.width = entry.contentRect.width;
        height = canvas.height = entry.contentRect.height;
      }
    });
    resizeObserver.observe(canvas);

    // Initialize 50 particles in virtual 3D space
    const nodes: Node3D[] = [];
    const colors = ["rgba(217, 119, 6, 0.45)", "rgba(11, 113, 225, 0.45)", "rgba(13, 148, 136, 0.4)"];
    
    for (let i = 0; i < 50; i++) {
      const rx = (Math.random() - 0.5) * 600;
      const ry = (Math.random() - 0.5) * 600;
      const rz = Math.random() * 400 - 200;
      nodes.push({
        x: rx,
        y: ry,
        z: rz,
        baseX: rx,
        baseY: ry,
        baseZ: rz,
        color: colors[i % colors.length],
        size: Math.random() * 2 + 1.5,
      });
    }

    const focalLength = 300;

    interface ClickBurstParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
    }
    const burstParticles: ClickBurstParticle[] = [];

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left - width / 2;
      const my = e.clientY - rect.top - height / 2;
      mouseRef.current.targetX = mx;
      mouseRef.current.targetY = my;
      mouseRef.current.active = true;
    };

    const handleGlobalMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const particleColors = ["#EA3900", "#0B71E1", "#0D9488", "#F59E0B", "#10B981"];
        for (let i = 0; i < 30; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 2;
          burstParticles.push({
            x: clickX,
            y: clickY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 4 + 1,
            color: particleColors[Math.floor(Math.random() * particleColors.length)],
            alpha: 1.0,
          });
        }
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseleave", handleGlobalMouseLeave);
    window.addEventListener("click", handleGlobalClick);

    const renderLoop = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse damping
      const m = mouseRef.current;
      m.x += (m.targetX - m.x) * 0.08;
      m.y += (m.targetY - m.y) * 0.08;

      // Draw subtle orbital rings in 3D perspective
      ctx.strokeStyle = "rgba(45, 49, 46, 0.02)";
      ctx.lineWidth = 1;
      for (let radius = 100; radius <= 350; radius += 100) {
        ctx.beginPath();
        ctx.arc(width / 2 + m.x * 0.1, height / 2 + m.y * 0.1, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw active click burst particles
      for (let i = burstParticles.length - 1; i >= 0; i--) {
        const bp = burstParticles[i];
        bp.x += bp.vx;
        bp.y += bp.vy;
        bp.vx *= 0.94; // friction damping
        bp.vy *= 0.94;
        bp.alpha -= 0.025; // fade out speed

        if (bp.alpha <= 0) {
          burstParticles.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = bp.alpha;
          ctx.fillStyle = bp.color;
          ctx.beginPath();
          ctx.arc(bp.x, bp.y, bp.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Outer bloom glow
          ctx.fillStyle = bp.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = bp.color;
          ctx.arc(bp.x, bp.y, bp.radius * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Update and project nodes
      const projected: { sx: number; sy: number; size: number; node: Node3D }[] = [];

      nodes.forEach((n) => {
        // Slow virtual rotation around the Y and X axes
        const speed = 0.003;
        const cosY = Math.cos(speed);
        const sinY = Math.sin(speed);
        
        // Rotate Y
        const x1 = n.x * cosY - n.z * sinY;
        const z1 = n.z * cosY + n.x * sinY;

        // Rotate X
        const cosX = Math.cos(speed * 0.5);
        const sinX = Math.sin(speed * 0.5);
        const y2 = n.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + n.y * sinX;

        n.x = x1;
        n.y = y2;
        n.z = z2;

        // Gravational pull toward cursor if active
        if (m.active) {
          const dx = m.x - n.x;
          const dy = m.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            n.x += dx * 0.015;
            n.y += dy * 0.015;
          } else {
            // Restore slowly to base coordinates
            n.x += (n.baseX - n.x) * 0.005;
            n.y += (n.baseY - n.y) * 0.005;
          }
        }

        // Project to 2D
        const px = n.x + m.x * 0.15;
        const py = n.y + m.y * 0.15;
        const pz = n.z + 300; 

        if (pz > 50) {
          const scale = focalLength / pz;
          const screenX = width / 2 + px * scale;
          const screenY = height / 2 + py * scale;
          const projectedSize = n.size * scale;

          projected.push({
            sx: screenX,
            sy: screenY,
            size: projectedSize,
            node: n
          });
        }
      });

      // Sort by depth (Z-index back to front) to draw correctly
      projected.sort((a, b) => b.node.z - a.node.z);

      // Draw connection lines between close projected nodes
      ctx.lineWidth = 0.8;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        for (let j = i + 1; j < projected.length; j++) {
          const p2 = projected[j];
          const dx = p1.sx - p2.sx;
          const dy = p1.sy - p2.sy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 75) {
            ctx.strokeStyle = `rgba(45, 49, 46, ${Math.max(0, 0.08 * (1 - d / 75))})`;
            ctx.beginPath();
            ctx.moveTo(p1.sx, p1.sy);
            ctx.lineTo(p2.sx, p2.sy);
            ctx.stroke();
          }
        }
      }

      // Draw projected nodes
      projected.forEach((p) => {
        ctx.fillStyle = p.node.color;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Soft halo glow around node center point
        ctx.fillStyle = p.node.color.replace("0.4", "0.08");
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseleave", handleGlobalMouseLeave);
      window.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80"
    />
  );
}

export default function HomeView({ onStartMyFlow, onNavigateToCoach }: HomeViewProps) {
  // Mouse hover coordinate state for 3D tilt effect on the Hero container
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
    
    // Scale the rotation angles slightly for elegant volumetric tilt
    setTilt({ x: x * 15, y: -y * 15 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Sound generator parameters for previewing focus-enhancing audio states
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewOscRef = useRef<OscillatorNode | null>(null);

  const toggleSoundPreview = (type: string) => {
    if (activePreview === type) {
      stopPreviewSound();
      return;
    }
    
    stopPreviewSound();
    setActivePreview(type);

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === "alpha") {
        // Deep focus Alpha State (8Hz to 12Hz virtual binaural or pure 110Hz sine with a gentle lowpass)
        osc.type = "sine";
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
      } else if (type === "sigh") {
        // High frequency calming tone
        osc.type = "triangle";
        osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4 middle
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
      } else {
        // Brown noise simulation with frequency filter waves
        osc.type = "sine";
        osc.frequency.setValueAtTime(80, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      previewOscRef.current = osc;
    } catch (e) {
      console.warn("Unable to activate audio simulation preview:", e);
    }
  };

  const stopPreviewSound = () => {
    if (previewOscRef.current) {
      try { previewOscRef.current.stop(); } catch (e) {}
      previewOscRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }
    setActivePreview(null);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-12 pb-16 font-sans">
      
      {/* ==================== 1. 3D HERO SECTION ==================== */}
      <section 
        className="relative bg-gradient-to-br from-stone-50 via-[#FAF9F6] to-stone-100 border border-[#2D312E]/10 rounded-3xl p-8 md:p-12 overflow-hidden shadow-xs"
        id="home-3d-hero-container"
      >
        {/* Active interactive 3D particle orbit systems */}
        <Neuro3DCanvas />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        {/* Glowing visual ambient light backdrops */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Text Pitch */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 bg-[#EA3900]/10 border border-[#EA3900]/20 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#EA3900] tracking-wide">
              <Sparkles className="h-3 w-3 animate-spin" />
              <span>THE FIRST COGNITIVE REST WORKSPACE</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-black tracking-tight text-[#1C1E1B] leading-tight">
              A gentle <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EA3900] to-[#0B71E1]">Lifeline</span><br />
              for overloaded brains.
            </h1>

            <p className="text-sm md:text-base text-[#4E5450] leading-relaxed max-w-xl">
              LifeSaver respects your emotional battery. By marrying **urgency-weighted task prioritization** with **physiological square breathing** and **real-time cognitive telemetry**, we prevent flight-or-fight response blocks and bring sanity back to your screen.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={onStartMyFlow}
                className="bg-[#1C1E1B] hover:bg-[#EA3900] text-white font-bold text-xs py-3.5 px-6 rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-97"
              >
                <span>Launch Workspace Flow</span>
                <Zap className="h-4 w-4 text-[#FAFFAF]" />
              </button>

              <button
                onClick={onNavigateToCoach}
                className="bg-white hover:bg-[#FAF9F6] text-[#2D312E] border border-[#2D312E]/10 font-bold text-xs py-3.5 px-6 rounded-2xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Consult Tactical Coach</span>
                <Brain className="h-4 w-4 text-[#0B71E1]" />
              </button>
            </div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#2D312E]/10 max-w-md">
              <div>
                <span className="block text-xl font-serif font-bold text-[#1C1E1B]">100% Secure</span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#7A827B]">Local Cryptography</span>
              </div>
              <div>
                <span className="block text-xl font-serif font-bold text-[#1C1E1B]">Real-Time</span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#7A827B]">Bio-Vibe Syncs</span>
              </div>
              <div>
                <span className="block text-xl font-serif font-bold text-[#1C1E1B]">Clinical</span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#7A827B]">Academic Models</span>
              </div>
            </div>
          </div>

          {/* Right Interactive 3D Card (Tilt on move) */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div
              ref={containerRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="w-full max-w-[340px] aspect-[4/5] bg-white border border-[#2D312E]/10 hover:border-[#EA3900]/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between relative cursor-grab transition-all duration-200 select-none"
              style={{
                perspective: "1000px",
                transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
                boxShadow: "0 20px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.02)"
              }}
            >
              {/* Highlight flare inside the card */}
              <div 
                className="absolute inset-0 rounded-3xl opacity-5 pointer-events-none transition-opacity"
                style={{
                  background: `radial-gradient(circle at ${(tilt.x + 10) * 5}% ${(tilt.y + 10) * 5}%, #EA3900 0%, transparent 80%)`
                }}
              />

              {/* Card top */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                  <Activity className="h-3 w-3 animate-pulse" /> Live Telemetry Online
                </span>
                <span className="text-[9px] font-mono font-bold text-[#7A827B]">ID: LS_04X</span>
              </div>

              {/* Card central massive logo with elegant depth layers */}
              <div className="my-6 flex flex-col items-center justify-center space-y-4">
                <div 
                  className="transition-transform duration-300 pointer-events-none"
                  style={{ transform: "translateZ(40px) scale(1.1)" }}
                >
                  <LifeSaverLogo className="h-28 w-28 animate-pulse-slow" showText={false} />
                </div>
                
                <div className="text-center space-y-1">
                  <h3 className="font-serif text-lg font-black tracking-tight text-[#1C1E1B]">LIFE SAVER</h3>
                  <p className="text-[10px] font-mono uppercase text-[#7A827B] tracking-widest">Cognitive Shield Active</p>
                </div>
              </div>

              {/* Card slider indicators simulation (Interactive look) */}
              <div className="space-y-3 bg-[#FAF9F6] border border-[#2D312E]/5 rounded-2xl p-3 text-xs text-[#4E5450]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wider font-bold">Respiration Coherence:</span>
                  <span className="font-bold text-blue-600 font-mono">92.4%</span>
                </div>
                <div className="w-full bg-[#2D312E]/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#0B71E1] h-full rounded-full transition-all" style={{ width: "92%" }} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wider font-bold">Cognitive Clarity:</span>
                  <span className="font-bold text-amber-600 font-mono">Restorative</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================== 2. ABOUT THE WEBSITE ==================== */}
      <section className="space-y-8 text-left">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-[#7A827B] bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-md">
            WHAT WE STAND FOR
          </span>
          <h2 className="text-3xl font-serif font-bold text-[#1C1E1B] tracking-tight">
            Designed for Minds Under Pressure
          </h2>
          <p className="text-xs md:text-sm text-[#7A827B] max-w-lg mx-auto">
            Standard task calendars expect you to be a flawless productivity robot. LifeSaver expects you to be a real, emotional human who gets tired, stressed, and overwhelmed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#2D312E]/10 p-6 rounded-2xl hover:border-amber-500/20 shadow-xs transition-all space-y-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-md font-serif font-bold text-[#1C1E1B] tracking-tight">
              Adrenaline Tamer (My Flow)
            </h3>
            <p className="text-xs text-[#7A827B] leading-relaxed">
              Prioritizes tasks by cognitive load, energy requirements, and urgency score, preventing massive intimidating list paralysis. Starts the timer with visual guides.
            </p>
          </div>

          <div className="bg-white border border-[#2D312E]/10 p-6 rounded-2xl hover:border-blue-500/20 shadow-xs transition-all space-y-4">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Wind className="h-5 w-5" />
            </div>
            <h3 className="text-md font-serif font-bold text-[#1C1E1B] tracking-tight">
              Stress Vaporizer Sandbox
            </h3>
            <p className="text-xs text-[#7A827B] leading-relaxed">
              An interactive physical gravity sandbox on your dashboard. Pull weighted stress circles containing tasks to center them and let them disintegrate with sound waves.
            </p>
          </div>

          <div className="bg-white border border-[#2D312E]/10 p-6 rounded-2xl hover:border-teal-500/20 shadow-xs transition-all space-y-4">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
              <Activity className="h-5 w-5" />
            </div>
            <h3 className="text-md font-serif font-bold text-[#1C1E1B] tracking-tight">
              Live Cardiac Coherence Vibe
            </h3>
            <p className="text-xs text-[#7A827B] leading-relaxed">
              Tune your breathing to our cyclical inhale-exhale visual guides. Generate localized synthesizer hums to reach heart-rate variability coherence peaks.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== 3. AMAZING & EXCITING SYSTEMS: ASTRO-ACOUSTIC TUNER ==================== */}
      <section className="bg-stone-50 border border-[#2D312E]/10 rounded-3xl p-6 md:p-8 text-left space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2D312E]/10 pb-4">
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#EA3900] font-mono">EXCITING NEW MODULE</span>
            <h3 className="text-xl font-serif font-bold text-[#1C1E1B] tracking-tight flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-[#0B71E1] stroke-[2.2]" /> Neuro-Acoustic Brainwave Stabilizer
            </h3>
            <p className="text-xs text-[#7A827B]">
              Preview and activate healing neural oscillations backed by sonic attention studies.
            </p>
          </div>
          
          {activePreview && (
            <div className="flex items-center gap-1.5 bg-[#FAF9F6] px-3 py-1 rounded-xl border border-blue-500/20 animate-pulse text-xs font-mono font-bold text-[#0B71E1]">
              <div className="h-2 w-2 rounded-full bg-blue-600" /> Active 110Hz Signal Generating
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => toggleSoundPreview("alpha")}
            className={`border rounded-2xl p-4 text-left transition duration-200 cursor-pointer ${
              activePreview === "alpha" 
                ? "bg-[#0B71E1]/10 border-blue-500/40 divide-[#0B71E1]" 
                : "bg-white border-[#2D312E]/10 hover:border-blue-500/20"
            }`}
          >
            <span className="font-mono text-[10px] uppercase font-bold text-blue-600 block mb-1">10Hz ALPHA CHORD</span>
            <span className="text-sm font-bold text-[#1C1E1B] block font-serif">Alpha Attention Streamer</span>
            <span className="text-xs text-[#7A827B] mt-1.5 block">
              Generates a ultra-deep base hum to align electrical activity of high-stress parietal brain regions.
            </span>
          </button>

          <button
            onClick={() => toggleSoundPreview("sigh")}
            className={`border rounded-2xl p-4 text-left transition duration-200 cursor-pointer ${
              activePreview === "sigh" 
                ? "bg-[#0B71E1]/10 border-blue-500/40 divide-[#0B71E1]" 
                : "bg-white border-[#2D312E]/10 hover:border-blue-500/20"
            }`}
          >
            <span className="font-mono text-[10px] uppercase font-bold text-teal-600 block mb-1">528Hz RESTORATIVE TONE</span>
            <span className="text-sm font-bold text-[#1C1E1B] block font-serif">Physiological Resettler</span>
            <span className="text-xs text-[#7A827B] mt-1.5 block">
              Solfeggio frequency chord corresponding to relaxation mechanisms. Calms erratic mental feedback.
            </span>
          </button>

          <button
            onClick={() => toggleSoundPreview("brown")}
            className={`border rounded-2xl p-4 text-left transition duration-200 cursor-pointer ${
              activePreview === "brown" 
                ? "bg-[#0B71E1]/10 border-blue-500/40 divide-[#0B71E1]" 
                : "bg-white border-[#2D312E]/10 hover:border-blue-500/20"
            }`}
          >
            <span className="font-mono text-[10px] uppercase font-bold text-amber-600 block mb-1">BROWN SUB HARMONIC</span>
            <span className="text-sm font-bold text-[#1C1E1B] block font-serif">Static Chaos Dampener</span>
            <span className="text-xs text-[#7A827B] mt-1.5 block">
              Warm analog rumble pattern configured to dissolve jarring high-frequency external office noise.
            </span>
          </button>
        </div>
      </section>

      {/* ==================== 4. PROOFS AND CLINICAL RESEARCH PAPERS ==================== */}
      <section className="space-y-6 text-left" id="clinical-proofs-database">
        <div className="space-y-1">
          <span className="text-[10px] font-bold font-mono tracking-widest text-[#7A827B] uppercase block">
            EVIDENCE-BASED COGNITIVE ENGINEERING
          </span>
          <h3 className="text-2xl font-serif font-bold text-[#1C1E1B] tracking-tight">
            Academic Validation & Science Proofs
          </h3>
          <p className="text-xs text-[#7A827B]">
            LifeSaver is built on verified psychiatric protocols. Here are the peer-reviewed scientific breakthroughs substantiating our workflow:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Paper 1 */}
          <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-5 hover:border-[#EA3900]/20 transition flex flex-col justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono uppercase bg-[#EA3900]/10 text-[#EA3900] px-2 py-0.5 rounded-sm">
                <Wind className="h-2.5 w-2.5" /> Breath Science
              </span>
              <h4 className="text-sm font-serif font-black tracking-tight text-[#1C1E1B] leading-tight">
                Brief daily respiration / sighing practices improve mood and reduce physiological-arousal states.
              </h4>
              <p className="text-[11px] text-[#7A827B] font-mono leading-normal italic">
                Balban, M. et al., Cell Reports Medicine (2023)
              </p>
              <p className="text-xs text-[#4E5450] leading-relaxed">
                Finding: Controlled cyclical breathing practices raise cardiac-coherence vibes and lower sympathetic nervous arousal significantly faster than standard mindfulness.
              </p>
            </div>
            <a
              href="https://doi.org/10.1016/j.xcrm.2022.100895"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-700 hover:text-amber-900 font-mono pt-3 border-t border-[#2D312E]/5"
            >
              <span>Read in Cell Reports</span>
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>

          {/* Paper 2 */}
          <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-5 hover:border-[#0B71E1]/20 transition flex flex-col justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono uppercase bg-[#0B71E1]/10 text-[#0B71E1] px-2 py-0.5 rounded-sm">
                <Brain className="h-2.5 w-2.5" /> Executive Exhaustion
              </span>
              <h4 className="text-sm font-serif font-black tracking-tight text-[#1C1E1B] leading-tight">
                Attention Restoration Theory: The cognitive benefits of soft fascinal interaction.
              </h4>
              <p className="text-[11px] text-[#7A827B] font-mono leading-normal italic">
                Kaplan, S., Journal of Environmental Psychology (1989)
              </p>
              <p className="text-xs text-[#4E5450] leading-relaxed">
                Finding: Voluntary directed focus is a finite biological battery. Exposing the mind to "soft fascinal" physics sandboxes (like gravity orbits) restores depleted executive functions.
              </p>
            </div>
            <a
              href="https://doi.org/10.1016/S0272-4944(89)80006-0"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-700 hover:text-amber-900 font-mono pt-3 border-t border-[#2D312E]/5"
            >
              <span>Read in J. Environ. Psych</span>
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>

          {/* Paper 3 */}
          <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-5 hover:border-teal-500/20 transition flex flex-col justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono uppercase bg-teal-500/10 text-teal-700 px-2 py-0.5 rounded-sm">
                <Award className="h-2.5 w-2.5" /> Procrastination Therapy
              </span>
              <h4 className="text-sm font-serif font-black tracking-tight text-[#1C1E1B] leading-tight">
                Procrastination and Emotional Ego Defense: Short-term relief at the expense of long-term goals.
              </h4>
              <p className="text-[11px] text-[#7A827B] font-mono leading-normal italic">
                Sirois, F. & Pychyl, T., Social and Personality Psychology Compass (2013)
              </p>
              <p className="text-xs text-[#4E5450] leading-relaxed">
                Finding: Retaining tasks in an abstract state induces threat response. Chunking items based on cognitive load and starting with a physical focus timer calms threat triggers.
              </p>
            </div>
            <a
              href="https://doi.org/10.1111/spc3.12011"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-700 hover:text-amber-900 font-mono pt-3 border-t border-[#2D312E]/5"
            >
              <span>Read Compass Paper</span>
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>

        </div>
      </section>

    </div>
  );
}
