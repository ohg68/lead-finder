import { useState, useEffect } from "react";

const SK_API = "lf3_gkey";
const SK_PROF = "lf3_prof";
const PROXIES = [
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];
async function proxyFetch(url, timeout = 10000) {
  for (const mkUrl of PROXIES) {
    try {
      const r = await fetch(mkUrl(url), { signal: AbortSignal.timeout(timeout) });
      if (r.ok) return await r.text();
    } catch {}
  }
  return "";
}
const SOURCES_META = {
  google: { name: "Google Maps", icon: "\u{1F5FA}\uFE0F", color: "#4285f4" },
  booking: { name: "Booking", icon: "\u{1F535}", color: "#003580" },
  escapadarural: { name: "EscapadaRural", icon: "\u{1F3E1}", color: "#5a9e3f" },
  casasrurales: { name: "CasasRurales", icon: "\u{1F3D8}\uFE0F", color: "#ff7043" },
  tuscasasrurales: { name: "TusCasasRurales", icon: "\u{1F3E0}", color: "#26a69a" },
};

function Stars({ rating }) {
  if (!rating) return null;
  const f = Math.floor(rating), h = rating - f >= 0.3;
  const col = rating >= 4.5 ? "#22c55e" : rating >= 3.5 ? "#eab308" : rating >= 2.5 ? "#f97316" : "#ef4444";
  return (<span style={{ color: col, letterSpacing: 1, fontSize: 13 }}>{"★".repeat(f)}{h ? "½" : ""}{"☆".repeat(5 - f - (h ? 1 : 0))}<span style={{ color: "#94a3b8", marginLeft: 4, fontSize: 11, fontFamily: "monospace" }}>{rating.toFixed(1)}</span></span>);
}
function Badge({ children, bg = "#1e293b", fg = "#94a3b8", onClick }) {
  return <span onClick={onClick} style={{ fontSize: 10, background: bg, padding: "2px 7px", borderRadius: 5, color: fg, whiteSpace: "nowrap", cursor: onClick ? "pointer" : "default", display: "inline-block" }}>{children}</span>;
}
function Pill({ active, onClick, children }) {
  return <button onClick={onClick} style={{ padding: "5px 11px", fontSize: 11, fontWeight: 600, borderRadius: 7, background: active ? "#1e293b" : "transparent", border: active ? "1px solid #334155" : "1px solid transparent", color: active ? "#e2e8f0" : "#64748b", cursor: "pointer" }}>{children}</button>;
}

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const SOCIAL_RE = [
  { key: "facebook", re: /(?:facebook\.com|fb\.com)\/([a-zA-Z0-9._\-]+)/i },
  { key: "instagram", re: /instagram\.com\/([a-zA-Z0-9._]+)/i },
  { key: "linkedin", re: /linkedin\.com\/(?:company|in)\/([a-zA-Z0-9._\-]+)/i },
  { key: "twitter", re: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9._]+)/i },
];
const socialIcon = { facebook: "\u{1F4D8}", instagram: "\u{1F4F8}", linkedin: "\u{1F4BC}", twitter: "\u{1F426}" };
const socialUrl = { facebook: u => `https://facebook.com/${u}`, instagram: u => `https://instagram.com/${u}`, linkedin: u => `https://linkedin.com/company/${u}`, twitter: u => `https://x.com/${u}` };

function extractContacts(html) {
  const junk = /\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i;
  const emails = [...new Set((html.match(EMAIL_RE) || []).filter(e => !junk.test(e) && !e.includes("sentry") && !e.includes("webpack")))].slice(0, 8);
  const socials = {};
  SOCIAL_RE.forEach(({ key, re }) => { const m = html.match(re); if (m && m[1] !== "sharer" && m[1] !== "share") socials[key] = m[1]; });
  const phoneRe = /(?:\+34|\+351)[\s.\-]?[0-9]{2,3}[\s.\-]?[0-9]{3}[\s.\-]?[0-9]{3,4}/g;
  const phones = [...new Set((html.match(phoneRe) || []).map(p => p.replace(/[\s.\-]/g, "")))].slice(0, 3);
  return { emails, socials, phones };
}

function leadsToCSV(leads) {
  const h = ["Nombre","Direcci\u00f3n","Fuente","Tel\u00e9fono","Web","Rating","Emails","Facebook","Instagram","LinkedIn","Precio","Score IA","Parada Ruta"];
  const rows = leads.map(l => { const e = l.enrichment || {}; const s = e.socials || {}; return [l.name,l.address||"",l.source||"",l.phone||"",l.website||"",l.rating||"",(e.emails||[]).join("; "),s.facebook||"",s.instagram||"",s.linkedin||"",l.price||"",l.aiScore||"",l.routeCity||""]; });
  const esc = v => `"${String(v).replace(/"/g,'""')}"`;
  return [h.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
}
function downloadCSV(leads) {
  const blob = new Blob(["\uFEFF" + leadsToCSV(leads)], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `leads_${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

// Scrapers
async function scrapeEscapadaRural(loc) {
  const slug = loc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"-");
  try {
    const html = await proxyFetch(`https://www.escapadarural.com/casas-rurales/${slug}`);
    if(!html) return [];
    const ms = [...html.matchAll(/<h2[^>]*>\s*(?:<a[^>]*href="(\/casa-rural\/[^"]+)"[^>]*>)?(.*?)(?:<\/a>)?<\/h2>/gi)];
    const ps = [...html.matchAll(/(\d+)\u20ac/g)];
    return ms.slice(0,12).map((m,i) => ({
      id:`er_${i}_${Date.now()}`, name:m[2].replace(/<[^>]*>/g,"").trim(), address:loc,
      website:m[1]?`https://www.escapadarural.com${m[1]}`:"", source:"escapadarural",
      rating:null, phone:"", price:ps[i]?`${ps[i][1]}\u20ac/noche`:"", reviews:[],
      enrichment:{emails:[],socials:{},status:"pending"},
    }));
  } catch(e) { console.log("ER:",e); return []; }
}
async function scrapeBooking(loc) {
  const slug = loc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"-");
  try {
    const html = await proxyFetch(`https://www.booking.com/country-houses/city/es/${slug}.html`);
    if(!html) return [];
    const links = [...new Set([...html.matchAll(/href="(\/hotel\/es\/[^"?]+)/gi)].map(m=>m[1]))];
    return links.slice(0,12).map((l,i) => ({
      id:`bk_${i}_${Date.now()}`, name:l.split("/").pop().replace(/-/g," ").replace(/\.html$/,"").replace(/^\w/,c=>c.toUpperCase()),
      address:loc, website:`https://www.booking.com${l}`, source:"booking",
      rating:null, phone:"", price:"", reviews:[],
      enrichment:{emails:[],socials:{},status:"pending"},
    }));
  } catch(e) { console.log("BK:",e); return []; }
}
async function scrapeCasasRurales(loc) {
  const slug = loc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"-");
  try {
    const html = await proxyFetch(`https://www.casasrurales.net/casas-rurales/${slug}`);
    if(!html) return [];
    const ms = [...html.matchAll(/href="(\/alojamiento\/[^"]+)"[^>]*>([^<]+)/gi)];
    return ms.slice(0,10).map((m,i) => ({
      id:`cr_${i}_${Date.now()}`, name:m[2].trim(), address:loc,
      website:`https://www.casasrurales.net${m[1]}`, source:"casasrurales",
      rating:null, phone:"", price:"", reviews:[],
      enrichment:{emails:[],socials:{},status:"pending"},
    }));
  } catch(e) { return []; }
}
async function searchGoogle(query, loc, key) {
  if (!key) return [];
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query+" in "+loc)}&key=${key}&language=es`);
    const d = await r.json();
    if (!d.results) return [];
    const details = await Promise.all(d.results.slice(0,15).map(async p => {
      try { const dr = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,reviews,types&key=${key}&language=es&reviews_sort=newest`); const dd = await dr.json(); return {...dd.result,place_id:p.place_id}; } catch { return p; }
    }));
    return details.map((p,i) => ({
      id:`g_${p.place_id||i}`, name:p.name, address:p.formatted_address||"",
      website:p.website||"", source:"google", rating:p.rating||null,
      reviewCount:p.user_ratings_total||0, phone:p.formatted_phone_number||"",
      price:"", reviews:p.reviews||[],
      enrichment:{emails:[],socials:{},status:"pending"},
    }));
  } catch(e) { return []; }
}

const DEMO_LEADS = [
  {id:"d1",name:"Hotel Meli\u00e1 Costa del Sol",address:"Torremolinos, M\u00e1laga",source:"google",rating:4.1,reviewCount:3842,phone:"+34 952 386 677",website:"https://melia.com",price:"",reviews:[{author_name:"Carlos M.",rating:2,text:"La pulsera de la piscina no funcionaba. 3 veces a recepci\u00f3n."},{author_name:"Sophie L.",rating:3,text:"Check-in lento. Deber\u00edan tener sistema digital."},{author_name:"Pedro R.",rating:4,text:"Buen hotel pero sistema de pago en piscina bar horrible."},{author_name:"Marco V.",rating:2,text:"Perd\u00ed tarjeta acceso 2 veces. No hay vinculaci\u00f3n al m\u00f3vil."}],enrichment:{emails:["reservas@melia.com"],socials:{instagram:"meliahotels",linkedin:"melia-hotels"},status:"done"}},
  {id:"d2",name:"Casa Rural Villa Lucrecia",address:"Lantejuela, Sevilla",source:"escapadarural",rating:null,phone:"",website:"https://escapadarural.com/casa-rural/sevilla/villa-lucrecia",price:"54\u20ac/noche",reviews:[],enrichment:{emails:[],socials:{},status:"pending"}},
  {id:"d3",name:"Barcel\u00f3 M\u00e1laga",address:"H\u00e9roe de Sostoa 2, M\u00e1laga",source:"google",rating:4.3,reviewCount:5201,phone:"+34 952 047 494",website:"https://barcelo.com",price:"",reviews:[{author_name:"Luis G.",rating:3,text:"Evento en sal\u00f3n: caos con acreditaciones. Todo manual."},{author_name:"James W.",rating:2,text:"Lost key card twice. Replacement took 20 min each."}],enrichment:{emails:["info@barcelomalaga.com"],socials:{instagram:"barcelohotels"},status:"done"}},
  {id:"d4",name:"Cortijo Dominguez",address:"Lucena, C\u00f3rdoba",source:"escapadarural",rating:null,phone:"",website:"https://escapadarural.com/casa-rural/cordoba/cortijo-dominguez",price:"38\u20ac/noche",reviews:[],enrichment:{emails:[],socials:{},status:"pending"}},
  {id:"d5",name:"Pestana CR7 Lifestyle",address:"Plaza Marina, M\u00e1laga",source:"google",rating:3.9,reviewCount:1567,phone:"+34 952 001 200",website:"https://pestana.com",price:"",reviews:[{author_name:"Jo\u00e3o M.",rating:2,text:"Sistema cashless da piscina \u00e9 terr\u00edvel."},{author_name:"Tom H.",rating:4,text:"Wristband for pool access kept deactivating."}],enrichment:{emails:["reservas@pestana.com"],socials:{instagram:"pestanacr7"},status:"done"}},
  {id:"d6",name:"Casa Rural El Nacimiento",address:"M\u00e1laga",source:"booking",rating:9.2,phone:"",website:"https://booking.com/hotel/es/casa-rural-el-nacimiento",price:"96\u20ac/noche",reviews:[],enrichment:{emails:[],socials:{},status:"pending"}},
  {id:"d7",name:"AC Hotel M\u00e1laga Palacio",address:"Cortina del Muelle 1, M\u00e1laga",source:"google",rating:4.2,reviewCount:4320,phone:"+34 952 215 185",website:"https://marriott.com",price:"",reviews:[{author_name:"Fernando A.",rating:2,text:"Minibar no acepta tarjeta. Absurdo."},{author_name:"Pablo C.",rating:3,text:"Eventos corporativos necesitan mejor control accesos."}],enrichment:{emails:["acmalaga@marriott.com"],socials:{linkedin:"ac-hotels"},status:"done"}},
  {id:"d8",name:"Finca Llano de Fe",address:"M\u00e1laga rural",source:"booking",rating:9.0,phone:"",website:"",price:"155\u20ac/noche",reviews:[],enrichment:{emails:[],socials:{},status:"pending"}},
];

export default function App() {
  const [view,setView]=useState("search");
  const [gKey,setGKey]=useState("");
  const [profile,setProfile]=useState({name:"Brasgraphics",description:"Fabricante brasile\u00f1o de pulseras RFID/NFC cashless y tarjetas de acceso para hoteles y eventos. B2B en Pen\u00ednsula Ib\u00e9rica.",value_prop:"Pulseras RFID resistentes al agua, chip NFC dual para pagos cashless y control de acceso. Reducen colas 60% y aumentan gasto por hu\u00e9sped 25%."});
  const [leads,setLeads]=useState([]);
  const [sel,setSel]=useState(null);
  const [query,setQuery]=useState("");
  const [loc,setLoc]=useState("");
  const [loading,setLoading]=useState(false);
  const [loadMsg,setLoadMsg]=useState("");
  const [analysis,setAnalysis]=useState(null);
  const [azId,setAzId]=useState(null);
  const [mail,setMail]=useState("");
  const [genMail,setGenMail]=useState(false);
  const [demo,setDemo]=useState(true);
  const [tab,setTab]=useState("intelligence");
  const [eLang,setELang]=useState("es");
  const [toast,setToast]=useState(null);
  const [enrId,setEnrId]=useState(null);
  const [sources,setSources]=useState(["google","escapadarural","booking","casasrurales"]);
  const [rOrigin,setROrigin]=useState("El Vendrell");
  const [rDest,setRDest]=useState("Lisboa");
  const [rStops,setRStops]=useState(["Zaragoza","Madrid","Badajoz"]);
  const [rQuery,setRQuery]=useState("hoteles turismo rural");

  useEffect(()=>{try{const k=localStorage?.getItem?.(SK_API);if(k){setGKey(k);setDemo(false);}}catch{}; try{const p=localStorage?.getItem?.(SK_PROF);if(p)setProfile(JSON.parse(p));}catch{}},[]);
  function showToast(m){setToast(m);setTimeout(()=>setToast(null),3000);}
  function toggleSrc(s){setSources(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);}

  async function multiSearch(){
    if(demo){setLoading(true);await new Promise(r=>setTimeout(r,500));setLeads(DEMO_LEADS);setLoading(false);return;}
    setLoading(true);setLeads([]);let all=[];const l=loc||"m\u00e1laga";
    if(sources.includes("google")&&gKey){setLoadMsg("Google Maps...");all.push(...await searchGoogle(query||"hoteles",l,gKey));}
    if(sources.includes("escapadarural")){setLoadMsg("EscapadaRural...");all.push(...await scrapeEscapadaRural(l));}
    if(sources.includes("booking")){setLoadMsg("Booking...");all.push(...await scrapeBooking(l));}
    if(sources.includes("casasrurales")){setLoadMsg("CasasRurales...");all.push(...await scrapeCasasRurales(l));}
    const seen=new Set();const deduped=all.filter(l=>{const k=l.name.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,18);if(seen.has(k))return false;seen.add(k);return true;});
    setLeads(deduped);setLoading(false);setLoadMsg("");showToast(`${deduped.length} resultados`);
  }

  async function routeSearch(){
    setLoading(true);setLeads([]);setView("search");
    const wp=[rOrigin,...rStops.filter(Boolean),rDest].filter(Boolean);const all=[];
    for(const city of wp){
      setLoadMsg(`\u{1F4CD} ${city}...`);
      if(sources.includes("google")&&gKey)all.push(...(await searchGoogle(rQuery,city,gKey)).map(l=>({...l,routeCity:city})));
      if(sources.includes("escapadarural"))all.push(...(await scrapeEscapadaRural(city)).map(l=>({...l,routeCity:city})));
      if(sources.includes("booking"))all.push(...(await scrapeBooking(city)).map(l=>({...l,routeCity:city})));
      await new Promise(r=>setTimeout(r,300));
    }
    setLeads(all);setLoading(false);setLoadMsg("");showToast(`${all.length} alojamientos en ${wp.length} paradas`);
  }

  async function enrichLead(lead){
    if(!lead.website){showToast("Sin web");return;}setEnrId(lead.id);
    try{
      const html=await proxyFetch(lead.website);
      let{emails,socials,phones}=extractContacts(html||"");
      try{const base=new URL(lead.website);for(const p of["/contact","/contacto","/about"]){try{const ch=await proxyFetch(base.origin+p,6000);if(ch){const ex=extractContacts(ch);emails=[...new Set([...emails,...ex.emails])];Object.assign(socials,ex.socials);phones=[...new Set([...phones,...ex.phones])];}}catch{}}}catch{}
      const en={emails:emails.slice(0,8),socials,phones:phones.slice(0,3),status:"done"};
      setLeads(p=>p.map(l=>l.id===lead.id?{...l,enrichment:en,phone:phones[0]||l.phone}:l));
      if(sel?.id===lead.id)setSel(p=>({...p,enrichment:en,phone:phones[0]||p.phone}));
      showToast(`${emails.length} emails + ${Object.keys(socials).length} redes`);
    }catch(e){setLeads(p=>p.map(l=>l.id===lead.id?{...l,enrichment:{...l.enrichment,status:"error"}}:l));}
    setEnrId(null);
  }
  async function enrichAll(){const pend=leads.filter(l=>l.website&&l.enrichment?.status!=="done");for(const l of pend){await enrichLead(l);await new Promise(r=>setTimeout(r,400));}showToast("Completado");}

  async function analyzeReviews(lead){
    setAzId(lead.id);setAnalysis(null);const revs=(lead.reviews||[]).map(r=>`[${r.rating}\u2605] ${r.author_name}: ${r.text}`).join("\n");
    if(!revs){setAnalysis({error:"Sin rese\u00f1as."});setAzId(null);return;}
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`Analiza rese\u00f1as de "${lead.name}".\n\nRESE\u00d1AS:\n${revs}\n\nMI NEGOCIO: ${profile.name} - ${profile.description}\nPROPUESTA: ${profile.value_prop}\n\nResponde SOLO JSON sin backticks:\n{"debilidades":["..."],"fortalezas":["..."],"pain_points_match":["problemas que mi negocio resuelve"],"oportunidad_score":85,"sales_pitch":"p\u00e1rrafo personalizado"}`}]})});
    const d=await r.json();const txt=d.content?.map(i=>i.text||"").join("")||"";const parsed=JSON.parse(txt.replace(/```json|```/g,"").trim());
    setAnalysis(parsed);setLeads(p=>p.map(l=>l.id===lead.id?{...l,aiScore:parsed.oportunidad_score}:l));}catch(e){setAnalysis({error:"Error: "+e.message});}setAzId(null);
  }

  async function generateEmail(lead){
    setGenMail(true);setMail("");const pp=analysis?.pain_points_match?.join(", ")||"sin datos";const pitch=analysis?.sales_pitch||"";const to=lead.enrichment?.emails?.[0]||"";const lang=eLang==="es"?"espa\u00f1ol":eLang==="pt"?"portugu\u00e9s":"ingl\u00e9s";
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`Email en fr\u00edo en ${lang} para "${lead.name}".\nLEAD: ${lead.name}, ${lead.address}, Rating ${lead.rating}/5, Pain points: ${pp}\nEmail: ${to}\nMI NEGOCIO: ${profile.name} - ${profile.description}\nPropuesta: ${profile.value_prop}\nPitch: ${pitch}\nREGLAS: profesional cercano, max 150 palabras, no agresivo, menciona 1-2 problemas sin decir "le\u00edmos rese\u00f1as", prop\u00f3n caf\u00e9 15min, incluye Asunto.\nSolo el email listo.`}]})});
    const d=await r.json();setMail(d.content?.map(i=>i.text||"").join("")||"Error");}catch(e){setMail("Error: "+e.message);}setGenMail(false);
  }

  const enriched=leads.filter(l=>l.enrichment?.status==="done").length;
  const totalEmails=leads.reduce((a,l)=>a+(l.enrichment?.emails?.length||0),0);
  const srcCounts={};leads.forEach(l=>{srcCounts[l.source]=(srcCounts[l.source]||0)+1;});

  return (
    <div style={{minHeight:"100vh",background:"#0a0e17",color:"#e2e8f0",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      {toast&&<div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:999,background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"8px 18px",fontSize:12,color:"#cbd5e1",maxWidth:"90vw",animation:"fadeIn .3s ease",boxShadow:"0 8px 30px rgba(0,0,0,.4)"}}>{toast}</div>}

      <header style={{background:"linear-gradient(135deg,#0f172a,#1e1b4b)",borderBottom:"1px solid #1e293b",padding:"8px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚡</div>
          <span style={{fontWeight:700,fontSize:15}}>LeadFinder</span>
          <Badge bg="#422006" fg="#fbbf24">v3</Badge>
          {demo&&<Badge bg="#422006" fg="#fbbf24">DEMO</Badge>}
        </div>
        <div style={{display:"flex",gap:4}}>
          <Pill active={view==="search"&&!sel} onClick={()=>{setView("search");setSel(null);}}>🔍</Pill>
          <Pill active={view==="route"} onClick={()=>setView("route")}>🗺️</Pill>
          {leads.length>0&&<Pill onClick={()=>downloadCSV(leads)}>📥</Pill>}
          <Pill active={view==="settings"} onClick={()=>{setView("settings");setSel(null);}}>⚙</Pill>
        </div>
      </header>

      <div style={{maxWidth:900,margin:"0 auto",padding:"10px 10px 60px"}}>

        {view==="settings"&&(
          <div style={{maxWidth:520,margin:"0 auto"}}>
            <h2 style={{fontSize:16,fontWeight:700,marginBottom:14}}>Configuraci\u00f3n</h2>
            <div style={{background:"#111827",borderRadius:10,padding:14,marginBottom:12,border:"1px solid #1e293b"}}>
              <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Google Places API Key</div>
              <p style={{fontSize:11,color:"#475569",marginBottom:8}}>Opcional. Google da $200/mes gratis. Sin key = demo + scraping web.</p>
              <input type="password" value={gKey} onChange={e=>setGKey(e.target.value)} placeholder="AIza..." style={{width:"100%",background:"#0a0e17",border:"1px solid #334155",borderRadius:6,padding:"7px 10px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box"}}/>
              <div style={{display:"flex",gap:6,marginTop:8}}>
                <button onClick={()=>{try{localStorage?.setItem?.(SK_API,gKey)}catch{};setDemo(!gKey);showToast(gKey?"Key guardada":"Demo");}} style={{background:"#3b82f6",color:"white",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Guardar</button>
                <button onClick={()=>{setGKey("");setDemo(true);}} style={{background:"#1e293b",color:"#94a3b8",border:"1px solid #334155",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Demo</button>
              </div>
            </div>
            <div style={{background:"#111827",borderRadius:10,padding:14,marginBottom:12,border:"1px solid #1e293b"}}>
              <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Fuentes activas</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{Object.entries(SOURCES_META).map(([k,v])=>(<Badge key={k} bg={sources.includes(k)?v.color+"33":"#111827"} fg={sources.includes(k)?v.color:"#475569"} onClick={()=>toggleSrc(k)}>{v.icon} {v.name} {sources.includes(k)?"✓":""}</Badge>))}</div>
            </div>
            <div style={{background:"#111827",borderRadius:10,padding:14,border:"1px solid #1e293b"}}>
              <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Tu negocio</div>
              {[{key:"name",label:"Empresa",rows:1},{key:"description",label:"Qu\u00e9 haces",rows:2},{key:"value_prop",label:"Propuesta de valor",rows:2}].map(f=>(<div key={f.key} style={{marginBottom:6}}><label style={{fontSize:10,color:"#64748b",display:"block",marginBottom:2}}>{f.label}</label><textarea value={profile[f.key]} onChange={e=>setProfile(p=>({...p,[f.key]:e.target.value}))} rows={f.rows} style={{width:"100%",background:"#0a0e17",border:"1px solid #334155",borderRadius:6,padding:"7px 10px",color:"#e2e8f0",fontSize:12,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/></div>))}
              <button onClick={()=>{try{localStorage?.setItem?.(SK_PROF,JSON.stringify(profile))}catch{};showToast("Guardado \u2713");}} style={{background:"#3b82f6",color:"white",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Guardar</button>
            </div>
          </div>
        )}

        {view==="route"&&(
          <div style={{maxWidth:520,margin:"0 auto"}}>
            <h2 style={{fontSize:16,fontWeight:700,marginBottom:10}}>🗺️ Planificador de Ruta</h2>
            <p style={{fontSize:12,color:"#64748b",marginBottom:12}}>Define tu itinerario y busca alojamientos en cada parada.</p>
            <div style={{background:"#111827",borderRadius:10,padding:14,border:"1px solid #1e293b",marginBottom:12}}>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <div style={{flex:1}}><label style={{fontSize:10,color:"#64748b",display:"block",marginBottom:2}}>Origen</label><input value={rOrigin} onChange={e=>setROrigin(e.target.value)} style={{width:"100%",background:"#0a0e17",border:"1px solid #334155",borderRadius:6,padding:"7px 10px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box"}}/></div>
                <div style={{flex:1}}><label style={{fontSize:10,color:"#64748b",display:"block",marginBottom:2}}>Destino</label><input value={rDest} onChange={e=>setRDest(e.target.value)} style={{width:"100%",background:"#0a0e17",border:"1px solid #334155",borderRadius:6,padding:"7px 10px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box"}}/></div>
              </div>
              <label style={{fontSize:10,color:"#64748b",display:"block",marginBottom:2}}>Paradas intermedias (una por l\u00ednea)</label>
              <textarea value={rStops.join("\n")} onChange={e=>setRStops(e.target.value.split("\n"))} rows={4} placeholder={"Madrid\nBadajoz\n\u00c9vora"} style={{width:"100%",background:"#0a0e17",border:"1px solid #334155",borderRadius:6,padding:"7px 10px",color:"#e2e8f0",fontSize:12,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box",marginBottom:8}}/>
              <label style={{fontSize:10,color:"#64748b",display:"block",marginBottom:2}}>Qu\u00e9 buscar</label>
              <input value={rQuery} onChange={e=>setRQuery(e.target.value)} style={{width:"100%",background:"#0a0e17",border:"1px solid #334155",borderRadius:6,padding:"7px 10px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",marginBottom:10}}/>
              <button onClick={routeSearch} disabled={loading} style={{width:"100%",background:loading?"#1e293b":"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"white",border:"none",borderRadius:7,padding:"9px",fontSize:13,fontWeight:600,cursor:loading?"wait":"pointer"}}>
                {loading?loadMsg||"Buscando...":`🗺️ Buscar en ${[rOrigin,...rStops.filter(Boolean),rDest].filter(Boolean).length} paradas`}
              </button>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{[rOrigin,...rStops.filter(Boolean),rDest].filter(Boolean).map((c,i)=>(<Badge key={i} bg="#172554" fg="#60a5fa">📍 {c}</Badge>))}</div>
          </div>
        )}

        {view==="search"&&!sel&&(<>
          <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap"}}>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tipo (hoteles, casas rurales...)" onKeyDown={e=>e.key==="Enter"&&multiSearch()} style={{flex:2,minWidth:140,background:"#111827",border:"1px solid #1e293b",borderRadius:7,padding:"8px 10px",color:"#e2e8f0",fontSize:13}}/>
            <input value={loc} onChange={e=>setLoc(e.target.value)} placeholder="Ciudad" onKeyDown={e=>e.key==="Enter"&&multiSearch()} style={{flex:1,minWidth:100,background:"#111827",border:"1px solid #1e293b",borderRadius:7,padding:"8px 10px",color:"#e2e8f0",fontSize:13}}/>
            <button onClick={multiSearch} disabled={loading} style={{background:loading?"#1e293b":"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"white",border:"none",borderRadius:7,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:loading?"wait":"pointer"}}>{loading?"...":"🔍"}</button>
          </div>
          <div style={{display:"flex",gap:3,marginBottom:8,flexWrap:"wrap"}}>{Object.entries(SOURCES_META).map(([k,v])=>(<Badge key={k} bg={sources.includes(k)?v.color+"33":"#0a0e17"} fg={sources.includes(k)?v.color:"#334155"} onClick={()=>toggleSrc(k)}>{v.icon}{sources.includes(k)?" ✓":""}</Badge>))}</div>
          {loading&&<div style={{textAlign:"center",padding:20,color:"#64748b",fontSize:13}}><div style={{animation:"pulse 1.5s infinite",fontSize:20,marginBottom:6}}>🔍</div>{loadMsg}</div>}
          {leads.length>0&&!loading&&(
            <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap",alignItems:"center",padding:"6px 10px",background:"#111827",borderRadius:7,border:"1px solid #1e293b"}}>
              <Badge bg="#172554" fg="#60a5fa">{leads.length} leads</Badge>
              <Badge bg="#14532d" fg="#4ade80">{totalEmails} emails</Badge>
              <Badge>{enriched}/{leads.length} enriquecidos</Badge>
              {Object.entries(srcCounts).map(([k,v])=>(<Badge key={k} bg={(SOURCES_META[k]?.color||"#666")+"22"} fg={SOURCES_META[k]?.color||"#999"}>{SOURCES_META[k]?.icon} {v}</Badge>))}
              <div style={{flex:1}}/>
              <button onClick={enrichAll} disabled={enrId} style={{background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"3px 9px",fontSize:10,color:"#94a3b8",cursor:"pointer"}}>🔄 Enriquecer</button>
              <button onClick={()=>downloadCSV(leads)} style={{background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"3px 9px",fontSize:10,color:"#94a3b8",cursor:"pointer"}}>📥 CSV</button>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {leads.map(lead=>(<div key={lead.id} onClick={()=>{setSel(lead);setAnalysis(null);setMail("");setTab("intelligence");}} style={{background:"#111827",border:"1px solid #1e293b",borderRadius:9,padding:"9px 12px",cursor:"pointer",transition:"border-color .15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#3b82f6"} onMouseLeave={e=>e.currentTarget.style.borderColor="#1e293b"}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.name}</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:1}}>{lead.routeCity?`📍 ${lead.routeCity} · `:""}{lead.address}</div>
                </div>
                {lead.rating&&<Stars rating={lead.rating}/>}
              </div>
              <div style={{display:"flex",gap:4,marginTop:5,flexWrap:"wrap"}}>
                <Badge bg={(SOURCES_META[lead.source]?.color||"#666")+"22"} fg={SOURCES_META[lead.source]?.color}>{SOURCES_META[lead.source]?.icon} {SOURCES_META[lead.source]?.name||lead.source}</Badge>
                {lead.phone&&<Badge>📞</Badge>}
                {lead.price&&<Badge bg="#422006" fg="#fbbf24">{lead.price}</Badge>}
                {lead.website&&<Badge bg="#172554" fg="#60a5fa">🌐</Badge>}
                {(lead.enrichment?.emails?.length||0)>0&&<Badge bg="#14532d" fg="#4ade80">✉ {lead.enrichment.emails.length}</Badge>}
                {Object.keys(lead.enrichment?.socials||{}).length>0&&<Badge bg="#3b0764" fg="#c084fc">{Object.keys(lead.enrichment.socials).map(k=>socialIcon[k]).join("")}</Badge>}
                {lead.aiScore&&<Badge bg="#422006" fg="#fbbf24">🧠 {lead.aiScore}</Badge>}
                {lead.reviews?.length>0&&<Badge>💬 {lead.reviews.length}</Badge>}
              </div>
            </div>))}
          </div>
          {leads.length===0&&!loading&&(<div style={{textAlign:"center",padding:"40px 16px",color:"#475569"}}><div style={{fontSize:32,marginBottom:8}}>🔍</div><div style={{fontSize:13,fontWeight:600}}>Busca negocios o usa 🗺️ Ruta</div><div style={{fontSize:12,marginTop:4}}>{demo?"Pulsa 🔍 para datos demo":"Multi-fuente: Google + portales rurales"}</div></div>)}
        </>)}

        {view==="search"&&sel&&(<div>
          <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:"#3b82f6",fontSize:12,cursor:"pointer",marginBottom:8,padding:0}}>← Resultados</button>
          <div style={{background:"#111827",borderRadius:9,padding:12,border:"1px solid #1e293b",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><h2 style={{fontSize:17,fontWeight:700,margin:0}}>{sel.name}</h2><div style={{fontSize:12,color:"#64748b",marginTop:2}}>{sel.address}</div></div><Badge bg={(SOURCES_META[sel.source]?.color||"#666")+"33"} fg={SOURCES_META[sel.source]?.color}>{SOURCES_META[sel.source]?.icon} {SOURCES_META[sel.source]?.name}</Badge></div>
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
              {sel.rating&&<Stars rating={sel.rating}/>}
              {sel.reviewCount&&<span style={{fontSize:11,color:"#64748b"}}>{sel.reviewCount.toLocaleString()} rev</span>}
              {sel.phone&&<span style={{fontSize:12,color:"#94a3b8"}}>📞 {sel.phone}</span>}
              {sel.price&&<Badge bg="#422006" fg="#fbbf24">{sel.price}</Badge>}
              {sel.website&&<a href={sel.website} target="_blank" rel="noopener" style={{fontSize:12,color:"#3b82f6",textDecoration:"none"}}>🌐 ↗</a>}
            </div>
            {sel.enrichment?.status==="done"&&(<div style={{marginTop:8,padding:8,background:"#0a0e17",borderRadius:7}}>
              {sel.enrichment.emails?.length>0&&<div style={{marginBottom:4}}><span style={{fontSize:10,color:"#64748b",fontWeight:600}}>EMAILS: </span>{sel.enrichment.emails.map((em,i)=><a key={i} href={`mailto:${em}`} style={{fontSize:11,color:"#4ade80",marginRight:6,textDecoration:"none"}}>{em}</a>)}</div>}
              {sel.enrichment.phones?.length>0&&<div style={{marginBottom:4}}><span style={{fontSize:10,color:"#64748b",fontWeight:600}}>TELS: </span>{sel.enrichment.phones.map((p,i)=><span key={i} style={{fontSize:11,color:"#94a3b8",marginRight:6}}>{p}</span>)}</div>}
              {Object.keys(sel.enrichment.socials||{}).length>0&&<div><span style={{fontSize:10,color:"#64748b",fontWeight:600}}>REDES: </span>{Object.entries(sel.enrichment.socials).map(([k,v])=><a key={k} href={socialUrl[k]?.(v)} target="_blank" rel="noopener" style={{fontSize:11,color:"#c084fc",marginRight:8,textDecoration:"none"}}>{socialIcon[k]} {v}</a>)}</div>}
            </div>)}
            {sel.enrichment?.status!=="done"&&sel.website&&<button onClick={()=>enrichLead(sel)} disabled={enrId===sel.id} style={{marginTop:8,background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"5px 12px",fontSize:11,color:"#94a3b8",cursor:"pointer"}}>{enrId===sel.id?"Buscando...":"🔍 Extraer emails y redes"}</button>}
          </div>

          <div style={{display:"flex",gap:3,marginBottom:8}}>
            <Pill active={tab==="intelligence"} onClick={()=>setTab("intelligence")}>🧠 IA</Pill>
            <Pill active={tab==="reviews"} onClick={()=>setTab("reviews")}>💬 Reseñas</Pill>
            <Pill active={tab==="email"} onClick={()=>setTab("email")}>✉️ Email</Pill>
          </div>

          {tab==="intelligence"&&(<div style={{background:"#111827",borderRadius:9,padding:12,border:"1px solid #1e293b"}}>
            {!analysis&&azId!==sel.id&&(<div style={{textAlign:"center",padding:"20px 0"}}><p style={{color:"#64748b",fontSize:12,marginBottom:8}}>{(sel.reviews||[]).length>0?"Analiza rese\u00f1as y cruza pain points con tu oferta.":"Sin rese\u00f1as. Busca en Google Maps para obtenerlas."}</p>{(sel.reviews||[]).length>0&&<button onClick={()=>analyzeReviews(sel)} style={{background:"linear-gradient(135deg,#8b5cf6,#3b82f6)",color:"white",border:"none",borderRadius:7,padding:"8px 20px",fontSize:12,fontWeight:600,cursor:"pointer"}}>🧠 Analizar</button>}</div>)}
            {azId===sel.id&&<div style={{textAlign:"center",padding:20,color:"#64748b"}}><div style={{animation:"pulse 1.5s infinite",fontSize:20,marginBottom:6}}>🧠</div>Analizando...</div>}
            {analysis&&!analysis.error&&(<div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,padding:8,background:"#0a0e17",borderRadius:7}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:`conic-gradient(#8b5cf6 ${(analysis.oportunidad_score||0)*3.6}deg,#1e293b 0deg)`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:34,height:34,borderRadius:"50%",background:"#0a0e17",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#8b5cf6"}}>{analysis.oportunidad_score}</div></div>
                <div><div style={{fontWeight:700,fontSize:12}}>Score oportunidad</div><div style={{fontSize:10,color:"#64748b"}}>Match con tu oferta</div></div>
              </div>
              {analysis.pain_points_match?.length>0&&<div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:"#f59e0b",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>🎯 Pain points que resuelves</div>{analysis.pain_points_match.map((p,i)=><div key={i} style={{fontSize:12,color:"#fbbf24",padding:"2px 0 2px 10px",borderLeft:"2px solid #f59e0b"}}>{p}</div>)}</div>}
              {analysis.debilidades?.length>0&&<div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:"#ef4444",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>⚠ Debilidades</div>{analysis.debilidades.map((d,i)=><div key={i} style={{fontSize:12,color:"#94a3b8",padding:"2px 0 2px 10px",borderLeft:"2px solid #ef4444"}}>{d}</div>)}</div>}
              {analysis.fortalezas?.length>0&&<div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:"#22c55e",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>✅ Fortalezas</div>{analysis.fortalezas.map((f,i)=><div key={i} style={{fontSize:12,color:"#94a3b8",padding:"2px 0 2px 10px",borderLeft:"2px solid #22c55e"}}>{f}</div>)}</div>}
              {analysis.sales_pitch&&<div style={{marginTop:10,padding:10,background:"#172554",borderRadius:7,border:"1px solid #1e3a8a"}}><div style={{fontSize:10,fontWeight:700,color:"#60a5fa",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>🔥 Sales Pitch</div><div style={{fontSize:12,color:"#93c5fd",lineHeight:1.5}}>{analysis.sales_pitch}</div></div>}
            </div>)}
            {analysis?.error&&<div style={{color:"#ef4444",fontSize:12,textAlign:"center",padding:14}}>{analysis.error}</div>}
          </div>)}

          {tab==="reviews"&&(<div style={{background:"#111827",borderRadius:9,padding:12,border:"1px solid #1e293b"}}>{(sel.reviews||[]).length===0?<div style={{color:"#64748b",textAlign:"center",padding:14,fontSize:12}}>Sin rese\u00f1as de {SOURCES_META[sel.source]?.name}.</div>:<div style={{display:"flex",flexDirection:"column",gap:6}}>{sel.reviews.map((r,i)=>(<div key={i} style={{padding:8,background:"#0a0e17",borderRadius:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,fontWeight:600}}>{r.author_name}</span><Stars rating={r.rating}/></div><div style={{fontSize:12,color:"#94a3b8",lineHeight:1.5}}>{r.text}</div></div>))}</div>}</div>)}

          {tab==="email"&&(<div style={{background:"#111827",borderRadius:9,padding:12,border:"1px solid #1e293b"}}>{!analysis?<div style={{color:"#64748b",textAlign:"center",padding:14,fontSize:12}}>Primero analiza en "🧠 IA".</div>:<>
            <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:11,color:"#64748b"}}>Idioma:</span>
              {[{id:"es",l:"🇪🇸"},{id:"pt",l:"🇧🇷"},{id:"en",l:"🇬🇧"}].map(x=><Pill key={x.id} active={eLang===x.id} onClick={()=>setELang(x.id)}>{x.l}</Pill>)}
              <div style={{flex:1}}/>
              <button onClick={()=>generateEmail(sel)} disabled={genMail} style={{background:genMail?"#1e293b":"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"white",border:"none",borderRadius:7,padding:"6px 14px",fontSize:11,fontWeight:600,cursor:genMail?"wait":"pointer"}}>{genMail?"...":"✉️ Generar"}</button>
            </div>
            {mail&&<div>
              {sel.enrichment?.emails?.[0]&&<div style={{fontSize:11,color:"#64748b",marginBottom:6,padding:"4px 8px",background:"#0a0e17",borderRadius:5}}><b style={{color:"#94a3b8"}}>Para:</b> {sel.enrichment.emails[0]}</div>}
              <pre style={{background:"#0a0e17",borderRadius:7,padding:10,fontSize:12,color:"#cbd5e1",lineHeight:1.6,whiteSpace:"pre-wrap",wordBreak:"break-word",fontFamily:"'DM Sans',sans-serif",margin:0,maxHeight:300,overflow:"auto",border:"1px solid #1e293b"}}>{mail}</pre>
              <div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
                <button onClick={()=>{navigator.clipboard?.writeText(mail);showToast("Copiado ✓");}} style={{background:"#334155",color:"#e2e8f0",border:"none",borderRadius:6,padding:"4px 12px",fontSize:11,cursor:"pointer"}}>📋 Copiar</button>
                <button onClick={()=>{const ls=mail.split("\n");const sl=ls.find(l=>/^(subject|asunto|assunto)/i.test(l))||"";const su=sl.replace(/^(subject|asunto|assunto):?\s*/i,"");const body=ls.filter(l=>l!==sl).join("\n");const to=sel.enrichment?.emails?.[0]||"";window.open(`mailto:${to}?subject=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`);}} style={{background:"#1e3a8a",color:"#93c5fd",border:"none",borderRadius:6,padding:"4px 12px",fontSize:11,cursor:"pointer"}}>📧 Mail</button>
                {sel.enrichment?.emails?.[0]&&<button onClick={()=>{const ls=mail.split("\n");const sl=ls.find(l=>/^(subject|asunto|assunto)/i.test(l))||"";const su=sl.replace(/^(subject|asunto|assunto):?\s*/i,"");const body=ls.filter(l=>l!==sl).join("\n");window.open(`https://mail.google.com/mail/?view=cm&to=${sel.enrichment.emails[0]}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`);}} style={{background:"#14532d",color:"#4ade80",border:"none",borderRadius:6,padding:"4px 12px",fontSize:11,cursor:"pointer"}}>Gmail ↗</button>}
              </div>
            </div>}
          </>}</div>)}
        </div>)}
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        input::placeholder,textarea::placeholder{color:#475569}
        input:focus,textarea:focus{outline:none;border-color:#3b82f6!important}
        *{box-sizing:border-box;margin:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0a0e17}::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
        a:hover{opacity:.8}button{font-family:inherit}
      `}</style>
    </div>
  );
}
