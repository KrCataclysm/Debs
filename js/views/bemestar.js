import { h, icon, chip, add, iso, hoje, parse, dia, rel, between, rerender } from "../lib.js";
import * as db from "../store.js";

let diaSel = null;
const HUMORES = ["😞", "😕", "😐", "🙂", "😄"];
const HUMOR_TXT = ["Muito mal", "Mal", "Mais ou menos", "Bem", "Ótima"];
const ENERGIA = ["🪫", "🔋", "🔋", "⚡", "⚡"];
const SINTOMAS = ["Motivada", "Tudo bem", "Cansaço", "Estresse", "Ansiedade", "Dor de cabeça", "Sono ruim", "Inchaço"];

const media = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

export function render(root) {
  const t = hoje();
  if (!diaSel) diaSel = t;
  const k = iso(diaSel);
  const reg = db.rows("bemestar").find((b) => b.dia === k) || {};
  const salvar = (p) => db.upsertBy("bemestar", { dia: k, user_id: db.user().id }, p);

  root.appendChild(h("div", { class: "page-head" }, h("div", null, h("p", { class: "eyebrow" }, "Autocuidado"), h("h1", null, "Bem-estar"), h("p", { class: "muted" }, "Um minuto por dia para se ouvir."))));
  root.appendChild(h("div", { class: "row between center" },
    h("button", { class: "btn icon ghost", type: "button", "aria-label": "Dia anterior", onclick: () => { diaSel = add(diaSel, -1); rerender(); } }, icon("left")),
    h("div", { class: "center-text" }, h("strong", null, diaSel.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })), h("div", { class: "muted small" }, rel(diaSel))),
    h("button", { class: "btn icon ghost", type: "button", "aria-label": "Próximo dia", disabled: +diaSel >= +t, onclick: () => { diaSel = add(diaSel, 1); rerender(); } }, icon("right"))));

  const bloco = (titulo, ...kids) => h("section", { class: "card stack" }, h("h3", null, titulo), ...kids);
  root.appendChild(bloco("Humor", h("div", { class: "mood big" }, HUMORES.map((e, i) => h("button", { class: "mood-btn" + (reg.humor === i + 1 ? " on" : ""), type: "button", "aria-pressed": String(reg.humor === i + 1), "aria-label": HUMOR_TXT[i], onclick: () => salvar({ humor: reg.humor === i + 1 ? null : i + 1 }) }, e))),
    reg.humor ? h("p", { class: "muted center-text" }, HUMOR_TXT[reg.humor - 1]) : null));

  root.appendChild(h("div", { class: "grid2" },
    bloco("Energia", h("div", { class: "dots5" }, [1, 2, 3, 4, 5].map((n) => h("button", { type: "button", class: "dot5" + (reg.energia >= n ? " on" : ""), "aria-label": "Energia " + n, onclick: () => salvar({ energia: reg.energia === n ? null : n }) }, n)))),
    bloco("Sono", h("div", { class: "stepper" },
      h("button", { class: "btn icon ghost", type: "button", "aria-label": "Menos meia hora", onclick: () => salvar({ sono_horas: Math.max(0, (+reg.sono_horas || 7) - 0.5) }) }, "−"),
      h("strong", null, reg.sono_horas != null ? String(reg.sono_horas).replace(".", ",") + " h" : "— h"),
      h("button", { class: "btn icon ghost", type: "button", "aria-label": "Mais meia hora", onclick: () => salvar({ sono_horas: Math.min(24, (+reg.sono_horas || 7) + 0.5) }) }, "+")))));

  root.appendChild(bloco("Água", h("div", { class: "cups" }, Array.from({ length: Math.max(8, (reg.agua_copos || 0) + 1) }, (_, i) => h("button", { type: "button", class: "cup" + (i < (reg.agua_copos || 0) ? " on" : ""), "aria-label": "Copo " + (i + 1), onclick: () => salvar({ agua_copos: (reg.agua_copos || 0) === i + 1 ? i : i + 1 }) }, icon("drop", 18))),
  h("span", { class: "muted small" }, (reg.agua_copos || 0) + " copos"))));

  root.appendChild(bloco("Como seu corpo está?", h("div", { class: "chips" }, SINTOMAS.map((s) => {
    const on = (reg.sintomas || []).includes(s);
    return h("button", { type: "button", class: "chipbtn" + (on ? " on" : ""), "aria-pressed": String(on), onclick: () => salvar({ sintomas: on ? reg.sintomas.filter((x) => x !== s) : (reg.sintomas || []).concat(s) }) }, s);
  }))));

  const campo = (rotulo, key, ph, rows) => {
    const ta = h("textarea", { class: "input", rows, placeholder: ph, "aria-label": rotulo, value: reg[key] || "", onblur: (e) => { if (e.target.value !== (reg[key] || "")) db.quiet(() => salvar({ [key]: e.target.value })); } });
    return bloco(rotulo, ta);
  };
  root.appendChild(campo("Gratidão do dia", "gratidao", "Uma coisa boa de hoje…", 2));
  root.appendChild(campo("Diário", "diario", "Escreva livremente. Só você vê.", 5));

  /* últimos 14 dias */
  const dias = Array.from({ length: 14 }, (_, i) => add(t, i - 13));
  const regs = db.rows("bemestar"), porDia = new Map(regs.map((b) => [b.dia, b]));
  const hum = dias.map((d) => (porDia.get(iso(d)) || {}).humor).filter(Boolean);
  const sono = dias.map((d) => (porDia.get(iso(d)) || {}).sono_horas).filter((x) => x != null).map(Number);
  const agua = dias.map((d) => (porDia.get(iso(d)) || {}).agua_copos).filter((x) => x != null);
  root.appendChild(bloco("Últimos 14 dias",
    h("div", { class: "bars", role: "img", "aria-label": "Humor dos últimos 14 dias" }, dias.map((d) => { const b = porDia.get(iso(d)); return h("div", { class: "bar-col", title: dia(d) + (b && b.humor ? " · " + HUMOR_TXT[b.humor - 1] : "") }, h("i", { class: b && b.humor ? "h" + b.humor : "empty", style: { height: b && b.humor ? b.humor * 20 + "%" : "6%" } }), h("small", null, d.getDate())); })),
    h("div", { class: "row gap wrap" },
      chip("Humor médio: " + (hum.length ? HUMORES[Math.round(media(hum)) - 1] + " " + media(hum).toFixed(1).replace(".", ",") : "—"), "soft"),
      chip("Sono: " + (sono.length ? media(sono).toFixed(1).replace(".", ",") + " h" : "—"), "soft"),
      chip("Água: " + (agua.length ? media(agua).toFixed(1).replace(".", ",") + " copos" : "—"), "soft"))));
}
