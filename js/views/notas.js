import { h, icon, empty, formSheet, rerender, CORES } from "../lib.js";
import * as db from "../store.js";

let busca = "";
const CORES_NOTA = ["", "#F7C8D8", "#E4D4F7", "#FBDCC8", "#D5ECDD", "#CFE3F6", "#F8EBC0"];

function editar(n) {
  formSheet({
    title: n ? "Editar nota" : "Nova nota", submitLabel: n ? "Salvar" : "Guardar",
    values: n ? { titulo: n.titulo, texto: n.texto, cor: n.cor || "", fixada: n.fixada } : { titulo: "", texto: "", cor: "", fixada: false },
    fields: [
      { key: "titulo", label: "Título (opcional)", maxlength: 80 },
      { key: "texto", label: "Anotação", type: "textarea", rows: 8, required: true },
      { key: "cor", label: "Cor", type: "color", options: CORES_NOTA.filter(Boolean) },
      { key: "fixada", label: "Fixar no topo", type: "checkbox" }
    ],
    onSubmit: (s) => { const row = { titulo: (s.titulo || "").trim(), texto: s.texto.trim(), cor: s.cor || null, fixada: !!s.fixada }; if (n) db.patch("notas", n.id, row); else db.add("notas", row); },
    onDelete: n ? () => db.del("notas", n.id) : null, deleteLabel: "Excluir nota"
  });
}

export function render(root) {
  root.appendChild(h("div", { class: "page-head" }, h("div", null, h("h1", null, "Notas"), h("p", { class: "muted" }, "Ideias, listas e lembranças.")),
    h("button", { class: "btn primary", type: "button", onclick: () => editar() }, icon("plus", 18), h("span", null, "Nova nota"))));
  const q = h("input", { class: "input", type: "search", placeholder: "Buscar nas notas…", "aria-label": "Buscar", value: busca, oninput: (e) => { busca = e.target.value; clearTimeout(q._t); q._t = setTimeout(() => { rerender(); setTimeout(() => { const el = document.querySelector('input[type=search]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0); }, 250); } });
  root.appendChild(h("div", { class: "searchbox" }, icon("search", 18), q));
  const termo = busca.trim().toLowerCase();
  const lista = db.rows("notas").filter((n) => !termo || (n.titulo + " " + n.texto).toLowerCase().includes(termo))
    .sort((a, b) => Number(b.fixada) - Number(a.fixada) || b.updated_at.localeCompare(a.updated_at));
  root.appendChild(lista.length ? h("div", { class: "notes" }, lista.map((n) => h("button", { type: "button", class: "note-card", style: n.cor ? { "--nc": n.cor } : null, onclick: () => editar(n) },
    n.fixada ? h("span", { class: "pin" }, icon("pin", 14)) : null, n.titulo ? h("strong", null, n.titulo) : null, h("p", null, n.texto),
    h("small", null, new Date(n.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })))))
    : empty(termo ? "Nada encontrado." : "Nenhuma nota ainda. Escreva a primeira!"));
}
