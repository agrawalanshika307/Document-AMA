import { useState, useRef, useEffect } from "react";
import { uploadDocument } from "@/services/api";

// ── Countdown Timer ──────────────────────────────────────────────────────────
function CountdownTimer({ expiresAt, onExpired }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
  );

  useEffect(() => {
    if (remaining === 0) { onExpired(); return; }
    const id = setInterval(() => {
      setRemaining((prev) => {
        const next = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
        if (next === 0) { clearInterval(id); onExpired(); }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  let color = "#3fb950";
  let animStyle = {};
  if (remaining <= 30) {
    color = "#ef4444";
    animStyle = { animation: "timerPulse 0.7s ease-in-out infinite" };
  } else if (remaining <= 120) {
    color = "#f59e0b";
    animStyle = { animation: "timerPulse 1.5s ease-in-out infinite" };
  }

  return (
    <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: "0.72rem", fontWeight: 700,
        padding: "5px 12px", borderRadius: 99,
        border: `1px solid ${color}`,
        background: `${color}1a`,
        color,
        ...animStyle,
      }}>
        ⏱ {mm}:{ss} remaining
      </span>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar({ sessionId, onUploadSuccess, onSessionExpired }) {
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file || file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }
    setUploading(true);
    setUploadSuccess(false);
    try {
      const data = await uploadDocument(file, sessionId);
      setUploadedFileName(data.filename || file.name);
      setExpiresAt(data.expires_at);
      setUploadSuccess(true);
      onUploadSuccess(data.expires_at);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Make sure the backend is running.");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleReplace = () => {
    setUploadSuccess(false);
    setUploadedFileName("");
    setExpiresAt(null);
    onSessionExpired();
  };

  const handleTimerExpired = () => {
    setUploadSuccess(false);
    setExpiresAt(null);
    onSessionExpired();
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes checkPop { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes timerPulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }

        .sidebar-upload-btn {
          width: 100%;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1.5px dashed rgba(88,166,255,0.3);
          background: rgba(88,166,255,0.04);
          color: #58a6ff;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
        }
        .sidebar-upload-btn:hover, .sidebar-upload-btn.drag-over {
          border-color: rgba(88,166,255,0.6);
          background: rgba(88,166,255,0.1);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(88,166,255,0.15);
        }
        .sidebar-upload-btn.success {
          border-style: solid;
          border-color: rgba(63,185,80,0.4);
          background: rgba(63,185,80,0.06);
          color: #3fb950;
          cursor: default;
          transform: none;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          color: #6e7681;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
        }
        .nav-link:hover { background: rgba(255,255,255,0.04); color: #e6edf3; }
        .nav-link.active { background: rgba(88,166,255,0.1); color: #58a6ff; }
      `}</style>

      <aside style={{
        width: 260,
        height: "100vh",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10,14,20,0.8)",
        backdropFilter: "blur(20px)",
        padding: "24px 16px",
        gap: 0,
        zIndex: 10,
        overflowY: "auto",
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 32, paddingLeft: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #388bfd, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(56,139,253,0.35)"
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <line x1="10" y1="9" x2="8" y2="9"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Document AMA</div>
              <div style={{ fontSize: "0.65rem", color: "#6e7681", fontWeight: 500 }}>AI Document Assistant</div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#6e7681", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, paddingLeft: 4 }}>
            Document
          </div>
          <input type="file" accept="application/pdf" style={{ display: "none" }} ref={fileInputRef} onChange={onFileChange} />
          <div
            className={`sidebar-upload-btn ${uploadSuccess ? "success" : ""} ${dragOver ? "drag-over" : ""}`}
            onClick={() => !uploading && !uploadSuccess && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {uploading ? (
              <>
                <div style={{ width: 28, height: 28, border: "2.5px solid rgba(88,166,255,0.2)", borderTopColor: "#58a6ff", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
                <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>Uploading...</span>
                <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>Please wait</span>
              </>
            ) : uploadSuccess ? (
              <>
                <div style={{ animation: "checkPop 0.4s ease" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>Uploaded!</span>
                <span style={{ fontSize: "0.62rem", opacity: 0.7, wordBreak: "break-all", lineHeight: 1.3 }}>{uploadedFileName}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleReplace(); }}
                  style={{ marginTop: 4, fontSize: "0.65rem", color: "rgba(63,185,80,0.6)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                >
                  Replace
                </button>
              </>
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>Upload PDF</span>
                <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>or drag &amp; drop here</span>
              </>
            )}
          </div>

          {/* Countdown timer — shown only after successful upload */}
          {uploadSuccess && expiresAt && (
            <CountdownTimer expiresAt={expiresAt} onExpired={handleTimerExpired} />
          )}
        </div>

        {/* Nav Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#6e7681", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 4 }}>
            Navigation
          </div>
          <button className="nav-link active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chat
          </button>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Footer tips */}
        <div style={{ padding: "14px", background: "rgba(88,166,255,0.04)", borderRadius: "12px", border: "1px solid rgba(88,166,255,0.08)" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#58a6ff", marginBottom: 6 }}>💡 Tips</div>
          <ul style={{ margin: 0, padding: "0 0 0 14px", listStyle: "disc" }}>
            <li style={{ fontSize: "0.68rem", color: "#6e7681", marginBottom: 4, lineHeight: 1.4 }}>Upload a PDF to start asking questions</li>
            <li style={{ fontSize: "0.68rem", color: "#6e7681", marginBottom: 4, lineHeight: 1.4 }}>Documents auto-expire after 10 minutes — re-upload to refresh</li>
            <li style={{ fontSize: "0.68rem", color: "#6e7681", lineHeight: 1.4 }}>Ask in plain English — no technical jargon needed</li>
          </ul>
        </div>
      </aside>
    </>
  );
}
