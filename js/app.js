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
const lembrado = () => { try { return localStorage.getItem("lirio:email") || ""; } catch (e) { return ""; } };

/* ---------- entrada (acesso só dela) ---------- */
function authScreen() {
  const email = h("input", { class: "input", type: "email", name: "email", id: "a-email", autocomplete: "username", inputmode: "email", required: true, placeholder: "seu@email.com", value: lembrado(), autocapitalize: "none", spellcheck: "false" });
  const senha = h("input", { class: "input", type: "password", name: "password", id: "a-senha", autocomplete: "current-password", required: true, placeholder: "Sua senha", enterkeyhint: "go" });
  const olho = h("button", { class: "eye", type: "button", "aria-label": "Mostrar senha", onclick: () => { const v = senha.type === "password"; senha.type = v ? "text" : "password"; olho.setAttribute("aria-label", v ? "Ocultar senha" : "Mostrar senha"); olho.classList.toggle("on", v); } }, icon("eye", 18));
  const msg = h("div", { class: "form-err", role: "alert", hidden: true }), ok = h("div", { class: "form-ok", role: "status", hidden: true });
  const btn = h("button", { class: "btn primary block big", type: "submit" }, h("span", null, "Entrar"));
  const aviso = (t, bom) => { msg.hidden = bom; ok.hidden = !bom; (bom ? ok : msg).textContent = t; };
  const form = h("form", { class: "stack", onsubmit: async (e) => {
    e.preventDefault(); aviso("", true); ok.hidden = true; btn.disabled = true; btn.classList.add("loading");
    try { try { localStorage.setItem("lirio:email", email.value.trim()); } catch (x) { /* ignore */ } await db.signIn(email.value.trim(), senha.value); }
    catch (ex) { aviso(ex.message, false); } finally { btn.disabled = false; btn.classList.remove("loading"); }
  } },
  h("div", { class: "field" }, h("label", { class: "flabel", for: "a-email" }, "E-mail"), email),
  h("div", { class: "field" }, h("label", { class: "flabel", for: "a-senha" }, "Senha"), h("div", { class: "pw" }, senha, olho)),
  msg, ok, btn);
  const link = h("button", { class: "link", type: "button", onclick: async () => {
    if (!email.value.trim()) { aviso("Digite seu e-mail primeiro.", false); email.focus(); return; }
    try { await db.signInMagic(email.value.trim()); aviso("Enviei um link de acesso para o seu e-mail.", true); } catch (ex) { aviso(ex.message, false); }
  } }, "Receber link de acesso por e-mail");
  const esq = h("button", { class: "link", type: "button", onclick: async () => {
    if (!email.value.trim()) { aviso("Digite seu e-mail primeiro.", false); email.focus(); return; }
    try { await db.resetPassword(email.value.trim()); aviso("Enviei o link para criar uma nova senha.", true); } catch (ex) { aviso(ex.message, false); }
  } }, "Esqueci minha senha");
  return h("div", { class: "auth-wrap" },
    h("span", { class: "auth-flower", "aria-hidden": "true" }),
    h("main", { class: "auth-card" },
      h("img", { src: "icons/icon-192.png", alt: "", class: "auth-logo", width: 76, height: 76 }),
      h("h1", null, "Lírio"), h("p", { class: "auth-sub" }, "Seu espaço, no seu ritmo."),
      form, h("div", { class: "auth-links" }, esq, link),
      h("p", { class: "auth-foot" }, "Acesso exclusivo. Seus dados ficam só com você.")));
}
function novaSenha() {
  formSheet({ title: "Crie uma nova senha", submitLabel: "Salvar", values: { a: "" }, fields: [{ key: "a", label: "Nova senha (mínimo 6 caracteres)", type: "password", required: true }],
    onSubmit: async (s) => { if (s.a.length < 6) throw new Error("Use pelo menos 6 caracteres."); await db.updatePassword(s.a); toast("Senha atualizada"); } });
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
window.addEventListener("hashchange", () => renderPage(true));
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
db.init(novaSenha).then(() => renderPage(true)).catch((e) => { console.error(e); renderPage(true); });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").then((reg) => {
    reg.addEventListener("updatefound", () => { const w = reg.installing; w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) toast("Nova versão disponível. Feche e abra o app para atualizar.", 6000); }); });
  }).catch(() => {}));
}
