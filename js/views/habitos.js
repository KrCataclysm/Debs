import { h, icon, item, chip, empty, formSheet, progress, add, iso, hoje, DIAS } from "../lib.js";
import * as db from "../store.js";
import { checksIdx, sequencia, semanaHabito } from "../engine.js";

const EMOJIS = ["💧", "🧴", "🏃‍♀️", "📖", "🧘‍♀️", "🥗", "😴", "💊", "🌿", "✍️", "🎧", "🦷", "☀️", "🧹", "💅", "🚶‍♀️"];
const TURNOS = { manha: "Manhã", dia: "Durante o dia", noite: "Noite" };
const SUGESTOES = [["💧", "Beber 2L de água", "dia"], ["🧴", "Skincare da manhã", "manha"], ["🌙", "Skincare da noite", "noite"], ["📖", "Ler 15 minutos", "noite"], ["🚶‍♀️", "Caminhar", "dia"], ["😴", "Dormir cedo", "noite"]];

function editar(x, pre) {
  formSheet({
    title: x ? "Editar hábito" : "Novo hábito", submitLabel: x ? "Salvar" : "Criar hábito",
    values: x ? { nome: x.nome, emoji: x.emoji, turno: x.turno, meta: String(x.meta_semana), ativo: x.ativo } : { nome: pre ? pre[1] : "", emoji: pre ? pre[0] : "🌿", turno: pre ? pre[2] : "dia", meta: "7", ativo: true },
    fields: [
      { key: "nome", label: "Qual hábito?", required: true, maxlength: 80 },
      { key: "emoji", label: "Ícone", type: "emoji", options: EMOJIS },
      { key: "turno", label: "Quando?", type: "chips", options: Object.entries(TURNOS).map(([v, l]) => ({ v, l })) },
      { key: "meta", label: "Meta por semana", type: "select", options: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ v: n, l: n === 7 ? "Todo dia" : n + "x por semana" })) },
      { key: "ativo", label: "Ativo (aparece no Hoje)", type: "checkbox" }
    ],
    onSubmit: (s) => { const row = { nome: s.nome.trim(), emoji: s.emoji, turno: s.turno, meta_semana: +s.meta, ativo: !!s.ativo }; if (x) db.patch("habitos", x.id, row); else db.add("habitos", row); },
    onDelete: x ? () => db.del("habitos", x.id) : null, deleteLabel: "Excluir hábito"
  });
}

export function render(root) {
  const lista = db.rows("habitos").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const idx = checksIdx(), t = hoje(), hojeIso = iso(t);
  root.appendChild(h("div", { class: "page-head" }, h("div", null, h("p", { class: "eyebrow" }, "Todo dia"), h("h1", null, "Hábitos"), h("p", { class: "muted" }, "Pequenos gestos todo dia.")),
    h("button", { class: "btn primary", type: "button", onclick: () => editar() }, icon("plus", 18), h("span", null, "Novo hábito"))));

  if (!lista.length) { root.appendChild(empty("Crie seu primeiro hábito. Comece pequeno!", h("div", { class: "chips" }, SUGESTOES.map((s) => h("button", { class: "chipbtn", type: "button", onclick: () => editar(null, s) }, s[0] + " " + s[1]))))); return; }

  const ativos = lista.filter((x) => x.ativo !== false);
  const metaTot = ativos.reduce((s, x) => s + x.meta_semana, 0), feitoTot = ativos.reduce((s, x) => s + Math.min(x.meta_semana, semanaHabito(x.id, idx)), 0);
  root.appendChild(h("div", { class: "card" }, h("div", { class: "row between" }, h("strong", null, "Esta semana"), h("span", { class: "muted" }, feitoTot + " de " + metaTot + " metas")), progress(metaTot ? feitoTot / metaTot : 0)));

  const ini = add(t, -t.getDay());
  ["manha", "dia", "noite"].forEach((turno) => {
    const arr = lista.filter((x) => x.turno === turno); if (!arr.length) return;
    root.appendChild(h("section", { class: "stack" }, h("h2", null, TURNOS[turno]), h("div", { class: "card flush" }, arr.map((x) => {
      const seq = sequencia(x.id, idx), sem = semanaHabito(x.id, idx);
      return item({
        cls: x.ativo === false ? "off" : "", lead: h("span", { class: "emo-lg" }, x.emoji), title: x.nome,
        sub: sem + "/" + x.meta_semana + " esta semana", onclick: () => editar(x),
        trail: [seq > 0 ? chip("🔥 " + seq, "soft") : null, h("div", { class: "week", role: "group", "aria-label": "Semana" }, [0, 1, 2, 3, 4, 5, 6].map((i) => {
          const d = add(ini, i), k = iso(d), on = idx.has(x.id + "|" + k), fut = d > t;
          return h("button", { type: "button", class: "wd" + (on ? " on" : "") + (k === hojeIso ? " today" : ""), disabled: fut, "aria-label": DIAS[d.getDay()] + (on ? ", feito" : ""), "aria-pressed": String(on),
            onclick: (e) => { e.stopPropagation(); on ? db.delBy("habito_checks", { habito_id: x.id, dia: k }) : db.add("habito_checks", { habito_id: x.id, dia: k }); } }, DIAS[d.getDay()][0].toUpperCase());
        }))]
      });
    }))));
  });
  root.appendChild(h("p", { class: "note" }, "Toque nas letras para marcar o dia. Toque no hábito para editar."));
}
