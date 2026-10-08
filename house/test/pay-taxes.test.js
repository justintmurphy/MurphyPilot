"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const FAKE_NOW = new Date("2026-10-16T15:00:00-04:00");
const root = path.join(__dirname, "..", "..");
const payPath = path.join(__dirname, "fixtures", "example-pay.json");
const taxPath = path.join(__dirname, "fixtures", "example-taxes.json");
const carryPath = path.join(__dirname, "fixtures", "example-taxes-carry.json");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function loadPay() {
  return JSON.parse(fs.readFileSync(payPath, "utf8"));
}

function loadTaxes() {
  return JSON.parse(fs.readFileSync(taxPath, "utf8"));
}

function loadCarry() {
  return JSON.parse(fs.readFileSync(carryPath, "utf8"));
}

function boot() {
  const document = {
    readyState: "complete",
    title: "",
    documentElement: { getAttribute: function () { return "justin"; }, setAttribute: function () {} },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {}
  };
  const sandbox = {
    document: document,
    location: { pathname: "/", hash: "", search: "" },
    console: console,
    fetch: function () { throw new Error("fetch during boot"); },
    Promise: Promise,
    isFinite: isFinite,
    Number: Number,
    String: String,
    Object: Object,
    Array: Array,
    Math: Math,
    JSON: JSON,
    Date: function () { return new Date(FAKE_NOW.getTime()); }
  };
  sandbox.Date.now = function () { return FAKE_NOW.getTime(); };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("house/js/list-cap.js"), sandbox, { filename: "list-cap.js" });
  vm.runInContext(read("house/js/paydesk.js"), sandbox, { filename: "paydesk.js" });
  sandbox.paydeskReset();
  return sandbox;
}

function jsonResponse(status, body) {
  return {
    ok: status === 200,
    status: status,
    json: function () { return Promise.resolve(body); }
  };
}

function decode(raw) {
  return String(raw || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const GLUE_TEXT = /[A-Za-z][$\d]|\d[A-Za-z]{2,}|\S·|·\S/;
const GLUE_BLOCK = {
  div: 1, section: 1, article: 1, ul: 1, ol: 1, li: 1, p: 1,
  h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1,
  table: 1, thead: 1, tbody: 1, tr: 1, td: 1, th: 1,
  header: 1, nav: 1, main: 1, form: 1, button: 1, figure: 1, footer: 1, aside: 1, svg: 1, label: 1,
  select: 1, option: 1
};

function gluedHits(html) {
  const hits = [];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)>|<([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  const tree = { tag: "root", className: "", children: [], parent: null };
  let cur = tree;
  let m;
  function classOf(attrs) {
    const found = /class="([^"]*)"/.exec(attrs || "");
    return found ? found[1] : "";
  }
  while ((m = re.exec(html))) {
    if (m[0].startsWith("<!--")) continue;
    if (m[1]) {
      while (cur && cur.tag !== m[1].toLowerCase() && cur.parent) cur = cur.parent;
      if (cur && cur.parent) cur = cur.parent;
      continue;
    }
    if (m[2]) {
      const el = {
        tag: m[2].toLowerCase(),
        className: classOf(m[3]),
        children: [],
        parent: cur,
        void: /\/\s*$/.test(m[3] || "") || ["br", "img", "hr", "input", "meta", "link"].indexOf(m[2].toLowerCase()) >= 0
      };
      cur.children.push(el);
      if (!el.void) cur = el;
      continue;
    }
    const text = decode(m[4]);
    cur.children.push({ text: text, parent: cur });
    if (text.trim() && GLUE_TEXT.test(text)) hits.push(text.trim().slice(0, 80));
  }
  function inlineJoin(node) {
    let out = "";
    (node.children || []).forEach(function (child) {
      if (child.text != null) { out += child.text; return; }
      if (GLUE_BLOCK[child.tag]) { out += " "; return; }
      out += inlineJoin(child);
    });
    return out;
  }
  function walk(node) {
    if (!node || node.text != null) return;
    const joined = inlineJoin(node);
    if (joined.trim() && GLUE_TEXT.test(joined)) hits.push(node.tag + " " + joined.trim().slice(0, 120));
    (node.children || []).forEach(walk);
  }
  walk(tree);
  return hits;
}

function plainPageText(html) {
  let out = "";
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)>|<([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  const block = {
    div: 1, p: 1, li: 1, section: 1, h1: 1, h2: 1, h3: 1, table: 1, thead: 1, tbody: 1,
    tr: 1, td: 1, th: 1, header: 1, nav: 1, main: 1, article: 1, footer: 1, label: 1,
    select: 1, option: 1, details: 1, summary: 1, button: 1, svg: 1
  };
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith("<!--")) continue;
    if (m[1] && block[m[1].toLowerCase()]) out += "\n";
    else if (m[2] && block[m[2].toLowerCase()]) out += "\n";
    else if (m[4]) out += decode(m[4]);
  }
  return out;
}

function glueCopyHits(text) {
  const hits = [];
  text.split("\n").forEach(function (line) {
    const stripped = line
      .replace(/\([A-Za-z]+-\d+\)/g, " ")
      .replace(/\$[\d,.]*\d\s*k\b/gi, " ")
      .replace(/\(\d+ checks through [^)]+\)/g, " ");
    if (/[A-Za-z)][$\d]|[$\d][A-Za-z)]/.test(stripped)) hits.push(line.trim().slice(0, 160));
    if (/[a-z][A-Z]/.test(line)) hits.push(line.trim().slice(0, 160));
  });
  return hits;
}

function assertCleanGlue(html, label) {
  assert.deepEqual(gluedHits(html), [], label + " inline");
  assert.deepEqual(glueCopyHits(plainPageText(html)), [], label + " copy");
}

function visibleCards(html) {
  return html.split('<details class="fills-more">')[0];
}

function cardCount(html) {
  return (html.match(/data-card="/g) || []).length;
}

test("routes are the exact pay and taxes paths with no trailing slash", async function () {
  const ctx = boot();
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.paydeskUrls)), { pay: "/data/pay", taxes: "/data/taxes" });
  const src = read("house/js/paydesk.js");
  assert.match(src, /var PAY_URL = "\/data\/pay"/);
  assert.match(src, /var TAX_URL = "\/data\/taxes"/);
  assert.doesNotMatch(src, /\/data\/pay\//);
  assert.doesNotMatch(src, /\/data\/taxes\//);
  assert.doesNotMatch(src, /localStorage|sessionStorage/);
  assert.doesNotMatch(src, /Authorization/);
  assert.match(src, /credentials:\s*"same-origin"/);
  assert.match(src, /cache:\s*"no-store"/);
  const calls = [];
  const pay = loadPay();
  await ctx.paydeskLoad("pay", function (url, init) {
    calls.push({ url: url, init: init });
    return Promise.resolve(jsonResponse(200, pay));
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/data/pay");
  assert.equal(calls[0].init.credentials, "same-origin");
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.headers, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(calls[0].init, "Authorization"), false);
  const again = await ctx.paydeskLoad("pay", function () { throw new Error("second fetch"); });
  assert.equal(again.cached, true);
  assert.equal(again.doc.schema, "pay/v1");
  const taxCalls = [];
  const taxes = loadTaxes();
  await ctx.paydeskLoad("taxes", function (url, init) {
    taxCalls.push({ url: url, init: init });
    return Promise.resolve(jsonResponse(200, taxes));
  });
  assert.equal(taxCalls.length, 1);
  assert.equal(taxCalls[0].url, "/data/taxes");
  assert.equal(taxCalls[0].init.credentials, "same-origin");
  assert.equal(taxCalls[0].init.cache, "no-store");
  assert.equal(calls.length, 1);
});

test("a failed read is not kept, and each page fetches only its route", async function () {
  const ctx = boot();
  let payHits = 0;
  let taxHits = 0;
  const denied = await ctx.paydeskLoad("pay", function (url) {
    assert.equal(url, "/data/pay");
    payHits += 1;
    return Promise.resolve(jsonResponse(401, { error: "unauthorized" }));
  });
  assert.equal(denied.gate, "signin");
  await ctx.paydeskLoad("pay", function () {
    payHits += 1;
    return Promise.resolve(jsonResponse(401, { error: "unauthorized" }));
  });
  assert.equal(payHits, 2);
  const bad = await ctx.paydeskLoad("taxes", function (url) {
    assert.equal(url, "/data/taxes");
    taxHits += 1;
    return Promise.resolve(jsonResponse(200, { schema: "nope" }));
  });
  assert.equal(bad.gate, "error");
  await ctx.paydeskLoad("taxes", function () {
    taxHits += 1;
    return Promise.resolve(jsonResponse(200, { schema: "taxes/v1" }));
  });
  assert.equal(taxHits, 2);
  assert.equal(payHits, 2);
});

test("pay and taxes gates cover 401, 403, and 404 not_loaded", async function () {
  const ctx = boot();
  async function gate(kind, status, body) {
    ctx.paydeskReset();
    const out = await ctx.paydeskLoad(kind, function () {
      return Promise.resolve(jsonResponse(status, body));
    });
    return ctx.paydeskGate(kind, out.gate);
  }
  const signin = await gate("pay", 401, { error: "unauthorized" });
  assert.match(signin, /data-gate="401"/);
  assert.match(signin, /one-time passcode/);
  assert.doesNotMatch(signin, /\$\d/);
  const seat = await gate("taxes", 403, { error: "forbidden" });
  assert.match(seat, /data-gate="403"/);
  assert.match(seat, /Not available for this seat/);
  assert.doesNotMatch(seat, /\$\d/);
  const emptyPay = await gate("pay", 404, { error: "not_loaded" });
  assert.match(emptyPay, /data-gate="404"/);
  assert.match(emptyPay, /No pay data loaded yet/);
  assert.doesNotMatch(emptyPay, /\$\d/);
  const emptyTax = await gate("taxes", 404, { error: "not_loaded" });
  assert.match(emptyTax, /No taxes data loaded yet/);
  const other = await gate("pay", 404, { error: "missing" });
  assert.match(other, /data-gate="error"/);
  assert.doesNotMatch(other, /No pay data loaded yet/);
  const down = await gate("pay", 500, { error: "bad_doc" });
  assert.match(down, /data-gate="error"/);
  assert.doesNotMatch(down, /\$\d/);
  assertCleanGlue(signin, "signin");
  assertCleanGlue(emptyPay, "empty pay");
  assertCleanGlue(emptyTax, "empty taxes");
});

test("pay summary is analytics first and agrees on the stub", function () {
  const ctx = boot();
  const doc = loadPay();
  const src = read("house/js/paydesk.js");
  assert.equal(FAKE_NOW.toISOString().slice(0, 10), "2026-10-16");
  assert.doesNotMatch(src, /new Date|Date\.now|localStorage|sessionStorage|Authorization/);
  assert.doesNotMatch(src, /Full year|On the card|Scenario B|kids|spouse pay/i);
  assert.match(src, /\\u2212\$/);
  const html = ctx.paydeskHtml("pay", doc, {});
  assert.match(html, /\u2212\$/);
  const summary = html.split("<details")[0];
  assert.match(summary, /class="bank-view-title"[^>]*>Pay</);
  assert.match(summary, /class="split-two"><div><h2>Salary<\/h2>/);
  assert.match(summary, /<\/div><div><h2>Take-home trend<\/h2>/);
  assert.match(summary, /Latest net/);
  assert.match(summary, /Raises:/);
  assert.match(summary, /Average /);
  assert.match(summary, /vs last year/);
  assert.match(summary, /var\(--mix-d\)/);
  assert.doesNotMatch(read("house/test/fixtures/example-pay.json"), /3800/);
  assert.doesNotMatch(summary, /Pay ·/);
  assert.doesNotMatch(summary, /data-year-pick/);
  assert.match(summary, /\$104,000\.00/);
  assert.match(summary, /\+6\.67%/);
  assert.match(summary, /Take-home trend/);
  assert.match(summary, /class="ov-line-svg"/);
  assert.match(summary, /Where your pay goes/);
  assert.match(summary, /class="mix-svg"/);
  assert.match(summary, /data-basis="stub"/);
  assert.match(summary, /\+\$80,000\.00/);
  assert.match(summary, /Stub through Oct 9, 2026\. % vs last year \(20 checks through Oct 10, 2025\)\./);
  assert.doesNotMatch(summary, /Versus /);
  const where = summary.split('data-card="where"')[1].split("data-card=")[0];
  const center = where.split('class="mix-center"')[1].split("</div>")[0];
  assert.match(center, /\$80\.0k/);
  assert.match(center, /Gross YTD/);
  assert.doesNotMatch(center, /Net/);
  assert.match(where, /class="mix-leg-name">Loan</);
  assert.doesNotMatch(where, /Loan &amp; other/);
  assert.doesNotMatch(where, /Insurance\/HSA &amp; other/);
  assert.match(where, /\+\$51,540\.00/);
  assert.match(summary, /\+6\.65%/);
  assert.match(summary, /\+6\.88%/);
  assert.match(summary, /No employer match shows on recent stubs/);
  assert.doesNotMatch(summary, /understates/);
  assert.doesNotMatch(summary, /Match</);
  assert.equal((summary.match(/data-card="flags"/g) || []).length, 1);
  const flagCard = summary.split('data-card="flags"')[1].split("data-card=")[0];
  assert.equal((flagCard.match(/<tr><td>/g) || []).length, 3);
  assert.doesNotMatch(summary, /Medical\/dental/);
  assert.doesNotMatch(summary, /Life insurance/);
  assert.match(html, /Medical\/dental/);
  assert.match(html, /data-card="year"/);
  assert.match(html, /<label>Year <select data-year-pick="pay">/);
  const yearRow = html.split('data-year="2026"')[1].split("</tr>")[0];
  assert.match(yearRow, /\+\$80,000\.00/);
  assert.match(yearRow, /\u2212\$17,360\.00/);
  assert.match(yearRow, /\+\$51,540\.00/);
  assert.match(yearRow, /<span class="sub">partial<\/span>/);
  assert.doesNotMatch(yearRow, /partial ·|on file|Last check|\$100,000|\$21,413|\$64,736/);
  assert.doesNotMatch(html, /Full year/);
  assert.doesNotMatch(html, /On the card/);
  const loan = doc.checks.find(function (c) { return c.id === "c005"; }).lines.find(function (line) {
    return line.code === "loan_401k";
  });
  assert.equal(loan.ytd, loan.current);
  const fica = doc.checks.find(function (c) { return c.gross === 4000; });
  assert.equal(fica.buckets.fica_ss, 238.7);
  assertCleanGlue(html, "pay");
});

test("a missing stub keeps year-to-date and by-year on the same figures", function () {
  const ctx = boot();
  const doc = loadPay();
  doc.ytd.this_year = null;
  const html = ctx.paydeskHtml("pay", doc, {});
  const ytd = html.split('data-card="ytd"')[1].split('data-card=')[0];
  const row = html.split('data-year="2026"')[1].split("</tr>")[0];
  assert.match(ytd, /data-basis="file"/);
  assert.match(ytd, /\+\$100,000\.00/);
  assert.match(row, /\+\$100,000\.00/);
  assert.doesNotMatch(ytd, /\+\$80,000\.00/);
  assert.doesNotMatch(row, /\+\$80,000\.00/);
  assert.match(ytd, /partial · 3 checks on file/);
});

test("opened check lines sit outside the checks list cap", function () {
  const ctx = boot();
  const doc = loadPay();
  const seed = doc.checks.filter(function (c) { return String(c.pay_date).indexOf("2026") === 0; });
  const extra = [];
  for (let i = 0; i < 12; i++) {
    extra.push(Object.assign({}, seed[0], { id: "x" + i, pay_date: "2026-02-" + String(i + 1).padStart(2, "0") }));
  }
  doc.checks = doc.checks.concat(extra);
  const closed = ctx.paydeskHtml("pay", doc, { detailsOpen: true, openCheckId: "" });
  assert.match(closed, /class="list-cap"/);
  assert.doesNotMatch(closed, /data-check-lines/);
  assert.doesNotMatch(closed, /data-card="latest"/);
  const html = ctx.paydeskHtml("pay", doc, { detailsOpen: true, openCheckId: "c005" });
  const cap = html.split('aria-label="Checks"')[1].split("</div>")[0];
  assert.doesNotMatch(cap, /data-check-lines|Medical\/dental/);
  assert.match(html, /data-check-lines="c005"/);
  assert.match(html, /class="on"/);
  assert.match(html, />Latest</);
  assert.match(html, /Pre-tax/);
  assert.match(html, /Post-tax/);
  assert.match(html, /401\(k\) loan repayment/);
  const lines = html.split('data-check-lines="c005"')[1].split('data-card=')[0];
  assert.doesNotMatch(lines, /\$0\.00/);
  assertCleanGlue(html, "open check");
});

test("a past pay year stays partial", function () {
  const ctx = boot();
  const html = ctx.paydeskHtml("pay", loadPay(), { year: 2025, detailsOpen: true });
  assert.match(html, /data-basis="file"/);
  assert.match(html, /partial · 2 checks on file/);
  const pastRow = html.split('data-year="2025"')[1].split("</tr>")[0];
  assert.match(pastRow, /<span class="sub">partial<\/span>/);
  assert.doesNotMatch(pastRow, /partial ·|on file|Last check/);
  const byYear = html.split('data-card="by-year"')[1].split("data-card=")[0];
  assert.doesNotMatch(byYear, /Last check of /);
  assert.doesNotMatch(html, /Full year/);
  assert.match(html, /data-check-id="c002"/);
  assert.match(html, /data-check-id="c001"/);
  assert.doesNotMatch(html, /data-check-id="c005"/);
  assertCleanGlue(html, "pay 2025");
});

test("where your pay goes opens that group's lines", function () {
  const ctx = boot();
  const closed = ctx.paydeskHtml("pay", loadPay(), {});
  assert.doesNotMatch(closed.split("<details")[0], /Social Security/);
  const html = ctx.paydeskHtml("pay", loadPay(), { openGroup: "taxes" });
  const where = html.split('data-card="where"')[1].split('data-card=')[0];
  assert.match(where, /Social Security/);
  assert.match(where, /\u2212\$238\.70/);
  assert.doesNotMatch(where, /401\(k\) loan repayment/);
  assertCleanGlue(html, "group");
});

test("taxes summary uses payload labels and the base flag", function () {
  const ctx = boot();
  const doc = loadTaxes();
  const src = read("house/js/paydesk.js");
  assert.doesNotMatch(src, /spouse_income|car_loan_deduction/);
  const html = ctx.paydeskHtml("taxes", doc, {});
  const summary = html.split("<details")[0];
  assert.match(summary, /class="bank-view-title"[^>]*>Taxes</);
  assert.doesNotMatch(summary, /Taxes ·/);
  assert.doesNotMatch(summary, /data-year-pick/);
  assert.match(summary, /2026 estimate/);
  assert.match(summary, /\+\$4,436\.00/);
  assert.match(summary, /Projected tax/);
  assert.match(summary, /Withheld/);
  assert.match(summary, /Base: no extra needed\./);
  const nets = doc.estimate.scenarios.map(function (row) { return Number(row.refund_or_owed); });
  function whole(n) {
    const v = Math.round(n);
    const abs = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (v < 0) return "\u2212$" + abs;
    if (v > 0) return "+$" + abs;
    return "$0";
  }
  const rangeLine = "Range " + whole(Math.min.apply(null, nets)) + " to " + whole(Math.max.apply(null, nets)) + " across scenarios. Base: no extra needed.";
  assert.ok(summary.includes(rangeLine), rangeLine);
  const rangeHint = (summary.match(/<p class="hint">Range [^<]*<\/p>/) || [""])[0];
  assert.doesNotMatch(rangeHint, /\+\$4,436\.00/);
  assert.doesNotMatch(rangeHint, /−\$2,000\.00/);
  assert.match(summary, /Refund vs base/);
  assert.doesNotMatch(summary, /Versus base/);
  assert.doesNotMatch(summary, /Extra per check needed/);
  const estimate = summary.split('data-card="estimate"')[1].split("data-card=")[0];
  assert.doesNotMatch(estimate, />Federal</);
  assert.doesNotMatch(estimate, />State</);
  assert.doesNotMatch(estimate, />Local</);
  assert.match(summary, /class="split-two"><div><h2>Refund or owed<\/h2>/);
  assert.match(summary, /<\/div><div><h2>Energy credit left for 2026<\/h2>/);
  const barsSvg = summary.split('aria-label="Refund or owed by year"')[1].split("</svg>")[0];
  assert.doesNotMatch(barsSvg, /Eff\. rate/);
  assert.match(summary, /Eff\. rate /);
  const base = doc.estimate.scenarios.find(function (row) { return row.is_base; });
  const others = doc.estimate.scenarios.filter(function (row) { return !row.is_base; });
  assert.ok(base);
  assert.equal(others.length, 2);
  others.forEach(function (row) {
    assert.match(summary, new RegExp('class="sym">' + row.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "<"));
  });
  assert.doesNotMatch(summary, new RegExp('class="sym">' + base.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "<"));
  assert.match(summary, /class="axis-svg"/);
  assert.match(summary, /Energy credit left for 2026/);
  assert.match(summary, /data-card="energy"[\s\S]{0,240}—/);
  const more = ctx.paydeskHtml("taxes", doc, { detailsOpen: true });
  assert.match(more, /<label>Year <select data-year-pick="taxes">/);
  assert.match(more, />Withheld</);
  const y2025 = more.split('data-tax-year="2025"')[1].split("</tr>")[0];
  const amended = doc.flags.find(function (flag) { return flag.kind === "amended" && flag.year === 2025; });
  const filed = doc.years.find(function (row) { return row.year === 2025; });
  const withheld = "$" + Number(filed.payments.withholding).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert.match(y2025, /class="on"/);
  assert.match(y2025, /2025\*/);
  assert.match(more, /\* amended return/);
  assert.doesNotMatch(y2025, /Selected/);
  assert.doesNotMatch(y2025, /amended return/);
  assert.doesNotMatch(y2025, new RegExp(amended.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(more, new RegExp(amended.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(y2025, new RegExp(withheld.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assertCleanGlue(html, "taxes");
  assertCleanGlue(more, "taxes more");
});

test("a single scenario omits the range and the Scenarios card", function () {
  const ctx = boot();
  assert.equal(FAKE_NOW.toISOString().slice(0, 10), "2026-10-16");
  const doc = loadTaxes();
  const base = doc.estimate.scenarios.find(function (row) { return row.is_base; });
  doc.estimate.scenarios = [base];
  const html = ctx.paydeskHtml("taxes", doc, {});
  const summary = html.split("<details")[0];
  const estimate = summary.split('data-card="estimate"')[1].split("data-card=")[0];
  assert.match(estimate, /<span>Refund<\/span>/);
  assert.match(estimate, /<p class="hint">No extra needed\.<\/p>/);
  assert.doesNotMatch(estimate, /Range /);
  assert.doesNotMatch(estimate, /across scenarios/);
  assert.doesNotMatch(html, /data-card="scenarios"/);
  assert.doesNotMatch(html, /<h2>Scenarios<\/h2>/);
  assertCleanGlue(html, "one scenario");
});

test("two scenarios with the same refund omit the range", function () {
  const ctx = boot();
  assert.equal(FAKE_NOW.toISOString().slice(0, 10), "2026-10-16");
  const doc = loadTaxes();
  const base = doc.estimate.scenarios.find(function (row) { return row.is_base; });
  const other = doc.estimate.scenarios.find(function (row) { return !row.is_base; });
  base.refund_or_owed = 1500;
  other.refund_or_owed = 1500;
  doc.estimate.scenarios = [base, other];
  const html = ctx.paydeskHtml("taxes", doc, {});
  const estimate = html.split('data-card="estimate"')[1].split("data-card=")[0];
  assert.match(estimate, /<p class="hint">No extra needed\.<\/p>/);
  assert.doesNotMatch(estimate, /Range /);
  assert.doesNotMatch(estimate, /across scenarios/);
  assert.doesNotMatch(estimate, /\$1,500/);
  assertCleanGlue(html, "equal scenarios");
});

test("two scenarios with different refunds show the range", function () {
  const ctx = boot();
  assert.equal(FAKE_NOW.toISOString().slice(0, 10), "2026-10-16");
  const doc = loadTaxes();
  const base = doc.estimate.scenarios.find(function (row) { return row.is_base; });
  const other = doc.estimate.scenarios.find(function (row) { return !row.is_base; });
  base.refund_or_owed = 1200;
  other.refund_or_owed = 3400;
  doc.estimate.scenarios = [base, other];
  const html = ctx.paydeskHtml("taxes", doc, {});
  const estimate = html.split('data-card="estimate"')[1].split("data-card=")[0];
  assert.match(estimate, /Range \+\$1,200 to \+\$3,400 across scenarios\. Base: no extra needed\./);
  assert.match(html, /data-card="scenarios"/);
  assertCleanGlue(html, "two scenarios");
});

test("energy carryforward remaining renders when it is a number", function () {
  const ctx = boot();
  const blank = loadTaxes();
  blank.credits.energy_carryforward_remaining = null;
  assert.match(ctx.paydeskHtml("taxes", blank, {}), /data-card="energy"[\s\S]{0,240}—/);
  const zero = loadTaxes();
  zero.credits.energy_carryforward_remaining = 0;
  assert.match(ctx.paydeskHtml("taxes", zero, {}), /data-card="energy"[\s\S]{0,240}\$0\.00/);
  const carry = loadCarry();
  assert.equal(carry.credits.energy_carryforward_remaining, 300);
  const html = ctx.paydeskHtml("taxes", carry, {});
  assert.match(html, /data-card="energy"[\s\S]{0,240}\+\$300\.00/);
  assert.doesNotMatch(html, /data-card="energy"[\s\S]{0,240}—/);
});

test("salary axis ticks run from the first stub date to the latest", function () {
  const ctx = boot();
  const src = read("house/js/paydesk.js");
  assert.doesNotMatch(src, /Sep 2025|Dec 2025|Jan 2026|Mar 2024|Aug 2026/);
  const doc = loadPay();
  const liveSvg = ctx.paydeskHtml("pay", doc, {}).split('aria-label="Salary by year"')[1].split("</svg>")[0];
  const liveTicks = Array.from(liveSvg.matchAll(/fill="var\(--ink-soft\)"[^>]*>([^<]+)/g)).map(function (m) { return m[1]; });
  assert.deepEqual(liveTicks, ["Sep 2025", "Oct 2026"]);
  assert.match(liveSvg, /L352\.0 /);
  doc.salary.history[0].effective = "2024-11-01";
  doc.salary.history[0].first_pay_date = "2024-03-15";
  doc.salary.history[1].effective = "2025-12-15";
  doc.salary.history[1].first_pay_date = "2026-08-02";
  doc.salary.history.reverse();
  const svg = ctx.paydeskHtml("pay", doc, {}).split('aria-label="Salary by year"')[1].split("</svg>")[0];
  const ticks = Array.from(svg.matchAll(/fill="var\(--ink-soft\)"[^>]*>([^<]+)/g)).map(function (m) { return m[1]; });
  assert.deepEqual(ticks, ["Mar 2024", "Oct 2026"]);
  assert.match(svg, /L352\.0 /);
  assert.doesNotMatch(svg, /Nov 2024|Dec 2025/);
});

test("the last salary step reaches the latest stub date", function () {
  const ctx = boot();
  assert.equal(FAKE_NOW.toISOString().slice(0, 10), "2026-10-16");
  const doc = loadPay();
  const hist = doc.salary.history.slice().sort(function (a, b) {
    return String(a.first_pay_date || a.effective).localeCompare(String(b.first_pay_date || b.effective));
  });
  const start = hist[0].first_pay_date || hist[0].effective;
  const raise = hist[hist.length - 1].first_pay_date || hist[hist.length - 1].effective;
  const stub = doc.checks.map(function (c) { return String(c.pay_date); }).sort().pop();
  assert.ok(stub > raise);
  function dayIndex(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return Number(m[1]) * 372 + Number(m[2]) * 31 + Number(m[3]);
  }
  const plotW = 360 - 8 - 8;
  function xAt(iso) {
    const t = (dayIndex(iso) - dayIndex(start)) / (dayIndex(stub) - dayIndex(start));
    return (8 + t * plotW).toFixed(1);
  }
  const raiseX = xAt(raise);
  const stubX = xAt(stub);
  assert.notEqual(raiseX, stubX);
  const html = ctx.paydeskHtml("pay", doc, {});
  const svg = html.split('aria-label="Salary by year"')[1].split("</svg>")[0];
  const d = /<path d="([^"]+)"/.exec(svg)[1];
  const pts = d.split(/[ML]/).filter(Boolean).map(function (pair) {
    const bits = pair.trim().split(/\s+/);
    return { x: bits[0], y: bits[1] };
  });
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  assert.equal(end.x, stubX);
  assert.equal(prev.x, raiseX);
  assert.equal(end.y, prev.y);
  const ticks = Array.from(svg.matchAll(/fill="var\(--ink-soft\)"[^>]*>([^<]+)/g)).map(function (m) { return m[1]; });
  assert.equal(ticks[ticks.length - 1], "Oct 2026");
  assert.notEqual(ticks[ticks.length - 1], "Jan 2026");
  assertCleanGlue(html, "salary stub");
});

test("donut center compacts millions and an extra check uses the extra line", function () {
  const ctx = boot();
  const pay = loadPay();
  const stub = pay.ytd.this_year;
  const k = stub.k401;
  const slices = Number(stub.taxes) + Number(k.employee_total) +
    (Number(stub.pretax) - Number(k.pretax || 0)) +
    (Number(stub.posttax) - Number(k.roth || 0) - Number(k.aftertax || 0));
  stub.gross = 2500000;
  stub.net = 2500000 - slices;
  const where = ctx.paydeskHtml("pay", pay, {}).split('data-card="where"')[1].split("data-card=")[0];
  const center = where.split('class="mix-center"')[1].split("</div>")[0];
  assert.match(center, /\$2\.5M/);
  assert.match(center, /Gross YTD/);
  assert.doesNotMatch(center, /Net/);
  assert.doesNotMatch(where, /\+\$2,500,000\.00/);
  const thin = loadPay();
  thin.ytd.this_year.posttax = 4050;
  const thinWhere = ctx.paydeskHtml("pay", thin, {}).split('data-card="where"')[1].split("data-card=")[0];
  assert.match(thinWhere, /<1%/);
  const taxes = loadTaxes();
  taxes.estimate.federal.extra_per_check_to_break_even = 400;
  const estimate = ctx.paydeskHtml("taxes", taxes, {}).split('data-card="estimate"')[1].split("data-card=")[0];
  assert.match(estimate, /Base: extra per check \$400\.00\./);
  assert.doesNotMatch(estimate, /Base: no extra needed/);
});

test("year to date matches the latest stub and compares an equal check count", function () {
  const ctx = boot();
  const doc = loadPay();
  const src = read("house/js/paydesk.js");
  assert.doesNotMatch(src, /2025-10-10|Oct 10, 2025/);
  function countOf(check) {
    return Math.round(Number(check.ytd.gross) / Number(check.gross));
  }
  const latest = doc.checks.slice().sort(function (a, b) {
    return String(b.pay_date).localeCompare(String(a.pay_date));
  })[0];
  const count = countOf(latest);
  const year = Number(String(latest.pay_date).slice(0, 4));
  const prior = doc.checks.filter(function (c) {
    return Number(String(c.pay_date).slice(0, 4)) === year - 1 && countOf(c) === count;
  }).sort(function (a, b) {
    return String(b.pay_date).localeCompare(String(a.pay_date));
  })[0];
  assert.ok(prior);
  assert.equal(countOf(prior), count);
  const ytd = doc.ytd.this_year;
  assert.equal(ytd.gross, latest.ytd.gross);
  assert.equal(ytd.taxes, latest.ytd.taxes);
  assert.equal(ytd.net, latest.ytd.net);
  assert.equal(ytd.posttax, latest.ytd.posttax);
  assert.equal(ytd.checks, count);
  assert.equal(doc.ytd.last_year_same_point.checks, count);
  assert.equal(doc.ytd.last_year_same_point.gross, prior.ytd.gross);
  assert.equal(doc.ytd.last_year_same_point.net, prior.ytd.net);
  function lineYtd(code) {
    return Number(latest.lines.find(function (row) { return row.code === code; }).ytd);
  }
  assert.equal(ytd.k401.employee_total, lineYtd("k401_pretax") + lineYtd("k401_roth"));
  const posttax = latest.lines.filter(function (line) { return line.section === "posttax"; }).reduce(function (n, line) {
    return n + Number(line.ytd);
  }, 0);
  assert.equal(posttax, latest.ytd.posttax);
  assert.equal(latest.ytd.net, latest.ytd.gross - latest.ytd.taxes - latest.ytd.pretax - latest.ytd.posttax);
  doc.by_year.forEach(function (row) {
    const onFile = doc.checks.filter(function (c) {
      return String(c.pay_date).indexOf(String(row.year)) === 0;
    }).length;
    assert.equal(row.checks, onFile);
  });
  function shown(now, then) {
    const pct = ((Number(now) - Number(then)) / Math.abs(Number(then))) * 100;
    const abs = Math.abs(pct).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return (pct < 0 ? "\u2212" : "+") + abs + "%";
  }
  const card = ctx.paydeskHtml("pay", doc, {}).split('data-card="ytd"')[1].split("data-card=")[0];
  assert.match(card, /\+\$80,000\.00/);
  assert.match(card, /\u2212\$17,360\.00/);
  assert.match(card, /\u2212\$8,000\.00/);
  assert.match(card, /\+\$51,540\.00/);
  assert.match(card, new RegExp(count + " checks through "));
  [shown(latest.ytd.gross, prior.ytd.gross), shown(latest.ytd.taxes, prior.ytd.taxes), shown(latest.ytd.net, prior.ytd.net)].forEach(function (text) {
    assert.ok(card.includes(text), text);
  });
  const details = ctx.paydeskHtml("pay", doc, { detailsOpen: true });
  const yearRow = details.split('data-year="2026"')[1].split("</tr>")[0];
  assert.match(yearRow, /<span class="sub">partial<\/span>/);
  assert.match(yearRow, new RegExp("<td class=\"num\">" + count + "</td>"));
  assert.doesNotMatch(yearRow, /partial ·/);
  assert.doesNotMatch(details.split('data-card="by-year"')[1], /Last check of /);
  assert.match(yearRow, /\+\$80,000\.00/);
  assert.match(yearRow, /\+\$51,540\.00/);
});

test("more details shows the latest check once, as the open row", function () {
  const html = boot().paydeskHtml("pay", loadPay(), { detailsOpen: true });
  const more = html.split("<details")[1];
  assert.equal((more.match(/Oct 9, 2026/g) || []).length, 1);
  assert.doesNotMatch(html, /data-card="latest"/);
  assert.doesNotMatch(html, /Latest check/);
  assert.match(more, /data-check-id="c005"[^>]*class="on"/);
  assert.match(more, />Latest</);
});

test("a spouse scenario withholds at least the base and the desk prints payload withholding", function () {
  const src = read("house/js/paydesk.js");
  assert.doesNotMatch(src, /total_tax\s*-\s*[^\n;]*refund/);
  function spouseOf(doc) {
    const base = doc.estimate.scenarios.find(function (row) { return row.is_base; });
    const spouse = doc.estimate.scenarios.find(function (row) { return row.spouse_income; });
    assert.ok(base && spouse);
    assert.ok(spouse.withholding >= base.withholding);
    return spouse;
  }
  spouseOf(loadTaxes());
  spouseOf(loadCarry());
  const doc = loadTaxes();
  const row = doc.estimate.scenarios.find(function (item) { return item.spouse_income; });
  row.withholding = 12345.67;
  const html = boot().paydeskHtml("taxes", doc, {});
  assert.match(html, /\$12,345\.67/);
  const derived = Math.round((Number(row.total_tax) - Number(row.refund_or_owed)) * 100) / 100;
  assert.notEqual(row.withholding, derived);
});

test("pay and taxes load the stylesheet that defines .bank-view-title", function () {
  function linkedSheets(rel) {
    const html = read(rel);
    return (html.match(/<link\b[^>]*>/g) || []).map(function (tag) {
      if (!/rel="stylesheet"/.test(tag)) return "";
      const href = /href="([^"]+)"/.exec(tag);
      return href ? href[1].split("?")[0] : "";
    }).filter(Boolean);
  }
  function defines(href, seen) {
    if (!href || seen[href]) return false;
    seen[href] = true;
    const file = href.replace(/^\//, "");
    let css = "";
    try { css = read(file); } catch (e) { return false; }
    if (/\.bank-view-title\s*\{/.test(css)) return true;
    const dir = file.split("/").slice(0, -1).join("/");
    const imports = [];
    const re = /@import\s+url\("([^"]+)"\)/g;
    let m;
    while ((m = re.exec(css))) {
      const next = m[1].split("?")[0];
      imports.push(next.charAt(0) === "/" ? next : "/" + dir + "/" + next);
    }
    return imports.some(function (next) { return defines(next, seen); });
  }
  ["pay/index.html", "taxes/index.html"].forEach(function (rel) {
    assert.ok(linkedSheets(rel).some(function (href) { return defines(href, {}); }), rel);
  });
});

test("list cap is position relative and pages bust caches together", function () {
  const css = read("house/list-cap.css");
  assert.equal((css.match(/position:\s*relative/g) || []).length, 1);
  ["pay/index.html", "taxes/index.html"].forEach(function (rel) {
    const html = read(rel);
    assert.match(html, /\/js\/nav\.js\?v=20261007ep/);
    assert.match(html, /\/house\/ticker\.css\?v=20261007ei/);
    assert.match(html, /\/house\/js\/ticker\.js\?v=20261007ei/);
    assert.match(html, /\/house\/js\/paydesk\.js\?v=20261007en/);
    assert.doesNotMatch(html, /paydesk\.js\?v=20261007em/);
    assert.match(html, /\/house\/js\/banking\.js\?v=20261008ey/);
    assert.match(html, /\/house\/house\.css\?v=20261008ex/);
    assert.match(html, /list-cap\.js\?v=20261007eh/);
    assert.match(html, /id="clock"/);
    assert.match(html, /id="mp-ticker"/);
    assert.doesNotMatch(html, /class="theme-switch"/);
    assert.doesNotMatch(html, /Agentic \/ AI WWIII only/);
  });
  assert.match(read("investments/index.html"), /\/js\/nav\.js\?v=20261007ep/);
  assert.match(read("js/nav.js"), /function tickClock/);
  assert.doesNotMatch(read("house/js/banking.js"), /function bankTickClock/);
});

test("pay and taxes number and control rules stay off Investments", function () {
  const css = read("house/house-b.css");
  assert.match(css, /\.paydesk table\.book td\.num,\s*\n\.paydesk table\.book th\.num \{\s*\n\s*white-space:\s*nowrap;/);
  assert.doesNotMatch(css, /table\.book td\.num,\s*\ntable\.book th\.num \{[^}]*white-space:\s*nowrap/s);
  assert.match(css, /\.paydesk input,\s*\n\.paydesk textarea,\s*\n\.paydesk select \{\s*\n\s*min-height:\s*44px;/);
  assert.doesNotMatch(css, /(?:^|\n)input,\s*\ntextarea,\s*\nselect \{[^}]*min-height:\s*44px/s);
  assert.match(css, /table\.book tr\.on \{\s*\n\s*background:\s*var\(--row\);/);
  assert.match(css, /table\.book tr\.on td:first-child \{\s*\n\s*box-shadow:\s*inset 3px 0 0 var\(--nav-line\);/);
  assert.match(css, /\.paydesk tr\[data-check-id\],\s*\n\.paydesk tr\[data-scenario\] \{ cursor: pointer; \}/);
  assert.doesNotMatch(css, /(?:^|\n)tr\[data-check-id\],/);
  const tape = css.split("button.tape-row.on")[1].split("}")[0];
  assert.doesNotMatch(tape, /tr\[/);
  ["pay/index.html", "taxes/index.html"].forEach(function (rel) {
    assert.match(read(rel), /class="desk paydesk"/);
  });
  assert.doesNotMatch(read("investments/index.html"), /paydesk/);
});

test("house.css and banking.js share one cache bust", function () {
  const houseVersion = "20261008ex";
  const bankVersion = "20261008ey";
  const pages = ["index.html", "investments/index.html", "pay/index.html", "taxes/index.html"];
  const house = new Set();
  const banking = new Set();
  pages.forEach(function (rel) {
    const html = read(rel);
    const houseRef = /house\.css\?v=([^"]+)/.exec(html);
    const bankRef = /banking\.js\?v=([^"]+)/.exec(html);
    assert.ok(houseRef, rel + " house.css");
    house.add(houseRef[1]);
    if (rel === "investments/index.html") assert.equal(bankRef, null);
    else {
      assert.ok(bankRef, rel + " banking.js");
      banking.add(bankRef[1]);
    }
  });
  assert.deepEqual(Array.from(house), [houseVersion]);
  assert.deepEqual(Array.from(banking), [bankVersion]);
  assert.match(read("house/house.css"), /house-b\.css\?v=20261007ei/);
  assert.doesNotMatch(read("index.html") + read("pay/index.html") + read("taxes/index.html"), /banking\.js\?v=(?!20261008ey)/);
});

test("banking menu links Pay and Taxes on absolute paths", function () {
  const nav = read("js/nav.js");
  assert.match(nav, /label: "Pay", href: "\/pay\/"/);
  assert.match(nav, /label: "Taxes", href: "\/taxes\/"/);
  assert.match(nav, /section === "investments"/);
  ["pay/index.html", "taxes/index.html"].forEach(function (rel) {
    const html = read(rel);
    assert.match(html, /data-section="banking"/);
    assert.doesNotMatch(html, /href="pay\/"|href="taxes\/"|href="\.\./);
    assert.doesNotMatch(html, /@/);
    assert.doesNotMatch(html, /\d{12,}/);
  });
});
