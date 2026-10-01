/* Notificações (Web Push): permissão, inscrição do aparelho e teste. */
import { sb, user } from "./store.js";
import { VAPID_PUBLIC } from "./config.js";

const b64 = (s) => { const r = atob((s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };
export const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const suporta = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/* o service worker pode demorar ou nem existir (aba anônima): não trava a tela esperando */
const pronto = (ms = 3000) => Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), ms))]);

/* { ok:false, motivo } ou { ok:true, perm, ativo } */
export async function estado() {
  if (!suporta()) return { ok: false, motivo: ios() && !standalone() ? "ios-instalar" : "sem-suporte" };
  const reg = await pronto();
  if (!reg) return { ok: false, motivo: "sem-sw" };
  let ativo = false;
  try { ativo = !!(await reg.pushManager.getSubscription()) && Notification.permission === "granted"; } catch (e) { /* ignore */ }
  return { ok: true, perm: Notification.permission, ativo };
}

export async function ativar() {
  if (!suporta()) throw new Error("Este aparelho não permite notificações.");
  if (!navigator.onLine) throw new Error("Conecte-se à internet para ativar.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Sem permissão. Libere as notificações do Lírio nas configurações do navegador.");
  const reg = await pronto(6000);
  if (!reg) throw new Error("O app ainda está se preparando. Recarregue a página e tente de novo.");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) }); }
    catch (e) { throw new Error("Não consegui registrar este aparelho agora. Tente de novo em instantes."); }
  }
  const j = sub.toJSON();
  const { error } = await sb.from("push_subs").upsert({ user_id: user().id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, ua: navigator.userAgent.slice(0, 200) }, { onConflict: "endpoint" });
  if (error) throw new Error("Não consegui salvar o aparelho: " + error.message);
}

/* desliga neste aparelho; devolve quantos aparelhos ainda restam ativos */
export async function desativar() {
  const reg = await pronto(6000);
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) { await sb.from("push_subs").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe().catch(() => {}); }
  const { count } = await sb.from("push_subs").select("id", { count: "exact", head: true });
  return count || 0;
}

export async function testar() {
  const { error } = await sb.functions.invoke("lembretes", { body: { acao: "teste" } });
  if (error) throw new Error("Não consegui enviar o teste agora.");
}
