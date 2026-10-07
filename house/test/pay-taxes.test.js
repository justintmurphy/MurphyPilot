"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const payPath = path.join(__dirname, "fixtures", "example-pay.json");
const taxPath = path.join(__dirname, "fixtures", "example-taxes.json");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function loadPay() {
  return JSON.parse(fs.readFileSync(payPath, "utf8"));
}

function loadTaxes() {
  return JSON.parse(fs.readFileSync(taxPath, "utf8"));
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
    Date: function () { throw new Error("clock"); }
  };
  sandbox.Date.now = function () { throw new Error("clock"); };
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
    select: 1, option: 1, details: 1, summary: 1
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
    if (/[A-Za-z)][$\d]|[$\d][A-Za-z)]/.test(line)) hits.push(line.trim().slice(0, 160));
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

test("pay summary renders the example fixture without check lines", function () {
  const ctx = boot();
  const doc = loadPay();
  const html = ctx.paydeskHtml("pay", doc, {});
  assert.match(html, /Pay · 2026/);
  assert.match(html, /data-year-pick="pay"/);
  assert.match(html, /Oct 9, 2026/);
  assert.match(html, /Regular/);
  assert.match(html, /\+\$4,000\.00/);
  assert.equal(html.split("+$2,482.00").length - 1, 1);
  ["Federal", "Social Security", "Medicare", "State", "Local", "401(k) pre-tax", "401(k) after-tax", "401(k) Roth", "Insurance / HSA", "401(k) loan", "Other"].forEach(function (label) {
    assert.match(html, new RegExp(label.replace(/[()]/g, "\\$&")));
  });
  assert.match(html, /-\$400\.00/);
  assert.match(html, /-\$100\.00/);
  assert.match(html, /\+\$80,000\.00/);
  assert.match(html, /-\$17,360\.00/);
  assert.match(html, /-\$1,200\.00/);
  assert.match(html, /\+\$49,640\.00/);
  assert.match(html, /\+12\.28%/);
  assert.match(html, /\+12\.26%/);
  assert.match(html, /\+8\.36%/);
  assert.equal(html.split("On stub understates the match.").length - 1, 1);
  assert.match(html, /Match on stub/);
  assert.match(html, /\$0\.00/);
  assert.match(html, />5%</);
  assert.match(html, /After-tax<\/span> <b>—<\/b>/);
  const dates = ["Oct 9, 2026", "Sep 25, 2026", "Jan 2, 2026"];
  let at = -1;
  dates.forEach(function (d) {
    const next = html.indexOf(d, at + 1);
    assert.ok(next > at, d);
    at = next;
  });
  assert.doesNotMatch(html, /Life insurance \(imputed\)/);
  assert.doesNotMatch(html, /\$71,250\.00/);
  assert.match(html, /<details class="fills-more">/);
  assert.doesNotMatch(html, /<details class="fills-more"[^>]*open/);
  assert.match(html, /class="split-two"/);
  assert.equal(cardCount(visibleCards(html)), 4);
  assert.equal(cardCount(html.split('<details class="fills-more">')[1]), 3);
  assert.match(html, /\$104,000\.00/);
  assert.match(html, /\+6\.67%/);
  assert.match(html, /Federal W-4 settings changed/);
  assert.match(html, /Raise \+6\.7%/);
  assert.equal(html.split("+$12,000.00").length - 1, 1);
  assertCleanGlue(html, "pay");
});

test("check lines render only after that row is opened and stay capped at ten", function () {
  const ctx = boot();
  const doc = loadPay();
  const closed = ctx.paydeskHtml("pay", doc, {});
  assert.doesNotMatch(closed, /data-check-lines=/);
  assert.doesNotMatch(closed, /Showing 10 of/);
  const latest = doc.checks.filter(function (c) { return c.id === "c005"; })[0];
  assert.ok(latest.lines.length > 10);
  const open = ctx.paydeskHtml("pay", doc, { openCheckId: "c005" });
  assert.match(open, /data-check-lines="c005"/);
  assert.match(open, /Life insurance \(imputed\)/);
  assert.match(open, /loan repayment/);
  assert.match(open, new RegExp("Showing 10 of " + latest.lines.length));
  assert.match(open, /class="list-cap"/);
  assert.doesNotMatch(open, /data-check-lines="c001"/);
  assert.doesNotMatch(open, /\$71,250\.00/);
  assert.match(open, /aria-expanded="true"/);
  assertCleanGlue(open, "pay lines");
});

test("a past pay year uses that year's check and does not repeat its rollup", function () {
  const ctx = boot();
  const html = ctx.paydeskHtml("pay", loadPay(), { year: 2025 });
  assert.match(html, /Pay · 2025/);
  assert.match(html, /Oct 10, 2025/);
  assert.match(html, /data-check-id="c002"/);
  assert.match(html, /data-check-id="c001"/);
  assert.doesNotMatch(html, /data-check-id="c005"|data-check-id="c004"|data-check-id="c003"/);
  assert.match(html, /Full-year totals for the selected year/);
  assert.equal(html.split("+$7,500.00").length - 1, 1);
  assert.doesNotMatch(html, /\+12\.28%/);
  assertCleanGlue(html, "pay 2025");
});

test("a check that does not add up says so once", function () {
  const ctx = boot();
  const doc = loadPay();
  doc.checks.forEach(function (c) {
    if (c.id === "c005") c.reconciles = false;
  });
  const html = ctx.paydeskHtml("pay", doc, {});
  assert.equal(html.split("This check does not add up to gross.").length - 1, 1);
});

test("taxes summary uses the example and leaves carryforward remaining blank", function () {
  const ctx = boot();
  const doc = loadTaxes();
  const html = ctx.paydeskHtml("taxes", doc, {});
  assert.match(html, /Taxes · 2025/);
  assert.match(html, /Estimate · 2026/);
  assert.match(html, /Projection adjusted by stubs\./);
  assert.match(html, /Federal<\/span> <b class="tone-go">\+\$1,000\.00<\/b>/);
  assert.match(html, /State<\/span> <b class="tone-flat">\$0\.00<\/b>/);
  assert.match(html, /Local<\/span> <b class="tone-flat">\$0\.00<\/b>/);
  assert.match(html, /Scenario C/);
  assert.match(html, /-\$2,000\.00/);
  assert.match(html, /\$400\.00/);
  const yearAt = ["2021", "2022", "2023", "2024", "2025"].map(function (y) { return html.indexOf(">" + y + "<"); });
  yearAt.forEach(function (at, i) {
    assert.ok(at > 0, String(i));
    if (i) assert.ok(at > yearAt[i - 1]);
  });
  assert.match(html, /2025<\/span> <span class="sub">Selected<\/span>/);
  assert.match(html, /<details class="fills-more">/);
  assert.doesNotMatch(html, /<details class="fills-more"[^>]*open/);
  assert.equal(cardCount(visibleCards(html)), 2);
  const remain = html.match(/data-carry="remaining"[\s\S]*?<\/tr>/);
  assert.ok(remain);
  assert.match(remain[0], /—/);
  assert.doesNotMatch(remain[0], /\$/);
  const used = html.match(/data-carry="used-next"[\s\S]*?<\/tr>/);
  assert.match(used[0], /\+\$500\.00/);
  assert.match(html, /Refund down 50% vs 2024/);
  assert.match(html, /Amended return filed/);
  assert.doesNotMatch(html, /Showing 10 of/);
  assert.match(html, /class="split-two"/);
  assertCleanGlue(html, "taxes");
});

test("energy carryforward remaining renders when it is a number", function () {
  const ctx = boot();
  const doc = loadTaxes();
  const amount = doc.credits.energy_carryforward_used_next;
  doc.credits.energy_carryforward_remaining = amount;
  const html = ctx.paydeskHtml("taxes", doc, {});
  const remain = html.match(/data-carry="remaining"[\s\S]*?<\/tr>/);
  assert.match(remain[0], /\+\$500\.00/);
  doc.credits.energy_carryforward_remaining = 0;
  const zero = ctx.paydeskHtml("taxes", doc, {});
  const zeroRow = zero.match(/data-carry="remaining"[\s\S]*?<\/tr>/);
  assert.match(zeroRow[0], /\$0\.00/);
  assert.doesNotMatch(zeroRow[0], /—/);
  doc.credits.energy_carryforward_remaining = null;
  const blank = ctx.paydeskHtml("taxes", doc, {});
  const blankRow = blank.match(/data-carry="remaining"[\s\S]*?<\/tr>/);
  assert.match(blankRow[0], /—/);
  assert.doesNotMatch(blankRow[0], /\$/);
});

test("list cap is position relative and pages bust caches at 20261007em", function () {
  const css = read("house/list-cap.css");
  assert.match(css, /\.list-cap\s*\{[^}]*position:\s*relative/);
  ["pay/index.html", "taxes/index.html"].forEach(function (rel) {
    const html = read(rel);
    assert.match(html, /\/js\/nav\.js\?v=20261007em/);
    assert.match(html, /\/house\/house\.css\?v=20261007em/);
    assert.match(html, /\/house\/list-cap\.css\?v=20261007em/);
    assert.match(html, /\/house\/js\/list-cap\.js\?v=20261007em/);
    assert.match(html, /\/house\/js\/paydesk\.js\?v=20261007em/);
    assert.doesNotMatch(html, /banking\.css|banking\.js/);
    assert.doesNotMatch(html, /\/data\/pay\/|\/data\/taxes\//);
    const attrs = html.match(/\b(?:href|src)\s*=\s*["'][^"']+["']/g) || [];
    attrs.forEach(function (attr) {
      const val = attr.replace(/^.*?=\s*["']/, "").replace(/["']$/, "");
      if (/^(https?:|mailto:|data:|#)/.test(val)) return;
      assert.ok(val.startsWith("/"), rel + " " + attr);
    });
  });
  assert.match(read("pay/index.html"), /id="payDesk"/);
  assert.match(read("taxes/index.html"), /id="taxDesk"/);
  const blob = read("house/js/paydesk.js") + read("pay/index.html") + read("taxes/index.html") +
    fs.readFileSync(payPath, "utf8") + fs.readFileSync(taxPath, "utf8");
  assert.doesNotMatch(blob, /@/);
  assert.doesNotMatch(blob, /\b\d{12,}\b/);
});

test("banking menu links Pay and Taxes on absolute paths", function () {
  function bootNav(pathname) {
    const elements = {};
    function makeEl(id) {
      const el = {
        id: id || "",
        hidden: true,
        attrs: {},
        _html: "",
        classList: { toggle: function () {} },
        insertAdjacentHTML: function () {},
        insertAdjacentElement: function () {},
        setAttribute: function (k, v) { this.attrs[k] = String(v); },
        getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        closest: function () { return null; },
        focus: function () {}
      };
      Object.defineProperty(el, "innerHTML", {
        get: function () { return this._html; },
        set: function (v) {
          this._html = String(v);
          const nav = /<nav id="tabs"[^>]*>([\s\S]*?)<\/nav>/.exec(this._html);
          if (nav) {
            if (!elements.tabs) elements.tabs = makeEl("tabs");
            elements.tabs._html = nav[1];
          }
        }
      });
      if (id) elements[id] = el;
      return el;
    }
    elements.mpNav = makeEl("mpNav");
    elements.main = makeEl("main");
    elements.header = makeEl("header");
    const document = {
      readyState: "complete",
      documentElement: { getAttribute: function () { return "justin"; }, setAttribute: function () {} },
      getElementById: function (id) { return elements[id] || null; },
      querySelector: function (sel) {
        if (sel === "main") return elements.main;
        if (sel === "header") return elements.header;
        return null;
      },
      querySelectorAll: function () { return []; },
      addEventListener: function () {},
      createElement: function () { return makeEl(""); }
    };
    const sandbox = {
      document: document,
      location: { pathname: pathname, hash: "", search: "", replace: function () {} },
      history: { state: {}, replaceState: function () {} },
      addEventListener: function () {},
      removeEventListener: function () {},
      setTimeout: setTimeout,
      elements: elements
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(read("js/nav.js"), sandbox, { filename: "nav.js" });
    return sandbox;
  }
  const home = bootNav("/");
  const homeTabs = home.elements.tabs._html;
  assert.match(homeTabs, /href="\/pay\/"/);
  assert.match(homeTabs, /href="\/taxes\/"/);
  assert.match(homeTabs, />Pay</);
  assert.match(homeTabs, />Taxes</);
  assert.match(homeTabs, /data-nav-item="budget"[^>]*class="on"/);
  assert.doesNotMatch(homeTabs, /data-nav-item="pay"[^>]*class="on"/);
  assert.deepEqual(JSON.parse(JSON.stringify(home.MPNav.bankingHashes)), ["budget", "current", "historical", "edits"]);
  const pay = bootNav("/pay/");
  assert.match(pay.elements.tabs._html, /data-nav-item="pay"[^>]*class="on" aria-current="page"/);
  assert.doesNotMatch(pay.elements.tabs._html, /data-nav-item="budget"[^>]*class="on"/);
  const taxes = bootNav("/taxes");
  assert.match(taxes.elements.tabs._html, /data-nav-item="taxes"[^>]*class="on" aria-current="page"/);
});
