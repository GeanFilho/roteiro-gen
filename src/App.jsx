import React, { useMemo, useState } from "react";

// ==== PDF.js com Worker configurado
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ==== OCR (fallback para PDF escaneado)
import Tesseract from "tesseract.js";

// ===== Utilidades =====
function seededRandom(seed) {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x ^= seed.charCodeAt(i) << (i % 8);
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function pickN(arr, n, rnd) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(rnd() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function slugDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function saveLocal(key, value){
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e){}
}
function loadLocal(key, fallback){
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e){ return fallback; }
}

// ===== Heurísticas simples de idioma (mais rígidas)
const PT_WORDS = /(?:\bde\b|\bque\b|\bnão\b|\bvocê\b|\bDeus\b|\bpra\b|\bhoje\b|\bisso\b|\btambém\b|\bSenhor\b|\bfé\b|\boração\b|\bpromessa\b|\bagora\b)/i;
const EN_WORDS = /(?:\bthe\b|\band\b|\byou\b|\bgod\b|\btoday\b|\bthis\b|\bwith\b|\bnew\b|\btime\b|\bfaith\b|\bprayer\b|\bpromise\b|\bnow\b)/i;
const PT_DIACRITICS = /[áàâãéêíóôõúç]/i;

function looksPortuguese(s){
  const ptScore = (PT_WORDS.test(s) ? 1 : 0) + (PT_DIACRITICS.test(s) ? 2 : 0);
  const enScore = EN_WORDS.test(s) ? 1 : 0;
  return ptScore >= 2 && ptScore > enScore;
}
function looksEnglish(s){
  const enScore = EN_WORDS.test(s) ? 2 : 0;
  const ptScore = (PT_WORDS.test(s) ? 1 : 0) + (PT_DIACRITICS.test(s) ? 2 : 0);
  return enScore > ptScore && !PT_DIACRITICS.test(s);
}
function filterCorpusByLang(lines, lang){
  const cleaned = lines.filter(Boolean);
  const filtered = cleaned.filter(s => lang === "PT" ? looksPortuguese(s) : looksEnglish(s));
  return filtered.length ? filtered : cleaned; // fallback para não quebrar
}

// ===== Dados auxiliares =====
const CTAS_PT = [
  "Comente AMÉM",
  "Escreva EU CREIO",
  "Declare: DEUS PROVÊ",
  "Compartilhe com alguém que precisa",
  "Comente: EU ENTREGO",
  "Escreva: NOVO TEMPO",
  "Comente: A BATALHA É DO SENHOR",
  "Escreva: O TEMPO DE DEUS É PERFEITO",
  "Declare: MINHA CASA É DO SENHOR"
];

const CTAS_EN = [
  "Comment AMEN",
  "Write I BELIEVE",
  "Declare: GOD PROVIDES",
  "Share with someone who needs this",
  "Comment: I SURRENDER",
  "Write: NEW SEASON",
  "Comment: THE BATTLE BELONGS TO THE LORD",
  "Write: GOD'S TIMING IS PERFECT",
  "Declare: MY HOUSE BELONGS TO THE LORD"
];

const VISUAIS = [
  "Amanhecer / céu aberto / luz suave",
  "Mar calmo / câmera lenta / ondas",
  "Pessoa orando em contraluz",
  "Bíblia aberta com feixe de luz",
  "Igreja vazia / eco sutil",
  "Janela com chuva / esperança",
  "Mãos em posição de fé",
  "Cidade à noite / silêncio e paz",
  "Montanhas / neblina leve"
];

const TRILHAS = [
  "Piano emocional + pads",
  "Cordas suaves + ambiente",
  "Piano solo reverberado",
  "Guitarra ambiente + pads",
  "Violoncelo lento + sinos suaves"
];

const ANGULOS = [
  "financeiro",
  "cura",
  "família",
  "propósito/chamado",
  "recomeço",
  "proteção/livramento",
  "casamento/reconciliação",
  "ansiedade/descanso",
  "deserto/processo"
];

// ===== Frases de impacto (por idioma)
const IMPACT_PT = [
  "DEUS ESTÁ ME ERGUENDO.",
  "EU CREIO QUE O MILAGRE JÁ COMEÇOU.",
  "O QUE É MEU, VOLTARÁ TRANSFORMADO.",
  "DEUS ABRE PORTAS QUE NINGUÉM FECHA.",
  "NÃO ESTOU SÓ: O CÉU ME SUSTENTA.",
  "DEUS VAI USAR ISSO PARA O MEU BEM.",
  "HOJE EU ESCOLHO CAMINHAR PELA FÉ."
];
const IMPACT_EN = [
  "GOD IS LIFTING ME UP.",
  "MY MIRACLE IS ALREADY IN MOTION.",
  "WHAT IS MINE WILL RETURN TRANSFORMED.",
  "GOD OPENS DOORS NO ONE CAN SHUT.",
  "I AM NOT ALONE: HEAVEN HOLDS ME.",
  "GOD WILL TURN THIS FOR MY GOOD.",
  "TODAY I CHOOSE TO WALK BY FAITH."
];

// ===== Ideias (uma única “frase de impacto”, idioma fixo, sem duplicar no corpo)
function toIdea(base, opts, rnd) {
  const { lang, reforcarTitulo, incluirVerso } = opts;
  const ctas = lang === "PT" ? CTAS_PT : CTAS_EN;
  const impactos = lang === "PT" ? IMPACT_PT : IMPACT_EN;

  const ganchoTemplatesPT = [
    "Você precisava ler isso hoje.",
    "Se isso tocou seu coração, é pra você.",
    "Uma palavra curta que pode mudar seu dia.",
    "Pare e leia: resposta de oração.",
    "Talvez isso seja o sinal que você pediu a Deus.",
    "Às vezes, o silêncio de Deus também é resposta."
  ];
  const ganchoTemplatesEN = [
    "You needed to read this today.",
    "If this touched your heart, it's for you.",
    "A short word that can shift your day.",
    "Pause and read: prayer answered.",
    "Maybe this is the sign you asked for.",
    "Sometimes silence is an answer too."
  ];
  const ganchoPool = lang === "PT" ? ganchoTemplatesPT : ganchoTemplatesEN;

  const tituloPrefixesPT = ["Deus te diz:", "Palavra de hoje:", "Resposta do céu:", "Promessa pra agora:", "Não desista:", "Confie no tempo de Deus:"];
  const tituloPrefixesEN = ["God says:", "Today's word:", "Heaven's answer:", "Promise for now:", "Don't quit:", "Trust God's timing:"];
  const tituloPool = lang === "PT" ? tituloPrefixesPT : tituloPrefixesEN;

  const angulo = ANGULOS[Math.floor(rnd() * ANGULOS.length)];
  const tituloBase = `${tituloPool[Math.floor(rnd()*tituloPool.length)]} ${angulo}`;
  const titulo = reforcarTitulo ? tituloBase.toUpperCase() : tituloBase;

  const gancho = ganchoPool[Math.floor(rnd()*ganchoPool.length)];
  const impacto = impactos[Math.floor(rnd()*impactos.length)];
  const cta = ctas[Math.floor(rnd()*ctas.length)];
  const visual = VISUAIS[Math.floor(rnd()*VISUAIS.length)];
  const trilha = TRILHAS[Math.floor(rnd()*TRILHAS.length)];
  const verso = incluirVerso && opts.versos.length > 0 ? opts.versos[Math.floor(rnd()*opts.versos.length)] : "";

  // se a linha base do corpus não estiver no idioma atual, não usa
  const baseOk = (lang === "PT" ? looksPortuguese(base) : looksEnglish(base));
  const baseTexto = baseOk ? base : "";

  const reforcoPT = [
    "Respire fundo agora e entregue de novo o que pesa. Deus não se atrasa.",
    "Não é sobre o tamanho do passo, e sim sobre dar o próximo passo com fé.",
    "Faça hoje o que está ao seu alcance; Deus cuida do invisível."
  ];
  const reforcoEN = [
    "Take a deep breath and surrender again. God's timing is never late.",
    "It’s not about a big step; it’s about the next faithful step.",
    "Do today what you can; God handles the unseen."
  ];
  const reforco = (lang === "PT" ? reforcoPT : reforcoEN)[Math.floor(rnd()*3)];

  // impacto NÃO entra no corpo
  const partes = [baseTexto, "", reforco, `Visual sugerido: ${visual}. Trilha: ${trilha}.`]
    .filter(Boolean)
    .join("\n");

  return { titulo, gancho, impacto, ideiaCentral: partes, cta, visual, trilha, verso };
}

function csvEsc(s){
  if (s == null) return "";
  const needs = /[",\n]/.test(String(s));
  return needs ? '"' + String(s).replace(/"/g,'""') + '"' : String(s);
}
function toCSV(rows){
  const head = ["Data","Título","Gancho","Frase de impacto","Ideia central","CTA","Cenário visual","Trilha/Efeitos","Verso"].join(",");
  const lines = rows.map(r => [r.data, r.titulo, r.gancho, r.impacto || "", r.ideiaCentral, r.cta, r.visual, r.trilha, r.verso]
    .map(csvEsc).join(","));
  return [head, ...lines].join("\n");
}

function cleanLines(text){
  return text
    .split(/\r?\n/)
    .map(s => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
function scoreLine(s){
  let score = 0;
  if (s.length >= 20) score += 2;
  if (/[\.!?]$/.test(s)) score += 1;
  if (/^\d+\W+/.test(s)) score += 1;
  if (/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(s)) score += 1;
  if (/(Salmo|Isaías|Mateus|João|Romanos|Provérbios|Êxodo|Gênesis|Coríntios|Filipenses)/i.test(s)) score += 1;
  if (s.length < 8) score -= 2;
  if (/^Página \d+/.test(s)) score -= 3;
  if (/^https?:/i.test(s)) score -= 3;
  return score;
}

// ==== Extração PDF (com worker) ====
async function extractPdfText(file){
  if (!file || file.type !== 'application/pdf') throw new Error('Arquivo inválido: selecione um PDF (.pdf).');
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: buf,
    isEvalSupported: false,
    useWorkerFetch: false,
    disableFontFace: true,
    disableAutoFetch: true,
    disableStream: true,
    cMapPacked: true,
  });
  const pdf = await loadingTask.promise;
  let pagesText = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    try {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent({ normalizeWhitespace: true });
      const strings = content.items.map(i => (i.str || '').replace(/\u00A0/g, ' ')).filter(Boolean);
      pagesText.push(strings.join('\n').trim());
    } catch (e) {
      pagesText.push('');
    }
  }
  return pagesText.join('\n');
}

// ==== OCR fallback ====
async function ocrPdfToText(file, lang = 'por', onProgress){
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buf });
  const pdf = await loadingTask.promise;
  let out = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/png');
    if (onProgress) onProgress(`OCR página ${p}/${pdf.numPages}…`);
    const { data: { text } } = await Tesseract.recognize(dataUrl, lang, {
      logger: m => { if (onProgress && m.status) onProgress(`OCR ${p}/${pdf.numPages}: ${m.status} ${(m.progress*100|0)}%`); }
    });
    out.push(text.trim());
  }
  return out.join('\n');
}

// ===== Componente principal =====
export default function App() {
  const [lang, setLang] = useState("PT");
  const [n, setN] = useState(9);
  const [reforcarTitulo, setReforcarTitulo] = useState(true);
  const [incluirVerso, setIncluirVerso] = useState(false);
  const [dataEscolhida, setDataEscolhida] = useState(slugDate(new Date()));
  const [textoRoteiros, setTextoRoteiros] = useState(loadLocal("roteiros", ""));
  const [textoVersos, setTextoVersos] = useState(loadLocal("versos", ""));
  const [geradas, setGeradas] = useState([]);
  const [pdfName, setPdfName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfStatus, setPdfStatus] = useState("");
  const [useOcr, setUseOcr] = useState(true);
  const [ocrLang, setOcrLang] = useState("por");

  const corpus = useMemo(() => textoRoteiros.split(/\n+/).map(s=>s.trim()).filter(Boolean), [textoRoteiros]);
  const versos = useMemo(() => textoVersos.split(/\n+/).map(s=>s.trim()).filter(Boolean), [textoVersos]);

  const handleGerar = () => {
    if (corpus.length === 0) {
      alert("Cole ou extraia do PDF os roteiros (uma linha por ideia) no campo à esquerda.");
      return;
    }
    const corpusFiltrado = filterCorpusByLang(corpus, lang);
    const seed = `${dataEscolhida}|${lang}|${n}|${corpusFiltrado.length}|${reforcarTitulo}|${incluirVerso}`;
    const rnd = seededRandom(seed);
    const bases = pickN(corpusFiltrado, n, rnd);
    const ideias = bases.map(b => toIdea(b, { lang, reforcarTitulo, incluirVerso, versos }, rnd));
    const linhas = ideias.map(i => ({ data: dataEscolhida, ...i }));
    setGeradas(linhas);
  };

  const copiarTexto = () => {
    if (!geradas.length) return;
    const texto = geradas.map((r, idx) =>
      `#${idx+1} — ${r.titulo}
Gancho: ${r.gancho}
Impacto: ${r.impacto || "-"}
Ideia: ${r.ideiaCentral}
CTA: ${r.cta}
Visual: ${r.visual}
Trilha: ${r.trilha}${r.verso?`\nVerso: ${r.verso}`:""}`
    ).join("\n\n");
    navigator.clipboard.writeText(texto);
  };
  const baixarCSV = () => { if (geradas.length) download(`ideias_${dataEscolhida}.csv`, toCSV(geradas)); };
  const baixarJSON = () => { if (geradas.length) download(`ideias_${dataEscolhida}.json`, JSON.stringify(geradas, null, 2)); };
  const salvarCorpus = () => { saveLocal("roteiros", textoRoteiros); saveLocal("versos", textoVersos); alert("Corpus salvo no navegador (localStorage)."); };

  const handlePdfFile = async (file) => {
    setBusy(true);
    setPdfStatus("Lendo PDF…");
    setPdfName(file.name);
    try {
      let raw = await extractPdfText(file);
      if (!raw || raw.replace(/\s+/g,'').length < 20) {
        if (useOcr) {
          setPdfStatus("Texto não encontrado. Iniciando OCR…");
          const text = await ocrPdfToText(file, ocrLang, (msg)=> setPdfStatus(msg));
          raw = text;
        } else {
          throw new Error('Nenhum texto extraído (parece ser um PDF escaneado). Ative OCR e tente de novo.');
        }
      }
      setPdfStatus("Processando texto…");
      const lines = cleanLines(raw);

      const rich = lines.map(s => ({ s, score: scoreLine(s) }))
        .filter(o => o.score > 0)
        .map(o => o.s);
      const versosC = rich.filter(s => /(Salmo|Isaías|Mateus|João|Romanos|Provérbios|Êxodo|Gênesis|Coríntios|Filipenses)/i.test(s));
      const roteirosC = rich.filter(s => !versosC.includes(s));

      if (roteirosC.length) setTextoRoteiros(roteirosC.join("\n"));
      if (versosC.length) setTextoVersos(prev => (prev ? prev + "\n" : "") + versosC.join("\n"));
      setPdfStatus(`Extração concluída: ${roteirosC.length} roteiros · ${versosC.length} versos`);
    } catch (e) {
      console.error(e);
      setPdfStatus(e?.message || "Falha ao extrair. Tente outro PDF ou cole manualmente.");
      alert(e?.message || "Falha ao extrair. Tente outro PDF ou cole manualmente.");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold">Gerador diário de ideias de roteiros</h1>
        <p className="text-zinc-400 mt-1">Leitura de PDF com fallback de <span className="text-emerald-400 font-semibold">OCR</span>, salvamento local e exportação JSON.</p>

        <div className="mt-4 bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <div className="flex flex-col gap-3">
            <div className="text-sm text-zinc-300">
              <div className="font-semibold">Carregar PDF</div>
              <div className="text-zinc-400">Se o PDF for escaneado (só imagem), ative a opção de OCR.</div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-950 cursor-pointer">
                <input type="file" accept="application/pdf" className="hidden" onChange={e=>{ if(e.target.files?.[0]) handlePdfFile(e.target.files[0]); }} />
                <span>Escolher PDF</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={useOcr} onChange={e=>setUseOcr(e.target.checked)} /> Usar OCR se necessário
              </label>
              <select className="bg-zinc-800 rounded-xl p-2 text-sm" value={ocrLang} onChange={e=>setOcrLang(e.target.value)}>
                <option value="por">OCR: Português</option>
                <option value="eng">OCR: Inglês</option>
                <option value="por+eng">OCR: PT+EN</option>
              </select>
            </div>
            {pdfName && (
              <div className="mt-1 text-xs text-zinc-400">Arquivo: {pdfName} — {pdfStatus}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="text-sm text-zinc-400">Roteiros base (uma ideia por linha)</label>
            <textarea
              className="w-full mt-2 h-56 rounded-2xl bg-zinc-900 border border-zinc-800 p-3 focus:outline-none"
              placeholder="Cole ou extraia do PDF cada roteiro em uma linha…"
              value={textoRoteiros}
              onChange={e=>setTextoRoteiros(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Versículos (opcional, um por linha)</label>
            <textarea
              className="w-full mt-2 h-56 rounded-2xl bg-zinc-900 border border-zinc-800 p-3 focus:outline-none"
              placeholder="Versos extraídos do PDF ou colados manualmente…"
              value={textoVersos}
              onChange={e=>setTextoVersos(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Idioma</span>
              <select className="bg-zinc-800 rounded-xl p-2" value={lang} onChange={e=>setLang(e.target.value)}>
                <option value="PT">Português</option>
                <option value="EN">English</option>
              </select>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-zinc-400">Ideias por dia</span>
              <input className="bg-zinc-800 rounded-xl p-2 w-20" type="number" min={1} max={30} value={n} onChange={e=>setN(parseInt(e.target.value||"9"))} />
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-zinc-400">Data</span>
              <input className="bg-zinc-800 rounded-xl p-2" type="date" value={dataEscolhida} onChange={e=>setDataEscolhida(e.target.value)} />
            </div>
            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={reforcarTitulo} onChange={e=>setReforcarTitulo(e.target.checked)} />
                Título em destaque
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={incluirVerso} onChange={e=>setIncluirVerso(e.target.checked)} />
                Incluir 1 verso
              </label>
            </div>
            <button onClick={handleGerar} disabled={busy} className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 transition rounded-xl py-2 font-semibold">Gerar ideias</button>
            <div className="flex gap-2 mt-3">
              <button onClick={salvarCorpus} className="bg-zinc-800 rounded-xl px-3 py-2 text-sm">Salvar corpus</button>
            </div>
          </div>

          <div className="md:col-span-2 bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Resultado ({geradas.length})</h2>
              <div className="flex gap-2">
                <button onClick={copiarTexto} className="bg-zinc-800 rounded-xl px-3 py-2">Copiar texto</button>
                <button onClick={baixarCSV} className="bg-zinc-800 rounded-xl px-3 py-2">Baixar CSV</button>
                <button onClick={baixarJSON} className="bg-zinc-800 rounded-xl px-3 py-2">Exportar JSON</button>
              </div>
            </div>
            <ol className="mt-3 space-y-3 list-decimal list-inside">
              {geradas.map((r, idx) => (
                <li key={idx} className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800">
                  <div className="text-emerald-400 text-sm">{r.data}</div>
                  <div className="text-lg font-bold mt-1">{r.titulo}</div>
                  <div className="text-sm text-zinc-300 mt-1">Gancho: {r.gancho}</div>

                  {/* ÚNICA caixinha de Frase de impacto */}
                  {r.impacto && (
                    <div className="mt-2 rounded-xl border border-emerald-800 bg-emerald-900/10 p-3">
                      <div className="text-emerald-400 text-xs uppercase tracking-wide">Frase de impacto</div>
                      <div className="mt-1 font-semibold">{r.impacto}</div>
                    </div>
                  )}

                  <div className="mt-1 whitespace-pre-wrap">{r.ideiaCentral}</div>
                  <div className="text-sm text-zinc-300 mt-1">CTA: {r.cta} · Visual: {r.visual} · Trilha: {r.trilha}</div>
                  {r.verso && <div className="text-sm text-zinc-400 mt-1">Verso: {r.verso}</div>}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-8 text-xs text-zinc-500 leading-relaxed">
          <p>
            Dica: se o PDF for escaneado, o OCR pode levar mais tempo conforme o número de páginas. Para agilizar, divida o arquivo ou reduza a resolução.
          </p>
        </div>
      </div>
    </div>
  );
}
