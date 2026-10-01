/* Service worker do Lírio: abre offline. Supabase nunca passa por aqui. */
const VERSAO = "lirio-v4";
const SHELL = ["./", "index.html", "css/app.css", "manifest.webmanifest", "vendor/supabase.js",
  "js/app.js", "js/lib.js", "js/theme.js", "js/store.js", "js/engine.js", "js/config.js", "js/push.js",
  "js/views/hoje.js", "js/views/rotina.js", "js/views/tarefas.js", "js/views/calendario.js", "js/views/habitos.js", "js/views/bemestar.js",
  "js/views/financas.js", "js/views/estudos.js", "js/views/notas.js", "js/views/listas.js", "js/views/datas.js", "js/views/resumo.js", "js/views/ajustes.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/flor.png"];

self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  const fonte = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !fonte) return;
  if (fonte) {
    /* fontes: cache primeiro, atualiza em segundo plano */
    e.respondWith(caches.open(VERSAO).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  /* app: rede primeiro (sempre a versão nova quando online), cache como reserva offline */
  e.respondWith(fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(VERSAO).then((c) => c.put(req, cp)); } return r; })
    .catch(() => caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});

/* ---------- notificações ---------- */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "Lírio", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Lírio", {
    body: d.body || "", icon: "icons/icon-192.png", badge: "icons/flor.png", tag: d.tag || "lirio", data: { url: d.url || "/#/hoje" }
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/#/hoje", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ("focus" in c) { if (c.navigate) c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
