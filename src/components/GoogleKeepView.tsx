import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  PlusCircle, 
  Check, 
  ExternalLink, 
  Lock, 
  Cloud, 
  Laptop,
  ArrowRight,
  Bookmark
} from "lucide-react";
import { getCachedKeepToken, setCachedKeepToken } from "../utils/gmailAuthStore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot, addDoc, query, orderBy, serverTimestamp } from "firebase/firestore";

interface KeepNote {
  id: string;
  title: string;
  body: string;
  color?: string;
  isLocal?: boolean;
}

interface GoogleKeepViewProps {
  onAddTask: (t: { title: string; priority: "critical" | "high" | "medium" | "low"; duration: number; energy: "high" | "medium" | "low" }) => void;
  currentUser: any;
}

const NOTE_COLORS = [
  { name: "Sand", class: "bg-amber-50/70 border-amber-200/60 text-amber-900" },
  { name: "Mint", class: "bg-emerald-50/70 border-emerald-200/60 text-emerald-900" },
  { name: "Sky", class: "bg-sky-50/70 border-sky-200/60 text-sky-900" },
  { name: "Lavender", class: "bg-purple-50/70 border-purple-200/60 text-purple-900" },
  { name: "Clay", class: "bg-rose-50/70 border-rose-200/60 text-rose-900" },
];

export default function GoogleKeepView({ onAddTask, currentUser }: GoogleKeepViewProps) {
  const [token, setToken] = useState<string | null>(getCachedKeepToken());
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<KeepNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Creation state
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [selectedColor, setSelectedColor] = useState("bg-amber-50/70 border-amber-200/60 text-amber-900");
  const [creating, setCreating] = useState(false);

  // Fallback / Hybrid Sync modes
  const [syncMode, setSyncMode] = useState<"api" | "cloud">("api");
  const [apiRestricted, setApiRestricted] = useState(false);

  // AI evaluation states
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{ summary: string; tasks: string[] } | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Authenticate Google to get Keep OAuth Scopes
  const handleConnectKeep = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Add required Keep scopes
      provider.addScope("https://www.googleapis.com/auth/keep");
      provider.addScope("https://www.googleapis.com/auth/keep.readonly");

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || null;

      if (!accessToken) {
        throw new Error("Failed to retrieve Google Access Token. Please try again.");
      }

      setCachedKeepToken(accessToken);
      setToken(accessToken);
      setSyncMode("api");
      setApiRestricted(false);
    } catch (err: any) {
      console.error("Keep Connection Error:", err);
      setError(err.message || "Failed to link Google Keep scopes.");
    } finally {
      setLoading(false);
    }
  };

  // Switch to Firestore Cloud backup mode
  const handleEnableCloudSync = () => {
    setSyncMode("cloud");
    setError(null);
    setSuccessMsg("Switched to Secure Firestore Cloud-Sync Mode!");
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Fetch from REST API
  const fetchNotesFromApi = async (accessToken: string) => {
    setLoading(true);
    try {
      const res = await fetch("https://keep.googleapis.com/v1/notes", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        // Handle common REST API restrictions/errors
        if (res.status === 403 || res.status === 404) {
          setApiRestricted(true);
          setSyncMode("cloud"); // Automatically activate cloud sync
          throw new Error("Google Keep REST API is restricted to enterprise Workspace domains. Switched to secure Cloud-Sync Mode automatically!");
        }
        if (res.status === 401) {
          setCachedKeepToken(null);
          setToken(null);
          throw new Error("Google credentials expired. Please reconnect.");
        }
        throw new Error(`API error code ${res.status}. Switched to cloud sync.`);
      }

      const data = await res.json();
      const rawNotes = data.notes || [];
      const parsed: KeepNote[] = rawNotes.map((n: any, idx: number) => ({
        id: n.name || `api-note-${idx}`,
        title: n.title || "Untitled Note",
        body: n.body?.text?.text || "No text content.",
        color: NOTE_COLORS[idx % NOTE_COLORS.length].class,
        isLocal: false
      }));

      setNotes(parsed);
      if (parsed.length > 0 && !selectedNote) {
        setSelectedNote(parsed[0]);
      }
    } catch (err: any) {
      console.warn("REST API loading failed, using cloud-sync:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Firestore Sync hook
  useEffect(() => {
    if (syncMode === "cloud" && currentUser?.uid) {
      setLoading(true);
      const notesRef = collection(db, "users", currentUser.uid, "notes");
      const q = query(notesRef, orderBy("createdAt", "desc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const cloudNotes: KeepNote[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || "Untitled Note",
            body: data.body || "",
            color: data.color || NOTE_COLORS[0].class,
            isLocal: true,
          };
        });

        setNotes(cloudNotes);
        if (cloudNotes.length > 0 && !selectedNote) {
          setSelectedNote(cloudNotes[0]);
        }
        setLoading(false);
      }, (err) => {
        console.error("Firestore loading error:", err);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [syncMode, currentUser]);

  // Load effect on token or mode changes
  useEffect(() => {
    if (token && syncMode === "api") {
      fetchNotesFromApi(token);
    } else if (!token) {
      // default to cloud mode if no Google connection
      setSyncMode("cloud");
    }
  }, [token, syncMode]);

  // Create Note (Handles API or Cloud Sync)
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBody.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const titleText = newTitle.trim() || "Untitled Note";

      if (syncMode === "api" && token) {
        // Send to Keep API
        const res = await fetch("https://keep.googleapis.com/v1/notes", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: titleText,
            body: {
              text: { text: newBody }
            }
          }),
        });

        if (!res.ok) {
          throw new Error("Could not create note on Google Keep API.");
        }

        fetchNotesFromApi(token);
      } else {
        // Save to Secure Firestore
        if (currentUser?.uid) {
          const notesRef = collection(db, "users", currentUser.uid, "notes");
          await addDoc(notesRef, {
            title: titleText,
            body: newBody,
            color: selectedColor,
            createdAt: serverTimestamp(),
          });
        } else {
          // Local memory fallback if unauthorized
          const memoryNote: KeepNote = {
            id: `mem-${Date.now()}`,
            title: titleText,
            body: newBody,
            color: selectedColor,
            isLocal: true,
          };
          setNotes(prev => [memoryNote, ...prev]);
          setSelectedNote(memoryNote);
        }
      }

      setNewTitle("");
      setNewBody("");
      setSuccessMsg("Note saved successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error("Create note error:", err);
      setError(err.message || "Failed to save note.");
    } finally {
      setCreating(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this note?");
    if (!confirmed) return;

    setError(null);
    try {
      if (syncMode === "api" && token && !noteId.startsWith("mem-")) {
        const res = await fetch(`https://keep.googleapis.com/v1/${noteId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Could not delete note on Google Keep API.");
        }

        fetchNotesFromApi(token);
      } else {
        // Delete from Secure Firestore
        if (currentUser?.uid) {
          await deleteDoc(doc(db, "users", currentUser.uid, "notes", noteId));
        } else {
          setNotes(prev => prev.filter(n => n.id !== noteId));
        }
      }

      setSelectedNote(null);
      setAiAnalysisResult(null);
      setSuccessMsg("Note deleted successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error("Delete note error:", err);
      setError(err.message || "Failed to delete note.");
    }
  };

  // Convert entire note into a standard Task
  const handleConvertToTask = (note: KeepNote) => {
    onAddTask({
      title: `Keep Note: ${note.title}`,
      priority: "medium",
      duration: 25,
      energy: "medium",
    });
    setSuccessMsg("Successfully added as a task to your Missions board!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Aegis AI Summarizer & Action steps extractor
  const handleAiAnalyze = async (note: KeepNote) => {
    setAiAnalyzing(true);
    setError(null);
    setAiAnalysisResult(null);
    try {
      const res = await fetch("/api/keep-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: note.title,
          content: note.body,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to process request on GenAI engine.");
      }

      const data = await res.json();
      setAiAnalysisResult(data);
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      setError("Failed to run AI evaluation. Please try again.");
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Add individual AI extracted task to Missions
  const handleAddExtractedTask = (taskTitle: string) => {
    onAddTask({
      title: taskTitle,
      priority: "high",
      duration: 25,
      energy: "medium",
    });
    setSuccessMsg(`Added Task: "${taskTitle}"`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6" id="keep-root-container">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5" id="keep-header-area">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 flex items-center gap-2" id="keep-view-title">
            <Bookmark className="h-6 w-6 text-amber-500" />
            Google Keep Integration
          </h1>
          <p className="text-xs text-stone-500 mt-1" id="keep-view-desc">
            Sync Google Keep notes, compose lists, and extract actionable tasks with our smart companion Aegis.
          </p>
        </div>

        {/* Mode Toggles */}
        <div className="flex items-center gap-2" id="keep-mode-controls">
          {token ? (
            <button
              id="keep-sync-mode-toggle"
              onClick={() => setSyncMode(syncMode === "api" ? "cloud" : "api")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                syncMode === "api"
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-stone-100 text-stone-700 border border-stone-200"
              }`}
            >
              {syncMode === "api" ? (
                <>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Google API Sync
                </>
              ) : (
                <>
                  <Cloud className="h-3.5 w-3.5" />
                  Cloud-Sync Mode
                </>
              )}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-xs font-semibold" id="cloud-sync-status">
              <Cloud className="h-3.5 w-3.5 text-emerald-600" />
              Secure Cloud-Sync Active
            </span>
          )}
        </div>
      </div>

      {/* Success & Error Indicators */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800"
            id="keep-success-alert"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 flex flex-col gap-1.5 text-xs text-rose-800"
            id="keep-error-alert"
          >
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Notification / Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-700">
              {error}
            </p>
            {apiRestricted && syncMode === "cloud" && (
              <button
                id="ack-fallback-button"
                onClick={() => setError(null)}
                className="mt-1 self-start px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded text-[10px] transition cursor-pointer"
              >
                Use Secure Cloud-Sync Mode (Recommended)
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workspace Link Promoters */}
      {!token && syncMode === "cloud" && (
        <div className="bg-[#FAF9F6] border border-[#2D312E]/10 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 max-w-4xl" id="google-keep-promo-box">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-stone-900">Want to connect Google Keep directly?</h3>
              <p className="text-[11px] text-stone-500 mt-1 max-w-xl">
                Authorize Google permissions to list your notes directly from Keep. If your Google Account is a consumer account (non-enterprise), Keep API might be restricted, but you can always use our secure Cloud-Sync backup.
              </p>
            </div>
          </div>
          <button
            id="link-google-keep-oauth"
            onClick={handleConnectKeep}
            disabled={loading}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition shrink-0 cursor-pointer"
          >
            Link Google Account
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="keep-workspace-grid">
        {/* Left Side: Create Form & List of Notes */}
        <div className="lg:col-span-5 space-y-6" id="keep-sidebar-area">
          {/* Note Form Creator */}
          <form onSubmit={handleCreateNote} className="bg-white border border-stone-100 rounded-2xl p-4 space-y-3 shadow-sm" id="keep-create-form">
            <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1.5" id="creator-header-title">
              <PlusCircle className="h-4 w-4 text-amber-500" />
              Compose Quick Note
            </h3>
            
            <input
              id="keep-new-title-input"
              type="text"
              placeholder="Note Title (Optional)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-stone-50 border border-stone-100 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-amber-400 focus:bg-white transition"
            />
            
            <textarea
              id="keep-new-body-input"
              required
              rows={3}
              placeholder="Start typing note content here..."
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              className="w-full bg-stone-50 border border-stone-100 rounded-lg p-3 text-xs outline-none focus:border-amber-400 focus:bg-white transition resize-none leading-relaxed"
            />

            {/* Colors and Submit bar */}
            <div className="flex items-center justify-between pt-1" id="creator-toolbar">
              <div className="flex items-center gap-1.5" id="color-selectors">
                {NOTE_COLORS.map((color) => {
                  const isSelected = selectedColor === color.class;
                  return (
                    <button
                      key={color.name}
                      type="button"
                      id={`color-btn-${color.name.toLowerCase()}`}
                      onClick={() => setSelectedColor(color.class)}
                      className={`h-5 w-5 rounded-full border transition-all ${color.class} ${
                        isSelected ? "ring-2 ring-offset-2 ring-stone-400 scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                      title={color.name}
                    />
                  );
                })}
              </div>

              <button
                id="create-note-submit-btn"
                type="submit"
                disabled={creating || !newBody.trim()}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                {creating ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Save Note
              </button>
            </div>
          </form>

          {/* List of Existing Notes */}
          <div className="bg-white border border-stone-100 rounded-2xl p-4 flex flex-col h-[350px]" id="keep-notes-list-panel">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5" id="notes-list-header">
              <FileText className="h-3.5 w-3.5" />
              My Saved Notes ({notes.length})
            </h3>

            {loading && notes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12" id="notes-loading-box">
                <RefreshCw className="h-7 w-7 text-amber-500 animate-spin" />
                <p className="text-xs text-stone-500 mt-2">Loading notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center" id="notes-empty-box">
                <FileText className="h-9 w-9 text-stone-200 mb-2" />
                <p className="text-xs font-semibold text-stone-700">No notes here yet</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Use the composer form above to add your first note.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1" id="notes-list-scrollable">
                {notes.map((note) => {
                  const isSelected = selectedNote?.id === note.id;
                  return (
                    <button
                      key={note.id}
                      id={`note-item-${note.id}`}
                      onClick={() => {
                        setSelectedNote(note);
                        setAiAnalysisResult(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 cursor-pointer ${
                        isSelected 
                          ? "ring-2 ring-amber-400 bg-amber-50/10 border-amber-300" 
                          : "bg-stone-50/30 border-stone-100 hover:bg-stone-50 hover:border-stone-200"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-bold text-stone-900 truncate max-w-[180px]">{note.title}</span>
                        {note.isLocal ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-mono uppercase">Cloud-Sync</span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded font-mono uppercase">Keep API</span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">{note.body}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Selected Note Action Center */}
        <div className="lg:col-span-7 bg-white border border-stone-100 rounded-2xl p-5 flex flex-col h-[560px] overflow-y-auto" id="keep-detail-panel">
          {selectedNote ? (
            <div className="space-y-5" id="keep-detail-active-view">
              {/* Note Header Details */}
              <div className="border-b border-stone-100 pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-stone-900 leading-tight">{selectedNote.title}</h2>
                      {selectedNote.isLocal && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-sm font-sans uppercase">Cloud Safe</span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1 font-mono">ID: {selectedNote.id}</p>
                  </div>
                  
                  {/* Actions bar */}
                  <div className="flex items-center gap-1.5 shrink-0" id="detail-actions-bar">
                    <button
                      id="convert-note-to-task-direct-btn"
                      onClick={() => handleConvertToTask(selectedNote)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                      title="Convert note to task"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add to Board
                    </button>
                    
                    <button
                      id="delete-note-btn"
                      onClick={() => handleDeleteNote(selectedNote.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 bg-stone-50 hover:bg-rose-50 rounded-lg border border-stone-100 transition cursor-pointer"
                      title="Delete Note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Note Body Text Display */}
              <div className={`rounded-2xl p-5 border min-h-36 max-h-56 overflow-y-auto whitespace-pre-line text-xs leading-relaxed ${selectedNote.color || "bg-stone-50/50 border-stone-100"}`} id="note-body-display">
                {selectedNote.body}
              </div>

              {/* Aegis AI Companion Section */}
              <div className="bg-stone-50/60 border border-stone-100 rounded-2xl p-4 space-y-4" id="note-ai-companion-box">
                <div className="flex items-center justify-between" id="ai-companion-header">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h4 className="text-xs font-bold text-stone-900">Aegis AI Summary Companion</h4>
                  </div>
                  
                  <button
                    id="ai-analyze-note-btn"
                    onClick={() => handleAiAnalyze(selectedNote)}
                    disabled={aiAnalyzing}
                    className="flex items-center gap-1.5 px-3 py-1.2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-bold transition cursor-pointer disabled:opacity-40"
                  >
                    {aiAnalyzing ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Analyze Note
                      </>
                    )}
                  </button>
                </div>

                {/* Analysis Result Box */}
                <AnimatePresence>
                  {aiAnalysisResult ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 bg-white border border-stone-150 rounded-xl p-3.5"
                      id="ai-result-content"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Aegis Summary:</span>
                        <p className="text-xs text-stone-700 leading-relaxed font-medium">
                          {aiAnalysisResult.summary}
                        </p>
                      </div>

                      {aiAnalysisResult.tasks && aiAnalysisResult.tasks.length > 0 && (
                        <div className="space-y-2 pt-1.5 border-t border-stone-100">
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Extracted Action Steps:</span>
                          <div className="space-y-1.5" id="ai-extracted-tasks">
                            {aiAnalysisResult.tasks.map((task, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-3 p-2 bg-stone-50 rounded-lg border border-stone-100 text-xs"
                              >
                                <span className="text-stone-700 font-medium truncate">{task}</span>
                                <button
                                  type="button"
                                  id={`add-extracted-task-${idx}`}
                                  onClick={() => handleAddExtractedTask(task)}
                                  className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer shrink-0"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add Mission
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    !aiAnalyzing && (
                      <p className="text-[11px] text-stone-500 leading-relaxed" id="ai-helper-desc-text">
                        Aegis can automatically read this note, summarize the core details in very plain everyday language, and extract actionable checklists which you can instantly add to your main Missions Board in one click.
                      </p>
                    )
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-center" id="no-note-selected-view">
              <FileText className="h-12 w-12 text-stone-200 mb-2 animate-bounce duration-1000" />
              <h4 className="text-xs font-bold text-stone-700">No note selected</h4>
              <p className="text-[11px] text-stone-400 mt-1 max-w-[240px]">Select any note from your list to read, delete, summarize, or extract actionable tasks.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
