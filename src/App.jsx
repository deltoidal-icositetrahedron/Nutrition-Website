import { useState, useRef } from "react";

const dangerColor = { high: "#ff4d4d", medium: "#ff9800", low: "#ffd600" };
const dangerLabel = { high: "HIGH RISK", medium: "MODERATE", low: "LOW RISK" };
const suggestions = ["apple", "salmon", "oat milk", "white rice", "dark chocolate"];

export default function App() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("benefits");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const analyzeFood = async (overrideQuery) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    setLoading(true);
    setResult(null);
    setNotFound(false);
    setError("");

    const prompt = `Analyze the food: "${q}".

If this is not a real food or drink, respond with exactly: NOT_FOOD

Otherwise respond ONLY with a valid JSON object — no markdown, no backticks, no explanation — in this exact format:
{
  "name": "Full food name",
  "emoji": "single relevant emoji",
  "category": "category e.g. Fruit / Dairy / Grain / Fish / Processed",
  "summary": "2 sentence overview of this food",
  "benefits": [
    {"title": "Benefit name", "desc": "1-2 sentence explanation"},
    {"title": "Benefit name", "desc": "1-2 sentence explanation"},
    {"title": "Benefit name", "desc": "1-2 sentence explanation"},
    {"title": "Benefit name", "desc": "1-2 sentence explanation"}
  ],
  "risks": [
    {"title": "Risk name", "desc": "1-2 sentence explanation"},
    {"title": "Risk name", "desc": "1-2 sentence explanation"},
    {"title": "Risk name", "desc": "1-2 sentence explanation"}
  ],
  "chemicals": [
    {"name": "Chemical or compound name", "danger": "high", "desc": "What it is and why it matters"},
    {"name": "Chemical or compound name", "danger": "medium", "desc": "What it is and why it matters"},
    {"name": "Chemical or compound name", "danger": "low", "desc": "What it is and why it matters"}
  ],
  "nutrition": {
    "calories": "Xkcal",
    "carbs": "Xg",
    "fiber": "Xg",
    "sugar": "Xg",
    "protein": "Xg",
    "fat": "Xg"
  }
}`;

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message || "API error");
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      console.log("Gemini raw response:", text);

      if (!text) {
        setNotFound(true);
        return;
      }

      if (text.trim() === "NOT_FOOD") {
        setNotFound(true);
        return;
      }

      // Robustly extract JSON — ignore anything before { and after }
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");

      if (firstBrace === -1 || lastBrace === -1) {
        setNotFound(true);
        return;
      }

      const cleaned = text.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(cleaned);
      setResult(parsed);
      setActiveTab("benefits");
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Could not parse response. Please try again.");
      } else {
        setError(err.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (s) => {
    setQuery(s);
    analyzeFood(s);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0d0d0d;
          --surface: #141414;
          --border: #2a2a2a;
          --text: #e8e6e1;
          --muted: #888;
          --accent: #c8f064;
        }

        body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

        @keyframes rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(200,240,100,0); }
          50% { box-shadow: 0 0 24px 4px rgba(200,240,100,0.12); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .result-enter { animation: fade-in 0.5s ease forwards; }

        .stagger > * { opacity: 0; animation: rise 0.45s ease forwards; }
        .stagger > *:nth-child(1) { animation-delay: 0.04s; }
        .stagger > *:nth-child(2) { animation-delay: 0.10s; }
        .stagger > *:nth-child(3) { animation-delay: 0.16s; }
        .stagger > *:nth-child(4) { animation-delay: 0.22s; }

        .scan-line {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px);
          pointer-events: none; z-index: 9999;
        }

        .search-bar:focus-within {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 1px var(--accent), 0 0 30px rgba(200,240,100,0.08) !important;
          animation: pulse-glow 2.5s ease-in-out infinite;
        }

        .tab {
          background: none; border: none;
          font-family: 'DM Mono', monospace; font-size: 12px;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--muted); cursor: pointer;
          padding: 10px 18px; border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .tab:hover { color: var(--text); }
        .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

        .card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 6px; padding: 22px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .card:hover { border-color: #3a3a3a; transform: translateY(-2px); }

        .chem-badge {
          display: inline-block; font-family: 'DM Mono', monospace;
          font-size: 10px; letter-spacing: 0.08em;
          padding: 3px 8px; border-radius: 3px; font-weight: 500;
        }

        .suggest-chip {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 4px; padding: 5px 14px; font-size: 13px;
          color: var(--muted); cursor: pointer;
          font-family: 'DM Mono', monospace; transition: all 0.2s;
        }
        .suggest-chip:hover { border-color: var(--accent); color: var(--accent); background: rgba(200,240,100,0.05); }

        .analyze-btn {
          background: var(--accent); color: #0d0d0d; border: none;
          padding: 12px 28px; border-radius: 4px; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 13px;
          letter-spacing: 0.08em; font-weight: 500;
          transition: all 0.2s; white-space: nowrap; min-width: 130px;
          display: flex; align-items: center; justify-content: center;
        }
        .analyze-btn:hover:not(:disabled) { background: #d4f57a; transform: scale(1.03); box-shadow: 0 0 20px rgba(200,240,100,0.3); }
        .analyze-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .spinner {
          width: 16px; height: 16px; border: 2px solid #0d0d0d;
          border-top-color: transparent; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .float-emoji { display: inline-block; animation: float 3s ease-in-out infinite; }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      <div className="scan-line" />

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(13,13,13,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)", padding: "14px 40px", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, letterSpacing: "0.15em", color: "var(--accent)", textTransform: "uppercase" }}>NutriLex</span>
        <span style={{ color: "#333", fontSize: 12 }}>//</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#444", letterSpacing: "0.1em" }}>AI-powered food intelligence</span>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 32px 60px" }}>

        {/* Hero */}
        <div style={{ marginBottom: 60, animation: "fade-in 0.6s ease forwards" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 20 }}>— nutritional intelligence database</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.8rem, 6vw, 5rem)", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.02em", background: "linear-gradient(135deg, #e8e6e1 0%, #666 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Know what<br />you <span style={{ WebkitTextFillColor: "var(--accent)" }}>consume.</span>
          </h1>
          <p style={{ marginTop: 24, fontSize: 16, color: "var(--muted)", lineHeight: 1.7, maxWidth: 520, fontWeight: 300 }}>
            Type any food or drink. Our AI will break down its benefits, health risks, and the lesser-known chemicals rarely mentioned on labels.
          </p>
        </div>

        {/* Search */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, animation: "fade-in 0.6s 0.1s ease both" }}>
          <div className="search-bar" style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 20px", height: 52, transition: "border-color 0.3s, box-shadow 0.3s" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyzeFood()}
              placeholder="Type any food or drink..."
              style={{ background: "none", border: "none", outline: "none", fontSize: 15, width: "100%", color: "var(--text)", fontFamily: "'DM Sans', sans-serif" }}
            />
            {query && (
              <button onClick={() => { setQuery(""); setResult(null); setNotFound(false); setError(""); }} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>×</button>
            )}
          </div>
          <button className="analyze-btn" onClick={() => analyzeFood()} disabled={loading || !query.trim()}>
            {loading ? <span className="spinner" /> : "ANALYZE"}
          </button>
        </div>

        {/* Suggestions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 60, animation: "fade-in 0.6s 0.2s ease both" }}>
          <span style={{ fontSize: 12, color: "#444", fontFamily: "monospace", lineHeight: "30px", marginRight: 4 }}>try:</span>
          {suggestions.map(s => (
            <button key={s} className="suggest-chip" onClick={() => handleSuggestion(s)}>{s}</button>
          ))}
        </div>

        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--border), transparent)", marginBottom: 40 }} />

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "70px 0", animation: "fade-in 0.3s ease" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#444", letterSpacing: "0.15em", marginBottom: 20 }}>ANALYZING "{query.toUpperCase()}"</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", animation: `rise 0.6s ease-in-out ${i * 0.12}s infinite alternate` }} />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ background: "#1a0a0a", border: "1px solid #3a1a1a", borderRadius: 6, padding: "16px 20px", color: "#ff6b6b", fontFamily: "'DM Mono', monospace", fontSize: 13, animation: "fade-in 0.3s ease" }}>
            ⚠ {error}
          </div>
        )}

        {/* Not Found */}
        {notFound && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", animation: "fade-in 0.4s ease" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>◌</div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13 }}>No data found for "{query}"</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>Try a different food or check your spelling.</p>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="result-enter" key={result.name}>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 32 }}>
              <div style={{ fontSize: 60, lineHeight: 1 }} className="float-emoji">{result.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>{result.category}</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", fontWeight: 700, marginBottom: 10 }}>{result.name}</h2>
                <p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: 15, maxWidth: 600 }}>{result.summary}</p>
              </div>
            </div>

            {/* Nutrition Bar */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "16px 24px", marginBottom: 32, display: "flex", gap: 32, flexWrap: "wrap" }}>
              {Object.entries(result.nutrition).map(([k, v]) => (
                <div key={k} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: "var(--accent)", fontWeight: 500 }}>{v}</div>
                  <div style={{ fontSize: 11, color: "#555", fontFamily: "monospace", textTransform: "uppercase", marginTop: 2 }}>{k}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ borderBottom: "1px solid var(--border)", display: "flex", marginBottom: 28 }}>
              {["benefits", "risks", "chemicals"].map(tab => (
                <button key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                  {tab}{tab === "chemicals" && <span style={{ marginLeft: 6, color: "#ff4d4d", fontSize: 9 }}>⚠</span>}
                </button>
              ))}
            </div>

            {activeTab === "benefits" && (
              <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                {result.benefits.map((b, i) => (
                  <div key={i} className="card">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{b.title}</div>
                    </div>
                    <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.65 }}>{b.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "risks" && (
              <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                {result.risks.map((r, i) => (
                  <div key={i} className="card" style={{ borderColor: "#2a1515" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff6b6b", flexShrink: 0 }} />
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{r.title}</div>
                    </div>
                    <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.65 }}>{r.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "chemicals" && (
              <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#444", letterSpacing: "0.12em", marginBottom: 4 }}>
                  // lesser-known compounds and contaminants
                </div>
                {result.chemicals.map((c, i) => (
                  <div key={i} className="card" style={{ borderLeft: `3px solid ${dangerColor[c.danger] || "#555"}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                      <span className="chem-badge" style={{ background: `${dangerColor[c.danger] || "#555"}18`, color: dangerColor[c.danger] || "#555", border: `1px solid ${dangerColor[c.danger] || "#555"}40` }}>
                        {dangerLabel[c.danger] || "UNKNOWN"}
                      </span>
                    </div>
                    <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.65 }}>{c.desc}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 32, padding: "14px 18px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ color: "#555", fontSize: 16, flexShrink: 0 }}>ℹ</span>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#555", lineHeight: 1.6 }}>
                AI-generated content. Nutritional values are approximate per 100g / typical serving. Consult a healthcare professional before making dietary decisions.
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !notFound && !loading && !error && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "5rem", marginBottom: 16, opacity: 0.15 }}>◎</div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: "0.1em", color: "#333" }}>AWAITING INPUT</p>
          </div>
        )}

        <div style={{ marginTop: 80, paddingTop: 40, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#333" }}>© 2025 NutriLex — AI Food Intelligence</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#333" }}>Powered by Gemini 2.5 Flash</span>
        </div>
      </div>
    </>
  );
}
