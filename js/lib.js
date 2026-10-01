/* Helpers: DOM, datas, formatação, ícones, toast, sheets e formulários genéricos */

export const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const DIAS_LONGO = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DAY = 86400000;

export const d0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const add = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const parse = (s) => { const p = String(s).slice(0, 10).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); };
export const br = (d) => String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
export const dia = (d) => DIAS[d.getDay()] + " " + br(d);
export const between = (a, b) => Math.round((d0(b) - d0(a)) / DAY);
export const hoje = () => d0(new Date());
export const mesLabel = (d) => MESES[d.getMonth()] + " de " + d.getFullYear();
export const brl = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const pct = (p) => (p == null ? "—" : Math.round(p * 100) + "%");

export function rel(d) {
  const n = between(hoje(), d);
  if (n === 0) return "hoje";
  if (n === 1) return "amanhã";
  if (n === -1) return "ontem";
  return n > 0 ? "em " + n + " dias" : "há " + -n + " dias";
}

export function saudacao() {
  const h = new Date().getHours();
  return h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/* ---------- DOM ---------- */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  let value;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "value") value = v;
      else if (k === "checked" || k === "disabled" || k === "selected" || k === "hidden") el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
  }
  const put = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(put);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(put);
  if (value !== undefined) el.value = value;
  return el;
}

const ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  tasks: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
  note: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5z"/><path d="M15 3v6h6M8 13h8M8 17h5"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.600 3 3.500 3 5.500a7 7 0 1 1-14 0c0-1.150.4-2.300 1-3a2.500 2.500 0 0 0 2.500 2.500z"/>',
  drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.900-3-5.500s-3.500-4-4-6.500c-.5 2.500-2 4.900-4 6.500C6 11.100 5 13 5 15a7 7 0 0 0 7 7z"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.700 17.700l1.400 1.400M2 12h2M20 12h2M6.300 17.700l-1.400 1.400M19.100 4.900l-1.400 1.400"/>',
  star: '<path d="m12 2 3.100 6.300 6.900 1-5 4.900 1.200 6.900-6.200-3.300-6.200 3.300L7 14.200 2 9.300l6.900-1z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.500 8a2.500 2.500 0 0 1 0-5A4.800 8 0 0 1 12 8a4.800 8 0 0 1 4.500-5 2.500 2.500 0 0 1 0 5"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 2h2l2.700 12.400a2 2 0 0 0 2 1.600h9.800a2 2 0 0 0 2-1.600L22 7H5.100"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  sparkles: '<path d="m12 3-1.900 5.800a2 2 0 0 1-1.300 1.300L3 12l5.800 1.900a2 2 0 0 1 1.300 1.300L12 21l1.900-5.800a2 2 0 0 1 1.300-1.300L21 12l-5.800-1.900a2 2 0 0 1-1.300-1.300z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.300 21a1.900 1.900 0 0 0 3.400 0"/>',
  chart: '<path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  palette: '<circle cx="13.500" cy="6.500" r=".5"/><circle cx="17.500" cy="10.500" r=".5"/><circle cx="8.500" cy="7.500" r=".5"/><circle cx="6.500" cy="12.500" r=".5"/><path d="M12 2C6.500 2 2 6.500 2 12s4.500 10 10 10c.9 0 1.600-.7 1.600-1.600 0-.4-.2-.8-.4-1.100-.3-.3-.4-.7-.4-1.100 0-.9.7-1.600 1.600-1.600H16c3.300 0 6-2.700 6-6 0-4.900-4.500-9-10-9z"/>',
  cloud: '<path d="M17.500 19H9a7 7 0 1 1 6.700-9h1.800a4.500 4.500 0 1 1 0 9z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.300-4.300"/>',
  pin: '<path d="M12 17v5M9 10.800a2 2 0 0 1-1.100 1.800l-1.800.9A2 2 0 0 0 5 15.200V17h14v-1.800a2 2 0 0 0-1.100-1.800l-1.800-.9a2 2 0 0 1-1.100-1.800V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  flower: '<path d="M12 7.500a4.500 4.500 0 1 1 4.500 4.500M12 7.500A4.500 4.500 0 1 0 7.500 12M12 7.500V9m4.500 3a4.500 4.500 0 1 1-4.500 4.500M16.500 12H15m-3 4.500A4.500 4.500 0 1 1 7.500 12M12 16.500V15m-4.500-3H9"/><circle cx="12" cy="12" r="3"/>'
};
export function icon(name, size = 20) {
  const s = h("span", { class: "ico", "aria-hidden": "true" });
  s.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || "") + "</svg>";
  return s;
}

/* ---------- toast ---------- */
let toastBox;
export function toast(msg, ms = 2600) {
  if (!toastBox) { toastBox = h("div", { class: "toasts", role: "status", "aria-live": "polite" }); document.body.appendChild(toastBox); }
  const t = h("div", { class: "toast" }, msg);
  toastBox.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 250); }, ms);
}

/* ---------- sheet (modal) ---------- */
export function sheet(title, build, opts = {}) {
  const prev = document.activeElement;
  let closed = false;
  const body = h("div", { class: "sheet-body" });
  const closeBtn = h("button", { class: "btn icon ghost", type: "button", "aria-label": "Fechar", onclick: () => close() }, icon("x"));
  const box = h("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title },
    h("div", { class: "sheet-head" }, h("h3", null, title), closeBtn), body);
  const bd = h("div", { class: "sheet-bd", onmousedown: (e) => { if (e.target === bd) close(); } }, box);
  function close() {
    if (closed) return; closed = true;
    document.removeEventListener("keydown", onKey);
    bd.classList.add("out");
    setTimeout(() => { bd.remove(); if (!document.querySelector(".sheet-bd")) document.body.classList.remove("lock"); }, 180);
    if (prev && prev.focus) try { prev.focus(); } catch (e) { /* ignore */ }
    if (opts.onClose) opts.onClose();
  }
  function onKey(e) {
    if (e.key === "Escape" && bd === [...document.querySelectorAll(".sheet-bd")].pop()) close();
  }
  document.addEventListener("keydown", onKey);
  body.appendChild(build(close));
  document.body.appendChild(bd);
  document.body.classList.add("lock");
  const first = body.querySelector("input:not([type=hidden]),textarea,select,button");
  if (first && !opts.noFocus) setTimeout(() => first.focus({ preventScroll: true }), 60);
  return close;
}

export function confirmBox(msg, { ok = "Excluir", danger = true, title = "Tem certeza?" } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v, close) => { if (done) return; done = true; resolve(v); close && close(); };
    sheet(title, (close) => h("div", { class: "stack" },
      h("p", { class: "muted" }, msg),
      h("div", { class: "row end gap" },
        h("button", { class: "btn ghost", type: "button", onclick: () => finish(false, close) }, "Cancelar"),
        h("button", { class: "btn " + (danger ? "danger" : "primary"), type: "button", onclick: () => finish(true, close) }, ok))),
      { onClose: () => finish(false), noFocus: true });
  });
}

/* ---------- formulário genérico em sheet ---------- */
export const CORES = ["#D6477F", "#E8809F", "#EE7F63", "#E5A23B", "#7FB77E", "#3FA58C", "#5B9BD5", "#8E6BD8", "#A0457E", "#8A7F93"];

/* field: {key,label,type,options:[{v,l}]|[string],required,placeholder,hint,showIf,min,max,step,rows} */
export function formSheet({ title, fields, values = {}, submitLabel = "Salvar", onSubmit, onDelete, deleteLabel = "Excluir", extra }) {
  const st = {};
  fields.forEach((f) => { st[f.key] = values[f.key] !== undefined ? values[f.key] : (f.def !== undefined ? f.def : (f.type === "checkbox" ? false : "")); });
  return sheet(title, (close) => {
    const wraps = {};
    const refresh = () => fields.forEach((f) => { if (f.showIf) wraps[f.key].hidden = !f.showIf(st); });
    const norm = (o) => (typeof o === "object" ? o : { v: o, l: o });
    const form = h("form", { class: "stack", novalidate: true });
    fields.forEach((f) => {
      let input;
      if (f.type === "textarea") {
        input = h("textarea", { class: "input", rows: f.rows || 4, placeholder: f.placeholder || "", value: st[f.key], oninput: (e) => { st[f.key] = e.target.value; refresh(); } });
      } else if (f.type === "select") {
        input = h("select", { class: "input", onchange: (e) => { st[f.key] = e.target.value; refresh(); } },
          f.options.map(norm).map((o) => h("option", { value: o.v, selected: String(o.v) === String(st[f.key]) }, o.l)));
      } else if (f.type === "checkbox") {
        input = h("label", { class: "switch-row" },
          h("input", { type: "checkbox", checked: !!st[f.key], onchange: (e) => { st[f.key] = e.target.checked; refresh(); } }),
          h("span", { class: "switch" }), h("span", null, f.label));
      } else if (f.type === "chips" || f.type === "emoji") {
        const box = h("div", { class: "chips" + (f.type === "emoji" ? " emojis" : "") });
        const draw = () => { box.innerHTML = ""; f.options.map(norm).forEach((o) => box.appendChild(h("button", { type: "button", class: "chipbtn" + (String(st[f.key]) === String(o.v) ? " on" : ""), "aria-pressed": String(st[f.key]) === String(o.v), onclick: () => { st[f.key] = o.v; draw(); refresh(); } }, o.l))); };
        draw(); input = box;
      } else if (f.type === "color") {
        const box = h("div", { class: "swatches" });
        const draw = () => { box.innerHTML = ""; (f.options || CORES).forEach((c) => box.appendChild(h("button", { type: "button", class: "swatch" + (st[f.key] === c ? " on" : ""), style: { background: c }, "aria-label": "Cor " + c, onclick: () => { st[f.key] = c; draw(); } }))); };
        draw(); input = box;
      } else if (f.type === "money") {
        input = h("input", { class: "input", type: "text", inputmode: "decimal", placeholder: f.placeholder || "0,00", value: st[f.key] === "" ? "" : String(st[f.key]).replace(".", ","), oninput: (e) => { st[f.key] = e.target.value; refresh(); } });
      } else {
        input = h("input", { class: "input", type: f.type || "text", placeholder: f.placeholder || "", min: f.min, max: f.max, step: f.step, maxlength: f.maxlength, inputmode: f.type === "number" ? "decimal" : null, value: st[f.key] == null ? "" : st[f.key], oninput: (e) => { st[f.key] = e.target.value; refresh(); } });
      }
      const wrap = h("div", { class: "field" + (f.type === "checkbox" ? " fcheck" : "") },
        f.type === "checkbox" ? null : h("label", { class: "flabel" }, f.label, f.required ? h("i", { "aria-hidden": "true" }, " *") : null),
        input, f.hint ? h("small", { class: "muted" }, f.hint) : null);
      wraps[f.key] = wrap; form.appendChild(wrap);
    });
    refresh();
    const err = h("div", { class: "form-err", role: "alert", hidden: true });
    const sub = h("button", { class: "btn primary", type: "submit" }, submitLabel);
    form.appendChild(err);
    if (extra) form.appendChild(extra);
    form.appendChild(h("div", { class: "row between gap" },
      onDelete ? h("button", { class: "btn danger-ghost", type: "button", onclick: async () => { if (await confirmBox("Essa ação não pode ser desfeita.", { ok: deleteLabel })) { await onDelete(); close(); } } }, deleteLabel) : h("span"),
      sub));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      for (const f of fields) {
        if (f.showIf && !f.showIf(st)) continue;
        if (f.required && String(st[f.key]).trim() === "") { err.textContent = "Preencha: " + f.label; err.hidden = false; return; }
      }
      err.hidden = true; sub.disabled = true;
      try { const out = {}; fields.forEach((f) => { if (!f.showIf || f.showIf(st)) out[f.key] = st[f.key]; }); const r = await onSubmit(out, close); if (r !== false) close(); }
      catch (ex) { err.textContent = ex.message || "Algo deu errado."; err.hidden = false; }
      finally { sub.disabled = false; }
    });
    return form;
  });
}

export const num = (v) => { const n = parseFloat(String(v).replace(/\./g, (m, i, s) => (s.includes(",") ? "" : m)).replace(",", ".")); return isNaN(n) ? 0 : n; };

/* ---------- pequenos componentes ---------- */
export function check(on, onclick, label) {
  return h("button", { class: "check" + (on ? " on" : ""), type: "button", role: "checkbox", "aria-checked": String(!!on), "aria-label": label || "Marcar", onclick: (e) => { e.stopPropagation(); onclick(e); } }, on ? icon("check", 16) : null);
}
export function item({ lead, title, sub, trail, onclick, cls = "", done = false }) {
  const el = h("div", { class: "item " + cls + (done ? " done" : "") + (onclick ? " tap" : ""), role: onclick ? "button" : null, tabindex: onclick ? "0" : null, onclick,
    onkeydown: onclick ? (e) => { if (e.key === "Enter" && e.target === el) onclick(e); } : null },
  lead || null,
  h("div", { class: "item-main" }, h("div", { class: "item-title" }, title), sub ? h("div", { class: "item-sub" }, sub) : null),
  trail ? h("div", { class: "item-trail" }, trail) : null);
  return el;
}
export function chip(text, cls = "") { return h("span", { class: "chip " + cls }, text); }
export function empty(msg, cta) { return h("div", { class: "empty" }, h("div", { class: "empty-flower" }, icon("flower", 28)), h("p", null, msg), cta || null); }
export function progress(p, cls = "") { return h("div", { class: "progress " + cls, role: "progressbar", "aria-valuenow": Math.round(p * 100), "aria-valuemin": 0, "aria-valuemax": 100 }, h("i", { style: { width: Math.max(0, Math.min(1, p)) * 100 + "%" } })); }
export function seg(options, current, onPick) {
  return h("div", { class: "seg", role: "tablist" }, options.map((o) => h("button", { type: "button", role: "tab", "aria-selected": String(o.v === current), class: o.v === current ? "on" : "", onclick: () => onPick(o.v) }, o.l)));
}
export function monthNav(date, onChange, onToday, todayLabel = "Hoje") {
  return h("div", { class: "row between wrap gap" },
    h("div", { class: "monthnav" },
      h("button", { class: "btn icon ghost", type: "button", "aria-label": "Mês anterior", onclick: () => onChange(new Date(date.getFullYear(), date.getMonth() - 1, 1)) }, icon("left")),
      h("strong", { class: "monthlabel" }, mesLabel(date)),
      h("button", { class: "btn icon ghost", type: "button", "aria-label": "Próximo mês", onclick: () => onChange(new Date(date.getFullYear(), date.getMonth() + 1, 1)) }, icon("right"))),
    onToday ? h("button", { class: "btn ghost sm", type: "button", onclick: onToday }, todayLabel) : null);
}
export const download = (name, text, mime) => {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = h("a", { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
export const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const rerender = () => window.dispatchEvent(new Event("lirio:rerender"));
