import { h, icon, item, chip, empty, seg, monthNav, formSheet, sheet, progress, brl, num, iso, hoje, parse, dia, rel, between, add, MESES, rerender } from "../lib.js";
import * as db from "../store.js";

let aba = "lanc", mes = null;
const CAT_GASTO = ["Alimentação", "Transporte", "Faculdade", "Lazer", "Beleza", "Saúde", "Casa", "Compras", "Assinaturas", "Presentes", "Outros"];
const CAT_RECEITA = ["Salário", "Extra", "Mesada", "Presente", "Outros"];
const CIC = { Alimentação: "utensils", Transporte: "bus", Faculdade: "cap", Lazer: "film", Beleza: "sparkles", Saúde: "pill", Casa: "home", Compras: "bag", Assinaturas: "tv", Presentes: "gift", Outros: "more", Salário: "briefcase", Extra: "star", Mesada: "heart", Presente: "gift" };

export function editarLancamento(x, tipoIni = "gasto") {
  formSheet({
    title: x ? "Editar lançamento" : "Novo lançamento", submitLabel: x ? "Salvar" : "Adicionar",
    values: x ? { tipo: x.tipo, valor: x.valor, catG: x.tipo === "gasto" ? x.categoria : "Outros", catR: x.tipo === "receita" ? x.categoria : "Outros", descricao: x.descricao, data: x.data }
      : { tipo: tipoIni, valor: "", catG: "Alimentação", catR: "Salário", descricao: "", data: iso(hoje()) },
    fields: [
      { key: "tipo", label: "Tipo", type: "chips", options: [{ v: "gasto", l: "Gasto" }, { v: "receita", l: "Entrada" }] },
      { key: "valor", label: "Valor (R$)", type: "money", required: true },
      { key: "catG", label: "Categoria", type: "select", options: CAT_GASTO.map((c) => ({ v: c, l: c })), showIf: (s) => s.tipo === "gasto" },
      { key: "catR", label: "Categoria", type: "select", options: CAT_RECEITA.map((c) => ({ v: c, l: c })), showIf: (s) => s.tipo === "receita" },
      { key: "descricao", label: "Descrição (opcional)", maxlength: 120 },
      { key: "data", label: "Data", type: "date", required: true }
    ],
    onSubmit: (s) => {
      const valor = num(s.valor); if (!(valor > 0)) throw new Error("Informe um valor maior que zero.");
      const row = { tipo: s.tipo, valor, categoria: s.tipo === "gasto" ? s.catG : s.catR, descricao: (s.descricao || "").trim(), data: s.data };
      if (x) db.patch("transacoes", x.id, row); else db.add("transacoes", row);
    },
    onDelete: x ? () => db.del("transacoes", x.id) : null
  });
}

function editarConta(c) {
  formSheet({
    title: c ? "Editar conta" : "Nova conta", submitLabel: c ? "Salvar" : "Adicionar",
    values: c ? { nome: c.nome, valor: c.valor, vencimento: c.vencimento, recorrente: c.recorrente } : { nome: "", valor: "", vencimento: iso(hoje()), recorrente: false },
    fields: [
      { key: "nome", label: "Nome da conta", required: true, placeholder: "Ex.: Celular, streaming, cartão" },
      { key: "valor", label: "Valor (R$)", type: "money" },
      { key: "vencimento", label: "Vencimento", type: "date", required: true },
      { key: "recorrente", label: "Repete todo mês", type: "checkbox" }
    ],
    onSubmit: (s) => { const row = { nome: s.nome.trim(), valor: num(s.valor), vencimento: s.vencimento, recorrente: !!s.recorrente }; if (c) db.patch("contas", c.id, row); else db.add("contas", row); },
    onDelete: c ? () => db.del("contas", c.id) : null
  });
}
function pagarConta(c) {
  if (c.paga) { db.patch("contas", c.id, { paga: false }); return; }
  db.patch("contas", c.id, { paga: true });
  if (c.recorrente) {
    const v = parse(c.vencimento), prox = new Date(v.getFullYear(), v.getMonth() + 1, 1);
    prox.setDate(Math.min(v.getDate(), new Date(prox.getFullYear(), prox.getMonth() + 1, 0).getDate()));
    if (!db.rows("contas").some((x) => x.nome === c.nome && x.vencimento === iso(prox))) db.add("contas", { nome: c.nome, valor: c.valor, vencimento: iso(prox), recorrente: true, paga: false });
  }
}

export function editarMeta(m, tipo = "financeira") {
  const fin = (m ? m.tipo : tipo) === "financeira";
  formSheet({
    title: m ? "Editar meta" : "Nova meta", submitLabel: m ? "Salvar" : "Criar meta",
    values: m ? { titulo: m.titulo, alvo: m.alvo, atual: m.atual, prazo: m.prazo || "" } : { titulo: "", alvo: fin ? "" : 100, atual: 0, prazo: "" },
    fields: [
      { key: "titulo", label: "Qual é a meta?", required: true, placeholder: fin ? "Ex.: Viagem, celular novo, reserva" : "Ex.: Ler 12 livros, passar no vestibular", maxlength: 120 },
      { key: "alvo", label: fin ? "Quanto quer juntar (R$)" : "Quanto é o objetivo? (número)", type: "money", required: true },
      { key: "atual", label: fin ? "Quanto já tem (R$)" : "Quanto já foi feito?", type: "money" },
      { key: "prazo", label: "Prazo (opcional)", type: "date" }
    ],
    onSubmit: (s) => {
      const alvo = num(s.alvo); if (!(alvo > 0)) throw new Error("O objetivo precisa ser maior que zero.");
      const row = { titulo: s.titulo.trim(), alvo, atual: num(s.atual), prazo: s.prazo || null };
      row.concluida = row.atual >= row.alvo;
      if (m) db.patch("metas", m.id, row); else db.add("metas", Object.assign({ tipo }, row));
    },
    onDelete: m ? () => db.del("metas", m.id) : null, deleteLabel: "Excluir meta"
  });
}
export function cardMeta(m) {
  const fin = m.tipo === "financeira", p = Math.min(1, m.atual / m.alvo);
  const fmt = (n) => (fin ? brl(n) : String(Number(n)).replace(".", ","));
  return h("div", { class: "card meta tap", role: "button", tabindex: "0", onclick: () => editarMeta(m), onkeydown: (e) => { if (e.key === "Enter") editarMeta(m); } },
    h("div", { class: "row between" }, h("strong", null, m.titulo), m.concluida || p >= 1 ? chip("Conquistada 🎉", "ok") : chip(Math.round(p * 100) + "%", "soft")),
    progress(p), h("div", { class: "row between muted small" }, h("span", null, fmt(m.atual) + " de " + fmt(m.alvo)), m.prazo ? h("span", null, "até " + dia(parse(m.prazo))) : null),
    h("button", { class: "btn ghost sm", type: "button", onclick: (e) => { e.stopPropagation(); somar(m); } }, icon("plus", 16), h("span", null, fin ? "Guardar valor" : "Registrar progresso")));
}
function somar(m) {
  const fin = m.tipo === "financeira";
  formSheet({ title: m.titulo, submitLabel: "Somar", values: { v: "" }, fields: [{ key: "v", label: fin ? "Quanto você guardou? (R$)" : "Quanto avançou?", type: "money", required: true }],
    onSubmit: (s) => { const v = num(s.v); if (!(v > 0)) throw new Error("Informe um valor maior que zero."); const atual = Number(m.atual) + v; db.patch("metas", m.id, { atual, concluida: atual >= m.alvo }); } });
}

export function render(root) {
  const t = hoje();
  if (!mes) mes = new Date(t.getFullYear(), t.getMonth(), 1);
  root.appendChild(h("div", { class: "page-head" }, h("div", null, h("p", { class: "eyebrow" }, "Seu dinheiro"), h("h1", null, "Finanças"), h("p", { class: "muted" }, "Seu dinheiro, com carinho e clareza.")),
    h("button", { class: "btn primary", type: "button", onclick: () => (aba === "contas" ? editarConta() : aba === "metas" ? editarMeta(null, "financeira") : editarLancamento()) }, icon("plus", 18), h("span", null, aba === "contas" ? "Nova conta" : aba === "metas" ? "Nova meta" : "Lançar"))));
  root.appendChild(seg([{ v: "lanc", l: "Lançamentos" }, { v: "contas", l: "Contas" }, { v: "metas", l: "Metas" }], aba, (v) => { aba = v; rerender(); }));

  if (aba === "lanc") {
    root.appendChild(monthNav(mes, (d) => { mes = d; rerender(); }, () => { mes = new Date(t.getFullYear(), t.getMonth(), 1); rerender(); }, "Mês atual"));
    const ini = iso(mes), fim = iso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));
    const lista = db.rows("transacoes").filter((x) => x.data >= ini && x.data <= fim).sort((a, b) => b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at));
    const ent = lista.filter((x) => x.tipo === "receita").reduce((s, x) => s + Number(x.valor), 0), sai = lista.filter((x) => x.tipo === "gasto").reduce((s, x) => s + Number(x.valor), 0);
    root.appendChild(h("div", { class: "grid3" },
      h("div", { class: "stat" }, h("small", null, "Entradas"), h("strong", { class: "pos" }, brl(ent))),
      h("div", { class: "stat" }, h("small", null, "Gastos"), h("strong", { class: "neg" }, brl(sai))),
      h("div", { class: "stat" }, h("small", null, "Saldo"), h("strong", { class: ent - sai >= 0 ? "pos" : "neg" }, brl(ent - sai)))));
    const m6 = Array.from({ length: 6 }, (_, i) => new Date(mes.getFullYear(), mes.getMonth() - 5 + i, 1));
    const tot6 = m6.map((m) => ({ m, v: db.rows("transacoes").filter((x) => x.tipo === "gasto" && x.data.slice(0, 7) === iso(m).slice(0, 7)).reduce((s, x) => s + Number(x.valor), 0) }));
    const mx6 = Math.max(1, ...tot6.map((o) => o.v));
    if (tot6.some((o) => o.v > 0)) root.appendChild(h("section", { class: "card stack" }, h("h3", null, "Gastos mês a mês"),
      h("div", { class: "bars money", role: "img", "aria-label": "Gastos dos últimos 6 meses" }, tot6.map((o) => h("div", { class: "bar-col", title: MESES[o.m.getMonth()] + ": " + brl(o.v) },
        h("span", { class: "bar-val" }, o.v ? brl(o.v).replace(/\s/g, "").replace("R$", "") : ""), h("i", { class: iso(o.m) === iso(mes) ? "cur" : "", style: { height: Math.max(5, (o.v / mx6) * 100) + "%" } }), h("small", null, MESES[o.m.getMonth()].slice(0, 3)))))));
    const porCat = {}; lista.filter((x) => x.tipo === "gasto").forEach((x) => (porCat[x.categoria] = (porCat[x.categoria] || 0) + Number(x.valor)));
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
    if (cats.length) root.appendChild(h("section", { class: "card stack" }, h("h3", null, "Para onde foi"), cats.map(([c, v]) => h("div", { class: "catrow" }, h("span", { class: "row gap" }, icon(CIC[c] || "more", 16), c), progress(v / cats[0][1]), h("strong", null, brl(v))))));
    if (!lista.length) root.appendChild(empty("Nenhum lançamento neste mês."));
    else {
      let ult = "";
      const card = h("div", { class: "card flush" });
      lista.forEach((x) => {
        if (x.data !== ult) { ult = x.data; card.appendChild(h("div", { class: "daysep" }, dia(parse(x.data)) + " · " + rel(parse(x.data)))); }
        card.appendChild(item({ lead: h("span", { class: "roundico" }, icon(CIC[x.categoria] || "more", 18)), title: x.descricao || x.categoria, sub: x.categoria, trail: h("strong", { class: x.tipo === "gasto" ? "neg" : "pos" }, (x.tipo === "gasto" ? "−" : "+") + brl(x.valor)), onclick: () => editarLancamento(x) }));
      });
      root.appendChild(card);
    }
  }

  if (aba === "contas") {
    const todas = db.rows("contas");
    const abertas = todas.filter((c) => !c.paga).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    const pagas = todas.filter((c) => c.paga).sort((a, b) => b.vencimento.localeCompare(a.vencimento)).slice(0, 12);
    const total = abertas.reduce((s, c) => s + Number(c.valor), 0);
    root.appendChild(h("div", { class: "stat wide" }, h("small", null, "A pagar (" + abertas.length + ")"), h("strong", null, brl(total))));
    const linha = (c) => {
      const d = parse(c.vencimento), n = between(t, d);
      return item({ done: c.paga, lead: h("button", { class: "check" + (c.paga ? " on" : ""), type: "button", role: "checkbox", "aria-checked": String(c.paga), "aria-label": c.paga ? "Desfazer pagamento" : "Marcar como paga", onclick: (e) => { e.stopPropagation(); pagarConta(c); } }, c.paga ? icon("check", 16) : null),
        title: c.nome, sub: dia(d) + (c.recorrente ? " · todo mês" : ""), trail: [c.paga ? chip("Paga", "ok") : n < 0 ? chip("Vencida", "bad") : n <= 3 ? chip(n === 0 ? "Vence hoje" : "Em " + n + " dias", "warn") : chip("Em " + n + " dias", "idle"), h("strong", null, brl(c.valor))], onclick: () => editarConta(c) });
    };
    root.appendChild(abertas.length ? h("div", { class: "card flush" }, abertas.map(linha)) : empty("Nenhuma conta em aberto. Que paz! 🌿"));
    if (pagas.length) root.appendChild(h("section", { class: "stack" }, h("h2", null, "Pagas recentemente"), h("div", { class: "card flush" }, pagas.map(linha))));
  }

  if (aba === "metas") {
    const metas = db.rows("metas").filter((m) => m.tipo === "financeira").sort((a, b) => Number(a.concluida) - Number(b.concluida) || a.created_at.localeCompare(b.created_at));
    root.appendChild(metas.length ? h("div", { class: "stack" }, metas.map(cardMeta)) : empty("Que sonho você quer realizar? Crie uma meta e acompanhe o progresso."));
  }
}
