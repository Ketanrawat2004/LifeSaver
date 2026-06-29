import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mail, 
  Send, 
  Plus, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft, 
  Clock, 
  User, 
  CornerUpLeft, 
  Inbox,
  PenTool
} from "lucide-react";
import { getCachedGmailToken, setCachedGmailToken } from "../utils/gmailAuthStore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";

interface GmailMessage {
  id: string;
  threadId: string;
}

interface ParsedEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body: string;
}

interface GmailViewProps {
  onAddTask: (t: { title: string; priority: "critical" | "high" | "medium" | "low"; duration: number; energy: "high" | "medium" | "low" }) => void;
  currentUser: any;
}

export default function GmailView({ onAddTask, currentUser }: GmailViewProps) {
  const [token, setToken] = useState<string | null>(getCachedGmailToken());
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<ParsedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<ParsedEmail | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Compose email / reply form
  const [replyPrompt, setReplyPrompt] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [aiDrafting, setAiDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Authenticate Google to get Access Token for Gmail
  const handleConnectGmail = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Add required Gmail scopes
      provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
      provider.addScope("https://www.googleapis.com/auth/gmail.send");
      provider.addScope("https://www.googleapis.com/auth/gmail.modify");
      provider.addScope("https://www.googleapis.com/auth/gmail.compose");
      provider.addScope("https://www.googleapis.com/auth/gmail.labels");

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || null;

      if (!accessToken) {
        throw new Error("Failed to get Google Access Token. Please try again.");
      }

      setCachedGmailToken(accessToken);
      setToken(accessToken);
    } catch (err: any) {
      console.error("Gmail Connection Error:", err);
      setError(err.message || "Could not connect to Gmail. Make sure to allow permissions.");
    } finally {
      setLoading(false);
    }
  };

  // Base64 decoder with UTF-8 support
  const decodeBase64 = (str: string) => {
    try {
      const cleaned = str.replace(/-/g, "+").replace(/_/g, "/");
      return decodeURIComponent(
        atob(cleaned)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    } catch (e) {
      return str;
    }
  };

  // Fetch emails from Gmail API
  const fetchEmails = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch list of latest primary messages
      const res = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=category:primary",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired or invalid
          setCachedGmailToken(null);
          setToken(null);
          throw new Error("Login expired. Please connect to Gmail again.");
        }
        throw new Error("Could not load emails. Please check your network.");
      }

      const data = await res.json();
      const messageList: GmailMessage[] = data.messages || [];

      if (messageList.length === 0) {
        setEmails([]);
        setLoading(false);
        return;
      }

      // 2. Fetch details for each message in parallel
      const detailedEmails = await Promise.all(
        messageList.map(async (msg) => {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (!detailRes.ok) return null;
          const detail = await detailRes.json();

          // Extract headers
          const headers = detail.payload?.headers || [];
          const subject = headers.find((h: any) => h.name?.toLowerCase() === "subject")?.value || "No Subject";
          const from = headers.find((h: any) => h.name?.toLowerCase() === "from")?.value || "Unknown";
          const date = headers.find((h: any) => h.name?.toLowerCase() === "date")?.value || "";

          // Extract email body safely
          let body = "";
          if (detail.payload?.parts) {
            const textPart = detail.payload.parts.find((part: any) => part.mimeType === "text/plain");
            if (textPart?.body?.data) {
              body = decodeBase64(textPart.body.data);
            } else {
              // fallback check nested parts
              const nestedPart = detail.payload.parts[0]?.parts?.find((part: any) => part.mimeType === "text/plain");
              if (nestedPart?.body?.data) {
                body = decodeBase64(nestedPart.body.data);
              }
            }
          } else if (detail.payload?.body?.data) {
            body = decodeBase64(detail.payload.body.data);
          }

          return {
            id: detail.id,
            subject,
            from,
            date: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
            snippet: detail.snippet || "",
            body: body || detail.snippet || "No text content.",
          };
        })
      );

      const parsedList = detailedEmails.filter((email): email is ParsedEmail => email !== null);
      setEmails(parsedList);

      if (parsedList.length > 0 && !selectedEmail) {
        setSelectedEmail(parsedList[0]);
      }
    } catch (err: any) {
      console.error("Fetch Emails Error:", err);
      setError(err.message || "Failed to fetch emails.");
    } finally {
      setLoading(false);
    }
  };

  // Run on mount or when token changes
  useEffect(() => {
    if (token) {
      fetchEmails();
    }
  }, [token]);

  // Turn email into a Task automatically
  const handleConvertToTask = (email: ParsedEmail) => {
    onAddTask({
      title: `Email: ${email.subject} (from ${email.from.split("<")[0].trim()})`,
      priority: "high",
      duration: 25,
      energy: "medium",
    });
    setSuccessMsg("Task successfully added to your Board!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // AI-Powered Simple English Draft Generator
  const handleGenerateAIDraft = async () => {
    if (!replyPrompt.trim() || !selectedEmail) return;
    setAiDrafting(true);
    setError(null);
    try {
      const res = await fetch("/api/email-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalEmail: selectedEmail.body,
          replyPrompt: replyPrompt,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate AI response draft.");
      }

      const data = await res.json();
      setDraftSubject(data.subject || `Re: ${selectedEmail.subject}`);
      setDraftBody(data.body || "");
      
      // Extract clean email for reply
      const emailMatch = selectedEmail.from.match(/<([^>]+)>/);
      const replyToEmail = emailMatch ? emailMatch[1] : selectedEmail.from;
      setDraftTo(replyToEmail);
    } catch (err: any) {
      console.error("AI draft generation error:", err);
      setError("Could not generate AI draft. Please try again.");
    } finally {
      setAiDrafting(false);
    }
  };

  // Helper to base64url encode full email
  const encodeEmailBody = (to: string, subject: string, messageText: string) => {
    const emailHeaders = [
      `To: ${to}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'Content-Type: text/plain; charset="utf-8"',
      'MIME-Version: 1.0',
      '',
      messageText,
    ].join('\r\n');
    
    return btoa(unescape(encodeURIComponent(emailHeaders)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  // Send Email via Gmail API
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !draftTo || !draftBody) return;

    const confirmed = window.confirm(
      `Do you want to send this email to ${draftTo}?`
    );
    if (!confirmed) return;

    setSending(true);
    setError(null);
    try {
      const rawEmail = encodeEmailBody(draftTo, draftSubject, draftBody);
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: rawEmail }),
      });

      if (!res.ok) {
        throw new Error("Could not send email. Please check coordinates and permissions.");
      }

      setSuccessMsg("Email successfully sent!");
      setDraftSubject("");
      setDraftBody("");
      setDraftTo("");
      setReplyPrompt("");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error("Send Email Error:", err);
      setError(err.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  // Standard interactive components MUST have IDs
  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6" id="gmail-integration-container">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5" id="gmail-header-area">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 flex items-center gap-2" id="gmail-view-title">
            <Mail className="h-6 w-6 text-amber-500" />
            My Gmail Workspace
          </h1>
          <p className="text-xs text-stone-500 mt-1" id="gmail-view-desc">
            Read your latest emails, convert them into tasks, and draft simple plain-English replies with AI help.
          </p>
        </div>
        {token && (
          <button
            id="refresh-emails-button"
            onClick={fetchEmails}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Inbox
          </button>
        )}
      </div>

      {/* Success & Error Indicators */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800"
            id="success-alert-container"
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
            className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-center gap-2 text-xs text-rose-800"
            id="error-alert-container"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection State */}
      {!token ? (
        <div className="bg-[#FAF9F6] border border-[#2D312E]/10 rounded-2xl p-8 text-center max-w-md mx-auto my-12 shadow-sm" id="gmail-auth-promo-box">
          <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-stone-950" id="gmail-auth-title">Connect your Gmail account</h2>
          <p className="text-xs text-stone-500 mt-2 mb-6 leading-relaxed">
            Link your Google Account securely to read your primary emails, create daily tasks from emails in one click, and send fast simple replies.
          </p>
          <button
            id="connect-gmail-oauth-button"
            onClick={handleConnectGmail}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Connect Gmail Account
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="gmail-workspace-grid">
          {/* Left Panel: Email Inbox List */}
          <div className="lg:col-span-5 bg-white border border-stone-100 rounded-2xl p-4 flex flex-col h-[600px]" id="gmail-inbox-panel">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5" id="inbox-list-header">
              <Inbox className="h-3.5 w-3.5" />
              Primary Messages
            </h3>

            {loading && emails.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12" id="inbox-loading-box">
                <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
                <p className="text-xs text-stone-500 mt-2">Loading your email list...</p>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center" id="inbox-empty-box">
                <Mail className="h-10 w-10 text-stone-300 mb-2" />
                <p className="text-xs font-bold text-stone-700">No emails found</p>
                <p className="text-[11px] text-stone-400 mt-1 max-w-[200px]">Your primary inbox is clean and free!</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1" id="inbox-list-scrollable">
                {emails.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;
                  return (
                    <button
                      key={email.id}
                      id={`email-item-${email.id}`}
                      onClick={() => {
                        setSelectedEmail(email);
                        // Clear draft forms when switching
                        setDraftTo("");
                        setDraftSubject("");
                        setDraftBody("");
                        setReplyPrompt("");
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1 cursor-pointer ${
                        isSelected 
                          ? "bg-amber-50/50 border-amber-300/40" 
                          : "bg-stone-50/40 border-stone-100 hover:bg-stone-50 hover:border-stone-200"
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className="text-xs font-bold text-stone-900 truncate max-w-[160px]">{email.from.split("<")[0].replace(/"/g, "")}</span>
                        <span className="text-[10px] text-stone-400 shrink-0 font-mono">{email.date}</span>
                      </div>
                      <span className="text-xs font-medium text-stone-800 line-clamp-1">{email.subject}</span>
                      <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed mt-0.5">{email.snippet}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Selected Email Actions & Composer */}
          <div className="lg:col-span-7 bg-white border border-stone-100 rounded-2xl p-4 flex flex-col h-[600px] overflow-y-auto" id="gmail-detail-panel">
            {selectedEmail ? (
              <div className="space-y-5" id="gmail-detail-active-view">
                {/* Header Information */}
                <div className="border-b border-stone-100 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-stone-900 leading-tight">{selectedEmail.subject}</h2>
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-stone-600">
                        <User className="h-3 w-3 text-stone-400" />
                        <span className="font-semibold">{selectedEmail.from}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono shrink-0">{selectedEmail.date}</span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2 mt-4" id="email-detail-quick-actions">
                    <button
                      id="convert-email-to-task-button"
                      onClick={() => handleConvertToTask(selectedEmail)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add as Task
                    </button>
                    <button
                      id="scroll-to-reply-prompt-button"
                      onClick={() => {
                        const emailMatch = selectedEmail.from.match(/<([^>]+)>/);
                        setDraftTo(emailMatch ? emailMatch[1] : selectedEmail.from);
                        setDraftSubject(`Re: ${selectedEmail.subject}`);
                        document.getElementById("ai-reply-assistant-card")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5" />
                      Reply
                    </button>
                  </div>
                </div>

                {/* Email content body */}
                <div className="bg-stone-50/50 border border-stone-100 rounded-xl p-4 text-xs text-stone-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line" id="email-body-box">
                  {selectedEmail.body}
                </div>

                {/* Reply assistant section */}
                <div className="bg-amber-50/20 border border-amber-100 rounded-xl p-4 space-y-3" id="ai-reply-assistant-card">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h4 className="text-xs font-bold text-stone-900">AI Simple Response Helper</h4>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-normal">
                    Describe what you want to reply. AI will write a nice, simple-to-read response using easy everyday words.
                  </p>

                  <div className="flex gap-1.5">
                    <input
                      id="reply-instruction-input"
                      type="text"
                      placeholder="e.g. Say yes politely, ask for tomorrow, or say thank you"
                      value={replyPrompt}
                      onChange={(e) => setReplyPrompt(e.target.value)}
                      className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-amber-500"
                    />
                    <button
                      id="generate-reply-button"
                      onClick={handleGenerateAIDraft}
                      disabled={aiDrafting || !replyPrompt.trim()}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium transition flex items-center gap-1 shrink-0 disabled:opacity-40 cursor-pointer"
                    >
                      {aiDrafting ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Draft Reply
                    </button>
                  </div>
                </div>

                {/* Response Composer Form */}
                <form onSubmit={handleSendEmail} className="space-y-3 border-t border-stone-100 pt-4" id="gmail-composer-form">
                  <div className="flex items-center gap-1.5">
                    <PenTool className="h-4 w-4 text-stone-400" />
                    <h4 className="text-xs font-bold text-stone-900">Email Composer</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase">To:</label>
                      <input
                        id="email-composer-to-input"
                        type="email"
                        required
                        value={draftTo}
                        onChange={(e) => setDraftTo(e.target.value)}
                        placeholder="recipient@example.com"
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Subject:</label>
                      <input
                        id="email-composer-subject-input"
                        type="text"
                        required
                        value={draftSubject}
                        onChange={(e) => setDraftSubject(e.target.value)}
                        placeholder="Email subject"
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Message:</label>
                    <textarea
                      id="email-composer-body-input"
                      rows={5}
                      required
                      value={draftBody}
                      onChange={(e) => setDraftBody(e.target.value)}
                      placeholder="Write your email reply here..."
                      className="w-full bg-white border border-stone-200 rounded-lg p-3 text-xs outline-none focus:border-amber-500 resize-none font-sans leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      id="send-email-submit-button"
                      type="submit"
                      disabled={sending || !draftTo || !draftBody}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {sending ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          Send Email
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-center" id="no-email-selected-view">
                <Mail className="h-12 w-12 text-stone-200 mb-2 animate-bounce duration-1000" />
                <h4 className="text-xs font-bold text-stone-700">No message selected</h4>
                <p className="text-[11px] text-stone-400 mt-1 max-w-[240px]">Select any email from your inbox to view, turn into tasks, or generate AI replies.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
