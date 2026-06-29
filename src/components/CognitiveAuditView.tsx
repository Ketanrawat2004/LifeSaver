import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileUp, 
  Sparkles, 
  Award, 
  ShieldCheck, 
  ArrowRight, 
  Printer, 
  RefreshCw,
  Clock, 
  X, 
  BadgeAlert, 
  Briefcase, 
  History, 
  FileText,
  AlertTriangle,
  FlameKindling
} from "lucide-react";

interface EvaluationReport {
  score: number;
  cognitiveClarity: string;
  willpower: number;
  resiliency: number;
  attentionCoherence: number;
  positives: string[];
  risks: string[];
  strategicSuggestions: string[];
  certificationId: string;
  authority: string;
  certifiedDate: string;
  cryptographicSeal: string;
  verifiedStatus: string;
}

interface CognitiveAuditViewProps {
  currentUser: { username: string } | null;
  currentTime: Date;
}

export default function CognitiveAuditView({ currentUser, currentTime }: CognitiveAuditViewProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepsList = [
    "Decrypting file metadata and format protocols...",
    "Executing psychomental chronobiology analysis...",
    "Synthesizing attention coherence coefficients...",
    "Applying generative neural calibration indices...",
    "Engraving official verification seal and certificate signatures..."
  ];

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const triggerSearchSample = () => {
    // Generate organic sample log
    const sampleLog = `Time,Task,DurationMinutes,FocusScore,DistractionCount
09:00,Deep Work: System Architecture Design,90,95,2
11:00,Team Sync Core,30,85,4
12:00,Break & Lunch,60,100,0
13:15,Refinement: API Endpoints,45,90,1
14:00,Admin Emails & Backlog triage,60,70,8
15:30,Urgent bug Hotfix: Session leak,120,92,3
18:00,Planning Block,15,80,1
Habit completed: 10m Mindfulness Breathing
Habit completed: Digital Sunset Setup`;
    
    setManualText(sampleLog);
    setActiveTab("paste");
  };

  const startEvaluation = async () => {
    setErrorMsg("");
    setReport(null);
    let finalContent = "";
    let dataName = "manual_input.txt";

    if (activeTab === "upload") {
      if (!file) {
        setErrorMsg("Please choose or drag-and-drop a file first");
        return;
      }
      dataName = file.name;
      try {
        finalContent = await file.text();
      } catch (err: any) {
        setErrorMsg(`Failed to read file: ${err.message || err}`);
        return;
      }
    } else {
      if (!manualText.trim()) {
        setErrorMsg("Please paste some logs, notes, steps, or schedule statistics to analyze");
        return;
      }
      finalContent = manualText;
    }

    setIsLoading(true);
    setLoadStep(0);

    // Step cycle animations
    const stepInterval = setInterval(() => {
      setLoadStep((prev) => (prev >= stepsList.length - 1 ? prev : prev + 1));
    }, 1300);

    try {
      const response = await fetch("/api/evaluate-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataContent: finalContent,
          fileName: dataName,
          username: currentUser?.username || "Athena",
          currentTime: currentTime.toISOString()
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${response.status}`);
      }

      const reportData = await response.json();
      setReport(reportData);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong during evaluation.");
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  // Certified layout print handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8" id="cognitive-performance-audit">
      
      {/* Premium subtle printed certificate page styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-certified-certificate-panel, #print-certified-certificate-panel * {
            visibility: visible;
          }
          #print-certified-certificate-panel {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: white !important;
            border: 2px solid #1C1E1B !important;
            margin: 0;
            padding: 20px !important;
            box-shadow: none !important;
          }
          .non-printable {
            display: none !important;
          }
        }
      `}</style>

      {/* Header and Value Statement */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-700 tracking-widest font-mono uppercase bg-amber-50 border border-amber-200/55 px-2.5 py-1 rounded-full">
            Elite Diagnostic Lab
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1C1E1B] font-sans mt-2">
            Cognitive Clarity & Focus Audit
          </h1>
          <p className="text-[#7A827B] text-sm max-w-2xl mt-1 leading-relaxed">
            Upload your chronobiology logs, schedules, habit data, or daily journals. Our cognitive engine maps focus density, resilience factors, and generates an official Certified Performance Audit.
          </p>
        </div>

        <button
          onClick={triggerSearchSample}
          className="self-start md:self-auto flex items-center gap-1.5 px-3.5 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl transition duration-200 cursor-pointer text-xs font-sans font-semibold non-printable"
        >
          <Sparkles className="h-4 w-4 text-amber-600" /> Insert Sample Dataset
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Input/Source Section */}
        <div className="lg:col-span-5 space-y-6 non-printable">
          <div className="bg-white border border-[#2D312E]/10 rounded-2xl p-6 shadow-xs">
            <div className="flex border-b border-[#2D312E]/10 pb-4 mb-5 gap-4">
              <button
                onClick={() => { setActiveTab("upload"); setErrorMsg(""); }}
                className={`flex-1 pb-2.5 text-xs font-bold tracking-wider uppercase font-mono border-b-2 transition duration-150 cursor-pointer ${
                  activeTab === "upload" 
                    ? "border-[#1C1E1B] text-[#1C1E1B]" 
                    : "border-transparent text-[#7A827B] hover:text-[#1C1E1B]"
                }`}
              >
                Upload File Log
              </button>
              <button
                onClick={() => { setActiveTab("paste"); setErrorMsg(""); }}
                className={`flex-1 pb-2.5 text-xs font-bold tracking-wider uppercase font-mono border-b-2 transition duration-150 cursor-pointer ${
                  activeTab === "paste" 
                    ? "border-[#1C1E1B] text-[#1C1E1B]" 
                    : "border-transparent text-[#7A827B] hover:text-[#1C1E1B]"
                }`}
              >
                Paste Custom Data
              </button>
            </div>

            {activeTab === "upload" ? (
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition flex flex-col items-center justify-center min-h-[220px] ${
                  dragActive 
                    ? "border-amber-600 bg-amber-50/20" 
                    : "border-[#2D312E]/10 bg-stone-50/50 hover:bg-stone-50"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".txt,.csv,.json,.log"
                  className="hidden" 
                />
                
                {file ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-stone-100 rounded-2xl inline-block border border-[#2D312E]/10">
                      <FileText className="h-10 w-10 text-[#2D312E]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1C1E1B] max-w-[240px] truncate mx-auto">{file.name}</p>
                      <p className="text-xs text-[#7A827B] mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button 
                      onClick={() => setFile(null)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline cursor-pointer"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-full inline-block">
                      <FileUp className="h-6 w-6 text-[#7A827B]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1C1E1B]">Drag & Drop your schedule dataset here</p>
                      <p className="text-xs text-[#7A827B] mt-1">Supports .csv, .json, .txt, or .log files</p>
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold px-3.5 py-1.5 bg-[#1C1E1B] text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Browse Files
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#7A827B]">Paste Workflow, Screen Log or Personal Journal</label>
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="e.g. 09:00 Deep learning study for 45 mins. Distraction level medium. Felt good."
                  rows={8}
                  className="w-full text-xs font-mono p-3 bg-stone-50 border border-[#2D312E]/10 rounded-xl focus:outline-hidden focus:border-amber-600 transition"
                />
              </div>
            )}

            {errorMsg && (
              <p className="text-xs font-bold text-rose-600 mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg">
                ⚠️ {errorMsg}
              </p>
            )}

            <button
              onClick={startEvaluation}
              disabled={isLoading}
              className={`w-full mt-6 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl py-3 text-xs font-bold font-sans tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:from-amber-700 hover:to-amber-800 ${
                isLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  Analyzing Dataset...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-200" />
                  Evaluate & Generate Certified Report
                </>
              )}
            </button>
          </div>

          {/* Interactive Loading Panel */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-stone-900 border border-stone-800 rounded-2xl p-6 text-white space-y-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <FlameKindling className="h-6 w-6 text-amber-400 animate-bounce" />
                  <div>
                    <h4 className="text-sm font-bold font-sans">Cognitive AI Pipeline Online</h4>
                    <p className="text-[10px] text-stone-400 font-mono">Running secure server validation</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full transition-all duration-700" 
                      style={{ width: `${((loadStep + 1) / stepsList.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-amber-400/90 font-mono leading-normal h-8 flex items-center animate-pulse">
                    &gt; {stepsList[loadStep]}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dashboard evaluation report & Certified certificate output */}
        <div className="lg:col-span-7 space-y-8">
          
          {report ? (
            <div className="space-y-8 animate-fade-in">
              
              {/* Core Psychometric Indicator dials */}
              <div className="grid grid-cols-3 gap-4 non-printable">
                
                {/* Willpower */}
                <div className="bg-white border border-[#2D312E]/10 p-4 rounded-2xl text-center shadow-xs">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Willpower (Grit)</span>
                  <div className="relative flex items-center justify-center my-3">
                    <svg className="w-20 h-20" viewBox="0 0 36 36">
                      <path className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-amber-600 transition-all duration-1000" strokeWidth="3" strokeDasharray={`${report.willpower}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute text-base font-extrabold font-mono text-[#1C1E1B]">{report.willpower}%</div>
                  </div>
                  <p className="text-[10px] text-gray-400 font-sans leading-tight">Consistency in completing goal workflows.</p>
                </div>

                {/* Resiliency */}
                <div className="bg-white border border-[#2D312E]/10 p-4 rounded-2xl text-center shadow-xs">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Resiliency</span>
                  <div className="relative flex items-center justify-center my-3">
                    <svg className="w-20 h-20" viewBox="0 0 36 36">
                      <path className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-teal-600 transition-all duration-1000" strokeWidth="3" strokeDasharray={`${report.resiliency}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute text-base font-extrabold font-mono text-[#1C1E1B]">{report.resiliency}%</div>
                  </div>
                  <p className="text-[10px] text-gray-400 font-sans leading-tight">Adequate fatigue recovery slots protection.</p>
                </div>

                {/* Attention Coherence */}
                <div className="bg-white border border-[#2D312E]/10 p-4 rounded-2xl text-center shadow-xs">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Coherence</span>
                  <div className="relative flex items-center justify-center my-3">
                    <svg className="w-20 h-20" viewBox="0 0 36 36">
                      <path className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-rose-600 transition-all duration-1000" strokeWidth="3" strokeDasharray={`${report.attentionCoherence}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute text-base font-extrabold font-mono text-[#1C1E1B]">{report.attentionCoherence}%</div>
                  </div>
                  <p className="text-[10px] text-gray-400 font-sans leading-tight">Ability to stay on track during focus bursts.</p>
                </div>

              </div>

              {/* Cognitive Strength / Weakness / Suggesitons details */}
              <div className="grid md:grid-cols-2 gap-6 non-printable">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold font-mono text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Behavioral Strengths
                  </h4>
                  <ul className="space-y-2 text-xs text-stone-700 leading-normal list-disc pl-4">
                    {report.positives.map((pos, idx) => (
                      <li key={idx}>{pos}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold font-mono text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" /> Fatigue & Risk Points
                  </h4>
                  <ul className="space-y-2 text-xs text-stone-700 leading-normal list-disc pl-4">
                    {report.risks.map((risk, idx) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action list */}
              <div className="bg-white border border-[#2D312E]/10 p-6 rounded-2xl space-y-4 non-printable">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 font-mono flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-amber-600" /> Executive Restructuring Steps
                </h4>
                <div className="grid gap-3">
                  {report.strategicSuggestions.map((sug, idx) => (
                    <div key={idx} className="flex gap-3 items-start bg-stone-50 border border-[#2D312E]/5 rounded-xl p-3 text-xs leading-normal">
                      <span className="flex-shrink-0 bg-stone-900 text-white rounded-full h-5 w-5 flex items-center justify-center font-mono font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <p className="text-stone-800 font-sans">{sug}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Printable Premium Certified Certificate Card */}
              <div 
                id="print-certified-certificate-panel"
                className="bg-[#FCFAF2] border-4 border-stone-800 p-8 sm:p-12 rounded-3xl relative overflow-hidden shadow-md select-none"
              >
                {/* Vintage Guilloche/Security Stamp Background Elements */}
                <div className="absolute inset-0 border border-stone-300 m-2 pointer-events-none rounded-2xl" />
                <div className="absolute inset-0 border-2 border-stone-800 m-4 pointer-events-none rounded-2xl" />
                <div className="absolute top-0 right-0 h-44 w-44 bg-amber-500/5 rounded-full filter blur-3xl pointer-events-none" />
                
                {/* Official Crest Header */}
                <div className="text-center space-y-3 relative z-10">
                  <div className="flex justify-center">
                    <div className="p-3 bg-stone-900 text-amber-400 rounded-full shadow-lg border border-stone-700">
                      <Award className="h-10 w-10 animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className="text-xs font-bold font-mono tracking-[0.25em] text-stone-500 uppercase">
                      Official Psychometric Assessment
                    </h2>
                    <h3 className="text-2xl font-serif text-[#1C1E1B] font-bold italic tracking-tight">
                      Certificate of Cognitive Performance
                    </h3>
                  </div>

                  <div className="w-24 h-0.5 bg-stone-800 mx-auto my-3" />
                </div>

                {/* Substantive core layout content */}
                <div className="space-y-6 text-center max-w-xl mx-auto mt-8 relative z-10">
                  <p className="text-[11px] font-mono text-[#7A827B] uppercase tracking-widest">
                    This document verifies that
                  </p>
                  
                  <div>
                    <h4 className="text-2xl font-bold text-stone-900 border-b border-stone-400 pb-1.5 inline-block px-10 capitalize font-sans tracking-wide">
                      {currentUser?.username || "Athena"}
                    </h4>
                  </div>

                  <p className="text-xs text-stone-700 font-sans leading-relaxed px-4">
                    Has successfully submitted behavioral flow-state logs, chronobiology schedules, and habit execution structures for diagnostic cognitive modeling.
                    The algorithmic metrics indicate a **Cumulative Focus Quality Index** of:
                  </p>

                  <div className="py-2.5">
                    <div className="inline-flex flex-col items-center justify-center border-2 border-stone-800 bg-white rounded-2xl px-8 py-3.5 shadow-sm">
                      <span className="text-5xl font-extrabold font-mono text-[#D97706] tracking-tighter leading-none">
                        {report.score} <span className="text-xl text-stone-400">/100</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold tracking-widest text-[#7A827B] uppercase mt-2">
                        {report.score >= 85 ? "EXCELLENT PERFORMANCE" : report.score >= 70 ? "HIGH COMPETENCY" : "DEVELOPING PROFILE"}
                      </span>
                    </div>
                  </div>

                  {/* Summary evaluation text inside certificate */}
                  <p className="text-xs text-stone-600 font-serif italic max-w-lg mx-auto leading-relaxed bg-[#FAF9F5] p-3.5 rounded-xl border border-stone-200">
                    &ldquo;{report.cognitiveClarity}&rdquo;
                  </p>
                </div>

                {/* Sign-offs and QR/Security seal metadata at bottom */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-10 mt-8 border-t border-stone-300 relative z-10 text-xs">
                  
                  {/* Digital Signature 1 */}
                  <div className="text-center space-y-1 sm:col-span-1">
                    <div className="font-serif italic text-stone-700 text-sm h-7 flex items-end justify-center select-none font-bold">
                      Dr. Evelyn Sterling
                    </div>
                    <div className="w-24 h-px bg-stone-300 mx-auto" />
                    <p className="text-[10px] font-bold text-stone-400 font-mono uppercase tracking-widest">Cognitive Architect</p>
                  </div>

                  {/* Certificate Verification metadata */}
                  <div className="text-center space-y-1.5 hidden sm:block sm:col-span-1 border-x border-stone-200">
                    <div className="flex justify-center">
                      <ShieldCheck className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-[9px] font-mono font-bold text-[#1C1E1B]">{report.certificationId}</p>
                      <p className="text-[8px] text-stone-400 font-sans">{report.certifiedDate}</p>
                    </div>
                  </div>

                  {/* Digital Signature 2 */}
                  <div className="text-center space-y-1 sm:col-span-1">
                    <div className="font-serif italic text-[#1C1E1B] text-sm h-7 flex items-end justify-center select-none font-bold">
                      {currentUser?.username || "Athena"} (User)
                    </div>
                    <div className="w-24 h-px bg-stone-300 mx-auto" />
                    <p className="text-[10px] font-bold text-stone-400 font-mono uppercase tracking-widest">Authorized Officer</p>
                  </div>

                </div>

                {/* Secure Seal Ribbon - repositioned nested safely within the margins to prevent clipping or layout cutting */}
                <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 lg:bottom-10 lg:right-10 h-24 w-24 bg-[#FCFAF2] border-2 border-[#D97706]/70 rounded-full flex items-center justify-center p-1.5 select-none transform rotate-12 shadow-xs z-20">
                  <div className="border border-dashed border-[#D97706]/50 rounded-full h-full w-full flex flex-col items-center justify-center text-center p-0.5">
                    <span className="text-[7.5px] font-extrabold font-mono text-[#D97706] tracking-tighter uppercase leading-none">SEAL VERIFIED</span>
                    <span className="text-[6px] font-mono text-stone-500 mt-1 uppercase tracking-wider">SECURE AUDIT</span>
                    <span className="text-[6.5px] font-mono text-stone-700 mt-0.5 font-bold">{report.cryptographicSeal.split("-")[2]}</span>
                  </div>
                </div>

              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-[#2D312E]/10 p-4 rounded-2xl shadow-xs non-printable">
                <div className="flex items-center gap-3">
                  <Printer className="h-5 w-5 text-amber-600 animate-pulse" />
                  <div>
                    <h5 className="text-xs font-bold text-[#1C1E1B]">Export Certified Diagnostic Report</h5>
                    <p className="text-[10px] text-[#7A827B]">Securely compile Vector PDF report document using localized browser print formats.</p>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => { setReport(null); setErrorMsg(""); setFile(null); setManualText(""); }}
                    className="flex-1 sm:flex-initial px-4 py-2 border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-1.5"
                  >
                    Reset Audit
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex-1 sm:flex-initial bg-stone-900 hover:bg-stone-800 text-white font-bold py-2 px-5 rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Printer className="h-3.5 w-3.5" /> Download Certified PDF
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-stone-50 border border-[#2D312E]/10 rounded-2xl p-12 text-center text-[#7A827B] flex flex-col items-center justify-center min-h-[350px] space-y-3">
              <div className="p-4 bg-stone-100 rounded-2xl border border-stone-200 inline-block text-amber-700">
                <Award className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-stone-900 font-bold text-base">State Evaluation Awaiting Data</h3>
                <p className="text-xs text-[#7A827B] max-w-[340px] mx-auto mt-1 leading-normal">
                  Upload a dataset or use our pre-loaded sample workflow template to run an instant AI energy and focus competency checkup.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
