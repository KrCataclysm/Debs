import { h, icon, item, check, chip, empty, seg, formSheet, confirmBox, brl, num, add, iso, hoje, DIAS_LONGO, br, rerender } from "../lib.js";
import * as db from "../store.js";

let aba = "mercado", semana = null, refocus = false;
const REFEICOES = [["cafe", "Café da manhã", "☕"], ["almoco", "Almoço", "🍲"], ["lanche", "Lanche", "🍎"], ["jantar", "Jantar", "🌙"]];

function editarDesejo(x) {
  formSheet({ title: x ? "Editar desejo" : "Novo desejo", submitLabel: x ? "Salvar" : "Adicionar",
    values: x ? { item: x.item, preco: x.preco == null ? "" : x.preco, link: x.link || "" } : { item: "", preco: "", link: "" },
    fields: [{ key: "item", label: "O que você quer?", required: true, maxlength: 120 }, { key: "preco", label: "Preço estimado (R$)", type: "money" }, { key: "link", label: "Link (opcional)", type: "url", placeholder: "https://" }],
    onSubmit: (s) => { const row = { item: s.item.trim(), preco: s.preco === "" ? null : num(s.preco), link: (s.link || "").trim() || null, lista: "desejo" }; if (x) db.patch("compras", x.id, row); else db.add("compras", row); },
    onDelete: x ? () => db.del("compras", x.id) : null });
}
function editarSlot(dia, tipo, atual) {
  const [, nome, emo] = REFEICOES.find((r) => r[0] === tipo);
  formSheet({ title: emo + " " + nome, values: { descricao: atual ? atual.descricao : "" }, submitLabel: "Salvar",
    fields: [{ key: "descricao", label: "O que vai comer?", maxlength: 120, placeholder: "Deixe vazio para limpar" }],
    onSubmit: (s) => { const d = (s.descricao || "").trim(); if (!d) { if (atual) db.del("refeicoes", atual.id); } else if (atual) db.patch("refeicoes", atual.id, { descricao: d }); else db.add("refeicoes", { dia, tipo, descricao: d }); } });
}

export function render(root) {
  const t = hoje();
  if (!semana) semana = add(t, -((t.getDay() + 6) % 7));
  root.appendChild(h("div", { class: "page-head" }, h("div", null, h("p", { class: "eyebrow" }, "Organização"), h("h1", null, "Listas"), h("p", { class: "muted" }, "Mercado, desejos e cardápio da semana."))));
  root.appendChild(seg([{ v: "mercado", l: "🛒 Mercado" }, { v: "desejo", l: "🎀 Desejos" }, { v: "cardapio", l: "🍽️ Cardápio" }], aba, (v) => { aba = v; rerender(); }));

  if (aba === "mercado" || aba === "desejo") {
    const todos = db.rows("compras").filter((x) => x.lista === aba);
    const abertos = todos.filter((x) => !x.comprado).sort((a, b) => a.created_at.localeCompare(b.created_at)), feitos = todos.filter((x) => x.comprado);
    if (aba === "mercado") {
      const inp = h("input", { class: "input", placeholder: "Adicionar item… (Enter)", maxlength: 120, "aria-label": "Novo item" });
      root.appendChild(h("form", { class: "quickadd", onsubmit: (e) => { e.preventDefault(); const v = inp.value.trim(); if (!v) return; refocus = true; db.add("compras", { item: v, lista: "mercado", comprado: false }); } },
        inp, h("button", { class: "btn primary icon", type: "submit", "aria-label": "Adicionar" }, icon("plus", 20))));
      if (refocus) { refocus = false; setTimeout(() => inp.focus(), 0); }
    } else {
      const total = abertos.reduce((s, x) => s + Number(x.preco || 0), 0);
      root.appendChild(h("div", { class: "row between center" }, h("div", { class: "stat wide" }, h("small", null, "Total estimado"), h("strong", null, brl(total))),
        h("button", { class: "btn primary", type: "button", onclick: () => editarDesejo() }, icon("plus", 18), h("span", null, "Novo desejo"))));
    }
    const linha = (x) => item({ done: x.comprado, lead: check(x.comprado, () => db.patch("compras", x.id, { comprado: !x.comprado }), x.comprado ? "Desmarcar" : "Marcar"), title: x.item,
      sub: aba === "desejo" ? [x.preco != null ? brl(x.preco) : null, x.link ? "tem link" : null].filter(Boolean).join(" · ") || null : null,
      trail: aba === "mercado" ? h("button", { class: "btn icon ghost", type: "button", "aria-label": "Remover " + x.item, onclick: (e) => { e.stopPropagation(); db.del("compras", x.id); } }, icon("x", 16)) : (x.link ? h("a", { class: "btn ghost sm", href: x.link, target: "_blank", rel: "noopener noreferrer", onclick: (e) => e.stopPropagation() }, "abrir") : null),
      onclick: aba === "desejo" ? () => editarDesejo(x) : null });
    root.appendChild(abertos.length ? h("div", { class: "card flush" }, abertos.map(linha)) : empty(aba === "mercado" ? "Lista vazia. O que está faltando em casa?" : "Quais são seus desejos? Anote e vá realizando, um a um. 🎀"));
    if (feitos.length) {
      root.appendChild(h("section", { class: "stack" }, h("div", { class: "row between" }, h("h2", null, aba === "mercado" ? "No carrinho" : "Realizados"),
        h("button", { class: "btn ghost sm", type: "button", onclick: async () => { if (await confirmBox("Remover os " + feitos.length + " itens marcados?", { ok: "Limpar" })) feitos.forEach((x) => db.del("compras", x.id)); } }, "Limpar")),
      h("div", { class: "card flush" }, feitos.map(linha))));
    }
  }

  if (aba === "cardapio") {
    root.appendChild(h("div", { class: "row between center" },
      h("button", { class: "btn icon ghost", type: "button", "aria-label": "Semana anterior", onclick: () => { semana = add(semana, -7); rerender(); } }, icon("left")),
      h("strong", null, br(semana) + " a " + br(add(semana, 6))),
      h("div", { class: "row gap" }, h("button", { class: "btn ghost sm", type: "button", onclick: () => { semana = add(t, -((t.getDay() + 6) % 7)); rerender(); } }, "Esta semana"),
        h("button", { class: "btn icon ghost", type: "button", "aria-label": "Próxima semana", onclick: () => { semana = add(semana, 7); rerender(); } }, icon("right")))));
    const regs = db.rows("refeicoes");
    root.appendChild(h("div", { class: "stack" }, Array.from({ length: 7 }, (_, i) => {
      const d = add(semana, i), k = iso(d);
      return h("section", { class: "card meal" + (+d === +t ? " today" : "") }, h("h3", null, DIAS_LONGO[d.getDay()] + " · " + br(d)),
        REFEICOES.map(([tipo, nome, emo]) => { const r = regs.find((x) => x.dia === k && x.tipo === tipo);
          return h("button", { type: "button", class: "slot" + (r ? " filled" : ""), onclick: () => editarSlot(k, tipo, r) }, h("span", null, emo + " " + nome), h("em", null, r ? r.descricao : "adicionar")); }));
    })));
  }
}
