import { h, icon, chip, empty, monthNav, progress, pct, brl, iso, hoje, parse, dia, add, br, download, MESES, mesLabel, rerender } from "../lib.js";
import * as db from "../store.js";
import { aderenciaRotinas, checksIdx } from "../engine.js";

let mes = null;
const classe = (p) => (p == null ? "idle" : p >= 0.9 ? "ok" : p >= 0.7 ? "warn" : "bad");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function dados(m, cfg) {
  const ini = new Date(m.getFullYear(), m.getMonth(), 1), fim = new Date(m.getFullYear(), m.getMonth() + 1, 0), i = iso(ini), f = iso(fim), mod = cfg.modulos;
  const ader = mod.rotina ? aderenciaRotinas(ini, fim) : null;
  let hab = null;
  if (mod.habitos) {
    const idx = checksIdx(), ativos = db.rows("habitos").filter((x) => x.ativo !== false), ate = fim < hoje() ? fim : hoje();
    const dias = Math.max(0, Math.round((ate - ini) / 864e5) + 1), semanas = dias / 7;
    const linhas = ativos.map((x) => { let n = 0; for (let d = new Date(ini); d <= ate; d = add(d, 1)) if (idx.has(x.id + "|" + iso(d))) n++; const meta = Math.max(1, Math.round(x.meta_semana * semanas)); return { x, n, meta, pct: Math.min(1, n / meta) }; });
    const p = linhas.length ? linhas.reduce((s, l) => s + l.pct, 0) / linhas.length : null;
    hab = { linhas, pct: p };
  }
  const tarefas = mod.tarefas ? db.rows("tarefas").filter((t) => t.feita && t.feito_em && iso(new Date(t.feito_em)) >= i && iso(new Date(t.feito_em)) <= f).length : null;
  const tr = mod.financas ? db.rows("transacoes").filter((x) => x.data >= i && x.data <= f) : null;
  const fin = tr ? { ent: tr.filter((x) => x.tipo === "receita").reduce((s, x) => s + Number(x.valor), 0), sai: tr.filter((x) => x.tipo === "gasto").reduce((s, x) => s + Number(x.valor), 0) } : null;
  const bs = mod.bemestar ? db.rows("bemestar").filter((b) => b.dia >= i && b.dia <= f) : null;
  const med = (a) => (a.length ? a.reduce((s, v) => s + Number(v), 0) / a.length : null);
  const bem = bs ? { humor: med(bs.map((b) => b.humor).filter(Boolean)), sono: med(bs.map((b) => b.sono_horas).filter((v) => v != null)), agua: med(bs.map((b) => b.agua_copos).filter((v) => v != null)), dias: bs.length } : null;
  return { ader, hab, tarefas, fin, bem };
}

function html(m, d, nome) {
  const F = "font-family:Calibri,Arial,sans-serif;";
  const pill = (txt, p) => { const c = { ok: ["#E6F6EE", "#1E7A52"], warn: ["#FFF3DD", "#A25F0B"], bad: ["#FDE8EC", "#B3243E"], idle: ["#F3EEF5", "#7A6D83"] }[classe(p)]; return '<span style="background:' + c[0] + ";color:" + c[1] + ";padding:2px 10px;border-radius:12px;font-weight:bold;font-size:12px;" + F + '">' + txt + "</span>"; };
  let b = '<div style="' + F + 'max-width:820px"><div style="border-bottom:3px solid #D6477F;padding-bottom:12px;margin-bottom:18px"><div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#9A8FA0">Lírio · resumo do mês</div><div style="font-size:26px;font-weight:bold;color:#2B2230">' + esc(mesLabel(m)) + "</div>" + (nome ? '<div style="color:#5D5163">' + esc(nome) + "</div>" : "") + "</div>";
  const sec = (t) => '<h2 style="font-size:15px;color:#2B2230;margin:20px 0 8px">' + t + "</h2>";
  if (d.ader) {
    b += sec("Rotina " + pill(pct(d.ader.pct), d.ader.pct));
    b += d.ader.linhas.length ? '<table style="border-collapse:collapse;width:100%">' + d.ader.linhas.map((l) => '<tr><td style="padding:6px 8px;border-bottom:1px solid #EEE6F0;' + F + 'font-size:13px">' + esc(l.a.nome) + '</td><td style="padding:6px 8px;border-bottom:1px solid #EEE6F0;text-align:center;' + F + 'font-size:13px">' + l.feitos + "/" + l.total + '</td><td style="padding:6px 8px;border-bottom:1px solid #EEE6F0;text-align:right">' + pill(pct(l.pct), l.pct) + "</td></tr>").join("") + "</table>" : '<p style="color:#9A8FA0">Sem ciclos neste mês.</p>';
  }
  if (d.hab) { b += sec("Hábitos " + pill(pct(d.hab.pct), d.hab.pct)); b += d.hab.linhas.length ? "<ul>" + d.hab.linhas.map((l) => "<li>" + esc(l.x.emoji + " " + l.x.nome) + ": " + l.n + " dias (" + pct(l.pct) + ")</li>").join("") + "</ul>" : ""; }
  if (d.tarefas != null) b += sec("Tarefas") + "<p>" + d.tarefas + " concluídas no mês.</p>";
  if (d.fin) b += sec("Finanças") + "<p>Entradas: " + brl(d.fin.ent) + " · Gastos: " + brl(d.fin.sai) + " · Saldo: <b>" + brl(d.fin.ent - d.fin.sai) + "</b></p>";
  if (d.bem && d.bem.dias) b += sec("Bem-estar") + "<p>Humor médio: " + (d.bem.humor ? d.bem.humor.toFixed(1).replace(".", ",") + "/5" : "—") + " · Sono: " + (d.bem.sono ? d.bem.sono.toFixed(1).replace(".", ",") + " h" : "—") + " · Água: " + (d.bem.agua ? d.bem.agua.toFixed(1).replace(".", ",") + " copos" : "—") + "</p>";
  return '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Resumo ' + esc(mesLabel(m)) + "</title></head><body>" + b + '<p style="color:#9A8FA0;font-size:11px;margin-top:24px">Aderência OK a partir de 90%. Gerado pelo Lírio.</p></div></body></html>';
}

export function render(root, { cfg }) {
  const t = hoje();
  if (!mes) mes = new Date(t.getFullYear(), t.getMonth(), 1);
  const d = dados(mes, cfg), nome = (db.perfil() || {}).nome || "";
  root.appendChild(h("div", { class: "page-head" }, h("div", null, h("h1", null, "Resumo"), h("p", { class: "muted" }, "Como foi o seu mês.")),
    h("div", { class: "row gap" },
      h("button", { class: "btn ghost", type: "button", onclick: () => window.print() }, icon("print", 18), h("span", null, "Imprimir / PDF")),
      h("button", { class: "btn ghost", type: "button", onclick: () => download("resumo-" + iso(mes).slice(0, 7) + ".doc", "﻿" + html(mes, d, nome), "application/msword;charset=utf-8") }, icon("download", 18), h("span", null, "Word")))));
  root.appendChild(monthNav(mes, (x) => { mes = x; rerender(); }, () => { mes = new Date(t.getFullYear(), t.getMonth(), 1); rerender(); }, "Mês atual"));
  const stats = [];
  if (d.ader) stats.push(["Rotina", pct(d.ader.pct), classe(d.ader.pct)]);
  if (d.hab) stats.push(["Hábitos", pct(d.hab.pct), classe(d.hab.pct)]);
  if (d.tarefas != null) stats.push(["Tarefas feitas", String(d.tarefas), "idle"]);
  if (d.fin) stats.push(["Saldo", brl(d.fin.ent - d.fin.sai), d.fin.ent - d.fin.sai >= 0 ? "ok" : "bad"]);
  if (!stats.length) { root.appendChild(empty("Ative módulos em Ajustes para ver o resumo.")); return; }
  root.appendChild(h("div", { class: "grid4" }, stats.map(([l, v, c]) => h("div", { class: "stat" }, h("small", null, l), h("strong", { class: "t-" + c }, v)))));
  if (d.ader && d.ader.linhas.length) root.appendChild(h("section", { class: "card stack" }, h("h3", null, "Rotina por atividade"), d.ader.linhas.map((l) => h("div", { class: "catrow" }, h("span", null, l.a.nome), progress(l.pct, classe(l.pct)), h("strong", null, l.feitos + "/" + l.total)))));
  if (d.hab && d.hab.linhas.length) root.appendChild(h("section", { class: "card stack" }, h("h3", null, "Hábitos"), d.hab.linhas.map((l) => h("div", { class: "catrow" }, h("span", null, l.x.emoji + " " + l.x.nome), progress(l.pct, classe(l.pct)), h("strong", null, l.n + " dias")))));
  if (d.bem && d.bem.dias) root.appendChild(h("section", { class: "card stack" }, h("h3", null, "Bem-estar"), h("div", { class: "row gap wrap" },
    chip("Humor médio: " + (d.bem.humor ? d.bem.humor.toFixed(1).replace(".", ",") + "/5" : "—"), "soft"), chip("Sono: " + (d.bem.sono ? d.bem.sono.toFixed(1).replace(".", ",") + " h" : "—"), "soft"), chip("Água: " + (d.bem.agua ? d.bem.agua.toFixed(1).replace(".", ",") + " copos" : "—"), "soft"), chip(d.bem.dias + " dias registrados", "idle"))));
  root.appendChild(h("p", { class: "note" }, "Aderência boa: a partir de 90%. Ciclos que ainda não venceram não contam."));
}
