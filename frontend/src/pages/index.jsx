import { useState, useRef, useEffect } from "react";
import Layout from "@/features/layout/Layout.jsx";
import { queryDocument } from "@/services/api";

export default function ChatPage() {
  // ── Session ID — persisted in sessionStorage (survives refresh, cleared on tab close) ──
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    let existing = sessionStorage.getItem("ama_session_id");
    if (!existing) {
      existing = typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      sessionStorage.setItem("ama_session_id", existing);
    }
    setSessionId(existing);
  }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [docUploaded, setDocUploaded] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loadingPhraseIdx, setLoadingPhraseIdx] = useState(0);
  const [copied, setCopied] = useState(null);

  const loadingPhrases = [
    "Reading your document...",
    "Understanding the context...",
    "Looking for the answer...",
    "Found it! Composing response...",
  ];

  const chatEndRef = useRef(null);
  const lastAiMsgRef = useRef(null);
  const inputRef = useRef(null);

  // ── Session callbacks (passed to Layout → Sidebar) ─────────────────────────
  const handleUploadSuccess = (expiresAtISO) => {
    setDocUploaded(true);
    setSessionExpired(false);
    setExpiresAt(expiresAtISO);
    setMessages([]);
  };

  const handleSessionExpired = () => {
    setDocUploaded(false);
    setSessionExpired(true);
    setExpiresAt(null);
    setMessages([]);
  };

  // ── Loading phrase cycling ─────────────────────────────────────────────────
  useEffect(() => {
    if (aiLoading) {
      const interval = setInterval(() => {
        setLoadingPhraseIdx((prev) => (prev + 1) % loadingPhrases.length);
      }, 1400);
      return () => clearInterval(interval);
    } else {
      setLoadingPhraseIdx(0);
    }
  }, [aiLoading]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (aiLoading) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (messages.length > 0 && messages[messages.length - 1]?.role === "ai") {
      lastAiMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages, aiLoading]);

  // ── Chat handlers ──────────────────────────────────────────────────────────
  const handleAIMessage = async (message) => {
    if (!message.trim() || aiLoading || !docUploaded) return;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setAiLoading(true);
    try {
      const res = await queryDocument(message, sessionId);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: res.result, cached: res.cached },
      ]);
    } catch (err) {
      if (err?.response?.status === 404) {
        handleSessionExpired();
        setMessages((prev) => [
          ...prev,
          { role: "error", content: "Your session has expired. Please upload your document again." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "error", content: err.message || "Failed to get a response." },
        ]);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || aiLoading || !docUploaded) return;
    handleAIMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const copyMessage = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  // ── Markdown renderer ──────────────────────────────────────────────────────
  const renderMarkdown = (text) => {
    if (!text) return "";
    return text
      .replace(/```(\w*)\s*\n([\s\S]*?)```/g, (_, _lang, code) =>
        `<pre style="background:rgba(0,0,0,0.3);padding:16px;border-radius:10px;overflow-x:auto;border:1px solid rgba(255,255,255,0.07);font-size:0.78rem;line-height:1.6;margin:14px 0;font-family:'Fira Code',monospace"><code>${code.replace(/</g, "&lt;")}</code></pre>`)
      .replace(/`([^`]+)`/g, '<code style="background:rgba(88,166,255,0.1);padding:2px 6px;border-radius:5px;font-size:0.82em;color:#79c0ff;font-family:monospace">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f0f6ff;font-weight:700">$1</strong>')
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^### (.+)$/gm, '<h4 style="color:#bc8cff;font-size:0.88rem;margin:18px 0 8px;font-weight:700;letter-spacing:-0.01em">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="color:#58a6ff;font-size:1rem;margin:22px 0 10px;font-weight:700">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 style="color:#fff;font-size:1.2rem;margin:24px 0 12px;font-weight:800">$1</h2>')
      .replace(/^\d+\.\s+(.+)$/gm, '<li style="margin:5px 0;padding-left:8px;font-size:0.85rem">$1</li>')
      .replace(/^[-*]\s+(.+)$/gm, '<li style="margin:5px 0;padding-left:8px;list-style:disc;font-size:0.85rem">$1</li>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#58a6ff;text-decoration:none;border-bottom:1px solid rgba(88,166,255,0.3);font-weight:600">$1</a>')
      .replace(/\n\n/g, '<div style="height:10px"></div>')
      .replace(/\n/g, "<br/>");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout
      sessionId={sessionId}
      onUploadSuccess={handleUploadSuccess}
      onSessionExpired={handleSessionExpired}
    >
      <style>{`
        @keyframes fadeInMsg { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100% { transform: scale(1); opacity:1; } 50% { transform: scale(1.4); opacity:0.5; } }
        @keyframes phraseIn { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: translateY(0); } }
        @keyframes glowPulse { 0%,100% { box-shadow: 0 0 0 rgba(88,166,255,0); } 50% { box-shadow: 0 0 24px rgba(88,166,255,0.12); } }

        .chat-msg { animation: fadeInMsg 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .loading-phrase { animation: phraseIn 0.3s ease both; }

        .send-btn {
          width: 40px; height: 40px; border-radius: 10px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #388bfd, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease; flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(56,139,253,0.3);
        }
        .send-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(56,139,253,0.4); }
        .send-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }

        .chat-input {
          width: 100%; padding: 12px 16px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
          border-radius: 12px; color: #e6edf3; font-size: 0.875rem; font-family: inherit;
          outline: none; box-sizing: border-box; resize: none; line-height: 1.5;
          transition: border-color 0.2s ease, background 0.2s ease;
          display: block;
        }
        .chat-input:focus { border-color: rgba(88,166,255,0.4); background: rgba(255,255,255,0.06); }
        .chat-input:disabled { opacity: 0.4; cursor: not-allowed; }
        .chat-input::placeholder { color: #6e7681; }

        .copy-btn {
          padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.04); color: #6e7681; cursor: pointer; font-size: 0.65rem;
          font-weight: 600; transition: all 0.15s ease; display: flex; align-items: center; gap: 4px;
        }
        .copy-btn:hover { background: rgba(255,255,255,0.08); color: #e6edf3; border-color: rgba(255,255,255,0.12); }
        .copy-btn.copied { background: rgba(63,185,80,0.1); border-color: rgba(63,185,80,0.2); color: #3fb950; }
      `}</style>

      {/* Top Bar */}
      <div style={{
        flexShrink: 0, padding: "16px 28px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(8,12,20,0.6)", backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #388bfd22, #7c3aed22)",
            border: "1px solid rgba(88,166,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Ask your Document</div>
            <div style={{ fontSize: "0.72rem", color: docUploaded ? "#3fb950" : sessionExpired ? "#ef4444" : "#6e7681", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
              {docUploaded && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#3fb950", animation: "pulse-dot 2s ease-in-out infinite" }} />}
              {sessionExpired && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444" }} />}
              {docUploaded ? "Document loaded • Ready" : sessionExpired ? "Session expired" : "No document uploaded"}
            </div>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 8px", display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>

        {/* Empty state — no doc, not expired */}
        {!docUploaded && !sessionExpired && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, animation: "fadeInMsg 0.5s ease" }}>
            <div style={{
              width: 80, height: 80, borderRadius: 22,
              background: "linear-gradient(135deg, rgba(56,139,253,0.12), rgba(124,58,237,0.12))",
              border: "1.5px dashed rgba(88,166,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "glowPulse 3s ease-in-out infinite",
            }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(88,166,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ margin: "0 0 10px", fontSize: "1.5rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.04em" }}>
                Upload a document<br/>to get started
              </h2>
              <p style={{ margin: 0, color: "#6e7681", fontSize: "0.9rem", maxWidth: 320, lineHeight: 1.6 }}>
                Click the <strong style={{ color: "#58a6ff" }}>Upload PDF</strong> button in the left sidebar. Once processed, you can ask any question about its contents.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", maxWidth: 400 }}>
              {["What is the main topic?", "Summarize for me", "Key findings?", "Any dates mentioned?"].map((q) => (
                <div key={q} style={{ padding: "7px 14px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 600, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#8b949e" }}>
                  {q}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state — doc loaded, no messages yet */}
        {docUploaded && messages.length === 0 && !aiLoading && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: "linear-gradient(135deg, rgba(63,185,80,0.15), rgba(56,139,253,0.1))",
              border: "1px solid rgba(63,185,80,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: "1.3rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Document ready!</h2>
              <p style={{ margin: 0, color: "#6e7681", fontSize: "0.88rem" }}>Your document is loaded. Ask anything about it below.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 440 }}>
              {["What is this document about?", "Give me a summary", "List the key points", "Any important numbers?"].map((q) => (
                <button
                  key={q}
                  onClick={() => handleAIMessage(q)}
                  style={{
                    padding: "8px 16px", borderRadius: 99, fontSize: "0.78rem", fontWeight: 600,
                    background: "rgba(88,166,255,0.06)", border: "1px solid rgba(88,166,255,0.15)",
                    color: "#79c0ff", cursor: "pointer", transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { e.target.style.background = "rgba(88,166,255,0.12)"; e.target.style.borderColor = "rgba(88,166,255,0.3)"; }}
                  onMouseLeave={(e) => { e.target.style.background = "rgba(88,166,255,0.06)"; e.target.style.borderColor = "rgba(88,166,255,0.15)"; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => {
          const isLastAi = msg.role === "ai" && i === messages.length - 1;
          return (
            <div key={i} className="chat-msg" ref={isLastAi ? lastAiMsgRef : null}
              style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>

              {msg.role !== "user" && (
                <div style={{ width: 30, height: 30, borderRadius: 8, background: msg.role === "error" ? "rgba(248,81,73,0.15)" : "linear-gradient(135deg, #388bfd, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10, marginTop: 2 }}>
                  {msg.role === "error" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f85149" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  )}
                </div>
              )}

              <div style={{ maxWidth: msg.role === "user" ? "70%" : "82%" }}>
                {msg.role === "ai" && (
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#6e7681", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                    AI Response
                    {msg.cached && (
                      <span style={{
                        fontSize: "0.6rem", fontWeight: 700,
                        padding: "2px 7px", borderRadius: 99,
                        background: "rgba(245,158,11,0.12)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        color: "#f59e0b", letterSpacing: "0.04em",
                      }}>
                        ⚡ Cached
                      </span>
                    )}
                  </div>
                )}
                <div style={{
                  padding: msg.role === "user" ? "11px 16px" : "16px 20px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, #388bfd, #7c3aed)"
                    : msg.role === "error"
                    ? "rgba(248,81,73,0.08)"
                    : "rgba(255,255,255,0.03)",
                  border: msg.role === "error"
                    ? "1px solid rgba(248,81,73,0.2)"
                    : msg.role === "ai"
                    ? "1px solid rgba(255,255,255,0.07)"
                    : "none",
                  color: msg.role === "user" ? "#fff" : msg.role === "error" ? "#f85149" : "#d1d9e6",
                  fontSize: "0.875rem",
                  lineHeight: 1.7,
                  boxShadow: msg.role === "user" ? "0 4px 20px rgba(56,139,253,0.25)" : "none",
                }}>
                  {msg.role === "user" ? (
                    <span>{msg.content}</span>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  )}
                </div>
                {msg.role === "ai" && (
                  <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                    <button className={`copy-btn ${copied === i ? "copied" : ""}`} onClick={() => copyMessage(msg.content, i)}>
                      {copied === i ? (
                        <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied</>
                      ) : (
                        <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading indicator */}
        {aiLoading && (
          <div className="chat-msg" style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #388bfd, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10, marginTop: 2 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div style={{ padding: "14px 18px", borderRadius: "4px 16px 16px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((d) => (
                    <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "#388bfd", animation: `pulse-dot 1.2s ease-in-out infinite`, animationDelay: `${d * 0.2}s` }} />
                  ))}
                </div>
                <span key={loadingPhraseIdx} className="loading-phrase" style={{ color: "#8b949e", fontSize: "0.82rem", fontWeight: 500 }}>
                  {loadingPhrases[loadingPhraseIdx]}
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Session expired banner */}
      {sessionExpired && (
        <div style={{
          flexShrink: 0, margin: "0 28px 8px",
          padding: "14px 20px", borderRadius: 12,
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)",
          color: "#f87171", fontSize: "0.82rem", fontWeight: 600,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          ⚠️ Your session has expired. Upload your document again to continue.
        </div>
      )}

      {/* Input bar */}
      <div style={{
        flexShrink: 0, padding: "16px 28px 24px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(8,12,20,0.5)", backdropFilter: "blur(12px)",
      }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                sessionExpired
                  ? "Session expired — upload a new document to continue..."
                  : docUploaded
                  ? "Ask a question about the document... (Enter to send)"
                  : "Upload a document first to start chatting..."
              }
              disabled={aiLoading || !docUploaded || sessionExpired}
              rows={1}
              className="chat-input"
            />
          </div>
          <button
            type="submit"
            disabled={aiLoading || !input.trim() || !docUploaded || sessionExpired}
            className="send-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
        <div style={{ marginTop: 8, fontSize: "0.65rem", color: "#6e7681", textAlign: "center" }}>
          AI responses are based solely on the uploaded document · Session expires 10 min after upload
        </div>
      </div>
    </Layout>
  );
}
