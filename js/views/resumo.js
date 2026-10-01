import { h, icon, chip, empty, monthNav, progress, pct, brl, iso, hoje, parse, add, br, download, d0, MESES, DIAS, AREAS, mesLabel, rerender, countUp } from "../lib.js";
import * as db from "../store.js";
import { aderenciaRotinas, checksIdx, rotinasAtivas, ciclosNoPeriodo, registroDe } from "../engine.js";
import { filtroAreas } from "./rotina.js";

let mes = null, area = "", periodo = "7";
const classe = (p) => (p == null ? "idle" : p >= 0.9 ? "ok" : p >= 0.7 ? "warn" : "bad");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const BUCKETS = [[1, "Diárias"], [7, "Semanais"], [14, "Quinzenais"], [28, "Mensais"]];
const bucket = (f) => (f === 1 ? 1 : f <= 9 ? 7 : f <= 20 ? 14 : 28);
const statusDe = (a, c) => (registroDe(a, c) ? "p" : hoje() > c.fim ? "o" : "blank");
const daSemana = (d) => Math.ceil(d.getDate() / 7);
const doArea = (a) => !area || a.area === area;

/* ---- diário de bordo: grade P (feito no prazo) / O (não feito) por atividade ---- */
function gradeMes(ini, fim) {
  const grupos = { 1: [], 7: [], 14: [], 28: [] };
  rotinasAtivas().filter(doArea).forEach((a) => {
    const ciclos = ciclosNoPeriodo(a, ini, fim); if (!ciclos.length) return;
    const cols = {}; let p = 0, tot = 0;
    ciclos.forEach((c) => { const st = statusDe(a, c); cols[bucket(a.freq) === 1 ? c.fim.getDate() : daSemana(c.fim)] = st; if (st !== "blank") { tot++; if (st === "p") p++; } });
    grupos[bucket(a.freq)].push({ nome: a.nome, cols, pct: tot ? p / tot : null });
  });
  const tarefas = [], semPrazo = [];
  db.rows("tarefas").filter((t) => !area || t.area === area).forEach((t) => {
    if (t.feita && t.feito_em) { const d = d0(new Date(t.feito_em)); if (d >= ini && d <= fim) { tarefas.push({ nome: t.nome, cols: { [d.getDate()]: "p" }, pct: 1 }); return; } }
    else if (!t.feita && t.prazo) { const d = parse(t.prazo); if (d >= ini && d <= fim) { const st = hoje() > d ? "o" : "blank"; tarefas.push({ nome: t.nome, cols: { [d.getDate()]: st }, pct: st === "o" ? 0 : null }); return; } }
    if (!t.feita && !t.prazo) semPrazo.push(t.nome);
  });
  grupos[1] = grupos[1].concat(tarefas);
  return { grupos, semPrazo };
}
const media = (linhas) => { let p = 0, o = 0; linhas.forEach((l) => Object.values(l.cols).forEach((s) => { if (s === "p") p++; else if (s === "o") o++; })); return p + o ? p / (p + o) : null; };

function quadro(titulo, linhas, nCols, diario, ref) {
  const m = media(linhas), box = h("section", { class: "card stack dbq" }, h("h3", { class: "row gap" }, titulo, chip(pct(m), classe(m))));
  if (!linhas.length) { box.appendChild(h("p", { class: "muted small" }, "Nada registrado neste período.")); return box; }
  const head = h("tr", null, h("th", { class: "l" }, "Atividade"), Array.from({ length: nCols }, (_, i) => h("th", null, diario ? [String(i + 1), h("br"), h("small", null, DIAS[new Date(ref.getFullYear(), ref.getMonth(), i + 1).getDay()])] : "S" + (i + 1))), h("th", null, "Aderência"));
  const body = linhas.map((l) => h("tr", null, h("td", { class: "l" }, l.nome), Array.from({ length: nCols }, (_, i) => { const s = l.cols[i + 1]; return h("td", null, h("span", { class: "dbadge " + (s || "blank"), title: s === "p" ? "Feito no prazo" : s === "o" ? "Não feito" : "" }, s === "p" ? "P" : s === "o" ? "O" : "–")); }), h("td", null, chip(pct(l.pct), classe(l.pct)))));
  box.appendChild(h("div", { class: "scrollx" }, h("table", { class: "dbtable" }, h("thead", null, head), h("tbody", null, body))));
  return box;
}

/* ---- exportação Word (da agenda original, adaptada) ---- */
const LABEL_PERIODO = { 1: "Diário", 7: "Semanal", 14: "Quinzenal", 30: "Mensal" };
function docHTML(dias, nome) {
  const fim = hoje(), ini = add(hoje(), -(dias - 1)), F = "font-family:Calibri,Arial,sans-serif;";
  const range = []; for (let d = new Date(ini); d <= fim; d = add(d, 1)) range.push(new Date(d));
  const pill = (txt, p) => { const c = { ok: ["#E6F6EE", "#1E7A52"], warn: ["#FFF3DD", "#A25F0B"], bad: ["#FDE8EC", "#B3243E"], idle: ["#F3EEF5", "#7A6D83"] }[classe(p)]; return '<span style="background:' + c[0] + ";color:" + c[1] + ";padding:2px 10px;border-radius:12px;font-weight:bold;font-size:11px;" + F + '">' + txt + "</span>"; };
  const cell = (s) => (s === "p" ? '<span style="display:inline-block;width:18px;height:18px;line-height:18px;border-radius:5px;background:#E6F6EE;color:#1E7A52;font-size:10px;font-weight:bold">P</span>' : s === "o" ? '<span style="display:inline-block;width:18px;height:18px;line-height:18px;border-radius:5px;background:#FDE8EC;color:#B3243E;font-size:10px;font-weight:bold">O</span>' : '<span style="color:#C9BECF;font-size:10px">–</span>');
  const porDia = (a, c) => { const k = iso(c.fim); return k; };
  let blocos = "", tp = 0, to = 0;
  const linhasPorBucket = { 1: [], 7: [], 14: [], 28: [] };
  rotinasAtivas().filter(doArea).forEach((a) => {
    const cs = ciclosNoPeriodo(a, ini, fim); if (!cs.length) return;
    const dias2 = {}; let p = 0, t = 0;
    cs.forEach((c) => { const s = statusDe(a, c); dias2[porDia(a, c)] = s; if (s !== "blank") { t++; if (s === "p") p++; } });
    linhasPorBucket[bucket(a.freq)].push({ nome: a.nome, dias: dias2, pct: t ? p / t : null });
    tp += p; to += t - p;
  });
  const tarefas = [], fora = [];
  db.rows("tarefas").filter((t) => !area || t.area === area).forEach((t) => {
    if (t.feita && t.feito_em) { const d = d0(new Date(t.feito_em)); if (d >= ini && d <= fim) { tarefas.push({ nome: t.nome, dias: { [iso(d)]: "p" }, pct: 1 }); return; } }
    else if (!t.feita && t.prazo) { const d = parse(t.prazo); if (d >= ini && d <= fim) { const s = hoje() > d ? "o" : "blank"; tarefas.push({ nome: t.nome, dias: { [iso(d)]: s }, pct: s === "o" ? 0 : null }); return; } }
    if (!t.feita && !t.prazo) fora.push(t.nome);
  });
  linhasPorBucket[1] = linhasPorBucket[1].concat(tarefas);
  BUCKETS.forEach(([f, titulo]) => {
    const linhas = linhasPorBucket[f]; let p = 0, o = 0; linhas.forEach((l) => Object.values(l.dias).forEach((s) => { if (s === "p") p++; else if (s === "o") o++; }));
    const m = p + o ? p / (p + o) : null;
    blocos += '<h2 style="' + F + 'font-size:14px;color:#2B2230;margin:22px 0 8px">' + titulo + " " + pill(pct(m), m) + "</h2>";
    if (!linhas.length) { blocos += '<p style="' + F + 'font-size:12px;color:#9A8FA0;margin:0 0 12px">Nada registrado neste período.</p>'; return; }
    blocos += '<table style="border-collapse:collapse;width:100%;border:1px solid #EEE6F0"><tr style="background:#FAF5F8"><th style="text-align:left;padding:6px 8px;' + F + 'font-size:10px;color:#9A8FA0;text-transform:uppercase">Atividade</th>' +
      range.map((d) => '<th style="text-align:center;padding:4px 3px;' + F + 'font-size:9.5px;color:#9A8FA0">' + br(d) + "<br>" + DIAS[d.getDay()] + "</th>").join("") + '<th style="padding:6px 8px;' + F + 'font-size:10px;color:#9A8FA0;text-transform:uppercase">Aderência</th></tr>' +
      linhas.map((l) => '<tr><td style="padding:6px 8px;border-bottom:1px solid #EEE6F0;' + F + 'font-size:12px;font-weight:bold;color:#2B2230">' + esc(l.nome) + "</td>" + range.map((d) => '<td style="padding:6px 3px;border-bottom:1px solid #EEE6F0;text-align:center">' + cell(l.dias[iso(d)]) + "</td>").join("") + '<td style="padding:6px 8px;border-bottom:1px solid #EEE6F0;text-align:center">' + pill(pct(l.pct), l.pct) + "</td></tr>").join("") + "</table>";
  });
  const tot = tp + to ? tp / (tp + to) : null, label = LABEL_PERIODO[dias] || dias + " dias", faixa = dias === 1 ? br(hoje()) : br(ini) + " a " + br(fim);
  const areaTxt = area ? " · " + AREAS[area].l : "";
  return '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Diário de Bordo ' + esc(label) + "</title></head><body><div style=\"max-width:900px\">" +
    '<div style="border-bottom:3px solid #C4477A;padding-bottom:12px;margin-bottom:20px"><div style="' + F + 'font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9A8FA0">Lírio' + areaTxt + '</div><div style="' + F + 'font-size:24px;font-weight:bold;color:#2B2230">Diário de Bordo — ' + esc(label) + "</div>" +
    (nome ? '<div style="' + F + 'font-size:13px;font-weight:bold;color:#5D5163">' + esc(nome) + "</div>" : "") + '<div style="' + F + 'font-size:13px;color:#9A8FA0">Período: ' + faixa + "</div></div>" +
    '<div style="margin-bottom:16px"><span style="' + F + 'font-size:28px;font-weight:bold;color:' + { ok: "#1E7A52", warn: "#A25F0B", bad: "#B3243E", idle: "#9A8FA0" }[classe(tot)] + '">' + pct(tot) + '</span> <span style="' + F + 'font-size:12px;color:#9A8FA0">de aderência no período</span></div>' + blocos +
    (fora.length ? '<h2 style="' + F + 'font-size:14px;color:#2B2230;margin:22px 0 8px">Tarefas sem prazo</h2><ul>' + fora.map((n) => '<li style="' + F + 'font-size:12px">' + esc(n) + "</li>").join("") + "</ul>" : "") +
    '<div style="margin-top:22px"><p style="' + F + 'font-size:12px;font-weight:bold;color:#5D5163;margin:0 0 6px">Observações</p><div style="border:1px solid #EEE6F0;border-radius:8px;min-height:70px"></div></div>' +
    '<div style="margin-top:20px;padding-top:12px;border-top:1px solid #EEE6F0;' + F + 'font-size:11px;color:#9A8FA0">P = feito no prazo · O = não feito · traço: fora do período ou ainda não venceu · Aderência boa a partir de 90%.</div></div></body></html>';
}

export function render(root, { cfg }) {
  const t = hoje(), mod = cfg.modulos, nome = (db.perfil() || {}).nome || "";
  if (!mes) mes = new Date(t.getFullYear(), t.getMonth(), 1);
  const ini = new Date(mes.getFullYear(), mes.getMonth(), 1), fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 0), i = iso(ini), f = iso(fim);

  root.appendChild(h("div", { class: "page-head" }, h("div", null, h("p", { class: "eyebrow" }, "Balanço"), h("h1", null, "Resumo"), h("p", { class: "muted" }, "Como foi o seu mês.")),
    h("button", { class: "btn ghost", type: "button", onclick: () => window.print() }, icon("print", 18), h("span", null, "Imprimir / PDF"))));
  root.appendChild(monthNav(mes, (x) => { mes = x; rerender(); }, () => { mes = new Date(t.getFullYear(), t.getMonth(), 1); rerender(); }, "Mês atual"));
  const fa = filtroAreas(area, (v) => { area = v; rerender(); }, new Set(Object.keys(AREAS))); if (fa) root.appendChild(fa);

  const stats = [], blocos = [];
  if (mod.rotina) {
    const ader = aderenciaRotinas(ini, fim); stats.push(["Rotina", ader.pct, classe(ader.pct), (v) => pct(v)]);
    const filtradas = ader.linhas.filter((l) => doArea(l.a));
    if (filtradas.length) blocos.push(h("section", { class: "card stack" }, h("h3", null, "Rotina por atividade"), filtradas.map((l) => h("div", { class: "catrow" }, h("span", null, l.a.nome), progress(l.pct, classe(l.pct)), h("strong", null, l.feitos + "/" + l.total)))));
  }
  if (mod.habitos) {
    const idx = checksIdx(), ativos = db.rows("habitos").filter((x) => x.ativo !== false), ate = fim < t ? fim : t;
    const dias = Math.max(0, Math.round((ate - ini) / 864e5) + 1), sem = dias / 7;
    const linhas = ativos.map((x) => { let n = 0; for (let d = new Date(ini); d <= ate; d = add(d, 1)) if (idx.has(x.id + "|" + iso(d))) n++; const meta = Math.max(1, Math.round(x.meta_semana * sem)); return { x, n, pct: Math.min(1, n / meta) }; });
    const p = linhas.length ? linhas.reduce((s, l) => s + l.pct, 0) / linhas.length : null;
    stats.push(["Hábitos", p, classe(p), (v) => pct(v)]);
    if (linhas.length) blocos.push(h("section", { class: "card stack" }, h("h3", null, "Hábitos"), linhas.map((l) => h("div", { class: "catrow" }, h("span", null, l.x.emoji + " " + l.x.nome), progress(l.pct, classe(l.pct)), h("strong", null, l.n + (l.n === 1 ? " dia" : " dias"))))));
  }
  if (mod.tarefas) { const n = db.rows("tarefas").filter((x) => (!area || x.area === area) && x.feita && x.feito_em && iso(new Date(x.feito_em)) >= i && iso(new Date(x.feito_em)) <= f).length; stats.push(["Tarefas feitas", n, "idle", (v) => String(Math.round(v))]); }
  if (mod.estudos) { const min = db.rows("foco").filter((x) => x.dia >= i && x.dia <= f).reduce((s, x) => s + x.minutos, 0); stats.push(["Horas de foco", min / 60, "idle", (v) => v.toFixed(1).replace(".", ",") + " h"]); }
  if (mod.financas) { const tr = db.rows("transacoes").filter((x) => x.data >= i && x.data <= f), sal = tr.filter((x) => x.tipo === "receita").reduce((s, x) => s + Number(x.valor), 0) - tr.filter((x) => x.tipo === "gasto").reduce((s, x) => s + Number(x.valor), 0); stats.push(["Saldo do mês", sal, sal >= 0 ? "ok" : "bad", (v) => brl(v)]); }
  if (mod.bemestar) {
    const bs = db.rows("bemestar").filter((b) => b.dia >= i && b.dia <= f), med = (a) => (a.length ? a.reduce((s, v) => s + Number(v), 0) / a.length : null);
    const hum = med(bs.map((b) => b.humor).filter(Boolean)), sono = med(bs.map((b) => b.sono_horas).filter((v) => v != null)), agua = med(bs.map((b) => b.agua_copos).filter((v) => v != null));
    if (bs.length) blocos.push(h("section", { class: "card stack" }, h("h3", null, "Bem-estar"), h("div", { class: "row gap wrap" },
      chip("Humor médio: " + (hum ? hum.toFixed(1).replace(".", ",") + "/5" : "—"), "soft"), chip("Sono: " + (sono ? sono.toFixed(1).replace(".", ",") + " h" : "—"), "soft"), chip("Água: " + (agua ? agua.toFixed(1).replace(".", ",") + " copos" : "—"), "soft"), chip(bs.length + " dias registrados", "idle"))));
  }
  if (!stats.length) { root.appendChild(empty("Ative módulos em Ajustes para ver o resumo.")); return; }
  const grid = h("div", { class: "grid4 kpis" }, stats.map(([l, v, c, fm]) => { const s = h("strong", { class: "t-" + c }, v == null ? "—" : fm(0)); if (v != null) countUp(s, v, fm); return h("div", { class: "stat" }, h("small", null, l), s); }));
  root.appendChild(grid); blocos.forEach((b) => root.appendChild(b));

  /* diário de bordo */
  if (mod.rotina) {
    const { grupos, semPrazo } = gradeMes(ini, fim), nSem = Math.ceil(fim.getDate() / 7);
    root.appendChild(h("section", { class: "stack" }, h("div", { class: "row between wrap gap" }, h("h2", null, "Diário de bordo"), h("p", { class: "muted small" }, "P = feito no prazo · O = não feito · traço: ainda não venceu")),
      BUCKETS.map(([fq, tt]) => quadro(tt, grupos[fq], fq === 1 ? fim.getDate() : nSem, fq === 1, mes)),
      semPrazo.length ? h("section", { class: "card stack" }, h("h3", null, "Tarefas sem prazo"), semPrazo.map((n) => h("div", { class: "row between" }, h("span", null, n), chip("Em aberto", "idle")))) : null));
    root.appendChild(h("section", { class: "card stack" }, h("h3", null, "Baixar diário de bordo"),
      h("div", { class: "row gap wrap" },
        h("select", { class: "input", style: { maxWidth: "260px" }, "aria-label": "Período", onchange: (e) => { periodo = e.target.value; } }, [["1", "Diário (hoje)"], ["7", "Semanal (últimos 7 dias)"], ["14", "Quinzenal (últimos 14 dias)"], ["30", "Mensal (últimos 30 dias)"]].map(([v, l]) => h("option", { value: v, selected: v === periodo }, l))),
        h("button", { class: "btn primary", type: "button", onclick: () => { const d = +periodo; download("diario-de-bordo-" + (LABEL_PERIODO[d] || d + "dias").toLowerCase() + "-" + iso(hoje()) + ".doc", "﻿" + docHTML(d, nome), "application/msword;charset=utf-8"); } }, icon("download", 18), h("span", null, "Baixar em Word")))));
  }
}
