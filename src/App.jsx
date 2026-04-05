import { useState, useRef, useEffect } from "react";

const dangerColor = { high: "#ff4d4d", medium: "#ff9800", low: "#ffd600" };
const dangerLabel = { high: "HIGH RISK", medium: "MODERATE", low: "LOW RISK" };
const essentialColor = {
  nonessential: "#888",
  essential: "#c8f064",
  toxic: "#ff4d4d",
  toxic_in_high_amounts: "#ff9800",
  essential_but_overconsumed: "#ff9800"
};
const essentialLabel = {
  nonessential: "NONESSENTIAL",
  essential: "ESSENTIAL",
  toxic: "TOXIC",
  toxic_in_high_amounts: "TOXIC IN HIGH AMOUNTS",
  essential_but_overconsumed: "ESSENTIAL BUT OVERCONSUMED"
};
const suggestions = ["apple", "salmon", "oat milk", "white rice", "dark chocolate"];

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  button { color: inherit; -webkit-appearance: none; appearance: none; border: none; background: none; }
  :root { --bg: #0d0d0d; --surface: #141414; --border: #2a2a2a; --text: #e8e6e1; --muted: #888; --accent: #c8f064; }
  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }
`;

// ─── Image Analysis Page ───────────────────────────────────────────────────
function ImagePage({ onBack, onResult }) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) handleFile(f);
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleFile = (f) => {
    if (!f || !f.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setFile(f);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(",")[1];
      const mimeType = file.type;

      const prompt = `You are a nutrition and food analysis AI. Analyze this image carefully.

CASE 1 — If this is a nutrition facts label or ingredient list:
Extract all data and respond ONLY with this JSON (no markdown, no backticks):
{
  "type": "nutrition_label",
  "productName": "Product name if visible, else 'Unknown Product'",
  "emoji": "relevant emoji",
  "nutrition": {
    "calories": "Xkcal",
    "totalFat": "Xg",
    "saturatedFat": "Xg",
    "transFat": "Xg",
    "cholesterol": "Xmg",
    "sodium": "Xmg",
    "totalCarbs": "Xg",
    "fiber": "Xg",
    "sugar": "Xg",
    "protein": "Xg"
  },
  "ingredients": ["ingredient1", "ingredient2"],
"chemicals": [
    {"name": "Additive name", "danger": "high/medium/low", "desc": "What it is and why it is concerning"}
  ],
  "summary": "2-3 sentence overall assessment of this product's healthiness."
}

IMPORTANT RULES FOR CHEMICALS: Only include genuinely harmful additives such as artificial preservatives, synthetic dyes, or known carcinogens. Do NOT include common essential nutrients like sodium, potassium, calcium, iron, vitamins, or natural sugars. True high risk examples: Red 40, BHA, BHT, sodium nitrite, TBHQ, carrageenan, aspartame, acesulfame-K. Do NOT flag: sodium, potassium, calcium, iron, vitamin C, vitamin D, citric acid, lecithin, natural flavors.
CASE 2 — If this is a photo of a food (e.g. an apple, pizza, burger, salad):
Identify the food and respond ONLY with this JSON (no markdown, no backticks):
{
  "type": "food_image",
  "foodName": "Identified food name",
  "confidence": "high/medium/low"
}

CASE 3 — If this is neither food nor a nutrition label:
Respond with exactly: NOT_FOOD`;

      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
            }),
          }
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err?.error?.message || "API error");
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!text || text === "NOT_FOOD") {
          setError("This doesn't appear to be a food image or nutrition label. Please try another image.");
          setLoading(false);
          return;
        }

        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        if (firstBrace === -1 || lastBrace === -1) {
          setError("Could not read the image. Please try again.");
          setLoading(false);
          return;
        }

        const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
        if (parsed.type === "food_image") {
          onResult({ type: "navigate", foodName: parsed.foodName });
        } else if (parsed.type === "nutrition_label") {
          onResult({ type: "label", data: parsed });
        }
      } catch (err) {
        setError(err instanceof SyntaxError ? "Could not parse image response. Try again." : err.message);
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <style>{`
        ${GLOBAL_STYLES}
        @keyframes img-fade-in { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes border-glow { 0%,100% { box-shadow:0 0 0 0 rgba(200,240,100,0); } 50% { box-shadow:0 0 20px 4px rgba(200,240,100,0.1); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .drop-zone { border:2px dashed #2a2a2a; border-radius:12px; padding:60px 40px; text-align:center; transition:all 0.3s; cursor:pointer; color:var(--text); }
        .drop-zone:hover, .drop-zone.drag-over { border-color:var(--accent); background:rgba(200,240,100,0.03); animation:border-glow 2s ease-in-out infinite; }
        .img-spinner { width:20px; height:20px; border:2px solid var(--accent); border-top-color:transparent; border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; }
        .upload-btn { background:var(--accent) !important; color:#0d0d0d !important; border:none !important; padding:12px 28px; border-radius:4px; cursor:pointer; font-family:'DM Mono',monospace; font-size:13px; letter-spacing:0.08em; font-weight:600; transition:all 0.2s; display:inline-block; }
        .upload-btn:hover:not(:disabled) { background:#d4f57a !important; transform:scale(1.03); box-shadow:0 0 20px rgba(200,240,100,0.3); }
        .upload-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .back-btn-img { background:none !important; border:1px solid #2a2a2a !important; border-radius:4px; color:#888 !important; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.1em; padding:8px 16px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:8px; }
        .back-btn-img:hover { border-color:var(--accent) !important; color:var(--accent) !important; }
        .remove-btn { position:absolute; top:12px; right:12px; background:rgba(13,13,13,0.85) !important; border:1px solid #3a3a3a !important; border-radius:50%; width:32px; height:32px; color:#888 !important; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
        .remove-btn:hover { border-color:#ff4d4d !important; color:#ff4d4d !important; }
      `}</style>

      <div style={{ maxWidth:700, margin:"0 auto", padding:"60px 32px", animation:"img-fade-in 0.5s ease forwards" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:48 }}>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:"0.2em", color:"var(--accent)", textTransform:"uppercase", marginBottom:10 }}>— image analysis</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:700, color:"var(--text)" }}>Analyze from Image</h2>
            <p style={{ color:"#888", fontSize:14, marginTop:8, lineHeight:1.6 }}>Upload a nutrition label or a photo of any food.</p>
          </div>
          <button className="back-btn-img" onClick={onBack}>← Main Page</button>
        </div>

        {!preview && (
          <div
            className={`drop-zone ${dragging ? "drag-over" : ""}`}
            onClick={() => fileInputRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div style={{ fontSize:48, marginBottom:20 }}>📷</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:"#888", letterSpacing:"0.08em", marginBottom:8 }}>DROP IMAGE HERE OR CLICK TO BROWSE</div>
            <div style={{ fontSize:12, color:"#444", marginBottom:6 }}>Supports nutrition labels, food photos, ingredient lists</div>
            <div style={{ fontSize:12, color:"#555", fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em" }}>— or press <span style={{ color:"var(--accent)", background:"rgba(200,240,100,0.08)", padding:"2px 8px", borderRadius:3 }}>Ctrl+V</span> to paste from clipboard</div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => handleFile(e.target.files[0])} />
          </div>
        )}

        {preview && !loading && (
          <div style={{ animation:"img-fade-in 0.4s ease" }}>
            <div style={{ position:"relative", marginBottom:24 }}>
              <img src={preview} alt="preview" style={{ width:"100%", borderRadius:8, border:"1px solid #2a2a2a", maxHeight:400, objectFit:"contain", background:"#111" }} />
              <button className="remove-btn" onClick={() => { setPreview(null); setFile(null); setError(""); }}>×</button>
            </div>
            <div style={{ display:"flex", gap:12 }}>
              <button className="upload-btn" onClick={analyze} style={{ flex:1 }}>ANALYZE IMAGE</button>
              <button className="back-btn-img" onClick={() => { setPreview(null); setFile(null); setError(""); }}>CHANGE IMAGE</button>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <div style={{ marginBottom:20 }}><span className="img-spinner" /></div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"#444", letterSpacing:"0.15em" }}>SCANNING IMAGE...</div>
            <div style={{ fontSize:12, color:"#333", marginTop:8 }}>Extracting nutrition data and analyzing compounds</div>
          </div>
        )}

        {error && (
          <div style={{ marginTop:20, background:"#1a0a0a", border:"1px solid #3a1a1a", borderRadius:6, padding:"14px 18px", color:"#ff6b6b", fontFamily:"'DM Mono',monospace", fontSize:13 }}>
            ⚠ {error}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Nutrition Label Result Page ───────────────────────────────────────────
function LabelResultPage({ data, onBack, onChemicalClick }) {
  const [activeTab, setActiveTab] = useState("nutrition");

  const highRiskChemicals = data.chemicals?.filter(c => c.danger === "high").map(c => c.name.toLowerCase()) || [];

  const isHighRisk = (ing) => {
    const name = ing.toLowerCase();
    return highRiskChemicals.some(c => name.includes(c) || c.includes(name));
  };

  return (
    <>
      <style>{`
        ${GLOBAL_STYLES}
        @keyframes img-fade-in { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes subtle-pulse { 0%,100% { box-shadow:0 0 0 0 rgba(255,77,77,0); } 50% { box-shadow:0 0 8px 2px rgba(255,77,77,0.15); } }
        .label-tab { font-family:'DM Mono',monospace; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; padding:10px 18px; transition:all 0.2s; }
        .label-back-btn { border:1px solid #2a2a2a !important; border-radius:4px; color:#888 !important; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.1em; padding:8px 16px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:8px; }
        .label-back-btn:hover { border-color:var(--accent) !important; color:var(--accent) !important; }
        .chem-click-btn { border-radius:6px; padding:22px; cursor:pointer; text-align:left; color:var(--text) !important; transition:all 0.25s; width:100%; }
        .chem-click-btn:hover { background:#1a1f14 !important; transform:translateY(-2px); box-shadow:0 0 24px rgba(200,240,100,0.12); }
        .ing-tag { border-radius:4px; padding:4px 12px; font-size:13px; cursor:default; transition:all 0.2s; display:inline-block; }
        .ing-tag.high-risk { background:rgba(255,77,77,0.12) !important; border-color:rgba(255,77,77,0.4) !important; color:#ff4d4d !important; animation:subtle-pulse 2.5s ease-in-out infinite; }
        .ing-tag.high-risk:hover { background:rgba(255,77,77,0.2) !important; }
      `}</style>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"60px 32px", animation:"img-fade-in 0.5s ease forwards" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:40 }}>
          <button className="label-back-btn" onClick={onBack}>← Back to Image</button>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#444" }}>IMAGE ANALYSIS RESULT</div>
        </div>

        <div style={{ display:"flex", alignItems:"flex-start", gap:20, marginBottom:32 }}>
          <div style={{ fontSize:56, lineHeight:1 }}>{data.emoji}</div>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"var(--accent)", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:6 }}>NUTRITION LABEL</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:700, marginBottom:10, color:"var(--text)" }}>{data.productName}</h2>
            <p style={{ color:"#888", lineHeight:1.7, fontSize:15, maxWidth:600 }}>{data.summary}</p>
            {highRiskChemicals.length > 0 && (
              <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:8, background:"rgba(255,77,77,0.08)", border:"1px solid rgba(255,77,77,0.2)", borderRadius:6, padding:"8px 14px", width:"fit-content" }}>
                <span style={{ color:"#ff4d4d", fontSize:14 }}>⚠</span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#ff4d4d", letterSpacing:"0.06em" }}>{highRiskChemicals.length} HIGH RISK COMPOUND{highRiskChemicals.length > 1 ? "S" : ""} DETECTED</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ borderBottom:"1px solid #2a2a2a", display:"flex", marginBottom:28 }}>
          {["nutrition", "ingredients", "chemicals"].map(tab => (
            <button key={tab} className="label-tab"
              onClick={() => setActiveTab(tab)}
              style={{ color: activeTab===tab ? "var(--accent)" : "#888", borderBottom:`2px solid ${activeTab===tab ? "var(--accent)" : "transparent"}` }}
            >
              {tab}{tab==="chemicals" && <span style={{ marginLeft:6, color:"#ff4d4d", fontSize:9 }}>⚠</span>}
            </button>
          ))}
        </div>

        {activeTab === "nutrition" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
            {Object.entries(data.nutrition).filter(([,v]) => v && v !== "0g" && v !== "0mg" && v !== "0kcal").map(([k, v]) => (
              <div key={k} style={{ background:"#141414", border:"1px solid #2a2a2a", borderRadius:6, padding:"16px 20px", textAlign:"center" }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:18, color:"var(--accent)", fontWeight:500 }}>{v}</div>
                <div style={{ fontSize:11, color:"#555", fontFamily:"monospace", textTransform:"uppercase", marginTop:4 }}>{k.replace(/([A-Z])/g, ' $1').trim()}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "ingredients" && (
        <div style={{ background:"#141414", border:"1px solid #2a2a2a", borderRadius:6, padding:"20px 24px" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#555", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>// full ingredient list — click any to explore</div>
            {highRiskChemicals.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, fontFamily:"'DM Mono',monospace", fontSize:11, color:"#ff4d4d" }}>
                <span>⚠</span> High risk ingredients are highlighted in red
            </div>
            )}
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {data.ingredients?.map((ing, i) => {
                const simplified = ing
                .replace(/\s*\[.*?\]/g, "")
                .replace(/\s*\(.*?\)/g, "")
                .replace(/,.*$/, "")
                .trim();
                const searchTerm = simplified.length > 2 ? simplified : ing.split(/[,([]/)[0].trim();
                const risk = isHighRisk(ing);
                return (
                <button key={i}
                    className={`ing-tag ${risk ? "high-risk" : ""}`}
                    onClick={() => onChemicalClick(searchTerm)}
                    style={{ background: risk ? undefined : "#1e1e1e", border:`1px solid ${risk ? undefined : "#333"}`, color: risk ? undefined : "#e8e6e1", cursor:"pointer", transition:"all 0.2s" }}
                    onMouseEnter={e => { if (!risk) { e.currentTarget.style.borderColor="var(--accent)"; e.currentTarget.style.color="var(--accent)"; e.currentTarget.style.background="rgba(200,240,100,0.05)"; }}}
                    onMouseLeave={e => { if (!risk) { e.currentTarget.style.borderColor="#333"; e.currentTarget.style.color="#e8e6e1"; e.currentTarget.style.background="#1e1e1e"; }}}
                    title={`Search: ${searchTerm}`}
                >
                    {risk && <span style={{ marginRight:5 }}>⚠</span>}{ing}
                </button>
                );
            })}
            </div>
            <div style={{ marginTop:14, fontFamily:"'DM Mono',monospace", fontSize:10, color:"#444" }}>click any ingredient to explore it →</div>
        </div>
        )}

        {activeTab === "chemicals" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#444", letterSpacing:"0.12em", marginBottom:4 }}>// click any compound to explore it</div>
            {data.chemicals?.length > 0 ? data.chemicals.map((c, i) => (
              <button key={i} className="chem-click-btn"
                onClick={() => onChemicalClick(c.name)}
                style={{ background: c.danger==="high" ? "rgba(255,77,77,0.05)" : "#141414", border:`1px solid ${c.danger==="high" ? "rgba(255,77,77,0.25)" : "#2a2a2a"}`, borderLeft:`3px solid ${dangerColor[c.danger]||"#555"}` }}
              >
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:500, color:"var(--text)" }}>{c.name}</span>
                  <span style={{ display:"inline-block", fontFamily:"'DM Mono',monospace", fontSize:10, padding:"3px 8px", borderRadius:3, fontWeight:500, background:`${dangerColor[c.danger]||"#555"}18`, color:dangerColor[c.danger]||"#555", border:`1px solid ${dangerColor[c.danger]||"#555"}40` }}>
                    {dangerLabel[c.danger]||"UNKNOWN"}
                  </span>
                </div>
                <p style={{ color:"#888", fontSize:13, lineHeight:1.65 }}>{c.desc}</p>
                <div style={{ marginTop:10, fontFamily:"'DM Mono',monospace", fontSize:10, color:"#444" }}>EXPLORE COMPOUND →</div>
              </button>
            )) : (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#444", fontFamily:"'DM Mono',monospace", fontSize:13 }}>No concerning compounds detected.</div>
            )}
          </div>
        )}

        <div style={{ marginTop:32, padding:"14px 18px", background:"#141414", border:"1px solid #2a2a2a", borderRadius:6, display:"flex", gap:12, alignItems:"flex-start" }}>
          <span style={{ color:"#555", fontSize:16, flexShrink:0 }}>ℹ</span>
          <p style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#555", lineHeight:1.6 }}>
            AI-extracted from image. Values may not be 100% accurate. Always verify against the original label.
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("main");
  const [labelData, setLabelData] = useState(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("benefits");
  const [error, setError] = useState("");
  const [camTooltip, setCamTooltip] = useState(false);
  const inputRef = useRef(null);

  const analyzeFood = async (overrideQuery, pushHistory = false) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    if (pushHistory && result) setHistory(h => [...h, { query, result, activeTab }]);
    if (!pushHistory) setHistory([]);

    setQuery(q);
    setLoading(true);
    setResult(null);
    setNotFound(false);
    setError("");
    setPage("main");

    const prompt = `Analyze the input: "${q}".

If this is a real food or drink, respond ONLY with a valid JSON object — no markdown, no backticks, no explanation — in this exact format:
{
  "type": "food",
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
    {"name": "Chemical or ingredient name", "danger": "high / medium / low", "desc": "What it is and why it matters"},
    {"name": "Chemical or ingredient name", "danger": "high / medium / low", "desc": "What it is and why it matters"},
    {"name": "Chemical or ingredient name", "danger": "high / medium / low", "desc": "What it is and why it matters"}
  ],
  "nutrition": {
    "calories": "Xkcal",
    "carbs": "Xg",
    "fiber": "Xg",
    "sugar": "Xg",
    "protein": "Xg",
    "fat": "Xg"
  }
}

If this is a food chemical or ingredient (e.g. citric acid, MSG, aspartame, vitamin C, lead acetate), respond ONLY with a valid JSON object — no markdown, no backticks, no explanation — in this exact format:
{
  "type": "ingredient",
  "name": "Full ingredient name",
  "emoji": "single relevant emoji",
  "category": "category e.g. Flavor / Preservative / Texture / Naturally Occurring / Heavy Metal / Vitamin",
  "essentiality": "nonessential / essential / toxic / toxic_in_high_amounts / essential_but_overconsumed",
      "summary": "2 sentence overview of this ingredient",
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
  "foundIn": [
    {"name": "Food name", "emoji": "emoji"},
    {"name": "Food name", "emoji": "emoji"},
    {"name": "Food name", "emoji": "emoji"},
    {"name": "Food name", "emoji": "emoji"},
    {"name": "Food name", "emoji": "emoji"},
    {"name": "Food name", "emoji": "emoji"}
  ],
  "sourcing": "2-4 sentence explanation describing how it is grown, processed, or industrially synthesized, with ecological impact and potential contaminants."
}

If the input satisfies none of the above, ONLY reply with "NOT_FOOD".`;

    try {
      // 1. Check MongoDB cache first (skipped silently if running locally without Vercel CLI)
      try {
        const cacheRes = await fetch(`/api/getResult?query=${encodeURIComponent(q)}`);
        const cacheData = await cacheRes.json();
        if (cacheData.cached) {
          setResult(cacheData.result);
          setActiveTab("benefits");
          window.scrollTo({ top:0, behavior:"smooth" });
          setLoading(false);
          return;
        }
      } catch (_) {
        // API routes not available locally, skipping cache
      }

      // 2. Call Gemini
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
      if (!text || text.trim() === "NOT_FOOD") { setNotFound(true); setLoading(false); return; }

      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) { setNotFound(true); setLoading(false); return; }

      const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));

      // 3. Save to MongoDB for future lookups (skipped silently if running locally)
      try {
        await fetch("/api/saveResult", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: q, result: parsed }),
        });
      } catch (_) {
        // API routes not available locally, skipping save
      }

      setResult(parsed);
      setActiveTab("benefits");
      window.scrollTo({ top:0, behavior:"smooth" });
    } catch (err) {
      setError(err instanceof SyntaxError ? "Could not parse response. Please try again." : err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (name) => analyzeFood(name, true);

  const goBack = () => {
  if (history.length === 0) return;
  const prev = history[history.length - 1];
  setHistory(h => h.slice(0, -1));

  if (prev.isImageResult) {
    // Go back to label page if it exists, otherwise image upload page
    if (labelData) setPage("label");
    else setPage("image");
    setResult(null);
    setQuery("");
    return;
  }

  setQuery(prev.query);
  setResult(prev.result);
  setActiveTab(prev.activeTab);
  setNotFound(false);
  setError("");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

  const handleSuggestion = (s) => { setQuery(s); analyzeFood(s); };

    const handleImageResult = (res) => {
    if (res.type === "navigate") {
        // Save label page to history so back button returns to it
        setHistory(h => [...h, { query: "__image__", result: null, activeTab: "benefits", isImageResult: true }]);
        analyzeFood(res.foodName, false);
    } else if (res.type === "label") {
        setLabelData(res.data);
        setPage("label");
    }
    };

  const isIngredient = result?.type === "ingredient";
  const tabs = isIngredient ? ["benefits", "risks", "found in"] : ["benefits", "risks", "chemicals"];

  // ── Image page ──
  if (page === "image") {
    return (
      <div style={{ background:"#0d0d0d", minHeight:"100vh", color:"#e8e6e1" }}>
        <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(13,13,13,0.92)", backdropFilter:"blur(12px)", borderBottom:"1px solid #2a2a2a", padding:"14px 40px", display:"flex", alignItems:"center", gap:16 }}>
          <span onClick={() => setPage("main")} style={{ fontFamily:"'DM Mono',monospace", fontSize:13, letterSpacing:"0.15em", color:"#c8f064", textTransform:"uppercase", cursor:"pointer" }}>NutriFax</span>
          <span style={{ color:"#333", fontSize:12 }}>//</span>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#444" }}>image analysis</span>
        </nav>
        <ImagePage onBack={() => setPage("main")} onResult={handleImageResult} />
      </div>
    );
  }

  // ── Label result page ──
  if (page === "label" && labelData) {
    return (
      <div style={{ background:"#0d0d0d", minHeight:"100vh", color:"#e8e6e1" }}>
        <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(13,13,13,0.92)", backdropFilter:"blur(12px)", borderBottom:"1px solid #2a2a2a", padding:"14px 40px", display:"flex", alignItems:"center", gap:16 }}>
          <span onClick={() => setPage("main")} style={{ fontFamily:"'DM Mono',monospace", fontSize:13, letterSpacing:"0.15em", color:"#c8f064", textTransform:"uppercase", cursor:"pointer" }}>NutriFax</span>
          <span style={{ color:"#333", fontSize:12 }}>//</span>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#444" }}>label result</span>
        </nav>
        <LabelResultPage
          data={labelData}
          onBack={() => setPage("image")}
          onChemicalClick={(name) => {
            setHistory(h => [...h, { query: "__image__", result: null, activeTab: "benefits", isImageResult: true }]);
            analyzeFood(name, false);
            }}
        />
      </div>
    );
  } 

  // ── Main page ──
  return (
    <>
      <style>{`
        ${GLOBAL_STYLES}
        @keyframes rise { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-glow { 0%,100% { box-shadow:0 0 0 0 rgba(200,240,100,0); } 50% { box-shadow:0 0 24px 4px rgba(200,240,100,0.12); } }
        @keyframes cam-glow { 0%,100% { box-shadow:0 0 0 0 rgba(200,240,100,0); } 50% { box-shadow:0 0 14px 3px rgba(200,240,100,0.25); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        @keyframes fade-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .result-enter { animation:fade-in 0.4s ease forwards; }
        .stagger > * { opacity:0; animation:rise 0.45s ease forwards; }
        .stagger > *:nth-child(1) { animation-delay:.04s; }
        .stagger > *:nth-child(2) { animation-delay:.10s; }
        .stagger > *:nth-child(3) { animation-delay:.16s; }
        .stagger > *:nth-child(4) { animation-delay:.22s; }
        .stagger > *:nth-child(5) { animation-delay:.28s; }
        .stagger > *:nth-child(6) { animation-delay:.34s; }
        .scan-line { position:fixed; top:0; left:0; right:0; bottom:0; background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.012) 2px,rgba(255,255,255,0.012) 4px); pointer-events:none; z-index:9999; }
        .search-bar:focus-within { border-color:var(--accent) !important; box-shadow:0 0 0 1px var(--accent),0 0 30px rgba(200,240,100,0.08) !important; animation:pulse-glow 2.5s ease-in-out infinite; }
        .tab { font-family:'DM Mono',monospace; font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); cursor:pointer; padding:10px 18px; border-bottom:2px solid transparent; transition:all 0.2s; }
        .tab:hover { color:var(--text); }
        .tab.active { color:var(--accent); border-bottom-color:var(--accent); }
        .card { background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:22px; transition:border-color 0.2s,transform 0.2s; color:var(--text); }
        .card:hover { border-color:#3a3a3a; transform:translateY(-2px); }
        .chem-badge { display:inline-block; font-family:'DM Mono',monospace; font-size:10px; letter-spacing:.08em; padding:3px 8px; border-radius:3px; font-weight:500; }
        .suggest-chip { background:var(--surface) !important; border:1px solid var(--border) !important; border-radius:4px; padding:5px 14px; font-size:13px; color:var(--muted) !important; cursor:pointer; font-family:'DM Mono',monospace; transition:all 0.2s; }
        .suggest-chip:hover { border-color:var(--accent) !important; color:var(--accent) !important; background:rgba(200,240,100,0.05) !important; }
        .analyze-btn { background:var(--accent) !important; color:#0d0d0d !important; padding:12px 28px; border-radius:4px; cursor:pointer; font-family:'DM Mono',monospace; font-size:13px; letter-spacing:.08em; font-weight:600; transition:all 0.2s; white-space:nowrap; min-width:130px; display:flex; align-items:center; justify-content:center; }
        .analyze-btn:hover:not(:disabled) { background:#d4f57a !important; transform:scale(1.03); box-shadow:0 0 20px rgba(200,240,100,0.3); }
        .analyze-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .spinner { width:16px; height:16px; border:2px solid #0d0d0d; border-top-color:transparent; border-radius:50%; animation:spin 0.7s linear infinite; }
        .float-emoji { display:inline-block; animation:float 3s ease-in-out infinite; }
        .cam-btn { cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; position:relative; transition:all 0.25s; color:#888; flex-shrink:0; }
        .cam-btn:hover { color:var(--accent); animation:cam-glow 1.5s ease-in-out infinite; background:rgba(200,240,100,0.06); }
        .cam-btn:hover .cam-icon { transform:scale(1.15); }
        .cam-icon { transition:transform 0.25s,color 0.25s; }
        .cam-tooltip { position:absolute; bottom:calc(100% + 10px); right:0; background:#1a1a1a; border:1px solid #333; border-radius:6px; padding:8px 12px; white-space:nowrap; font-family:'DM Mono',monospace; font-size:11px; color:var(--accent); letter-spacing:0.06em; pointer-events:none; animation:fade-in 0.2s ease; z-index:10; }
        .cam-tooltip::after { content:''; position:absolute; top:100%; right:14px; border:5px solid transparent; border-top-color:#333; }
        .clickable-card { background:var(--surface) !important; border:1px solid var(--border); border-radius:6px; padding:22px; transition:border-color 0.25s,transform 0.25s,box-shadow 0.25s,background 0.25s; cursor:pointer; text-align:left; width:100%; color:var(--text) !important; }
        .clickable-card:hover { border-color:var(--accent); transform:translateY(-3px); background:#1a1f14 !important; box-shadow:0 0 24px rgba(200,240,100,0.12),0 0 0 1px rgba(200,240,100,0.08); }
        .clickable-card:hover .nav-arrow { opacity:1; transform:translateX(0); }
        .clickable-card:hover .chem-name { color:var(--accent); letter-spacing:0.06em; }
        .clickable-card .chem-name { transition:color 0.2s,letter-spacing 0.2s; color:var(--text); }
        .nav-arrow { opacity:0; transform:translateX(-4px); transition:all 0.2s; color:var(--accent); font-size:14px; }
        .found-in-card { background:var(--surface) !important; border:1px solid var(--border); border-radius:6px; padding:18px 22px; display:flex; align-items:center; gap:14px; transition:border-color 0.25s,transform 0.25s,box-shadow 0.25s,background 0.25s; cursor:pointer; width:100%; text-align:left; color:var(--text) !important; }
        .found-in-card:hover { border-color:var(--accent); transform:translateY(-3px); background:#1a1f14 !important; box-shadow:0 0 24px rgba(200,240,100,0.12),0 0 0 1px rgba(200,240,100,0.08); }
        .found-in-card:hover .nav-arrow { opacity:1; transform:translateX(0); }
        .found-in-card:hover .food-name { color:var(--accent); letter-spacing:0.03em; }
        .found-in-card .food-name { transition:color 0.2s,letter-spacing 0.2s; color:var(--text); }
        .back-btn { border:1px solid var(--border) !important; border-radius:4px; color:var(--muted) !important; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:.1em; padding:6px 14px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:8px; }
        .back-btn:hover { border-color:var(--accent) !important; color:var(--accent) !important; }
        .breadcrumb-item { font-family:'DM Mono',monospace; font-size:11px; color:#444; }
        .breadcrumb-sep { font-family:'DM Mono',monospace; font-size:11px; color:#333; margin:0 6px; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:var(--bg); }
        ::-webkit-scrollbar-thumb { background:#333; border-radius:3px; }
      `}</style>

      <div className="scan-line" />

      <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(13,13,13,0.92)", backdropFilter:"blur(12px)", borderBottom:"1px solid var(--border)", padding:"14px 40px", display:"flex", alignItems:"center", gap:16 }}>
        <span onClick={() => { setResult(null); setHistory([]); setQuery(""); setNotFound(false); setError(""); }} style={{ fontFamily:"'DM Mono',monospace", fontSize:13, letterSpacing:"0.15em", color:"var(--accent)", textTransform:"uppercase", cursor:"pointer" }}>NutriFax</span>
        <span style={{ color:"#333", fontSize:12 }}>//</span>
        {history.length > 0 ? (
          <>
            {history.map((h, i) => (
              <span key={i} style={{ display:"flex", alignItems:"center" }}>
                <span className="breadcrumb-item" style={{ cursor:"pointer", transition:"color 0.2s" }}
                  onClick={() => { const prev = history[i]; setHistory(hh => hh.slice(0,i)); setQuery(prev.query); setResult(prev.result); setActiveTab(prev.activeTab); setNotFound(false); setError(""); window.scrollTo({top:0,behavior:"smooth"}); }}
                  onMouseEnter={e => e.target.style.color="var(--accent)"} onMouseLeave={e => e.target.style.color="#444"}
                >{h.result?.name || h.query}</span>
                <span className="breadcrumb-sep">›</span>
              </span>
            ))}
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"var(--muted)" }}>{result?.name || query}</span>
          </>
        ) : (
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#444", letterSpacing:"0.1em" }}>AI-powered food intelligence</span>
        )}
      </nav>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"80px 32px 60px" }}>

        {!result && !loading && !notFound && !error && (
          <div style={{ marginBottom:60, animation:"fade-in 0.6s ease forwards" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:"0.2em", color:"var(--accent)", textTransform:"uppercase", marginBottom:20 }}>— nutritional intelligence database</div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(2.8rem,6vw,5rem)", fontWeight:900, lineHeight:1, letterSpacing:"-0.02em", background:"linear-gradient(135deg,#e8e6e1 0%,#666 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              Know what<br />you <span style={{ WebkitTextFillColor:"var(--accent)" }}>consume.</span>
            </h1>
            <p style={{ marginTop:24, fontSize:16, color:"var(--muted)", lineHeight:1.7, maxWidth:520, fontWeight:300 }}>
              Type any food, drink, or ingredient — or scan a nutrition label with the camera icon.
            </p>
          </div>
        )}

        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14 }}>
          <div className="search-bar" style={{ flex:1, display:"flex", alignItems:"center", gap:12, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, padding:"0 12px 0 20px", height:52, transition:"border-color 0.3s,box-shadow 0.3s" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyzeFood()}
              placeholder="Type any food, drink, or ingredient..."
              style={{ background:"none", border:"none", outline:"none", fontSize:15, width:"100%", color:"var(--text)", fontFamily:"'DM Sans',sans-serif" }}
            />
            {query && (
              <button onClick={() => { setQuery(""); setResult(null); setNotFound(false); setError(""); setHistory([]); }} style={{ color:"#444", cursor:"pointer", fontSize:20, lineHeight:1, padding:"0 4px", flexShrink:0 }}>×</button>
            )}
            <div style={{ width:1, height:24, background:"#2a2a2a", flexShrink:0 }} />
            <div style={{ position:"relative", flexShrink:0 }}>
              <button className="cam-btn" onClick={() => setPage("image")} onMouseEnter={() => setCamTooltip(true)} onMouseLeave={() => setCamTooltip(false)}>
                <svg className="cam-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
              {camTooltip && <div className="cam-tooltip">📷 Analyze nutrition facts from image</div>}
            </div>
          </div>
          <button className="analyze-btn" onClick={() => analyzeFood()} disabled={loading || !query.trim()}>
            {loading ? <span className="spinner" /> : "ANALYZE"}
          </button>
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:60 }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:"#444", fontFamily:"monospace", lineHeight:"30px", marginRight:4 }}>try:</span>
            {suggestions.map(s => <button key={s} className="suggest-chip" onClick={() => handleSuggestion(s)}>{s}</button>)}
          </div>
          {history.length > 0 && (
            <button className="back-btn" onClick={goBack}>← back to {history[history.length-1].isImageResult ? "image result" : history[history.length-1].result?.name || "previous"}</button>
          )}
        </div>

        <div style={{ height:1, background:"linear-gradient(90deg,transparent,var(--border),transparent)", marginBottom:40 }} />

        {loading && (
          <div style={{ textAlign:"center", padding:"70px 0", animation:"fade-in 0.3s ease" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"#444", letterSpacing:"0.15em", marginBottom:20 }}>ANALYZING "{query.toUpperCase()}"</div>
            <div style={{ display:"flex", justifyContent:"center", gap:8 }}>
              {[0,1,2,3,4].map(i => <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:"var(--accent)", animation:`rise 0.6s ease-in-out ${i*0.12}s infinite alternate` }} />)}
            </div>
          </div>
        )}

        {error && !loading && (
          <div style={{ background:"#1a0a0a", border:"1px solid #3a1a1a", borderRadius:6, padding:"16px 20px", color:"#ff6b6b", fontFamily:"'DM Mono',monospace", fontSize:13, animation:"fade-in 0.3s ease" }}>⚠ {error}</div>
        )}

        {notFound && !loading && (
          <div style={{ textAlign:"center", padding:"60px 0", color:"var(--muted)", animation:"fade-in 0.4s ease" }}>
            <div style={{ fontSize:40, marginBottom:16 }}>◌</div>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:13 }}>No data found for "{query}"</p>
            <p style={{ fontSize:13, marginTop:8 }}>Try a different food or check your spelling.</p>
          </div>
        )}

        {result && !loading && (
          <div className="result-enter" key={result.name + history.length}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:24, marginBottom:32 }}>
              <div style={{ fontSize:60, lineHeight:1 }} className="float-emoji">{result.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:6 }}>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"var(--accent)", letterSpacing:"0.15em", textTransform:"uppercase" }}>{result.category}</div>
                  {isIngredient && result.essentiality && (
                    <span className="chem-badge" style={{ background:`${essentialColor[result.essentiality]||"#555"}18`, color:essentialColor[result.essentiality]||"#555", border:`1px solid ${essentialColor[result.essentiality]||"#555"}40` }}>
                      {essentialLabel[result.essentiality]||result.essentiality.toUpperCase()}
                    </span>
                  )}
                </div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"2.2rem", fontWeight:700, marginBottom:10 }}>{result.name}</h2>
                <p style={{ color:"var(--muted)", lineHeight:1.7, fontSize:15, maxWidth:600 }}>{result.summary}</p>
              </div>
            </div>

            {!isIngredient && result.nutrition && (
              <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, padding:"16px 24px", marginBottom:32, display:"flex", gap:32, flexWrap:"wrap" }}>
                {Object.entries(result.nutrition).map(([k,v]) => (
                  <div key={k} style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:16, color:"var(--accent)", fontWeight:500 }}>{v}</div>
                    <div style={{ fontSize:11, color:"#555", fontFamily:"monospace", textTransform:"uppercase", marginTop:2 }}>{k}</div>
                  </div>
                ))}
              </div>
            )}

            {isIngredient && result.sourcing && (
              <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, padding:"18px 22px", marginBottom:32 }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#555", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>// how it's sourced</div>
                <p style={{ color:"var(--muted)", fontSize:14, lineHeight:1.7 }}>{result.sourcing}</p>
              </div>
            )}

            <div style={{ borderBottom:"1px solid var(--border)", display:"flex", marginBottom:28 }}>
              {tabs.map(tab => (
                <button key={tab} className={`tab ${activeTab===tab?"active":""}`} onClick={() => setActiveTab(tab)}>
                  {tab}{tab==="chemicals"&&<span style={{ marginLeft:6, color:"#ff4d4d", fontSize:9 }}>⚠</span>}
                </button>
              ))}
            </div>

            {activeTab==="benefits" && (
              <div className="stagger" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:14 }}>
                {result.benefits.map((b,i) => (
                  <div key={i} className="card">
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent)", flexShrink:0 }} />
                      <div style={{ fontWeight:500, fontSize:14 }}>{b.title}</div>
                    </div>
                    <p style={{ color:"var(--muted)", fontSize:13, lineHeight:1.65 }}>{b.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab==="risks" && (
              <div className="stagger" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:14 }}>
                {result.risks.map((r,i) => (
                  <div key={i} className="card" style={{ borderColor:"#2a1515" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:"#ff6b6b", flexShrink:0 }} />
                      <div style={{ fontWeight:500, fontSize:14 }}>{r.title}</div>
                    </div>
                    <p style={{ color:"var(--muted)", fontSize:13, lineHeight:1.65 }}>{r.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab==="chemicals" && !isIngredient && (
              <div className="stagger" style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#444", letterSpacing:"0.12em", marginBottom:4 }}>// click any compound to explore it</div>
                {result.chemicals?.map((c,i) => (
                  <button key={i} className="clickable-card" style={{ borderLeft:`3px solid ${dangerColor[c.danger]||"#555"}` }} onClick={() => navigateTo(c.name)}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                        <span className="chem-name" style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:500 }}>{c.name}</span>
                        <span className="chem-badge" style={{ background:`${dangerColor[c.danger]||"#555"}18`, color:dangerColor[c.danger]||"#555", border:`1px solid ${dangerColor[c.danger]||"#555"}40` }}>
                          {dangerLabel[c.danger]||"UNKNOWN"}
                        </span>
                      </div>
                      <span className="nav-arrow">→</span>
                    </div>
                    <p style={{ color:"var(--muted)", fontSize:13, lineHeight:1.65, textAlign:"left" }}>{c.desc}</p>
                    <div style={{ marginTop:12, fontFamily:"'DM Mono',monospace", fontSize:10, color:"#444", letterSpacing:"0.08em" }}>EXPLORE COMPOUND →</div>
                  </button>
                ))}
              </div>
            )}

            {activeTab==="found in" && isIngredient && (
              <div className="stagger" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:14 }}>
                <div style={{ gridColumn:"1 / -1", fontFamily:"'DM Mono',monospace", fontSize:11, color:"#444", letterSpacing:"0.12em", marginBottom:4 }}>// click any food to explore it</div>
                {result.foundIn?.map((f,i) => (
                  <button key={i} className="found-in-card" onClick={() => navigateTo(f.name)}>
                    <span style={{ fontSize:28 }}>{f.emoji}</span>
                    <span className="food-name" style={{ fontSize:15, flex:1 }}>{f.name}</span>
                    <span className="nav-arrow">→</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginTop:32, padding:"14px 18px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, display:"flex", gap:12, alignItems:"flex-start" }}>
              <span style={{ color:"#555", fontSize:16, flexShrink:0 }}>ℹ</span>
              <p style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#555", lineHeight:1.6 }}>
                AI-generated content. Nutritional values are approximate per 100g / typical serving. Consult a healthcare professional before making dietary decisions.
              </p>
            </div>
          </div>
        )}

        {!result && !notFound && !loading && !error && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"5rem", marginBottom:16, opacity:0.15 }}>◎</div>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:12, letterSpacing:"0.1em", color:"#333" }}>AWAITING INPUT</p>
          </div>
        )}

        <div style={{ marginTop:80, paddingTop:40, borderTop:"1px solid var(--border)", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#333" }}>© 2025 NutriFax — AI Food Intelligence</span>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#333" }}>Powered by Gemini 2.5 Flash</span>
        </div>
      </div>
    </>
  );
}
