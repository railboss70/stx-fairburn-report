/* STX Fairburn Report — daily project report and callout report in one app.
   Built as a sibling of stx-daily-summary: same storage, photo, signature, weather and share plumbing. */
const DEFAULT_EMAIL = "reports@stxrailroad.com";
const KEY = "stx-fairburn-v1";
const DB_NAME = "stx-fairburn";
const PHOTO_STORE = "photos";

const SITE = {
  company: "STX Corporation",
  phone: "770-487-6100",
  addr1: "7205 McLarin RD",
  addr2: "Fairburn, GA 30213",
  place: "Fairburn, GA",
  lat: 33.5671,
  lon: -84.581,
  tz: "America/New_York",
};

const DELAYS = [
  { id: "d_weather", q: "Weather Delays?", short: "Weather delays", needIf: "yes" },
  { id: "d_other", q: "Other Delays?", short: "Other delays", needIf: "yes" },
];
const SAFETY = {
  brief: { id: "s_brief", short: "Job briefing", alert: "no", q: "Was Job Briefing conducted identifying work hazards, PPE requirements, and work area concerns? If any topics were challenged, what was resolution?" },
  injury: { id: "s_injury", short: "Injuries / near misses", alert: "yes", needIf: "yes", q: "Any injuries, accidents, or near misses? If yes, add description:" },
  locks: { id: "s_locks", short: "Locks / derails removed", alert: "no", needIf: "no", q: "All track protection locks / derails removed? If protection remained in place, was this communicated to owner?" },
  switches: { id: "s_switch", short: "Switches lined back", alert: "no", q: "All switches lined back to operating preference after using?" },
  parked: { id: "s_parked", short: "Equipment parked and chocked", alert: "no", q: "All equipment parked in designated area and chocked?" },
  secure: { id: "s_secure", short: "Jobsite secure", alert: "no", q: "Jobsite secure, clean, and orderly?" },
  csx: { id: "s_csxops", short: "CSX OPS called", alert: "no", q: "CSX OPS Called to confirm all operational?" },
};
const TYPES = {
  daily: {
    label: "Daily report",
    tag: "Daily",
    title: "DAILY PROJECT REPORT",
    footer: "Daily Project Report",
    project: "26001",
    projectName: "CSX Intermodal GA",
    crewStep: "Crew",
    crewTitle: "Crew consist and work hours",
    crewHint: "List start time and end time for each class on site.",
    crew: [
      { id: "c_super", kind: "crew", q: "Superintendent - Hours", short: "Superintendent" },
      { id: "c_foreman", kind: "crew", q: "Foreman / Inspector - Hours", short: "Foreman / Inspector" },
      { id: "c_oper", kind: "crew", q: "Operator - Hours", short: "Operator" },
      { id: "c_labor", kind: "crew", q: "Laborer - Hours", short: "Laborer" },
    ],
    safety: [SAFETY.brief, SAFETY.injury, SAFETY.locks, SAFETY.switches, SAFETY.parked, SAFETY.secure],
  },
  callout: {
    label: "Callout report",
    tag: "Callout",
    title: "FAIRBURN CALLOUT REPORT",
    footer: "Fairburn Callout Report",
    project: "26002",
    projectName: "CSX Fairburn Extra Work GA",
    crewStep: "Callout",
    crewTitle: "Summary checklist / classifications",
    crewHint: "When the call came in, when you got on site, and who worked it.",
    crew: [
      { id: "k_called", kind: "time", timeLabel: "Call received", q: "Called out? What time was call received?", short: "Called out" },
      { id: "k_visit", kind: "time", timeLabel: "Arrived onsite", q: "Site visit required? Time arrived onsite:", short: "Site visit" },
      { id: "k_pm", kind: "crew", q: "Project Manager - Name / Hours", short: "Project Manager" },
      { id: "c_foreman", kind: "crew", q: "Inspector - Name / Hours", short: "Inspector" },
      { id: "c_oper", kind: "crew", q: "Operator - Name / Hours", short: "Operator" },
      { id: "c_labor", kind: "crew", q: "Laborer - Name / Hours", short: "Laborer" },
    ],
    safety: [SAFETY.brief, SAFETY.injury, SAFETY.locks, SAFETY.parked, SAFETY.secure, SAFETY.csx],
  },
};
const STEP_COUNT = 7;
const STEP = { JOB: 0, WORK: 1, MATERIALS: 2, CREW: 3, SAFETY: 4, PHOTOS: 5, SEND: 6 };
const MATERIAL_UOM = ["EA", "LF", "TF", "TN", "CY", "GAL", "BAG", "BDL", "LB", "SF", "SY"];
/* Equipment names line up with the equipment columns of the T&M billing worksheet (col = its column letter),
   most used at Fairburn first. Two names may share a column when the worksheet bills them at one rate. */
const EQUIPMENT = [
  { name: "Crew Truck", col: "E" },
  { name: "Hi-Rail Truck", col: "F" },
  { name: "Trailer / UTV with Tools", col: "M" },
  { name: "Power Pack and Tools", col: "N" },
  { name: "Skid Loader", col: "P" },
  { name: "Backhoe", col: "Q" },
  { name: "Supervisor Truck", col: "D" },
  { name: "Hi-Rail Rotary Dump", col: "G" },
  { name: "Grapple Truck", col: "H" },
  { name: "Semi", col: "I" },
  { name: "Gooseneck Trailer", col: "J" },
  { name: "Lowboy", col: "K" },
  { name: "Lowboy Heavy Haul", col: "L" },
  { name: "Compressor / Work Lights", col: "O" },
  { name: "Forklift", col: "Q" },
  { name: "Loader", col: "R" },
  { name: "20k Excavator", col: "R" },
  { name: "Small Tamper", col: "R" },
  { name: "50k Hi-Rail Excavator", col: "S" },
  { name: "Regulator", col: "S" },
  { name: "HRX Tamping Head", col: "T" },
  { name: "Production Tamper", col: "U" },
];
/* other names people type for the same machines */
const EQUIP_ALIASES = {
  "pickup": "E", "truck": "E", "hi-rail": "F", "hi rail truck": "F", "tools": "M", "trailer": "M", "utv": "M",
  "power pack": "N", "hydraulic unit with tools": "N", "hydraulic unit": "N", "skid steer": "P", "excavator": "R", "tamper": "R",
};
const EQUIP_PRESETS = EQUIPMENT.map((e) => e.name);
const SLOT_TIMES = [
  { hour: 7, minute: 0, t: "7 AM" },
  { hour: 11, minute: 0, t: "11 AM" },
  { hour: 15, minute: 0, t: "3 PM" },
];
const SKY = [
  ["Clear", "sun"], ["Partly Cloudy", "partly-day"], ["Cloudy", "cloud"], ["Rain", "rain"],
  ["Storms", "storm"], ["Fog", "fog"], ["Snow/Ice", "snow"],
];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const z2 = (n) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return d.getFullYear() + "-" + z2(d.getMonth() + 1) + "-" + z2(d.getDate());
};
const formatLong = (iso) => {
  if (!iso) return "";
  const parts = String(iso).split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => !n && n !== 0)) return "";
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
};
const formatTaken = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
};
const usDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? m[2] + "/" + m[3] + "/" + m[1] : "";
};
const time12 = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ""));
  if (!m) return "";
  let h = Number(m[1]);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + ":" + m[2] + " " + ap;
};
const hoursBetween = (a, b) => {
  const x = /^(\d{1,2}):(\d{2})$/.exec(String(a || ""));
  const y = /^(\d{1,2}):(\d{2})$/.exec(String(b || ""));
  if (!x || !y) return "";
  let mins = (Number(y[1]) * 60 + Number(y[2])) - (Number(x[1]) * 60 + Number(x[2]));
  if (mins <= 0) mins += 1440;
  return String(Math.round(mins / 15) / 4);
};
const pad3 = (v) => {
  const n = String(v == null ? "" : v).replace(/\D/g, "");
  return n ? n.padStart(3, "0") : "";
};

const emptyRow = {
  materials: () => ({ id: uid(), description: "", qty: "", uom: "" }),
  equipment: () => ({ id: uid(), name: "", qty: "", hours: "" }),
};

function freshSettings() {
  return {
    recentEquip: [],
    defaultName: "",
    fileWho: "",
    defaultEmail: DEFAULT_EMAIL,
    lastCallout: 0,
    lastCalloutMonth: "",
    billingTemplate: null,
    billingMonths: {},
    photosPerPage: 1,
    projects: {
      daily: { num: TYPES.daily.project, name: TYPES.daily.projectName },
      callout: { num: TYPES.callout.project, name: TYPES.callout.projectName },
    },
  };
}

/* The -007 on a callout is the work order the callout bills to. Callouts in the same month normally share one,
   so a new callout reuses the last number used this month and otherwise starts from the month number. */
function defaultWorkOrder(s, date) {
  const month = String(date || "").slice(0, 7);
  if (s && Number(s.lastCallout) && s.lastCalloutMonth === month) return pad3(s.lastCallout);
  return pad3(Number(String(date || "").slice(5, 7)) || "");
}

function blankManual() {
  return SLOT_TIMES.map(() => ({ cond: "", tempF: "", precip: "", wind: "", hum: "" }));
}

function blankReport(settings, type) {
  const now = new Date().toISOString();
  const s = settings || freshSettings();
  const kind = type === "callout" ? "callout" : "daily";
  const proj = (s.projects || {})[kind] || {};
  return {
    id: uid(),
    type: kind,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    date: todayISO(),
    projectNumber: proj.num || TYPES[kind].project,
    projectName: proj.name || TYPES[kind].projectName,
    calloutNo: kind === "callout" ? defaultWorkOrder(s, todayISO()) : "",
    printName: s.defaultName || "",
    fileWho: s.fileWho || "",
    summary: "",
    wx: null,
    wxManual: blankManual(),
    q: {},
    materials: [emptyRow.materials()],
    equipment: [emptyRow.equipment()],
    photos: [],
    signatureDataUrl: "",
    recipientEmail: s.defaultEmail || DEFAULT_EMAIL,
    pdfTitle: "",
    pdfTitleCustom: false,
  };
}

let store = { reports: {}, order: [], settings: freshSettings() };
let screen = "home";
let activeId = null;
let step = 0;
let askSent = false;
let pendingDelete = null;
let pendingTimer = null;
let sigHandlers = null;
let preparedFiles = null;
let prepareToken = 0;
let prepareTimer = null;
let wxLoading = false;
let wxError = "";
let wxManualOpen = false;
let wxBusy = false;
let wxToken = 0;
let wxQueued = false;
let wxFailAt = 0;
let wxFailKey = "";
let dbPromise = null;
const thumbUrls = new Map();

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error || new Error("idb"));
    };
  });
  return dbPromise;
}

function idbDo(mode, run) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, mode);
    const req = run(tx.objectStore(PHOTO_STORE));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error || new Error("idb"));
    tx.onabort = () => reject(tx.error || new Error("idb"));
  }));
}

function putPhoto(id, blob) {
  return idbDo("readwrite", (photoStore) => photoStore.put(blob, id));
}
function getPhoto(id) {
  return idbDo("readonly", (photoStore) => photoStore.get(id));
}
function deletePhoto(id) {
  return idbDo("readwrite", (photoStore) => photoStore.delete(id)).catch(() => {});
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

function fillReport(r) {
  if (r.type !== "callout") r.type = "daily";
  if (!Array.isArray(r.photos)) r.photos = [];
  if (!r.q || typeof r.q !== "object") r.q = {};
  if (!Array.isArray(r.materials) || !r.materials.length) r.materials = [emptyRow.materials()];
  if (!Array.isArray(r.equipment) || !r.equipment.length) r.equipment = [emptyRow.equipment()];
  if (!Array.isArray(r.wxManual) || r.wxManual.length !== SLOT_TIMES.length) r.wxManual = blankManual();
  if (!r.wx || typeof r.wx !== "object") r.wx = null;
  ["projectNumber", "projectName", "calloutNo", "printName", "fileWho", "summary", "pdfTitle", "signatureDataUrl"].forEach((k) => {
    if (r[k] == null) r[k] = "";
  });
  if (r.pdfTitleCustom == null) r.pdfTitleCustom = false;
  if (!r.recipientEmail) r.recipientEmail = DEFAULT_EMAIL;
}

async function load() {
  const rawText = localStorage.getItem(KEY);
  if (rawText) {
    let raw = null;
    try {
      raw = JSON.parse(rawText);
    } catch (e) {
      try { localStorage.setItem("stx-fairburn-backup-" + Date.now(), rawText); } catch (err) {}
      store = { reports: {}, order: [], settings: freshSettings() };
      return;
    }
    if (raw && raw.reports) {
      store = {
        reports: raw.reports,
        order: Array.isArray(raw.order) ? raw.order : Object.keys(raw.reports),
        settings: { ...freshSettings(), ...(raw.settings || {}) },
      };
    }
  }
  const fresh = freshSettings();
  if (!store.settings.projects || typeof store.settings.projects !== "object") store.settings.projects = fresh.projects;
  ["daily", "callout"].forEach((k) => {
    if (!store.settings.projects[k] || !store.settings.projects[k].num) store.settings.projects[k] = fresh.projects[k];
  });
  if (Number(store.settings.photosPerPage) !== 2) store.settings.photosPerPage = 1;
  if (!Array.isArray(store.settings.recentEquip)) store.settings.recentEquip = [];
  const reports = Object.values(store.reports);
  reports.forEach(fillReport);
  /* Sent reports keep their answers; their photos leave the phone after 14 days. */
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  for (let i = 0; i < reports.length; i += 1) {
    const r = reports[i];
    if (r.status !== "sent" || !r.sentAt) continue;
    const t = new Date(r.sentAt).getTime();
    if (!Number.isFinite(t) || t >= cutoff) continue;
    if (!r.photos.length) continue;
    for (let p = 0; p < r.photos.length; p += 1) await deletePhoto(r.photos[p].id);
    r.photos = [];
    r.photosPurged = true;
  }
  save();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch (e) {
    toast("Phone storage full. Delete old sent reports.");
  }
}

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.style.display = "none"; }, 4000);
}

function list() {
  return store.order.map((id) => store.reports[id]).filter(Boolean);
}
function active() {
  return store.reports[activeId];
}
function patch(p) {
  const r = active();
  if (!r) return;
  Object.assign(r, p, { updatedAt: new Date().toISOString() });
  save();
}
function typeOf(r) {
  return TYPES[r && r.type === "callout" ? "callout" : "daily"];
}
function stepNames(r) {
  return ["Job", "Work", "Materials", typeOf(r).crewStep, "Safety", "Photos", "Send"];
}
function answer(r, id) {
  if (!r.q[id]) r.q[id] = { a: "", d: "" };
  return r.q[id];
}

function markSvg() {
  return '<div class="logo-chip"><img src="./stx-logo.png" alt="STX Corporation" /></div>';
}
function field(label, inner) {
  return "<label>" + label + "</label>" + inner;
}
function input(name, value, extra) {
  return '<input id="k-' + name + '" data-k="' + name + '" value="' + esc(value || "") + '" ' + (extra || "") + " />";
}
function ta(name, value, ph) {
  return '<textarea id="k-' + name + '" data-k="' + name + '" placeholder="' + esc(ph || "") + '">' + esc(value || "") + "</textarea>";
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (ch) => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    return "&quot;";
  });
}
function splitRow(left, right) {
  return '<div class="row"><div>' + left + "</div><div>" + right + "</div></div>";
}

function teardownSig() {
  if (!sigHandlers) return;
  window.removeEventListener("pointerup", sigHandlers.end);
  window.removeEventListener("pointercancel", sigHandlers.end);
  if (sigHandlers.canvas) {
    sigHandlers.canvas.removeEventListener("pointerdown", sigHandlers.start);
    sigHandlers.canvas.removeEventListener("pointermove", sigHandlers.move);
  }
  sigHandlers = null;
}

function render() {
  let focusId = "";
  let caret = null;
  const prev = document.activeElement;
  if (prev && prev.id && prev.matches && prev.matches("input, textarea, select")) {
    focusId = prev.id;
    try { if (typeof prev.selectionStart === "number") caret = prev.selectionStart; } catch (e) {}
  }
  teardownSig();
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = screen === "home" ? homeHtml() : wizardHtml();
  bind();
  if (focusId) {
    const next = document.getElementById(focusId);
    if (next && next.focus) {
      try {
        next.focus();
        if (caret != null && next.setSelectionRange) next.setSelectionRange(caret, caret);
      } catch (e) {}
    }
  }
  hydratePhotos();
  if (screen === "wizard" && (step === 1 || step === STEP.SEND)) maybeAutoWeather();
  if (screen === "wizard" && step === STEP.SEND) prepareSendFiles();
}

/* ---------- file name ----------
   Office filing format, taken from reports already on file:
     daily    26001- 260226 Chris        project, dash, space, YYMMDD, space, name
     callout  26002- 260709-007 Chris    same, with -callout number after the date */
function autoTitle(r) {
  const proj = String(r.projectNumber || "").trim() || "00000";
  const ymd = String(r.date || "").replace(/-/g, "").slice(2) || "YYMMDD";
  const who = String(r.fileWho || "").trim() || String(r.printName || "").trim().split(/\s+/)[0] || "Name";
  const call = r.type === "callout" ? "-" + (pad3(r.calloutNo) || "000") : "";
  return proj + "- " + ymd + call + " " + who;
}
function fileTitle(r) {
  const raw = String(r.pdfTitle || autoTitle(r)).trim().replace(/\.pdf$/i, "");
  return raw.replace(/[\\/:*?"<>|]/g, "-") || "report";
}
function fileName(r) {
  return fileTitle(r) + ".pdf";
}
function retitle() {
  const r = active();
  if (r && !r.pdfTitleCustom) patch({ pdfTitle: autoTitle(r) });
}

function homeHtml() {
  const items = list();
  const today = todayISO();
  const drafts = items.filter((r) => r.status === "draft");
  const sent = items.filter((r) => r.status === "sent");
  const todayDaily = drafts.some((r) => r.date === today && r.type === "daily");
  const lastDaily = items.find((r) => r.type === "daily");
  const s = store.settings;
  const group = (title, rows, empty) =>
    '<div class="card"><h2>' + title + "</h2>" +
    (rows.length ? rows.map((r) =>
      '<div class="list-row" data-open="' + r.id + '"><div><b>' + esc(r.projectNumber || "No project #") + "</b>" +
      '<span class="tag' + (r.type === "callout" ? " callout" : "") + '">' + typeOf(r).tag + (r.type === "callout" && pad3(r.calloutNo) ? " · WO " + pad3(r.calloutNo) : "") + "</span>" +
      '<div class="muted">' + esc(formatLong(r.date)) + (r.printName ? " · " + esc(r.printName) : "") + "</div></div>" +
      '<button class="btn btn-danger" style="width:auto;margin:0;padding:8px 10px;font-size:13px" data-del="' + r.id + '">' +
      (pendingDelete === r.id ? "Tap again to delete" : "Delete") + "</button></div>"
    ).join("") : '<p class="empty">' + empty + "</p>") +
    "</div>";
  return '<header class="hero">' + markSvg() +
    "<small>CSX Fairburn Intermodal</small><h1>Fairburn Daily Report</h1>" +
    '<p class="date">' + esc(formatLong(today)) + "</p></header>" +
    '<main class="content">' +
    (todayDaily ? '<button class="btn btn-navy" data-act="start">Continue today\'s daily report</button>' : "") +
    '<button class="btn ' + (todayDaily ? "btn-outline" : "btn-navy") + '" data-act="new-daily">Start a daily report</button>' +
    '<button class="btn btn-gold" data-act="new-callout">Start a callout report</button>' +
    (lastDaily ? '<button class="btn btn-outline" data-act="fromlast">New daily from last crew</button>' : "") +
    '<div style="height:14px"></div>' +
    group("Drafts", drafts, "No drafts. Start a report for the shift.") +
    group("Sent", sent, "Sent reports land here after you share them.") +
    '<div class="card"><h2>Your defaults</h2>' +
    field("Your name", '<input id="set-defaultName" data-set="defaultName" value="' + esc(s.defaultName) + '" placeholder="Print name on reports" autocomplete="name" autocapitalize="words" />') +
    field("Name on file names", '<input id="set-fileWho" data-set="fileWho" value="' + esc(s.fileWho) + '" placeholder="Chris" autocapitalize="words" />') +
    '<p class="hint">The office files reports as project- YYMMDD name. Leave blank to use your first name.</p>' +
    field("Send reports to", '<input id="set-defaultEmail" type="email" inputmode="email" data-set="defaultEmail" value="' + esc(s.defaultEmail) + '" placeholder="' + DEFAULT_EMAIL + '" />') +
    field("Photos in the PDF", '<select id="set-photosPerPage" data-set="photosPerPage"><option value="1"' + (Number(s.photosPerPage) !== 2 ? " selected" : "") + '>One per page (best for paperwork)</option><option value="2"' + (Number(s.photosPerPage) === 2 ? " selected" : "") + ">Two per page</option></select>") +
    "</div>" + billingHomeHtml() + "</main>";
}

function wizardHtml() {
  const r = active();
  if (!r) return homeHtml();
  const names = stepNames(r);
  return '<header class="hero" style="padding-bottom:14px"><div class="brand">' + markSvg() +
    "<div><small>" + esc(typeOf(r).label) + "</small></div></div>" +
    '<div class="muted" style="color:rgba(255,252,245,.75);margin-top:8px">' + names[step] + " · " + (step + 1) + " of " + STEP_COUNT + "</div></header>" +
    '<main class="content">' +
    '<div class="steps">' + names.map((label, i) =>
      '<button type="button" data-step="' + i + '" aria-label="' + esc(label) + '"><i class="' + (i <= step ? "on" : "") + '"></i></button>'
    ).join("") + "</div>" +
    stepHtml(r) +
    '<div class="nav"><button class="btn btn-ghost" data-act="' + (step === 0 ? "home" : "back") + '">' + (step === 0 ? "Home" : "Back") + "</button>" +
    (step < STEP_COUNT - 1
      ? '<button class="btn btn-navy" data-act="next">Next</button>'
      : '<button class="btn btn-gold" data-act="send" disabled>Preparing…</button>') +
    "</div></main>";
}

/* ---------- weather: observed National Weather Service readings for Fairburn ---------- */
function weatherDateOk(dateStr) {
  if (!dateStr) return false;
  const a = Date.parse(dateStr + "T12:00:00");
  const b = Date.parse(todayISO() + "T12:00:00");
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const diff = Math.round((b - a) / 86400000);
  return diff >= 0 && diff <= 7;
}

function wxReady(r) {
  if (!r || !r.wx || r.wx.date !== r.date) return false;
  return Array.isArray(r.wx.slots) && r.wx.slots.some((s) => s && (s.status === "ok" || s.status === "later" || s.status === "miss"));
}

function weatherFresh(r) {
  if (!wxReady(r) || !r.wx.fetchedAt) return false;
  const age = Date.now() - new Date(r.wx.fetchedAt).getTime();
  if (!Number.isFinite(age)) return false;
  const incomplete = r.wx.slots.some((s) => !s || s.status !== "ok");
  if (!incomplete) return true;
  if (step === STEP.SEND) return age < 60 * 1000;
  return age < 3 * 60 * 1000;
}

function manualSlot(r, i) {
  const m = (r.wxManual || [])[i] || {};
  const has = ["cond", "tempF", "precip", "wind", "hum"].some((k) => String(m[k] || "").trim());
  if (!has) return null;
  const sky = SKY.find((s) => s[0] === m.cond);
  const num = (v) => String(v || "").trim();
  return {
    t: SLOT_TIMES[i].t,
    status: "ok",
    manual: true,
    icon: sky ? sky[1] : "",
    cond: m.cond || "",
    tempF: num(m.tempF).replace(/[^\d.\-]/g, ""),
    precip: num(m.precip) ? num(m.precip) + (/[a-z"]/i.test(num(m.precip)) ? "" : " in") : "—",
    wind: num(m.wind) ? num(m.wind) + (/[a-z]/i.test(num(m.wind)) ? "" : " mph") : "—",
    hum: num(m.hum) ? num(m.hum).replace(/%/g, "") + "%" : "—",
  };
}

/* What goes on the report: a typed-in slot wins over the station reading for that time. */
function slotsFor(r) {
  const ready = wxReady(r);
  return SLOT_TIMES.map((t, i) => manualSlot(r, i) || (ready && r.wx.slots[i]) || blankSlot(t.t, "none", ""));
}
function hasWeather(r) {
  return slotsFor(r).some((s) => s.status === "ok");
}

function fetchJson(url) {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, 10000);
  return fetch(url, {
    signal: ctrl ? ctrl.signal : undefined,
    cache: "no-store",
    headers: { Accept: "application/geo+json" },
  }).then((res) => {
    if (!res.ok) throw new Error("http");
    return res.json();
  }).finally(() => clearTimeout(timer));
}

function zoneParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(date);
  const g = (type) => Number(parts.find((p) => p.type === type).value);
  let hour = g("hour");
  if (hour === 24) hour = 0;
  return { year: g("year"), month: g("month"), day: g("day"), hour: hour, minute: g("minute") };
}

function zonedTime(dateStr, hour, minute, timeZone) {
  const bits = String(dateStr).split("-").map(Number);
  const y = bits[0];
  const mo = bits[1];
  const d = bits[2];
  let utc = Date.UTC(y, mo - 1, d, hour, minute);
  for (let i = 0; i < 4; i += 1) {
    const p = zoneParts(new Date(utc), timeZone);
    const got = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    const want = Date.UTC(y, mo - 1, d, hour, minute);
    if (got === want) break;
    utc += want - got;
  }
  return utc;
}

function todayInZone(timeZone) {
  const p = zoneParts(new Date(), timeZone);
  return p.year + "-" + z2(p.month) + "-" + z2(p.day);
}

function slotIsFuture(dateStr, hour, minute, timeZone) {
  if (dateStr !== todayInZone(timeZone)) return false;
  return zonedTime(dateStr, hour, minute, timeZone) > Date.now();
}

function numVal(obj) {
  if (obj == null) return null;
  const v = typeof obj === "number" ? obj : obj.value;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function compassDir(deg) {
  if (deg == null || !Number.isFinite(Number(deg))) return "";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = Math.round((((Number(deg) % 360) + 360) % 360) / 45) % 8;
  return dirs[i];
}

function iconKind(url) {
  const m = String(url || "").match(/\/(day|night)\/([^?]+)/);
  if (!m) return "cloud";
  const day = m[1] !== "night";
  const parts = m[2].split("/").map((part) => part.split(",")[0].replace(/^wind_/, ""));
  const severe = (code) => {
    if (code === "tsra" || code === "tsra_sct" || code === "tsra_hi") return "storm";
    if (code === "rain" || code === "rain_showers" || code === "rain_showers_hi") return "rain";
    if (code === "snow" || code === "sleet" || code === "fzra" || code === "rain_snow") return "snow";
    if (code === "fog" || code === "haze" || code === "smoke" || code === "dust") return "fog";
    return "";
  };
  for (let i = 0; i < parts.length; i += 1) {
    const hit = severe(parts[i]);
    if (hit) return hit;
  }
  const code = parts[0] || "";
  if (code === "skc" || code === "few") return day ? "sun" : "moon";
  if (code === "sct" || code === "bkn") return day ? "partly-day" : "partly-night";
  return "cloud";
}

function closestObs(features, targetMs) {
  let best = null;
  let bestDt = Infinity;
  (features || []).forEach((f) => {
    const ts = Date.parse(f && f.properties && f.properties.timestamp);
    if (!Number.isFinite(ts)) return;
    const dt = Math.abs(ts - targetMs);
    if (dt < bestDt) { bestDt = dt; best = f; }
  });
  if (!best || bestDt > 45 * 60 * 1000) return null;
  return best;
}

function blankSlot(t, status, cond) {
  return { t: t, status: status, icon: "", cond: cond, tempF: "", precip: "", wind: "", hum: "", obsTime: "" };
}

function buildSlot(target, dateStr, tz, features) {
  if (slotIsFuture(dateStr, target.hour, target.minute, tz)) return blankSlot(target.t, "later", "Later today.");
  const obs = closestObs(features, zonedTime(dateStr, target.hour, target.minute, tz));
  if (!obs) return blankSlot(target.t, "miss", "No reading.");
  const p = obs.properties || {};
  const tempC = numVal(p.temperature);
  const windK = numVal(p.windSpeed);
  const windDir = numVal(p.windDirection);
  const hum = numVal(p.relativeHumidity);
  const precipMm = numVal(p.precipitationLastHour);
  const mph = windK == null ? null : Math.round(windK * 0.621371);
  let wind = "—";
  if (mph != null) wind = mph <= 0 ? "0 mph" : ((compassDir(windDir) ? compassDir(windDir) + " " : "") + mph + " mph");
  return {
    t: target.t,
    status: "ok",
    icon: iconKind(p.icon),
    cond: p.textDescription || "",
    tempF: tempC == null ? "" : String(Math.round(tempC * 9 / 5 + 32)),
    precip: precipMm == null ? "0.00 in" : (precipMm / 25.4).toFixed(2) + " in",
    wind: wind,
    hum: hum == null ? "—" : String(Math.round(hum)) + "%",
    obsTime: p.timestamp || "",
  };
}

function maybeAutoWeather() {
  if (wxBusy || wxQueued) return;
  const r = active();
  if (!r || !weatherDateOk(r.date)) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  if (weatherFresh(r)) return;
  const wait = step === STEP.SEND ? 20000 : 120000;
  if (wxFailKey === r.id + r.date && wxFailAt && Date.now() - wxFailAt < wait) return;
  wxQueued = true;
  setTimeout(() => {
    wxQueued = false;
    if (screen !== "wizard" || (step !== 1 && step !== STEP.SEND)) return;
    fetchWeather(false);
  }, 40);
}

async function fetchWeather(force) {
  const r = active();
  if (!r) return;
  if (wxBusy && !force) return;
  if (!weatherDateOk(r.date)) return;
  if (!force && weatherFresh(r)) return;
  const key = r.id + r.date;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    wxError = "Weather unavailable. No signal.";
    wxManualOpen = true;
    wxLoading = false;
    wxFailKey = key;
    wxFailAt = Date.now();
    render();
    return;
  }
  const token = ++wxToken;
  const reportId = r.id;
  const date = r.date;
  wxBusy = true;
  wxLoading = true;
  wxError = "";
  render();
  try {
    const points = await fetchJson("https://api.weather.gov/points/" + SITE.lat + "," + SITE.lon);
    if (token !== wxToken) return;
    const props = (points && points.properties) || {};
    const tz = props.timeZone || SITE.tz;
    if (!props.observationStations) throw new Error("stations");
    const stations = await fetchJson(props.observationStations);
    if (token !== wxToken) return;
    const first = stations && stations.features && stations.features[0] && stations.features[0].properties;
    if (!first || !first.stationIdentifier) throw new Error("station");
    const start = new Date(zonedTime(date, 6, 0, tz)).toISOString();
    const end = new Date(zonedTime(date, 16, 0, tz)).toISOString();
    const obsUrl = "https://api.weather.gov/stations/" + encodeURIComponent(first.stationIdentifier) + "/observations?start=" + encodeURIComponent(start) + "&end=" + encodeURIComponent(end);
    const obs = await fetchJson(obsUrl);
    if (token !== wxToken) return;
    const slots = SLOT_TIMES.map((target) => buildSlot(target, date, tz, (obs && obs.features) || []));
    const live = active();
    if (!live || live.id !== reportId || live.date !== date) return;
    live.wx = {
      date: date,
      tz: tz,
      station: first.stationIdentifier,
      stationName: first.name || "",
      fetchedAt: new Date().toISOString(),
      slots: slots,
    };
    save();
    wxError = "";
    wxFailAt = 0;
    wxFailKey = "";
  } catch (err) {
    if (token !== wxToken) return;
    wxError = "Weather unavailable. No signal.";
    wxManualOpen = true;
    wxFailKey = key;
    wxFailAt = Date.now();
  } finally {
    if (token === wxToken) {
      wxBusy = false;
      wxLoading = false;
      render();
    }
  }
}

function wxSvg(kind) {
  const ray = (cx, cy, inner, outer) => {
    let s = "";
    for (let a = 0; a < 360; a += 45) {
      const r = a * Math.PI / 180;
      s += '<line x1="' + (cx + inner * Math.cos(r)).toFixed(1) + '" y1="' + (cy + inner * Math.sin(r)).toFixed(1) + '" x2="' + (cx + outer * Math.cos(r)).toFixed(1) + '" y2="' + (cy + outer * Math.sin(r)).toFixed(1) + '" stroke="#ffd66e" stroke-width="1.8" stroke-linecap="round"/>';
    }
    return s;
  };
  const sun = (cx, cy, rad, inner, outer) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad + '" fill="#ffd66e"/>' + ray(cx, cy, inner, outer);
  const moon = '<circle cx="18" cy="20" r="9" fill="#a7bfdc"/><circle cx="23" cy="16" r="8" fill="#fff"/>';
  const cloudShape = (fill, grow) => {
    const g = grow || 0;
    return '<g fill="' + fill + '"><circle cx="14" cy="22" r="' + (6 + g) + '"/><circle cx="21" cy="17" r="' + (8 + g) + '"/><circle cx="28" cy="23" r="' + (5 + g) + '"/><rect x="' + (9 - g) + '" y="22" width="' + (22 + g * 2) + '" height="' + (6 + g) + '" rx="3"/></g>';
  };
  const cloud = (fill, stroke) => (stroke ? cloudShape(stroke, 1.3) : "") + cloudShape(fill, 0);
  let body = cloud("#9aa5b1");
  if (kind === "sun") body = sun(20, 20, 7, 10, 14);
  else if (kind === "moon") body = moon;
  else if (kind === "partly-day") body = sun(12, 12, 5, 7, 10) + cloud("#fff", "#9aa5b1");
  else if (kind === "partly-night") body = '<circle cx="12" cy="14" r="7" fill="#a7bfdc"/><circle cx="16" cy="11" r="6" fill="#fff"/>' + cloud("#fff", "#9aa5b1");
  else if (kind === "rain") body = cloud("#9aa5b1") + '<g stroke="#5b8fd9" stroke-width="1.6" stroke-linecap="round"><line x1="14" y1="30" x2="12" y2="36"/><line x1="20" y1="30" x2="18" y2="36"/><line x1="26" y1="30" x2="24" y2="36"/></g>';
  else if (kind === "storm") body = cloud("#9aa5b1") + '<polygon points="21,20 16,28 20,28 17,36 26,26 21,26" fill="#e0a800"/>' + '<g stroke="#5b8fd9" stroke-width="1.6" stroke-linecap="round"><line x1="14" y1="32" x2="12" y2="37"/><line x1="27" y1="32" x2="25" y2="37"/></g>';
  else if (kind === "snow") body = cloud("#9aa5b1") + '<g fill="#5b8fd9"><circle cx="14" cy="33" r="1.4"/><circle cx="20" cy="35" r="1.4"/><circle cx="26" cy="33" r="1.4"/></g>';
  else if (kind === "fog") body = '<g fill="#9aa5b1"><rect x="8" y="12" width="24" height="3" rx="1.5"/><rect x="8" y="19" width="24" height="3" rx="1.5"/><rect x="8" y="26" width="24" height="3" rx="1.5"/></g>';
  return '<svg class="wx-ico" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">' + body + "</svg>";
}

function slotHtml(slot) {
  const label = esc((slot && slot.t) || "");
  if (!slot || slot.status === "later") return '<div class="wx-col"><div class="wx-time">' + label + '</div><div class="wx-cond">Later today.</div></div>';
  if (slot.status !== "ok") return '<div class="wx-col"><div class="wx-time">' + label + '</div><div class="wx-cond">No reading.</div></div>';
  const temp = slot.tempF === "" || slot.tempF == null ? "—" : slot.tempF + "°";
  return '<div class="wx-col"><div class="wx-time">' + label + (slot.manual ? " · typed" : "") + "</div>" + (slot.icon ? wxSvg(slot.icon) : "") +
    '<div class="wx-temp">' + esc(temp) + "</div>" +
    '<div class="wx-cond">' + esc(slot.cond || "") + "</div>" +
    '<div class="wx-meta">Precip ' + esc(slot.precip || "—") + "<br>Wind " + esc(slot.wind || "—") + "<br>Humidity " + esc(slot.hum || "—") + "</div></div>";
}

function weatherManual(r) {
  return SLOT_TIMES.map((t, i) => {
    const m = r.wxManual[i] || {};
    const f = (key, ph) => '<input id="wxm-' + i + "-" + key + '" data-wxm="' + i + '" data-f="' + key + '" inputmode="decimal" value="' + esc(m[key] || "") + '" placeholder="' + ph + '" />';
    return '<div class="wxm"><b>' + t.t + "</b>" +
      field("Sky", '<select id="wxm-' + i + '-cond" data-wxm="' + i + '" data-f="cond"><option value=""></option>' +
        SKY.map((s) => '<option value="' + s[0] + '"' + (m.cond === s[0] ? " selected" : "") + ">" + s[0] + "</option>").join("") + "</select>") +
      splitRow(field("Temp °F", f("tempF", "73")), field("Rain in.", f("precip", "0.0"))) +
      splitRow(field("Wind mph", f("wind", "2")), field("Humidity %", f("hum", "93"))) +
      "</div>";
  }).join("");
}

/* Redraws only the three weather tiles, so typing in the boxes below never loses the keyboard. */
function refreshWxGrid() {
  const r = active();
  const host = document.getElementById("wxgrid");
  if (!r || !host) return;
  const slots = slotsFor(r);
  host.innerHTML = slots.some((s) => s.status !== "none") ? '<div class="wx-grid">' + slots.map(slotHtml).join("") + "</div>" : "";
}

function weatherCard(r) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const slots = slotsFor(r);
  const shown = slots.some((s) => s.status !== "none");
  const typed = slots.some((s) => s.manual);
  let body = "";
  if (!weatherDateOk(r.date)) {
    body = '<p class="hint">Observed weather is only available for the last 7 days. Enter it below.</p>';
    body += '<div id="wxgrid">' + (typed ? '<div class="wx-grid">' + slots.map(slotHtml).join("") + "</div>" : "") + "</div>";
    body += weatherManual(r);
  } else {
    body = '<button type="button" class="btn btn-outline" data-act="wxrefresh"' + (wxLoading ? " disabled" : "") + ">" +
      (wxLoading ? '<i class="spin"></i> Loading weather…' : "Refresh weather") + "</button>";
    if (wxError) body += '<p class="hint">' + esc(wxError) + " Enter it below.</p>";
    else if (offline && !shown) body += '<p class="hint">Weather unavailable. No signal. Enter it below.</p>';
    body += '<div id="wxgrid">' + (shown ? '<div class="wx-grid">' + slots.map(slotHtml).join("") + "</div>" : "") + "</div>";
    if (shown) {
      if (wxReady(r) && r.wx.station) body += '<p class="wx-src">Source: National Weather Service · ' + esc(r.wx.station) + " " + esc(r.wx.stationName || "") + "</p>";
    }
    if (wxError || wxManualOpen || typed || (offline && !shown)) body += weatherManual(r);
    else body += '<button type="button" class="btn btn-ghost" data-act="wxmanual">Enter weather manually</button>';
  }
  return '<div class="card"><h2>Weather · ' + SITE.place + "</h2>" +
    '<p class="hint">Readings for 7 AM, 11 AM and 3 PM fill in on their own. Anything you type replaces the reading for that time.</p>' + body + "</div>";
}

/* ---------- questions ---------- */
function ynaRow(def, val) {
  const cls = (v) => (val === v ? (def.alert === v ? "on-alert" : "on") : "");
  return '<div class="yn three">' +
    '<button type="button" data-q="' + def.id + '" data-v="yes" class="' + cls("yes") + '">Yes</button>' +
    '<button type="button" data-q="' + def.id + '" data-v="no" class="' + cls("no") + '">No</button>' +
    '<button type="button" data-q="' + def.id + '" data-v="na" class="' + cls("na") + '">N/A</button></div>';
}
function qInput(id, f, value, extra) {
  return '<input id="q-' + id + "-" + f + '" data-qf="' + id + '" data-f="' + f + '" value="' + esc(value || "") + '" ' + (extra || "") + " />";
}
function qText(id, value, ph) {
  return '<textarea id="q-' + id + '-d" data-qf="' + id + '" data-f="d" placeholder="' + esc(ph || "") + '">' + esc(value || "") + "</textarea>";
}
function questionHtml(r, def) {
  const a = r.q[def.id] || {};
  let h = '<div class="item"><label>' + esc(def.q) + "</label>" + ynaRow(def, a.a || "");
  if (def.kind === "crew") {
    h += field("Name", qInput(def.id, "name", a.name, 'placeholder="Who" autocapitalize="words"')) +
      splitRow(field("Start", qInput(def.id, "start", a.start, 'type="time"')), field("End", qInput(def.id, "end", a.end, 'type="time"'))) +
      splitRow(field("Hours", qInput(def.id, "hrs", a.hrs, 'inputmode="decimal" placeholder="10"')), field("Notes", qInput(def.id, "d", a.d, 'placeholder="Optional"'))) +
      (r.type === "callout"
        ? "<label>Bill these hours as</label>" +
          '<div class="kind"><button type="button" data-rate="' + def.id + '" data-v="ot" class="' + (a.rate === "st" ? "" : "on") + '">Overtime</button>' +
          '<button type="button" data-rate="' + def.id + '" data-v="st" class="' + (a.rate === "st" ? "on" : "") + '">Straight time</button></div>'
        : "");
  } else if (def.kind === "time") {
    h += field(def.timeLabel, qInput(def.id, "time", a.time, 'type="time"')) +
      field("Description", qText(def.id, a.d, ""));
  } else {
    h += field("Description", qText(def.id, a.d, def.needIf ? "Required if " + (def.needIf === "yes" ? "Yes" : "No") : ""));
  }
  return h + "</div>";
}

function stepHtml(r) {
  const T = typeOf(r);
  if (step === 0) {
    return '<div class="card"><h2>Job information</h2>' +
      "<label>Report type</label>" +
      '<div class="kind"><button type="button" data-type="daily" class="' + (r.type === "daily" ? "on" : "") + '">Daily report</button>' +
      '<button type="button" data-type="callout" class="' + (r.type === "callout" ? "on" : "") + '">Callout report</button></div>' +
      field("Date", '<input id="k-date" type="date" data-k="date" value="' + esc(r.date) + '" />') +
      (r.type === "callout" ? field("Work order number", input("calloutNo", r.calloutNo, 'placeholder="007" inputmode="numeric" maxlength="4"')) + '<p class="hint">The -007 in the file name. Callouts billed together share it.</p>' : "") +
      field("Project number", input("projectNumber", r.projectNumber, 'placeholder="Project number" inputmode="numeric"')) +
      field("Project name", input("projectName", r.projectName, 'placeholder="Project name"')) +
      field("Print name", input("printName", r.printName, 'placeholder="Your name" autocomplete="name" autocapitalize="words"')) +
      field("Name on file name", input("fileWho", r.fileWho, 'placeholder="First name if blank" autocapitalize="words"')) +
      "<label>PDF will be filed as</label>" +
      '<span class="filetag" id="filetag">' + esc(fileName(r)) + "</span>" +
      '<p class="hint">' + SITE.addr1 + ", " + SITE.addr2 + "</p></div>";
  }
  if (step === 1) {
    return '<div class="card"><h2>Progress summary</h2>' +
      ta("summary", r.summary, "Tracks inspected, switches and derails worked, repairs made, paperwork done…") +
      "</div>" +
      weatherCard(r) +
      '<div class="card"><h2>Delays</h2>' + DELAYS.map((d) => questionHtml(r, d)).join("") + "</div>";
  }
  if (step === STEP.MATERIALS) return materialsHtml(r);
  if (step === STEP.CREW) {
    return '<div class="card"><h2>' + T.crewTitle + "</h2>" +
      '<p class="hint">' + T.crewHint + " Hours fill in from start and end. Type over them if lunch comes out.</p>" +
      T.crew.map((d) => questionHtml(r, d)).join("") + "</div>";
  }
  if (step === STEP.SAFETY) {
    return '<div class="card"><h2>Safety checklist</h2>' + T.safety.map((d) => questionHtml(r, d)).join("") + "</div>";
  }
  if (step === STEP.PHOTOS) {
    const purgedNote = !!r.photosPurged && !(r.photos || []).length;
    return '<div class="card"><h2>Photos and paperwork</h2>' +
      (purgedNote
        ? '<p class="hint">Photos removed from phone after 14 days (sent copy is on file).</p>'
        : '<p class="hint">Add job photos and pictures of inspection sheets. Each one prints ' + (Number(store.settings.photosPerPage) === 2 ? "two to a page" : "on its own page") + " with its note.</p>") +
      '<div class="nav" style="margin:0 0 12px">' +
      '<button class="btn btn-navy" data-act="photo" style="margin:0">Take photo</button>' +
      '<button class="btn btn-outline" data-act="library" style="margin:0">From library</button></div>' +
      '<input id="photoFile" type="file" accept="image/*" capture="environment" hidden />' +
      '<input id="libraryFile" type="file" accept="image/*" multiple hidden />' +
      (r.photos.map((p, i) => '<div class="item">' +
        '<img data-photo="' + esc(p.id) + '" alt="Photo ' + (i + 1) + '" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;background:#ddd" />' +
        "<label>Photo " + (i + 1) + " notes</label>" +
        '<input id="cap-' + p.id + '" data-caption="' + p.id + '" value="' + esc(p.caption || "") + '" placeholder="What does this show?" />' +
        '<button class="btn btn-danger" data-rmphoto="' + p.id + '">Remove</button></div>').join("") ||
        (purgedNote ? "" : '<p class="empty">No photos yet.</p>')) +
      "</div>";
  }
  const open = openItems(r);
  return (open.length
    ? '<div class="card"><h2>Still blank · ' + open.length + "</h2>" +
      '<p class="hint">Tap one to go answer it. Anything left blank prints as a dash.</p><div class="todo">' +
      open.map((o) => '<button type="button" data-goto="' + o.step + '">' + esc(o.label) + "</button>").join("") + "</div></div>"
    : "") +
    '<div class="card"><h2>Sign and send</h2>' +
    field("Print name", input("printName", r.printName, 'placeholder="Your name"')) +
    field("PDF file name", '<input id="k-pdfTitle" data-k="pdfTitle" value="' + esc(r.pdfTitle || autoTitle(r)) + '" placeholder="26001- 260226 Chris" />') +
    '<p class="hint">Office format is project- YYMMDD name, like 26001- 260226 Chris. Callouts add the callout number: 26002- 260709-007 Chris.</p>' +
    field("Email to", '<input id="k-recipientEmail" type="email" inputmode="email" data-k="recipientEmail" value="' + esc(r.recipientEmail) + '" />') +
    "<label>Signature</label>" +
    '<canvas class="sig" id="sig"></canvas>' +
    '<button class="btn btn-ghost" data-act="clearsig">Clear signature</button></div>' +
    '<div class="card">' +
    '<p class="hint">Share the PDF (and photos) to Mail so it lands at the office. On iPhone use the Mail app, not a browser tab.</p>' +
    '<button class="btn btn-outline" data-act="preview">Preview PDF</button>' +
    '<button class="btn btn-gold" data-act="send" data-share="1" disabled>Preparing…</button>' +
    '<button class="btn btn-ghost" data-act="pdf">Download PDF only</button></div>' +
    (r.type === "callout" ? billingSendHtml(r) : "") +
    (askSent
      ? '<div class="card"><h2>Did the email go out?</h2>' +
        '<p class="hint">Only mark it sent after the office actually gets it.</p>' +
        '<button class="btn btn-navy" data-act="sent-yes">Yes, mark sent</button>' +
        '<button class="btn btn-ghost" data-act="sent-no">Not yet</button></div>'
      : "");
}

function rowInput(key, row, f, extra) {
  return '<input id="row-' + row.id + "-" + f + '" data-row="' + key + '" data-id="' + row.id + '" data-f="' + f + '" value="' + esc(row[f] || "") + '" ' + (extra || "") + " />";
}
function rowTop(label, key, row) {
  return '<div class="item-top"><span class="muted">' + label + "</span>" +
    '<button class="btn btn-danger" style="width:auto;margin:0;padding:6px 10px;font-size:12px" data-rm="' + key + '" data-id="' + row.id + '">Remove</button></div>';
}
function materialsHtml(r) {
  const recent = (store.settings.recentEquip || []).filter((n) => !EQUIP_PRESETS.some((p) => p.toLowerCase() === String(n).toLowerCase()));
  return '<datalist id="uom-options">' + MATERIAL_UOM.map((u) => '<option value="' + u + '"></option>').join("") + "</datalist>" +
    '<div class="card"><h2>Materials used</h2>' +
    '<p class="hint">Ties, spikes, bolts, batteries, paint, anything put in the track or used up. Leave blank if none.</p>' +
    r.materials.map((row) => '<div class="item">' + rowTop("Item", "materials", row) +
      rowInput("materials", row, "description", 'placeholder="Description"') +
      splitRow(
        field("QTY", rowInput("materials", row, "qty", 'inputmode="decimal"')),
        field("UOM", rowInput("materials", row, "uom", 'list="uom-options" placeholder="EA, LF, TN" autocapitalize="characters"'))
      ) + "</div>").join("") +
    '<button class="btn btn-ghost" data-add="materials">Add item</button></div>' +
    '<div class="card"><h2>Equipment used</h2>' +
    '<p class="hint">Tap a machine, or Other to write one in. Leave blank if none.</p>' +
    '<div class="chips">' +
    EQUIP_PRESETS.map((n) => '<button type="button" class="chip" data-preset="' + esc(n) + '">' + esc(n) + "</button>").join("") +
    recent.map((n) => '<button type="button" class="chip recent" data-preset="' + esc(n) + '">' + esc(n) + "</button>").join("") +
    '<button type="button" class="chip other" data-act="other-equip">Other</button></div>' +
    r.equipment.map((row) => '<div class="item">' + rowTop("Equipment", "equipment", row) +
      rowInput("equipment", row, "name", 'placeholder="Write in any machine or vehicle" autocapitalize="words"') +
      splitRow(
        field("QTY", rowInput("equipment", row, "qty", 'inputmode="decimal"')),
        field("Hours", rowInput("equipment", row, "hours", 'inputmode="decimal"'))
      ) + "</div>").join("") +
    '<button class="btn btn-ghost" data-add="equipment">Add equipment</button></div>';
}
function usedMaterials(r) {
  return (r.materials || []).filter((x) => String(x.description || "").trim());
}
function usedEquipment(r) {
  return (r.equipment || []).filter((x) => String(x.name || "").trim());
}
function addEquipment(name) {
  const r = active();
  if (!r) return;
  const blank = r.equipment.find((row) => !String(row.name || "").trim());
  if (blank) {
    blank.name = name;
    if (name && !blank.qty) blank.qty = "1";
  } else r.equipment.push({ ...emptyRow.equipment(), name: name, qty: name ? "1" : "" });
  patch({});
  render();
  if (!name) {
    const boxes = document.querySelectorAll('[data-row="equipment"][data-f="name"]');
    let target = null;
    boxes.forEach((b) => { if (!String(b.value || "").trim()) target = b; });
    if (target) target.focus();
  }
}

/* ---------- monthly callout billing (the billing sheet logic is in billing.js) ---------- */
let billResult = null;
let billBusy = "";

const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? MON_SHORT[Number(m[2]) - 1] + " " + Number(m[3]) : "";
}

/* A report is finished once its PDF has been shared or saved, or it is marked sent. That puts it on the month's billing. */
function markFinished(r) {
  if (!r || r.finishedAt) return;
  r.finishedAt = new Date().toISOString();
  save();
}

function billingTemplateHtml() {
  const t = store.settings.billingTemplate;
  const current = typeof billingTemplateCurrent === "function" && billingTemplateCurrent();
  return '<input id="billingFile" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden />' +
    (t && current
      ? '<p class="hint">Billing sheet on this phone: <b>' + esc(t.name) + "</b>. Rates and formulas come from it.</p>" +
        '<button class="btn btn-ghost" data-act="billfile">Replace billing sheet</button>'
      : (t ? '<p class="hint"><b>The billing sheet on this phone is the old layout.</b> Load the updated 26002 BILLING SHEET.</p>'
           : '<p class="hint">Load the office billing sheet (.xlsx) once. It stays on this phone and is never uploaded, so the rates stay private. Any filled copy works; the old entries are cleared.</p>') +
        '<button class="btn btn-outline" data-act="billfile">Load billing sheet</button>');
}

function monthStats(g) {
  const data = collectBilling(g.done);
  return data.days.length + (data.days.length === 1 ? " callout day" : " callout days") + " · " +
    data.manHours + " man-hrs · " + data.equipHours + " equip hrs" +
    (data.materials.length ? " · " + data.materials.length + (data.materials.length === 1 ? " material" : " materials") : "");
}

function monthState(g) {
  const thisMonth = todayISO().slice(0, 7);
  if (g.record) return { tag: "Exported " + shortDate(g.record.exportedAt.slice(0, 10)), cls: "", button: g.changed ? "Export updated sheet" : "Export again" };
  if (g.month < thisMonth) return { tag: "Ready to export", cls: " callout", button: "Month complete · export" };
  return { tag: "Open", cls: "", button: "Export so far" };
}

function billingMonthHtml(g) {
  const st = monthState(g);
  const busy = billBusy === g.key;
  return '<div class="item"><div class="item-top"><b>' + esc(monthLabel(g.month)) + '</b><span class="tag' + st.cls + '">' + esc(st.tag) + "</span></div>" +
    '<div class="muted">Job ' + esc(g.project + "-" + monthWorkOrder(g)) + " · " + (g.done.length ? esc(monthStats(g)) : "nothing finished yet") + "</div>" +
    (g.done.length ? '<div class="muted" style="margin-top:4px">' + esc(g.done.map((r) => shortDate(r.date)).join(", ")) + "</div>" : "") +
    (g.drafts.length ? '<p class="hint" style="margin:6px 0 0">' + g.drafts.length + " callout" + (g.drafts.length === 1 ? "" : "s") + " (" + esc(g.drafts.map((r) => shortDate(r.date)).join(", ")) +
      ") not finished. Share or save the report and it is added.</p>" : "") +
    (g.changed ? '<p class="hint" style="margin:6px 0 0"><b>Callouts were added or changed since the last export.</b></p>' : "") +
    (g.done.length ? '<button class="btn btn-navy" data-bill="' + esc(g.key) + '"' + (billBusy ? " disabled" : "") + ">" + (busy ? "Building…" : esc(st.button)) + "</button>" : "") +
    "</div>" + billingResultHtml(g);
}

/* A built sheet is only offered while it still matches the month: a callout finished or edited since makes it stale. */
function billingResultHtml(g) {
  const b = billResult;
  if (!b || b.key !== g.key) return "";
  const ids = g.done.map((r) => r.id).join("|");
  if (b.ids.join("|") !== ids || g.done.some((r) => (r.updatedAt || "") > b.builtAt)) return "";
  return '<div class="item" style="border-color:var(--brass)"><b>Billing sheet ready</b>' +
    b.files.map((f) => '<span class="filetag">' + esc(f.name) + "</span>").join("") +
    '<p class="hint">Filled in: ' + esc(b.summary) + ".</p>" +
    (b.warnings.length ? '<p class="hint"><b>Check before it goes out</b></p><ul class="hint" style="margin:0 0 10px;padding-left:18px">' + b.warnings.map((w) => "<li>" + esc(w) + "</li>").join("") + "</ul>" : "") +
    '<button class="btn btn-gold" data-act="billshare">Share billing sheet</button>' +
    '<button class="btn btn-ghost" data-act="billsave">Download billing sheet</button></div>';
}

function billingHomeHtml() {
  const months = typeof billingMonths === "function" ? billingMonths() : [];
  return '<div class="card"><h2>Callout billing</h2>' +
    '<p class="hint">Fairburn callouts bill by the month. Each finished callout report is added to its month. When the month is done, export the billing sheet.</p>' +
    billingTemplateHtml() +
    (months.length ? '<div style="margin-top:12px">' + months.slice(0, 6).map(billingMonthHtml).join("") + "</div>"
      : '<p class="empty" style="margin-top:12px">Finished callout reports show up here by month.</p>') +
    "</div>";
}

function billingSendHtml(r) {
  const key = String(r.projectNumber || "").trim() + "|" + String(r.date || "").slice(0, 7);
  const g = (typeof billingMonths === "function" ? billingMonths() : []).find((x) => x.key === key);
  const label = monthLabel(String(r.date || "").slice(0, 7));
  const finished = reportFinished(r);
  return '<div class="card"><h2>' + esc(label) + " billing</h2>" +
    (finished
      ? '<p class="hint"><b>This callout is on the ' + esc(label) + " billing.</b> " + (g ? g.done.length + " finished callout report" + (g.done.length === 1 ? "" : "s") + " so far this month." : "") + "</p>"
      : '<p class="hint">This callout goes on the ' + esc(label) + " billing as soon as you share or save the report above.</p>") +
    (g ? billingMonthHtml(g) : "") + "</div>";
}

async function onBillingFile(e) {
  const file = (e.target.files || [])[0];
  e.target.value = "";
  if (!file) return;
  try {
    await saveBillingTemplate(file);
    billResult = null;
    toast("Billing sheet saved on this phone.");
  } catch (err) {
    toast(String((err && err.message) || "Could not read that file."));
  }
  render();
}

async function prepareBilling(key) {
  if (billBusy) return;
  if (!billingTemplateCurrent()) { toast("Load the updated billing sheet first."); return; }
  const g = billingMonths().find((x) => x.key === key);
  if (!g) { toast("No callout reports for that month."); return; }
  billBusy = key;
  billResult = null;
  render();
  try {
    billResult = await buildBillingFiles(g);
  } catch (err) {
    toast(String((err && err.message) || "Could not build the billing sheet."));
  }
  billBusy = "";
  render();
  const btn = document.querySelector('[data-act="billshare"]');
  if (btn && btn.scrollIntoView) btn.scrollIntoView({ block: "center" });
}

function saveBillingFiles() {
  if (!billResult) return;
  billResult.files.forEach((f) => downloadBlob(f.blob, f.name));
  recordBillingExport(billResult);
  toast("Saved " + billResult.files.map((f) => f.name).join(", "));
  render();
}

function shareBilling() {
  if (!billResult) return;
  const result = billResult;
  const payload = { title: result.files[0].name.replace(/\.xlsx$/i, ""), files: result.files.map((f) => f.file) };
  try {
    if (navigator.share && navigator.canShare && navigator.canShare(payload)) {
      navigator.share(payload).then(() => {
        recordBillingExport(result);
        render();
      }).catch((err) => {
        if (err && err.name === "AbortError") return;
        saveBillingFiles();
      });
      return;
    }
  } catch (err) {}
  saveBillingFiles();
}

function openItems(r) {
  const T = typeOf(r);
  const out = [];
  if (!hasWeather(r)) out.push({ step: 1, label: "Weather" });
  const check = (def, at) => {
    const a = r.q[def.id] || {};
    const text = String(a.d || "").trim();
    if (!a.a) out.push({ step: at, label: def.short });
    else if (def.needIf === a.a && !text) out.push({ step: at, label: "Describe: " + def.short });
    else if (def.kind === "crew" && a.a === "yes" && !String(a.hrs || "").trim()) out.push({ step: at, label: "Hours: " + def.short });
    else if (def.kind === "time" && a.a === "yes" && !a.time && !text) out.push({ step: at, label: "Time: " + def.short });
  };
  DELAYS.forEach((d) => check(d, 1));
  T.crew.forEach((d) => check(d, STEP.CREW));
  T.safety.forEach((d) => check(d, STEP.SAFETY));
  return out;
}

function bind() {
  document.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", onAct));
  document.querySelectorAll("[data-open]").forEach((el) => el.addEventListener("click", (e) => {
    if (e.target.closest("[data-del]")) return;
    openReport(el.getAttribute("data-open"));
  }));
  document.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    const id = b.getAttribute("data-del");
    if (pendingDelete && pendingDelete !== id) {
      const prev = document.querySelector('[data-del="' + pendingDelete + '"]');
      if (prev) prev.textContent = "Delete";
    }
    if (pendingDelete !== id) {
      pendingDelete = id;
      b.textContent = "Tap again to delete";
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        if (pendingDelete === id) pendingDelete = null;
        const live = document.querySelector('[data-del="' + id + '"]');
        if (live) live.textContent = "Delete";
      }, 3000);
      return;
    }
    clearTimeout(pendingTimer);
    pendingDelete = null;
    removeReport(id);
  }));
  document.querySelectorAll("[data-set]").forEach((el) => el.addEventListener("input", () => {
    const k = el.getAttribute("data-set");
    store.settings[k] = k === "photosPerPage" ? Number(el.value) : el.value;
    save();
  }));
  document.querySelectorAll("[data-k]").forEach((el) => el.addEventListener("input", () => {
    const k = el.getAttribute("data-k");
    let value = el.value;
    if (k === "calloutNo") {
      value = String(value || "").replace(/\D/g, "").slice(0, 4);
      if (el.value !== value) el.value = value;
    }
    const extra = k === "pdfTitle" ? { pdfTitleCustom: !!String(value).trim() } : {};
    patch({ [k]: value, ...extra });
    const r = active();
    if (r && ["date", "projectNumber", "printName", "fileWho", "calloutNo"].indexOf(k) >= 0) {
      retitle();
      const tag = document.getElementById("filetag");
      if (tag) tag.textContent = fileName(r);
    }
    if (k === "date" && r) {
      if (r.wx && r.wx.date !== r.date) { r.wx = null; save(); }
      wxError = "";
      wxFailAt = 0;
      wxFailKey = "";
    }
    if (step === STEP.SEND && (k === "pdfTitle" || k === "printName")) queuePrepare();
  }));
  document.querySelectorAll('[data-k="calloutNo"]').forEach((el) => el.addEventListener("blur", () => {
    const r = active();
    if (!r) return;
    const v = pad3(r.calloutNo);
    if (v === r.calloutNo) return;
    patch({ calloutNo: v });
    retitle();
    el.value = v;
    const tag = document.getElementById("filetag");
    if (tag) tag.textContent = fileName(r);
  }));
  document.querySelectorAll("[data-type]").forEach((b) => b.addEventListener("click", () => {
    const r = active();
    const next = b.getAttribute("data-type") === "callout" ? "callout" : "daily";
    if (!r || r.type === next) return;
    const prevProj = (store.settings.projects || {})[r.type] || {};
    const nextProj = (store.settings.projects || {})[next] || {};
    const p = { type: next };
    /* swap the project only when it is still the other report type's default */
    if (!String(r.projectNumber || "").trim() || r.projectNumber === prevProj.num || r.projectNumber === TYPES[r.type].project) {
      p.projectNumber = nextProj.num || TYPES[next].project;
      p.projectName = nextProj.name || TYPES[next].projectName;
    }
    if (next === "callout" && !r.calloutNo) p.calloutNo = defaultWorkOrder(store.settings, r.date);
    patch(p);
    retitle();
    render();
  }));
  document.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => {
    const r = active();
    const a = answer(r, b.getAttribute("data-q"));
    const v = b.getAttribute("data-v");
    a.a = a.a === v ? "" : v;
    patch({});
    render();
  }));
  document.querySelectorAll("[data-rate]").forEach((b) => b.addEventListener("click", () => {
    answer(active(), b.getAttribute("data-rate")).rate = b.getAttribute("data-v") === "st" ? "st" : "ot";
    patch({});
    render();
  }));
  document.querySelectorAll("[data-bill]").forEach((b) => b.addEventListener("click", () => prepareBilling(b.getAttribute("data-bill"))));
  const billFile = document.getElementById("billingFile");
  if (billFile) billFile.addEventListener("change", onBillingFile);
  document.querySelectorAll("[data-qf]").forEach((el) => el.addEventListener("input", () => {
    const r = active();
    const id = el.getAttribute("data-qf");
    const f = el.getAttribute("data-f");
    const a = answer(r, id);
    a[f] = el.value;
    if (f === "hrs") a.hrsTyped = !!String(el.value).trim();
    if ((f === "start" || f === "end") && !a.hrsTyped) {
      const h = hoursBetween(a.start, a.end);
      if (h) {
        a.hrs = h;
        const box = document.getElementById("q-" + id + "-hrs");
        if (box) box.value = h;
      }
    }
    /* entering a name, time or hours means that class was on site */
    if (!a.a && f !== "d" && String(el.value).trim()) {
      a.a = "yes";
      const yesBtn = document.querySelector('[data-q="' + id + '"][data-v="yes"]');
      if (yesBtn) yesBtn.className = "on";
    }
    patch({});
  }));
  document.querySelectorAll("[data-row]").forEach((el) => el.addEventListener("input", () => {
    const r = active();
    const key = el.getAttribute("data-row");
    const row = (r[key] || []).find((x) => x.id === el.getAttribute("data-id"));
    if (!row) return;
    row[el.getAttribute("data-f")] = el.value;
    patch({});
  }));
  document.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => {
    const r = active();
    const key = b.getAttribute("data-add");
    r[key].push(emptyRow[key]());
    patch({});
    render();
    const boxes = document.querySelectorAll('[data-row="' + key + '"][data-f="' + (key === "equipment" ? "name" : "description") + '"]');
    if (boxes.length) boxes[boxes.length - 1].focus();
  }));
  document.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => {
    const r = active();
    const key = b.getAttribute("data-rm");
    const id = b.getAttribute("data-id");
    r[key] = r[key].length <= 1 ? [emptyRow[key]()] : r[key].filter((row) => row.id !== id);
    patch({});
    render();
  }));
  document.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => addEquipment(b.getAttribute("data-preset"))));
  document.querySelectorAll("[data-wxm]").forEach((el) => el.addEventListener("input", () => {
    const r = active();
    const i = Number(el.getAttribute("data-wxm"));
    if (!r.wxManual[i]) return;
    r.wxManual[i][el.getAttribute("data-f")] = el.value;
    patch({});
    refreshWxGrid();
  }));
  document.querySelectorAll("[data-wxm]").forEach((el) => el.addEventListener("change", refreshWxGrid));
  document.querySelectorAll("[data-caption]").forEach((el) => el.addEventListener("input", () => {
    const id = el.getAttribute("data-caption");
    const r = active();
    r.photos = r.photos.map((p) => p.id === id ? { ...p, caption: el.value } : p);
    patch({});
  }));
  document.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => {
    const target = Number(b.getAttribute("data-step"));
    if (!Number.isFinite(target) || target === step) return;
    if (target > 0 && !jobOk()) return;
    step = target;
    render();
    window.scrollTo(0, 0);
  }));
  document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => {
    step = Number(b.getAttribute("data-goto")) || 0;
    render();
    window.scrollTo(0, 0);
  }));
  document.querySelectorAll("[data-rmphoto]").forEach((b) => b.addEventListener("click", () => {
    const id = b.getAttribute("data-rmphoto");
    const r = active();
    r.photos = r.photos.filter((p) => p.id !== id);
    const url = thumbUrls.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      thumbUrls.delete(id);
    }
    deletePhoto(id);
    patch({ photos: r.photos });
    render();
  }));
  if (step === STEP.SEND && screen === "wizard") setupSig();
  const cam = document.getElementById("photoFile");
  const lib = document.getElementById("libraryFile");
  if (cam) cam.addEventListener("change", onPhoto);
  if (lib) lib.addEventListener("change", onPhoto);
}

function onAct(e) {
  const act = e.currentTarget.getAttribute("data-act");
  if (act === "start") start("daily", false, false);
  if (act === "new-daily") start("daily", false, true);
  if (act === "new-callout") start("callout", false, true);
  if (act === "fromlast") start("daily", true, true);
  if (act === "home") { askSent = false; screen = "home"; activeId = null; step = 0; render(); window.scrollTo(0, 0); }
  if (act === "back") { step = Math.max(0, step - 1); render(); window.scrollTo(0, 0); }
  if (act === "next") {
    if (!canNext()) return;
    step += 1;
    render();
    window.scrollTo(0, 0);
  }
  if (act === "other-equip") addEquipment("");
  if (act === "billfile") { const el = document.getElementById("billingFile"); if (el) el.click(); }
  if (act === "billshare") shareBilling();
  if (act === "billsave") saveBillingFiles();
  if (act === "photo") { const el = document.getElementById("photoFile"); if (el) el.click(); }
  if (act === "library") { const el = document.getElementById("libraryFile"); if (el) el.click(); }
  if (act === "clearsig") {
    patch({ signatureDataUrl: "" });
    setupSig(true);
    prepareSendFiles();
  }
  if (act === "pdf") downloadPdf();
  if (act === "preview") previewPdf();
  if (act === "send") sendReport();
  if (act === "sent-yes") markSent();
  if (act === "sent-no") { askSent = false; render(); }
  if (act === "wxrefresh") {
    const r = active();
    if (!r || !weatherDateOk(r.date)) return;
    wxFailAt = 0;
    wxFailKey = "";
    wxError = "";
    fetchWeather(true);
  }
  if (act === "wxmanual") {
    wxManualOpen = !wxManualOpen;
    render();
  }
}

function jobOk() {
  const r = active();
  if (!r || !String(r.projectNumber || "").trim() || !String(r.printName || "").trim()) {
    toast("Project number and name are required.");
    return false;
  }
  if (r.type === "callout" && !pad3(r.calloutNo)) {
    toast("Work order number is required. It goes in the file name.");
    return false;
  }
  return true;
}

function canNext() {
  const r = active();
  if (step === 0 && !jobOk()) return false;
  if (step === 1 && !String(r.summary || "").trim()) {
    toast("Add a short summary of the work.");
    return false;
  }
  return true;
}

function start(type, fromLast, forceNew) {
  const items = list();
  const today = todayISO();
  if (!fromLast && !forceNew) {
    const existing = items.find((r) => r.status === "draft" && r.date === today && r.type === type);
    if (existing) { openReport(existing.id); return; }
  }
  const r = blankReport(store.settings, type);
  if (fromLast) {
    const last = items.find((x) => x.type === type);
    if (last) {
      r.projectNumber = last.projectNumber;
      r.projectName = last.projectName;
      r.printName = last.printName || store.settings.defaultName;
      r.fileWho = last.fileWho || store.settings.fileWho;
      r.recipientEmail = last.recipientEmail || store.settings.defaultEmail;
      TYPES[type].crew.forEach((def) => {
        const a = last.q[def.id];
        if (!a || def.kind !== "crew") return;
        r.q[def.id] = { a: a.a || "", d: "", name: a.name || "", start: a.start || "", end: a.end || "", hrs: a.hrs || "", hrsTyped: !!a.hrsTyped };
      });
      const gear = usedEquipment(last);
      if (gear.length) r.equipment = gear.map((x) => ({ ...emptyRow.equipment(), name: x.name, qty: x.qty, hours: x.hours }));
    }
  }
  r.pdfTitle = autoTitle(r);
  store.reports[r.id] = r;
  store.order.unshift(r.id);
  save();
  openReport(r.id);
}

function openReport(id) {
  activeId = id;
  screen = "wizard";
  step = 0;
  askSent = false;
  wxError = "";
  wxManualOpen = false;
  render();
  window.scrollTo(0, 0);
}

async function removeReport(id) {
  const r = store.reports[id];
  if (r && Array.isArray(r.photos)) {
    for (let i = 0; i < r.photos.length; i += 1) {
      const pid = r.photos[i].id;
      await deletePhoto(pid);
      const url = thumbUrls.get(pid);
      if (url) {
        URL.revokeObjectURL(url);
        thumbUrls.delete(pid);
      }
    }
  }
  delete store.reports[id];
  store.order = store.order.filter((x) => x !== id);
  save();
  render();
}

async function hydratePhotos() {
  const imgs = document.querySelectorAll("[data-photo]");
  for (let i = 0; i < imgs.length; i += 1) {
    const img = imgs[i];
    const id = img.getAttribute("data-photo");
    try {
      if (!thumbUrls.has(id)) {
        const blob = await getPhoto(id);
        if (!blob) continue;
        thumbUrls.set(id, URL.createObjectURL(blob));
      }
      if (img.isConnected) img.src = thumbUrls.get(id);
    } catch (e) {}
  }
}

async function onPhoto(e) {
  const files = Array.prototype.slice.call(e.target.files || []);
  e.target.value = "";
  if (!files.length) return;
  const r = active();
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    if (file.type && file.type.indexOf("image/") !== 0) continue;
    try {
      const blob = await compressImage(file);
      const id = uid();
      await putPhoto(id, blob);
      const takenAt = file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString();
      r.photos.push({ id: id, caption: "", takenAt: takenAt });
      r.photosPurged = false;
    } catch (err) {
      toast("Could not add that photo.");
    }
  }
  save();
  render();
}

/* Paperwork has to stay readable in the PDF, so photos keep more detail here than in the supervisor app. */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxEdge = 1600;
      let width = img.naturalWidth || img.width || 1;
      let height = img.naturalHeight || img.height || 1;
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error("compress"));
        else resolve(blob);
      }, "image/jpeg", 0.72);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

function setupSig(clear) {
  const canvas = document.getElementById("sig");
  if (!canvas) return;
  teardownSig();
  const ctx = canvas.getContext("2d");
  const r = active();
  const w = canvas.clientWidth || 300;
  const h = canvas.clientHeight || 160;
  canvas.width = w * 2;
  canvas.height = h * 2;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#142033";
  ctx.fillStyle = "#142033";
  if (r && r.signatureDataUrl && !clear) {
    const im = new Image();
    im.onload = () => ctx.drawImage(im, 0, 0, w, h);
    im.src = r.signatureDataUrl;
  }
  let drawing = false;
  let moved = false;
  let last = null;
  const pos = (ev) => {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  };
  const startDraw = (ev) => {
    ev.preventDefault();
    drawing = true;
    moved = false;
    last = pos(ev);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
  };
  const move = (ev) => {
    if (!drawing) return;
    ev.preventDefault();
    const p = pos(ev);
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 0.5) return;
    moved = true;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  };
  const end = () => {
    if (!drawing) return;
    drawing = false;
    if (!moved && last) {
      ctx.beginPath();
      ctx.arc(last.x, last.y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    patch({ signatureDataUrl: canvas.toDataURL("image/png") });
    prepareSendFiles();
  };
  canvas.addEventListener("pointerdown", startDraw);
  canvas.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  sigHandlers = { canvas: canvas, start: startDraw, move: move, end: end };
}

/* ---------- report content shared by the PDF and the email text ---------- */
function yna(v) { return v === "yes" ? "YES" : v === "no" ? "NO" : v === "na" ? "N/A" : "—"; }

function describe(def, a, type) {
  a = a || {};
  const note = String(a.d || "").trim();
  if (def.kind === "crew") {
    const out = [];
    if (String(a.name || "").trim()) out.push(String(a.name).trim());
    const span = a.start && a.end ? time12(a.start) + " - " + time12(a.end) : a.start ? "Start " + time12(a.start) : a.end ? "End " + time12(a.end) : "";
    const h = String(a.hrs || "").trim();
    const hh = h ? (/[a-z]/i.test(h) ? h : h + " Hrs" + (type === "callout" ? (a.rate === "st" ? " ST" : " OT") : "")) : "";
    if (span && hh) out.push(span + " (" + hh + ")");
    else if (span || hh) out.push(span || hh);
    if (note) out.push(note);
    return out.join("\n") || "—";
  }
  if (def.kind === "time") {
    const out = [];
    if (a.time) out.push(def.timeLabel + ": " + time12(a.time));
    if (note) out.push(note);
    return out.join("\n") || "—";
  }
  return note || "—";
}

function reportText(r) {
  const T = typeOf(r);
  const block = (title, defs) => [""].concat([title.toUpperCase()], defs.map((def) => {
    const a = r.q[def.id] || {};
    const d = describe(def, a, r.type).replace(/\n/g, "; ");
    return "  • " + def.short + ": " + yna(a.a) + (d !== "—" ? " — " + d : "");
  }));
  const wx = slotsFor(r).filter((s) => s.status === "ok").map((s) =>
    "  " + s.t + ": " + (s.tempF ? s.tempF + " F" : "—") + "  " + (s.cond || "—") + "  ·  Precip " + (s.precip || "—") + "  ·  Wind " + (s.wind || "—") + "  ·  Humidity " + (s.hum || "—"));
  return [
    "STX CORPORATION — " + T.title,
    "Date: " + (formatLong(r.date) || r.date),
    "Project: " + [r.projectNumber, r.projectName].filter(Boolean).join(" "),
    r.type === "callout" ? "Work order #: " + (pad3(r.calloutNo) || "—") : "",
    "Prepared by: " + (r.printName || "—"),
    SITE.addr1 + ", " + SITE.addr2,
    wx.length ? "Weather:" : "Weather: not recorded",
  ].concat(wx, ["", "PROGRESS SUMMARY", String(r.summary || "").trim() || "—"],
    block("Delays", DELAYS),
    ["", "MATERIALS USED"], usedMaterials(r).map((x) => "  • " + x.description + "  qty " + (x.qty || "—") + (x.uom ? " " + x.uom : "")).concat(usedMaterials(r).length ? [] : ["  (none)"]),
    ["", "EQUIPMENT USED"], usedEquipment(r).map((x) => "  • " + x.name + "  qty " + (x.qty || "—") + "  hrs " + (x.hours || "—")).concat(usedEquipment(r).length ? [] : ["  (none)"]),
    block(T.crewTitle, T.crew), block("Safety checklist", T.safety),
    ["", r.photosPurged ? "Photos removed from phone after 14 days (sent copy is on file)." : "Photos: " + r.photos.length]
  ).filter((x, i) => x !== "" || i > 5).join("\n");
}

/* jsPDF's built-in fonts only cover Latin-1, so curly quotes and emoji typed on a phone are swapped or dropped. */
function pdfText(s) {
  return String(s == null ? "" : s)
    .replace(/[‘’′]/g, "'").replace(/[“”″]/g, '"')
    .replace(/…/g, "...").replace(/\r/g, "").replace(/\t/g, " ")
    .replace(/[^\n\x20-\x7E\xA0-\xFF–—]/g, "");
}

let cachedLogo = null;
async function loadLogo() {
  if (cachedLogo !== null) return cachedLogo;
  try {
    const res = await fetch("./stx-logo-pdf.jpg");
    const blob = await res.blob();
    cachedLogo = await blobToDataUrl(blob);
  } catch (e) {
    cachedLogo = "";
  }
  return cachedLogo;
}

async function resolvePhoto(p) {
  if (p && p.dataUrl) return p.dataUrl;
  if (!p || !p.id) return "";
  try {
    const blob = await getPhoto(p.id);
    if (!blob) return "";
    return await blobToDataUrl(blob);
  } catch (e) {
    return "";
  }
}

function fitAddImage(doc, dataUrl, x, y, maxW, maxH) {
  const props = doc.getImageProperties(dataUrl);
  const iw = props.width || 1;
  const ih = props.height || 1;
  const scale = Math.min(maxW / iw, maxH / ih);
  const w = iw * scale;
  const h = ih * scale;
  let fmt = String(props.fileType || "JPEG").toUpperCase();
  if (fmt === "JPG") fmt = "JPEG";
  if (fmt !== "PNG" && fmt !== "JPEG") fmt = "JPEG";
  doc.addImage(dataUrl, fmt, x, y, w, h, undefined, "FAST");
  return { w: w, h: h };
}

function placeFitted(doc, dataUrl, boxX, boxY, boxW, boxH) {
  const props = doc.getImageProperties(dataUrl);
  const iw = props.width || 1;
  const ih = props.height || 1;
  const scale = Math.min(boxW / iw, boxH / ih);
  const w = iw * scale;
  const h = ih * scale;
  const x = boxX + (boxW - w) / 2;
  let fmt = String(props.fileType || "JPEG").toUpperCase();
  if (fmt === "JPG") fmt = "JPEG";
  if (fmt !== "PNG" && fmt !== "JPEG") fmt = "JPEG";
  doc.addImage(dataUrl, fmt, x, boxY, w, h, undefined, "FAST");
  return { w: w, h: h };
}

function drawCloud(doc, ix, iy, fill, stroke) {
  const paint = (color, grow) => {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(ix - 6, iy + 2, 6 + grow, "F");
    doc.circle(ix + 1, iy - 3, 8 + grow, "F");
    doc.circle(ix + 8, iy + 3, 5 + grow, "F");
    doc.roundedRect(ix - 11 - grow, iy + 2, 24 + grow * 2, 6 + grow, 3, 3, "F");
  };
  if (stroke) paint(stroke, 1.2);
  paint(fill, 0);
}

function drawSun(doc, ix, iy, rad, inner, outer) {
  doc.setFillColor(255, 214, 110);
  doc.circle(ix, iy, rad, "F");
  doc.setDrawColor(255, 214, 110);
  doc.setLineWidth(1.6);
  for (let a = 0; a < 360; a += 45) {
    const rads = a * Math.PI / 180;
    doc.line(ix + inner * Math.cos(rads), iy + inner * Math.sin(rads), ix + outer * Math.cos(rads), iy + outer * Math.sin(rads));
  }
}

function drawMoon(doc, ix, iy, rad, ox, oy, punch) {
  doc.setFillColor(167, 191, 220);
  doc.circle(ix, iy, rad, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(ix + ox, iy + oy, punch, "F");
}

function drawWxIcon(doc, kind, ix, iy) {
  if (kind === "sun") drawSun(doc, ix, iy, 7, 10, 13.5);
  else if (kind === "moon") drawMoon(doc, ix, iy, 10, 5.5, -4.5, 9);
  else if (kind === "partly-day") {
    drawSun(doc, ix - 7, iy - 7, 5, 7, 9.5);
    drawCloud(doc, ix, iy, [255, 255, 255], [170, 178, 188]);
  } else if (kind === "partly-night") {
    drawMoon(doc, ix - 7, iy - 7, 7, 4, -3, 6);
    drawCloud(doc, ix, iy, [255, 255, 255], [170, 178, 188]);
  } else if (kind === "rain" || kind === "storm" || kind === "snow") {
    drawCloud(doc, ix, iy, [154, 165, 177], null);
    if (kind === "storm") {
      doc.setFillColor(224, 168, 0);
      doc.triangle(ix + 1, iy + 4, ix - 4, iy + 13, ix + 1, iy + 12, "F");
      doc.triangle(ix + 0.5, iy + 11, ix - 2, iy + 20, ix + 6, iy + 11, "F");
    }
    doc.setDrawColor(91, 143, 217);
    doc.setLineWidth(1.3);
    if (kind === "snow") {
      doc.setFillColor(91, 143, 217);
      doc.circle(ix - 6, iy + 14, 1.3, "F");
      doc.circle(ix, iy + 16, 1.3, "F");
      doc.circle(ix + 6, iy + 14, 1.3, "F");
    } else if (kind === "storm") {
      doc.line(ix - 7, iy + 16, ix - 9, iy + 21);
      doc.line(ix + 7, iy + 16, ix + 5, iy + 21);
    } else {
      doc.line(ix - 6, iy + 12, ix - 8, iy + 18);
      doc.line(ix, iy + 12, ix - 2, iy + 18);
      doc.line(ix + 6, iy + 12, ix + 4, iy + 18);
    }
  } else if (kind === "fog") {
    doc.setFillColor(154, 165, 177);
    doc.roundedRect(ix - 12, iy - 8, 24, 3, 1.5, 1.5, "F");
    doc.roundedRect(ix - 12, iy - 1, 24, 3, 1.5, 1.5, "F");
    doc.roundedRect(ix - 12, iy + 6, 24, 3, 1.5, 1.5, "F");
  } else {
    drawCloud(doc, ix, iy, [154, 165, 177], null);
  }
  doc.setLineWidth(0.4);
}

/* Page-break rules for the whole report:
   - a table row, the sign-off block and a photo never split across pages
   - a section that fits on one page is never split: it moves to the next page whole
   - a section too long for one page breaks between rows and repeats its bar and column heads */
async function buildPdf(r) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const T = typeOf(r);
  const NAVY = [12, 35, 64];
  const INK = [20, 32, 51];
  const MUTED = [92, 101, 112];
  const LINE = [196, 188, 168];
  const HEAD = [232, 226, 212];
  const RED = [155, 28, 28];
  const pageW = 612;
  const pageH = 792;
  const margin = 40;
  const contentW = pageW - margin * 2;
  const contentBottom = pageH - 40;
  const pageTop = 34;
  const BAR = 14;
  const title = fileTitle(r);
  const dateLong = formatLong(r.date) || r.date || "";
  let y = 0;
  const logo = await loadLogo();
  const split = (text, w) => doc.splitTextToSize(pdfText(text), w);

  function newPage() {
    doc.addPage();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text("Project # " + pdfText(r.projectNumber || "—") + "  ·  " + dateLong + "  ·  continued", margin, 22);
    y = pageTop;
  }

  function paintBar(label, continued) {
    const text = String(label).toUpperCase() + (continued ? " (continued)" : "");
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(margin, y, contentW, BAR, "F");
    doc.setTextColor(255, 252, 245);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(text, margin + 6, y + 10);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    y += BAR;
  }

  /* wholeH: height of everything under the bar. firstH: the least that must stay with the bar. */
  function startSection(label, wholeH, firstH) {
    const full = BAR + wholeH;
    const fitsFreshPage = full <= contentBottom - pageTop;
    if (y + full > contentBottom && (fitsFreshPage || y + BAR + firstH > contentBottom)) newPage();
    paintBar(label, false);
  }

  function openText(label, text) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = split(String(text || "—"), contentW - 12);
    const whole = lines.length * 11 + 4;
    /* a short write-up stays in one piece; a long one starts here and carries over */
    startSection(label, lines.length <= 16 ? whole : contentBottom, Math.min(3, lines.length) * 11 + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    lines.forEach((line) => {
      if (y + 11 > contentBottom) { newPage(); paintBar(label, true); doc.setFont("helvetica", "normal"); doc.setFontSize(9); }
      doc.text(line, margin + 6, y + 9);
      y += 11;
    });
    y += 6;
  }

  const qWidths = [262, 50, 220];
  const qHeads = ["Question", "Answer", "Description"];

  function measureRow(cells, widths) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const wrapped = cells.map((cell, i) => split(String(cell == null ? "" : cell), widths[i] - 8));
    let lines = 1;
    wrapped.forEach((w) => { if (w.length > lines) lines = w.length; });
    return { wrapped: wrapped, h: Math.max(16, lines * 11 + 5) };
  }

  function paintHead(headers, widths) {
    doc.setFillColor(HEAD[0], HEAD[1], HEAD[2]);
    doc.rect(margin, y, contentW, 13, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    let x = margin;
    headers.forEach((h, i) => {
      doc.text(String(h), x + 4, y + 9);
      x += widths[i];
    });
    y += 13;
  }

  function paintRow(measured, widths, alert, boldCol) {
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.4);
    doc.setFontSize(9);
    let x = margin;
    widths.forEach((w, i) => {
      doc.rect(x, y, w, measured.h);
      const answerCell = i === boldCol;
      doc.setFont("helvetica", answerCell ? "bold" : "normal");
      if (answerCell && alert) doc.setTextColor(RED[0], RED[1], RED[2]);
      else doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(measured.wrapped[i], x + 4, y + 11);
      x += w;
    });
    y += measured.h;
  }

  /* rows: [{ cells: [...], alert }]. An empty table prints its bar and "None". */
  /* tail: height of a block that must stay on the same page as the end of this table (the sign-off). */
  function table(label, heads, widths, rows, boldCol, tail) {
    if (!rows.length) {
      startSection(label, 18, 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text("None", margin + 6, y + 12);
      y += 20;
      return;
    }
    const maxLines = Math.floor((contentBottom - pageTop - BAR - 13 - 5) / 11);
    const parts = [];
    rows.forEach((row) => {
      const m = measureRow(row.cells, widths);
      const most = Math.max.apply(null, m.wrapped.map((w) => w.length));
      if (most <= maxLines) { parts.push({ m: m, alert: row.alert }); return; }
      /* a row taller than a whole page is the one case that has to split: it continues on the next page */
      for (let at = 0; at < most; at += maxLines) {
        const piece = m.wrapped.map((w) => w.slice(at, at + maxLines));
        if (at > 0 && !piece[0].length) piece[0] = ["(continued)"];
        const lines = Math.max.apply(null, piece.map((w) => w.length));
        parts.push({ m: { wrapped: piece, h: Math.max(16, lines * 11 + 5) }, alert: row.alert });
      }
    });
    const whole = 13 + parts.reduce((sum, row) => sum + row.m.h, 0) + 6 + (tail || 0);
    startSection(label, whole, 13 + parts[0].m.h);
    paintHead(heads, widths);
    parts.forEach((row) => {
      if (y + row.m.h > contentBottom) {
        newPage();
        paintBar(label, true);
        paintHead(heads, widths);
      }
      paintRow(row.m, widths, row.alert, boldCol);
    });
    y += 6;
  }

  function questionTable(label, defs, tail) {
    table(label, qHeads, qWidths, defs.map((def) => {
      const a = r.q[def.id] || {};
      return { cells: [def.q, yna(a.a), describe(def, a, r.type)], alert: !!def.alert && a.a === def.alert };
    }), 1, tail);
  }

  /* ----- page 1 header ----- */
  doc.setFillColor(255, 252, 245);
  doc.rect(0, 0, pageW, 76, "F");
  if (logo) {
    try { fitAddImage(doc, logo, margin, 10, 250, 56); } catch (e) {}
  }
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(T.title, pageW - margin, 28, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(dateLong, pageW - margin, 42, { align: "right" });
  doc.text("Project # " + pdfText(r.projectNumber || "—") + (r.type === "callout" ? "  ·  Work Order # " + (pad3(r.calloutNo) || "—") : ""), pageW - margin, 53, { align: "right" });
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(SITE.company + "  ·  " + SITE.phone, pageW - margin, 64, { align: "right" });
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 76, pageW, 2, "F");
  doc.setFillColor(196, 154, 54);
  doc.rect(0, 78, pageW, 3, "F");

  y = 88;
  const info = "Prepared by  " + (r.printName || "—") +
    "    ·    Customer  " + ([r.projectNumber, r.projectName].filter(Boolean).join(" ") || "—") +
    "    ·    " + SITE.addr1 + ", " + SITE.addr2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const infoLines = split(info, contentW - 12);
  const infoH = infoLines.length * 11 + 8;
  doc.setFillColor(HEAD[0], HEAD[1], HEAD[2]);
  doc.rect(margin, y, contentW, infoH, "F");
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(infoLines, margin + 6, y + 12);
  y += infoH + 6;

  /* ----- weather ----- */
  const slots = slotsFor(r);
  if (slots.some((s) => s.status === "ok")) {
    startSection("Weather · " + SITE.place, 74 + 24, 74 + 24);
    const boxTop = y;
    const boxH = 74;
    const colW = contentW / 3;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.7);
    doc.rect(margin, boxTop, contentW, boxH, "FD");
    for (let i = 0; i < 3; i += 1) {
      const slot = slots[i];
      const x = margin + i * colW;
      const ix = x + 26;
      const iy = boxTop + 24;
      if (slot.status === "ok" && slot.icon) drawWxIcon(doc, slot.icon, ix, iy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text(String(slot.t || ""), ix, boxTop + 50, { align: "center" });
      const tx = x + 48;
      const textW = colW - 56;
      if (slot.status !== "ok") {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.text(slot.status === "later" ? "Later today." : "No reading.", tx, boxTop + 32);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text(slot.tempF ? pdfText(slot.tempF) + "°F" : "—", tx, boxTop + 26);
        doc.setFontSize(8);
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
        let cond = pdfText(slot.cond || "");
        const condLines = doc.splitTextToSize(cond, textW);
        if (condLines.length > 1) cond = String(condLines[0]).replace(/\s+\S*$/, "") + "...";
        doc.text(cond || "—", tx, boxTop + 38);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        const meta = [
          "Precipitation  " + pdfText(slot.precip || "—"),
          "Wind  " + pdfText(slot.wind || "—"),
          "Humidity  " + pdfText(slot.hum || "—"),
        ];
        meta.forEach((line, mi) => doc.text(line, tx, boxTop + 50 + mi * 8));
      }
    }
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.4);
    doc.line(margin + colW, boxTop, margin + colW, boxTop + boxH);
    doc.line(margin + colW * 2, boxTop, margin + colW * 2, boxTop + boxH);
    y = boxTop + boxH + 11;
    const fromStation = slots.some((s) => s.status === "ok" && !s.manual);
    const typed = slots.some((s) => s.manual);
    let src = fromStation
      ? "Source: National Weather Service · Station " + (r.wx.station || "") + " (" + (r.wx.stationName || "") + ") · observed readings"
      : "Source: entered by crew";
    if (fromStation && typed) src += " · " + slots.filter((s) => s.manual).map((s) => s.t).join(", ") + " entered by crew";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(split(src, contentW - 12)[0], margin + contentW / 2, y, { align: "center" });
    y += 13;
  } else {
    openText("Weather · " + SITE.place, "Not recorded");
  }

  openText("Progress summary", String(r.summary || "").trim() || "—");
  questionTable("Delays", DELAYS);
  table("Materials used", ["Description", "QTY", "UOM"], [360, 80, 92],
    usedMaterials(r).map((x) => ({ cells: [x.description, x.qty || "—", x.uom || "—"] })), -1);
  table("Equipment used", ["Equipment", "QTY", "Hours"], [360, 80, 92],
    usedEquipment(r).map((x) => ({ cells: [x.name, x.qty || "—", x.hours || "—"] })), -1);
  questionTable(T.crewTitle, T.crew);
  /* the signature never lands on a page by itself: it travels with the safety checklist */
  const blockH = 62;
  questionTable("Safety checklist", T.safety, blockH + 4);

  /* ----- sign-off, always in one piece ----- */
  if (y + blockH > contentBottom) newPage();
  const top = y + 4;
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.setLineWidth(0.7);
  doc.line(margin, top + 36, margin + 190, top + 36);
  doc.line(margin + 214, top + 36, margin + 404, top + 36);
  doc.line(margin + 428, top + 36, margin + contentW, top + 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(pdfText(r.printName || " "), margin, top + 30);
  doc.text(usDate(todayISO()), margin + 428, top + 30);
  if (r.signatureDataUrl) {
    try { doc.addImage(r.signatureDataUrl, "PNG", margin + 214, top, 170, 34, undefined, "FAST"); } catch (e) {}
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text("PRINT NAME", margin, top + 48);
  doc.text("SIGNATURE", margin + 214, top + 48);
  doc.text("DATE SIGNED", margin + 428, top + 48);
  y = top + blockH;

  if (r.photosPurged && !(r.photos || []).length) {
    const note = "Photos removed from phone after 14 days (sent copy is on file).";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (y + 16 > contentBottom) newPage();
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(note, margin, y + 11);
    y += 16;
  }

  /* ----- photos: one or two per page, never split ----- */
  const photos = [];
  const srcPhotos = r.photos || [];
  for (let i = 0; i < srcPhotos.length; i += 1) {
    const p = srcPhotos[i];
    const dataUrl = await resolvePhoto(p);
    if (!dataUrl) continue;
    photos.push({ caption: p.caption || "", takenAt: p.takenAt || "", dataUrl: dataUrl });
  }
  const perPage = Number(store.settings.photosPerPage) === 2 ? 2 : 1;
  const bandH = 36;
  const areaTop = bandH + 14;
  const areaH = contentBottom - areaTop;
  for (let i = 0; i < photos.length; i += perPage) {
    const group = photos.slice(i, i + perPage);
    doc.addPage();
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, 0, pageW, bandH, "F");
    doc.setTextColor(255, 252, 245);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const range = group.length > 1 ? "Photos " + (i + 1) + "-" + (i + group.length) : "Photo " + (i + 1);
    doc.text(range + " of " + photos.length + "  ·  Project # " + pdfText(r.projectNumber || "—") + "  ·  " + dateLong, margin, 23);
    const slotH = areaH / perPage;
    group.forEach((p, gi) => {
      let py = areaTop + gi * slotH + 4;
      const caption = "Photo " + (i + gi + 1) + ": " + (String(p.caption || "").trim() || "No description");
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(perPage === 2 ? 11 : 14);
      const lead = perPage === 2 ? 14 : 18;
      const capLines = split(caption, contentW).slice(0, 3);
      doc.text(capLines, margin, py + lead - 6);
      py += capLines.length * lead;
      const when = formatTaken(p.takenAt);
      if (when) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text(when, margin, py + 6);
        py += 14;
      }
      py += 6;
      const boxH = areaTop + (gi + 1) * slotH - py - 8;
      if (boxH > 40) {
        try { placeFitted(doc, p.dataUrl, margin, py, contentW, boxH); } catch (e) {}
      }
    });
  }

  /* ----- footer: the file title rides on every page so a loose sheet can be refiled ----- */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.setFont("helvetica", "normal");
    doc.text(SITE.company + " — " + T.footer, margin, pageH - 22);
    doc.text("Page " + i + " of " + pages, pageW - margin, pageH - 22, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(pdfText(title), pageW / 2, pageH - 22, { align: "center" });
  }
  doc.setProperties({ title: pdfText(title), subject: T.title, author: pdfText(r.printName || ""), creator: "STX Fairburn Report" });
  return doc.output("blob");
}

function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function downloadPdf() {
  const r = active();
  if (!r) return;
  if (!window.jspdf) { toast("PDF library still loading — try again."); return; }
  const pack = preparedFiles;
  const blob = packMatches(pack, r) ? pack.blob : await buildPdf(r);
  downloadBlob(blob, fileName(r));
  rememberSettings(r);
  markFinished(r);
  save();
  toast("Saved " + fileName(r));
  render();
}

async function previewPdf() {
  const r = active();
  if (!r) return;
  if (!window.jspdf) { toast("PDF library still loading — try again."); return; }
  const w = window.open("", "_blank");
  try {
    const pack = preparedFiles;
    const blob = packMatches(pack, r) ? pack.blob : await buildPdf(r);
    const url = URL.createObjectURL(blob);
    if (w) w.location = url;
    else {
      downloadBlob(blob, fileName(r));
      toast("Preview blocked. PDF downloaded instead.");
    }
  } catch (err) {
    if (w && w.close) w.close();
    toast("Could not build the PDF.");
  }
}

function packStamp(r) {
  return [r.id, r.updatedAt, r.signatureDataUrl ? r.signatureDataUrl.length : 0, r.wx && r.wx.fetchedAt ? r.wx.fetchedAt : "", store.settings.photosPerPage].join("|");
}

function packMatches(pack, r) {
  return !!(pack && pack.ready && pack.blob && r && pack.stamp === packStamp(r));
}

function setShareBusy(busy) {
  document.querySelectorAll('[data-act="send"]').forEach((b) => {
    b.disabled = !!busy;
    b.textContent = busy ? "Preparing…" : (b.getAttribute("data-share") === "1" ? "Share PDF + photos" : "Send report");
  });
}

function queuePrepare() {
  clearTimeout(prepareTimer);
  prepareToken += 1;
  if (preparedFiles) preparedFiles.ready = false;
  setShareBusy(true);
  prepareTimer = setTimeout(() => { prepareSendFiles(); }, 300);
}

async function prepareSendFiles() {
  const r = active();
  if (!r || screen !== "wizard" || step !== STEP.SEND) return;
  if (wxBusy) {
    prepareToken += 1;
    if (preparedFiles) preparedFiles.ready = false;
    setShareBusy(true);
    return;
  }
  const token = ++prepareToken;
  const stamp = packStamp(r);
  preparedFiles = { stamp: stamp, ready: false, blob: null, pdfFile: null, photoFiles: [] };
  setShareBusy(true);
  try {
    if (!window.jspdf) throw new Error("pdf");
    const blob = await buildPdf(r);
    if (token !== prepareToken) return;
    const live = active();
    if (!live || live.id !== r.id || screen !== "wizard" || step !== STEP.SEND) return;
    if (packStamp(live) !== stamp) { prepareSendFiles(); return; }
    const pdfFile = new File([blob], fileName(live), { type: "application/pdf" });
    const photoFiles = [];
    const items = live.photos || [];
    for (let i = 0; i < items.length; i += 1) {
      if (token !== prepareToken) return;
      let b = null;
      try { b = await getPhoto(items[i].id); } catch (e) { b = null; }
      if (token !== prepareToken) return;
      if (b) photoFiles.push(new File([b], fileTitle(live) + " photo " + (i + 1) + ".jpg", { type: b.type || "image/jpeg" }));
    }
    if (token !== prepareToken) return;
    preparedFiles = { stamp: stamp, ready: true, blob: blob, pdfFile: pdfFile, photoFiles: photoFiles };
    setShareBusy(false);
  } catch (err) {
    if (token !== prepareToken) return;
    preparedFiles = { stamp: stamp, ready: false, blob: null, pdfFile: null, photoFiles: [] };
    setShareBusy(false);
  }
}

function mailSubject(r) {
  return fileTitle(r) + " — " + typeOf(r).footer;
}

function mailFallback(r, blob, email) {
  downloadBlob(blob, fileName(r));
  markFinished(r);
  const subject = encodeURIComponent(mailSubject(r));
  const body = encodeURIComponent(reportText(r) + "\n\n---\nAttach the downloaded PDF and photos before sending.");
  window.location.href = "mailto:" + encodeURIComponent(email) + "?subject=" + subject + "&body=" + body;
  askSent = true;
  render();
}

function sendReport() {
  const r = active();
  const email = String((r && r.recipientEmail) || DEFAULT_EMAIL).trim();
  const copyP = navigator.clipboard && navigator.clipboard.writeText
    ? navigator.clipboard.writeText(email).then(() => true, () => false)
    : Promise.resolve(false);
  if (!r) return;
  if (!String(r.printName || "").trim() || !r.signatureDataUrl) {
    toast("Print name and signature are required.");
    return;
  }
  if (!window.jspdf) { toast("PDF library still loading — try again."); return; }
  const pack = preparedFiles;
  if (!packMatches(pack, r)) {
    toast("Still preparing the PDF.");
    prepareSendFiles();
    return;
  }
  rememberSettings(r);
  save();
  copyP.then((ok) => { if (ok) toast("Office email copied. Paste it in To."); });
  const files = [pack.pdfFile].concat(pack.photoFiles || []);
  const payload = {
    title: mailSubject(r),
    text: typeOf(r).footer + " for project " + (r.projectNumber || "—") + " on " + r.date + ". Please send to " + email + ".",
    files: files,
  };
  try {
    if (navigator.share && navigator.canShare && navigator.canShare(payload)) {
      navigator.share(payload).then(() => {
        markFinished(r);
        askSent = true;
        render();
      }).catch((err) => {
        if (err && err.name === "AbortError") return;
        mailFallback(r, pack.blob, email);
      });
      return;
    }
  } catch (err) {}
  mailFallback(r, pack.blob, email);
}

function rememberSettings(r) {
  const s = store.settings;
  s.defaultName = String(r.printName || "").trim() || s.defaultName;
  s.fileWho = String(r.fileWho || "").trim() || s.fileWho;
  s.defaultEmail = String(r.recipientEmail || "").trim() || DEFAULT_EMAIL;
  const num = String(r.projectNumber || "").trim();
  if (num) s.projects[r.type] = { num: num, name: String(r.projectName || "").trim() };
  if (r.type === "callout" && Number(pad3(r.calloutNo))) {
    s.lastCallout = Number(pad3(r.calloutNo));
    s.lastCalloutMonth = String(r.date || "").slice(0, 7);
  }
  const custom = [];
  usedEquipment(r).forEach((x) => {
    const name = String(x.name).trim();
    if (EQUIP_PRESETS.some((p) => p.toLowerCase() === name.toLowerCase())) return;
    if (!custom.some((c) => c.toLowerCase() === name.toLowerCase())) custom.push(name);
  });
  const prev = (s.recentEquip || []).filter((n) => !custom.some((c) => c.toLowerCase() === String(n).toLowerCase()));
  s.recentEquip = custom.concat(prev).slice(0, 10);
}

function markSent() {
  const r = active();
  if (!r) return;
  r.status = "sent";
  r.sentAt = new Date().toISOString();
  markFinished(r);
  rememberSettings(r);
  askSent = false;
  save();
  toast("Marked sent.");
  screen = "home";
  activeId = null;
  step = 0;
  render();
}

async function boot() {
  try {
    await load();
    render();
    loadLogo();
  } catch (err) {
    const el = document.getElementById("app");
    if (el) el.innerHTML = '<header class="hero"><h1>Fairburn Report</h1></header><main class="content"><div class="card"><p>Could not load the report app. Close Safari and open the link again.</p><p class="hint">' + esc(String(err)) + "</p></div></main>";
    console.error(err);
  }
}

if (!(typeof window !== "undefined" && window.__STX_NO_BOOT)) boot();
