"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const fixturePath = path.join(__dirname, "fixtures", "banking-records.json");

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

function boot() {
  const windowListeners = {};
  const document = {
    addEventListener: function () {},
    removeEventListener: function () {},
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    documentElement: { setAttribute: function () {}, getAttribute: function () { return "justin"; } }
  };
  const sandbox = {
    localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
    document: document,
    location: { hash: "", pathname: "/", search: "" },
    history: { replaceState: function () {}, pushState: function () {} },
    addEventListener: function (type, fn) {
      if (!windowListeners[type]) windowListeners[type] = [];
      windowListeners[type].push(fn);
    },
    removeEventListener: function () {},
    console: console,
    fetch: function () { return Promise.reject(new Error("no fetch")); },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    Intl: Intl,
    Date: Date,
    Promise: Promise,
    isFinite: isFinite,
    Number: Number,
    String: String,
    Object: Object,
    Array: Array,
    Math: Math,
    JSON: JSON
  };
  sandbox.window = sandbox;
  sandbox._bankListeners = windowListeners;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/list-cap.js"), "utf8"), sandbox, { filename: "list-cap.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/ticker.js"), "utf8"), sandbox, { filename: "ticker.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/banking-records.js"), "utf8"), sandbox, { filename: "banking-records.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8"), sandbox, { filename: "banking.js" });
  return sandbox;
}

function mount(ctx, data, opts) {
  const rows = { innerHTML: "" };
  const el = {
    innerHTML: "",
    listeners: {},
    _rows: rows,
    addEventListener: function (type, fn) { this.listeners[type] = fn; },
    querySelector: function (sel) {
      if (sel === "[data-bank-rec-rows]") return rows;
      if (sel === "[data-bank-rec-count]") {
        return { set textContent(value) { el._count = value; } };
      }
      return null;
    }
  };
  ctx.bankMount(el, data, opts || {});
  return el;
}

function snap() {
  return { asof: "2026-10-06T12:00:00-04:00", budget: {}, current: { recent_tx: [] }, history: { months: [] }, accounts: [] };
}

function okJson(doc) {
  return Promise.resolve({
    ok: true,
    status: 200,
    type: "basic",
    json: function () { return Promise.resolve(doc); }
  });
}

test("record hashes stay on Historical and the last closed month is the default", function () {
  const ctx = boot();
  const fx = loadFixture();
  assert.equal(ctx.bankResolveTab("#historical/2026-09"), "historical");
  assert.equal(ctx.bankParseHash("#historical/2026-09").histMonth, "2026-09");
  assert.equal(ctx.bankParseHash("#historical/2026-09").histYear, "");
  assert.equal(ctx.bankParseHash("#historical/2026").histYear, "2026");
  assert.equal(ctx.bankParseHash("#historical/2026").histMonth, "");
  assert.equal(ctx.bankParseHash("#historical=2026-08").histMonth, "2026-08");
  assert.equal(ctx.bankParseHash("#historical").tab, "historical");
  assert.equal(ctx.bankRecordsDefaultMonth(fx.index), "2026-09");
  assert.equal(ctx.bankResolveTab("#budget"), "budget");
  assert.equal(ctx.bankResolveTab("#edits"), "edits");
});

test("a month record renders inside Historical in the requested order", function () {
  const ctx = boot();
  const fx = loadFixture();
  const html = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histMonth: "2026-09",
    recordIndex: fx.index,
    record: fx.month
  });
  assert.match(html, /data-panel="historical"/);
  assert.match(html, /class="bank-view-title"[^>]*>Historical · September 2026</);
  assert.match(html, /data-bank-record="month"/);
  assert.match(html, /data-completeness="full"/);
  assert.doesNotMatch(html, /class="bank-tabs"|role="tab"/);
  assert.match(html, /data-bank-hist-year="2026"/);
  assert.match(html, /aria-label="Year 2026"/);
  assert.match(html, />Full</);
  assert.match(html, /In progress/);
  assert.match(html, /Partial/);
  assert.match(html, /Totals only/);
  assert.match(html, /Sample month closed with more coming in than going out/);
  const order = [
    "data-bank-rec-summary",
    "data-bank-rec-chart=\"budget_vs_actual\"",
    "data-bank-rec-chart=\"daily_balances\"",
    "data-bank-rec-chart=\"income_outflow_timeline\"",
    "data-bank-rec-chart=\"category_donut\"",
    "data-bank-rec-chart=\"tier_stack\"",
    "data-bank-rec-cycles",
    "data-bank-rec-income",
    "data-bank-rec-outflows",
    "data-bank-rec-categories",
    "data-bank-rec-purchases"
  ];
  let at = -1;
  order.forEach(function (key) {
    const i = html.indexOf(key);
    assert.ok(i > at, key);
    at = i;
  });
  const transit = html.slice(html.indexOf('data-bar="Transit"'), html.indexOf('data-bar="Transit"') + 700);
  assert.match(transit, /bank-bar over/);
  assert.match(transit, /var\(--stop\)/);
  const groceries = html.slice(html.indexOf('data-bar="Groceries"'), html.indexOf('data-bar="Groceries"') + 500);
  assert.match(groceries, /var\(--go\)/);
  assert.doesNotMatch(groceries, /bank-bar over/);
  assert.match(html, /class="mix-bar"/);
  assert.match(html, /class="bank-pie"/);
  assert.match(html, /bank-pie-mid/);
  assert.match(html, /bank-income-mix/);
  assert.match(html, /bank-mix-track/);
  assert.match(html, /class="bank-legend"/);
  assert.match(html, /stroke-dasharray="4 3"/);
  assert.match(html, /stroke="var\(--warn\)"/);
  assert.match(html, /data-bank-budget-basis="edits_saved"/);
  assert.match(html, /Budgets from saved edits/);
  assert.match(html, /··1001/);
  assert.match(html, /Corner Market/);
  assert.match(html, /Search purchases/);
  assert.doesNotMatch(html, /\b(?:Chase|Wells|Fidelity|Voya|Robinhood|NFCU|T-Mobile)\b/i);
});

test("partial and totals-only months degrade without inventing detail", function () {
  const ctx = boot();
  const fx = loadFixture();
  const partial = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histMonth: "2026-08",
    recordIndex: fx.index,
    record: fx.partial
  });
  assert.match(partial, /data-completeness="partial"/);
  assert.match(partial, /Sample coverage: daily detail stops on the 12th/);
  assert.match(partial, /data-bank-rec-unavailable="daily_balances"/);
  assert.match(partial, /data-bank-rec-unavailable="tier_stack"/);
  assert.match(partial, /data-bank-budget-basis="backfill"/);
  const empty = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histMonth: "2026-11",
    recordIndex: fx.index,
    record: fx.empty
  });
  assert.match(empty, /data-completeness="aggregates_only"/);
  assert.match(empty, /Not enough detail for this chart/);
  assert.match(empty, /Totals only. Purchases are not listed/);
  assert.match(empty, /No summary in this record|Totals only for this sample/);
  const missing = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histMonth: "2026-10",
    recordIndex: fx.index,
    record: null
  });
  assert.match(missing, /data-bank-rec-missing="month"/);
  const plain = ctx.bankPageHtml(snap(), { tab: "historical" });
  assert.match(plain, /data-panel="historical"/);
  assert.doesNotMatch(plain, /data-bank-record=/);
});

test("the year page has the YTD charts and no purchase list", function () {
  const ctx = boot();
  const fx = loadFixture();
  const html = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histYear: "2026",
    recordIndex: fx.index,
    record: fx.year
  });
  assert.match(html, /data-panel="historical"/);
  assert.match(html, /class="bank-view-title"[^>]*>Historical · 2026</);
  assert.match(html, /data-bank-record="year"/);
  assert.match(html, /data-bank-rec-status="provisional_ytd"/);
  assert.match(html, /Provisional, through Sep 30, 2026/);
  assert.match(html, /data-bank-rec-chart="monthly_in_out_net"/);
  assert.match(html, /data-bank-rec-chart="category_trends"/);
  assert.match(html, /data-bank-rec-chart="savings_rate"/);
  assert.match(html, /data-bank-rec-chart="ytd_budget_vs_actual"/);
  assert.match(html, /data-bank-rec-chart="sankey"/);
  assert.match(html, /stroke-dasharray="5 4"/);
  assert.match(html, /Money is fungible/);
  assert.match(html, /Left in accounts/);
  assert.match(html, /Confidence: medium/);
  assert.match(html, /What went right/);
  assert.match(html, /What went wrong/);
  assert.match(html, /Habits for next year/);
  assert.match(html, /Mar Partial/);
  assert.doesNotMatch(html, /data-bank-rec-purchases|Search purchases/);
  const heat = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histYear: "2026",
    recordIndex: fx.index,
    record: fx.year,
    recHeat: true
  });
  assert.match(heat, /aria-label="Category heatmap"/);
  assert.match(heat, /aria-pressed="true"/);
  const draw = JSON.parse(JSON.stringify(fx.year));
  draw.charts = {};
  draw.income_total = 10;
  draw.outflow_total = 40;
  draw.income_by_source = { payroll: 10 };
  draw.categories = [{ name: "Groceries", budget: 20, actual: 40, diff: -20 }];
  const down = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histYear: "2026",
    recordIndex: fx.index,
    record: draw
  });
  assert.match(down, /Account drawdown/);
  assert.match(down, /Money is fungible/);
});

test("purchase filters narrow the month table", function () {
  const ctx = boot();
  const fx = loadFixture();
  const filtered = ctx.bankRecordsPurchaseBody(fx.month, { q: "books", rhythm: "one" });
  assert.equal(filtered.count, 1);
  assert.match(filtered.html, /Northwind Books/);
  assert.doesNotMatch(filtered.html, /Corner Market|Harbor Transit/);
  const wants = ctx.bankRecordsFilterTx(fx.month.transactions, { tier: "wants", account: "2002" });
  assert.equal(wants.length, 2);
  const page = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histMonth: "2026-09",
    recordIndex: fx.index,
    record: fx.month,
    recFilter: { category: "Transit" }
  });
  assert.match(page, /Harbor Transit/);
  assert.doesNotMatch(page.slice(page.indexOf("data-bank-rec-rows")), /Northwind Books|Pine Cafe/);
});

test("opening Historical loads the last closed month from the record feed", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const calls = [];
  const urls = [];
  ctx.history.replaceState = function (_state, _title, url) {
    urls.push(String(url));
    const i = String(url).indexOf("#");
    ctx.location.hash = i >= 0 ? String(url).slice(i) : "";
  };
  ctx.history.pushState = function (_state, _title, url) {
    urls.push(String(url));
    const i = String(url).indexOf("#");
    ctx.location.hash = i >= 0 ? String(url).slice(i) : "";
  };
  ctx.fetch = function (url, init) {
    calls.push({ url: String(url), init: init || {} });
    const u = String(url);
    if (u.indexOf("/data/banking/records/index.json") === 0) return okJson(fx.index);
    if (u.indexOf("/data/banking/months/2026-09.json") === 0) return okJson(fx.month);
    if (u.indexOf("/data/banking/years/2026.json") === 0) return okJson(fx.year);
    if (u.indexOf("/data/banking/months/2026-08.json") === 0) return okJson(fx.partial);
    return Promise.resolve({ ok: false, status: 404, type: "basic", json: function () { return Promise.resolve(null); } });
  };
  ctx.location.hash = "#historical";
  const el = mount(ctx, snap(), { startupCats: true, tierDoc: { rules: {}, plans: {} } });
  await el._bank.recordPromise;
  assert.match(el.innerHTML, /data-bank-record="month"/);
  assert.match(el.innerHTML, /data-record-key="2026-09"/);
  assert.match(el.innerHTML, /Historical · September 2026/);
  assert.ok(calls.length >= 2);
  assert.match(calls[0].url, /^\/data\/banking\/records\/index\.json\?v=/);
  assert.match(calls[1].url, /^\/data\/banking\/months\/2026-09\.json\?v=/);
  calls.forEach(function (call) {
    assert.equal(call.init.credentials, "include");
    assert.equal(call.init.cache, "no-store");
    assert.equal(call.init.headers["Cache-Control"], "no-cache");
  });
  assert.match(urls.join(" "), /#historical\/2026-09/);

  function fire(type) {
    (ctx._bankListeners[type] || []).forEach(function (fn) { fn(); });
  }
  ctx.location.hash = "#historical/2026";
  fire("hashchange");
  await el._bank.recordPromise;
  assert.match(el.innerHTML, /data-bank-record="year"/);
  assert.doesNotMatch(el.innerHTML, /data-bank-rec-purchases/);
  assert.match(calls.map(function (call) { return call.url; }).join(" "), /\/data\/banking\/years\/2026\.json/);

  const monthBtn = {
    value: "2026-08",
    hasAttribute: function (name) { return name === "data-bank-hist-month"; },
    getAttribute: function (name) { return name === "data-bank-hist-month" ? "" : null; }
  };
  el.listeners.change({ target: monthBtn });
  await el._bank.recordPromise;
  assert.match(el.innerHTML, /data-record-key="2026-08"/);
  assert.match(el.innerHTML, /data-completeness="partial"/);
  assert.match(urls.join("\n"), /#historical\/2026-08/);
});

test("the year chip, heatmap, and purchase search update the Historical page", async function () {
  const ctx = boot();
  const fx = loadFixture();
  ctx.fetch = function () { return Promise.reject(new Error("no fetch")); };
  const el = mount(ctx, snap(), {
    tab: "historical",
    histMonth: "2026-09",
    recordIndex: fx.index,
    record: fx.month,
    recordKey: "m:2026-09",
    startupCats: true,
    tierDoc: { rules: {}, plans: {} }
  });
  assert.match(el.innerHTML, /Northwind Books/);
  const input = {
    value: "Harbor",
    hasAttribute: function (name) { return name === "data-bank-rec-q"; }
  };
  el.listeners.input({ target: input });
  assert.match(el._rows.innerHTML, /Harbor Transit/);
  assert.doesNotMatch(el._rows.innerHTML, /Northwind Books/);
  const tier = {
    value: "wants",
    getAttribute: function (name) { return name === "data-bank-rec-filter" ? "tier" : null; },
    hasAttribute: function () { return false; }
  };
  el._bank.recFilter = { q: "" };
  el.listeners.change({ target: tier });
  assert.match(el._rows.innerHTML, /Pine Cafe/);
  assert.doesNotMatch(el._rows.innerHTML, /Maple Power/);

  function click(attr, value) {
    const node = {
      getAttribute: function (name) { return name === attr ? value : null; },
      closest: function (sel) { return String(sel).indexOf(attr) >= 0 ? node : null; }
    };
    el.listeners.click({ target: node, preventDefault: function () {} });
  }
  ctx.fetch = function (url) {
    const u = String(url);
    if (u.indexOf("/data/banking/years/2026.json") === 0) return okJson(fx.year);
    if (u.indexOf("/data/banking/records/index.json") === 0) return okJson(fx.index);
    return Promise.resolve({ ok: false, status: 404, type: "basic", json: function () { return Promise.resolve(null); } });
  };
  click("data-bank-hist-year", "2026");
  await el._bank.recordPromise;
  assert.match(el.innerHTML, /data-bank-record="year"/);
  assert.match(el.innerHTML, /aria-pressed="true"/);
  click("data-bank-rec-heat", "1");
  assert.match(el.innerHTML, /aria-label="Category heatmap"/);
  click("data-bank-rec-heat", "1");
  assert.match(el.innerHTML, /data-bank-rec-chart="category_trends"/);
  assert.match(el.innerHTML, />Heatmap</);
});

test("record files stay free of institutions, account numbers, and dollar literals", function () {
  const files = [
    "house/js/banking-records.js",
    "house/test/fixtures/banking-records.json",
    "workers/murphysbn-gate/records.js"
  ];
  const banned = /\b(?:Chase|Wells Fargo|Fidelity|Voya|Robinhood|NFCU|T-Mobile|PNC|Schwab|Truist|Capital One|Bank of America)\b/i;
  files.forEach(function (rel) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    assert.doesNotMatch(text, banned, rel);
    assert.doesNotMatch(text, /\$\d/, rel);
    assert.doesNotMatch(text, /\b\d{8,}\b/, rel);
  });
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(page, /\/house\/js\/banking-records\.js\?v=/);
  assert.match(page, /banking-records\.js\?v=20261124aa/);
  const nav = fs.readFileSync(path.join(root, "js/nav.js"), "utf8");
  assert.match(nav, /historical\//);
  assert.match(nav, /label: "Historical"/);
  assert.doesNotMatch(nav, /Monthly record|Yearly YTD/);
});
