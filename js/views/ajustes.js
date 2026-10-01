import { h, icon, seg, sheet, formSheet, confirmBox, toast, download, chip, rerender, iso, hoje } from "../lib.js";
import * as db from "../store.js";
import { TEMAS, FONTES_TEXTO, FONTES_TITULO } from "../theme.js";

const MODULOS = [
  ["rotina", "Rotina", "Atividades que se repetem"], ["tarefas", "Tarefas", "Lista de afazeres com prazo"], ["calendario", "Calendário", "Visão do mês"],
  ["habitos", "Hábitos", "Sequências diárias"], ["bemestar", "Bem-estar", "Humor, sono, água, diário e gratidão"],
  ["financas", "Finanças", "Lançamentos, contas e metas"], ["estudos", "Faculdade", "Aulas, provas, faltas, foco e metas"], ["notas", "Notas", "Bloco de anotações"],
  ["listas", "Listas", "Mercado, desejos e cardápio"], ["datas", "Datas importantes", "Aniversários e compromissos"], ["resumo", "Resumo", "Relatório mensal"]
];

function trocarSenha() {
  formSheet({ title: "Trocar senha", submitLabel: "Salvar nova senha", values: { a: "", b: "" },
    fields: [{ key: "a", label: "Nova senha (mínimo 6 caracteres)", type: "password", required: true }, { key: "b", label: "Repita a nova senha", type: "password", required: true }],
    onSubmit: async (s) => { if (s.a.length < 6) throw new Error("Use pelo menos 6 caracteres."); if (s.a !== s.b) throw new Error("As senhas não conferem."); await db.updatePassword(s.a); toast("Senha alterada ✔"); } });
}

function importarLegado() {
  sheet("Importar da Agenda GQP (antiga)", (close) => {
    const ta = h("textarea", { class: "input", rows: 5, placeholder: "Cole aqui o conteúdo exportado, ou escolha o arquivo abaixo" });
    const file = h("input", { type: "file", accept: ".json,.txt", class: "input", "aria-label": "Arquivo" });
    file.addEventListener("change", async () => { if (file.files[0]) ta.value = await file.files[0].text(); });
    const err = h("div", { class: "form-err", hidden: true });
    return h("div", { class: "stack" },
      h("p", { class: "muted small" }, "No navegador onde a agenda antiga era usada, abra o console (F12) e rode: ", h("code", null, "copy(localStorage.getItem('rotina-gqp-pavcon-v2'))"), ". Depois cole aqui. Nada do app antigo é apagado."),
      ta, file, err,
      h("button", { class: "btn primary", type: "button", onclick: () => {
        try {
          const o = JSON.parse(ta.value.trim()); const map = {}; let n = 0;
          (o.atividades || []).forEach((a) => { const r = db.add("rotinas", { nome: String(a.nome).slice(0, 120), freq: +a.freq || 7, inicio: a.inicio, duracao: Math.min(+a.duracao || 1, +a.freq || 7), lembrete: !!a.cobranca, so_dias_uteis: true, ativa: a.ativa !== false }); map[a.id] = r.id; n++; });
          Object.entries(o.registros || {}).forEach(([k, v]) => { const m = k.match(/^(.*)_(\d{4}-\d{2}-\d{2})_exec$/); if (m && map[m[1]]) { db.add("rotina_registros", { rotina_id: map[m[1]], ciclo_inicio: m[2], feito_em: v.feitoEm || new Date().toISOString() }); n++; } });
          (o.tarefas || []).forEach((t) => { db.add("tarefas", { nome: String(t.nome).slice(0, 160), prazo: t.prazo || null, feita: !!t.feita, feito_em: t.feitoEm || null }); n++; });
          (Array.isArray(o.notas) ? o.notas : []).forEach((x) => { db.add("notas", { texto: x.texto, titulo: "" }); n++; });
          toast(n + " itens importados ✔"); close();
        } catch (e) { err.textContent = "Não consegui ler esse conteúdo. Confira se copiou tudo."; err.hidden = false; }
      } }, "Importar"));
  });
}

export function render(root, { cfg }) {
  const set = (p) => { db.setConfig(p); };
  const user = db.user(), perfil = db.perfil() || {}, st = db.status();
  root.appendChild(h("div", { class: "page-head" }, h("div", null, h("p", { class: "eyebrow" }, "Personalização"), h("h1", null, "Ajustes"), h("p", { class: "muted" }, "Deixe o app com a sua cara."))));
  const sec = (titulo, ic, ...kids) => h("section", { class: "card stack" }, h("h3", { class: "row gap" }, icon(ic, 18), titulo), ...kids);

  root.appendChild(sec("Perfil", "user",
    h("div", { class: "field" }, h("label", { class: "flabel", for: "perfil-nome" }, "Como posso te chamar?"),
      h("input", { class: "input", id: "perfil-nome", maxlength: 40, value: perfil.nome || "", placeholder: "Seu nome", onblur: (e) => { if (e.target.value.trim() !== (perfil.nome || "")) db.quiet(() => db.setNome(e.target.value.trim())); } })),
    h("p", { class: "muted small" }, "Conta: " + (user ? user.email : "—"))));

  const custom = h("input", { type: "color", value: cfg.accent || (TEMAS.find((t) => t.id === cfg.tema) || TEMAS[0]).accent, "aria-label": "Escolher outra cor", onchange: (e) => set({ accent: e.target.value }) });
  root.appendChild(sec("Aparência", "palette",
    h("div", { class: "field" }, h("span", { class: "flabel" }, "Tema"), h("div", { class: "themes" }, TEMAS.map((t) => h("button", { type: "button", class: "theme" + (cfg.tema === t.id && !cfg.accent ? " on" : ""), "aria-label": t.nome, "aria-pressed": String(cfg.tema === t.id && !cfg.accent), onclick: () => set({ tema: t.id, accent: null }) }, h("i", { style: { background: t.accent } }), h("span", null, t.nome))),
      h("label", { class: "theme custom" + (cfg.accent ? " on" : "") }, custom, h("span", null, "Outra cor")))),
    h("div", { class: "field" }, h("span", { class: "flabel" }, "Modo"), seg([{ v: "auto", l: "Automático" }, { v: "claro", l: "Claro" }, { v: "escuro", l: "Escuro" }], cfg.modo, (v) => set({ modo: v }))),
    h("div", { class: "field" }, h("label", { class: "flabel", for: "f-texto" }, "Fonte do texto"), h("select", { class: "input", id: "f-texto", onchange: (e) => set({ fonteTexto: e.target.value }) }, FONTES_TEXTO.map((f) => h("option", { selected: f === cfg.fonteTexto }, f)))),
    h("div", { class: "field" }, h("label", { class: "flabel", for: "f-tit" }, "Fonte dos títulos"), h("select", { class: "input", id: "f-tit", onchange: (e) => set({ fonteTitulo: e.target.value }) }, FONTES_TITULO.map((f) => h("option", { selected: f === cfg.fonteTitulo }, f)))),
    h("div", { class: "field" }, h("span", { class: "flabel" }, "Tamanho do texto"), seg([{ v: "p", l: "Pequeno" }, { v: "m", l: "Médio" }, { v: "g", l: "Grande" }], cfg.tamanho, (v) => set({ tamanho: v }))),
    h("div", { class: "field" }, h("span", { class: "flabel" }, "Cantos"), seg([{ v: "reto", l: "Retos" }, { v: "suave", l: "Suaves" }, { v: "redondo", l: "Redondos" }], cfg.cantos, (v) => set({ cantos: v }))),
    h("div", { class: "preview" }, h("h4", null, "Pré-visualização"), h("p", null, "Assim ficam seus títulos e textos."), h("div", { class: "row gap" }, h("button", { class: "btn primary sm", type: "button" }, "Botão"), chip("Etiqueta", "soft"), chip("Pronto", "ok")))));

  root.appendChild(sec("Módulos", "sliders", h("p", { class: "muted small" }, "Ligue só o que faz sentido para você. Nada é apagado ao desligar."),
    h("div", { class: "switches" }, MODULOS.map(([k, nome, desc]) => h("label", { class: "switch-row split" }, h("span", null, h("strong", null, nome), h("small", { class: "muted" }, desc)),
      h("input", { type: "checkbox", checked: !!cfg.modulos[k], onchange: (e) => set({ modulos: { [k]: e.target.checked } }) }), h("span", { class: "switch" }))))));

  root.appendChild(sec("Instalar no celular", "sparkles",
    h("p", { class: "muted small" }, "iPhone: abra no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”. Android: menu do Chrome e “Instalar app”."),
    window.__lirioInstall ? h("button", { class: "btn primary", type: "button", onclick: async () => { window.__lirioInstall.prompt(); await window.__lirioInstall.userChoice; window.__lirioInstall = null; rerender(); } }, "Instalar agora") : null));

  root.appendChild(sec("Sincronização", "cloud",
    h("div", { class: "row gap wrap" }, chip(st.online ? "Online" : "Offline", st.online ? "ok" : "warn"), chip(st.pending ? st.pending + " alterações a enviar" : "Tudo salvo", st.pending ? "warn" : "ok"), st.lastSync ? chip("Última: " + new Date(st.lastSync).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), "idle") : null),
    st.error ? h("p", { class: "form-err" }, st.error) : null,
    h("button", { class: "btn ghost", type: "button", onclick: async () => { await db.pull(true); toast("Sincronizado"); } }, "Sincronizar agora")));

  root.appendChild(sec("Seus dados", "download",
    h("div", { class: "row gap wrap" },
      h("button", { class: "btn ghost", type: "button", onclick: () => download("lirio-backup-" + iso(hoje()) + ".json", db.exportAll(), "application/json") }, icon("download", 18), h("span", null, "Baixar backup")),
      h("label", { class: "btn ghost" }, icon("upload", 18), h("span", null, "Restaurar backup"),
        h("input", { type: "file", accept: ".json", hidden: true, onchange: async (e) => { try { const n = db.importAll(await e.target.files[0].text()); toast(n + " itens restaurados ✔"); } catch (x) { toast(x.message); } } })),
      h("button", { class: "btn ghost", type: "button", onclick: importarLegado }, "Importar da agenda antiga"))));

  root.appendChild(sec("Conta", "user", h("div", { class: "row gap wrap" },
    h("button", { class: "btn ghost", type: "button", onclick: trocarSenha }, "Trocar senha"),
    h("button", { class: "btn danger-ghost", type: "button", onclick: async () => { if (await confirmBox(st.pending ? "Há alterações ainda não enviadas. Conecte-se à internet antes de sair para não perdê-las." : "Você precisará entrar de novo.", { ok: "Sair", title: "Sair da conta?", danger: !!st.pending })) db.signOut(); } }, icon("logout", 18), h("span", null, "Sair")))));

  root.appendChild(h("p", { class: "note center-text" }, "Lírio · feito com carinho para a Débora"));
}
