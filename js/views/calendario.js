import { h, icon, monthNav, sheet, item, add, iso, hoje, DIAS, MESES, dia } from "../lib.js";
import { eventosDoMes, feriadoNoDia } from "../engine.js";
import { rerender } from "../lib.js";
import { editarTarefa } from "./tarefas.js";

let vista = null;
const TIPOS = { rotina: "Rotina", aviso: "Preparação", tarefa: "Tarefa", conta: "Conta a pagar", estudo: "Estudos", data: "Data especial" };

function abrirDia(d, evs, fer) {
  sheet(d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }), (close) => h("div", { class: "stack" },
    fer ? item({ lead: h("span", { class: "roundico bad" }, icon("star", 18)), title: fer, sub: "Feriado nacional" }) : null,
    evs.length ? h("div", { class: "card flush" }, evs.map((e) => item({
      lead: h("span", { class: "dotbar", style: { background: e.cor || "" }, "data-tipo": e.tipo }), title: e.texto, sub: TIPOS[e.tipo] + (e.feito ? " · feito" : ""), done: e.feito
    }))) : (fer ? null : h("p", { class: "muted" }, "Nada marcado para este dia.")),
    h("button", { class: "btn primary", type: "button", onclick: () => { close(); editarTarefa(null, { prazo: iso(d) }); } }, icon("plus", 18), h("span", null, "Nova tarefa neste dia"))));
}

export function render(root, { cfg }) {
  const t = hoje();
  if (!vista) vista = new Date(t.getFullYear(), t.getMonth(), 1);
  const ev = eventosDoMes(vista.getFullYear(), vista.getMonth(), cfg);
  const offset = vista.getDay(), dias = new Date(vista.getFullYear(), vista.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((offset + dias) / 7) * 7, start = add(vista, -offset);

  root.appendChild(h("div", { class: "page-head" }, h("div", null, h("h1", null, "Calendário"), h("p", { class: "muted" }, "Tudo o que está marcado, num só lugar."))));
  root.appendChild(monthNav(vista, (d) => { vista = d; rerender(); }, () => { vista = new Date(t.getFullYear(), t.getMonth(), 1); rerender(); }));

  const grid = h("div", { class: "cal" }, DIAS.map((d) => h("div", { class: "cal-dow" }, d)));
  for (let i = 0; i < cells; i++) {
    const d = add(start, i), noMes = d.getMonth() === vista.getMonth(), fer = feriadoNoDia(d), evs = ev[iso(d)] || [];
    const cell = h("button", { type: "button", class: "day" + (noMes ? "" : " out") + (+d === +t ? " today" : "") + (fer ? " fer" : "") + (d.getDay() % 6 === 0 ? " wk" : ""),
      "aria-label": dia(d) + (evs.length ? ", " + evs.length + " itens" : ""), onclick: () => abrirDia(d, evs, fer) },
    h("span", { class: "daynum" }, d.getDate()),
    h("span", { class: "evs" }, (fer ? [h("span", { class: "ev fer", title: fer }, fer)] : []).concat(evs.slice(0, 3).map((e) => h("span", { class: "ev " + e.tipo, style: e.cor ? { "--evc": e.cor } : null, title: e.texto }, e.texto))),
      evs.length > 3 ? h("span", { class: "ev more" }, "+" + (evs.length - 3)) : null));
    grid.appendChild(cell);
  }
  root.appendChild(h("div", { class: "card calcard" }, grid));
  root.appendChild(h("div", { class: "legend" }, [["rotina", "Rotina"], ["aviso", "Preparação"], ["tarefa", "Tarefa"], ["conta", "Conta"], ["estudo", "Estudos"], ["data", "Data especial"], ["fer", "Feriado"]]
    .map(([c, l]) => h("span", { class: "legend-i" }, h("i", { class: "ev " + c }), l))));
  root.appendChild(h("p", { class: "note" }, "Feriados nacionais e a Sexta-feira Santa são calculados automaticamente. Toque num dia para ver os detalhes."));
}
