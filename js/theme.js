/* Tema: cor, fonte, modo, tamanho e cantos. Tudo vem das configurações dela. */

export const TEMAS = [
  { id: "lirio", nome: "Lírio", accent: "#C4477A" },
  { id: "lavanda", nome: "Lavanda", accent: "#8A72D1" },
  { id: "pessego", nome: "Pêssego", accent: "#E57F5F" },
  { id: "ameixa", nome: "Ameixa", accent: "#9A3F73" },
  { id: "menta", nome: "Menta", accent: "#3E9C86" },
  { id: "ceu", nome: "Céu", accent: "#5A92CC" },
  { id: "dourado", nome: "Dourado", accent: "#B98A3E" },
  { id: "grafite", nome: "Grafite", accent: "#4F4858" }
];
export const FONTES_TEXTO = ["Plus Jakarta Sans", "Nunito", "DM Sans", "Quicksand", "Poppins", "Lora", "Sistema"];
export const FONTES_TITULO = ["Fraunces", "Playfair Display", "Cormorant Garamond", "Dancing Script", "Quicksand", "Mesma do texto"];
const PESOS = { "Plus Jakarta Sans": "400;500;600;700;800", Nunito: "400;500;600;700;800", Poppins: "400;500;600;700", "DM Sans": "400;500;600;700", Quicksand: "400;500;600;700", Lora: "400;500;600;700", Fraunces: "400;500;600;700", "Playfair Display": "400;500;600;700", "Cormorant Garamond": "400;500;600;700", "Dancing Script": "400;500;600;700" };

export const CONFIG_PADRAO = {
  tema: "lirio", accent: null, fonteTexto: "Plus Jakarta Sans", fonteTitulo: "Fraunces",
  modo: "auto", tamanho: "m", cantos: "suave",
  modulos: { rotina: true, tarefas: true, calendario: true, habitos: true, bemestar: true, financas: true, estudos: true, notas: true, listas: true, datas: true, resumo: true }
};

export function mergeConfig(c) {
  const x = Object.assign({}, CONFIG_PADRAO, c || {});
  x.modulos = Object.assign({}, CONFIG_PADRAO.modulos, (c && c.modulos) || {});
  delete x.modulos.ciclo;
  return x;
}

const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const lum = (c) => { const [r, g, b] = hex(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const mix = (c, w, p) => toHex(hex(c).map((v, i) => v + (hex(w)[i] - v) * p));

const loaded = new Set();
function loadFont(name) {
  if (!name || /^(Sistema|Mesma)/.test(name) || loaded.has(name)) return;
  loaded.add(name);
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(name).replace(/%20/g, "+") + ":wght@" + (PESOS[name] || "400;500;600;700") + "&display=swap";
  document.head.appendChild(l);
}
const stack = (n, serif) => (/^(Sistema|Mesma)/.test(n) ? "system-ui,-apple-system,'Segoe UI',sans-serif" : "'" + n + "'," + (serif ? "Georgia,serif" : "system-ui,sans-serif"));

let mq;
export function applyTheme(cfg) {
  const c = mergeConfig(cfg);
  try { localStorage.setItem("lirio:theme", JSON.stringify(c)); } catch (e) { /* ignore */ }
  const root = document.documentElement;
  const tema = TEMAS.find((t) => t.id === c.tema) || TEMAS[0];
  const accent = /^#[0-9a-f]{6}$/i.test(c.accent || "") ? c.accent : tema.accent;
  const dark = c.modo === "escuro" || (c.modo === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  const ac = dark ? mix(accent, "#ffffff", 0.22) : accent;
  root.dataset.mode = dark ? "dark" : "light";
  root.style.setProperty("--ac", ac);
  const L = lum(ac), cBranco = 1.05 / (L + 0.05), cEscuro = (L + 0.05) / (lum("#2a1830") + 0.05);
  root.style.setProperty("--on-ac", cBranco >= cEscuro ? "#ffffff" : "#2a1830");
  root.style.setProperty("--font", stack(c.fonteTexto, false));
  root.style.setProperty("--font-h", c.fonteTitulo.startsWith("Mesma") ? stack(c.fonteTexto, false) : stack(c.fonteTitulo, true));
  root.style.setProperty("--r", { reto: "6px", suave: "14px", redondo: "22px" }[c.cantos] || "14px");
  root.style.fontSize = { p: "15px", m: "16px", g: "18px" }[c.tamanho] || "16px";
  loadFont(c.fonteTexto); loadFont(c.fonteTitulo.startsWith("Mesma") ? null : c.fonteTitulo);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? mix(accent, "#15101a", 0.9) : mix(accent, "#ffffff", 0.94));
  if (!mq) { mq = matchMedia("(prefers-color-scheme: dark)"); mq.addEventListener("change", () => { try { applyTheme(JSON.parse(localStorage.getItem("lirio:theme"))); } catch (e) { /* ignore */ } }); }
}

export function bootTheme() {
  try { applyTheme(JSON.parse(localStorage.getItem("lirio:theme"))); } catch (e) { applyTheme(null); }
}
