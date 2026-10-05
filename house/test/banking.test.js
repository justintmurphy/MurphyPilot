"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const fixturePath = path.join(__dirname, "fixtures", "banking-ui.json");

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

function boot() {
  const document = {
    addEventListener: function () {},
    removeEventListener: function () {},
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    documentElement: { setAttribute: function () {}, getAttribute: function () { return "justin"; } }
  };
  const sandbox = {
    localStorage: {
      getItem: function () { return null; },
      setItem: function () {},
      removeItem: function () {}
    },
    document: document,
    location: { hash: "", pathname: "/", search: "" },
    history: { replaceState: function () {} },
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
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8"), sandbox, { filename: "banking.js" });
  return sandbox;
}

function mount(ctx, data, opts) {
  const rootEl = {
    innerHTML: "",
    listeners: {},
    addEventListener: function (type, fn) { this.listeners[type] = fn; }
  };
  ctx.bankMount(rootEl, data, opts || {});
  return rootEl;
}

test("null money stays blank and a real zero is zero", function () {
  const ctx = boot();
  assert.equal(ctx.bankMoney(null), "\u2014");
  assert.equal(ctx.bankMoney(undefined), "\u2014");
  assert.equal(ctx.bankMoney(""), "\u2014");
  assert.equal(ctx.bankMoney(0), "$0.00");
  assert.equal(ctx.bankMoney(12.34), "$12.34");
});

test("null balances are not shown as $0 and an empty tape stays hidden", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.current.recent_tx = [];
  const html = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(html, /data-panel="current"/);
  assert.match(html, /data-bank-tab="current"[^>]*aria-selected="true"/);
  const debit = html.match(/<article class="bank-tile"[^>]*data-acct="Debit Account"[\s\S]*?<\/article>/);
  assert.ok(debit);
  assert.match(debit[0], /data-balance="missing"/);
  assert.doesNotMatch(debit[0], /\$0/);
  assert.match(debit[0], /\u2014/);
  const total = html.match(/data-total="missing"[\s\S]*?<\/article>/);
  assert.ok(total);
  assert.doesNotMatch(total[0], /\$0/);
  assert.match(html, /data-acct="Overdraft"[^>]*data-balance="0"/);
  assert.match(html, /data-acct="Check Account"[\s\S]*?\$12\.34/);
  assert.doesNotMatch(html, /bank-tape/);
  assert.doesNotMatch(html, /bank-stale/);
  assert.match(html, /class="bank-spark"/);
  assert.match(html, /Other/);
  assert.doesNotMatch(html, /Paycheck\/Salary\/Wages<\/span>/);
});

test("stale badge appears only after 36h and a share series skips null points", function () {
  const ctx = boot();
  const fx = loadFixture();
  const fresh = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-06T12:00:00-04:00" });
  assert.doesNotMatch(fresh, /bank-stale/);
  const stale = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-07T12:00:00-04:00" });
  assert.match(stale, /bank-stale/);
  assert.match(stale, /36h/);
  const series = ctx.bankSparkSeries(fx);
  const check = series.filter(function (s) { return s.id === "acct-check"; })[0];
  const share = series.filter(function (s) { return s.id === "acct-share"; });
  assert.ok(check && check.points.length >= 2);
  assert.equal(share.length, 0);
  check.points.forEach(function (p) { assert.notEqual(p.value, 0); });
});

test("tabs switch through the click path and historical labels an open month", function () {
  const ctx = boot();
  const fx = loadFixture();
  const el = mount(ctx, fx, { now: "2026-10-05T18:00:00-04:00" });
  assert.match(el.innerHTML, /data-panel="current"/);
  const budgetBtn = {
    getAttribute: function () { return "budget"; },
    closest: function (sel) { return sel === "[data-bank-tab]" ? budgetBtn : null; }
  };
  el.listeners.click({ target: budgetBtn });
  assert.match(el.innerHTML, /data-panel="budget"/);
  assert.match(el.innerHTML, /data-bank-tab="budget"[^>]*aria-selected="true"/);
  const histBtn = {
    getAttribute: function () { return "historical"; },
    closest: function (sel) { return sel === "[data-bank-tab]" ? histBtn : null; }
  };
  el.listeners.click({ target: histBtn });
  assert.match(el.innerHTML, /data-panel="historical"/);
  assert.match(el.innerHTML, /<div class="bank-month-head">/);
  assert.doesNotMatch(el.innerHTML, /<header class="bank-month-head">/);
  assert.match(el.innerHTML, /in progress/);
  ctx.bankActivateMonth(el, "2026-09");
  assert.match(el.innerHTML, /data-k="income"[^>]*data-missing="1"/);
  assert.match(el.innerHTML, /data-k="spend"[^>]*data-missing="0"/);
  const debitEnd = el.innerHTML.match(/data-end="Debit Account"[^>]*>[^<]*/);
  assert.ok(debitEnd);
  assert.match(debitEnd[0], /data-missing="1"/);
  assert.doesNotMatch(debitEnd[0], /\$0/);
  ctx.bankActivateMonth(el, "year");
  assert.match(el.innerHTML, /class="bank-year"/);
  assert.match(el.innerHTML, /<rect /);
  assert.match(el.innerHTML, /<details class="bank-more">/);
  assert.doesNotMatch(el.innerHTML, /<details class="bank-more" open/);
  ctx.bankActivate(el, "current");
  assert.match(el.innerHTML, /data-panel="current"/);
});

test("empty calendar shows the due-day empty state and insights keep severity", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.budget.bills = [{ name: "Phone", amount: 12.34, typical_day: null, cadence: "monthly", category: "Utilities/Bills" }];
  fx.budget.bills_monthly = [];
  const html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /Due days need more history/);
  assert.doesNotMatch(html, /class="bank-days"/);
  assert.match(html, /sev-red/);
  assert.match(html, /sev-amber/);
  assert.match(html, /Groceries \+\$12\.34 vs 3-mo avg/);
  assert.doesNotMatch(html, /sev-ok/);
  assert.match(html, /class="bank-bar over"[^>]*data-bar="Groceries"/);
  assert.match(html, /class="bank-bar"[^>]*data-bar="Shopping"/);
  assert.doesNotMatch(html, /class="bank-bar over"[^>]*data-bar="Shopping"/);
  assert.doesNotMatch(html, /data-bar="Health"/);
  assert.doesNotMatch(html, /\$0/);
});

test("bills_monthly maps label and due day, and a paycheck groups the calendar", function () {
  const ctx = boot();
  const bills = ctx.bankNormalizeBills({
    bills: [{ name: "Rent", amount: 12.34, typical_day: null, cadence: "monthly" }],
    bills_monthly: [{ label: "Rent", due_day: 3, amount: 99 }, { label: "Water", due_day: 18, amount: 12.34, category: "Utilities/Bills" }]
  });
  assert.equal(bills[0].name, "Rent");
  assert.equal(bills[0].typical_day, 3);
  assert.equal(bills[0].amount, 12.34);
  assert.equal(bills[1].name, "Water");
  assert.equal(bills[1].typical_day, 18);
  const aliasOnly = ctx.bankNormalizeBills({
    bills_monthly: [{ label: "Insurance", due_day: 12, amount: 12.34 }]
  });
  assert.equal(aliasOnly[0].name, "Insurance");
  assert.equal(aliasOnly[0].typical_day, 12);

  const fx = loadFixture();
  fx.budget.income_monthly[0].typical_day = 1;
  fx.budget.bills[0].typical_day = 15;
  fx.budget.calendar = [{ day: 15, items: [{ name: "Phone" }] }];
  const html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.doesNotMatch(html, /Due days need more history/);
  assert.match(html, /class="bank-days"/);
  assert.match(html, /This check \(Paycheck, day 1\) covers:/);
  assert.match(html, /Phone/);
});

test("a detected due day beats the filler and a null day still gets one", function () {
  const ctx = boot();
  function dayOf(raw, extra) {
    const budget = Object.assign({ bills: [raw] }, extra || {});
    return ctx.bankNormalizeBills(budget)[0];
  }
  [
    ["Mortgage", 1],
    ["mortgage payment", 1],
    ["Mobile plan", 28],
    ["mobile", 28],
    ["Car payment", 15],
    ["Auto Loan", 15],
    ["Auto Pay", 15],
    ["Auto Payment", 15],
    ["Vehicle Loan", 15],
    ["Electric", 15],
    ["Power", 15],
    ["Utility Electric", 15],
    ["Gas Bill", 15],
    ["Natural Gas", 15],
    ["Gas utility", 15],
    ["Gas (Utility)", 15]
  ].forEach(function (pair) {
    const row = dayOf({ name: pair[0], amount: 12.34, typical_day: null });
    assert.equal(row.typical_day, pair[1], pair[0]);
    assert.equal(row.due_day, pair[1], pair[0]);
  });
  assert.equal(dayOf({ name: "Cargo", amount: 12.34, typical_day: null }).typical_day, null);
  assert.equal(dayOf({ name: "Gasoline", amount: 12.34, typical_day: null }).typical_day, null);
  assert.equal(dayOf({ name: "City Fuel", amount: 12.34, typical_day: null }).typical_day, null);
  const detected = dayOf({ name: "Power", amount: 12.34, typical_day: 3, source: "detected" });
  assert.equal(detected.typical_day, 3);
  assert.equal(detected.due_day, 3);
  assert.equal(dayOf({ name: "Electric", amount: 12.34, typical_day: 20, source: "detected" }).typical_day, 20);
  const kv = ctx.bankNormalizeBills(
    { bills: [{ name: "Power", amount: 12.34, typical_day: 3, source: "detected" }] },
    { power: 9 }
  )[0];
  assert.equal(kv.typical_day, 9);
  assert.equal(kv.source, "user");
  const restored = ctx.bankNormalizeBills(
    { bills: [{ name: "Power", amount: 12.34, typical_day: 3, source: "detected" }] },
    { power: null }
  )[0];
  assert.equal(restored.typical_day, 3);
  assert.notEqual(restored.source, "user");
  const manual = dayOf({ name: "Mortgage", amount: 12.34, typical_day: 5, source: "manual" });
  assert.equal(manual.typical_day, 5);
  assert.equal(manual.due_day, 5);
  assert.equal(manual.source, "manual");
  const pinned = dayOf(
    { name: "Mobile plan", amount: 12.34, typical_day: null },
    { overrides: [{ match: "Mobile plan", field: "due_day", value: 9, by: "fixture", at: "2026-10-05", source: "manual" }] }
  );
  assert.equal(pinned.typical_day, 9);
  assert.equal(pinned.due_day, 9);
  assert.equal(pinned.source, "manual");
  const monthly = ctx.bankNormalizeBills({
    bills_monthly: [{ label: "Mortgage", due_day: null, amount: 12.34 }]
  });
  assert.equal(monthly[0].typical_day, 1);

  const fx = loadFixture();
  fx.budget.bills = [
    { name: "Mortgage", amount: 12.34, typical_day: null, cadence: "monthly" },
    { name: "Mobile plan", amount: 12.34, typical_day: null, cadence: "monthly" },
    { name: "Car payment", amount: 12.34, typical_day: null, cadence: "monthly" },
    { name: "Electric", amount: 12.34, typical_day: null, cadence: "monthly" },
    { name: "Gas (Utility)", amount: 12.34, typical_day: null, cadence: "monthly" }
  ];
  fx.budget.bills_monthly = [];
  fx.budget.income_monthly[0].typical_day = null;
  const html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /<div class="bank-day has"><b>1<\/b><span>Mortgage<\/span>/);
  assert.match(html, /<div class="bank-day has"><b>28<\/b><span>Mobile plan<\/span>/);
  assert.match(html, /<b>15<\/b><span>Car payment<\/span><span>Electric<\/span><span>Gas \(Utility\)<\/span>/);
  assert.doesNotMatch(html, /data-bank-due/);
  assert.doesNotMatch(html, /data-bank-cat/);
  assert.doesNotMatch(html, /<select/);
  assert.doesNotMatch(html, /Due days need more history/);
});

test("a transaction row shows a category chip and a blank category becomes Other", function () {
  const ctx = boot();
  const fx = loadFixture();
  const sample = [
    { date: "2026-10-05", id: "acct-check", desc: "Sample", amount: 12.34, flow: "outflow", category: "" },
    { date: "2026-10-04", id: "acct-check", desc: "Sample", amount: null, flow: "transfer", category: "Transfer" }
  ];
  fx.current.recent_tx = sample;
  fx.current.edits_tx = sample;
  const html = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(html, /bank-tape/);
  assert.match(html, /class="bank-merchant">Sample<\/span><span class="bank-chip">Other<\/span>/);
  assert.match(html, /class="bank-chip">Transfer<\/span>/);
  assert.match(html, /Main Street Cafe|Sample[\s\S]*?\u2014/);
  assert.doesNotMatch(html, /<select/);
  assert.doesNotMatch(html, /data-bank-tx/);
  const edits = ctx.bankPageHtml(fx, { tab: "edits", now: "2026-10-05T18:00:00-04:00" });
  const rowAt = edits.indexOf('data-bank-tx="2026-10-04|acct-check||Sample"');
  assert.ok(rowAt >= 0);
  const row = edits.slice(rowAt, edits.indexOf("</li>", rowAt));
  assert.match(row, /value="Transfer" selected/);
  assert.match(row, /\u2014/);
  assert.doesNotMatch(row, /\$0/);
});

test("fetch failure paints a gate and does not invent balances", async function () {
  const ctx = boot();
  async function paint(status) {
    const el = { innerHTML: "LOADING" };
    await ctx.bankLoad(el, function () {
      return Promise.resolve({ ok: false, status: status });
    });
    return el.innerHTML;
  }
  const locked = await paint(401);
  assert.match(locked, /data-bank-gate="gate"/);
  assert.match(locked, /one-time passcode/i);
  assert.doesNotMatch(locked, /\$/);
  const missing = await paint(404);
  assert.match(missing, /data-bank-gate="missing"/);
  assert.match(missing, /did not find banking data/i);
  assert.doesNotMatch(missing, /\$0/);
  const el = { innerHTML: "" };
  await ctx.bankLoad(el, function () { return Promise.reject(new Error("offline")); });
  assert.match(el.innerHTML, /data-bank-gate="error"/);
  assert.doesNotMatch(el.innerHTML, /\$0/);
  const src = fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8");
  assert.match(src, /\/data\/banking\.json/);
  assert.match(src, /credentials:\s*"include"/);
  assert.match(src, /Accept:\s*"application\/json"/);
  assert.doesNotMatch(src, /banking-snapshot\.json/);
});

test("desk links Banking and banking assets are cache-busted at tip ct", function () {
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const page = fs.readFileSync(path.join(root, "house/banking/index.html"), "utf8");
  const nav = fs.readFileSync(path.join(root, "house/js/board-b.js"), "utf8");
  const houseCss = fs.readFileSync(path.join(root, "house/house.css"), "utf8");
  const bankCss = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  assert.match(index, /href="\/house\/banking\/"/);
  assert.doesNotMatch(index, /href="\/house\/banking"/);
  assert.match(index, /house\.css\?v=20260904cn/);
  assert.match(nav, /href="\/house\/banking\/">Banking</);
  assert.match(page, /\/house\/js\/banking\.js\?v=20260904ct/);
  assert.match(page, /\/house\/banking\.css\?v=20260904ct/);
  assert.match(page, /\/house\/house\.css\?v=20260904cn/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cn/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cp/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904cp/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cq/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904cq/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cr/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904cr/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cs/);
  assert.doesNotMatch(page, /href="\.\.\//);
  assert.doesNotMatch(page, /src="\.\.\//);
  assert.match(page, /id="bankDesk"/);
  assert.match(page, /href="\/house\/banking\/"/);
  assert.match(houseCss, /@media \(max-width: 720px\) \{\s*header \.section-nav \{ display: none; \}/);
  assert.match(bankCss, /\.bank-cal \{\s*min-width: 0;\s*\}/);
  assert.match(bankCss, /\.bank-days \{[^}]*overflow-x: auto;/);
  assert.match(bankCss, /\.bank-budget-top \{\s*grid-template-columns: minmax\(0, 1fr\);/);
});

test("a successful feed mounts the current tab", async function () {
  const ctx = boot();
  const el = { innerHTML: "", addEventListener: function () {} };
  await ctx.bankLoad(el, function () {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: function () { return Promise.resolve(loadFixture()); }
    });
  });
  assert.match(el.innerHTML, /data-panel="current"/);
  assert.match(el.innerHTML, /data-balance="missing"/);
  assert.doesNotMatch(el.innerHTML, /data-acct="Debit Account"[\s\S]{0,120}\$0/);
});

test("one-category pie renders without throwing", function () {
  const ctx = boot();
  const html = ctx.bankPieHtml([{ name: "Groceries", amount: 12.34 }]);
  assert.match(html, /<path /);
  assert.match(html, /Groceries/);
});

test("merchant is the tape label and an empty desc uses a placeholder", function () {
  const ctx = boot();
  const fx = loadFixture();
  const html = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(html, /class="bank-merchant">Corner Market<\/span><span class="bank-chip">Groceries<\/span>/);
  assert.match(html, /class="bank-merchant">City Fuel<\/span><span class="bank-chip">Transport<\/span>/);
  assert.match(html, /class="bank-merchant">No description<\/span><span class="bank-chip">Shopping<\/span>/);
  assert.doesNotMatch(html, /class="bank-merchant">Shopping<\/span><span class="bank-chip">Shopping<\/span>/);
  assert.doesNotMatch(html, /class="bank-merchant"><\/span>/);
  assert.doesNotMatch(html, /class="bank-desc"/);
  assert.doesNotMatch(html, /<select/);
  assert.doesNotMatch(html, /data-bank-tx/);
  assert.doesNotMatch(html, /data-bank-cat/);
  assert.match(html, /Main Street Cafe[\s\S]*?<td>\u2014<\/td>/);
  assert.doesNotMatch(html, /Category edits sync across your seats/);
  const edits = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Transport", now: "2026-10-05T18:00:00-04:00" });
  assert.match(edits, /data-panel="edits"/);
  assert.match(edits, /data-bank-tab="edits"[^>]*aria-selected="true"/);
  assert.match(edits, /data-bank-cat/);
  assert.match(edits, /value="Transport" selected/);
  assert.match(edits, /class="bank-merchant">City Fuel<\/span><span class="bank-edit-meta">2026-10-04<\/span>/);
  const fuel = edits.match(/data-bank-tx="2026-10-04\|acct-check\|12\.34\|City Fuel"[\s\S]*?<\/select>/);
  assert.ok(fuel);
  assert.match(fuel[0], /value="Transport" selected/);
  assert.doesNotMatch(edits, /data-bank-tx="2026-10-05\|acct-check\|12\.34\|Corner Market"/);
  const shopping = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Shopping", now: "2026-10-05T18:00:00-04:00" });
  assert.match(shopping, /class="bank-merchant">No description<\/span><span class="bank-edit-meta">2026-10-03<\/span>/);
  assert.doesNotMatch(shopping, /class="bank-merchant">Shopping<\/span>/);
  assert.match(edits, /Category edits sync across your seats/);
  assert.doesNotMatch(edits, /this device/);
  assert.equal(ctx.bankResolveTab("#edits"), "edits");
  ["current", "historical", "budget"].forEach(function (tab) {
    const page = ctx.bankPageHtml(fx, { tab: tab, now: "2026-10-05T18:00:00-04:00" });
    assert.doesNotMatch(page, /data-bank-tx/);
    assert.doesNotMatch(page, /data-bank-cat/);
    assert.doesNotMatch(page, /data-bank-due/);
    assert.doesNotMatch(page, /data-bank-add-cat/);
    assert.doesNotMatch(page, /data-bank-new-cat/);
    assert.doesNotMatch(page, /data-bank-row-cat/);
    assert.doesNotMatch(page, /Add category/);
  });
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  assert.match(css, /\.bank-merchant\s*\{[^}]*font-weight:\s*600/);
  assert.match(css, /\.bank-chip\s*\{[^}]*font-size:\s*11px/);
  assert.match(css, /\.bank-cat-pick select\s*\{[^}]*var\(--brand-fg\)/);
  const rank = html.match(/<ol class="bank-rank">[\s\S]*?<\/ol>/);
  assert.ok(rank);
  assert.match(rank[0], /Groceries/);
  assert.doesNotMatch(rank[0], /Transport/);
  const src = fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8");
  const fixtureSrc = fs.readFileSync(fixturePath, "utf8");
  assert.doesNotMatch(src, /Duquesne|Columbia Gas|T-Mobile|M&T|nfcu/i);
  assert.doesNotMatch(fixtureSrc, /Duquesne|Columbia Gas|T-Mobile|M&T|nfcu/i);
});

test("tape stays hidden when recent_tx is empty", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.current.recent_tx = [];
  const html = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.doesNotMatch(html, /bank-tape/);
  assert.doesNotMatch(html, /bank-merchant/);
  assert.doesNotMatch(html, /bank-sync/);
});

test("category override posts to the feed and repaints without localStorage", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const writes = [];
  ctx.localStorage.setItem = function (k, v) { writes.push(k + "=" + v); };
  const calls = [];
  ctx.fetch = function (url, init) {
    calls.push({ url: String(url), init: init });
    const body = JSON.parse(init.body);
    const overrides = Object.assign({}, fx.category_overrides || {});
    overrides[body.key] = body.category;
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () {
        return Promise.resolve({
          schema: "banking-category-overrides/v1",
          updated_at: "2026-10-05T18:00:00-04:00",
          overrides: overrides
        });
      }
    });
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", now: "2026-10-05T18:00:00-04:00" });
  const key = "2026-10-05|acct-check|12.34|Corner Market";
  assert.ok(el.innerHTML.indexOf('data-bank-tx="' + key + '"') >= 0);
  const sel = {
    value: "Food/Drink",
    getAttribute: function (name) { return name === "data-bank-tx" ? key : null; },
    hasAttribute: function () { return false; }
  };
  await el.listeners.change({ target: sel });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/data/banking/overrides.json");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.credentials, "include");
  assert.equal(calls[0].init.headers.Accept, "application/json");
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  assert.equal(calls[0].init.redirect, "manual");
  const posted = JSON.parse(calls[0].init.body);
  assert.equal(posted.key, key);
  assert.equal(posted.category, "Food/Drink");
  assert.equal(el.innerHTML.indexOf('data-bank-tx="' + key + '"'), -1);
  assert.match(el.innerHTML, /value="Groceries" selected/);
  assert.match(el.innerHTML, /Category edits sync across your seats/);
  assert.equal(writes.length, 0);
  await el.listeners.change({
    target: {
      value: "Food/Drink",
      getAttribute: function () { return null; },
      hasAttribute: function (name) { return name === "data-bank-cat"; }
    }
  });
  assert.equal(calls.length, 1);
  const chipAt = el.innerHTML.indexOf('data-bank-tx="' + key + '"');
  assert.ok(chipAt >= 0);
  const chip = el.innerHTML.slice(chipAt, el.innerHTML.indexOf("</select>", chipAt));
  assert.match(chip, /value="Food\/Drink" selected/);
  assert.match(el.innerHTML, /class="bank-merchant">Corner Market<\/span><span class="bank-edit-meta">2026-10-05<\/span>/);
  ctx.bankActivate(el, "current");
  assert.match(el.innerHTML, /class="bank-merchant">Corner Market<\/span><span class="bank-chip">Food\/Drink<\/span>/);
  assert.doesNotMatch(el.innerHTML, /data-bank-tx/);
  const rank = el.innerHTML.match(/<ol class="bank-rank">[\s\S]*?<\/ol>/);
  assert.ok(rank);
  assert.match(rank[0], /<span>Groceries<\/span><b>\$12\.34<\/b>/);
  assert.doesNotMatch(rank[0], /Food\/Drink/);
});

test("a failed override leaves the chip and does not use localStorage", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const writes = [];
  ctx.localStorage.setItem = function (k, v) { writes.push(k + "=" + v); };
  for (const status of [404, 405]) {
    ctx.fetch = function () {
      return Promise.resolve({ ok: false, status: status, type: "basic" });
    };
    const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", now: "2026-10-05T18:00:00-04:00" });
    const key = "2026-10-05|acct-check|12.34|Corner Market";
    const sel = {
      value: "Health",
      getAttribute: function (name) { return name === "data-bank-tx" ? key : null; },
      hasAttribute: function () { return false; }
    };
    await el.listeners.change({ target: sel });
    const chipAt = el.innerHTML.indexOf('data-bank-tx="' + key + '"');
    assert.ok(chipAt >= 0);
    const chip = el.innerHTML.slice(chipAt, el.innerHTML.indexOf("</select>", chipAt));
    assert.match(chip, /value="Groceries" selected/);
    assert.doesNotMatch(chip, /value="Health" selected/);
    assert.match(el.innerHTML, /not on the feed yet/);
    assert.match(el.innerHTML, /Nothing was saved/);
  }
  assert.equal(writes.length, 0);
});

test("override post refetches banking.json when the body has no map", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const copy = JSON.parse(JSON.stringify(fx));
  const urls = [];
  let n = 0;
  ctx.fetch = function (url) {
    n += 1;
    urls.push(String(url));
    if (n === 1) {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () { return Promise.resolve({ ok: true }); }
      });
    }
    copy.category_overrides = Object.assign({}, copy.category_overrides, {
      "2026-10-05|acct-check|12.34|Corner Market": "Health"
    });
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () { return Promise.resolve(copy); }
    });
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", now: "2026-10-05T18:00:00-04:00" });
  const key = "2026-10-05|acct-check|12.34|Corner Market";
  await el.listeners.change({
    target: {
      value: "Health",
      getAttribute: function (name) { return name === "data-bank-tx" ? key : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.deepEqual(urls, ["/data/banking/overrides.json", "/data/banking.json"]);
  assert.equal(el.innerHTML.indexOf('data-bank-tx="' + key + '"'), -1);
  await el.listeners.change({
    target: {
      value: "Health",
      getAttribute: function () { return null; },
      hasAttribute: function (name) { return name === "data-bank-cat"; }
    }
  });
  const chipAt = el.innerHTML.indexOf('data-bank-tx="' + key + '"');
  assert.ok(chipAt >= 0);
  const chip = el.innerHTML.slice(chipAt, el.innerHTML.indexOf("</select>", chipAt));
  assert.match(chip, /value="Health" selected/);
});

test("banking fetch asks for JSON and a login redirect counts as locked", async function () {
  const ctx = boot();
  const init = ctx.bankFetchInit();
  assert.equal(init.headers.Accept, "application/json");
  assert.equal(init.credentials, "include");
  assert.equal(init.redirect, "manual");
  assert.equal(init.cache, "no-store");
  const posted = ctx.bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  assert.equal(posted.headers.Accept, "application/json");
  assert.equal(posted.headers["Content-Type"], "application/json");
  assert.equal(posted.method, "POST");
  const el = { innerHTML: "" };
  await ctx.bankLoad(el, function () {
    return Promise.resolve({ ok: false, status: 0, type: "opaqueredirect" });
  });
  assert.match(el.innerHTML, /data-bank-gate="gate"/);
  assert.match(el.innerHTML, /Banking is locked/);
  assert.equal(ctx.bankTxKey({
    date: "2026-10-05",
    id: "acct-check",
    amount: 12.34,
    desc: "Corner Market"
  }), "2026-10-05|acct-check|12.34|Corner Market");
  assert.equal(ctx.bankTxKey({ date: "2026-10-02", id: "acct-share", amount: null, desc: "Main Street Cafe" }),
    "2026-10-02|acct-share||Main Street Cafe");
});

test("selecting a bill posts its due day and a null amount stays pending", async function () {
  const ctx = boot();
  assert.equal(ctx.bankBillKey("  Mortgage "), "mortgage");
  assert.equal(ctx.bankBillKey("Mobile plan"), "mobile plan");
  assert.equal(ctx.bankBillKey("Gas (Utility)"), "gas (utility)");
  const pinned = ctx.bankNormalizeBills(
    { bills: [{ name: "Mortgage", amount: null, typical_day: null }] },
    { mortgage: 4 }
  )[0];
  assert.equal(pinned.typical_day, 4);
  assert.equal(pinned.due_day, 4);
  assert.equal(pinned.source, "user");
  const kept = ctx.bankNormalizeBills({
    bills: [{ name: "Mortgage", amount: 12.34, typical_day: 4, source: "user" }]
  })[0];
  assert.equal(kept.typical_day, 4);
  assert.equal(kept.source, "user");
  const cleared = ctx.bankNormalizeBills(
    { bills: [{ name: "Mobile plan", amount: 12.34, typical_day: 3, source: "user" }] },
    { "mobile plan": null }
  )[0];
  assert.equal(cleared.typical_day, 28);
  assert.notEqual(cleared.source, "user");

  const fx = loadFixture();
  const html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /class="bank-pending">amount pending/);
  assert.doesNotMatch(html, /data-bank-due/);
  assert.doesNotMatch(html, /data-bank-bill/);
  assert.doesNotMatch(html, /\$0\.00/);
  assert.doesNotMatch(html, /Due days on this browser/);
  const editsHtml = ctx.bankPageHtml(fx, { tab: "edits" });
  assert.match(editsHtml, /data-bank-due="car payment"/);
  assert.match(editsHtml, /data-bank-due="mortgage"/);
  assert.match(editsHtml, /data-bank-due="gas \(utility\)"/);
  assert.match(editsHtml, /amount pending/);
  assert.match(editsHtml, />Default</);
  assert.doesNotMatch(editsHtml, />Clear</);

  const writes = [];
  ctx.localStorage.setItem = function (k, v) { writes.push(k + "=" + v); };
  const calls = [];
  ctx.fetch = function (url, init) {
    calls.push({ url: String(url), init: init });
    const body = JSON.parse(init.body);
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () {
        return Promise.resolve({
          schema: "banking-dueday-overrides/v1",
          overrides: { "car payment": body.day }
        });
      }
    });
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits" });
  assert.match(el.innerHTML, /data-panel="edits"/);
  assert.match(el.innerHTML, /data-bank-due="car payment"/);
  await el.listeners.change({
    target: {
      value: "16",
      getAttribute: function (name) { return name === "data-bank-due" ? "car payment" : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/data/banking/dueday-overrides.json");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.credentials, "include");
  assert.equal(calls[0].init.headers.Accept, "application/json");
  assert.deepEqual(JSON.parse(calls[0].init.body), { key: "car payment", day: 16 });
  assert.match(el.innerHTML, /data-bank-due="car payment"[\s\S]*value="16" selected/);
  assert.match(el.innerHTML, /Due day edits sync across your seats/);
  assert.equal(writes.length, 0);
  ctx.bankActivate(el, "budget");
  assert.match(el.innerHTML, /<b>16<\/b><span>Car payment<\/span>/);
  assert.doesNotMatch(el.innerHTML, /data-bank-due/);

  await el.listeners.change({
    target: {
      value: "",
      getAttribute: function (name) { return name === "data-bank-due" ? "car payment" : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(calls[1].init.body).day, null);
  assert.match(el.innerHTML, /<b>15<\/b><span>Car payment<\/span>/);
});

test("a failed due-day edit leaves the bill and does not use localStorage", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const writes = [];
  ctx.localStorage.setItem = function (k, v) { writes.push(k + "=" + v); };
  ctx.fetch = function () {
    return Promise.resolve({ ok: false, status: 404, type: "basic" });
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits" });
  assert.match(el.innerHTML, /data-bank-due="electric"/);
  await el.listeners.change({
    target: {
      value: "2",
      getAttribute: function (name) { return name === "data-bank-due" ? "electric" : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.match(el.innerHTML, /not on the feed yet/);
  assert.match(el.innerHTML, /Nothing was saved/);
  assert.match(el.innerHTML, /data-bank-due="electric"[\s\S]*value="15" selected/);
  assert.doesNotMatch(el.innerHTML, /value="2" selected/);
  assert.equal(writes.length, 0);
});

test("edits lists edits_tx across months and bills prefer typical_amount", function () {
  const ctx = boot();
  const fx = loadFixture();
  assert.equal(ctx.bankEditRows(fx).length, fx.current.edits_tx.length);
  assert.ok(fx.current.edits_tx.length > fx.current.recent_tx.length);
  const current = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(current, /Corner Market/);
  assert.doesNotMatch(current, /Neighborhood Grocer/);
  assert.doesNotMatch(current, /Weekly Market/);
  assert.doesNotMatch(current, /data-bank-tx/);
  const groceries = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Groceries" });
  assert.match(groceries, /Neighborhood Grocer<\/span><span class="bank-edit-meta">2026-05-22/);
  assert.match(groceries, /Neighborhood Grocer<\/span><span class="bank-edit-meta">2026-08-21/);
  assert.match(groceries, /Weekly Market<\/span><span class="bank-edit-meta">2026-06-19/);
  assert.match(groceries, /Weekly Market<\/span><span class="bank-edit-meta">2026-09-18/);
  assert.match(groceries, /Corner Market<\/span><span class="bank-edit-meta">2026-07-16/);
  assert.match(groceries, /Corner Market<\/span><span class="bank-edit-meta">2026-10-05/);
  assert.doesNotMatch(groceries, /No recent/);
  const emptyCat = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Paycheck/Salary/Wages" });
  assert.match(emptyCat, /No items in this category/);
  assert.doesNotMatch(emptyCat, /No recent/);

  const budget = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(budget, /Mortgage<\/span><b>\$40\.00<\/b>/);
  assert.match(budget, /Electric<\/span><b>\$18\.50<\/b>/);
  assert.doesNotMatch(budget, /Electric<\/span><b class="bank-pending"/);
  assert.match(budget, /Car payment<\/span><b class="bank-pending">amount pending/);
  assert.match(budget, /Gas \(Utility\)<\/span><b class="bank-pending">amount pending/);
  const editsBills = ctx.bankPageHtml(fx, { tab: "edits" });
  assert.match(editsBills, /Mortgage<\/span><span class="bank-edit-side">[\s\S]*?<b>\$40\.00<\/b>/);
  assert.match(editsBills, /Electric<\/span><span class="bank-edit-side">[\s\S]*?<b>\$18\.50<\/b>/);
  assert.match(editsBills, /Car payment<\/span><span class="bank-edit-side">[\s\S]*?class="bank-pending">amount pending/);

  assert.equal(ctx.bankTxKey({
    date: "1999-01-01",
    id: "other",
    amount: 1,
    desc: "Ignored",
    tx_key: "2026-05-22|acct-check|12.34|Neighborhood Grocer"
  }), "2026-05-22|acct-check|12.34|Neighborhood Grocer");
  assert.equal(ctx.bankTxKey({ date: "2026-10-02", id: "acct-share", amount: null, desc: "Main Street Cafe", tx_key: "   " }),
    "2026-10-02|acct-share||Main Street Cafe");

  const long = JSON.parse(JSON.stringify(fx));
  delete long.current.edits_tx;
  long.current.recent_tx = [];
  for (let i = 0; i < 45; i++) {
    const day = String((i % 27) + 1).padStart(2, "0");
    const month = String((i % 6) + 5).padStart(2, "0");
    long.current.recent_tx.push({
      date: "2026-" + month + "-" + day,
      id: "acct-check",
      desc: "Sample " + i,
      amount: 12.34,
      flow: "outflow",
      category: "Groceries"
    });
  }
  assert.equal(ctx.bankRecent(long).length, 40);
  assert.equal(ctx.bankEditRows(long).length, 45);
  const longEdits = ctx.bankPageHtml(long, { tab: "edits", editCat: "Groceries" });
  assert.equal((longEdits.match(/data-bank-tx=/g) || []).length, 45);
  const longCurrent = ctx.bankPageHtml(long, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  const tape = longCurrent.match(/<table class="bank-tape">[\s\S]*?<\/table>/);
  assert.ok(tape);
  assert.equal((tape[0].match(/<tr>/g) || []).length, 40);

  const fallback = JSON.parse(JSON.stringify(fx));
  fallback.current.edits_tx = [];
  fallback.current.recent_tx = [];
  fallback.history.months[0].transactions = [{
    date: "2026-08-02",
    id: "acct-check",
    desc: "August Market",
    amount: 12.34,
    flow: "outflow",
    category: "Groceries"
  }];
  const histEdits = ctx.bankPageHtml(fallback, { tab: "edits", editCat: "Groceries" });
  assert.match(histEdits, /August Market<\/span><span class="bank-edit-meta">2026-08-02/);

  const dupe = JSON.parse(JSON.stringify(fx));
  delete dupe.current.edits_tx;
  const row = {
    date: "2026-08-02",
    id: "acct-check",
    desc: "August Market",
    amount: 12.34,
    flow: "outflow",
    category: "Groceries"
  };
  dupe.current.recent_tx = [row];
  dupe.history.months[0].transactions = [Object.assign({}, row)];
  assert.equal(ctx.bankEditRows(dupe).filter(function (r) { return r.desc === "August Market"; }).length, 1);

  const prefer = JSON.parse(JSON.stringify(fx));
  prefer.current.recent_tx = [{
    date: "2026-10-05", id: "acct-check", desc: "Tape Only", amount: 12.34, flow: "outflow", category: "Groceries"
  }];
  prefer.current.edits_tx = [{
    date: "2026-05-22", id: "acct-check", desc: "Edit Only", amount: 12.34, flow: "outflow", category: "Groceries", tx_key: "kept-key"
  }];
  const prefRows = ctx.bankEditRows(prefer);
  assert.equal(prefRows.length, 1);
  assert.equal(prefRows[0].desc, "Edit Only");
  assert.equal(prefRows[0].key, "kept-key");
  const prefCurrent = ctx.bankPageHtml(prefer, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(prefCurrent, /Tape Only/);
  assert.doesNotMatch(prefCurrent, /Edit Only/);

  const blank = JSON.parse(JSON.stringify(fx));
  blank.current.edits_tx = [];
  blank.current.recent_tx = [];
  const blankHtml = ctx.bankPageHtml(blank, { tab: "edits" });
  assert.match(blankHtml, /No transactions in this print/);
  assert.doesNotMatch(blankHtml, /No recent/);

  const shown = ctx.bankNormalizeBills({
    bills: [
      { name: "Mortgage", amount: 12.34, typical_amount: 40 },
      { name: "Electric", amount: null, typical_amount: 18.5 },
      { name: "Car payment", amount: null, typical_amount: null },
      { name: "Zero bill", amount: 12.34, typical_amount: 0 }
    ],
    bills_monthly: [{ label: "Mortgage", amount: 99, typical_amount: 70 }]
  });
  assert.equal(shown[0].amount, 12.34);
  assert.equal(shown[0].typical_amount, 40);
  assert.equal(ctx.bankBillShownAmount(shown[0]), 40);
  assert.equal(ctx.bankBillShownAmount(shown[1]), 18.5);
  assert.equal(ctx.bankBillShownAmount(shown[2]), null);
  assert.equal(ctx.bankBillShownAmount(shown[3]), 0);
  assert.equal(ctx.bankBillAmount(ctx.bankBillShownAmount(shown[2])), "amount pending");
  const filled = ctx.bankNormalizeBills({
    bills: [{ name: "Phone", amount: 12.34 }],
    bills_monthly: [{ label: "Phone", amount: 99, typical_amount: 15 }]
  });
  assert.equal(filled[0].amount, 12.34);
  assert.equal(filled[0].typical_amount, 15);
  assert.equal(ctx.bankBillShownAmount(filled[0]), 15);
});

test("known categories include custom labels and keep Other last", function () {
  const ctx = boot();
  const fx = loadFixture();
  const known = ctx.bankKnownCategories(fx);
  assert.ok(known.indexOf("Household") >= 0);
  assert.ok(known.indexOf("Gifts") >= 0);
  assert.equal(known.indexOf("Household"), known.lastIndexOf("Household"));
  assert.equal(known.indexOf("Gifts"), known.lastIndexOf("Gifts"));
  assert.equal(known[known.length - 1], "Other");
  const messy = ctx.bankKnownCategories({
    custom_categories: ["  Household  ", "", "Household", "   ", null, "Gifts", "A".repeat(80), { name: "Nope" }]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(messy)), ["Household", "Gifts", "A".repeat(64), "Other"]);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.bankKnownCategories({ custom_categories: ["Other", "Pets"] }))), ["Pets", "Other"]);
  const edits = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Groceries" });
  assert.match(edits, /data-bank-new-cat/);
  assert.match(edits, /data-bank-add-cat/);
  assert.match(edits, />Add</);
  assert.match(edits, /Categories sync across your seats/);
  const pick = edits.match(/<select data-bank-cat[\s\S]*?<\/select>/);
  assert.ok(pick);
  assert.match(pick[0], /value="Household"/);
  assert.match(pick[0], /value="Gifts"/);
  const row = edits.match(/data-bank-tx="2026-10-05\|acct-check\|12\.34\|Corner Market"[\s\S]*?<\/select>/);
  assert.ok(row);
  assert.match(row[0], /value="Household"/);
  assert.match(row[0], /value="Gifts"/);
  assert.ok(row[0].lastIndexOf('value="Other"') > row[0].lastIndexOf('value="Gifts"'));
  ["current", "historical", "budget"].forEach(function (tab) {
    const page = ctx.bankPageHtml(fx, { tab: tab, now: "2026-10-05T18:00:00-04:00" });
    assert.doesNotMatch(page, /data-bank-add-cat/);
    assert.doesNotMatch(page, /data-bank-new-cat/);
    assert.doesNotMatch(page, /data-bank-row-cat/);
    assert.doesNotMatch(page, /Add category/);
    assert.doesNotMatch(page, /Categories sync across your seats/);
  });
});

function bankOptionValues(html) {
  const values = [];
  const re = /<option value="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    values.push(m[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'"));
  }
  return values;
}

function bankAssignOptionValues(html, addValue) {
  const vals = bankOptionValues(html);
  assert.equal(vals[vals.length - 1], addValue);
  assert.match(html, /Add category\u2026<\/option><\/select>/);
  return vals.slice(0, -1);
}

test("edits category picker and merchant assigns share one option list", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.current.edits_tx = fx.current.edits_tx.concat([{
    date: "2026-04-02",
    id: "acct-check",
    desc: "Old Stand",
    amount: 12.34,
    flow: "outflow",
    category: "Archive",
    tx_key: "2026-04-02|acct-check|12.34|Old Stand"
  }]);
  const known = ctx.bankKnownCategories(fx);
  assert.ok(known.indexOf("Utilities/Bills") >= 0);
  assert.ok(known.indexOf("Paycheck/Salary/Wages") >= 0);
  assert.ok(known.indexOf("Household") >= 0);
  assert.ok(known.indexOf("Gifts") >= 0);
  assert.ok(known.indexOf("Archive") >= 0);
  assert.equal(known.indexOf("Archive"), known.lastIndexOf("Archive"));
  assert.equal(known[known.length - 1], "Other");
  assert.ok(known.indexOf("Utilities/Bills") < known.indexOf("Household"));
  assert.ok(known.indexOf("Household") < known.indexOf("Other"));

  const edits = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Groceries" });
  const pick = edits.match(/<select data-bank-cat[\s\S]*?<\/select>/);
  assert.ok(pick);
  const pickVals = bankOptionValues(pick[0]);
  assert.deepEqual(pickVals, JSON.parse(JSON.stringify(known)));
  const rows = edits.match(/<select class="bank-chip" data-bank-tx="[\s\S]*?<\/select>/g);
  assert.ok(rows && rows.length > 1);
  rows.forEach(function (row) {
    assert.deepEqual(bankAssignOptionValues(row, ctx.BANK_ROW_ADD), pickVals);
  });
  assert.doesNotMatch(pick[0], /Add category\u2026/);
  assert.match(edits, /Corner Market/);
  assert.doesNotMatch(edits, /Old Stand/);
  assert.doesNotMatch(edits, /City Fuel/);

  const archive = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Archive" });
  assert.match(archive, /Old Stand<\/span><span class="bank-edit-meta">2026-04-02/);
  assert.doesNotMatch(archive, /Corner Market/);
  const archivePick = archive.match(/<select data-bank-cat[\s\S]*?<\/select>/);
  const archiveRows = archive.match(/<select class="bank-chip" data-bank-tx="[\s\S]*?<\/select>/g);
  assert.ok(archivePick && archiveRows && archiveRows.length === 1);
  assert.deepEqual(bankOptionValues(archivePick[0]), pickVals);
  assert.deepEqual(bankAssignOptionValues(archiveRows[0], ctx.BANK_ROW_ADD), pickVals);
  assert.match(archiveRows[0], /value="Archive" selected/);

  const empty = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Utilities/Bills" });
  assert.match(empty, /No items in this category/);
  const emptyPick = empty.match(/<select data-bank-cat[\s\S]*?<\/select>/);
  assert.ok(emptyPick);
  assert.deepEqual(bankOptionValues(emptyPick[0]), pickVals);
  assert.doesNotMatch(empty, /data-bank-tx/);

  ["current", "historical", "budget"].forEach(function (tab) {
    const page = ctx.bankPageHtml(fx, { tab: tab, now: "2026-10-05T18:00:00-04:00" });
    assert.doesNotMatch(page, /data-bank-tx/);
    assert.doesNotMatch(page, /data-bank-cat/);
    assert.doesNotMatch(page, /data-bank-add-cat/);
    assert.doesNotMatch(page, /data-bank-row-cat/);
    assert.doesNotMatch(page, /Add category/);
    assert.doesNotMatch(page, /Old Stand/);
  });
});

function addCategoryClick(value) {
  return {
    input: {
      target: {
        value: value,
        hasAttribute: function (name) { return name === "data-bank-new-cat"; }
      }
    },
    click: {
      target: {
        closest: function (sel) { return sel === "[data-bank-add-cat]" ? this : null; }
      }
    }
  };
}

test("edits can add a custom category and assign a merchant to it", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const writes = [];
  ctx.localStorage.setItem = function (k, v) { writes.push(k + "=" + v); };
  const calls = [];
  ctx.fetch = function (url, init) {
    calls.push({ url: String(url), init: init });
    const body = JSON.parse(init.body);
    if (String(url) === "/data/banking/categories.json") {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () {
          return Promise.resolve({
            schema: "banking-custom-categories/v1",
            categories: [" Household ", "", "Household", "Gifts", body.category]
          });
        }
      });
    }
    const overrides = Object.assign({}, fx.category_overrides || {});
    overrides[body.key] = body.category;
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () {
        return Promise.resolve({
          schema: "banking-category-overrides/v1",
          overrides: overrides
        });
      }
    });
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", editCat: "Groceries" });
  const blank = addCategoryClick("   ");
  el.listeners.input(blank.input);
  await el.listeners.click(blank.click);
  assert.equal(calls.length, 0);
  const typed = addCategoryClick("Pets");
  el.listeners.input(typed.input);
  assert.equal(el._bank.newCatDraft, "Pets");
  await el.listeners.click(typed.click);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/data/banking/categories.json");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.credentials, "include");
  assert.equal(calls[0].init.headers.Accept, "application/json");
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  assert.equal(calls[0].init.redirect, "manual");
  assert.deepEqual(JSON.parse(calls[0].init.body), { category: "Pets" });
  assert.deepEqual(JSON.parse(JSON.stringify(el._bank.data.custom_categories)), ["Household", "Gifts", "Pets"]);
  assert.equal(el._bank.editCat, "Pets");
  const pick = el.innerHTML.match(/<select data-bank-cat[\s\S]*?<\/select>/);
  assert.ok(pick);
  assert.match(pick[0], /value="Pets" selected/);
  assert.match(el.innerHTML, /No items in this category/);
  assert.match(el.innerHTML, /Categories sync across your seats/);
  assert.equal(writes.length, 0);
  await el.listeners.change({
    target: {
      value: "Groceries",
      getAttribute: function () { return null; },
      hasAttribute: function (name) { return name === "data-bank-cat"; }
    }
  });
  assert.equal(calls.length, 1);
  const key = "2026-10-05|acct-check|12.34|Corner Market";
  const chipAt = el.innerHTML.indexOf('data-bank-tx="' + key + '"');
  assert.ok(chipAt >= 0);
  const chip = el.innerHTML.slice(chipAt, el.innerHTML.indexOf("</select>", chipAt));
  assert.match(chip, /value="Pets"/);
  await el.listeners.change({
    target: {
      value: "Pets",
      getAttribute: function (name) { return name === "data-bank-tx" ? key : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, "/data/banking/overrides.json");
  assert.equal(calls[1].init.method, "POST");
  assert.equal(calls[1].init.headers.Accept, "application/json");
  assert.equal(calls[1].init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[1].init.body), { key: key, category: "Pets" });
  await el.listeners.change({
    target: {
      value: "Pets",
      getAttribute: function () { return null; },
      hasAttribute: function (name) { return name === "data-bank-cat"; }
    }
  });
  const moved = el.innerHTML.match(new RegExp('data-bank-tx="' + key.replace(/[|]/g, "\\|") + '"[\\s\\S]*?<\\/select>'));
  assert.ok(moved);
  assert.match(moved[0], /value="Pets" selected/);
  assert.match(el.innerHTML, /class="bank-merchant">Corner Market<\/span><span class="bank-edit-meta">2026-10-05<\/span>/);
  await el.listeners.keydown({
    key: "Enter",
    preventDefault: function () {},
    target: {
      value: "  " + "B".repeat(70) + "  ",
      hasAttribute: function (name) { return name === "data-bank-new-cat"; }
    }
  });
  assert.equal(calls.length, 3);
  assert.equal(calls[2].url, "/data/banking/categories.json");
  assert.equal(JSON.parse(calls[2].init.body).category, "B".repeat(64));
});

test("a failed category add leaves the list unchanged", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const writes = [];
  ctx.localStorage.setItem = function (k, v) { writes.push(k + "=" + v); };
  for (const status of [401, 404, 405]) {
    ctx.fetch = function () {
      return Promise.resolve({ ok: false, status: status, type: "basic" });
    };
    const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", editCat: "Groceries" });
    const typed = addCategoryClick("Pets");
    el.listeners.input(typed.input);
    await el.listeners.click(typed.click);
    assert.match(el.innerHTML, /value="Groceries" selected/);
    assert.doesNotMatch(el.innerHTML, /value="Pets"/);
    assert.match(el.innerHTML, /value="Household"/);
    if (status === 401) assert.match(el.innerHTML, /Sign in again to add a category/);
    else {
      assert.match(el.innerHTML, /not on the feed yet/);
      assert.match(el.innerHTML, /Nothing was saved/);
    }
    assert.deepEqual(JSON.parse(JSON.stringify(el._bank.data.custom_categories)), ["Household", "Gifts"]);
  }
  ctx.fetch = function () { return Promise.reject(new Error("offline")); };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", editCat: "Groceries" });
  const typed = addCategoryClick("Pets");
  el.listeners.input(typed.input);
  await el.listeners.click(typed.click);
  assert.match(el.innerHTML, /Category did not save/);
  assert.match(el.innerHTML, /Nothing was changed/);
  assert.doesNotMatch(el.innerHTML, /value="Pets"/);
  assert.equal(writes.length, 0);
});

function categoryWrites(fx, calls) {
  return function (url, init) {
    calls.push({ url: String(url), init: init });
    const body = JSON.parse(init.body);
    if (String(url) === "/data/banking/categories.json") {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () {
          return Promise.resolve({
            schema: "banking-custom-categories/v1",
            categories: [" Household ", "", "Household", "Gifts", "Pets", body.category]
          });
        }
      });
    }
    const overrides = Object.assign({}, (fx && fx.category_overrides) || {});
    overrides[body.key] = body.category;
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () {
        return Promise.resolve({
          schema: "banking-category-overrides/v1",
          overrides: overrides
        });
      }
    });
  };
}

function chooseRowAdd(ctx, key) {
  return {
    target: {
      value: ctx.BANK_ROW_ADD,
      getAttribute: function (name) { return name === "data-bank-tx" ? key : null; },
      hasAttribute: function () { return false; }
    }
  };
}

function rowDraftInput(value) {
  return {
    target: {
      value: value,
      hasAttribute: function (name) { return name === "data-bank-row-cat"; }
    }
  };
}

function rowButtonClick(kind) {
  const sel = kind === "cancel" ? "[data-bank-row-cancel]" : "[data-bank-row-ok]";
  return {
    preventDefault: function () {},
    target: {
      closest: function (name) { return name === sel ? this : null; }
    }
  };
}

function rowSelectHtml(html, key) {
  const at = html.indexOf('data-bank-tx="' + key + '"');
  assert.ok(at >= 0);
  const end = html.indexOf("</select>", at);
  assert.ok(end >= 0);
  return html.slice(at, end + "</select>".length);
}

test("choosing Add category on a merchant row posts the category then assigns it", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const calls = [];
  const writes = [];
  ctx.localStorage.setItem = function (k, v) { writes.push(k + "=" + v); };
  ctx.fetch = categoryWrites(fx, calls);
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", editCat: "Groceries" });
  const key = "2026-10-05|acct-check|12.34|Corner Market";
  const before = rowSelectHtml(el.innerHTML, key);
  assert.match(before, /value="Groceries" selected/);
  assert.match(before, /Add category\u2026<\/option><\/select>/);
  assert.match(el.innerHTML, /data-bank-add-cat/);
  assert.doesNotMatch(el.innerHTML, /data-bank-row-cat/);

  await el.listeners.change(chooseRowAdd(ctx, key));
  assert.equal(calls.length, 0);
  assert.equal(el.innerHTML.indexOf('data-bank-tx="' + key + '"'), -1);
  assert.match(el.innerHTML, new RegExp('data-bank-row-cat="' + key.replace(/[|]/g, "\\|") + '"'));
  assert.match(el.innerHTML, /maxlength="64"/);
  assert.match(el.innerHTML, /aria-label="New category for Corner Market"/);
  assert.match(el.innerHTML, /data-bank-row-ok=/);
  assert.match(el.innerHTML, /data-bank-row-cancel=/);
  assert.match(el.innerHTML, /data-bank-add-cat/);
  assert.match(el.innerHTML, /data-bank-tx="2026-09-18\|acct-check\|12\.34\|Weekly Market"/);

  el.listeners.input(rowDraftInput("  Pets  "));
  assert.equal(el._bank.rowAdd.draft, "  Pets  ");
  await el.listeners.click(rowButtonClick("ok"));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "/data/banking/categories.json");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.credentials, "include");
  assert.equal(calls[0].init.headers.Accept, "application/json");
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  assert.equal(calls[0].init.redirect, "manual");
  assert.deepEqual(JSON.parse(calls[0].init.body), { category: "Pets" });
  assert.equal(calls[1].url, "/data/banking/overrides.json");
  assert.equal(calls[1].init.method, "POST");
  assert.equal(calls[1].init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[1].init.body), { key: key, category: "Pets" });
  assert.deepEqual(JSON.parse(JSON.stringify(el._bank.data.custom_categories)), ["Household", "Gifts", "Pets"]);
  assert.equal(el._bank.editCat, "Pets");
  assert.equal(el._bank.rowAdd, null);
  assert.equal(writes.length, 0);
  assert.match(el.innerHTML, /data-bank-add-cat/);
  assert.match(el.innerHTML, /data-bank-new-cat/);
  assert.doesNotMatch(el.innerHTML, /Weekly Market/);

  const pick = el.innerHTML.match(/<select data-bank-cat[\s\S]*?<\/select>/);
  const moved = el.innerHTML.match(new RegExp('data-bank-tx="' + key.replace(/[|]/g, "\\|") + '"[\\s\\S]*?<\\/select>'));
  assert.ok(pick && moved);
  assert.match(pick[0], /value="Pets" selected/);
  assert.match(moved[0], /value="Pets" selected/);
  assert.match(el.innerHTML, /class="bank-merchant">Corner Market<\/span><span class="bank-edit-meta">2026-10-05<\/span>/);
  const pickVals = bankOptionValues(pick[0]);
  const rowVals = bankAssignOptionValues(moved[0], ctx.BANK_ROW_ADD);
  assert.deepEqual(rowVals, pickVals);
  assert.ok(pickVals.indexOf("Pets") >= 0);
  assert.equal(pickVals.indexOf("Pets"), pickVals.lastIndexOf("Pets"));
  assert.equal(pickVals.indexOf("Household"), pickVals.lastIndexOf("Household"));
  assert.doesNotMatch(pick[0], /Add category\u2026/);

  await el.listeners.change(chooseRowAdd(ctx, key));
  el.listeners.input(rowDraftInput(" Household "));
  await el.listeners.click(rowButtonClick("ok"));
  assert.equal(calls.length, 4);
  assert.deepEqual(JSON.parse(calls[2].init.body), { category: "Household" });
  assert.equal(calls[2].url, "/data/banking/categories.json");
  assert.equal(calls[3].url, "/data/banking/overrides.json");
  assert.deepEqual(JSON.parse(calls[3].init.body), { key: key, category: "Household" });
  assert.deepEqual(JSON.parse(JSON.stringify(el._bank.data.custom_categories)), ["Household", "Gifts", "Pets"]);
  assert.equal(el._bank.editCat, "Household");
  const dupPick = el.innerHTML.match(/<select data-bank-cat[\s\S]*?<\/select>/);
  const dupRow = el.innerHTML.match(new RegExp('data-bank-tx="' + key.replace(/[|]/g, "\\|") + '"[\\s\\S]*?<\\/select>'));
  assert.ok(dupPick && dupRow);
  assert.match(dupPick[0], /value="Household" selected/);
  assert.match(dupRow[0], /value="Household" selected/);
  assert.deepEqual(bankAssignOptionValues(dupRow[0], ctx.BANK_ROW_ADD), bankOptionValues(dupPick[0]));
  assert.equal(bankOptionValues(dupPick[0]).indexOf("Household"), bankOptionValues(dupPick[0]).lastIndexOf("Household"));

  await el.listeners.change(chooseRowAdd(ctx, key));
  await el.listeners.keydown({
    key: "Enter",
    preventDefault: function () {},
    target: {
      value: "  " + "B".repeat(70) + "  ",
      hasAttribute: function (name) { return name === "data-bank-row-cat"; }
    }
  });
  assert.equal(calls.length, 6);
  assert.equal(calls[4].url, "/data/banking/categories.json");
  assert.equal(calls[5].url, "/data/banking/overrides.json");
  assert.equal(JSON.parse(calls[4].init.body).category, "B".repeat(64));
  assert.equal(JSON.parse(calls[5].init.body).category, "B".repeat(64));
  assert.equal(el._bank.editCat, "B".repeat(64));
  const longRow = rowSelectHtml(el.innerHTML, key);
  assert.match(longRow, /value="B{64}" selected/);
  assert.match(el.innerHTML, /data-bank-add-cat/);
});

test("canceling or leaving a row category blank does not post", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const calls = [];
  ctx.fetch = function (url) {
    calls.push(String(url));
    return Promise.reject(new Error("should not post"));
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", editCat: "Groceries" });
  const key = "2026-10-05|acct-check|12.34|Corner Market";

  await el.listeners.change(chooseRowAdd(ctx, key));
  el.listeners.input(rowDraftInput("   "));
  await el.listeners.click(rowButtonClick("ok"));
  assert.equal(calls.length, 0);
  assert.equal(el._bank.rowAdd, null);
  assert.match(rowSelectHtml(el.innerHTML, key), /value="Groceries" selected/);
  assert.doesNotMatch(el.innerHTML, /data-bank-row-cat/);

  await el.listeners.change(chooseRowAdd(ctx, key));
  el.listeners.input(rowDraftInput("Pets"));
  assert.equal(el._bank.rowAdd.draft, "Pets");
  await el.listeners.click(rowButtonClick("cancel"));
  assert.equal(calls.length, 0);
  assert.equal(el._bank.rowAdd, null);
  assert.match(rowSelectHtml(el.innerHTML, key), /value="Groceries" selected/);
  assert.doesNotMatch(el.innerHTML, /value="Pets"/);
  assert.doesNotMatch(el.innerHTML, /data-bank-row-cat/);
  assert.match(el.innerHTML, /data-bank-add-cat/);

  await el.listeners.change(chooseRowAdd(ctx, key));
  await el.listeners.keydown({
    key: "Escape",
    preventDefault: function () {},
    target: {
      value: "Pets",
      hasAttribute: function (name) { return name === "data-bank-row-cat"; }
    }
  });
  assert.equal(calls.length, 0);
  assert.match(rowSelectHtml(el.innerHTML, key), /value="Groceries" selected/);
  assert.doesNotMatch(el.innerHTML, /data-bank-row-cat/);

  ["current", "historical", "budget"].forEach(function (tab) {
    const page = ctx.bankPageHtml(fx, { tab: tab, now: "2026-10-05T18:00:00-04:00" });
    assert.doesNotMatch(page, /data-bank-row-cat/);
    assert.doesNotMatch(page, /data-bank-row-ok/);
    assert.doesNotMatch(page, /Add category/);
  });
});

test("a failed row category add does not assign the merchant", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const calls = [];
  ctx.fetch = function (url) {
    calls.push(String(url));
    return Promise.resolve({ ok: false, status: 404, type: "basic" });
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", editCat: "Groceries" });
  const key = "2026-10-05|acct-check|12.34|Corner Market";
  await el.listeners.change(chooseRowAdd(ctx, key));
  el.listeners.input(rowDraftInput("Pets"));
  await el.listeners.click(rowButtonClick("ok"));
  assert.deepEqual(calls, ["/data/banking/categories.json"]);
  assert.match(el.innerHTML, /not on the feed yet/);
  assert.match(el.innerHTML, /Nothing was saved/);
  assert.match(rowSelectHtml(el.innerHTML, key), /value="Groceries" selected/);
  assert.doesNotMatch(el.innerHTML, /value="Pets"/);
  assert.doesNotMatch(el.innerHTML, /data-bank-row-cat/);
  assert.deepEqual(JSON.parse(JSON.stringify(el._bank.data.custom_categories)), ["Household", "Gifts"]);
});
