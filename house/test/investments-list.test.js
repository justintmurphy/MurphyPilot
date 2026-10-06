"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");

function boot() {
  const document = {
    addEventListener: function () {},
    removeEventListener: function () {},
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    documentElement: { setAttribute: function () {}, getAttribute: function () { return "justin"; } },
    readyState: "complete"
  };
  const sandbox = {
    localStorage: {
      getItem: function () { return null; },
      setItem: function () {},
      removeItem: function () {}
    },
    sessionStorage: {
      getItem: function () { return null; },
      setItem: function () {},
      removeItem: function () {}
    },
    document: document,
    location: { hash: "", pathname: "/investments/", search: "" },
    history: { replaceState: function () {} },
    console: console,
    fetch: function () { return new Promise(function () {}); },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    setTimeout: setTimeout,
    navigator: { userAgent: "node" },
    Intl: Intl,
    Date: Date,
    Promise: Promise,
    isFinite: isFinite
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = function () {};
  sandbox.removeEventListener = function () {};
  sandbox.matchMedia = function () {
    return { matches: false, addEventListener: function () {}, addListener: function () {} };
  };
  vm.createContext(sandbox);
  [
    "house/js/list-cap.js",
    "house/js/banking.js",
    "house/js/ticker.js",
    "house/js/board-a.js",
    "house/js/board-b.js",
    "house/js/board-c.js",
    "house/js/board-d.js",
    "house/js/board-e.js"
  ].forEach(function (rel) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, { filename: rel });
  });
  return sandbox;
}

function rows(n, extra) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(Object.assign({ symbol: "N" + i, name: "Name " + i, value: n - i, qty: 1, kind: "equity" }, extra || {}));
  }
  return out;
}

function sleeves(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ id: "s" + i, label: "Sleeve " + i, equity: 4, names: [{ symbol: "S" + i, value: 4, qty: 1 }] });
  return out;
}

function assertCapped(html, label, count) {
  assert.match(html, new RegExp('class="list-cap"[^>]*tabindex="0"[^>]*aria-label="' + label + '"'));
  assert.match(html, new RegExp("Showing 10 of " + count + ", scroll for more"));
}

function assertOpen(html, label) {
  assert.doesNotMatch(html, new RegExp('aria-label="' + label + '"'));
  assert.doesNotMatch(html, /Showing 10 of/);
  assert.doesNotMatch(html, /class="list-cap"/);
}

test("dated rows sort soonest-first and undated rows stay last", function () {
  const ctx = boot();
  const sorted = ctx.investSortSoonest([
    { symbol: "LATER", ts: "2026-10-20T15:00:00Z" },
    { symbol: "NONE" },
    { symbol: "SOON", date: "2026-10-02" },
    { symbol: "BLANK", ts: "" }
  ]);
  assert.deepEqual(sorted.map(function (row) { return row.symbol; }), ["SOON", "LATER", "NONE", "BLANK"]);
});

test("holdings and book tables cap at ten rows", function () {
  const ctx = boot();
  ctx.snap = { accounts: {} };
  ctx.tab = "combined";
  const longHold = ctx.tableHtml(rows(12), false, false);
  assertCapped(longHold, "Holdings", 12);
  assert.match(longHold, /<table class="book">/);
  assertOpen(ctx.tableHtml(rows(4), false, false), "Holdings");

  const longBook = ctx.tableHtml(rows(11), true, true);
  assertCapped(longBook, "Book", 11);
  assertOpen(ctx.tableHtml(rows(10), true, true), "Book");
});

test("sleeve and custodial holdings cap at ten rows", function () {
  const ctx = boot();
  ctx.snap = { accounts: {} };
  ctx.tab = "fid-s0";
  const longSleeve = ctx.custodialTableHtml(rows(13), 40);
  assertCapped(longSleeve, "Sleeve", 13);
  assert.match(longSleeve, /table class="book custodial"/);
  assertOpen(ctx.custodialTableHtml(rows(2), 8), "Sleeve");

  ctx.tab = "voya";
  assertCapped(ctx.custodialTableHtml(rows(12), 40), "Book", 12);
});

test("sleeve cards cap at ten", function () {
  const ctx = boot();
  ctx.tab = "fidelity";
  ctx.snap = { accounts: {}, tape: {} };
  const longHtml = ctx.fidelityBooksHtml({ sleeves: sleeves(12), live: false });
  assertCapped(longHtml, "Sleeves", 12);
  assert.match(longHtml, /Sleeve 11/);
  assertOpen(ctx.fidelityBooksHtml({ sleeves: sleeves(3), live: false }), "Sleeves");
});

test("fills tape caps each side and keeps soonest dates first", function () {
  const ctx = boot();
  const fills = [
    { symbol: "LATER", side: "buy", qty: 1, price: 2, ts: "2026-10-20T15:00:00Z", account: "agentic" },
    { symbol: "NONE", side: "buy", qty: 1, price: 2, account: "agentic" },
    { symbol: "SOON", side: "buy", qty: 1, price: 2, ts: "2026-10-02T15:00:00Z", account: "agentic" }
  ];
  const ordered = ctx.fillsTapeHtml({ fills: fills }, { required: true });
  assert.ok(ordered.indexOf("SOON") < ordered.indexOf("LATER"));
  assert.ok(ordered.indexOf("LATER") < ordered.indexOf("NONE"));
  assertOpen(ordered, "Buys");

  const many = [];
  for (let i = 0; i < 12; i++) {
    many.push({ symbol: "B" + i, side: "buy", qty: 1, price: 2, ts: "2026-10-" + String(i + 1).padStart(2, "0") + "T12:00:00Z", account: "agentic" });
  }
  for (let i = 0; i < 4; i++) {
    many.push({ symbol: "S" + i, side: "sell", qty: 1, price: 2, pnl: 1, ts: "2026-10-" + String(i + 1).padStart(2, "0") + "T12:00:00Z", account: "agentic" });
  }
  const tape = ctx.fillsTapeHtml({ fills: many }, { required: true });
  assertCapped(tape, "Buys", 12);
  assert.doesNotMatch(tape, /aria-label="Sells"/);
  assert.match(tape, /B0/);
  assert.match(tape, /B11/);
});

test("where it sits and the mix legend cap at ten rows", function () {
  const ctx = boot();
  ctx.tab = "individual";
  ctx.snap = { accounts: {}, tape: {}, combined: {} };
  const names = rows(12);
  const book = { names: names, equity: 78, cash: 0 };
  const html = ctx.mixHtml(book, "individual");
  assertCapped(html, "Mix", 12);
  assertCapped(html, "Where it sits", 12);
  assertOpen(ctx.mixHtml({ names: rows(3), equity: 6, cash: 0 }, "individual"), "Mix");
});

test("book pop-up caps live and all-book lists", function () {
  const ctx = boot();
  ctx.tab = "combined";
  const many = sleeves(8);
  ctx.snap = {
    asof: "2026-10-06T12:00:00-04:00",
    tape: {},
    combined: { equity: 20 },
    robinhood: { equity: 8 },
    accounts: {
      agentic: { equity: 2, label: "One" },
      individual: { equity: 2, label: "Two" },
      auto_grok: { equity: 2, label: "Three" },
      joint: { equity: 2, label: "Four" },
      fidelity: { equity: 8, sleeves: many },
      voya: { equity: 2, label: "Plan" }
    }
  };
  const html = ctx.overlayHtml();
  assert.match(html, /role="dialog"/);
  assertCapped(html, "Live books", 13);
  assertCapped(html, "All books", 14);
  ctx.snap.accounts.fidelity.sleeves = [];
  assertOpen(ctx.overlayHtml(), "Live books");
});

test("overnight pack caps and sorts dated notes soonest-first", function () {
  const ctx = boot();
  ctx.PACK = {
    subject: "Notes",
    items: [
      { tag: "note", title: "Later", date: "2026-11-02", text: "later" },
      { tag: "note", title: "Undated", text: "none" },
      { tag: "note", title: "Soon", date: "2026-10-02", text: "soon" }
    ]
  };
  const shortHtml = ctx.packHtml();
  assert.ok(shortHtml.indexOf("Soon") < shortHtml.indexOf("Later"));
  assert.ok(shortHtml.indexOf("Later") < shortHtml.indexOf("Undated"));
  assertOpen(shortHtml, "Overnight pack");

  const items = [];
  for (let i = 0; i < 12; i++) {
    items.push({ tag: "note", title: "Note " + i, date: "2026-10-" + String(12 - i).padStart(2, "0"), text: "row" });
  }
  items.push({ tag: "note", title: "No date", text: "blank" });
  ctx.PACK = { subject: "Notes", items: items };
  const longHtml = ctx.packHtml();
  assertCapped(longHtml, "Overnight pack", 13);
  assert.ok(longHtml.indexOf("Note 11") < longHtml.indexOf("Note 0"));
  assert.ok(longHtml.indexOf("Note 0") < longHtml.indexOf("No date"));
});

test("retirement helper is not a row list", function () {
  const ctx = boot();
  ctx.snap = { accounts: {}, combined: {}, tape: {} };
  const html = ctx.retirementHtml();
  assert.match(html, /Retirement/);
  assert.doesNotMatch(html, /<table/);
  assert.doesNotMatch(html, /class="list-cap"/);
});

test("investments ticker mounts the next deposit and the next bill", function () {
  const ctx = boot();
  const fx = {
    asof: "2026-10-06T12:00:00-04:00",
    budget: {
      pay_schedule: [{
        name: "Payroll",
        kind: "payroll",
        date: "2026-10-15",
        amount: 40,
        account: { last4: "1111" }
      }],
      bills: [{ name: "Rent", amount: 22, typical_day: 20, cadence: "monthly" }],
      subscriptions: [],
      income_monthly: [],
      calendar: []
    },
    current: { recent_tx: [], edits_tx: [] }
  };
  const el = { hidden: true, innerHTML: "", addEventListener: function () {} };
  ctx.document.getElementById = function (id) { return id === "mp-ticker" ? el : null; };
  ctx.invPaintTicker(fx, { now: "2026-10-06T12:00:00-04:00" });
  assert.equal(el.hidden, false);
  assert.match(el.innerHTML, /data-mp-tick="in"/);
  assert.match(el.innerHTML, /data-mp-tick="out"/);
  assert.match(el.innerHTML, /\$40\.00/);
  assert.match(el.innerHTML, /\$22\.00/);
  assert.match(el.innerHTML, /Rent/);
  assert.match(el.innerHTML, /Oct 15/);
  assert.match(el.innerHTML, /Oct 20/);
  assert.match(el.innerHTML, /aria-label="Next deposit Payroll Oct 15 \$40\.00\. Next bill Rent Oct 20 \$22\.00"/);
  assert.match(el.innerHTML, /aria-label="Next deposit Payroll Oct 15 \$40\.00"/);
  assert.match(el.innerHTML, /aria-label="Next bill Rent Oct 20 \$22\.00"/);
  assert.match(el.innerHTML, /··1111/);
});

test("a failed ticker fetch stays hidden and the desk still renders", async function () {
  const ctx = boot();
  ctx.snap = { accounts: {} };
  ctx.tab = "combined";
  const el = { hidden: false, innerHTML: "shown", addEventListener: function () {}, _mpTickerPainted: false };
  ctx.fetch = function () { return Promise.reject(new Error("down")); };
  ctx.MPTicker.load(el);
  await new Promise(function (resolve) { setTimeout(resolve, 30); });
  assert.equal(el.hidden, true);
  assert.equal(el.innerHTML, "");

  const blown = { hidden: false, innerHTML: "shown", _mpTickerPainted: false };
  ctx.document.getElementById = function (id) { return id === "mp-ticker" ? blown : null; };
  ctx.MPTicker.load = function () { throw new Error("down"); };
  ctx.invMountTicker();
  assert.equal(blown.hidden, true);
  assert.equal(blown.innerHTML, "");
  const book = ctx.tableHtml(rows(3), false, false);
  assert.match(book, /<table class="book">/);
  assert.match(book, /N0/);
  assert.doesNotMatch(book, /class="list-cap"/);
});

test("investments page wires the shared list cap and ticker", function () {
  const page = fs.readFileSync(path.join(root, "investments/index.html"), "utf8");
  assert.equal((page.match(/id="mp-ticker"/g) || []).length, 1);
  assert.match(page, /<div id="mp-ticker" class="mp-ticker-slot" hidden><\/div>/);
  assert.match(page, /list-cap\.js\?v=20261006ec3/);
  assert.match(page, /list-cap\.css\?v=20261006ef/);
  assert.match(page, /ticker\.js\?v=20261006ef/);
  assert.match(page, /ticker\.css\?v=20261006ec/);
  assert.match(page, /\/house\/js\/banking\.js\?v=20261006ec4/);
  const css = fs.readFileSync(path.join(root, "house/list-cap.css"), "utf8");
  assert.match(css, /@media \(max-width:\s*390px\)/);
  assert.match(css, /max-width:\s*100%/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /--list-cap-rows/);
});
