import { h, icon, item, chip, empty, formSheet, parse, dia, rel, between, hoje, iso } from "../lib.js";
import * as db from "../store.js";
import { proximaOcorrencia } from "../engine.js";

const CATS = [{ v: "aniversario", l: "Aniversário" }, { v: "especial", l: "Data especial" }, { v: "compromisso", l: "Compromisso" }, { v: "viagem", l: "Viagem" }, { v: "outro", l: "Outro" }];
const IC = { aniversario: "gift", especial: "heart", namoro: "heart", compromisso: "calendar", viagem: "pinmap", outro: "star" };

function editar(x) {
  formSheet({
    title: x ? "Editar data" : "Nova data importante", submitLabel: x ? "Salvar" : "Adicionar",
    values: x ? { titulo: x.titulo, data: x.data, anual: x.anual, categoria: x.categoria } : { titulo: "", data: iso(hoje()), anual: true, categoria: "aniversario" },
    fields: [
      { key: "titulo", label: "O que é?", required: true, maxlength: 100, placeholder: "Ex.: Aniversário de uma amiga" },
      { key: "categoria", label: "Tipo", type: "select", options: CATS },
      { key: "data", label: "Data (use o ano de nascimento ou do início para eu calcular os anos)", type: "date", required: true },
      { key: "anual", label: "Repete todo ano", type: "checkbox" }
    ],
    onSubmit: (s) => { const row = { titulo: s.titulo.trim(), data: s.data, anual: !!s.anual, categoria: s.categoria }; if (x) db.patch("datas_importantes", x.id, row); else db.add("datas_importantes", row); },
    onDelete: x ? () => db.del("datas_importantes", x.id) : null
  });
}

export function render(root) {
  const t = hoje();
  root.appendChild(h("div", { class: "page-head" }, h("div", null, h("p", { class: "eyebrow" }, "Para não esquecer"), h("h1", null, "Datas importantes"), h("p", { class: "muted" }, "Para nunca esquecer quem e o que importa.")),
    h("button", { class: "btn primary", type: "button", onclick: () => editar() }, icon("plus", 18), h("span", null, "Nova data"))));
  const lista = db.rows("datas_importantes").map((x) => ({ x, d: proximaOcorrencia(x) })).filter((o) => o.x.anual || o.d >= t).sort((a, b) => a.d - b.d);
  const passadas = db.rows("datas_importantes").filter((x) => !x.anual && parse(x.data) < t);
  if (!lista.length && !passadas.length) { root.appendChild(empty("Cadastre aniversários e datas especiais e eu te lembro por aqui.")); return; }
  const linha = ({ x, d }) => {
    const n = between(t, d), anos = x.anual ? d.getFullYear() - parse(x.data).getFullYear() : 0;
    return item({ lead: h("span", { class: "roundico" }, icon(IC[x.categoria] || "star", 18)), title: x.titulo,
      sub: dia(d) + (x.anual && anos > 0 && anos < 120 ? " · " + (x.categoria === "aniversario" ? "faz " + anos + " anos" : anos + (anos === 1 ? " ano" : " anos")) : ""),
      trail: chip(n === 0 ? "Hoje" : n === 1 ? "Amanhã" : "Em " + n + " dias", n <= 7 ? "warn" : "idle"), onclick: () => editar(x) });
  };
  const mes = lista.filter((o) => between(t, o.d) <= 30), resto = lista.filter((o) => between(t, o.d) > 30);
  if (mes.length) root.appendChild(h("section", { class: "stack" }, h("h2", null, "Nos próximos 30 dias"), h("div", { class: "card flush" }, mes.map(linha))));
  if (resto.length) root.appendChild(h("section", { class: "stack" }, h("h2", null, "Mais para frente"), h("div", { class: "card flush" }, resto.map(linha))));
  if (passadas.length) root.appendChild(h("section", { class: "stack" }, h("h2", null, "Já passaram"), h("div", { class: "card flush" }, passadas.map((x) => item({ title: x.titulo, sub: dia(parse(x.data)) + " · " + rel(parse(x.data)), onclick: () => editar(x) })))));
}
