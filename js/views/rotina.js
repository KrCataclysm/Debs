import { h, icon, item, check, chip, empty, formSheet, meta, areaTag, areaCor, AREA_OPTS, AREAS, dia, iso, hoje, rerender } from "../lib.js";
import * as db from "../store.js";
import { rotinasAtivas, cicloAtual, statusCiclo, toggleCiclo, atrasadas, freqNome } from "../engine.js";

const PRESETS = [1, 7, 14, 28, 30];
let filtro = "";
const SUGESTOES = [
  { nome: "Revisar a matéria da semana", freq: 7, duracao: 2, area: "faculdade" },
  { nome: "Organizar a semana", freq: 7, duracao: 1, area: "pessoal" },
  { nome: "Relatório semanal", freq: 7, duracao: 2, area: "trabalho" },
  { nome: "Faxina leve", freq: 7, duracao: 1, area: "casa" },
  { nome: "Cuidar da pele e do cabelo", freq: 7, duracao: 1, area: "saude" },
  { nome: "Revisar os gastos do mês", freq: 30, duracao: 2, area: "financas" }
];
export const corRotina = (a) => areaCor(a.area) || a.cor || "var(--ac)";

export function editarRotina(a, pre) {
  const p = pre || {};
  const v = a ? { nome: a.nome, freqSel: PRESETS.includes(a.freq) ? String(a.freq) : "0", freqCustom: a.freq, inicio: a.inicio, duracao: String(a.duracao), lembrete: a.lembrete, so_dias_uteis: a.so_dias_uteis, area: a.area || "" }
    : { nome: p.nome || "", freqSel: PRESETS.includes(p.freq) ? String(p.freq) : "7", freqCustom: 10, inicio: iso(hoje()), duracao: String(p.duracao || 1), lembrete: false, so_dias_uteis: false, area: p.area || filtro };
  formSheet({
    title: a ? "Editar rotina" : "Nova rotina", values: v, submitLabel: a ? "Salvar" : "Criar rotina",
    fields: [
      { key: "nome", label: "O que você quer manter na rotina?", required: true, maxlength: 120, placeholder: "Ex.: Revisar a matéria da semana" },
      { key: "area", label: "Área da vida", type: "chips", options: AREA_OPTS },
      { key: "freqSel", label: "Com que frequência?", type: "select", options: [{ v: 1, l: "Todo dia" }, { v: 7, l: "Toda semana" }, { v: 14, l: "A cada 15 dias" }, { v: 28, l: "A cada 4 semanas" }, { v: 30, l: "Todo mês" }, { v: 0, l: "Outro intervalo…" }] },
      { key: "freqCustom", label: "Repetir a cada quantos dias?", type: "number", min: 1, max: 365, showIf: (s) => s.freqSel === "0" },
      { key: "inicio", label: "Próxima vez que quero fazer", type: "date", required: true },
      { key: "duracao", label: "Quantos dias tenho para concluir?", type: "select", options: [{ v: 1, l: "1 dia" }, { v: 2, l: "2 dias" }, { v: 3, l: "3 dias" }, { v: 5, l: "5 dias" }, { v: 7, l: "7 dias" }] },
      { key: "lembrete", label: "Aviso 2 dias antes, para eu me preparar", type: "checkbox" },
      { key: "so_dias_uteis", label: "Se cair no fim de semana ou feriado, adiar para o próximo dia útil", type: "checkbox" }
    ],
    onSubmit: (s) => {
      const freq = s.freqSel === "0" ? Math.round(+s.freqCustom) : +s.freqSel;
      if (!(freq >= 1 && freq <= 365)) throw new Error("Escolha um intervalo entre 1 e 365 dias.");
      const row = { nome: s.nome.trim(), freq, inicio: s.inicio, duracao: Math.min(+s.duracao, freq), lembrete: !!s.lembrete, so_dias_uteis: !!s.so_dias_uteis, area: s.area || null, cor: areaCor(s.area) || null, ativa: true };
      if (a) db.patch("rotinas", a.id, row); else db.add("rotinas", row);
    },
    onDelete: a ? () => db.del("rotinas", a.id) : null, deleteLabel: "Excluir rotina"
  });
}

export function linhaRotina(a, c, { mostrarArea = true } = {}) {
  const st = statusCiclo(a, c);
  const quando = (+c.ini === +c.fim ? dia(c.ini) : dia(c.ini) + " → " + dia(c.fim)) + (c.ajustado ? " · adiada (feriado/fim de semana)" : "");
  const aviso = !st.done && c.avisoIni && hoje() >= c.avisoIni && hoje() < c.ini ? chip("Prepare-se", "soft") : null;
  return item({
    id: a.id, cls: "rotina", done: st.done,
    lead: h("span", { class: "dotbar", style: { background: corRotina(a) } }),
    title: a.nome,
    sub: meta(mostrarArea ? areaTag(a.area) : null, chip(st.txt, st.cls), aviso, freqNome(a.freq) + " · " + quando),
    trail: check(st.done, () => toggleCiclo(a, c), st.done ? "Desfazer " + a.nome : "Marcar " + a.nome + " como feita"),
    onclick: () => editarRotina(a)
  });
}

export function filtroAreas(atual, onPick, usadas) {
  const opts = [{ v: "", l: "Tudo" }].concat(Object.entries(AREAS).filter(([k]) => !usadas || usadas.has(k)).map(([v, o]) => ({ v, l: o.l, c: o.c })));
  if (opts.length <= 2) return null;
  return h("div", { class: "chips filter", role: "group", "aria-label": "Filtrar por área" }, opts.map((o) => h("button", { type: "button", class: "chipbtn" + (atual === o.v ? " on" : ""), style: o.c ? { "--c": o.c, "--on-c": "#fff" } : null, "aria-pressed": String(atual === o.v), onclick: () => onPick(o.v) }, o.c ? h("i", { class: "cdot" }) : null, o.l)));
}

export function render(root) {
  const todas = rotinasAtivas();
  root.appendChild(h("div", { class: "page-head" },
    h("div", null, h("p", { class: "eyebrow" }, "Constância"), h("h1", null, "Rotina"), h("p", { class: "muted" }, "O que se repete, no seu ritmo.")),
    h("button", { class: "btn primary", type: "button", onclick: () => editarRotina() }, icon("plus", 18), h("span", null, "Nova rotina"))));

  if (!todas.length) {
    root.appendChild(empty("Comece com uma sugestão ou crie a sua. Pode editar tudo depois.",
      h("div", { class: "chips" }, SUGESTOES.map((s) => h("button", { class: "chipbtn", style: { "--c": areaCor(s.area) }, type: "button", onclick: () => editarRotina(null, s) }, h("i", { class: "cdot" }), s.nome)))));
    return;
  }

  /* visão geral por frequência (da agenda original) */
  const grupos = [["Diárias", (a) => a.freq === 1], ["Semanais", (a) => a.freq > 1 && a.freq <= 9], ["Quinzenais", (a) => a.freq > 9 && a.freq <= 20], ["Mensais", (a) => a.freq > 20]];
  root.appendChild(h("div", { class: "overview" }, grupos.map(([t, f]) => { const n = todas.filter(f).length; return h("div", { class: "ov" + (n ? "" : " zero") }, h("strong", null, String(n)), h("small", null, t)); })));

  const fa = filtroAreas(filtro, (v) => { filtro = v; rerender(); }, new Set(todas.map((a) => a.area).filter(Boolean)));
  if (fa) root.appendChild(fa);
  const lista = todas.filter((a) => !filtro || a.area === filtro);

  const atr = [];
  lista.forEach((a) => atrasadas(a).forEach((c) => atr.push([a, c])));
  if (atr.length) {
    root.appendChild(h("section", { class: "stack" }, h("h2", null, "Ficaram para trás"),
      h("div", { class: "card flush" }, atr.map(([a, c]) => item({
        cls: "rotina", lead: h("span", { class: "dotbar", style: { background: corRotina(a) } }), title: a.nome, sub: meta(chip("Atrasada", "bad"), "Era para " + dia(c.fim)),
        trail: check(false, () => toggleCiclo(a, c), "Marcar como feita")
      })))));
  }

  const defs = [[1, "Todo dia"], [7, "Toda semana"], [14, "Quinzenais"], [28, "A cada 4 semanas"]];
  const usados = new Set();
  const sec = (titulo, arr) => arr.length && root.appendChild(h("section", { class: "stack" }, h("h2", null, titulo),
    h("div", { class: "card flush" }, arr.map((a) => linhaRotina(a, cicloAtual(a))))));
  defs.forEach(([f, t]) => { const arr = lista.filter((a) => a.freq === f); arr.forEach((a) => usados.add(a.id)); sec(t, arr); });
  sec("Outros intervalos", lista.filter((a) => !usados.has(a.id)));
  if (!lista.length) root.appendChild(empty("Nada nessa área ainda."));
  root.appendChild(h("p", { class: "note" }, "Toque numa rotina para editar. A bolinha marca o ciclo atual como feito."));
}
