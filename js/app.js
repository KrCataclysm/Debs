import { h, icon, sheet, formSheet, toast, rerender } from "./lib.js";
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

const NAV = [
  { id: "hoje", label: "Hoje", ic: "home", mod: null, v: hoje },
  { id: "rotina", label: "Rotina", ic: "repeat", mod: "rotina", v: rotina },
  { id: "tarefas", label: "Tarefas", ic: "tasks", mod: "tarefas", v: tarefas },
  { id: "calendario", label: "Calendário", ic: "calendar", mod: "calendario", v: calendario },
  { id: "habitos", label: "Hábitos", ic: "flame", mod: "habitos", v: habitos },
  { id: "bemestar", label: "Bem-estar", ic: "heart", mod: "bemestar", v: bemestar },
  { id: "financas", label: "Finanças", ic: "wallet", mod: "financas", v: financas },
  { id: "estudos", label: "Estudos", ic: "book", mod: "estudos", v: estudos },
  { id: "notas", label: "Notas", ic: "note", mod: "notas", v: notas },
  { id: "listas", label: "Listas", ic: "cart", mod: "listas", v: listas },
  { id: "datas", label: "Datas", ic: "gift", mod: "datas", v: datas },
  { id: "resumo", label: "Resumo", ic: "chart", mod: "resumo", v: resumo },
  { id: "ajustes", label: "Ajustes", ic: "sliders", mod: null, v: ajustes }
];

const app = document.getElementById("app");
let shell = null, lastCfg = "", rota = "hoje";

const go = (id) => { if (location.hash !== "#/" + id) location.hash = "#/" + id; else renderPage(); };
const enabled = (cfg) => NAV.filter((n) => !n.mod || cfg.modulos[n.mod]);
const currentRoute = () => (location.hash.replace(/^#\//, "") || "hoje");

/* ---------- tela de entrada ---------- */
function authScreen() {
  let modo = "entrar";
  const box = h("div", { class: "auth" });
  const draw = () => {
    box.innerHTML = "";
    const email = h("input", { class: "input", type: "email", autocomplete: "email", required: true, placeholder: "voce@email.com", "aria-label": "E-mail" });
    const senha = h("input", { class: "input", type: "password", autocomplete: modo === "entrar" ? "current-password" : "new-password", required: true, minlength: 6, placeholder: "Senha (mínimo 6 caracteres)", "aria-label": "Senha" });
    const nome = h("input", { class: "input", autocomplete: "given-name", placeholder: "Como posso te chamar?", "aria-label": "Seu nome" });
    const msg = h("div", { class: "form-err", role: "alert", hidden: true });
    const ok = h("div", { class: "form-ok", role: "status", hidden: true });
    const btn = h("button", { class: "btn primary block", type: "submit" }, modo === "entrar" ? "Entrar" : "Criar minha conta");
    const f = h("form", { class: "stack", onsubmit: async (e) => {
      e.preventDefault(); msg.hidden = true; ok.hidden = true; btn.disabled = true;
      try {
        if (modo === "entrar") await db.signIn(email.value.trim(), senha.value);
        else { const r = await db.signUp(email.value.trim(), senha.value, nome.value.trim()); if (r.needsConfirm) { ok.textContent = "Quase lá! Enviei um link de confirmação para o seu e-mail."; ok.hidden = false; } }
      } catch (ex) { msg.textContent = ex.message; msg.hidden = false; } finally { btn.disabled = false; }
    } }, modo === "criar" ? nome : null, email, senha, msg, ok, btn);
    box.appendChild(h("div", { class: "auth-card" },
      h("img", { src: "icons/icon-192.png", alt: "", class: "auth-logo", width: 84, height: 84 }),
      h("h1", null, "Lírio"), h("p", { class: "muted center-text" }, "Sua rotina, seus hábitos e seu bem-estar num só lugar."),
      f,
      modo === "entrar" ? h("button", { class: "link center-text", type: "button", onclick: () => esqueci(email.value.trim()) }, "Esqueci minha senha") : null,
      h("p", { class: "center-text muted small" }, modo === "entrar" ? "Ainda não tem conta? " : "Já tem conta? ",
        h("button", { class: "link", type: "button", onclick: () => { modo = modo === "entrar" ? "criar" : "entrar"; draw(); } }, modo === "entrar" ? "Criar conta" : "Entrar"))));
  };
  draw();
  return h("div", { class: "auth-wrap" }, box);
}
function esqueci(preenchido) {
  formSheet({ title: "Recuperar senha", submitLabel: "Enviar link", values: { email: preenchido || "" },
    fields: [{ key: "email", label: "Seu e-mail", type: "email", required: true }],
    onSubmit: async (s) => { await db.resetPassword(s.email.trim()); toast("Enviei o link para o seu e-mail ✔"); } });
}
function novaSenha() {
  formSheet({ title: "Crie uma nova senha", submitLabel: "Salvar", values: { a: "" }, fields: [{ key: "a", label: "Nova senha", type: "password", required: true }],
    onSubmit: async (s) => { if (s.a.length < 6) throw new Error("Use pelo menos 6 caracteres."); await db.updatePassword(s.a); toast("Senha atualizada ✔"); } });
}

/* ---------- casca do app ---------- */
function pill() {
  const st = db.status();
  const txt = !st.online ? "Offline" + (st.pending ? " · " + st.pending : "") : st.syncing ? "Salvando…" : st.error ? "Sem conexão" : st.pending ? "Pendente · " + st.pending : "Sincronizado";
  const cls = !st.online || st.error ? "warn" : st.syncing || st.pending ? "busy" : "ok";
  return h("button", { class: "syncpill " + cls, type: "button", "aria-label": "Status da sincronização: " + txt, onclick: () => db.pull(true) }, h("i"), txt);
}

function buildShell(cfg) {
  const items = enabled(cfg);
  const primary = items.filter((n) => ["hoje", "rotina", "tarefas", "calendario", "habitos", "bemestar"].includes(n.id)).slice(0, 4);
  const resto = items.filter((n) => !primary.includes(n));
  const link = (n, cls) => h("a", { href: "#/" + n.id, class: cls + (rota === n.id ? " on" : ""), "aria-current": rota === n.id ? "page" : null }, icon(n.ic, 22), h("span", null, n.label));
  const side = h("aside", { class: "side" },
    h("div", { class: "brand" }, h("img", { src: "icons/icon-192.png", alt: "", width: 40, height: 40 }), h("strong", null, "Lírio")),
    h("nav", { "aria-label": "Principal" }, items.map((n) => link(n, "navlink"))),
    h("div", { class: "side-foot", id: "sidefoot" }));
  const tabbar = h("nav", { class: "tabbar", "aria-label": "Principal" }, primary.map((n) => link(n, "tab")),
    h("button", { class: "tab" + (resto.some((n) => n.id === rota) ? " on" : ""), type: "button", onclick: () => maisSheet(resto) }, icon("more", 22), h("span", null, "Mais")));
  const el = h("div", { class: "shell" }, side, h("main", { class: "main", id: "main", tabindex: "-1" }, h("div", { class: "topbar", id: "topbar" }), h("div", { class: "page", id: "page" })), tabbar);
  return el;
}
function maisSheet(resto) {
  sheet("Mais", (close) => h("div", { class: "more-grid" }, resto.map((n) => h("a", { href: "#/" + n.id, class: "more-item" + (rota === n.id ? " on" : ""), onclick: close }, icon(n.ic, 26), h("span", null, n.label)))), { noFocus: true });
}

function renderPage() {
  const u = db.user();
  if (!u) { shell = null; lastCfg = ""; app.innerHTML = ""; app.appendChild(authScreen()); return; }
  const cfg = db.config();
  const cfgKey = JSON.stringify(cfg.modulos);
  rota = currentRoute();
  let nav = enabled(cfg).find((n) => n.id === rota);
  if (!nav) { rota = "hoje"; nav = NAV[0]; if (location.hash !== "#/hoje") history.replaceState(null, "", "#/hoje"); }
  if (!shell || cfgKey !== lastCfg || !app.contains(shell)) { app.innerHTML = ""; shell = buildShell(cfg); app.appendChild(shell); lastCfg = cfgKey; }
  shell.querySelectorAll(".navlink, .tab").forEach((a) => { const on = a.getAttribute("href") === "#/" + rota; a.classList.toggle("on", on); if (a.tagName === "A") { on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"); } });
  const more = shell.querySelector("button.tab"); if (more) more.classList.toggle("on", !shell.querySelector("a.tab.on") && rota !== "hoje");
  const page = shell.querySelector("#page"), y = window.scrollY;
  const next = h("div", { class: "page" }); next.id = "page";
  try { nav.v.render(next, { cfg, go }); } catch (e) { console.error(e); next.appendChild(h("div", { class: "card" }, h("p", { class: "form-err" }, "Ops, algo deu errado nesta tela. Tente recarregar."))); }
  page.replaceWith(next);
  updateStatus();
  window.scrollTo(0, y);
}
function updateStatus() {
  if (!shell) return;
  const top = shell.querySelector("#topbar"), foot = shell.querySelector("#sidefoot");
  if (top) { top.innerHTML = ""; top.appendChild(pill()); }
  if (foot) { foot.innerHTML = ""; foot.appendChild(pill()); }
}

/* ---------- inicialização ---------- */
bootTheme();
window.addEventListener("hashchange", () => { window.scrollTo(0, 0); renderPage(); });
window.addEventListener("lirio:rerender", renderPage);
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); window.__lirioInstall = e; });

let themeKey = "";
db.subscribe((kind) => {
  const u = db.user();
  if (u) { const c = db.config(), k = JSON.stringify([c.tema, c.accent, c.fonteTexto, c.fonteTitulo, c.modo, c.tamanho, c.cantos]); if (k !== themeKey) { themeKey = k; applyTheme(c); } }
  if (kind === "sync") { updateStatus(); return; }
  if (kind === "remote") { const a = document.activeElement; if (a && a.closest && a.closest("#page") && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return; if (document.querySelector(".sheet-bd")) return; }
  if (kind === "auth") themeKey = "";
  renderPage();
});

app.innerHTML = '<div class="splash"><img src="icons/icon-192.png" alt="" width="96" height="96"></div>';
db.init(novaSenha).then(renderPage).catch((e) => { console.error(e); renderPage(); });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").then((reg) => {
    reg.addEventListener("updatefound", () => { const w = reg.installing; w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) toast("Nova versão disponível. Feche e abra o app para atualizar.", 6000); }); });
  }).catch(() => {}));
}
