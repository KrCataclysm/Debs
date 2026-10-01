import { h, icon, sheet, formSheet, toast } from "./lib.js";
import * as db from "./store.js";
import { applyTheme, bootTheme } from "./theme.js";

import * as hoje from "./views/hoje.js";
import * as rotina from "./views/rotina.js";
import * as tarefas from "./views/tarefas.js";
import * as calendario from "./views/calendario.js";
import * as habitos from "./views/habitos.js";
import * as bemestar from "./views/bemestar.js";
import * as financas from "./views/financas.js";
import * as estudos from "./views/estudos.js";
import * as notas from "./views/notas.js";
import * as listas from "./views/listas.js";
import * as datas from "./views/datas.js";
import * as resumo from "./views/resumo.js";
import * as ajustes from "./views/ajustes.js";

const GRUPOS = { dia: "Dia a dia", estudo: "Faculdade", vida: "Vida", balanco: "Balanço" };
const NAV = [
  { id: "hoje", label: "Hoje", ic: "home", mod: null, v: hoje, g: "" },
  { id: "rotina", label: "Rotina", ic: "repeat", mod: "rotina", v: rotina, g: "dia" },
  { id: "tarefas", label: "Tarefas", ic: "tasks", mod: "tarefas", v: tarefas, g: "dia" },
  { id: "calendario", label: "Calendário", ic: "calendar", mod: "calendario", v: calendario, g: "dia" },
  { id: "habitos", label: "Hábitos", ic: "flame", mod: "habitos", v: habitos, g: "dia" },
  { id: "estudos", label: "Faculdade", ic: "cap", mod: "estudos", v: estudos, g: "estudo" },
  { id: "bemestar", label: "Bem-estar", ic: "heart", mod: "bemestar", v: bemestar, g: "vida" },
  { id: "financas", label: "Finanças", ic: "wallet", mod: "financas", v: financas, g: "vida" },
  { id: "notas", label: "Notas", ic: "note", mod: "notas", v: notas, g: "vida" },
  { id: "listas", label: "Listas", ic: "cart", mod: "listas", v: listas, g: "vida" },
  { id: "datas", label: "Datas", ic: "gift", mod: "datas", v: datas, g: "vida" },
  { id: "resumo", label: "Resumo", ic: "chart", mod: "resumo", v: resumo, g: "balanco" },
  { id: "ajustes", label: "Ajustes", ic: "sliders", mod: null, v: ajustes, g: "balanco" }
];
const PRIMARIAS = ["hoje", "rotina", "tarefas", "calendario"];

const app = document.getElementById("app");
let shell = null, lastCfg = "", rota = "hoje";
const go = (id) => { if (location.hash !== "#/" + id) location.hash = "#/" + id; else renderPage(true); };
const enabled = (cfg) => NAV.filter((n) => !n.mod || cfg.modulos[n.mod]);
const currentRoute = () => (location.hash.replace(/^#\//, "") || "hoje");

/* ---------- boas-vindas (acesso só dela, por link) ---------- */
function authScreen() {
  const msg = h("div", { class: "form-err", role: "alert", hidden: true });
  const chave = h("input", { class: "input", type: "password", id: "a-chave", autocomplete: "off", placeholder: "Cole aqui a sua chave", autocapitalize: "none", spellcheck: "false", enterkeyhint: "go" });
  const campo = h("div", { class: "field", hidden: !!db.chaveGuardada() }, h("label", { class: "flabel", for: "a-chave" }, "Sua chave de acesso"), chave);
  const btn = h("button", { class: "btn primary block big", type: "submit" }, h("span", null, "Abrir meu espaço"));
  const form = h("form", { class: "stack", onsubmit: async (e) => {
    e.preventDefault(); msg.hidden = true; btn.disabled = true; btn.classList.add("loading");
    try { await db.entrarComChave(chave.value.trim() || undefined); history.replaceState(null, "", "#/hoje"); }
    catch (ex) { campo.hidden = false; msg.textContent = ex.message; msg.hidden = false; chave.focus(); } finally { btn.disabled = false; btn.classList.remove("loading"); }
  } }, campo, msg, btn);
  return h("div", { class: "auth-wrap" },
    h("span", { class: "auth-flower", "aria-hidden": "true" }),
    h("main", { class: "auth-card welcome" },
      h("img", { src: "icons/icon-192.png", alt: "", class: "auth-logo", width: 84, height: 84 }),
      h("p", { class: "welcome-kicker" }, "Lírio"),
      h("h1", null, "Oi, Débora"),
      h("p", { class: "welcome-lead" }, "Este espaço foi feito especialmente pra você."),
      h("p", { class: "auth-sub" }, "Sua rotina, seus estudos e seus dias, no seu ritmo, e igual em qualquer aparelho."),
      form,
      h("p", { class: "auth-foot" }, "Feito com carinho · só seu")));
}

/* ---------- casca ---------- */
function pill() {
  const st = db.status();
  const txt = !st.online ? "Offline" + (st.pending ? " · " + st.pending : "") : st.syncing ? "Salvando…" : st.error ? "Sem conexão" : st.pending ? "Pendente · " + st.pending : "Sincronizado";
  const cls = !st.online || st.error ? "warn" : st.syncing || st.pending ? "busy" : "ok";
  return h("button", { class: "syncpill " + cls, type: "button", "aria-label": "Status da sincronização: " + txt, onclick: () => db.pull(true) }, h("i"), txt);
}

function buildShell(cfg) {
  const items = enabled(cfg);
  const prim = PRIMARIAS.map((id) => items.find((n) => n.id === id)).filter(Boolean);
  const resto = items.filter((n) => !prim.includes(n));
  const link = (n, cls) => h("a", { href: "#/" + n.id, class: cls, "data-id": n.id }, icon(n.ic, cls === "tab" ? 22 : 20), h("span", null, n.label));
  const nav = h("nav", { "aria-label": "Principal" });
  let g = null;
  items.filter((n) => n.id !== "ajustes").forEach((n) => { if (n.g !== g) { g = n.g; if (g) nav.appendChild(h("p", { class: "navgroup" }, GRUPOS[g])); } nav.appendChild(link(n, "navlink")); });
  const nome = (db.perfil() || {}).nome;
  const side = h("aside", { class: "side" },
    h("div", { class: "brand" }, h("img", { src: "icons/icon-192.png", alt: "", width: 42, height: 42 }), h("div", null, h("strong", null, "Lírio"), nome ? h("small", null, "de " + nome.split(" ")[0]) : null)),
    nav, h("div", { class: "side-foot" }, link(NAV[NAV.length - 1], "navlink"), h("div", { id: "sidefoot" })));
  const tabbar = h("nav", { class: "tabbar", "aria-label": "Principal", style: { "--n": String(prim.length + 1) } }, h("span", { class: "tab-ind", "aria-hidden": "true" }),
    prim.map((n) => link(n, "tab")), h("button", { class: "tab", type: "button", "data-id": "mais", onclick: () => maisSheet(resto) }, icon("more", 22), h("span", null, "Mais")));
  tabbar._ids = prim.map((n) => n.id);
  return h("div", { class: "shell" }, side, h("main", { class: "main", id: "main", tabindex: "-1" }, h("div", { class: "topbar", id: "topbar" }), h("div", { class: "page", id: "page" })), tabbar);
}
function maisSheet(resto) {
  const grupos = {};
  resto.forEach((n) => { (grupos[n.g || "x"] = grupos[n.g || "x"] || []).push(n); });
  sheet("Mais", (close) => h("div", { class: "stack" }, Object.entries(grupos).map(([g, arr]) => h("div", { class: "stack-sm" }, GRUPOS[g] ? h("p", { class: "navgroup" }, GRUPOS[g]) : null,
    h("div", { class: "more-grid" }, arr.map((n) => h("a", { href: "#/" + n.id, class: "more-item" + (rota === n.id ? " on" : ""), onclick: close }, icon(n.ic, 24), h("span", null, n.label))))))), { noFocus: true });
}

function renderPage(entering) {
  const u = db.user();
  if (!u) { shell = null; lastCfg = ""; app.innerHTML = ""; app.appendChild(authScreen()); return; }
  if (!db.status().ready) { if (!app.querySelector(".splash")) app.innerHTML = '<div class="splash"><span class="splash-flower"></span></div>'; shell = null; return; }
  const cfg = db.config(), cfgKey = JSON.stringify(cfg.modulos) + ((db.perfil() || {}).nome || "");
  rota = currentRoute();
  let nav = enabled(cfg).find((n) => n.id === rota);
  if (!nav) { rota = "hoje"; nav = NAV[0]; if (location.hash !== "#/hoje") history.replaceState(null, "", "#/hoje"); entering = true; }
  const fresh = !shell || cfgKey !== lastCfg || !app.contains(shell);
  if (fresh) { app.innerHTML = ""; shell = buildShell(cfg); app.appendChild(shell); lastCfg = cfgKey; entering = true; }
  shell.querySelectorAll(".navlink, a.tab").forEach((a) => { const on = a.getAttribute("data-id") === rota; a.classList.toggle("on", on); on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"); });
  const tabbar = shell.querySelector(".tabbar"), idx = tabbar._ids.indexOf(rota);
  tabbar.style.setProperty("--i", String(idx < 0 ? tabbar._ids.length : idx));
  shell.querySelector('button.tab[data-id="mais"]').classList.toggle("on", idx < 0);
  const page = shell.querySelector("#page"), y = window.scrollY;
  const next = h("div", { class: "page" + (entering ? " enter" : "") }); next.id = "page";
  try { nav.v.render(next, { cfg, go }); } catch (e) { console.error(e); next.appendChild(h("div", { class: "card" }, h("p", { class: "form-err" }, "Ops, algo deu errado nesta tela. Tente recarregar."))); }
  if (entering) Array.from(next.children).forEach((c, i) => c.style.setProperty("--i", String(Math.min(i, 9))));
  page.replaceWith(next);
  updateStatus();
  document.title = nav.id === "hoje" ? "Lírio" : nav.label + " · Lírio";
  window.scrollTo(0, entering ? 0 : y);
}
function updateStatus() {
  if (!shell) return;
  const top = shell.querySelector("#topbar"), foot = shell.querySelector("#sidefoot");
  if (top) { top.innerHTML = ""; top.appendChild(pill()); }
  if (foot) { foot.innerHTML = ""; foot.appendChild(pill()); }
}

/* ---------- inicialização ---------- */
bootTheme();
window.addEventListener("hashchange", () => { db.lerChaveDoLink(); renderPage(true); });
window.addEventListener("lirio:rerender", () => renderPage(false));
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); window.__lirioInstall = e; });

let themeKey = "";
db.subscribe((kind) => {
  const u = db.user();
  if (u) { const c = db.config(), k = JSON.stringify([c.tema, c.accent, c.fonteTexto, c.fonteTitulo, c.modo, c.tamanho, c.cantos]); if (k !== themeKey) { themeKey = k; applyTheme(c); } }
  if (kind === "sync") { updateStatus(); return; }
  if (kind === "remote") { const a = document.activeElement; if (a && a.closest && a.closest("#page") && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return; if (document.querySelector(".sheet-bd")) return; }
  if (kind === "auth") themeKey = "";
  renderPage(kind === "auth");
});

app.innerHTML = '<div class="splash"><span class="splash-flower"></span></div>';
db.lerChaveDoLink();
db.init().then(() => renderPage(true)).catch((e) => { console.error(e); renderPage(true); });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").then((reg) => {
    reg.addEventListener("updatefound", () => { const w = reg.installing; w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) toast("Nova versão disponível. Feche e abra o app para atualizar.", 6000); }); });
  }).catch(() => {}));
}
