import { h, icon, item, check, chip, empty, seg, formSheet, parse, dia, rel, between, hoje, iso, rerender } from "../lib.js";
import * as db from "../store.js";
import { editarMeta, cardMeta } from "./financas.js";

let aba = "agenda";
const TIPOS = [{ v: "prova", l: "📝 Prova" }, { v: "trabalho", l: "📎 Trabalho" }, { v: "tarefa", l: "✏️ Tarefa" }, { v: "leitura", l: "📖 Leitura" }];
const EMO = { prova: "📝", trabalho: "📎", tarefa: "✏️", leitura: "📖" };

function editarItem(x) {
  const mats = db.rows("materias");
  formSheet({
    title: x ? "Editar item" : "Novo item de estudo", submitLabel: x ? "Salvar" : "Adicionar",
    values: x ? { titulo: x.titulo, tipo: x.tipo, materia_id: x.materia_id || "", data: x.data || "", nota: x.nota == null ? "" : x.nota, concluido: x.concluido } : { titulo: "", tipo: "tarefa", materia_id: "", data: "", nota: "", concluido: false },
    fields: [
      { key: "titulo", label: "O que é?", required: true, maxlength: 120, placeholder: "Ex.: Prova de Biologia, trabalho de História" },
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
  formSheet({ title: m ? "Editar matéria" : "Nova matéria", values: m ? { nome: m.nome, cor: m.cor || "#8E6BD8" } : { nome: "", cor: "#8E6BD8" },
    fields: [{ key: "nome", label: "Nome da matéria", required: true, maxlength: 60 }, { key: "cor", label: "Cor", type: "color" }],
    onSubmit: (s) => { const row = { nome: s.nome.trim(), cor: s.cor }; if (m) db.patch("materias", m.id, row); else db.add("materias", row); },
    onDelete: m ? () => db.del("materias", m.id) : null, deleteLabel: "Excluir matéria" });
}

export function render(root) {
  const t = hoje();
  root.appendChild(h("div", { class: "page-head" }, h("div", null, h("h1", null, "Estudos"), h("p", { class: "muted" }, "Provas, trabalhos e objetivos.")),
    h("button", { class: "btn primary", type: "button", onclick: () => (aba === "mat" ? editarMateria() : aba === "metas" ? editarMeta(null, "estudo") : editarItem()) }, icon("plus", 18), h("span", null, aba === "mat" ? "Matéria" : aba === "metas" ? "Nova meta" : "Novo item"))));
  root.appendChild(seg([{ v: "agenda", l: "Agenda" }, { v: "mat", l: "Matérias" }, { v: "metas", l: "Metas" }], aba, (v) => { aba = v; rerender(); }));
  const mats = new Map(db.rows("materias").map((m) => [m.id, m]));

  if (aba === "agenda") {
    const todos = db.rows("estudos");
    const pend = todos.filter((x) => !x.concluido).sort((a, b) => (a.data && b.data ? a.data.localeCompare(b.data) : a.data ? -1 : b.data ? 1 : 0));
    const feitos = todos.filter((x) => x.concluido).sort((a, b) => (b.data || "").localeCompare(a.data || "")).slice(0, 10);
    const linha = (x) => {
      const m = mats.get(x.materia_id), n = x.data ? between(t, parse(x.data)) : null;
      return item({ done: x.concluido, lead: check(x.concluido, () => db.patch("estudos", x.id, { concluido: !x.concluido }), x.concluido ? "Reabrir" : "Concluir"),
        title: EMO[x.tipo] + " " + x.titulo, sub: (m ? m.nome + " · " : "") + (x.data ? dia(parse(x.data)) + " · " + rel(parse(x.data)) : "Sem data") + (x.nota != null ? " · nota " + String(x.nota).replace(".", ",") : ""),
        trail: x.concluido ? null : n != null && n < 0 ? chip("Atrasado", "bad") : n != null && n <= 3 ? chip(n === 0 ? "Hoje" : "Em " + n + "d", "warn") : null, onclick: () => editarItem(x) });
    };
    root.appendChild(pend.length ? h("div", { class: "card flush" }, pend.map(linha)) : empty("Nada pendente. Aproveite! 📚"));
    if (feitos.length) root.appendChild(h("section", { class: "stack" }, h("h2", null, "Concluídos"), h("div", { class: "card flush" }, feitos.map(linha))));
  }

  if (aba === "mat") {
    const lista = [...mats.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    root.appendChild(lista.length ? h("div", { class: "card flush" }, lista.map((m) => {
      const its = db.rows("estudos").filter((x) => x.materia_id === m.id), notas = its.filter((x) => x.nota != null).map((x) => Number(x.nota)), pend = its.filter((x) => !x.concluido).length;
      return item({ lead: h("span", { class: "dotbar", style: { background: m.cor || "var(--ac)" } }), title: m.nome, sub: pend + (pend === 1 ? " pendente" : " pendentes"),
        trail: notas.length ? chip("média " + (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1).replace(".", ","), "soft") : null, onclick: () => editarMateria(m) });
    })) : empty("Cadastre suas matérias para organizar provas e trabalhos."));
  }

  if (aba === "metas") {
    const metas = db.rows("metas").filter((m) => m.tipo !== "financeira").sort((a, b) => Number(a.concluida) - Number(b.concluida) || a.created_at.localeCompare(b.created_at));
    root.appendChild(metas.length ? h("div", { class: "stack" }, metas.map(cardMeta)) : empty("Defina um objetivo, como livros, cursos ou idiomas, e acompanhe o avanço."));
  }
}
