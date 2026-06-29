import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Music, 
  Sparkles, 
  ChevronUp, 
  ChevronDown, 
  Radio, 
  Wind, 
  Moon, 
  CloudRain 
} from "lucide-react";

interface Track {
  id: string;
  name: string;
  creator: string;
  type: "solfeggio" | "binaural" | "cosmic" | "rain";
  description: string;
  icon: React.ComponentType<any>;
}

export default function ZenAudioPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<string>("solfeggio_432");
  const [volume, setVolume] = useState<number>(0.35);
  const [isMuted, setIsMuted] = useState(false);

  // Web Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Synth Source Nodes Ref
  const activeSourcesRef = useRef<any[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const tracks: Track[] = [
    {
      id: "solfeggio_432",
      name: "Solar Resonance (432Hz)",
      creator: "LifeSaver Labs",
      type: "solfeggio",
      description: "Harmonizing Solfeggio freq to lower heart rates, relieve systemic cortisol & steady neural waves.",
      icon: Sparkles
    },
    {
      id: "binaural_theta",
      name: "Celestial Theta Entrainment",
      creator: "LifeSaver Labs",
      type: "binaural",
      description: "Acoustic 6Hz binaural differentials. Induces deep meditation, divergent thought vectors, & laser task focus.",
      icon: Radio
    },
    {
      id: "cosmic_nebula",
      name: "Deep Space Nebula Pad",
      creator: "LifeSaver Labs",
      type: "cosmic",
      description: "A gorgeous, sweeping minor-chord ambient synthesizer pad with multi-pass rhythmic filter modulations.",
      icon: Moon
    },
    {
      id: "rain_rustle",
      name: "Organic Forest Rain",
      creator: "LifeSaver Labs",
      type: "rain",
      description: "Procedurally generated pink-filtered white noise mimicking steady mountain rainfall & rustling leaves.",
      icon: CloudRain
    }
  ];

  const currentTrack = tracks.find(t => t.id === selectedTrack) || tracks[0];

  // Initialize Audio Context on demand (user interaction)
  const initAudio = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) {
          console.warn("AudioContext not supported by this browser.");
          return;
        }
        const ctx = new AudioCtx();
        const gain = ctx.createGain();
        const analyser = ctx.createAnalyser();

        analyser.fftSize = 64;
        gain.gain.setValueAtTime(volume, ctx.currentTime);

        // Connect node chain: Source -> Analyser -> Gain -> Destination
        analyser.connect(gain);
        gain.connect(ctx.destination);

        audioCtxRef.current = ctx;
        gainNodeRef.current = gain;
        analyserRef.current = analyser;
      }

      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch((err) => {
          console.warn("AudioContext resume rejected:", err);
        });
      }
    } catch (err) {
      console.warn("Audio initialization bypassed due to security context / device constraints:", err);
    }
  };

  // Helper to stop all current active audio processors
  const stopAllSources = () => {
    activeSourcesRef.current.forEach((srcObj) => {
      try {
        if (srcObj.stop) srcObj.stop();
      } catch (e) {}
      try {
        if (srcObj.oscillator) srcObj.oscillator.stop();
      } catch (e) {}
      try {
        if (srcObj.oscillatorLeft) srcObj.oscillatorLeft.stop();
      } catch (e) {}
      try {
        if (srcObj.oscillatorRight) srcObj.oscillatorRight.stop();
      } catch (e) {}
      try {
        if (srcObj.lfo) srcObj.lfo.stop();
      } catch (e) {}
    });
    activeSourcesRef.current = [];
  };

  // Synthesize custom ambient states based on selected track ID
  const playActiveSynthesizer = () => {
    stopAllSources();
    if (!isPlaying || !audioCtxRef.current) return;

    const ctx = audioCtxRef.current;
    const destNode = analyserRef.current;
    if (!destNode) return;

    if (selectedTrack === "solfeggio_432") {
      // --- Play 432Hz Deep Solfeggio Drone ---
      const baseFreq = 432;
      
      // 1. Root Oscillator (Sustain & Depth)
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);

      // 2. Harmonizing Sub-octave (Adds warmth)
      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(baseFreq / 2, ctx.currentTime);

      // 3. Perfect Fifth overtone (resonance)
      const osc3 = ctx.createOscillator();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime);

      // Separate mix gains
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      const gain3 = ctx.createGain();

      gain1.gain.setValueAtTime(0.4, ctx.currentTime);
      gain2.gain.setValueAtTime(0.22, ctx.currentTime);
      gain3.gain.setValueAtTime(0.08, ctx.currentTime);

      // Connect sources to separate gains
      osc1.connect(gain1);
      osc2.connect(gain2);
      osc3.connect(gain3);

      // Rhythmic filter sweep
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(600, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);

      gain1.connect(filter);
      gain2.connect(filter);
      gain3.connect(filter);

      // Slow LFO to sweep lowpass frequency
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // 0.12 Hz cycle
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(250, ctx.currentTime); // scale sweep +/- 250Hz

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      // Route to master output
      filter.connect(destNode);

      // Start all sound operators
      osc1.start();
      osc2.start();
      osc3.start();
      lfo.start();

      activeSourcesRef.current.push({
        stop: () => {
          osc1.stop();
          osc2.stop();
          osc3.stop();
          lfo.stop();
        }
      });

    } else if (selectedTrack === "binaural_theta") {
      // --- Play Binaural Beats at Theta frequency (6Hz differential) ---
      const baseFreq = 180; // 180Hz carrier wave
      const thetaDiff = 6;  // theta wave entrainment

      // Create a stereo merger to split left and right ears perfectly
      const merger = ctx.createChannelMerger(2);

      // Left Channel Oscillator
      const oscL = ctx.createOscillator();
      oscL.type = "sine";
      oscL.frequency.setValueAtTime(baseFreq - thetaDiff/2, ctx.currentTime);

      // Right Channel Oscillator
      const oscR = ctx.createOscillator();
      oscR.type = "sine";
      oscR.frequency.setValueAtTime(baseFreq + thetaDiff/2, ctx.currentTime);

      // Subtle atmospheric modulation to prevent audio fatigue
      const oscMod = ctx.createOscillator();
      oscMod.type = "triangle";
      oscMod.frequency.setValueAtTime(baseFreq * 3, ctx.currentTime); // Harmonics

      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(0.03, ctx.currentTime); // Soft touch

      const gainL = ctx.createGain();
      const gainR = ctx.createGain();

      gainL.gain.setValueAtTime(0.5, ctx.currentTime);
      gainR.gain.setValueAtTime(0.5, ctx.currentTime);

      oscL.connect(gainL);
      oscR.connect(gainR);
      oscMod.connect(modGain);

      // Direct channel connections
      gainL.connect(merger, 0, 0); // connect to Left channel
      gainR.connect(merger, 0, 1); // connect to Right channel

      // Connect merger to filter and main visualizer
      const beatFilter = ctx.createBiquadFilter();
      beatFilter.type = "lowpass";
      beatFilter.frequency.setValueAtTime(220, ctx.currentTime);

      merger.connect(beatFilter);
      modGain.connect(beatFilter);
      beatFilter.connect(destNode);

      oscL.start();
      oscR.start();
      oscMod.start();

      activeSourcesRef.current.push({
        stop: () => {
          oscL.stop();
          oscR.stop();
          oscMod.stop();
        }
      });

    } else if (selectedTrack === "cosmic_nebula") {
      // --- Sweeping Space Minor Pad (Eb Minor 11 Chord) ---
      // frequencies: Eb3(155.56), Bb3(233.08), Db4(277.18), F4(349.23), Ab4(415.30)
      const freqs = [155.56, 233.08, 277.18, 349.23, 415.30];
      const oscillators: OscillatorNode[] = [];
      const gains: GainNode[] = [];

      const masterPadFilter = ctx.createBiquadFilter();
      masterPadFilter.type = "bandpass";
      masterPadFilter.frequency.setValueAtTime(400, ctx.currentTime);
      masterPadFilter.Q.setValueAtTime(1.0, ctx.currentTime);

      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        // Alternating waveforms for organic texture
        osc.type = index % 2 === 0 ? "sawtooth" : "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // Slow detuning drift
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, ctx.currentTime);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12, ctx.currentTime);

        osc.connect(g);
        g.connect(masterPadFilter);

        osc.start();
        oscillators.push(osc);
        gains.push(g);
      });

      // LFO to modulate bandpass filter center
      const spaceLfo = ctx.createOscillator();
      spaceLfo.type = "sine";
      spaceLfo.frequency.setValueAtTime(0.06, ctx.currentTime); // super slow 16sec sweep

      const spaceLfoGain = ctx.createGain();
      spaceLfoGain.gain.setValueAtTime(250, ctx.currentTime);

      spaceLfo.connect(spaceLfoGain);
      spaceLfoGain.connect(masterPadFilter.frequency);
      spaceLfo.start();

      masterPadFilter.connect(destNode);

      activeSourcesRef.current.push({
        stop: () => {
          oscillators.forEach(o => o.stop());
          spaceLfo.stop();
        }
      });

    } else if (selectedTrack === "rain_rustle") {
      // --- Real-time Procedural Pink-colored Rainfall generator ---
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Pink noise filtering approximation
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; // scale back volume slightly
        b6 = white * 0.115926;
      }

      // Buffer Source player
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      // Filter rain to feel deeply cozy
      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = "lowpass";
      rainFilter.frequency.setValueAtTime(1100, ctx.currentTime);

      noiseNode.connect(rainFilter);
      rainFilter.connect(destNode);

      noiseNode.start();

      activeSourcesRef.current.push({
        stop: () => {
          noiseNode.stop();
        }
      });
    }
  };

  // Trigger sound logic on changes
  useEffect(() => {
    if (isPlaying) {
      initAudio();
      playActiveSynthesizer();
    } else {
      stopAllSources();
    }
  }, [isPlaying, selectedTrack]);

  // Handle system audio controls and custom platform-wide global events to let other views control audio state
  useEffect(() => {
    const handleExternalControl = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail) return;
      
      const { action, trackId } = customEvent.detail;
      if (action === "play") {
        initAudio();
        setIsPlaying(true);
      } else if (action === "pause" || action === "stop") {
        setIsPlaying(false);
      } else if (action === "toggle") {
        setIsPlaying(prev => {
          if (!prev) initAudio();
          return !prev;
        });
      } else if (action === "mute") {
        setIsMuted(true);
      } else if (action === "unmute") {
        setIsMuted(false);
      }
      
      if (trackId) {
        setSelectedTrack(trackId);
      }
    };

    window.addEventListener("zen-audio-control", handleExternalControl);

    return () => {
      window.removeEventListener("zen-audio-control", handleExternalControl);
    };
  }, [isPlaying]);

  // Track volume changes
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      const volValue = isMuted ? 0 : volume;
      gainNodeRef.current.gain.setValueAtTime(volValue, audioCtxRef.current.currentTime);
    }
  }, [volume, isMuted]);

  // Clean elements on destruction
  useEffect(() => {
    return () => {
      stopAllSources();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Visualizer loop for real-time spectrum Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let localId: number;

    const drawVisual = () => {
      localId = requestAnimationFrame(drawVisual);
      
      const width = canvas.width = canvas.offsetWidth;
      const height = canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, width, height);

      if (!isPlaying || !analyserRef.current) {
        // Draw flat subtle line
        ctx.strokeStyle = "rgba(217, 119, 6, 0.15)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      const barWidth = (width / bufferLength) * 1.6;
      let barHeight;
      let x = 0;

      // Render symmetric mirroring equalizer spectrum waves
      ctx.fillStyle = "rgba(217, 119, 6, 0.25)";
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height * 0.85;

        // Draw soft vertical pill bars
        ctx.beginPath();
        ctx.fillStyle = i % 2 === 0 ? "rgba(217, 119, 6, 0.45)" : "rgba(13, 148, 136, 0.35)";
        ctx.roundRect(
          x, 
          height - barHeight - 2, 
          barWidth - 1.5, 
          barHeight + 2, 
          1 // border radius 1px
        );
        ctx.fill();

        x += barWidth;
      }
    };

    drawVisual();

    return () => {
      cancelAnimationFrame(localId);
    };
  }, [isPlaying]);

  return (
    <div className="relative non-printable">
      {/* Tiny floating audio anchor controller */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          initAudio();
        }}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-lg border transition-all duration-300 cursor-pointer ${
          isPlaying 
            ? "bg-[#1C1E1B] text-white border-amber-500/40" 
            : "bg-white text-stone-700 border-stone-200 hover:border-amber-500/20"
        }`}
        title="Zen Decompression Audio"
      >
        <Music className={`h-4 w-4 ${isPlaying ? "text-amber-400 rotate-[15deg] animate-pulse" : "text-stone-500"}`} />
        <span className="text-[11px] font-bold font-mono tracking-wide uppercase">
          {isPlaying ? "Relaxing Audio On" : "Zen Audio"}
        </span>
        {isOpen ? (
          <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
        ) : (
          <ChevronUp className="h-3 w-3 opacity-60 ml-0.5" />
        )}
      </button>

      {/* Expandable Audio Deck Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="absolute bottom-full mb-3.5 right-0 sm:right-auto sm:left-[-120px] z-50 bg-white/95 border border-stone-200 shadow-xl rounded-2xl w-80 max-w-[calc(100vw-2rem)] p-4 space-y-4 backdrop-blur-md font-sans text-left text-stone-850 non-printable animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div className="flex items-center gap-1.5">
                <Wind className="h-4 w-4 text-teal-600" />
                <h4 className="text-xs font-extrabold font-mono text-stone-900 uppercase tracking-wider">Zen Audio Catalyst</h4>
              </div>
              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded font-mono uppercase">
                432Hz Core
              </span>
            </div>

            {/* Equalizer Waveform Monitor */}
            <div className="bg-[#FAF9F5] rounded-lg p-2.5 border border-stone-200 relative overflow-hidden h-14 flex items-end">
              <canvas ref={canvasRef} className="w-full h-full block" />
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/80 border border-stone-200 px-1.5 py-0.5 rounded text-[8px] font-mono text-[#7A827B]">
                <Radio className={`h-2.5 w-2.5 ${isPlaying ? "text-[#D97706]" : "text-[#7A827B]"}`} />
                REAL-TIME SYNTH GENERATOR
              </div>
            </div>

            {/* Track Info */}
            <div className="space-y-1">
              <div className="text-xs font-bold text-stone-900 tracking-tight leading-tight uppercase flex items-center gap-1.5">
                <currentTrack.icon className="h-3.5 w-3.5 text-amber-600" />
                {currentTrack.name}
              </div>
              <p className="text-[10px] text-stone-400 font-mono">Synthesized by {currentTrack.creator}</p>
              <p className="text-[10px] text-stone-600 leading-normal font-sans italic bg-stone-50/50 p-2 rounded border border-stone-100 mt-1.5">
                {currentTrack.description}
              </p>
            </div>

            {/* Selector Grid */}
            <div className="grid grid-cols-2 gap-2">
              {tracks.map((track) => {
                const isSelected = track.id === selectedTrack;
                return (
                  <button
                    key={track.id}
                    onClick={() => {
                      setSelectedTrack(track.id);
                      initAudio();
                    }}
                    className={`p-2 rounded-xl text-left border transition text-xs font-sans cursor-pointer flex items-center gap-2 ${
                      isSelected 
                        ? "bg-amber-500/10 border-amber-500/50 text-[#1C1E1B]" 
                        : "bg-white border-stone-100 hover:bg-stone-50 text-[#7A827B]"
                    }`}
                  >
                    <track.icon className={`h-3 w-3 ${isSelected ? "text-amber-600" : "text-stone-400"}`} />
                    <span className="font-bold font-mono tracking-tight text-[10px] truncate">{track.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-stone-100">
              
              <button
                onClick={() => {
                  initAudio();
                  setIsPlaying(!isPlaying);
                }}
                className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-bold transition cursor-pointer shadow-sm ${
                  isPlaying 
                    ? "bg-amber-600 hover:bg-amber-700" 
                    : "bg-[#1C1E1B] hover:bg-stone-800"
                }`}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </button>

              {/* Volume Slider Section */}
              <div className="flex-1 flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-stone-500 hover:text-stone-800 transition cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-full h-1 bg-stone-200 accent-amber-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>

            </div>

            {/* Bottom Note */}
            <p className="text-[8px] text-[#7A827B] text-center italic mt-1 font-mono">
              Pure client-side physical sound wave integration. Prevents tracking cookies.
            </p>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
