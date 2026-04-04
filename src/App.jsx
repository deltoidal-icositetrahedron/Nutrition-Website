import { useState } from "react";

export default function App() {
  const [query, setQuery] = useState("");

  return (
    <div style={{ background: "#fff", minHeight: "100vh", display: "flex", justifyContent: "center", paddingTop: 80, fontFamily: "arial, sans-serif" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", maxWidth: 560, height: 44,
        border: "1px solid #dfe1e5", borderRadius: 24, padding: "0 16px",
        boxShadow: query ? "0 1px 6px rgba(32,33,36,.28)" : "none",
        transition: "box-shadow 0.2s"
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ border: "none", outline: "none", fontSize: 16, width: "100%", color: "#202124" }}
          autoComplete="off"
          spellCheck="false"
        />
      </div>
    </div>
  );
}
