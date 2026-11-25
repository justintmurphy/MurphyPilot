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
    FAKE_NOW: "2026-10-06T16:00:00.000Z",
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
  assert.match(html, /class="bank-view-title"[^>]*>Historical · Sep 2026</);
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
    "data-bank-rec-categories"
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
  assert.match(html, /Search transactions/);
  assert.match(html, /data-bank-rec-filter="category"/);
  assert.doesNotMatch(html, /data-bank-rec-purchases|<h3>Purchases<\/h3>/);
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
  assert.doesNotMatch(partial, /data-bank-rec-unavailable|Not enough detail/);
  assert.doesNotMatch(partial, /data-bank-rec-chart="daily_balances"/);
  assert.doesNotMatch(partial, /data-bank-rec-chart="tier_stack"/);
  assert.match(partial, /data-bank-rec-chart="budget_vs_actual"/);
  assert.match(partial, /data-bank-budget-basis="backfill"/);
  const empty = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histMonth: "2026-11",
    recordIndex: fx.index,
    record: fx.empty
  });
  assert.match(empty, /data-completeness="aggregates_only"/);
  assert.doesNotMatch(empty, /Not enough detail for this chart|Nothing to plot|Nothing listed/);
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
  const list = page.slice(page.indexOf("data-bank-rec-outflows"), page.indexOf("data-bank-rec-categories"));
  assert.match(list, /Harbor Transit/);
  assert.doesNotMatch(list, /Northwind Books|Pine Cafe/);
  assert.doesNotMatch(page, /data-bank-rec-purchases|<h3>Purchases<\/h3>/);
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
  assert.match(el.innerHTML, /Historical · Sep 2026/);
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
  const searched = el.innerHTML.slice(el.innerHTML.indexOf("data-bank-rec-outflows"), el.innerHTML.indexOf("data-bank-rec-categories"));
  assert.match(searched, /Harbor Transit/);
  assert.doesNotMatch(searched, /Northwind Books/);
  const tier = {
    value: "wants",
    getAttribute: function (name) { return name === "data-bank-rec-filter" ? "tier" : null; },
    hasAttribute: function () { return false; }
  };
  el._bank.recFilter = { q: "" };
  el.listeners.change({ target: tier });
  const tiered = el.innerHTML.slice(el.innerHTML.indexOf("data-bank-rec-outflows"), el.innerHTML.indexOf("data-bank-rec-categories"));
  assert.match(tiered, /Pine Cafe/);
  assert.doesNotMatch(tiered, /Maple Power/);

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
  assert.match(page, /banking-records\.js\?v=20261125ab/);
  const nav = fs.readFileSync(path.join(root, "js/nav.js"), "utf8");
  assert.match(nav, /historical\//);
  assert.match(nav, /label: "Historical"/);
  assert.doesNotMatch(nav, /Monthly record|Yearly YTD/);
});

function liveSnap() {
  return {
    asof: "2026-10-06T12:00:00-04:00",
    budget: {
      snapshots: {
        "2026-09": { month: "2026-09", income: { expected: 80 }, tiers: { required_total: 10 }, bills: [] }
      }
    },
    current: { recent_tx: [] },
    history: { months: [{ month: "2026-09", status: "closed" }] },
    accounts: []
  };
}

function wireHistory(ctx) {
  const stack = [ctx.location.pathname + (ctx.location.hash || "")];
  let at = 0;
  function apply(url) {
    const text = String(url);
    const i = text.indexOf("#");
    ctx.location.hash = i >= 0 ? text.slice(i) : "";
    stack[at] = text;
  }
  ctx.history.replaceState = function (_state, _title, url) { apply(url); };
  ctx.history.pushState = function (_state, _title, url) {
    stack.splice(at + 1);
    stack.push(String(url));
    at = stack.length - 1;
    apply(url);
  };
  ctx._go = function (delta) {
    at += delta;
    apply(stack[at]);
    (ctx._bankListeners.popstate || []).forEach(function (fn) { fn(); });
  };
}

function monthDoc(ym, extra) {
  const doc = {
    schema: "banking-month-archive/v1",
    month: ym,
    status: "closed",
    completeness: "partial",
    income: [{ date: ym + "-02", desc: "Payroll", amount: 20, account_suffix: "1001", kind: "payroll" }],
    transactions: [{ date: ym + "-03", desc: "Corner Market", amount: 8, account_suffix: "1001", category_name: "Groceries", tier: "needs" }],
    categories: [],
    charts: {}
  };
  if (extra) Object.keys(extra).forEach(function (key) { doc[key] = extra[key]; });
  return doc;
}

test("the route month drives the header, the picker, and the record", async function () {
  const ctx = boot();
  assert.equal(ctx.FAKE_NOW, "2026-10-06T16:00:00.000Z");
  const fx = loadFixture();
  const live = liveSnap();
  assert.match(ctx.bankPageHtml(live, { tab: "historical", histMonth: "2026-10" }), /Historical · September 2026/);
  const routed = ctx.bankPageHtml(live, { tab: "historical", histMonth: "2026-10", recordIndex: fx.index, record: monthDoc("2026-10") });
  assert.match(routed, /class="bank-view-title"[^>]*>Historical · Oct 2026</);
  assert.match(routed, /value="2026-10" selected/);
  assert.match(routed, /data-record-key="2026-10"/);
  assert.doesNotMatch(routed, /Historical · September 2026/);

  wireHistory(ctx);
  const calls = [];
  ctx.fetch = function (url) {
    calls.push(String(url).split("?")[0]);
    const u = String(url);
    if (u.indexOf("/data/banking/records/index.json") === 0) return okJson(fx.index);
    if (u.indexOf("/data/banking/months/2026-10.json") === 0) return okJson(monthDoc("2026-10"));
    if (u.indexOf("/data/banking/months/2026-11.json") === 0) return okJson(monthDoc("2026-11"));
    if (u.indexOf("/data/banking/months/2024-10.json") === 0) return okJson(monthDoc("2024-10"));
    if (u.indexOf("/data/banking/months/2026-09.json") === 0) return okJson(fx.month);
    if (u.indexOf("/data/banking/months/2026-08.json") === 0) return okJson(fx.partial);
    if (u.indexOf("/data/banking/years/2026.json") === 0) return okJson(fx.year);
    if (u.indexOf("/data/banking/years/2024.json") === 0) return okJson(Object.assign({}, fx.year, { year: "2024", status: "closed" }));
    return Promise.resolve({ ok: false, status: 404, type: "basic", json: function () { return Promise.resolve(null); } });
  };

  async function direct(hash, title, key) {
    ctx.location.hash = hash;
    const el = mount(ctx, live, { startupCats: true, tierDoc: { rules: {}, plans: {} } });
    await el._bank.recordPromise;
    assert.match(el.innerHTML, new RegExp("Historical · " + title), hash);
    assert.match(el.innerHTML, new RegExp('data-record-key="' + key + '"'), hash);
    assert.match(ctx.location.hash, new RegExp("#historical/" + key + "$"), hash);
    return el;
  }
  await direct("#historical/2026-10", "Oct 2026", "2026-10");
  await direct("#historical/2026-11", "Nov 2026", "2026-11");
  await direct("#historical/2024-10", "Oct 2024", "2024-10");
  const bare = await direct("#historical", "Sep 2026", "2026-09");
  assert.equal(ctx.location.hash, "#historical/2026-09");

  ctx.location.hash = "#historical=2026-08";
  const legacy = mount(ctx, live, { startupCats: true, tierDoc: { rules: {}, plans: {} } });
  await legacy._bank.recordPromise;
  assert.equal(ctx.location.hash, "#historical/2026-08");
  assert.match(legacy.innerHTML, /Historical · Aug 2026/);
  assert.match(legacy.innerHTML, /value="2026-08" selected/);

  const monthBtn = {
    value: "2026-10",
    hasAttribute: function (name) { return name === "data-bank-hist-month"; },
    getAttribute: function () { return null; }
  };
  legacy.listeners.change({ target: monthBtn });
  await legacy._bank.recordPromise;
  assert.equal(ctx.location.hash, "#historical/2026-10");
  assert.match(legacy.innerHTML, /Historical · Oct 2026/);
  assert.match(legacy.innerHTML, /value="2026-10" selected/);

  ctx._go(-1);
  await legacy._bank.recordPromise;
  assert.equal(ctx.location.hash, "#historical/2026-08");
  assert.match(legacy.innerHTML, /Historical · Aug 2026/);
  ctx._go(1);
  await legacy._bank.recordPromise;
  assert.equal(ctx.location.hash, "#historical/2026-10");
  assert.match(legacy.innerHTML, /Historical · Oct 2026/);

  ctx.location.hash = "#historical/2026";
  (ctx._bankListeners.hashchange || []).forEach(function (fn) { fn(); });
  await legacy._bank.recordPromise;
  assert.match(legacy.innerHTML, /Historical · 2026/);
  assert.match(legacy.innerHTML, /data-bank-record="year"/);
  assert.match(legacy.innerHTML, /data-bank-hist-year="2026"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-bank-hist-year="2026"/);
  assert.equal(bare.innerHTML.indexOf("data-bank-year-row") >= 0, true);
});

test("Budget and Historical each load banking.json once", async function () {
  const ctx = boot();
  const fx = loadFixture();
  let prints = 0;
  ctx.fetch = function (url) {
    const path = String(url).split("?")[0];
    if (path === "/data/banking.json") {
      prints += 1;
      return okJson(snap());
    }
    if (path === "/data/banking/records/index.json") return okJson(fx.index);
    if (path === "/data/banking/months/2026-09.json") return okJson(fx.month);
    return Promise.resolve({ ok: false, status: 404, type: "basic", json: function () { return Promise.resolve(null); } });
  };
  const tick = { hidden: true, innerHTML: "", addEventListener: function () {}, _mpTickerPainted: false };
  ctx.document.getElementById = function (id) { return id === "mp-ticker" ? tick : null; };
  ctx.location.hash = "";
  const budget = { innerHTML: "", addEventListener: function () {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; } };
  await ctx.bankLoad(budget);
  ctx.MPTicker.load(tick);
  await new Promise(function (resolve) { setTimeout(resolve, 20); });
  assert.equal(prints, 1);

  prints = 0;
  ctx.bankJsonFlight = null;
  ctx.location.hash = "#historical";
  const hist = { innerHTML: "", addEventListener: function () {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; } };
  const tick2 = { hidden: true, innerHTML: "", addEventListener: function () {}, _mpTickerPainted: false };
  await ctx.bankLoad(hist);
  ctx.MPTicker.load(tick2);
  if (hist._bank && hist._bank.recordPromise) await hist._bank.recordPromise;
  await new Promise(function (resolve) { setTimeout(resolve, 20); });
  assert.equal(prints, 1);
});

test("transactions and income cap at ten, then show all, and search", function () {
  const ctx = boot();
  const fx = loadFixture();
  const doc = JSON.parse(JSON.stringify(fx.month));
  const txs = [];
  let n;
  for (n = 1; n <= 12; n++) {
    txs.push({
      date: "2026-09-" + String(n).padStart(2, "0"),
      desc: "SAMPLE SHOP " + String(n).padStart(4, "0"),
      name: "Sample Shop " + n,
      descriptor: "SAMPLE SHOP " + String(n).padStart(4, "0") + " POS",
      amount: n,
      account_suffix: "1001",
      category_name: n % 2 ? "Groceries" : "Transit",
      tier: "needs"
    });
  }
  doc.transactions = txs;
  const html = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histMonth: "2026-09",
    recordIndex: fx.index,
    record: doc
  });
  const out = html.slice(html.indexOf("data-bank-rec-outflows"), html.indexOf("data-bank-rec-categories"));
  assert.equal((out.match(/data-bank-rec-open="out:/g) || []).length, 10);
  assert.match(out, /Show all 12/);
  assert.match(out, /Search transactions/);
  assert.match(out, /class="bank-chip"/);
  assert.doesNotMatch(out, /SAMPLE SHOP/);
  const open = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histMonth: "2026-09",
    recordIndex: fx.index,
    record: doc,
    recListOpen: { out: true }
  });
  const opened = open.slice(open.indexOf("data-bank-rec-outflows"), open.indexOf("data-bank-rec-categories"));
  assert.equal((opened.match(/data-bank-rec-open="out:/g) || []).length, 12);
  const found = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histMonth: "2026-09",
    recordIndex: fx.index,
    record: doc,
    recListQ: { out: "shop 12" },
    recTx: "out:0"
  });
  const searched = found.slice(found.indexOf("data-bank-rec-outflows"), found.indexOf("data-bank-rec-sheet"));
  assert.equal((searched.match(/data-bank-rec-open="out:/g) || []).length, 1);
  assert.match(found, /data-bank-tx-raw="1"[^>]*>SAMPLE SHOP 0012 POS/);
  assert.match(html, /data-bank-rec-income/);
  assert.match(html, /Search income/);
});

test("year row, money, top categories, colors, ranked list, and empty sections", function () {
  const ctx = boot();
  const fx = loadFixture();
  const years = ctx.bankRecordsYearHtml(null, { recordIndex: fx.index, histYear: "2026" });
  assert.equal((years.match(/data-bank-hist-year=/g) || []).length, 4);
  assert.match(years, /data-bank-year-row/);
  assert.match(years, /aria-pressed="true"/);
  assert.doesNotMatch(years, /More/);
  const row = {
    clientWidth: 200,
    scrollWidth: 480,
    scrollLeft: 0,
    setAttribute: function (name, value) { row[name] = value; },
    removeAttribute: function (name) { delete row[name]; },
    querySelector: function () {
      return { offsetLeft: 300, offsetWidth: 80 };
    }
  };
  const left = ctx.bankRecordsScrollYear(row);
  assert.equal(left, 240);
  assert.equal(row.scrollLeft, 240);
  assert.equal(row["data-bank-year-more"], "1");
  const on = row.querySelector();
  assert.ok(on.offsetLeft >= left && on.offsetLeft + on.offsetWidth <= left + row.clientWidth);

  const moneyDoc = JSON.parse(JSON.stringify(fx.month));
  moneyDoc.transactions[0].amount = 1234.5;
  moneyDoc.net_cash_flow = 1234.5;
  const money = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histMonth: "2026-09",
    recordIndex: fx.index,
    record: moneyDoc
  });
  assert.match(money, /1,234\.50/);
  assert.match(money, /\$/);

  const year = JSON.parse(JSON.stringify(fx.year));
  const names = ["Groceries", "Transit", "Dining", "Utilities", "Subscriptions", "Shopping", "Gifts"];
  year.charts.category_trends.series = names.map(function (name, i) {
    return { name: name, points: [{ month: "2026-01", value: (i + 1) * 3 }, { month: "2026-02", value: (i + 1) * 2 }] };
  });
  delete year.charts.category_trends.alternate;
  const top = ctx.bankPageHtml(snap(), { tab: "historical", histYear: "2026", recordIndex: fx.index, record: year });
  const trends = top.slice(top.indexOf('data-bank-rec-chart="category_trends"'), top.indexOf('data-bank-rec-chart="savings_rate"'));
  assert.match(trends, />All</);
  assert.match(trends, /Gifts/);
  assert.doesNotMatch(trends, /Groceries/);
  const all = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histYear: "2026",
    recordIndex: fx.index,
    record: year,
    recTrendsAll: true
  });
  const allTrends = all.slice(all.indexOf('data-bank-rec-chart="category_trends"'), all.indexOf('data-bank-rec-chart="savings_rate"'));
  assert.match(allTrends, /Groceries/);
  assert.match(allTrends, /Gifts/);
  const other = JSON.parse(JSON.stringify(year));
  other.year = "2025";
  const again = ctx.bankPageHtml(snap(), { tab: "historical", histYear: "2025", recordIndex: fx.index, record: other });
  function colorOf(html, name) {
    const at = html.indexOf(">" + name + "<");
    const prior = html.slice(Math.max(0, at - 80), at);
    const m = prior.match(/background:(var\(--[^)]+\))/);
    return m ? m[1] : "";
  }
  assert.equal(colorOf(top, "Gifts"), colorOf(again, "Gifts"));
  assert.ok(colorOf(top, "Gifts"));

  assert.match(top, /data-bank-rec-ranked/);
  assert.match(top, /bank-rec-flow-wide/);
  assert.match(top, /aria-label="Income flow"/);
  const ranked = top.slice(top.indexOf("data-bank-rec-ranked"), top.indexOf("data-bank-rec-ranked") + 500);
  assert.match(ranked, /Groceries/);
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  assert.match(css, /@media \(min-width: 900px\)[\s\S]*\.bank-rec-flow-narrow \{ display: none; \}[\s\S]*\.bank-rec-flow-wide \{ display: block; \}/);
  assert.match(css, /\.bank-year-scroll\[data-bank-year-row\] \{[^}]*flex-wrap: nowrap/);
  assert.match(css, /\.bank-view-title \{[^}]*white-space: nowrap/);

  const blankYear = JSON.parse(JSON.stringify(fx.year));
  blankYear.income_total = null;
  blankYear.charts = { category_trends: { available: false }, savings_rate: { available: false }, sankey: { available: false }, ytd_budget_vs_actual: { available: false }, monthly_in_out_net: { available: false } };
  blankYear.year_end_analysis = { what_went_right: [], what_went_wrong: [], habits_for_next_year: [] };
  const quiet = ctx.bankPageHtml(snap(), { tab: "historical", histYear: "2026", recordIndex: fx.index, record: blankYear });
  assert.match(quiet, /Income not available/);
  assert.doesNotMatch(quiet, /Not enough detail|Nothing listed|Nothing to plot/);
  assert.doesNotMatch(quiet, /data-bank-rec-chart="category_trends"|data-bank-rec-chart="sankey"|data-bank-rec-analysis/);
});

test("fit: filters, category columns, top 5, even tiles, signs, and daily ticks", function () {
  const ctx = boot();
  const fx = loadFixture();
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  assert.match(css, /\.bank-desk \.bank-record \.bank-rec-filters select \{[^}]*max-height:\s*48px/);
  assert.match(css, /\.bank-desk \.bank-hist-controls select\.bank-hist-select \{[^}]*max-width:\s*none/);
  assert.match(css, /\.bank-kpi\.bank-rec-kpis \{[^}]*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@media \(max-width: 899px\) \{[\s\S]*?\.bank-rec-col-wide \{ display: none; \}/);
  assert.match(css, /\.bank-year-scroll\[data-bank-year-row\] \{[^}]*flex-wrap:\s*nowrap/);
  assert.match(css, /\.bank-view-title \{[^}]*white-space:\s*nowrap/);

  const month = ctx.bankPageHtml(snap(), {
    tab: "historical",
    histMonth: "2026-09",
    recordIndex: fx.index,
    record: fx.month
  });
  assert.doesNotMatch(month, /<h3>Purchases<\/h3>|data-bank-rec-purchases/);
  assert.match(month, /data-bank-rec-filter="tier"/);
  assert.match(month, /data-bank-rec-filter="account"/);
  assert.match(month, /data-bank-rec-filter="rhythm"/);
  assert.match(month, /class="bank-rec-col-wide"/);
  assert.match(month, /<th>Actual<\/th>/);
  assert.match(month, /<th>Diff<\/th>/);

  const names = [];
  let i;
  for (i = 0; i < 12; i++) names.push("Sample " + String.fromCharCode(65 + i));
  const year = JSON.parse(JSON.stringify(fx.year));
  year.income_total = 172954.66;
  year.outflow_total = 80420.5;
  year.net_cash_flow = 92534.16;
  year.charts.category_trends.series = names.map(function (name, n) {
    return { name: name, points: [{ month: "2026-01", value: (n + 1) * 10 }, { month: "2026-02", value: (n + 1) * 4 }] };
  });
  delete year.charts.category_trends.alternate;
  const html = ctx.bankPageHtml(snap(), { tab: "historical", histYear: "2026", recordIndex: fx.index, record: year });
  const trends = html.slice(html.indexOf('data-bank-rec-chart="category_trends"'), html.indexOf('data-bank-rec-chart="savings_rate"'));
  const legend = trends.slice(trends.indexOf('class="bank-legend"'));
  assert.equal((legend.match(/<li>/g) || []).length, 5);
  assert.match(legend, /Sample L/);
  assert.doesNotMatch(legend, /Sample A/);
  const other = JSON.parse(JSON.stringify(year));
  other.year = "2025";
  const again = ctx.bankPageHtml(snap(), { tab: "historical", histYear: "2025", recordIndex: fx.index, record: other });
  function colorOf(page, name) {
    const at = page.indexOf(">" + name + "<");
    const prior = page.slice(Math.max(0, at - 80), at);
    const found = prior.match(/background:(var\(--[^)]+\))/);
    return found ? found[1] : "";
  }
  assert.equal(colorOf(html, "Sample L"), colorOf(again, "Sample L"));
  assert.ok(colorOf(html, "Sample L"));

  const summary = html.slice(html.indexOf("data-bank-rec-summary"), html.indexOf("data-bank-rec-charts"));
  const inn = summary.slice(summary.indexOf('data-k="in"'), summary.indexOf('data-k="out"'));
  const out = summary.slice(summary.indexOf('data-k="out"'), summary.indexOf('data-k="net"'));
  const net = summary.slice(summary.indexOf('data-k="net"'), summary.indexOf('data-k="net_operating"'));
  assert.ok(inn.indexOf(ctx.bankMoney(172954.66)) >= 0);
  assert.equal(inn.indexOf("+"), -1);
  assert.ok(out.indexOf(ctx.bankMoney(80420.5)) >= 0);
  assert.equal(out.indexOf("+"), -1);
  assert.equal(out.indexOf("\u2212"), -1);
  assert.match(out, /tone-stop/);
  assert.ok(net.indexOf(ctx.bankMoney(92534.16)) >= 0);
  assert.equal(net.indexOf("+"), -1);
  assert.match(net, /tone-go/);
  const tiles = summary.match(/data-k="/g) || [];
  assert.equal(tiles.length % 5, 0);

  const dates = [];
  for (i = 1; i <= 31; i++) dates.push("2026-10-" + String(i).padStart(2, "0"));
  const ticks = ctx.recTickIndexes(dates);
  assert.equal(ticks.map(function (at) { return Number(String(dates[at]).slice(8)); }).join(","), "5,10,15,20,25,31");
  const svg = ctx.recLineSvg({
    label: "Daily balances",
    dates: dates,
    labels: dates.map(function (d) { return ctx.recDayLabel(d).replace(/, \d{4}$/, ""); }),
    values: dates.map(function (_d, n) { return 100 + n; }),
    series: [{ name: "Sample", values: dates.map(function (_d, n) { return 100 + n; }), color: "var(--go)" }]
  });
  const axis = [];
  const re = /<text x="([\d.]+)"[^>]*>([^<]+)<\/text>/g;
  let found;
  while ((found = re.exec(svg))) axis.push({ x: Number(found[1]), t: found[2] });
  const days = axis.filter(function (row) { return /^[A-Z][a-z]{2} \d/.test(row.t); });
  days.sort(function (a, b) { return a.x - b.x; });
  assert.ok(days.length >= 6);
  function edges(row, index, count) {
    var w = String(row.t).length * 6.6;
    if (index === 0) return { left: row.x, right: row.x + w };
    if (index === count - 1) return { left: row.x - w, right: row.x };
    return { left: row.x - w / 2, right: row.x + w / 2 };
  }
  for (i = 1; i < days.length; i++) {
    var prev = edges(days[i - 1], i - 1, days.length);
    var next = edges(days[i], i, days.length);
    assert.ok(next.left > prev.right, days[i - 1].t);
  }
});
