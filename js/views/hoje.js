import { h, icon, item, check, chip, empty, petals, meta, areaTag, saudacao, hoje, iso, add, parse, dia, rel, between, brl, hm, DIAS, MESES } from "../lib.js";
import * as db from "../store.js";
import { rotinasAtivas, cicloAtual, statusCiclo, toggleCiclo, atrasadas, checksIdx, sequencia, proximaOcorrencia, eventosDoMes } from "../engine.js";
import { editarTarefa, alternarTarefa } from "./tarefas.js";
import { corRotina } from "./rotina.js";
import { abrirFoco } from "./estudos.js";

const FRASES = [
  "Um passo de cada vez já é caminho.", "Cuidar de você também é produtividade.", "Hoje basta fazer o suficiente, e já está bom.",
  "Descansar faz parte do plano.", "Pequenos hábitos, grandes mudanças.", "Você está indo melhor do que imagina.",
  "Respira fundo: uma coisa de cada vez.", "Seja gentil com você hoje.", "Constância vale mais que perfeição.",
  "Celebre as pequenas vitórias.", "Seu ritmo é o ritmo certo."
];
const HUMORES = ["😞", "😕", "😐", "🙂", "😄"];
let lastP = null;

function anel(p, from, label) {
  const r = 38, c = 2 * Math.PI * r;
  const wrap = h("div", { class: "ring-wrap" });
  wrap.innerHTML = '<svg viewBox="0 0 90 90" class="ring" role="img" aria-label="' + label + '"><circle cx="45" cy="45" r="' + r + '" class="ring-bg"/><circle cx="45" cy="45" r="' + r + '" class="ring-fg" stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - from) + '" transform="rotate(-90 45 45)"/></svg><strong>' + Math.round(p * 100) + '<small>%</small></strong>';
  requestAnimationFrame(() => requestAnimationFrame(() => { const fg = wrap.querySelector(".ring-fg"); if (fg) fg.setAttribute("stroke-dashoffset", String(c * (1 - p))); }));
  return wrap;
}

function semana(cfg, go) {
  const t = hoje(), ini = add(t, -t.getDay()), cache = {};
  const ev = (d) => { const k = d.getFullYear() + "-" + d.getMonth(); return (cache[k] = cache[k] || eventosDoMes(d.getFullYear(), d.getMonth(), cfg))[iso(d)] || []; };
  return h("div", { class: "weekstrip", role: "list" }, Array.from({ length: 7 }, (_, i) => {
    const d = add(ini, i), n = ev(d).length, hoj = +d === +t;
    return h("button", { type: "button", role: "listitem", class: "wk" + (hoj ? " today" : ""), "aria-label": DIAS[d.getDay()] + " " + d.getDate() + (n ? ", " + n + " itens" : ""), onclick: () => go("calendario") },
      h("small", null, DIAS[d.getDay()]), h("strong", null, String(d.getDate())), h("i", { class: n ? "has" : "" }));
  }));
}

export function render(root, { cfg, go }) {
  const mod = cfg.modulos, t = hoje(), hojeIso = iso(t);
  const perfil = db.perfil();
  const nome = perfil && perfil.nome ? perfil.nome.split(" ")[0] : "";
  let feitos = 0, total = 0;
  const esq = [], dir = [];
  const secao = (titulo, link, kids) => h("section", { class: "stack" }, h("div", { class: "row between" }, h("h2", null, titulo), link ? h("button", { class: "link", type: "button", onclick: link[1] }, link[0]) : null), kids);

  /* aulas de hoje */
  if (mod.estudos) {
    const mats = new Map(db.rows("materias").map((m) => [m.id, m]));
    const aulas = db.rows("aulas").filter((a) => a.dia_semana === t.getDay()).sort((a, b) => a.inicio.localeCompare(b.inicio));
    if (aulas.length) {
      const agora = hm(new Date().toTimeString());
      esq.push(secao("Aulas de hoje", ["ver horário", () => { abrirFoco("aulas"); go("estudos"); }],
        h("div", { class: "timeline" }, aulas.map((a) => {
          const m = mats.get(a.materia_id), on = agora >= hm(a.inicio) && agora <= hm(a.fim), passou = agora > hm(a.fim);
          return h("div", { class: "tl" + (on ? " now" : "") + (passou ? " past" : ""), style: { "--c": (m && m.cor) || "var(--ac)" } },
            h("div", { class: "tl-time" }, h("strong", null, hm(a.inicio)), h("small", null, hm(a.fim))),
            h("div", { class: "tl-body" }, h("strong", null, (m && m.nome) || a.titulo || "Aula"), h("small", null, [a.local ? a.local : null, on ? "agora" : null].filter(Boolean).join(" · ") || (m && m.professor) || "")));
        }))));
    }
  }

  /* rotina de hoje + atrasadas */
  if (mod.rotina) {
    const linhas = [];
    rotinasAtivas().forEach((a) => {
      const c = cicloAtual(a), st = statusCiclo(a, c);
      if (st.due || (st.done && t >= c.ini && t <= c.fim)) { total++; if (st.done) feitos++; linhas.push({ a, c, st }); }
      atrasadas(a).forEach((ca) => linhas.push({ a, c: ca, st: { late: true, done: false } }));
    });
    if (linhas.length) esq.push(secao("Rotina", ["ver tudo", () => go("rotina")],
      h("div", { class: "card flush" }, linhas.map(({ a, c, st }) => item({
        id: a.id, done: st.done, lead: h("span", { class: "dotbar", style: { background: corRotina(a) } }), title: a.nome,
        sub: meta(areaTag(a.area), st.late ? chip("Atrasada", "bad") : null, st.late ? "era para " + dia(c.fim) : +c.ini === +c.fim ? "hoje" : "até " + dia(c.fim)),
        trail: check(st.done, () => toggleCiclo(a, c), st.done ? "Desfazer" : "Marcar como feita")
      })))));
  }

  /* tarefas */
  if (mod.tarefas) {
    const todas = db.rows("tarefas");
    const venc = todas.filter((x) => !x.feita && x.prazo && parse(x.prazo) <= t).sort((a, b) => a.prazo.localeCompare(b.prazo));
    const feitasHoje = todas.filter((x) => x.feita && x.feito_em && iso(new Date(x.feito_em)) === hojeIso);
    total += venc.length + feitasHoje.length; feitos += feitasHoje.length;
    const outras = todas.filter((x) => !x.feita && (!x.prazo || parse(x.prazo) > t)).length;
    const lista = venc.concat(feitasHoje);
    if (lista.length || outras) esq.push(secao("Tarefas", [outras ? "mais " + outras + " pendentes" : "ver tudo", () => go("tarefas")],
      lista.length ? h("div", { class: "card flush" }, lista.map((x) => item({
        id: x.id, done: x.feita, lead: check(x.feita, () => alternarTarefa(x), x.feita ? "Reabrir" : "Concluir"), title: x.nome,
        sub: meta(areaTag(x.area), !x.feita && parse(x.prazo) < t ? chip("Atrasada", "bad") : null, x.feita ? "concluída hoje" : parse(x.prazo) < t ? dia(parse(x.prazo)) : "para hoje"), onclick: () => editarTarefa(x)
      }))) : h("div", { class: "card softnote" }, "Nada com prazo para hoje.")));
  }

  /* humor e água */
  if (mod.bemestar) {
    const b = db.rows("bemestar").find((x) => x.dia === hojeIso) || {};
    const copos = b.agua_copos || 0, me = { dia: hojeIso, user_id: db.user().id };
    dir.push(secao("Como você está?", ["diário", () => go("bemestar")],
      h("div", { class: "card" },
        h("div", { class: "mood" }, HUMORES.map((e, i) => h("button", { class: "mood-btn" + (b.humor === i + 1 ? " on" : ""), type: "button", "aria-label": "Humor " + (i + 1) + " de 5", "aria-pressed": String(b.humor === i + 1), onclick: () => db.upsertBy("bemestar", me, { humor: i + 1 }) }, e))),
        h("div", { class: "water" }, h("span", { class: "row gap" }, icon("drop", 18), h("span", null, copos + (copos === 1 ? " copo" : " copos") + " de água")),
          h("div", { class: "row gap" },
            h("button", { class: "btn icon ghost", type: "button", "aria-label": "Menos um copo", disabled: copos <= 0, onclick: () => db.upsertBy("bemestar", me, { agua_copos: Math.max(0, copos - 1) }) }, icon("minus", 18)),
            h("button", { class: "btn icon primary", type: "button", "aria-label": "Mais um copo", onclick: () => db.upsertBy("bemestar", me, { agua_copos: copos + 1 }) }, icon("plus", 18)))))));
  }

  /* hábitos */
  if (mod.habitos) {
    const hab = db.rows("habitos").filter((x) => x.ativo !== false);
    if (hab.length) {
      const idx = checksIdx();
      hab.forEach((x) => { total++; if (idx.has(x.id + "|" + hojeIso)) feitos++; });
      dir.push(secao("Hábitos", ["ver tudo", () => go("habitos")],
        h("div", { class: "habit-chips" }, hab.map((x) => {
          const on = idx.has(x.id + "|" + hojeIso), seq = sequencia(x.id, idx);
          return h("button", { class: "habit-chip" + (on ? " on" : ""), type: "button", "aria-pressed": String(on), onclick: () => (on ? db.delBy("habito_checks", { habito_id: x.id, dia: hojeIso }) : db.add("habito_checks", { habito_id: x.id, dia: hojeIso })) },
            h("span", { class: "emo" }, x.emoji), h("span", null, x.nome), seq > 1 ? h("small", null, seq + " dias") : null);
        }))));
    }
  }

  /* próximos */
  const prox = [];
  if (mod.financas) db.rows("contas").filter((c) => !c.paga && between(t, parse(c.vencimento)) <= 7).forEach((c) => prox.push({ d: parse(c.vencimento), ic: "wallet", tx: c.nome + " · " + brl(c.valor) }));
  if (mod.datas) db.rows("datas_importantes").forEach((dt) => { const d = proximaOcorrencia(dt); if (between(t, d) >= 0 && between(t, d) <= 14) prox.push({ d, ic: "gift", tx: dt.titulo }); });
  if (mod.estudos) db.rows("estudos").filter((e) => !e.concluido && e.data && between(t, parse(e.data)) >= 0 && between(t, parse(e.data)) <= 7).forEach((e) => prox.push({ d: parse(e.data), ic: "cap", tx: e.titulo }));
  prox.sort((a, b) => a.d - b.d);
  if (prox.length) dir.push(secao("Vem aí", null,
    h("div", { class: "card flush" }, prox.slice(0, 6).map((p) => item({ lead: h("span", { class: "roundico" }, icon(p.ic, 18)), title: p.tx, sub: dia(p.d) + " · " + rel(p.d) })))));

  if (mod.estudos) dir.push(h("button", { class: "focus-cta", type: "button", onclick: () => { abrirFoco("foco"); go("estudos"); } },
    h("span", { class: "roundico" }, icon("clock", 20)), h("span", { class: "fc-t" }, h("strong", null, "Hora de focar"), h("small", null, "Pomodoro com registro por matéria")), icon("right", 18)));

  const dayOfYear = Math.floor((t - new Date(t.getFullYear(), 0, 0)) / 864e5);
  const p = total ? feitos / total : 0, falta = total - feitos;
  const sub = !total ? FRASES[dayOfYear % FRASES.length] : falta === 0 ? "Tudo feito por hoje. Aproveite o resto do dia." : falta === 1 ? "Falta só uma coisa. Você consegue." : "Faltam " + falta + " coisas hoje. Uma de cada vez.";
  const from = lastP == null ? 0 : lastP;
  if (lastP != null && p === 1 && lastP < 1 && total > 0) petals();
  lastP = p;

  root.appendChild(h("header", { class: "hero" },
    h("div", { class: "hero-date" },
      h("span", { class: "hd-num" }, String(t.getDate()).padStart(2, "0")),
      h("span", { class: "hd-txt" }, h("strong", null, t.toLocaleDateString("pt-BR", { weekday: "long" })), h("small", null, MESES[t.getMonth()] + " · " + t.getFullYear()))),
    h("div", { class: "hero-msg" }, h("h1", null, saudacao() + (nome ? ", " + nome : "")), h("p", { class: "muted" }, sub)),
    total ? h("div", { class: "hero-ring" }, anel(p, from, "Progresso do dia: " + Math.round(p * 100) + "%"), h("small", null, feitos + " de " + total)) : null,
    h("span", { class: "hero-flower", "aria-hidden": "true" })));
  root.appendChild(semana(cfg, go));

  if (!esq.length && !dir.length) { root.appendChild(empty("Seu dia está livre. Que tal criar uma rotina ou um hábito para começar?",
    h("div", { class: "row gap center" }, h("button", { class: "btn primary", type: "button", onclick: () => go("rotina") }, "Criar rotina"), h("button", { class: "btn ghost", type: "button", onclick: () => go("habitos") }, "Criar hábito")))); return; }
  root.appendChild(h("div", { class: "hoje-grid" }, h("div", { class: "col stack-lg" }, esq), h("div", { class: "col stack-lg" }, dir)));
}
