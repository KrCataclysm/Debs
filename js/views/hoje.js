import { h, icon, item, check, chip, empty, saudacao, hoje, iso, add, parse, dia, rel, between, brl } from "../lib.js";
import * as db from "../store.js";
import { rotinasAtivas, cicloAtual, statusCiclo, toggleCiclo, atrasadas, checksIdx, sequencia, proximaOcorrencia } from "../engine.js";
import { editarTarefa, alternarTarefa } from "./tarefas.js";

const FRASES = [
  "Um passo de cada vez já é caminho.", "Cuidar de você também é produtividade.", "Hoje basta fazer o suficiente, e já está bom.",
  "Descansar faz parte do plano.", "Pequenos hábitos, grandes mudanças.", "Você está indo melhor do que imagina.",
  "Respira fundo: uma coisa de cada vez.", "Seja gentil com você hoje.", "Constância vale mais que perfeição.",
  "Celebre as pequenas vitórias.", "Seu ritmo é o ritmo certo."
];
const HUMORES = ["😞", "😕", "😐", "🙂", "😄"];

function anel(p, label) {
  const r = 34, c = 2 * Math.PI * r;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 80 80"); svg.setAttribute("class", "ring"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", label);
  svg.innerHTML = '<circle cx="40" cy="40" r="' + r + '" class="ring-bg"/><circle cx="40" cy="40" r="' + r + '" class="ring-fg" stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - p) + '" transform="rotate(-90 40 40)"/>';
  return h("div", { class: "ring-wrap" }, svg, h("strong", null, Math.round(p * 100) + "%"));
}

export function render(root, { cfg, go }) {
  const mod = cfg.modulos, t = hoje(), hojeIso = iso(t);
  const perfil = db.perfil();
  const nome = perfil && perfil.nome ? perfil.nome.split(" ")[0] : "";
  let feitos = 0, total = 0;
  const blocos = [];

  /* rotinas de hoje + atrasadas */
  if (mod.rotina) {
    const linhas = [];
    rotinasAtivas().forEach((a) => {
      const c = cicloAtual(a), st = statusCiclo(a, c);
      if (st.due || (st.done && t >= c.ini && t <= c.fim)) { total++; if (st.done) feitos++; linhas.push({ a, c, st }); }
      atrasadas(a).forEach((ca) => linhas.push({ a, c: ca, st: { late: true, done: false } }));
    });
    if (linhas.length) blocos.push(h("section", { class: "stack" }, h("div", { class: "row between" }, h("h2", null, "Rotina"), h("button", { class: "link", type: "button", onclick: () => go("rotina") }, "ver tudo")),
      h("div", { class: "card flush" }, linhas.map(({ a, c, st }) => item({
        done: st.done, lead: h("span", { class: "dotbar", style: { background: a.cor || "var(--ac)" } }), title: a.nome,
        sub: st.late ? "Atrasada · era para " + dia(c.fim) : +c.ini === +c.fim ? "Hoje" : "Até " + dia(c.fim),
        trail: [st.late ? chip("Atrasada", "bad") : null, check(st.done, () => toggleCiclo(a, c), st.done ? "Desfazer" : "Marcar como feita")]
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
    if (lista.length || outras) blocos.push(h("section", { class: "stack" }, h("div", { class: "row between" }, h("h2", null, "Tarefas"), h("button", { class: "link", type: "button", onclick: () => go("tarefas") }, outras ? "mais " + outras + " pendentes" : "ver tudo")),
      lista.length ? h("div", { class: "card flush" }, lista.map((x) => item({
        done: x.feita, lead: check(x.feita, () => alternarTarefa(x), x.feita ? "Reabrir" : "Concluir"), title: x.nome,
        sub: x.feita ? "Concluída hoje" : parse(x.prazo) < t ? "Atrasada · " + dia(parse(x.prazo)) : "Para hoje", onclick: () => editarTarefa(x)
      }))) : h("div", { class: "card muted" }, "Nada com prazo para hoje. 🎉")));
  }

  /* hábitos */
  if (mod.habitos) {
    const hab = db.rows("habitos").filter((x) => x.ativo !== false);
    if (hab.length) {
      const idx = checksIdx();
      hab.forEach((x) => { total++; if (idx.has(x.id + "|" + hojeIso)) feitos++; });
      blocos.push(h("section", { class: "stack" }, h("div", { class: "row between" }, h("h2", null, "Hábitos"), h("button", { class: "link", type: "button", onclick: () => go("habitos") }, "ver tudo")),
        h("div", { class: "habit-chips" }, hab.map((x) => {
          const on = idx.has(x.id + "|" + hojeIso), seq = sequencia(x.id, idx);
          return h("button", { class: "habit-chip" + (on ? " on" : ""), type: "button", "aria-pressed": String(on), onclick: () => (on ? db.delBy("habito_checks", { habito_id: x.id, dia: hojeIso }) : db.add("habito_checks", { habito_id: x.id, dia: hojeIso })) },
            h("span", { class: "emo" }, x.emoji), h("span", null, x.nome), seq > 1 ? h("small", null, "🔥 " + seq) : null);
        }))));
    }
  }

  /* humor e água */
  if (mod.bemestar) {
    const b = db.rows("bemestar").find((x) => x.dia === hojeIso) || {};
    const copos = b.agua_copos || 0;
    blocos.push(h("section", { class: "stack" }, h("div", { class: "row between" }, h("h2", null, "Como você está?"), h("button", { class: "link", type: "button", onclick: () => go("bemestar") }, "diário")),
      h("div", { class: "card" }, h("div", { class: "mood" }, HUMORES.map((e, i) => h("button", { class: "mood-btn" + (b.humor === i + 1 ? " on" : ""), type: "button", "aria-label": "Humor " + (i + 1) + " de 5", "aria-pressed": String(b.humor === i + 1), onclick: () => db.upsertBy("bemestar", { dia: hojeIso, user_id: db.user().id }, { humor: i + 1 }) }, e))),
        h("div", { class: "water" }, h("span", { class: "row gap" }, icon("drop", 18), h("span", null, copos + (copos === 1 ? " copo" : " copos") + " de água")),
          h("div", { class: "row gap" },
            h("button", { class: "btn icon ghost", type: "button", "aria-label": "Menos um copo", disabled: copos <= 0, onclick: () => db.upsertBy("bemestar", { dia: hojeIso, user_id: db.user().id }, { agua_copos: Math.max(0, copos - 1) }) }, "−"),
            h("button", { class: "btn icon primary", type: "button", "aria-label": "Mais um copo", onclick: () => db.upsertBy("bemestar", { dia: hojeIso, user_id: db.user().id }, { agua_copos: copos + 1 }) }, "+"))))));
  }

  /* próximos */
  const prox = [];
  if (mod.financas) db.rows("contas").filter((c) => !c.paga && between(t, parse(c.vencimento)) <= 7).forEach((c) => prox.push({ d: parse(c.vencimento), ic: "wallet", tx: c.nome + " · " + brl(c.valor), tag: "conta" }));
  if (mod.datas) db.rows("datas_importantes").forEach((dt) => { const d = proximaOcorrencia(dt); if (between(t, d) >= 0 && between(t, d) <= 14) prox.push({ d, ic: "gift", tx: dt.titulo }); });
  if (mod.estudos) db.rows("estudos").filter((e) => !e.concluido && e.data && between(t, parse(e.data)) >= 0 && between(t, parse(e.data)) <= 7).forEach((e) => prox.push({ d: parse(e.data), ic: "book", tx: e.titulo }));
  prox.sort((a, b) => a.d - b.d);
  if (prox.length) blocos.push(h("section", { class: "stack" }, h("h2", null, "Vem aí"),
    h("div", { class: "card flush" }, prox.slice(0, 6).map((p) => item({ lead: h("span", { class: "roundico" }, icon(p.ic, 18)), title: p.tx, sub: dia(p.d) + " · " + rel(p.d) })))));

  const dayOfYear = Math.floor((t - new Date(t.getFullYear(), 0, 0)) / 864e5);
  const p = total ? feitos / total : 0;
  root.appendChild(h("div", { class: "hero" },
    h("div", null,
      h("p", { class: "eyebrow" }, t.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })),
      h("h1", null, saudacao() + (nome ? ", " + nome : "") + "!"),
      h("p", { class: "muted quote" }, FRASES[dayOfYear % FRASES.length])),
    total ? h("div", { class: "hero-ring" }, anel(p, "Progresso do dia: " + Math.round(p * 100) + "%"), h("small", null, feitos + " de " + total + " hoje")) : null));

  if (!blocos.length) root.appendChild(empty("Seu dia está livre. Que tal criar uma rotina ou um hábito para começar?",
    h("div", { class: "row gap center" }, h("button", { class: "btn primary", type: "button", onclick: () => go("rotina") }, "Criar rotina"), h("button", { class: "btn ghost", type: "button", onclick: () => go("habitos") }, "Criar hábito"))));
  blocos.forEach((b) => root.appendChild(b));
}
