/* Dados: cache local + fila de gravações + sincronização com o Supabase (offline-first). */
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";
import { mergeConfig } from "./theme.js";
import { markFresh } from "./lib.js";

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "lirio:auth" }
});

export const TABLES = ["perfis", "rotinas", "rotina_registros", "tarefas", "notas", "habitos", "habito_checks", "transacoes", "contas",
  "metas", "materias", "estudos", "aulas", "foco", "datas_importantes", "bemestar", "compras", "refeicoes"];
const NATURAL = { rotina_registros: "rotina_id,ciclo_inicio", habito_checks: "habito_id,dia", bemestar: "user_id,dia" };
const pk = (t) => (t === "perfis" ? "user_id" : "id");
/* o que apagar localmente junto (o banco faz isso por cascade) */
const CASCADE = { rotinas: [["rotina_registros", "rotina_id"]], habitos: [["habito_checks", "habito_id"]], materias: [["aulas", "materia_id"]] };
const SETNULL = { materias: [["estudos", "materia_id"], ["foco", "materia_id"]] };

const S = { user: null, data: {}, queue: [], online: navigator.onLine, syncing: false, lastSync: null, error: null, ready: false, sending: null };
TABLES.forEach((t) => (S.data[t] = []));
const subs = new Set();
let mutSeq = 0; const touched = new Map(); /* "tabela|id" -> ordem da última mudança local */
const touch = (t, id) => touched.set(t + "|" + id, ++mutSeq);
let notifyTimer; const pendingKinds = new Set();
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
/* junta avisos próximos num só; "sync" nunca engole um aviso que exige redesenhar a tela */
function notify(kind = "local") {
  pendingKinds.add(kind); cancelAnimationFrame(notifyTimer);
  notifyTimer = requestAnimationFrame(() => {
    const k = ["auth", "local", "remote", "sync"].find((x) => pendingKinds.has(x)); pendingKinds.clear();
    subs.forEach((f) => f(k));
  });
}

export const user = () => S.user;
export const status = () => ({ online: S.online, syncing: S.syncing, pending: S.queue.length, lastSync: S.lastSync, error: S.error, ready: S.ready });
export const rows = (t) => S.data[t];
export const byId = (t, id) => S.data[t].find((r) => r[pk(t)] === id);
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); }));

/* ---------- persistência local ---------- */
const kData = () => "lirio:" + S.user.id + ":data";
const kQueue = () => "lirio:" + S.user.id + ":q";
let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(kData(), JSON.stringify(S.data)); localStorage.setItem(kQueue(), JSON.stringify(S.queue)); }
    catch (e) { /* storage cheio ou bloqueado: continua em memória */ }
  }, 120);
}
function loadLocal() {
  try {
    const d = JSON.parse(localStorage.getItem(kData()) || "null");
    if (d) TABLES.forEach((t) => (S.data[t] = Array.isArray(d[t]) ? d[t] : []));
    S.queue = JSON.parse(localStorage.getItem(kQueue()) || "[]");
  } catch (e) { S.queue = []; }
}
function resetMemory() { TABLES.forEach((t) => (S.data[t] = [])); S.queue = []; S.lastSync = null; }

/* ---------- mutações ---------- */
function enqueue(op) {
  const key = pk(op.t);
  const id = op.k === "up" ? op.row[key] : op.id;
  const same = (o) => o.t === op.t && (o.k === "up" ? o.row[key] : o.id) === id;
  if (op.k === "up") {
    /* troca no mesmo lugar para manter a ordem (pai antes do filho), menos a que já está sendo enviada */
    const i = S.queue.findIndex((o) => o.k === "up" && same(o) && o !== S.sending);
    if (i > -1) { S.queue[i] = op; return; }
  } else S.queue = S.queue.filter((o) => !same(o) || o === S.sending);
  S.queue.push(op);
}
/* gravação silenciosa: não redesenha a tela (usada em campos de texto para não roubar o foco) */
let quietDepth = 0;
export function quiet(fn) { quietDepth++; try { return fn(); } finally { quietDepth--; } }
function commit() { persist(); notify(quietDepth ? "sync" : "local"); flush(); }

export function add(t, row) {
  const now = new Date().toISOString();
  const base = { user_id: S.user.id, created_at: now, updated_at: now };
  if (t !== "perfis") base.id = uid();
  const r = Object.assign(base, row);
  S.data[t].push(r); touch(t, r[pk(t)]); if (t !== "perfis") markFresh(r.id); enqueue({ t, k: "up", row: r }); commit(); return r;
}
export function patch(t, id, p) {
  const r = byId(t, id); if (!r) return null;
  Object.assign(r, p, { updated_at: new Date().toISOString() });
  touch(t, id);
  enqueue({ t, k: "up", row: Object.assign({}, r) }); commit(); return r;
}
export function del(t, id) {
  S.data[t] = S.data[t].filter((r) => r[pk(t)] !== id);
  touch(t, id);
  (CASCADE[t] || []).forEach(([ct, fk]) => { S.data[ct] = S.data[ct].filter((r) => r[fk] !== id); S.queue = S.queue.filter((o) => !(o.t === ct && o.k === "up" && o.row[fk] === id)); });
  (SETNULL[t] || []).forEach(([ct, fk]) => S.data[ct].forEach((r) => { if (r[fk] === id) patch(ct, r.id, { [fk]: null }); }));
  enqueue({ t, k: "del", id }); commit();
}
/* cria ou atualiza pela chave natural (ex.: hábito+dia) */
export function upsertBy(t, match, p) {
  const r = S.data[t].find((x) => Object.keys(match).every((k) => x[k] === match[k]));
  return r ? patch(t, r.id, p) : add(t, Object.assign({}, match, p));
}
export function delBy(t, match) {
  const r = S.data[t].find((x) => Object.keys(match).every((k) => x[k] === match[k]));
  if (r) del(t, r.id);
}

/* ---------- configurações (perfil) ---------- */
export function perfil() { return S.data.perfis[0] || null; }
export function config() { const p = perfil(); return mergeConfig(p && p.config); }
export function setConfig(p) {
  const cur = config();
  const next = Object.assign({}, cur, p);
  if (p.modulos) next.modulos = Object.assign({}, cur.modulos, p.modulos);
  const pf = perfil();
  if (pf) patch("perfis", S.user.id, { config: next });
  else add("perfis", { user_id: S.user.id, config: next, nome: "" });
  return next;
}
export function setNome(nome) {
  if (perfil()) patch("perfis", S.user.id, { nome }); else add("perfis", { user_id: S.user.id, nome, config: {} });
}

/* ---------- sincronização ---------- */
const isNet = (e) => !navigator.onLine || /fetch|network|load failed|timeout/i.test((e && e.message) || "");
const isAuth = (e) => e && (e.code === "PGRST301" || e.code === "PGRST303" || /jwt|token/i.test(e.message || "") || e.status === 401);

export async function flush() {
  if (S.syncing || !S.user || !S.queue.length || !navigator.onLine) return;
  S.syncing = true; S.error = null; notify("sync");
  try {
    const { data: ses } = await sb.auth.getSession();
    if (!ses.session) return;
    while (S.queue.length) {
      const op = S.queue[0]; S.sending = op;
      const res = op.k === "up"
        ? await sb.from(op.t).upsert(op.row, { onConflict: NATURAL[op.t] || pk(op.t) })
        : await sb.from(op.t).delete().eq(pk(op.t), op.id);
      S.sending = null;
      const sai = () => { const i = S.queue.indexOf(op); if (i > -1) S.queue.splice(i, 1); };
      if (res.error) {
        if (isNet(res.error) || isAuth(res.error)) { S.error = "Sem conexão com o servidor."; break; }
        console.error("Falha ao sincronizar", op, res.error);
        S.error = "Um item não pôde ser salvo: " + res.error.message;
        sai();
      } else sai();
      persist();
    }
  } catch (e) { S.error = "Sem conexão com o servidor."; }
  finally { S.sending = null; S.syncing = false; persist(); notify("sync"); }
}

let pulling = false;
export async function pull(force = false) {
  if (pulling || !S.user || !navigator.onLine) return;
  if (!force && S.lastSync && Date.now() - S.lastSync < 20000) return;
  pulling = true;
  try {
    await flush();
    const seq0 = mutSeq;
    const results = await Promise.all(TABLES.map(async (t) => {
      let all = [], from = 0;
      for (;;) {
        const { data, error } = await sb.from(t).select("*").order(pk(t)).range(from, from + 999);
        if (error) throw error;
        all = all.concat(data); if (data.length < 1000) break; from += 1000;
      }
      return [t, all];
    }));
    results.forEach(([t, server]) => {
      const key = pk(t);
      const dels = new Set(S.queue.filter((o) => o.t === t && o.k === "del").map((o) => o.id));
      const ups = [...new Map(S.queue.filter((o) => o.t === t && o.k === "up").map((o) => [o.row[key], o.row])).values()];
      /* mudanças feitas enquanto a busca estava em andamento valem mais que a resposta do servidor */
      const fresh = new Set();
      touched.forEach((sq, k) => { if (sq > seq0 && k.startsWith(t + "|")) fresh.add(k.slice(t.length + 1)); });
      const upIds = new Set(ups.map((r) => r[key]));
      const keep = new Set([...fresh, ...upIds]);
      const localFresh = S.data[t].filter((r) => fresh.has(r[key]) && !upIds.has(r[key]));
      S.data[t] = server.filter((r) => !dels.has(r[key]) && !keep.has(r[key])).concat(ups, localFresh);
    });
    touched.clear();
    S.lastSync = Date.now(); S.error = null;
    if (!perfil()) add("perfis", { user_id: S.user.id, nome: "", config: {} });
    persist(); notify("remote");
  } catch (e) {
    if (isNet(e) || isAuth(e)) S.error = "Sem conexão com o servidor."; else { console.error(e); S.error = "Não consegui sincronizar agora."; }
    notify("sync");
  } finally { pulling = false; if (!S.ready) { S.ready = true; notify("local"); } }
}

/* ---------- autenticação ---------- */
const kLast = "lirio:lastUser";
async function enter(u) {
  if (S.user && S.user.id === u.id) return;
  S.user = { id: u.id, email: u.email };
  try { localStorage.setItem(kLast, JSON.stringify(S.user)); } catch (e) { /* ignore */ }
  resetMemory(); loadLocal();
  /* aparelho novo: segura a tela até a primeira sincronização, para não piscar vazio */
  let temCache = false; try { temCache = !!localStorage.getItem(kData()); } catch (e) { /* ignore */ }
  S.ready = temCache || !navigator.onLine;
  notify("auth");
  pull(true);
}
export async function init(onRecovery) {
  sb.auth.onAuthStateChange((ev, ses) => {
    if (ev === "PASSWORD_RECOVERY") onRecovery && onRecovery();
    if (ev === "SIGNED_OUT") { S.user = null; resetMemory(); notify("auth"); }
    if ((ev === "SIGNED_IN" || ev === "TOKEN_REFRESHED" || ev === "USER_UPDATED") && ses && ses.user) setTimeout(() => enter(ses.user), 0);
  });
  window.addEventListener("online", () => { S.online = true; notify("sync"); pull(true); });
  window.addEventListener("offline", () => { S.online = false; notify("sync"); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pull(); });
  let ses = null;
  try { ses = (await sb.auth.getSession()).data.session; } catch (e) { /* offline */ }
  if (ses) await enter(ses.user);
  else if (!navigator.onLine) {
    try { const last = JSON.parse(localStorage.getItem(kLast) || "null"); if (last) await enter(last); } catch (e) { /* ignore */ }
  }
}
export async function signIn(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(/invalid login/i.test(error.message) ? "E-mail ou senha incorretos." : /confirm/i.test(error.message) ? "Confirme seu e-mail antes de entrar (veja a caixa de entrada)." : error.message);
}
export async function signInMagic(email) {
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin } });
  if (error) throw new Error(/rate|seconds/i.test(error.message) ? "Aguarde um minutinho antes de pedir outro link." : /not allowed|signup/i.test(error.message) ? "Esse e-mail não tem acesso." : "Não consegui enviar o link agora.");
}
export async function resetPassword(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
  if (error) throw new Error(error.message);
}
export async function updatePassword(password) {
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
export async function signOut() {
  await flush();
  const id = S.user && S.user.id;
  await sb.auth.signOut();
  try { if (id && !S.queue.length) { localStorage.removeItem("lirio:" + id + ":data"); localStorage.removeItem("lirio:" + id + ":q"); } localStorage.removeItem(kLast); } catch (e) { /* ignore */ }
  S.user = null; resetMemory(); notify("auth");
}

/* ---------- backup ---------- */
export function exportAll() { return JSON.stringify({ app: "lirio", versao: 1, exportadoEm: new Date().toISOString(), dados: S.data }, null, 2); }
export function importAll(json) {
  const o = JSON.parse(json);
  if (!o || o.app !== "lirio" || !o.dados) throw new Error("Esse arquivo não é um backup do Lírio.");
  let n = 0;
  TABLES.filter((t) => t !== "perfis").forEach((t) => {
    (o.dados[t] || []).forEach((r) => { if (!S.data[t].some((x) => x.id === r.id)) { const row = Object.assign({}, r, { user_id: S.user.id }); S.data[t].push(row); enqueue({ t, k: "up", row }); n++; } });
  });
  commit(); return n;
}
