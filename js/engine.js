/* Motor de rotinas, feriados e cálculos compartilhados pelas telas. */
import { add, between, d0, hoje, iso, parse } from "./lib.js";
import { rows, add as dbAdd, del as dbDel } from "./store.js";

/* ---------- feriados nacionais ---------- */
const cache = {};
function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4,
    f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), hh = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - hh - k) % 7, m = Math.floor((a + 11 * hh + 22 * l) / 451),
    mes = Math.floor((hh + l - 7 * m + 114) / 31), dd = ((hh + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dd);
}
export function feriados(ano) {
  if (cache[ano]) return cache[ano];
  const p = pascoa(ano);
  return (cache[ano] = [
    [new Date(ano, 0, 1), "Confraternização Universal"], [add(p, -47), "Carnaval", true], [add(p, -2), "Sexta-feira Santa"],
    [new Date(ano, 3, 21), "Tiradentes"], [new Date(ano, 4, 1), "Dia do Trabalho"], [new Date(ano, 8, 7), "Independência do Brasil"],
    [new Date(ano, 9, 12), "Nossa Sr.ª Aparecida"], [new Date(ano, 10, 2), "Finados"], [new Date(ano, 10, 15), "Proclamação da República"],
    [new Date(ano, 10, 20), "Consciência Negra"], [new Date(ano, 11, 25), "Natal"]
  ].map(([d, nome, fac]) => ({ d, nome, fac: !!fac })));
}
export function feriadoNoDia(d) {
  const x = +d0(d);
  const f = feriados(d.getFullYear()).find((h) => +h.d === x);
  return f ? f.nome : null;
}
/* Carnaval é ponto facultativo: aparece no calendário, mas não adia rotinas */
export function diaUtil(d) {
  const x = +d0(d);
  return d.getDay() !== 0 && d.getDay() !== 6 && !feriados(d.getFullYear()).some((h) => +h.d === x && !h.fac);
}
function avancar(d, dir) { let x = new Date(d); for (let i = 0; i < 14 && !diaUtil(x); i++) x = add(x, dir); return x; }

/* ---------- ciclos das rotinas ---------- */
export const FREQ_NOME = { 1: "todo dia", 7: "toda semana", 14: "a cada 15 dias", 21: "a cada 3 semanas", 28: "a cada 4 semanas", 30: "todo mês" };
export const freqNome = (n) => FREQ_NOME[n] || (n === 2 ? "dia sim, dia não" : "a cada " + n + " dias");

export function ciclo(a, k) {
  const bruto = add(parse(a.inicio), k * a.freq);
  const ini = a.so_dias_uteis ? avancar(bruto, 1) : bruto;
  const fim = add(ini, a.duracao - 1);
  const c = { k, ini, fim, ajustado: +ini !== +bruto, chave: iso(ini) };
  const lead = Math.min(2, a.freq - a.duracao);
  if (a.lembrete && lead >= 1) { c.avisoIni = add(ini, -lead); c.avisoFim = add(ini, -1); }
  return c;
}
export function cicloAtual(a) {
  const k = Math.ceil((between(parse(a.inicio), hoje()) - (a.duracao - 1)) / a.freq);
  return ciclo(a, Math.max(0, k));
}
let regCache = null, regVer = null;
export function registrosIdx() {
  const r = rows("rotina_registros");
  if (regCache && regVer === r && regCache.n === r.length) return regCache.m;
  const m = new Map(); r.forEach((x) => m.set(x.rotina_id + "|" + x.ciclo_inicio, x));
  regCache = { m, n: r.length }; regVer = r; return m;
}
export const registroDe = (a, c) => registrosIdx().get(a.id + "|" + c.chave);

export function statusCiclo(a, c) {
  const h = hoje(), r = registroDe(a, c);
  if (r) { const late = d0(new Date(r.feito_em)) > c.fim; return { cls: late ? "warn" : "ok", txt: late ? "Feito com atraso" : "Feito", done: true, reg: r }; }
  if (h > c.fim) return { cls: "bad", txt: "Atrasada", done: false, late: true };
  if (h >= c.ini) return { cls: "warn", txt: +h === +c.fim ? "Vence hoje" : "Para hoje", done: false, due: true };
  const n = between(h, c.ini);
  return { cls: "idle", txt: n === 1 ? "Amanhã" : "Em " + n + " dias", done: false };
}
export function toggleCiclo(a, c) {
  const r = registroDe(a, c);
  if (r) dbDel("rotina_registros", r.id);
  else dbAdd("rotina_registros", { rotina_id: a.id, ciclo_inicio: c.chave, feito_em: new Date().toISOString() });
}
/* ciclos anteriores (até 6) sem registro, a partir do dia em que a rotina foi criada */
export function atrasadas(a) {
  const ca = cicloAtual(a), out = [];
  const criada = parse(a.created_at ? a.created_at.slice(0, 10) : a.inicio);
  for (let k = Math.max(0, ca.k - 6); k < ca.k; k++) {
    const c = ciclo(a, k);
    if (!registroDe(a, c) && c.fim >= criada) out.push(c);
  }
  return out;
}
export const rotinasAtivas = () => rows("rotinas").filter((a) => a.ativa !== false).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

/* ciclos de uma rotina cujo fim cai dentro de [ini, fim] */
export function ciclosNoPeriodo(a, ini, fim) {
  const out = [];
  const kStart = Math.floor(between(parse(a.inicio), ini) / a.freq) - 2;
  for (let k = Math.max(0, kStart), t = 0; t < 400; k++, t++) {
    const c = ciclo(a, k);
    if (c.fim > fim) break;
    if (c.fim >= ini && c.fim <= fim) out.push(c);
  }
  return out;
}
export function aderenciaRotinas(ini, fim) {
  let p = 0, o = 0; const linhas = [];
  rotinasAtivas().forEach((a) => {
    let rp = 0, ro = 0;
    ciclosNoPeriodo(a, ini, fim).forEach((c) => {
      if (+parse(a.created_at ? a.created_at.slice(0, 10) : a.inicio) > +c.fim && !registroDe(a, c)) return;
      if (registroDe(a, c)) rp++; else if (hoje() > c.fim) ro++;
    });
    if (rp + ro) linhas.push({ a, feitos: rp, total: rp + ro, pct: rp / (rp + ro) });
    p += rp; o += ro;
  });
  return { p, o, pct: p + o ? p / (p + o) : null, linhas };
}

/* ---------- hábitos ---------- */
export function checksIdx() { const m = new Set(); rows("habito_checks").forEach((c) => m.add(c.habito_id + "|" + c.dia)); return m; }
export function sequencia(habitoId, idx) {
  let d = hoje(), n = 0;
  if (!idx.has(habitoId + "|" + iso(d))) d = add(d, -1);
  while (idx.has(habitoId + "|" + iso(d))) { n++; d = add(d, -1); }
  return n;
}
export function semanaHabito(habitoId, idx, ref = hoje()) {
  const ini = add(ref, -ref.getDay()); let n = 0;
  for (let i = 0; i < 7; i++) if (idx.has(habitoId + "|" + iso(add(ini, i)))) n++;
  return n;
}

/* ---------- datas importantes ---------- */
export function proximaOcorrencia(dt) {
  const base = parse(dt.data);
  if (!dt.anual) return base;
  const h = hoje();
  let d = new Date(h.getFullYear(), base.getMonth(), base.getDate());
  if (d < h) d = new Date(h.getFullYear() + 1, base.getMonth(), base.getDate());
  return d;
}

/* ---------- calendário: tudo que acontece em um mês ---------- */
export function eventosDoMes(ano, mes, cfg) {
  const ini = new Date(ano, mes, 1), fim = new Date(ano, mes + 1, 0), ev = {};
  const push = (d, e) => { (ev[iso(d)] = ev[iso(d)] || []).push(e); };
  const mod = cfg.modulos;
  if (mod.rotina) rotinasAtivas().forEach((a) => {
    const kStart = Math.floor(between(parse(a.inicio), ini) / a.freq) - 1;
    for (let k = Math.max(0, kStart), t = 0; t < 120; k++, t++) {
      const c = ciclo(a, k);
      if (c.ini > fim) break;
      if (c.avisoIni && c.avisoIni >= ini && c.avisoIni <= fim) push(c.avisoIni, { tipo: "aviso", texto: "Prepare: " + a.nome, cor: a.cor });
      if (c.ini >= ini && c.ini <= fim) push(c.ini, { tipo: "rotina", texto: a.nome, cor: a.cor, feito: !!registroDe(a, c) });
    }
  });
  if (mod.tarefas) rows("tarefas").forEach((t) => { if (!t.feita && t.prazo) { const d = parse(t.prazo); if (d >= ini && d <= fim) push(d, { tipo: "tarefa", texto: t.nome }); } });
  if (mod.financas) rows("contas").forEach((c) => { if (!c.paga) { const d = parse(c.vencimento); if (d >= ini && d <= fim) push(d, { tipo: "conta", texto: c.nome }); } });
  if (mod.estudos) rows("estudos").forEach((e) => { if (!e.concluido && e.data) { const d = parse(e.data); if (d >= ini && d <= fim) push(d, { tipo: "estudo", texto: e.titulo }); } });
  if (mod.datas) rows("datas_importantes").forEach((dt) => {
    const b = parse(dt.data);
    const d = dt.anual ? new Date(ano, b.getMonth(), b.getDate()) : b;
    if (d >= ini && d <= fim) push(d, { tipo: "data", texto: dt.titulo });
  });
  return ev;
}

/* ---------- ciclo menstrual (estimativa simples, só para organização) ---------- */
export function previsaoCiclo() {
  const f = rows("bemestar").filter((b) => b.fluxo > 0).map((b) => b.dia).sort();
  if (!f.length) return null;
  const set = new Set(f), inicios = [];
  f.forEach((d) => { if (!set.has(iso(add(parse(d), -1)))) inicios.push(parse(d)); });
  const ult = inicios[inicios.length - 1];
  const gaps = []; for (let i = 1; i < inicios.length; i++) gaps.push(between(inicios[i - 1], inicios[i]));
  const rec = gaps.filter((g) => g >= 18 && g <= 45).slice(-6);
  const media = rec.length ? Math.round(rec.reduce((a, b) => a + b, 0) / rec.length) : 28;
  return { ultimo: ult, media, proximo: add(ult, media), baseadoEm: rec.length };
}
