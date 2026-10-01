import { h, icon, item, check, chip, empty, seg, formSheet, confirmBox, toast, progress, parse, dia, rel, between, hoje, iso, hm, add, DIAS, DIAS_LONGO, CORES, rerender } from "../lib.js";
import * as db from "../store.js";
import { editarMeta, cardMeta } from "./financas.js";

let aba = "agenda";
export function abrirFoco(tab) { aba = tab || "foco"; }

const TIPOS = [{ v: "prova", l: "Prova" }, { v: "trabalho", l: "Trabalho" }, { v: "tarefa", l: "Atividade" }, { v: "leitura", l: "Leitura" }];
const TIPO_L = { prova: "Prova", trabalho: "Trabalho", tarefa: "Atividade", leitura: "Leitura" };

/* ---------- cronômetro de foco (continua mesmo trocando de tela) ---------- */
const T = { running: false, mins: 25, left: 25 * 60, endAt: 0, materia: "", tick: null };
const fmt = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
function bip() { try { const a = new (window.AudioContext || window.webkitAudioContext)(); [0, 0.25, 0.5].forEach((d, i) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 660 + i * 110; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(0.0001, a.currentTime + d); g.gain.exponentialRampToValueAtTime(0.2, a.currentTime + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d + 0.22); o.start(a.currentTime + d); o.stop(a.currentTime + d + 0.25); }); } catch (e) { /* sem áudio */ } }
function paint() {
  const left = T.running ? Math.max(0, Math.round((T.endAt - Date.now()) / 1000)) : T.left, total = T.mins * 60;
  const txt = document.querySelector("[data-timer-txt]"), fg = document.querySelector("[data-timer-ring]");
  if (txt) txt.textContent = fmt(left);
  if (fg) { const c = 2 * Math.PI * 88; fg.setAttribute("stroke-dashoffset", String(c * (1 - (total - left) / total))); }
  document.title = T.running ? fmt(left) + " · Foco" : "Lírio";
  if (T.running && left <= 0) finalizar(true);
}
function salvar(minutos) { if (minutos >= 1) { db.add("foco", { materia_id: T.materia || null, minutos: Math.min(600, minutos), dia: iso(hoje()) }); toast("Sessão registrada · " + minutos + " min"); } }
function iniciar() { T.endAt = Date.now() + T.left * 1000; T.running = true; clearInterval(T.tick); T.tick = setInterval(paint, 250); rerender(); }
function pausar() { T.left = Math.max(1, Math.round((T.endAt - Date.now()) / 1000)); T.running = false; clearInterval(T.tick); document.title = "Lírio"; rerender(); }
function zerar() { T.running = false; clearInterval(T.tick); T.left = T.mins * 60; document.title = "Lírio"; rerender(); }
function finalizar(completo) {
  const feitos = completo ? T.mins : Math.floor((T.mins * 60 - (T.running ? Math.max(0, Math.round((T.endAt - Date.now()) / 1000)) : T.left)) / 60);
  T.running = false; clearInterval(T.tick); T.left = T.mins * 60; document.title = "Lírio";
  if (completo) bip();
  salvar(feitos); rerender();
}

/* ---------- formulários ---------- */
function editarItem(x) {
  const mats = db.rows("materias");
  formSheet({
    title: x ? "Editar item" : "Novo item da faculdade", submitLabel: x ? "Salvar" : "Adicionar",
    values: x ? { titulo: x.titulo, tipo: x.tipo, materia_id: x.materia_id || "", data: x.data || "", nota: x.nota == null ? "" : x.nota, concluido: x.concluido } : { titulo: "", tipo: "tarefa", materia_id: "", data: "", nota: "", concluido: false },
    fields: [
      { key: "titulo", label: "O que é?", required: true, maxlength: 120, placeholder: "Ex.: Prova de Cálculo, entrega do relatório" },
      { key: "tipo", label: "Tipo", type: "chips", options: TIPOS },
      { key: "materia_id", label: "Matéria", type: "select", options: [{ v: "", l: "Sem matéria" }].concat(mats.map((m) => ({ v: m.id, l: m.nome }))) },
      { key: "data", label: "Data (entrega ou prova)", type: "date" },
      { key: "nota", label: "Nota (quando sair)", type: "number", step: "0.1", min: 0, max: 100, showIf: (s) => s.tipo === "prova" || s.tipo === "trabalho" },
      { key: "concluido", label: "Concluído", type: "checkbox" }
    ],
    onSubmit: (s) => {
      const row = { titulo: s.titulo.trim(), tipo: s.tipo, materia_id: s.materia_id || null, data: s.data || null, nota: s.nota === "" || s.nota == null ? null : +s.nota, concluido: !!s.concluido };
      if (x) db.patch("estudos", x.id, row); else db.add("estudos", row);
    },
    onDelete: x ? () => db.del("estudos", x.id) : null
  });
}
function editarMateria(m) {
  formSheet({
    title: m ? "Editar matéria" : "Nova matéria", values: m ? { nome: m.nome, professor: m.professor || "", cor: m.cor || CORES[7], max: m.max_faltas || "" } : { nome: "", professor: "", cor: CORES[7], max: "" },
    fields: [
      { key: "nome", label: "Nome da matéria", required: true, maxlength: 60 },
      { key: "professor", label: "Professor(a) (opcional)", maxlength: 60 },
      { key: "max", label: "Limite de faltas (opcional)", type: "number", min: 1, max: 99, hint: "Se preencher, eu aviso quando estiver chegando perto." },
      { key: "cor", label: "Cor", type: "color" }
    ],
    onSubmit: (s) => { const row = { nome: s.nome.trim(), professor: (s.professor || "").trim() || null, cor: s.cor, max_faltas: s.max === "" || s.max == null ? null : Math.max(1, Math.round(+s.max)) }; if (m) db.patch("materias", m.id, row); else db.add("materias", Object.assign({ faltas: 0 }, row)); },
    onDelete: m ? () => db.del("materias", m.id) : null, deleteLabel: "Excluir matéria"
  });
}
function editarAula(a, diaIni) {
  const mats = db.rows("materias");
  if (!mats.length && !a) { toast("Cadastre uma matéria primeiro, na aba Matérias."); return; }
  formSheet({
    title: a ? "Editar aula" : "Nova aula", submitLabel: a ? "Salvar" : "Adicionar",
    values: a ? { materia_id: a.materia_id || "", dia_semana: String(a.dia_semana), inicio: hm(a.inicio), fim: hm(a.fim), local: a.local || "" } : { materia_id: mats[0] ? mats[0].id : "", dia_semana: String(diaIni == null ? 1 : diaIni), inicio: "19:00", fim: "20:40", local: "" },
    fields: [
      { key: "materia_id", label: "Matéria", type: "select", options: mats.map((m) => ({ v: m.id, l: m.nome })), required: true },
      { key: "dia_semana", label: "Dia da semana", type: "chips", options: [1, 2, 3, 4, 5, 6, 0].map((n) => ({ v: String(n), l: DIAS[n] })) },
      { key: "inicio", label: "Começa", type: "time", required: true },
      { key: "fim", label: "Termina", type: "time", required: true },
      { key: "local", label: "Sala ou bloco (opcional)", maxlength: 40 }
    ],
    onSubmit: (s) => {
      if (s.fim <= s.inicio) throw new Error("O horário de término precisa ser depois do início.");
      const row = { materia_id: s.materia_id, dia_semana: +s.dia_semana, inicio: s.inicio, fim: s.fim, local: (s.local || "").trim() || null };
      if (a) db.patch("aulas", a.id, row); else db.add("aulas", row);
    },
    onDelete: a ? () => db.del("aulas", a.id) : null, deleteLabel: "Excluir aula"
  });
}

/* ---------- telas ---------- */
function tAgenda(root, mats) {
  const t = hoje(), todos = db.rows("estudos");
  const pend = todos.filter((x) => !x.concluido).sort((a, b) => (a.data && b.data ? a.data.localeCompare(b.data) : a.data ? -1 : b.data ? 1 : 0));
  const feitos = todos.filter((x) => x.concluido).sort((a, b) => (b.data || "").localeCompare(a.data || "")).slice(0, 10);
  const linha = (x) => {
    const m = mats.get(x.materia_id), n = x.data ? between(t, parse(x.data)) : null;
    return item({ id: x.id, done: x.concluido, lead: check(x.concluido, () => db.patch("estudos", x.id, { concluido: !x.concluido }), x.concluido ? "Reabrir" : "Concluir"),
      title: x.titulo, sub: [TIPO_L[x.tipo], m ? m.nome : null, x.data ? dia(parse(x.data)) + " · " + rel(parse(x.data)) : "Sem data", x.nota != null ? "nota " + String(x.nota).replace(".", ",") : null].filter(Boolean).join(" · "),
      trail: x.concluido ? null : n != null && n < 0 ? chip("Atrasado", "bad") : n != null && n <= 3 ? chip(n === 0 ? "Hoje" : "Em " + n + "d", "warn") : null, onclick: () => editarItem(x) });
  };
  const grupos = [["Atrasados", pend.filter((x) => x.data && between(t, parse(x.data)) < 0)], ["Esta semana", pend.filter((x) => x.data && between(t, parse(x.data)) >= 0 && between(t, parse(x.data)) <= 7)], ["Mais adiante", pend.filter((x) => x.data && between(t, parse(x.data)) > 7)], ["Sem data", pend.filter((x) => !x.data)]];
  if (!pend.length) root.appendChild(empty("Nada pendente. Aproveite o respiro."));
  grupos.forEach(([tt, arr]) => { if (arr.length) root.appendChild(h("section", { class: "stack" }, h("h2", null, tt), h("div", { class: "card flush" }, arr.map(linha)))); });
  if (feitos.length) root.appendChild(h("section", { class: "stack" }, h("h2", null, "Concluídos"), h("div", { class: "card flush" }, feitos.map(linha))));
}

function tAulas(root, mats) {
  const aulas = db.rows("aulas"), hojeD = hoje().getDay();
  const ordem = [1, 2, 3, 4, 5, 6].concat(aulas.some((a) => a.dia_semana === 0) ? [0] : []);
  if (!aulas.length) { root.appendChild(empty("Monte seu horário da semana. Ele aparece no Hoje nos dias de aula.", h("button", { class: "btn primary", type: "button", onclick: () => editarAula(null) }, "Adicionar aula"))); return; }
  root.appendChild(h("div", { class: "timetable" }, ordem.map((d) => {
    const doDia = aulas.filter((a) => a.dia_semana === d).sort((a, b) => a.inicio.localeCompare(b.inicio));
    return h("section", { class: "tt-col" + (d === hojeD ? " today" : "") },
      h("header", null, h("strong", null, DIAS_LONGO[d]), h("button", { class: "btn icon ghost sm", type: "button", "aria-label": "Adicionar aula na " + DIAS_LONGO[d], onclick: () => editarAula(null, d) }, icon("plus", 16))),
      doDia.length ? doDia.map((a) => { const m = mats.get(a.materia_id); return h("button", { type: "button", class: "tt-aula", style: { "--c": (m && m.cor) || "var(--ac)" }, onclick: () => editarAula(a) }, h("small", null, hm(a.inicio) + " – " + hm(a.fim)), h("strong", null, m ? m.nome : "Aula"), a.local ? h("small", null, a.local) : null); }) : h("p", { class: "tt-free" }, "Livre"));
  })));
}

function tMaterias(root, mats) {
  const lista = [...mats.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if (!lista.length) { root.appendChild(empty("Cadastre suas matérias do semestre para organizar provas, faltas e notas.", h("button", { class: "btn primary", type: "button", onclick: () => editarMateria() }, "Adicionar matéria"))); return; }
  root.appendChild(h("div", { class: "mats" }, lista.map((m) => {
    const its = db.rows("estudos").filter((x) => x.materia_id === m.id), notas = its.filter((x) => x.nota != null).map((x) => Number(x.nota)), pend = its.filter((x) => !x.concluido).length;
    const faltas = m.faltas || 0, media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null, lim = m.max_faltas, fp = lim ? faltas / lim : 0;
    const min = db.rows("foco").filter((f) => f.materia_id === m.id).reduce((s, f) => s + f.minutos, 0);
    return h("article", { class: "mat", style: { "--c": m.cor || "var(--ac)" } },
      h("header", null, h("button", { class: "mat-name", type: "button", onclick: () => editarMateria(m) }, h("strong", null, m.nome), m.professor ? h("small", null, m.professor) : null), media != null ? chip("média " + media.toFixed(1).replace(".", ","), "soft") : null),
      h("div", { class: "mat-stats" }, h("div", null, h("strong", null, String(pend)), h("small", null, pend === 1 ? "pendente" : "pendentes")), h("div", null, h("strong", null, min >= 60 ? Math.floor(min / 60) + "h" + (min % 60 ? String(min % 60).padStart(2, "0") : "") : min + "min"), h("small", null, "de foco"))),
      h("div", { class: "faltas" }, h("div", { class: "row between" }, h("span", { class: "muted small" }, "Faltas"), h("strong", { class: fp >= 1 ? "t-bad" : fp >= 0.75 ? "t-warn" : "" }, faltas + (lim ? " / " + lim : ""))),
        lim ? progress(Math.min(1, fp), fp >= 1 ? "bad" : fp >= 0.75 ? "warn" : "") : null,
        h("div", { class: "row gap end" },
          h("button", { class: "btn icon ghost sm", type: "button", "aria-label": "Menos uma falta em " + m.nome, disabled: faltas <= 0, onclick: () => db.patch("materias", m.id, { faltas: Math.max(0, faltas - 1) }) }, icon("minus", 16)),
          h("button", { class: "btn icon ghost sm", type: "button", "aria-label": "Mais uma falta em " + m.nome, onclick: () => db.patch("materias", m.id, { faltas: faltas + 1 }) }, icon("plus", 16)))));
  })));
}

function tFoco(root, mats) {
  const c = 2 * Math.PI * 88, left = T.running ? Math.max(0, Math.round((T.endAt - Date.now()) / 1000)) : T.left, total = T.mins * 60;
  const ring = h("div", { class: "timer-ring" });
  ring.innerHTML = '<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="88" class="ring-bg"/><circle cx="100" cy="100" r="88" class="ring-fg" data-timer-ring stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - (total - left) / total) + '" transform="rotate(-90 100 100)"/></svg>';
  ring.appendChild(h("div", { class: "timer-txt" }, h("strong", { "data-timer-txt": "", role: "timer" }, fmt(left)), h("small", null, T.running ? "focando" : left < total ? "pausado" : "pronta para começar")));
  root.appendChild(h("section", { class: "card timer" }, ring,
    h("div", { class: "chips center-chips", role: "radiogroup", "aria-label": "Duração" }, [15, 25, 50, 90].map((m) => h("button", { type: "button", role: "radio", class: "chipbtn" + (T.mins === m ? " on" : ""), "aria-checked": String(T.mins === m), disabled: T.running || left < total, onclick: () => { T.mins = m; T.left = m * 60; rerender(); } }, m + " min"))),
    h("div", { class: "field narrow" }, h("label", { class: "flabel", for: "foco-mat" }, "Estudando"), h("select", { class: "input", id: "foco-mat", disabled: T.running, onchange: (e) => { T.materia = e.target.value; } }, [h("option", { value: "" }, "Geral")].concat([...mats.values()].map((m) => h("option", { value: m.id, selected: T.materia === m.id }, m.nome))))),
    h("div", { class: "row gap center" },
      T.running ? h("button", { class: "btn primary big", type: "button", onclick: pausar }, icon("pause", 20), h("span", null, "Pausar")) : h("button", { class: "btn primary big", type: "button", onclick: iniciar }, icon("play", 20), h("span", null, left < total ? "Continuar" : "Começar")),
      left < total ? h("button", { class: "btn ghost", type: "button", onclick: () => finalizar(false) }, "Concluir e salvar") : null,
      left < total ? h("button", { class: "btn icon ghost", type: "button", "aria-label": "Zerar", onclick: zerar }, icon("reset", 18)) : null)));

  const t = hoje(), ini = iso(add(t, -t.getDay())), todas = db.rows("foco"), semana = todas.filter((f) => f.dia >= ini), hojeMin = todas.filter((f) => f.dia === iso(t)).reduce((s, f) => s + f.minutos, 0);
  const totSem = semana.reduce((s, f) => s + f.minutos, 0), porM = {};
  semana.forEach((f) => { const k = f.materia_id || ""; porM[k] = (porM[k] || 0) + f.minutos; });
  const hh = (m) => (m >= 60 ? Math.floor(m / 60) + "h " + String(m % 60).padStart(2, "0") + "min" : m + " min");
  root.appendChild(h("div", { class: "grid2" }, h("div", { class: "stat" }, h("small", null, "Hoje"), h("strong", null, hh(hojeMin))), h("div", { class: "stat" }, h("small", null, "Esta semana"), h("strong", null, hh(totSem)))));
  const linhas = Object.entries(porM).sort((a, b) => b[1] - a[1]);
  if (linhas.length) root.appendChild(h("section", { class: "card stack" }, h("h3", null, "Por matéria, nesta semana"), linhas.map(([k, v]) => { const m = mats.get(k); return h("div", { class: "catrow", style: { "--c": (m && m.cor) || "var(--ac)" } }, h("span", null, m ? m.nome : "Geral"), progress(v / linhas[0][1]), h("strong", null, hh(v))); })));
  const ult = todas.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);
  if (ult.length) root.appendChild(h("section", { class: "stack" }, h("h2", null, "Últimas sessões"), h("div", { class: "card flush" }, ult.map((f) => { const m = mats.get(f.materia_id);
    return item({ lead: h("span", { class: "dotbar", style: { background: (m && m.cor) || "var(--ac)" } }), title: (m ? m.nome : "Geral") + " · " + f.minutos + " min", sub: dia(parse(f.dia)) + " · " + rel(parse(f.dia)),
      trail: h("button", { class: "btn icon ghost sm", type: "button", "aria-label": "Apagar sessão", onclick: async (e) => { e.stopPropagation(); if (await confirmBox("Apagar esta sessão de foco?", { ok: "Apagar" })) db.del("foco", f.id); } }, icon("trash", 16)) }); }))));
}

export function render(root) {
  const mats = new Map(db.rows("materias").map((m) => [m.id, m]));
  const acao = { agenda: ["Novo item", () => editarItem()], aulas: ["Nova aula", () => editarAula(null)], mat: ["Matéria", () => editarMateria()], metas: ["Nova meta", () => editarMeta(null, "estudo")] }[aba];
  root.appendChild(h("div", { class: "page-head" }, h("div", null, h("p", { class: "eyebrow" }, "Semestre"), h("h1", null, "Faculdade"), h("p", { class: "muted" }, "Provas, aulas, faltas e foco.")),
    acao ? h("button", { class: "btn primary", type: "button", onclick: acao[1] }, icon("plus", 18), h("span", null, acao[0])) : null));
  root.appendChild(h("div", { class: "toolbar" }, seg([{ v: "agenda", l: "Agenda" }, { v: "aulas", l: "Aulas" }, { v: "mat", l: "Matérias" }, { v: "foco", l: "Foco" }, { v: "metas", l: "Metas" }], aba, (v) => { aba = v; rerender(); })));
  if (aba === "agenda") tAgenda(root, mats);
  if (aba === "aulas") tAulas(root, mats);
  if (aba === "mat") tMaterias(root, mats);
  if (aba === "foco") { tFoco(root, mats); if (T.running) { clearInterval(T.tick); T.tick = setInterval(paint, 250); } }
  if (aba === "metas") {
    const metas = db.rows("metas").filter((m) => m.tipo !== "financeira").sort((a, b) => Number(a.concluida) - Number(b.concluida) || a.created_at.localeCompare(b.created_at));
    root.appendChild(metas.length ? h("div", { class: "stack" }, metas.map(cardMeta)) : empty("Defina um objetivo, como um projeto, um idioma ou uma média, e acompanhe o avanço."));
  }
}
