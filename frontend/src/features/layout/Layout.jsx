import Sidebar from "./Sidebar.jsx";

export default function Layout({ children, sessionId, onUploadSuccess, onSessionExpired }) {
  return (
    <div style={{
      display: "flex",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      background: "#080c14",
      position: "relative",
    }}>
      {/* Ambient background glows */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `
          radial-gradient(ellipse 80% 50% at 20% 50%, rgba(88,166,255,0.05) 0%, transparent 60%),
          radial-gradient(ellipse 60% 60% at 80% 20%, rgba(188,140,255,0.04) 0%, transparent 50%),
          radial-gradient(ellipse 50% 50% at 60% 80%, rgba(56,139,253,0.03) 0%, transparent 40%)
        `
      }} />

      <Sidebar
        sessionId={sessionId}
        onUploadSuccess={onUploadSuccess}
        onSessionExpired={onSessionExpired}
      />

      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
      }}>
        {children}
      </main>
    </div>
  );
}
