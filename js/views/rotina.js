import { h, icon, item, check, chip, empty, formSheet, dia, iso, hoje, add } from "../lib.js";
import * as db from "../store.js";
import { rotinasAtivas, cicloAtual, statusCiclo, toggleCiclo, atrasadas, freqNome, ciclo } from "../engine.js";

const PRESETS = [1, 7, 14, 28, 30];
const SUGESTOES = [
  { nome: "Hidratação nos cabelos", freq: 7, duracao: 1 },
  { nome: "Trocar a roupa de cama", freq: 7, duracao: 1 },
  { nome: "Faxina leve da casa", freq: 7, duracao: 1 },
  { nome: "Esfoliação / máscara facial", freq: 14, duracao: 1 },
  { nome: "Revisar os gastos do mês", freq: 30, duracao: 2 },
  { nome: "Ligar para a família", freq: 7, duracao: 1 }
];

export function editarRotina(a, pre) {
  const v = a ? { nome: a.nome, freqSel: PRESETS.includes(a.freq) ? String(a.freq) : "0", freqCustom: a.freq, inicio: a.inicio, duracao: String(a.duracao), lembrete: a.lembrete, so_dias_uteis: a.so_dias_uteis, cor: a.cor || "#D6477F" }
    : { nome: (pre && pre.nome) || "", freqSel: pre && PRESETS.includes(pre.freq) ? String(pre.freq) : "7", freqCustom: 10, inicio: iso(hoje()), duracao: String((pre && pre.duracao) || 1), lembrete: false, so_dias_uteis: false, cor: "#D6477F" };
  formSheet({
    title: a ? "Editar rotina" : "Nova rotina", values: v, submitLabel: a ? "Salvar" : "Criar rotina",
    fields: [
      { key: "nome", label: "O que você quer manter na rotina?", required: true, maxlength: 120, placeholder: "Ex.: Hidratação nos cabelos" },
      { key: "freqSel", label: "Com que frequência?", type: "select", options: [{ v: 1, l: "Todo dia" }, { v: 7, l: "Toda semana" }, { v: 14, l: "A cada 15 dias" }, { v: 28, l: "A cada 4 semanas" }, { v: 30, l: "Todo mês" }, { v: 0, l: "Outro intervalo…" }] },
      { key: "freqCustom", label: "Repetir a cada quantos dias?", type: "number", min: 1, max: 365, showIf: (s) => s.freqSel === "0" },
      { key: "inicio", label: "Próxima vez que quero fazer", type: "date", required: true },
      { key: "duracao", label: "Quantos dias tenho para concluir?", type: "select", options: [{ v: 1, l: "1 dia" }, { v: 2, l: "2 dias" }, { v: 3, l: "3 dias" }, { v: 5, l: "5 dias" }, { v: 7, l: "7 dias" }] },
      { key: "lembrete", label: "Aviso 2 dias antes, para eu me preparar", type: "checkbox" },
      { key: "so_dias_uteis", label: "Se cair no fim de semana ou feriado, adiar para o próximo dia útil", type: "checkbox" },
      { key: "cor", label: "Cor", type: "color" }
    ],
    onSubmit: (s) => {
      const freq = s.freqSel === "0" ? Math.round(+s.freqCustom) : +s.freqSel;
      if (!(freq >= 1 && freq <= 365)) throw new Error("Escolha um intervalo entre 1 e 365 dias.");
      const row = { nome: s.nome.trim(), freq, inicio: s.inicio, duracao: Math.min(+s.duracao, freq), lembrete: !!s.lembrete, so_dias_uteis: !!s.so_dias_uteis, cor: s.cor, ativa: true };
      if (a) db.patch("rotinas", a.id, row); else db.add("rotinas", row);
    },
    onDelete: a ? () => db.del("rotinas", a.id) : null, deleteLabel: "Excluir rotina"
  });
}

export function linhaRotina(a, c, { mostrarNome = true } = {}) {
  const st = statusCiclo(a, c);
  const quando = (+c.ini === +c.fim ? dia(c.ini) : dia(c.ini) + " → " + dia(c.fim)) + (c.ajustado ? " · adiada por feriado/fim de semana" : "");
  const aviso = !st.done && c.avisoIni && hoje() >= c.avisoIni && hoje() < c.ini ? chip("Prepare-se", "soft") : null;
  return item({
    cls: "rotina", done: st.done,
    lead: h("span", { class: "dotbar", style: { background: a.cor || "var(--ac)" } }),
    title: mostrarNome ? a.nome : "Ciclo de " + dia(c.ini),
    sub: (mostrarNome ? freqNome(a.freq) + " · " : "") + quando,
    trail: [aviso, chip(st.txt, st.cls), check(st.done, () => toggleCiclo(a, c), st.done ? "Desfazer " + a.nome : "Marcar " + a.nome + " como feita")],
    onclick: () => editarRotina(a)
  });
}

export function render(root) {
  const lista = rotinasAtivas();
  root.appendChild(h("div", { class: "page-head" },
    h("div", null, h("h1", null, "Rotina"), h("p", { class: "muted" }, "Coisas que se repetem, no seu ritmo.")),
    h("button", { class: "btn primary", type: "button", onclick: () => editarRotina() }, icon("plus", 18), h("span", null, "Nova rotina"))));

  if (!lista.length) {
    root.appendChild(empty("Você ainda não tem nenhuma rotina. Comece por uma sugestão ou crie a sua.",
      h("div", { class: "chips" }, SUGESTOES.map((s) => h("button", { class: "chipbtn", type: "button", onclick: () => editarRotina(null, s) }, s.nome)))));
    return;
  }

  const atr = [];
  lista.forEach((a) => atrasadas(a).forEach((c) => atr.push([a, c])));
  if (atr.length) {
    root.appendChild(h("section", { class: "stack" }, h("h2", null, "Ficaram para trás"),
      h("div", { class: "card flush" }, atr.map(([a, c]) => item({
        cls: "rotina", lead: h("span", { class: "dotbar", style: { background: a.cor || "var(--ac)" } }), title: a.nome, sub: "Era para " + dia(c.fim),
        trail: [chip("Atrasada", "bad"), check(false, () => toggleCiclo(a, c), "Marcar como feita")]
      })))));
  }

  const grupos = [[1, "Todo dia"], [7, "Toda semana"], [14, "Quinzenais"], [28, "A cada 4 semanas"]];
  const usados = new Set();
  const sec = (titulo, arr) => arr.length && root.appendChild(h("section", { class: "stack" }, h("h2", null, titulo),
    h("div", { class: "card flush" }, arr.map((a) => linhaRotina(a, cicloAtual(a))))));
  grupos.forEach(([f, t]) => { const arr = lista.filter((a) => a.freq === f); arr.forEach((a) => usados.add(a.id)); sec(t, arr); });
  sec("Outros intervalos", lista.filter((a) => !usados.has(a.id)));
  root.appendChild(h("p", { class: "note" }, "Toque numa rotina para editar. A bolinha marca o ciclo atual como feito."));
}
