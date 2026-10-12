/* Monthly callout billing: fills the office "Time and Materials Summary" billing sheet from the callout
   reports on this phone.

   Fairburn callouts bill by the month. Every callout whose report is finished (shared, downloaded or marked
   sent) is added to its month's billing automatically. When the month is done, Export writes the sheet,
   named the office way: 26002_BILLING_SHEET_261005.xlsx (project, then the export date as YYMMDD).

   The billing sheet itself is NOT part of this app. It holds STX billing rates, so it is loaded once from the
   phone (Home > Callout billing) and kept in the phone's own storage. Every export starts from that copy,
   overwrites the fill-in cells, and leaves rates, formulas, formatting, logo and protection exactly as they are.

   Layout this code expects (the 2026 "TIME AND MATERIALS SUMMARY" sheet):
     Q3                 job number (26002-009)
     rows 8,10,...,20   work detail: A = date, C = notes                      (7 dates per sheet)
     rows 28-34         labor: A = date, D-U = hours in ST / OT / PD triples
     rows 41-47         equipment hours, columns D-U
     rows 52-61         other / materials: A date, B description, H unit rate, I qty, J unit   (10 lines) */

const BILLING = {
  templateKey: "__billing_template__",
  dateRows: [8, 10, 12, 14, 16, 18, 20],
  laborRows: [28, 29, 30, 31, 32, 33, 34],
  equipRows: [41, 42, 43, 44, 45, 46, 47],
  matRows: [52, 53, 54, 55, 56, 57, 58, 59, 60, 61],
  cols: ["D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U"],
  cell: { jobNumber: "Q3", date: "A", notes: "C", matDesc: "B", matRate: "H", matQty: "I", matUnit: "J" },
  /* callout report class -> [straight time column, overtime column] */
  labor: {
    k_pm: { st: "D", ot: "E", label: "Project Manager" },
    c_foreman: { st: "G", ot: "H", label: "Inspector" },
    c_oper: { st: "P", ot: "Q", label: "Utility Operator" },
    c_labor: { st: "S", ot: "T", label: "Track Laborer" },
  },
};
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const SS_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function billNum(v) {
  const n = parseFloat(String(v == null ? "" : v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function excelDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return null;
  return Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000) + 25569;
}
function colToNum(col) {
  let n = 0;
  for (let i = 0; i < col.length; i += 1) n = n * 26 + (col.charCodeAt(i) - 64);
  return n;
}
function numToCol(n) {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
function splitRef(ref) {
  const m = /^\$?([A-Z]{1,3})\$?(\d+)$/.exec(String(ref).toUpperCase());
  return m ? { col: m[1], row: Number(m[2]) } : null;
}
function monthLabel(month) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month || ""));
  return m ? MONTHS[Number(m[2]) - 1] + " " + m[1] : "";
}

function equipColumn(name) {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return "";
  const hit = EQUIPMENT.find((e) => e.name.toLowerCase() === n);
  if (hit) return hit.col;
  return Object.prototype.hasOwnProperty.call(EQUIP_ALIASES, n) ? EQUIP_ALIASES[n] : "";
}

/* ---------- the billing sheet kept on the phone ---------- */
function getBillingTemplate() {
  return getPhoto(BILLING.templateKey).catch(() => null);
}

async function openBillingZip(blob) {
  if (typeof JSZip === "undefined") throw new Error("The spreadsheet tools did not load. Reload the app and try again.");
  let zip;
  try {
    zip = await JSZip.loadAsync(blob);
  } catch (e) {
    throw new Error("That file is not an Excel .xlsx workbook.");
  }
  const wbFile = zip.file("xl/workbook.xml");
  const relFile = zip.file("xl/_rels/workbook.xml.rels");
  if (!wbFile || !relFile) throw new Error("That file is not an Excel .xlsx workbook.");
  const parser = new DOMParser();
  const wb = parser.parseFromString(await wbFile.async("string"), "application/xml");
  const rels = parser.parseFromString(await relFile.async("string"), "application/xml");
  const sheet = wb.getElementsByTagNameNS(SS_NS, "sheet")[0];
  if (!sheet) throw new Error("That workbook has no sheets.");
  const rid = sheet.getAttribute("r:id") || sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
  let target = "";
  Array.prototype.forEach.call(rels.getElementsByTagName("Relationship"), (rel) => {
    if (rel.getAttribute("Id") === rid) target = rel.getAttribute("Target") || "";
  });
  if (!target) throw new Error("Could not find the worksheet inside that workbook.");
  const sheetPath = target.charAt(0) === "/" ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
  const sheetFile = zip.file(sheetPath);
  if (!sheetFile) throw new Error("Could not find the worksheet inside that workbook.");
  const sstFile = zip.file("xl/sharedStrings.xml");
  const sheetDoc = parser.parseFromString(await sheetFile.async("string"), "application/xml");
  const sstDoc = parser.parseFromString(sstFile
    ? await sstFile.async("string")
    : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="' + SS_NS + '" count="0" uniqueCount="0"/>', "application/xml");
  if (sheetDoc.getElementsByTagName("parsererror").length || sstDoc.getElementsByTagName("parsererror").length) {
    throw new Error("That workbook could not be read.");
  }
  return { zip: zip, sheetPath: sheetPath, sheetDoc: sheetDoc, sstDoc: sstDoc };
}

function sheetAccess(book) {
  const doc = book.sheetDoc;
  const sst = book.sstDoc.documentElement;
  const strings = Array.prototype.map.call(sst.getElementsByTagNameNS(SS_NS, "si"), (si) =>
    Array.prototype.map.call(si.getElementsByTagNameNS(SS_NS, "t"), (t) => t.textContent).join(""));
  const rows = new Map();
  const cells = new Map();
  Array.prototype.forEach.call(doc.getElementsByTagNameNS(SS_NS, "row"), (row) => {
    rows.set(Number(row.getAttribute("r")), row);
    Array.prototype.forEach.call(row.getElementsByTagNameNS(SS_NS, "c"), (c) => cells.set(c.getAttribute("r"), c));
  });
  const child = (c, name) => {
    for (let n = c.firstChild; n; n = n.nextSibling) if (n.localName === name) return n;
    return null;
  };
  function cell(ref) {
    if (cells.has(ref)) return cells.get(ref);
    const at = splitRef(ref);
    const row = rows.get(at.row);
    if (!row) return null;
    const c = doc.createElementNS(SS_NS, "c");
    c.setAttribute("r", ref);
    let before = null;
    for (let n = row.firstChild; n; n = n.nextSibling) {
      const other = n.getAttribute && splitRef(n.getAttribute("r") || "");
      if (other && colToNum(other.col) > colToNum(at.col)) { before = n; break; }
    }
    row.insertBefore(c, before);
    cells.set(ref, c);
    return c;
  }
  function clear(c) {
    ["v", "is"].forEach((name) => { const n = child(c, name); if (n) c.removeChild(n); });
    c.removeAttribute("t");
  }
  function put(c, text) {
    const v = doc.createElementNS(SS_NS, "v");
    v.textContent = text;
    c.appendChild(v);
  }
  function read(ref) {
    const c = cells.get(ref);
    if (!c) return null;
    const v = child(c, "v");
    const t = c.getAttribute("t");
    if (t === "inlineStr") { const is = child(c, "is"); return is ? is.textContent : ""; }
    if (!v) return null;
    if (t === "s") return strings[Number(v.textContent)] || "";
    if (t === "str") return v.textContent;
    if (t === "b") return v.textContent === "1";
    const n = Number(v.textContent);
    return Number.isFinite(n) ? n : v.textContent;
  }
  return {
    cells: cells,
    child: child,
    read: read,
    clear: clear,
    put: put,
    setNumber(ref, n) {
      const c = cell(ref);
      if (!c) return;
      clear(c);
      if (n != null && n !== "" && Number.isFinite(Number(n))) put(c, String(Number(n)));
    },
    setText(ref, text) {
      const c = cell(ref);
      if (!c) return;
      clear(c);
      const clean = String(text == null ? "" : text).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
      if (!clean) return;
      const si = book.sstDoc.createElementNS(SS_NS, "si");
      const t = book.sstDoc.createElementNS(SS_NS, "t");
      t.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
      t.textContent = clean;
      si.appendChild(t);
      sst.appendChild(si);
      strings.push(clean);
      c.setAttribute("t", "s");
      put(c, String(strings.length - 1));
    },
    finishStrings() {
      const total = Number(sst.getAttribute("count") || strings.length);
      sst.setAttribute("uniqueCount", String(strings.length));
      sst.setAttribute("count", String(Math.max(total, strings.length)));
    },
  };
}

function sheetHas(sheet, ref, word) {
  return String(sheet.read(ref) || "").toUpperCase().indexOf(word) >= 0;
}
function looksLikeBillingSheet(sheet) {
  return sheetHas(sheet, "A6", "WORK DETAIL") && sheetHas(sheet, "C7", "NOTES") && sheetHas(sheet, "A23", "LABOR") &&
    sheetHas(sheet, "A36", "EQUIPMENT") && sheetHas(sheet, "B50", "DESCRIPTION") && sheetHas(sheet, "I50", "QTY");
}
function looksLikeOldBillingSheet(sheet) {
  return sheetHas(sheet, "A6", "WORK DETAIL") && sheetHas(sheet, "D7", "NOTES") && sheetHas(sheet, "C50", "DESCRIPTION");
}

async function saveBillingTemplate(file) {
  const book = await openBillingZip(file);
  const sheet = sheetAccess(book);
  if (!looksLikeBillingSheet(sheet)) {
    if (looksLikeOldBillingSheet(sheet)) throw new Error("That is the old billing sheet layout. Load the updated 26002 BILLING SHEET.");
    throw new Error("That workbook is not laid out like the Time and Materials billing sheet.");
  }
  await putPhoto(BILLING.templateKey, file.slice(0, file.size, XLSX_MIME));
  store.settings.billingTemplate = { name: file.name || "billing sheet.xlsx", loadedAt: new Date().toISOString(), layout: 2 };
  save();
}
function billingTemplateCurrent() {
  const t = store.settings.billingTemplate;
  return !!(t && t.layout === 2);
}

/* ---------- small formula calculator ----------
   Excel recalculates when it opens the file. This also stores the results, so the totals show in the
   iPhone preview and in Mail, which only display stored results. It covers what the billing sheet uses:
   + - * /, comparisons, parentheses, text in quotes, cell references, and SUM, SUMPRODUCT and IF. */
function recalcSheet(sheet) {
  const formulas = new Map();
  const shared = new Map();
  sheet.cells.forEach((c, ref) => {
    const f = sheet.child(c, "f");
    if (f && f.getAttribute("t") === "shared" && f.textContent) shared.set(f.getAttribute("si"), { text: f.textContent, at: splitRef(ref) });
  });
  const shift = (text, dRow, dCol) => text.replace(/("[^"]*")|(\$?)([A-Z]{1,3})(\$?)(\d+)/g, (all, str, cAbs, col, rAbs, row) =>
    str ? str : cAbs + (cAbs ? col : numToCol(colToNum(col) + dCol)) + rAbs + (rAbs ? row : String(Number(row) + dRow)));
  sheet.cells.forEach((c, ref) => {
    const f = sheet.child(c, "f");
    if (!f) return;
    if (f.textContent) { formulas.set(ref, f.textContent); return; }
    const master = shared.get(f.getAttribute("si"));
    const at = splitRef(ref);
    if (master && at) formulas.set(ref, shift(master.text, at.row - master.at.row, colToNum(at.col) - colToNum(master.at.col)));
  });
  const memo = new Map();
  const busy = new Set();
  const num = (v) => {
    if (v == null || v === "") return 0;
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error("text in arithmetic");
    return n;
  };
  function value(ref) {
    ref = ref.replace(/\$/g, "");
    if (!formulas.has(ref)) return sheet.read(ref);
    if (memo.has(ref)) return memo.get(ref);
    if (busy.has(ref)) throw new Error("circular");
    busy.add(ref);
    const out = evaluate(formulas.get(ref));
    busy.delete(ref);
    memo.set(ref, out);
    return out;
  }
  function rangeValues(tok) {
    const parts = tok.split(":").map(splitRef);
    const out = [];
    const c1 = Math.min(colToNum(parts[0].col), colToNum(parts[1].col));
    const c2 = Math.max(colToNum(parts[0].col), colToNum(parts[1].col));
    const r1 = Math.min(parts[0].row, parts[1].row);
    const r2 = Math.max(parts[0].row, parts[1].row);
    for (let r = r1; r <= r2; r += 1) for (let c = c1; c <= c2; c += 1) out.push(value(numToCol(c) + r));
    return out;
  }
  function evaluate(text) {
    const tokens = text.match(/"[^"]*"|\d+\.?\d*(?:[eE][+-]?\d+)?|\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?|[A-Z]+(?=\()|<>|<=|>=|[=<>()+\-*\/,]/g) || [];
    if (tokens.join("") !== text.replace(/\s+(?=(?:[^"]*"[^"]*")*[^"]*$)/g, "")) throw new Error("unsupported formula");
    let i = 0;
    const peek = () => tokens[i];
    const take = () => tokens[i++];
    function args() {
      if (take() !== "(") throw new Error("paren");
      const out = [];
      if (peek() === ")") { take(); return out; }
      for (;;) {
        const tok = peek();
        if (tok && tok.indexOf(":") > 0 && (tokens[i + 1] === "," || tokens[i + 1] === ")")) { take(); out.push({ range: rangeValues(tok) }); }
        else out.push({ value: compare() });
        const sep = take();
        if (sep === ")") return out;
        if (sep !== ",") throw new Error("argument");
      }
    }
    function call(name) {
      const a = args();
      if (name === "SUM") {
        let sum = 0;
        a.forEach((x) => (x.range || [x.value]).forEach((v) => { if (typeof v === "number") sum += v; }));
        return sum;
      }
      if (name === "SUMPRODUCT") {
        if (!a.length || a.some((x) => !x.range)) throw new Error("SUMPRODUCT needs ranges");
        let sum = 0;
        for (let k = 0; k < a[0].range.length; k += 1) {
          let p = 1;
          a.forEach((x) => { const v = x.range[k]; p *= typeof v === "number" ? v : 0; });
          sum += p;
        }
        return sum;
      }
      if (name === "IF") {
        const test = a[0] ? a[0].value : false;
        const pick = (typeof test === "string" ? test !== "" : num(test) !== 0) ? a[1] : a[2];
        return pick ? (pick.range ? pick.range[0] : pick.value) : false;
      }
      throw new Error("unsupported function " + name);
    }
    function factor() {
      const t = take();
      if (t == null) throw new Error("unexpected end");
      if (t === "-") return -num(factor());
      if (t === "+") return num(factor());
      if (t === "(") { const v = compare(); if (take() !== ")") throw new Error("paren"); return v; }
      if (t.charAt(0) === '"') return t.slice(1, -1);
      if (/^\d/.test(t)) return Number(t);
      if (/^[A-Z]+$/.test(t)) return call(t);
      if (t.indexOf(":") > 0) throw new Error("bare range");
      return value(t);
    }
    function term() {
      let v = factor();
      while (peek() === "*" || peek() === "/") {
        const op = take();
        const w = factor();
        v = op === "*" ? num(v) * num(w) : num(v) / num(w);
      }
      return v;
    }
    function expr() {
      let v = term();
      while (peek() === "+" || peek() === "-") {
        const op = take();
        const w = term();
        v = op === "+" ? num(v) + num(w) : num(v) - num(w);
      }
      return v;
    }
    function compare() {
      const v = expr();
      const op = peek();
      if (["=", "<>", "<", ">", "<=", ">="].indexOf(op) < 0) return v;
      take();
      const w = expr();
      const blank = (x) => x == null || x === "";
      let a = v;
      let b = w;
      if (typeof a === "string" || typeof b === "string") {
        a = blank(a) ? "" : String(a).toUpperCase();
        b = blank(b) ? "" : String(b).toUpperCase();
      } else { a = num(a); b = num(b); }
      if (op === "=") return a === b;
      if (op === "<>") return a !== b;
      if (op === "<") return a < b;
      if (op === ">") return a > b;
      if (op === "<=") return a <= b;
      return a >= b;
    }
    const out = compare();
    if (i !== tokens.length) throw new Error("trailing");
    return out;
  }
  const results = new Map();
  formulas.forEach((text, ref) => {
    let out;
    try { out = value(ref); } catch (e) { out = undefined; }
    results.set(ref, out);
  });
  results.forEach((out, ref) => {
    const c = sheet.cells.get(ref);
    sheet.clear(c);
    if (typeof out === "number" && Number.isFinite(out)) sheet.put(c, String(Math.round(out * 1e8) / 1e8));
    else if (typeof out === "boolean") { c.setAttribute("t", "b"); sheet.put(c, out ? "1" : "0"); }
    else if (typeof out === "string") { c.setAttribute("t", "str"); sheet.put(c, out); }
  });
  return results;
}

/* ---------- which callouts are on which month's billing ---------- */
function reportFinished(r) {
  return r.status === "sent" || !!r.finishedAt;
}

function billingMonths() {
  const map = new Map();
  list().forEach((r) => {
    if (r.type !== "callout") return;
    const project = String(r.projectNumber || "").trim();
    const month = String(r.date || "").slice(0, 7);
    if (!project || !excelDate(r.date)) return;
    const key = project + "|" + month;
    if (!map.has(key)) map.set(key, { key: key, project: project, month: month, done: [], drafts: [] });
    map.get(key)[reportFinished(r) ? "done" : "drafts"].push(r);
  });
  const groups = Array.from(map.values());
  const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  groups.forEach((g) => {
    g.done.sort(byDate);
    g.drafts.sort(byDate);
    g.record = ((store.settings.billingMonths || {})[g.key]) || null;
    g.changed = !!(g.record && g.done.some((r) => !g.record.ids || g.record.ids.indexOf(r.id) < 0 || (r.updatedAt || "") > g.record.exportedAt));
  });
  groups.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : a.project < b.project ? -1 : 1));
  return groups;
}

/* The job number on the sheet is project-workorder (26002-009). The month's callouts normally share one work order. */
function monthWorkOrder(g) {
  const count = {};
  g.done.forEach((r) => { const wo = pad3(r.calloutNo); if (wo) count[wo] = (count[wo] || 0) + 1; });
  const best = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
  return best || pad3(Number(g.month.slice(5, 7)));
}

function collectBilling(reports) {
  const days = [];
  const byDate = new Map();
  const materials = [];
  const warnings = [];
  let manHours = 0;
  let equipHours = 0;
  reports.forEach((r) => {
    let day = byDate.get(r.date);
    if (!day) {
      day = { date: r.date, notes: [], labor: {}, equip: {}, loose: [] };
      byDate.set(r.date, day);
      days.push(day);
    }
    const summary = String(r.summary || "").trim();
    if (summary) day.notes.push(summary);
    Object.keys(BILLING.labor).forEach((id) => {
      const a = r.q[id] || {};
      const hrs = billNum(a.hrs);
      if (a.a !== "yes" && !hrs) return;
      if (!hrs) { warnings.push(usDate(r.date) + ": " + BILLING.labor[id].label + " is marked Yes with no hours."); return; }
      const col = a.rate === "st" ? BILLING.labor[id].st : BILLING.labor[id].ot;
      day.labor[col] = (day.labor[col] || 0) + hrs;
      manHours += hrs;
    });
    usedEquipment(r).forEach((x) => {
      const hrs = billNum(x.hours) * (billNum(x.qty) || 1);
      const col = equipColumn(x.name);
      if (!hrs) { warnings.push(usDate(r.date) + ": " + x.name + " has no hours."); return; }
      if (!col) {
        day.loose.push(x.name + " " + hrs + " HR");
        warnings.push(usDate(r.date) + ": " + x.name + " is not on the rate sheet. It is noted in that day's work detail.");
        return;
      }
      day.equip[col] = (day.equip[col] || 0) + hrs;
      equipHours += hrs;
    });
    usedMaterials(r).forEach((x) => materials.push({ date: r.date, description: String(x.description).trim(), qty: x.qty, uom: String(x.uom || "").trim() }));
  });
  if (materials.length) warnings.push("Unit rates are blank on the " + materials.length + " material line" + (materials.length === 1 ? "" : "s") + ". The office fills those in.");
  return { days: days, materials: materials, warnings: warnings, manHours: manHours, equipHours: equipHours };
}

function billingFileName(project, part, parts) {
  const d = new Date();
  const ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  return project + "_BILLING_SHEET_" + ymd + (parts > 1 ? "-" + part : "") + ".xlsx";
}

async function fillBillingSheet(templateBlob, jobNumber, days, materials) {
  const book = await openBillingZip(templateBlob);
  const sheet = sheetAccess(book);
  if (!looksLikeBillingSheet(sheet)) throw new Error("The saved billing sheet is not the current layout. Load the updated billing sheet again.");
  const C = BILLING.cell;
  sheet.setText(C.jobNumber, jobNumber);
  BILLING.dateRows.forEach((row, i) => {
    const day = days[i];
    const when = day ? excelDate(day.date) : null;
    sheet.setNumber(C.date + row, when);
    sheet.setNumber(C.date + BILLING.laborRows[i], when);
    let notes = day ? day.notes.join(" ") : "";
    if (day && day.loose.length) notes += (notes ? " " : "") + "[NOT ON RATE SHEET: " + day.loose.join(", ") + "]";
    sheet.setText(C.notes + row, notes.toUpperCase());
    BILLING.cols.forEach((col) => {
      sheet.setNumber(col + BILLING.laborRows[i], day && day.labor[col] ? day.labor[col] : null);
      sheet.setNumber(col + BILLING.equipRows[i], day && day.equip[col] ? day.equip[col] : null);
    });
  });
  BILLING.matRows.forEach((row, i) => {
    const m = materials[i];
    sheet.setNumber(C.date + row, m ? excelDate(m.date) : null);
    sheet.setText(C.matDesc + row, m ? m.description.toUpperCase() : "");
    sheet.setNumber(C.matRate + row, null);
    sheet.setNumber(C.matQty + row, m && String(m.qty || "").trim() !== "" ? billNum(m.qty) : null);
    sheet.setText(C.matUnit + row, m ? m.uom.toUpperCase() : "");
  });
  sheet.finishStrings();
  recalcSheet(sheet);

  const ser = new XMLSerializer();
  const decl = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const xml = (doc) => {
    const s = ser.serializeToString(doc);
    return s.indexOf("<?xml") === 0 ? s : decl + s;
  };
  const flat = { createFolders: false };
  book.zip.file(book.sheetPath, xml(book.sheetDoc), flat);
  book.zip.file("xl/sharedStrings.xml", xml(book.sstDoc), flat);
  /* tell Excel to recalculate everything when the file opens */
  const wbText = await book.zip.file("xl/workbook.xml").async("string");
  let wbOut = wbText;
  if (/<calcPr\b/.test(wbText)) {
    if (!/fullCalcOnLoad=/.test(wbText)) wbOut = wbText.replace(/<calcPr\b/, '<calcPr fullCalcOnLoad="1"');
  } else {
    wbOut = wbText.replace(/<\/workbook>/, '<calcPr fullCalcOnLoad="1"/></workbook>');
  }
  book.zip.file("xl/workbook.xml", wbOut, flat);
  return book.zip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: XLSX_MIME });
}

/* One workbook per 7 callout dates (or 10 material lines); a month with more rolls into a second file. */
async function buildBillingFiles(group) {
  if (!billingTemplateCurrent()) throw new Error("Load the updated billing sheet first.");
  const template = await getBillingTemplate();
  if (!template) throw new Error("Load the billing sheet first.");
  if (!group.done.length) throw new Error("No finished callout reports for " + monthLabel(group.month) + " yet.");
  const data = collectBilling(group.done);
  const jobNumber = group.project + "-" + monthWorkOrder(group);
  const parts = Math.max(1, Math.ceil(data.days.length / BILLING.dateRows.length), Math.ceil(data.materials.length / BILLING.matRows.length));
  const files = [];
  for (let p = 0; p < parts; p += 1) {
    const days = data.days.slice(p * BILLING.dateRows.length, (p + 1) * BILLING.dateRows.length);
    const mats = data.materials.slice(p * BILLING.matRows.length, (p + 1) * BILLING.matRows.length);
    const blob = await fillBillingSheet(template, jobNumber, days, mats);
    const name = billingFileName(group.project, p + 1, parts);
    files.push({ name: name, blob: blob, file: new File([blob], name, { type: XLSX_MIME }) });
  }
  const warnings = data.warnings.slice();
  if (group.drafts.length) {
    warnings.unshift(group.drafts.length + " callout report" + (group.drafts.length === 1 ? " is" : "s are") + " not finished and not on this sheet: " +
      group.drafts.map((r) => usDate(r.date)).join(", ") + ".");
  }
  if (parts > 1) warnings.unshift("More than 7 callout dates this month, so the billing is split across " + parts + " sheets.");
  return {
    key: group.key,
    builtAt: new Date().toISOString(),
    ids: group.done.map((r) => r.id),
    files: files,
    warnings: warnings,
    summary: jobNumber + " · " + data.days.length + (data.days.length === 1 ? " date" : " dates") + ", " +
      data.manHours + " man-hours, " + data.equipHours + " equipment hours, " +
      data.materials.length + (data.materials.length === 1 ? " material line" : " material lines"),
  };
}

/* Remembers what went out, so the month can show "exported" and flag callouts added or changed afterwards. */
function recordBillingExport(result) {
  if (!result) return;
  if (!store.settings.billingMonths || typeof store.settings.billingMonths !== "object") store.settings.billingMonths = {};
  store.settings.billingMonths[result.key] = {
    exportedAt: new Date().toISOString(),
    ids: result.ids,
    files: result.files.map((f) => f.name),
  };
  save();
}
