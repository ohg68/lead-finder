import { useState, useEffect, useCallback, useRef } from "react";

// ── Storage keys ─────────────────────────────────────────────────
const SK_API = "lf2_gkey";
const SK_PROF = "lf2_prof";
const SK_LEADS = "lf2_leads";

function cn(...c) { return c.filter(Boolean).join(" "); }
function ratingColor(r) {
  if (r >= 4.5) return "#22c55e";
  if (r >= 3.5) return "#eab308";
  if (r >= 2.5) return "#f97316";
  return "#ef4444";
}

function Stars({ rating }) {
  const f = Math.floor(rating), h = rating - f >= 0.3;
  return (
    <span style={{ color: ratingColor(rating), letterSpacing: 1, fontSize: 13 }}>
      {"★".repeat(f)}{h ? "½" : ""}{"☆".repeat(5 - f - (h ? 1 : 0))}
      <span style={{ color: "#94a3b8", marginLeft: 4, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function Badge({ children, color = "#334155", textColor = "#94a3b8" }) {
  return <span style={{ fontSize: 11, background: color, padding: "2px 8px", borderRadius: 6, color: textColor, whiteSpace: "nowrap" }}>{children}</span>;
}

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8,
      background: active ? "#1e293b" : "transparent",
      border: active ? "1px solid #334155" : "1px solid transparent",
      color: active ? "#e2e8f0" : "#64748b", cursor: "pointer", transition: "all 0.15s",
    }}>{children}</button>
  );
}

function SectionTitle({ icon, label, color }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{icon} {label}</div>
  );
}

// ── Demo data ────────────────────────────────────────────────────
const DEMO_LEADS = [
  { place_id: "d1", name: "Hotel Meliá Costa del Sol", formatted_address: "Paseo Marítimo, Torremolinos, Málaga", rating: 4.1, user_ratings_total: 3842, formatted_phone_number: "+34 952 386 677", website: "https://melia.com", types: ["lodging"], enrichment: { emails: ["reservas@melia.com", "comercial@meliacostadelsol.es"], socials: { facebook: "MeliaHotels", instagram: "maboreliahotels", linkedin: "melia-hotels", twitter: "MeliaHotels" }, status: "done" }, reviews: [
    { author_name: "Carlos M.", rating: 2, text: "La pulsera de la piscina no funcionaba. Tuve que ir 3 veces a recepción para que me la cambiaran. Sistema anticuado." },
    { author_name: "Sophie L.", rating: 3, text: "El check-in fue lento, mucha cola. Deberían tener un sistema digital para agilizar." },
    { author_name: "Pedro R.", rating: 4, text: "Buen hotel pero el sistema de pago en la piscina bar es horrible, solo efectivo o ir a recepción." },
    { author_name: "Anna K.", rating: 5, text: "Excelente servicio y habitaciones impecables." },
    { author_name: "Marco V.", rating: 2, text: "Perdí la tarjeta de acceso dos veces. No hay forma de vincularla al móvil." },
    { author_name: "Julia F.", rating: 3, text: "El minibar debería aceptar pago con pulsera como en otros hoteles que he visitado." },
  ]},
  { place_id: "d2", name: "Barceló Málaga", formatted_address: "Héroe de Sostoa 2, 29002 Málaga", rating: 4.3, user_ratings_total: 5201, formatted_phone_number: "+34 952 047 494", website: "https://barcelo.com", types: ["lodging"], enrichment: { emails: ["info@barcelomalaga.com"], socials: { facebook: "Barcelo", instagram: "barcelohotels", linkedin: "barcelo-hotel-group" }, status: "done" }, reviews: [
    { author_name: "Luis G.", rating: 3, text: "El evento en el salón fue un caos con las acreditaciones. Todo manual con papel." },
    { author_name: "Elena F.", rating: 4, text: "Muy bien ubicado. El spa es fantástico aunque reservar es complicado." },
    { author_name: "James W.", rating: 2, text: "Lost my room key card twice. The replacement process took 20 minutes each time." },
    { author_name: "Maria T.", rating: 5, text: "Todo perfecto, repetiré seguro." },
  ]},
  { place_id: "d3", name: "Vincci Selección Posada del Patio", formatted_address: "Pasillo de Santa Isabel 7, Málaga", rating: 4.5, user_ratings_total: 2103, formatted_phone_number: "+34 952 631 060", website: "https://vinccihoteles.com", types: ["lodging"], enrichment: { emails: ["posadadelpatio@vinccihoteles.com"], socials: { instagram: "vinccihoteles", facebook: "VincciHoteles", linkedin: "vincci-hoteles" }, status: "done" }, reviews: [
    { author_name: "Roberto S.", rating: 4, text: "Precioso hotel. El único problema es que para cargar gastos a la habitación hay que pasar por recepción." },
    { author_name: "Claudia N.", rating: 5, text: "Experiencia de lujo. Todo impecable." },
    { author_name: "David P.", rating: 3, text: "El sistema de acceso al parking es anticuado. Necesitas la tarjeta física siempre." },
  ]},
  { place_id: "d4", name: "AC Hotel Málaga Palacio", formatted_address: "Cortina del Muelle 1, 29015 Málaga", rating: 4.2, user_ratings_total: 4320, formatted_phone_number: "+34 952 215 185", website: "https://marriott.com", types: ["lodging"], enrichment: { emails: ["acmalaga@marriott.com", "events.malaga@marriott.com"], socials: { instagram: "achotels", linkedin: "ac-hotels", twitter: "ACHotels" }, status: "done" }, reviews: [
    { author_name: "Fernando A.", rating: 2, text: "El minibar no acepta tarjeta. Absurdo en 2025." },
    { author_name: "Sarah B.", rating: 4, text: "Great rooftop views. Room was comfortable." },
    { author_name: "Pablo C.", rating: 3, text: "Los eventos corporativos podrían mejorar con mejor control de accesos." },
    { author_name: "Marta L.", rating: 2, text: "Las pulseras del spa no funcionan bien. Tuve que esperar 10 minutos en recepción." },
  ]},
  { place_id: "d5", name: "Pestana CR7 Lifestyle", formatted_address: "Plaza de la Marina, Málaga", rating: 3.9, user_ratings_total: 1567, formatted_phone_number: "+34 952 001 200", website: "https://pestana.com", types: ["lodging"], enrichment: { emails: ["reservas@pestana.com"], socials: { instagram: "pestanacr7", facebook: "PestanaCR7" }, status: "done" }, reviews: [
    { author_name: "João M.", rating: 2, text: "O sistema de cashless da piscina é terrível. Tive de ir buscar dinheiro ao quarto." },
    { author_name: "Lucia R.", rating: 3, text: "El control de acceso al gimnasio falla constantemente. La tarjeta no funciona." },
    { author_name: "Tom H.", rating: 4, text: "Nice hotel but the wristband for pool access kept deactivating." },
  ]},
  { place_id: "d6", name: "Gran Hotel Miramar GL", formatted_address: "Paseo de Reding 22, 29016 Málaga", rating: 4.6, user_ratings_total: 2890, formatted_phone_number: "+34 952 603 700", website: "https://granhotelmiramarmalaga.com", types: ["lodging"], enrichment: { emails: ["info@granhotelmiramar.com", "eventos@granhotelmiramar.com"], socials: { instagram: "granhotelmiramar", facebook: "GranHotelMiramarMalaga", linkedin: "gran-hotel-miramar" }, status: "done" }, reviews: [
    { author_name: "Isabel R.", rating: 5, text: "Un palacio convertido en hotel de lujo. Perfecto en todo." },
    { author_name: "Gerhard K.", rating: 4, text: "Beautiful property. The pool area access system could be modernized." },
    { author_name: "Carolina M.", rating: 5, text: "El mejor hotel de Málaga sin duda." },
  ]},
];

// ── Email/Social extraction helpers ──────────────────────────────
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const SOCIAL_PATTERNS = [
  { key: "facebook", re: /(?:facebook\.com|fb\.com)\/([a-zA-Z0-9._\-]+)/i },
  { key: "instagram", re: /instagram\.com\/([a-zA-Z0-9._]+)/i },
  { key: "linkedin", re: /linkedin\.com\/(?:company|in)\/([a-zA-Z0-9._\-]+)/i },
  { key: "twitter", re: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9._]+)/i },
  { key: "tiktok", re: /tiktok\.com\/@?([a-zA-Z0-9._]+)/i },
  { key: "youtube", re: /youtube\.com\/(?:@|channel\/|c\/)?([a-zA-Z0-9._\-]+)/i },
];

function extractFromHTML(html) {
  const emailsRaw = html.match(EMAIL_RE) || [];
  const junk = /\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i;
  const emails = [...new Set(emailsRaw.filter(e => !junk.test(e)))].slice(0, 8);
  const socials = {};
  SOCIAL_PATTERNS.forEach(({ key, re }) => {
    const m = html.match(re);
    if (m) socials[key] = m[1];
  });
  return { emails, socials };
}

// ── CSV helper ───────────────────────────────────────────────────
function leadsToCSV(leads) {
  const headers = ["Nombre", "Dirección", "Teléfono", "Web", "Rating", "Reseñas", "Emails", "Facebook", "Instagram", "LinkedIn", "Twitter", "TikTok", "YouTube", "Score IA"];
  const rows = leads.map(l => {
    const e = l.enrichment || {};
    const s = e.socials || {};
    return [
      l.name, l.formatted_address || "", l.formatted_phone_number || l.phone || "",
      l.website || "", l.rating || "", l.user_ratings_total || "",
      (e.emails || []).join("; "),
      s.facebook || "", s.instagram || "", s.linkedin || "",
      s.twitter || "", s.tiktok || "", s.youtube || "",
      l.aiScore || "",
    ];
  });
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
}

function downloadCSV(leads) {
  const csv = leadsToCSV(leads);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── MAIN APP ─────────────────────────────────────────────────────
export default function LeadFinderApp() {
  const [view, setView] = useState("search");
  const [googleKey, setGoogleKey] = useState("");
  const [businessProfile, setBusinessProfile] = useState({
    name: "Brasgraphics",
    description: "Fabricante brasileño de pulseras RFID/NFC cashless y tarjetas de acceso para el sector hotelero y de eventos. Vendemos componentes B2B a integradores y fabricantes de cerraduras en la Península Ibérica.",
    value_prop: "Pulseras RFID resistentes al agua, personalizables, con chip NFC dual para pagos cashless y control de acceso. Reducen colas un 60% y aumentan el gasto por huésped un 25%.",
  });
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [activeTab, setActiveTab] = useState("intelligence");
  const [emailLang, setEmailLang] = useState("es");
  const [toast, setToast] = useState(null);
  const [enrichingId, setEnrichingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  // Load saved state
  useEffect(() => {
    try { const k = window.localStorage?.getItem?.(SK_API); if (k) { setGoogleKey(k); setDemoMode(false); } } catch {}
    try { const p = window.localStorage?.getItem?.(SK_PROF); if (p) setBusinessProfile(JSON.parse(p)); } catch {}
  }, []);

  function showToast(msg, dur = 3000) { setToast(msg); setTimeout(() => setToast(null), dur); }

  // ── Google Places Search ───────────────────────────
  async function searchPlaces() {
    if (demoMode) {
      setLoading(true);
      await new Promise(r => setTimeout(r, 600));
      setLeads(DEMO_LEADS);
      setSelectedIds(new Set());
      setLoading(false);
      return;
    }
    if (!googleKey) { setView("settings"); return; }
    setLoading(true);
    try {
      const q = encodeURIComponent(`${searchQuery} in ${searchLocation}`);
      const resp = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&key=${googleKey}&language=es`);
      const data = await resp.json();
      if (data.results) {
        const enriched = await Promise.all(
          data.results.slice(0, 20).map(async (p) => {
            try {
              const dr = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,reviews,types,url&key=${googleKey}&language=es&reviews_sort=newest`);
              const dd = await dr.json();
              return { ...dd.result, place_id: p.place_id, enrichment: { emails: [], socials: {}, status: "pending" } };
            } catch { return { ...p, enrichment: { emails: [], socials: {}, status: "pending" } }; }
          })
        );
        setLeads(enriched);
        setSelectedIds(new Set());
      }
    } catch (e) { showToast("Error: " + e.message); }
    setLoading(false);
  }

  // ── Website Enrichment ─────────────────────────────
  async function enrichLead(lead, idx) {
    if (!lead.website) { showToast("Sin web para enriquecer"); return; }
    setEnrichingId(lead.place_id);
    try {
      // Use allorigins as CORS proxy for fetching business websites
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(lead.website)}`;
      const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      const html = await resp.text();
      const { emails, socials } = extractFromHTML(html);

      // Try /contact page too
      let contactEmails = [];
      let contactSocials = {};
      try {
        const base = new URL(lead.website);
        const contactUrls = ["/contact", "/contacto", "/contato", "/kontakt", "/about", "/sobre"];
        for (const path of contactUrls) {
          try {
            const cr = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(base.origin + path)}`, { signal: AbortSignal.timeout(6000) });
            if (cr.ok) {
              const ch = await cr.text();
              const extra = extractFromHTML(ch);
              contactEmails.push(...extra.emails);
              Object.assign(contactSocials, extra.socials);
            }
          } catch {}
        }
      } catch {}

      const allEmails = [...new Set([...emails, ...contactEmails])].slice(0, 10);
      const allSocials = { ...socials, ...contactSocials };

      setLeads(prev => prev.map(l =>
        l.place_id === lead.place_id
          ? { ...l, enrichment: { emails: allEmails, socials: allSocials, status: "done" } }
          : l
      ));
      if (selectedLead?.place_id === lead.place_id) {
        setSelectedLead(prev => ({ ...prev, enrichment: { emails: allEmails, socials: allSocials, status: "done" } }));
      }
      showToast(`${allEmails.length} emails + ${Object.keys(allSocials).length} redes encontradas`);
    } catch (e) {
      setLeads(prev => prev.map(l =>
        l.place_id === lead.place_id ? { ...l, enrichment: { ...l.enrichment, status: "error" } } : l
      ));
      showToast("Error enriqueciendo: " + e.message);
    }
    setEnrichingId(null);
  }

  // ── Bulk enrich ────────────────────────────────────
  async function enrichAll() {
    const toEnrich = leads.filter(l => l.website && (!l.enrichment || l.enrichment.status === "pending"));
    for (const lead of toEnrich) {
      await enrichLead(lead);
      await new Promise(r => setTimeout(r, 500));
    }
    showToast(`Enriquecimiento completado: ${toEnrich.length} leads`);
  }

  // ── AI Review Analysis ─────────────────────────────
  async function analyzeReviews(lead) {
    setAnalyzingId(lead.place_id);
    setAnalysis(null);
    const reviews = (lead.reviews || []).map(r => `[${r.rating}★] ${r.author_name}: ${r.text}`).join("\n");
    if (!reviews) { setAnalysis({ error: "No hay reseñas disponibles." }); setAnalyzingId(null); return; }
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Analiza estas reseñas de Google del negocio "${lead.name}".

RESEÑAS:
${reviews}

MI NEGOCIO: ${businessProfile.name} - ${businessProfile.description}
MI PROPUESTA DE VALOR: ${businessProfile.value_prop}

Responde SOLO con JSON válido sin backticks:
{
  "debilidades": ["..."],
  "fortalezas": ["..."],
  "pain_points_match": ["problemas que mi negocio resuelve"],
  "oportunidad_score": 85,
  "sales_pitch": "párrafo de venta personalizado"
}`
          }]
        })
      });
      const data = await resp.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setAnalysis(parsed);
      // Save score to lead
      setLeads(prev => prev.map(l => l.place_id === lead.place_id ? { ...l, aiScore: parsed.oportunidad_score } : l));
    } catch (e) { setAnalysis({ error: "Error: " + e.message }); }
    setAnalyzingId(null);
  }

  // ── Cold Email Generator ───────────────────────────
  async function generateEmail(lead) {
    setGeneratingEmail(true);
    setGeneratedEmail("");
    const pp = analysis?.pain_points_match?.join(", ") || "sin datos";
    const pitch = analysis?.sales_pitch || "";
    const contactEmail = lead.enrichment?.emails?.[0] || "[email del contacto]";
    const lang = emailLang === "es" ? "español" : emailLang === "pt" ? "portugués" : "inglés";
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Genera un email en frío profesional en ${lang} para "${lead.name}".

LEAD:
- Negocio: ${lead.name}
- Dirección: ${lead.formatted_address || ""}
- Rating: ${lead.rating}/5 (${lead.user_ratings_total} reseñas)
- Email contacto: ${contactEmail}
- Pain points: ${pp}

MI NEGOCIO:
- Empresa: ${businessProfile.name}
- Qué hacemos: ${businessProfile.description}
- Propuesta: ${businessProfile.value_prop}
- Pitch: ${pitch}

REGLAS:
- Tono: profesional pero cercano, estilo benchmarking informal
- Máximo 150 palabras
- No agresivo, no vendedor
- Menciona 1-2 problemas reales SIN decir "leímos sus reseñas"
- Propón llamada o café de 15 min
- Incluye Subject/Asunto en la primera línea

Responde SOLO el email listo.`
          }]
        })
      });
      const data = await resp.json();
      setGeneratedEmail(data.content?.map(i => i.text || "").join("") || "Error");
    } catch (e) { setGeneratedEmail("Error: " + e.message); }
    setGeneratingEmail(false);
  }

  // ── Toggle selection ───────────────────────────────
  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Stats ──────────────────────────────────────────
  const enrichedCount = leads.filter(l => l.enrichment?.status === "done").length;
  const totalEmails = leads.reduce((a, l) => a + (l.enrichment?.emails?.length || 0), 0);
  const avgRating = leads.length ? (leads.reduce((a, l) => a + (l.rating || 0), 0) / leads.length).toFixed(1) : 0;

  // ── Social icon helper ─────────────────────────────
  const socialIcon = {
    facebook: "📘", instagram: "📸", linkedin: "💼",
    twitter: "🐦", tiktok: "🎵", youtube: "▶️",
  };
  const socialUrl = {
    facebook: u => `https://facebook.com/${u}`,
    instagram: u => `https://instagram.com/${u}`,
    linkedin: u => `https://linkedin.com/company/${u}`,
    twitter: u => `https://x.com/${u}`,
    tiktok: u => `https://tiktok.com/@${u}`,
    youtube: u => `https://youtube.com/@${u}`,
  };

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: "#0a0e17", color: "#e2e8f0", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 999,
          background: "#1e293b", border: "1px solid #334155", borderRadius: 10,
          padding: "10px 20px", fontSize: 13, color: "#cbd5e1", maxWidth: "90vw",
          animation: "fadeIn .3s ease", boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
        }}>{toast}</div>
      )}

      {/* ═══ HEADER ═══ */}
      <header style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
        borderBottom: "1px solid #1e293b", padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700,
          }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.5 }}>LeadFinder</span>
          {demoMode && <Badge color="#422006" textColor="#fbbf24">DEMO</Badge>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {leads.length > 0 && (
            <button onClick={() => downloadCSV(leads)} style={{
              background: "none", border: "1px solid #334155", borderRadius: 8,
              color: "#94a3b8", padding: "4px 10px", fontSize: 11, cursor: "pointer",
            }}>📥 CSV</button>
          )}
          <button onClick={() => { setView("settings"); setSelectedLead(null); }} style={{
            background: "none", border: "1px solid #334155", borderRadius: 8,
            color: "#94a3b8", padding: "4px 10px", fontSize: 11, cursor: "pointer",
          }}>⚙</button>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 10px 60px" }}>

        {/* ═══ SETTINGS ═══ */}
        {view === "settings" && (
          <div style={{ maxWidth: 540, margin: "0 auto" }}>
            <button onClick={() => setView("search")} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 13, cursor: "pointer", marginBottom: 14, padding: 0 }}>← Volver</button>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Configuración</h2>

            {/* API Key */}
            <div style={{ background: "#111827", borderRadius: 10, padding: 14, marginBottom: 14, border: "1px solid #1e293b" }}>
              <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Google Places API Key</label>
              <p style={{ fontSize: 11, color: "#475569", margin: "3px 0 8px" }}>Google da $200/mes gratis → ~11.000 búsquedas. Sin key = modo demo.</p>
              <input type="password" value={googleKey} onChange={e => setGoogleKey(e.target.value)} placeholder="AIza..."
                style={{ width: "100%", background: "#0a0e17", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => {
                  try { window.localStorage?.setItem?.(SK_API, googleKey); } catch {}
                  setDemoMode(!googleKey); showToast(googleKey ? "Key guardada ✓" : "Modo demo");
                }} style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Guardar</button>
                <button onClick={() => { setGoogleKey(""); setDemoMode(true); showToast("Demo activado"); }} style={{ background: "none", border: "1px solid #334155", borderRadius: 6, padding: "6px 16px", fontSize: 12, color: "#94a3b8", cursor: "pointer" }}>Demo</button>
              </div>
            </div>

            {/* Business Profile */}
            <div style={{ background: "#111827", borderRadius: 10, padding: 14, border: "1px solid #1e293b" }}>
              <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Tu negocio</label>
              <p style={{ fontSize: 11, color: "#475569", margin: "3px 0 8px" }}>La IA cruza esto con los pain points de cada lead.</p>
              {[
                { key: "name", label: "Empresa", rows: 1 },
                { key: "description", label: "Qué haces", rows: 2 },
                { key: "value_prop", label: "Propuesta de valor", rows: 2 },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>{f.label}</label>
                  <textarea value={businessProfile[f.key]} onChange={e => setBusinessProfile(p => ({ ...p, [f.key]: e.target.value }))} rows={f.rows}
                    style={{ width: "100%", background: "#0a0e17", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#e2e8f0", fontSize: 13, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              ))}
              <button onClick={() => {
                try { window.localStorage?.setItem?.(SK_PROF, JSON.stringify(businessProfile)); } catch {}
                showToast("Perfil guardado ✓");
              }} style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Guardar</button>
            </div>
          </div>
        )}

        {/* ═══ SEARCH VIEW ═══ */}
        {view === "search" && !selectedLead && (
          <>
            {/* Search Bar */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tipo de negocio..." onKeyDown={e => e.key === "Enter" && searchPlaces()}
                style={{ flex: 2, minWidth: 150, background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 14 }} />
              <input value={searchLocation} onChange={e => setSearchLocation(e.target.value)} placeholder="Ciudad..." onKeyDown={e => e.key === "Enter" && searchPlaces()}
                style={{ flex: 1, minWidth: 100, background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 14 }} />
              <button onClick={searchPlaces} disabled={loading} style={{
                background: loading ? "#1e293b" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                color: "white", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: loading ? "wait" : "pointer",
              }}>{loading ? "..." : "🔍"}</button>
            </div>

            {/* Stats bar */}
            {leads.length > 0 && (
              <div style={{
                display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center",
                padding: "8px 12px", background: "#111827", borderRadius: 8, border: "1px solid #1e293b",
              }}>
                <Badge color="#172554" textColor="#60a5fa">{leads.length} leads</Badge>
                <Badge color="#14532d" textColor="#4ade80">{totalEmails} emails</Badge>
                <Badge color="#1e293b" textColor="#94a3b8">⭐ {avgRating} avg</Badge>
                <Badge color="#1e293b" textColor="#94a3b8">{enrichedCount}/{leads.length} enriquecidos</Badge>
                <div style={{ flex: 1 }} />
                <button onClick={enrichAll} disabled={enrichingId} style={{
                  background: "none", border: "1px solid #334155", borderRadius: 6,
                  padding: "3px 10px", fontSize: 11, color: "#94a3b8", cursor: "pointer",
                }}>🔄 Enriquecer todos</button>
                <button onClick={() => downloadCSV(leads)} style={{
                  background: "none", border: "1px solid #334155", borderRadius: 6,
                  padding: "3px 10px", fontSize: 11, color: "#94a3b8", cursor: "pointer",
                }}>📥 Exportar CSV</button>
              </div>
            )}

            {/* Lead List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {leads.map((lead, i) => (
                <div key={lead.place_id} style={{
                  background: "#111827", border: "1px solid #1e293b", borderRadius: 10,
                  padding: "10px 14px", cursor: "pointer", transition: "border-color 0.15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#3b82f6"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#1e293b"}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }} onClick={() => { setSelectedLead(lead); setAnalysis(null); setGeneratedEmail(""); setActiveTab("intelligence"); }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{lead.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{lead.formatted_address || ""}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <Stars rating={lead.rating || 0} />
                        <span style={{ fontSize: 11, color: "#64748b" }}>{lead.user_ratings_total?.toLocaleString()} rev</span>
                        {lead.formatted_phone_number && <Badge>📞 {lead.formatted_phone_number}</Badge>}
                        {lead.website && <Badge color="#172554" textColor="#60a5fa">🌐</Badge>}
                        {(lead.enrichment?.emails?.length || 0) > 0 && (
                          <Badge color="#14532d" textColor="#4ade80">✉ {lead.enrichment.emails.length}</Badge>
                        )}
                        {Object.keys(lead.enrichment?.socials || {}).length > 0 && (
                          <Badge color="#3b0764" textColor="#c084fc">
                            {Object.keys(lead.enrichment.socials).map(k => socialIcon[k] || "🔗").join("")}
                          </Badge>
                        )}
                        {lead.aiScore && <Badge color="#422006" textColor="#fbbf24">🧠 {lead.aiScore}</Badge>}
                        {enrichingId === lead.place_id && <Badge color="#1e293b" textColor="#94a3b8">⏳</Badge>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                      {lead.website && lead.enrichment?.status !== "done" && (
                        <button onClick={e => { e.stopPropagation(); enrichLead(lead, i); }} disabled={enrichingId === lead.place_id} style={{
                          background: "#1e293b", border: "1px solid #334155", borderRadius: 6,
                          padding: "3px 8px", fontSize: 10, color: "#94a3b8", cursor: "pointer", whiteSpace: "nowrap",
                        }}>{enrichingId === lead.place_id ? "..." : "🔍 Enriquecer"}</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {leads.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#475569" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Busca negocios para prospectar</div>
                <div style={{ fontSize: 12 }}>
                  Ej: "hoteles 5 estrellas" + "Málaga"
                  {demoMode && <span style={{ color: "#fbbf24" }}> • Modo demo activo</span>}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ DETAIL VIEW ═══ */}
        {view === "search" && selectedLead && (
          <div>
            <button onClick={() => setSelectedLead(null)} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 13, cursor: "pointer", marginBottom: 10, padding: 0 }}>← Resultados</button>

            {/* Lead Header */}
            <div style={{ background: "#111827", borderRadius: 10, padding: 14, border: "1px solid #1e293b", marginBottom: 10 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 3px" }}>{selectedLead.name}</h2>
              <div style={{ fontSize: 12, color: "#64748b" }}>{selectedLead.formatted_address}</div>
              <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Stars rating={selectedLead.rating || 0} />
                <span style={{ fontSize: 11, color: "#64748b" }}>{selectedLead.user_ratings_total?.toLocaleString()} reseñas</span>
                {selectedLead.formatted_phone_number && <span style={{ fontSize: 12, color: "#94a3b8" }}>📞 {selectedLead.formatted_phone_number}</span>}
                {selectedLead.website && <a href={selectedLead.website} target="_blank" rel="noopener" style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none" }}>🌐 Web ↗</a>}
              </div>

              {/* Enrichment data */}
              {selectedLead.enrichment?.status === "done" && (
                <div style={{ marginTop: 10, padding: 10, background: "#0a0e17", borderRadius: 8 }}>
                  {selectedLead.enrichment.emails.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>EMAILS: </span>
                      {selectedLead.enrichment.emails.map((em, i) => (
                        <a key={i} href={`mailto:${em}`} style={{ fontSize: 12, color: "#4ade80", marginRight: 8, textDecoration: "none" }}>{em}</a>
                      ))}
                    </div>
                  )}
                  {Object.keys(selectedLead.enrichment.socials).length > 0 && (
                    <div>
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>REDES: </span>
                      {Object.entries(selectedLead.enrichment.socials).map(([k, v]) => (
                        <a key={k} href={socialUrl[k]?.(v) || "#"} target="_blank" rel="noopener"
                          style={{ fontSize: 12, color: "#c084fc", marginRight: 10, textDecoration: "none" }}>
                          {socialIcon[k] || "🔗"} {v}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedLead.enrichment?.status !== "done" && selectedLead.website && (
                <button onClick={() => enrichLead(selectedLead)} disabled={enrichingId === selectedLead.place_id} style={{
                  marginTop: 8, background: "#1e293b", border: "1px solid #334155", borderRadius: 6,
                  padding: "5px 14px", fontSize: 12, color: "#94a3b8", cursor: "pointer",
                }}>{enrichingId === selectedLead.place_id ? "Buscando emails y redes..." : "🔍 Extraer emails y redes sociales"}</button>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
              <Pill active={activeTab === "intelligence"} onClick={() => setActiveTab("intelligence")}>🧠 Inteligencia</Pill>
              <Pill active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")}>💬 Reseñas</Pill>
              <Pill active={activeTab === "email"} onClick={() => setActiveTab("email")}>✉️ Email</Pill>
            </div>

            {/* ── Tab: Intelligence ── */}
            {activeTab === "intelligence" && (
              <div style={{ background: "#111827", borderRadius: 10, padding: 14, border: "1px solid #1e293b" }}>
                {!analysis && analyzingId !== selectedLead.place_id && (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <p style={{ color: "#64748b", fontSize: 13, marginBottom: 10 }}>La IA analizará reseñas y cruzará pain points con tu oferta.</p>
                    <button onClick={() => analyzeReviews(selectedLead)} style={{
                      background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                      color: "white", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}>🧠 Analizar con IA</button>
                  </div>
                )}
                {analyzingId === selectedLead.place_id && (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b" }}>
                    <div style={{ fontSize: 22, marginBottom: 6, animation: "pulse 1.5s infinite" }}>🧠</div>
                    Analizando reseñas...
                  </div>
                )}
                {analysis && !analysis.error && (
                  <div>
                    {/* Score */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: 10, background: "#0a0e17", borderRadius: 8 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%",
                        background: `conic-gradient(#8b5cf6 ${(analysis.oportunidad_score || 0) * 3.6}deg, #1e293b 0deg)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#0a0e17", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#8b5cf6" }}>
                          {analysis.oportunidad_score}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>Score de oportunidad</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>Match entre sus problemas y tu oferta</div>
                      </div>
                    </div>

                    {analysis.pain_points_match?.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <SectionTitle icon="🎯" label="Pain Points que resuelves" color="#f59e0b" />
                        {analysis.pain_points_match.map((p, i) => (
                          <div key={i} style={{ fontSize: 13, color: "#fbbf24", padding: "3px 0 3px 12px", borderLeft: "2px solid #f59e0b" }}>{p}</div>
                        ))}
                      </div>
                    )}
                    {analysis.debilidades?.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <SectionTitle icon="⚠" label="Debilidades" color="#ef4444" />
                        {analysis.debilidades.map((d, i) => (
                          <div key={i} style={{ fontSize: 13, color: "#94a3b8", padding: "3px 0 3px 12px", borderLeft: "2px solid #ef4444" }}>{d}</div>
                        ))}
                      </div>
                    )}
                    {analysis.fortalezas?.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <SectionTitle icon="✅" label="Fortalezas" color="#22c55e" />
                        {analysis.fortalezas.map((f, i) => (
                          <div key={i} style={{ fontSize: 13, color: "#94a3b8", padding: "3px 0 3px 12px", borderLeft: "2px solid #22c55e" }}>{f}</div>
                        ))}
                      </div>
                    )}
                    {analysis.sales_pitch && (
                      <div style={{ marginTop: 12, padding: 12, background: "#172554", borderRadius: 8, border: "1px solid #1e3a8a" }}>
                        <SectionTitle icon="🔥" label="Sales Pitch" color="#60a5fa" />
                        <div style={{ fontSize: 13, color: "#93c5fd", lineHeight: 1.5 }}>{analysis.sales_pitch}</div>
                      </div>
                    )}
                  </div>
                )}
                {analysis?.error && <div style={{ color: "#ef4444", fontSize: 13, textAlign: "center", padding: 16 }}>{analysis.error}</div>}
              </div>
            )}

            {/* ── Tab: Reviews ── */}
            {activeTab === "reviews" && (
              <div style={{ background: "#111827", borderRadius: 10, padding: 14, border: "1px solid #1e293b" }}>
                {(selectedLead.reviews || []).length === 0 ? (
                  <div style={{ color: "#64748b", textAlign: "center", padding: 16, fontSize: 13 }}>Sin reseñas cargadas</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedLead.reviews.map((r, i) => (
                      <div key={i} style={{ padding: 10, background: "#0a0e17", borderRadius: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{r.author_name}</span>
                          <Stars rating={r.rating} />
                        </div>
                        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>{r.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Email ── */}
            {activeTab === "email" && (
              <div style={{ background: "#111827", borderRadius: 10, padding: 14, border: "1px solid #1e293b" }}>
                {!analysis ? (
                  <div style={{ color: "#64748b", textAlign: "center", padding: 16, fontSize: 13 }}>Primero analiza las reseñas en "Inteligencia".</div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>Idioma:</span>
                      {[{ id: "es", l: "🇪🇸" }, { id: "pt", l: "🇧🇷" }, { id: "en", l: "🇬🇧" }].map(x => (
                        <Pill key={x.id} active={emailLang === x.id} onClick={() => setEmailLang(x.id)}>{x.l}</Pill>
                      ))}
                      <div style={{ flex: 1 }} />
                      <button onClick={() => generateEmail(selectedLead)} disabled={generatingEmail} style={{
                        background: generatingEmail ? "#1e293b" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                        color: "white", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: generatingEmail ? "wait" : "pointer",
                      }}>{generatingEmail ? "Generando..." : "✉️ Generar"}</button>
                    </div>
                    {generatedEmail && (
                      <div>
                        {/* Email preview */}
                        <div style={{
                          background: "#0a0e17", borderRadius: 8, padding: 14,
                          border: "1px solid #1e293b", marginBottom: 10,
                        }}>
                          {/* Render email with To field if we have an email */}
                          {selectedLead.enrichment?.emails?.[0] && (
                            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, padding: "6px 10px", background: "#111827", borderRadius: 6 }}>
                              <strong style={{ color: "#94a3b8" }}>Para:</strong> {selectedLead.enrichment.emails[0]}
                            </div>
                          )}
                          <pre style={{
                            fontSize: 13, color: "#cbd5e1", lineHeight: 1.6,
                            whiteSpace: "pre-wrap", wordBreak: "break-word",
                            fontFamily: "'DM Sans', sans-serif", margin: 0,
                            maxHeight: 350, overflow: "auto",
                          }}>{generatedEmail}</pre>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button onClick={() => { navigator.clipboard?.writeText(generatedEmail); showToast("Copiado ✓"); }} style={{
                            background: "#334155", color: "#e2e8f0", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 12, cursor: "pointer",
                          }}>📋 Copiar</button>
                          <button onClick={() => {
                            const lines = generatedEmail.split("\n");
                            const sl = lines.find(l => /^(subject|asunto|assunto)/i.test(l)) || "";
                            const subject = sl.replace(/^(subject|asunto|assunto):?\s*/i, "");
                            const body = lines.filter(l => l !== sl).join("\n");
                            const to = selectedLead.enrichment?.emails?.[0] || "";
                            window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                          }} style={{
                            background: "#1e3a8a", color: "#93c5fd", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 12, cursor: "pointer",
                          }}>📧 Abrir en Mail</button>
                          {selectedLead.enrichment?.emails?.[0] && (
                            <button onClick={() => {
                              const lines = generatedEmail.split("\n");
                              const sl = lines.find(l => /^(subject|asunto|assunto)/i.test(l)) || "";
                              const subject = sl.replace(/^(subject|asunto|assunto):?\s*/i, "");
                              const body = lines.filter(l => l !== sl).join("\n");
                              window.open(`https://mail.google.com/mail/?view=cm&to=${selectedLead.enrichment.emails[0]}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                            }} style={{
                              background: "#14532d", color: "#4ade80", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 12, cursor: "pointer",
                            }}>Gmail ↗</button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        input::placeholder, textarea::placeholder { color: #475569; }
        input:focus, textarea:focus { outline: none; border-color: #3b82f6 !important; }
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0a0e17; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        a:hover { opacity: 0.8; }
      `}</style>
    </div>
  );
}
