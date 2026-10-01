import { h, icon, item, check, chip, empty, seg, formSheet, confirmBox, dia, parse, hoje, rel, rerender } from "../lib.js";
import * as db from "../store.js";

let filtro = "pend", refocus = false;
const PRIO = [{ v: 0, l: "Normal" }, { v: 1, l: "Importante" }, { v: 2, l: "Urgente" }];

export function editarTarefa(t, pre) {
  formSheet({
    title: t ? "Editar tarefa" : "Nova tarefa", submitLabel: t ? "Salvar" : "Adicionar",
    values: t ? { nome: t.nome, prazo: t.prazo || "", prioridade: t.prioridade } : Object.assign({ nome: "", prazo: "", prioridade: 0 }, pre),
    fields: [
      { key: "nome", label: "O que precisa fazer?", required: true, maxlength: 160 },
      { key: "prazo", label: "Prazo (opcional)", type: "date" },
      { key: "prioridade", label: "Prioridade", type: "chips", options: PRIO }
    ],
    onSubmit: (s) => { const row = { nome: s.nome.trim(), prazo: s.prazo || null, prioridade: +s.prioridade }; if (t) db.patch("tarefas", t.id, row); else db.add("tarefas", row); },
    onDelete: t ? () => db.del("tarefas", t.id) : null
  });
}
export const alternarTarefa = (t) => db.patch("tarefas", t.id, { feita: !t.feita, feito_em: t.feita ? null : new Date().toISOString() });

export function linhaTarefa(t) {
  const atrasada = !t.feita && t.prazo && hoje() > parse(t.prazo);
  return item({
    done: t.feita, title: t.nome,
    lead: check(t.feita, () => alternarTarefa(t), t.feita ? "Reabrir tarefa" : "Concluir tarefa"),
    sub: t.feita ? "Concluída " + rel(new Date(t.feito_em)) : t.prazo ? "Prazo " + dia(parse(t.prazo)) + " · " + rel(parse(t.prazo)) : "Sem prazo",
    trail: [t.prioridade === 2 ? chip("Urgente", "bad") : t.prioridade === 1 ? chip("Importante", "warn") : null, atrasada ? chip("Atrasada", "bad") : null],
    onclick: () => editarTarefa(t)
  });
}

export function render(root) {
  const all = db.rows("tarefas");
  const pend = all.filter((t) => !t.feita).sort((a, b) => (a.prazo && b.prazo ? a.prazo.localeCompare(b.prazo) : a.prazo ? -1 : b.prazo ? 1 : 0) || b.prioridade - a.prioridade);
  const feitas = all.filter((t) => t.feita).sort((a, b) => (b.feito_em || "").localeCompare(a.feito_em || ""));

  const nome = h("input", { class: "input", placeholder: "Nova tarefa… (Enter para adicionar)", maxlength: 160, "aria-label": "Nova tarefa" });
  const prazo = h("input", { class: "input", type: "date", "aria-label": "Prazo" });
  const form = h("form", { class: "quickadd", onsubmit: (e) => {
    e.preventDefault(); const n = nome.value.trim(); if (!n) return;
    refocus = true; db.add("tarefas", { nome: n, prazo: prazo.value || null, prioridade: 0, feita: false });
  } }, nome, prazo, h("button", { class: "btn primary icon", type: "submit", "aria-label": "Adicionar" }, icon("plus", 20)));

  root.appendChild(h("div", { class: "page-head" }, h("div", null, h("h1", null, "Tarefas"),
    h("p", { class: "muted" }, pend.length ? pend.length + (pend.length > 1 ? " pendentes" : " pendente") : "Tudo em dia ✨"))));
  root.appendChild(form);
  root.appendChild(seg([{ v: "pend", l: "Pendentes" }, { v: "feitas", l: "Concluídas" }, { v: "todas", l: "Todas" }], filtro, (v) => { filtro = v; rerender(); }));

  const lista = filtro === "pend" ? pend : filtro === "feitas" ? feitas.slice(0, 60) : pend.concat(feitas.slice(0, 30));
  root.appendChild(lista.length ? h("div", { class: "card flush" }, lista.map(linhaTarefa))
    : empty(filtro === "feitas" ? "Nada concluído ainda." : "Nenhuma tarefa por aqui. Adicione acima."));
  if (filtro !== "pend" && feitas.length) {
    root.appendChild(h("div", { class: "row end" }, h("button", { class: "btn ghost sm", type: "button", onclick: async () => {
      if (await confirmBox("Apagar todas as " + feitas.length + " tarefas concluídas?", { ok: "Limpar concluídas" })) feitas.forEach((t) => db.del("tarefas", t.id));
    } }, icon("trash", 16), h("span", null, "Limpar concluídas"))));
  }
  if (refocus) { refocus = false; setTimeout(() => nome.focus(), 0); }
}
