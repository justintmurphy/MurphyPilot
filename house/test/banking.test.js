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

function categoryRead(url, init, categories) {
  const method = init && init.method ? String(init.method).toUpperCase() : "GET";
  if (String(url) === "/data/banking/mustpay-overrides.json" && method === "GET") {
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () {
        return Promise.resolve({ schema: "banking-mustpay-overrides/v1", overrides: {} });
      }
    });
  }
  if (String(url) !== "/data/banking/categories.json" || method !== "GET") return null;
  const list = (categories || ["Household", "Gifts"]).slice();
  return Promise.resolve({
    ok: true,
    status: 200,
    type: "basic",
    json: function () {
      return Promise.resolve({ schema: "banking-custom-categories/v1", categories: list });
    }
  });
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

function mainTablist(html) {
  const start = html.indexOf('<div class="bank-tabs"');
  const end = html.indexOf("</div>", start);
  return html.slice(start, end);
}

test("edits opens from the gear menu and stays off the main tablist", function () {
  const ctx = boot();
  const fx = loadFixture();
  const current = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  const tabs = mainTablist(current);
  assert.match(tabs, /Historical/);
  assert.match(tabs, /Current/);
  assert.match(tabs, /Budget/);
  assert.doesNotMatch(tabs, /Edits/);
  assert.doesNotMatch(tabs, /data-bank-tab="edits"/);
  assert.equal((tabs.match(/role="tab"/g) || []).length, 3);
  assert.match(current, /data-bank-overflow="1"/);
  assert.match(current, /aria-haspopup="menu"/);
  assert.match(current, /aria-expanded="false"/);
  assert.match(current, /id="bankOverflowMenu"[^>]*hidden/);
  assert.match(current, /role="menuitem"[^>]*>Edits</);
  assert.ok(current.indexOf('class="bank-tabs"') < current.indexOf('class="bank-overflow"'));

  const el = mount(ctx, fx, { now: "2026-10-05T18:00:00-04:00" });
  assert.match(el.innerHTML, /data-panel="current"/);
  assert.doesNotMatch(mainTablist(el.innerHTML), /Edits/);
  const gear = {
    closest: function (sel) {
      if (sel === "[data-bank-tab]") return null;
      if (sel === "[data-bank-overflow]" || sel === ".bank-overflow") return gear;
      return null;
    }
  };
  el.listeners.click({ target: gear, preventDefault: function () {} });
  assert.match(el.innerHTML, /data-panel="current"/);
  assert.match(el.innerHTML, /aria-expanded="true"/);
  assert.doesNotMatch(el.innerHTML, /id="bankOverflowMenu"[^>]*hidden/);
  const editsBtn = {
    getAttribute: function (name) { return name === "data-bank-tab" ? "edits" : null; },
    closest: function (sel) {
      if (sel === "[data-bank-tab]") return editsBtn;
      if (sel === "[data-bank-overflow]") return null;
      if (sel === ".bank-overflow") return editsBtn;
      return null;
    }
  };
  el.listeners.click({ target: editsBtn, preventDefault: function () {} });
  assert.match(el.innerHTML, /data-panel="edits"/);
  assert.doesNotMatch(mainTablist(el.innerHTML), /aria-selected="true"/);
  assert.doesNotMatch(mainTablist(el.innerHTML), /Edits/);
  assert.match(el.innerHTML, /class="bank-gear on"/);
  assert.match(el.innerHTML, /aria-current="true"/);
  assert.match(el.innerHTML, /class="bank-gear-mark"/);
  assert.equal(ctx.bankResolveTab("#edits"), "edits");

  const currentBtn = {
    getAttribute: function () { return "current"; },
    closest: function (sel) { return sel === "[data-bank-tab]" ? currentBtn : null; }
  };
  el.listeners.click({ target: currentBtn });
  assert.match(el.innerHTML, /data-panel="current"/);
  assert.match(el.innerHTML, /data-bank-tab="current"[^>]*aria-selected="true"/);
  assert.doesNotMatch(el.innerHTML, /class="bank-gear on"/);

  ["historical", "budget"].forEach(function (tab) {
    const page = ctx.bankPageHtml(fx, { tab: tab, now: "2026-10-05T18:00:00-04:00" });
    assert.match(page, new RegExp('data-bank-tab="' + tab + '"[^>]*aria-selected="true"'));
    assert.match(page, new RegExp('data-panel="' + tab + '"'));
    assert.doesNotMatch(mainTablist(page), /Edits/);
    assert.doesNotMatch(page, /class="bank-gear on"/);
  });

  ctx.location.hash = "#edits";
  const linked = mount(ctx, fx, {});
  assert.match(linked.innerHTML, /data-panel="edits"/);
  assert.match(linked.innerHTML, /class="bank-gear on"/);
  ctx.bankActivate(el, "edits");
  assert.match(el.innerHTML, /data-panel="edits"/);
  assert.doesNotMatch(mainTablist(el.innerHTML), /class="on"/);

  const gearKey = {
    closest: function (sel) { return sel === "[data-bank-overflow]" ? gearKey : null; }
  };
  el.listeners.keydown({ key: "ArrowDown", target: gearKey, preventDefault: function () {} });
  assert.match(el.innerHTML, /aria-expanded="true"/);
  assert.match(el.innerHTML, /data-panel="edits"/);
  el.listeners.keydown({ key: "Escape", target: gearKey, preventDefault: function () {} });
  assert.match(el.innerHTML, /aria-expanded="false"/);
  assert.match(el.innerHTML, /data-panel="edits"/);

  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  assert.match(css, /\.bank-overflow\s*\{[^}]*flex:\s*0 0 auto/);
  assert.match(css, /\.bank-gear\s*\{[^}]*width:\s*36px/);
  assert.match(css, /@media \(max-width: 390px\) \{[\s\S]*\.bank-nav\s*\{[^}]*gap:\s*10px/);
  assert.match(css, /@media \(max-width: 390px\) \{[\s\S]*\.bank-gear\s*\{[^}]*width:\s*40px/);
  assert.doesNotMatch(css, /\.bank-tabs button[\s\S]{0,80}flex:\s*1[^}]*\.bank-gear/);
});

test("empty calendar shows the due-day empty state and insights keep severity", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.budget.bills = [{ name: "Phone", amount: 12.34, typical_day: null, cadence: "monthly", category: "Utilities/Bills" }];
  fx.budget.bills_monthly = [];
  const html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /Due days need more history/);
  assert.doesNotMatch(html, /class="bank-days"/);
  assert.doesNotMatch(html, /class="bank-cal-grid"/);
  assert.match(html, /Income for this month is not in the print/);
  assert.doesNotMatch(mtdBlock(html), /class="bank-pie"/);
  assert.match(html, /data-bank-pie="bills"/);
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
  assert.match(html, /class="bank-cal-grid"/);
  assert.match(html, /class="bank-cal-week"/);
  assert.match(html, /role="columnheader">Sun</);
  assert.doesNotMatch(html, /class="bank-days"/);
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
  assert.match(html, /<div class="bank-day has"><b>28<\/b><span>Phone<\/span>/);
  assert.match(html, /<b>15<\/b><span>Car payment<\/span><span>Electric<\/span><span>Gas \(Utility\)<\/span>/);
  assert.doesNotMatch(html, /data-bank-due/);
  assert.doesNotMatch(html, /data-bank-cat/);
  assert.doesNotMatch(html, /<select/);
  assert.doesNotMatch(html, /Due days need more history/);
});

test("bill calendar is a month grid and month-to-date shows spent and income with a bar", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.budget.income_monthly[0].typical_day = null;
  fx.budget.bills = [
    { name: "Mortgage", amount: 12.34, typical_day: null, cadence: "monthly" }
  ];
  fx.budget.bills_monthly = [];
  fx.budget.calendar = [{ day: 3, items: ["Sample item"] }];
  let html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /class="bank-cal-grid"/);
  assert.match(html, /aria-label="October 2026"/);
  const calAt = html.indexOf('<section class="bank-cal">');
  const insightAt = html.indexOf('<section class="bank-insight-block">');
  const coversAt = html.indexOf('class="bank-covers"');
  assert.ok(calAt >= 0 && insightAt > calAt);
  assert.match(html.slice(calAt, insightAt), /Bill calendar/);
  assert.doesNotMatch(html.slice(calAt, insightAt), /Insights/);
  if (coversAt >= 0) assert.ok(coversAt > calAt && coversAt < insightAt);
  assert.match(html, /role="columnheader">Sun<\/span>[\s\S]*role="columnheader">Sat<\/span>/);
  assert.equal((html.match(/class="bank-cal-week"/g) || []).length, 5);
  assert.match(html, /<div class="bank-cal-week" role="row"><div class="bank-cal-pad" aria-hidden="true"><\/div><div class="bank-cal-pad" aria-hidden="true"><\/div><div class="bank-cal-pad" aria-hidden="true"><\/div><div class="bank-cal-pad" aria-hidden="true"><\/div><div class="bank-day has"><b>1<\/b><span>Mortgage<\/span>/);
  assert.match(html, /<div class="bank-day"><b>2<\/b><\/div>/);
  assert.match(html, /<div class="bank-day has"><b>3<\/b><span>Sample item<\/span>/);
  assert.doesNotMatch(html, /class="bank-days"/);
  let mtd = mtdBlock(html);
  assert.match(mtd, /Month to date · day 5 of 31/);
  assert.match(mtd, /of income/);
  assert.match(mtd, /Spent so far \$42\.34/);
  assert.match(mtd, /Income for this month is not in the print/);
  assert.doesNotMatch(mtd, /class="bank-pie"/);
  assert.doesNotMatch(mtd, /Elective|Other spending/);

  fx.budget.mtd_actual_by_category = {
    Groceries: 30,
    "Paycheck/Salary/Wages": 500,
    Transfer: 9
  };
  fx.current.edits_tx.push(
    { date: "2026-10-02", id: "acct-check", desc: "Pay", amount: 70, flow: "inflow", category: "Paycheck/Salary/Wages", tx_key: "pay-oct" },
    { date: "2026-09-02", id: "acct-check", desc: "Pay", amount: 400, flow: "inflow", category: "Paycheck/Salary/Wages", tx_key: "pay-sep" },
    { date: "2026-10-08", id: "acct-check", desc: "Shop", amount: 15, flow: "outflow", category: "Groceries", tx_key: "groc-oct" }
  );
  fx.current.recent_tx.push(
    { date: "2026-10-02", id: "acct-check", desc: "Pay", amount: 70, flow: "inflow", category: "Paycheck/Salary/Wages", tx_key: "pay-oct" }
  );
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  let block = mtdBlock(html);
  assert.match(block, /class="bank-mtd-meter"/);
  assert.match(block, /class="bank-mtd-track"/);
  assert.match(block, /style="width:43%"/);
  assert.match(block, /43% of income/);
  assert.doesNotMatch(block, /class="bank-pie"/);
  assert.doesNotMatch(block, /<path /);
  assert.doesNotMatch(block, /<svg /);
  assert.match(block, /Spent so far<\/span><b>\$30\.00<\/b>/);
  assert.match(block, /Income received<\/span><b>\$70\.00<\/b>/);
  assert.doesNotMatch(block, /\$500/);
  assert.doesNotMatch(block, /\$400/);
  assert.doesNotMatch(block, /NaN|Infinity/);

  fx.current.edits_tx = [
    { date: "2026-10-02", id: "acct-check", desc: "Pay", amount: -40, flow: "inflow", category: "Cash Inflows", tx_key: "cash-oct" }
  ];
  fx.current.recent_tx = [
    { date: "2026-10-02", id: "acct-check", desc: "Pay", amount: -40, flow: "inflow", category: "Cash Inflows", tx_key: "cash-oct" }
  ];
  fx.budget.mtd_actual_by_category = { Groceries: 60 };
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  block = mtdBlock(html);
  assert.match(block, /Income received<\/span><b>\$40\.00<\/b>/);
  assert.match(block, /Spent so far<\/span><b>\$60\.00<\/b>/);
  assert.match(block, /150% of income/);
  assert.match(block, /class="bank-mtd-track over"/);
  assert.match(block, /style="width:100%"/);
  assert.doesNotMatch(block, /class="bank-pie"/);

  fx.current.edits_tx = [];
  fx.current.recent_tx = [];
  const oct = fx.history.months.filter(function (m) { return m.month === "2026-10"; })[0];
  const sep = fx.history.months.filter(function (m) { return m.month === "2026-09"; })[0];
  sep.tx = [{ date: "2026-10-04", id: "acct-check", desc: "Old", amount: 80, flow: "inflow", category: "Paycheck/Salary/Wages" }];
  oct.income = { Bonus: 1 };
  oct.income_total = 999;
  oct.tx = [{ date: "2026-10-12", id: "acct-check", desc: "Extra", amount: 15, flow: "inflow", category: "Bonus" }];
  fx.budget.mtd_actual_by_category = { Shopping: 75 };
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  block = mtdBlock(html);
  assert.match(block, /Income received<\/span><b>\$15\.00<\/b>/);
  assert.match(block, /Spent so far<\/span><b>\$75\.00<\/b>/);
  assert.match(block, /500% of income/);
  assert.match(block, /style="width:100%"/);
  assert.doesNotMatch(block, /\$999/);
  assert.doesNotMatch(block, /\$80/);

  oct.income = null;
  oct.tx = [];
  oct.income_total = 50;
  fx.budget.mtd_actual_by_category = { Groceries: 50 };
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  block = mtdBlock(html);
  assert.doesNotMatch(block, /<path /);
  assert.doesNotMatch(block, /class="bank-mtd-track over"/);
  assert.match(block, /Income received<\/span><b>\$50\.00<\/b>/);
  assert.match(block, /100% of income/);
  assert.match(block, /style="width:100%"/);

  oct.closed = true;
  oct.income_total = 80;
  fx.budget.income_monthly[0].amount = 80;
  fx.budget.mtd_actual_by_category = { Groceries: 20 };
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  block = mtdBlock(html);
  assert.doesNotMatch(block, /class="bank-pie"/);
  assert.doesNotMatch(block, /class="bank-mtd-meter"/);
  assert.doesNotMatch(block, /NaN|Infinity/);
  assert.match(block, /Income for this month is not in the print/);
  assert.match(block, /Spent so far \$20\.00/);

  oct.closed = false;
  oct.income_total = 33;
  fx.budget.mtd_actual_by_category = { "Paycheck/Salary/Wages": 10, Transfer: 4 };
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  block = mtdBlock(html);
  assert.doesNotMatch(block, /<path /);
  assert.doesNotMatch(block, /class="bank-mtd-meter"/);
  assert.doesNotMatch(block, /NaN|Infinity/);
  assert.match(block, /Income received \$33\.00/);
  assert.match(block, /No month-to-date spend in this print/);

  oct.income_total = null;
  fx.budget.mtd_actual_by_category = {};
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  block = mtdBlock(html);
  assert.match(block, /No month-to-date spend or income in this print/);
  assert.doesNotMatch(block, /<path /);
  assert.doesNotMatch(block, /class="bank-mtd-meter"/);
  assert.doesNotMatch(block, /NaN|Infinity/);
  assert.doesNotMatch(block, /\$0/);

  oct.income_total = 0;
  fx.budget.mtd_actual_by_category = { Groceries: 10 };
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  block = mtdBlock(html);
  assert.doesNotMatch(block, /<path /);
  assert.doesNotMatch(block, /class="bank-mtd-meter"/);
  assert.doesNotMatch(block, /NaN|Infinity/);
  assert.match(block, /Income received this month is zero/);
  assert.match(block, /Spent so far \$10\.00/);

  fx.asof = "2026-10-01T03:30:00Z";
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /aria-label="September 2026"/);
  assert.match(html, /<div class="bank-cal-week" role="row"><div class="bank-cal-pad" aria-hidden="true"><\/div><div class="bank-cal-pad" aria-hidden="true"><\/div><div class="bank-day has"><b>1<\/b><span>Mortgage<\/span>/);

  fx.asof = "2026-02-10T12:00:00-05:00";
  fx.budget.bills = [
    { name: "Mortgage", amount: 12.34, typical_day: null, cadence: "monthly" },
    { name: "Mobile plan", amount: 12.34, typical_day: null, cadence: "monthly" }
  ];
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /aria-label="February 2026"/);
  assert.match(html, /<div class="bank-cal-week" role="row"><div class="bank-day has"><b>1<\/b><span>Mortgage<\/span>/);
  assert.match(html, /<b>28<\/b><span>Phone<\/span>/);
  assert.doesNotMatch(html, /<b>29<\/b>/);
  assert.doesNotMatch(html, /<b>31<\/b>/);
  assert.equal((html.match(/class="bank-cal-week"/g) || []).length, 4);

  fx.asof = "";
  fx.budget.bills = [{ name: "Mortgage", amount: 12.34, typical_day: 1, cadence: "monthly" }];
  fx.history.months.forEach(function (m) { m.closed = true; });
  oct.closed = false;
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /aria-label="October 2026"/);
  oct.closed = true;
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /aria-label="October 2026"/);
  fx.history.months = fx.history.months.filter(function (m) { return m.month !== "2026-10"; });
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /aria-label="September 2026"/);
  fx.history = { months: [] };
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  const today = new Date();
  const title = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(today.getFullYear(), today.getMonth(), 1));
  assert.match(html, new RegExp('aria-label="' + title + '"'));

  const fresh = loadFixture();
  const edits = ctx.bankPageHtml(fresh, { tab: "edits" });
  assert.doesNotMatch(edits, /This month/);
  assert.doesNotMatch(edits, /Spent vs income/);
  assert.doesNotMatch(edits, /of income/);
  const current = ctx.bankPageHtml(fresh, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.doesNotMatch(current, /Spent vs income/);
  assert.doesNotMatch(current, /This month/);
  assert.doesNotMatch(current, /of income/);
});

function mtdBlock(html) {
  const start = html.indexOf('class="bank-pie-block bank-mtd"');
  const end = html.indexOf('data-bank-pie="bills"');
  assert.ok(start >= 0, "mtd block");
  return html.slice(start, end === -1 ? html.length : end);
}

test("month-to-date caption uses the Eastern calendar day of asof", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.asof = "2026-11-01T00:30:00Z";
  const html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /aria-label="October 2026"/);
  assert.equal(ctx.bankMtdCaption(fx.asof), "Month to date · day 31 of 31");
  assert.match(mtdBlock(html), /<h3>Month to date · day 31 of 31<\/h3>/);
  const barsAt = html.indexOf('class="bank-bars"');
  assert.ok(barsAt >= 0);
  assert.match(html.slice(barsAt, barsAt + 80), /<h3>Month to date · day 31 of 31<\/h3>/);
  assert.doesNotMatch(html, /day 1 of 30/);

  fx.asof = "2026-10-05T12:00:00-04:00";
  assert.equal(ctx.bankMtdCaption(fx.asof), "Month to date · day 5 of 31");
  assert.equal(ctx.bankMtdCaption(""), "Month to date");
  assert.equal(ctx.bankMtdCaption("not-a-date"), "Month to date");
});

test("short-month due days clamp onto the last day of that month", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.budget.bills = [
    { name: "Rent", amount: 12.34, typical_day: 31, cadence: "monthly" },
    { name: "Water", amount: 12.34, typical_day: 15, cadence: "monthly" },
    { name: "Internet", amount: 12.34, typical_day: 30, cadence: "monthly" }
  ];
  fx.budget.bills_monthly = [];
  fx.budget.income_monthly = [{ label: "Paycheck", amount: 12.34, typical_day: 31 }];
  fx.budget.calendar = [{ day: 29, items: ["Sample item"] }];

  function budget(asof) {
    fx.asof = asof;
    return ctx.bankPageHtml(fx, { tab: "budget" });
  }

  const feb = budget("2026-02-10T12:00:00-05:00");
  assert.match(feb, /aria-label="February 2026"/);
  assert.match(feb, /<b>28<\/b><em class="pay">Paycheck \(31st\)<\/em><span>Internet \(30th\)<\/span><span>Rent \(31st\)<\/span><span>Sample item \(29th\)<\/span>/);
  assert.match(feb, /<b>15<\/b><span>Water<\/span>/);
  assert.doesNotMatch(feb, /Water \(/);
  assert.doesNotMatch(feb, /<b>29<\/b>/);
  assert.doesNotMatch(feb, /<b>30<\/b>/);
  assert.doesNotMatch(feb, /<b>31<\/b>/);
  assert.match(feb, /<span>Rent<\/span><b[^>]*>[^<]*<\/b><i>day 31<\/i>/);
  assert.match(feb, /This check \(Paycheck, day 31\)/);

  const apr = budget("2026-04-10T12:00:00-04:00");
  assert.match(apr, /aria-label="April 2026"/);
  assert.match(apr, /<b>30<\/b><em class="pay">Paycheck \(31st\)<\/em><span>Internet<\/span><span>Rent \(31st\)<\/span>/);
  assert.match(apr, /<b>29<\/b><span>Sample item<\/span>/);
  assert.doesNotMatch(apr, /Internet \(/);
  assert.doesNotMatch(apr, /Sample item \(/);
  assert.doesNotMatch(apr, /<b>31<\/b>/);
  assert.match(apr, /<span>Rent<\/span><b[^>]*>[^<]*<\/b><i>day 31<\/i>/);

  const oct = budget("2026-10-05T12:00:00-04:00");
  assert.match(oct, /aria-label="October 2026"/);
  assert.match(oct, /<b>31<\/b><em class="pay">Paycheck<\/em><span>Rent<\/span>/);
  assert.match(oct, /<b>30<\/b><span>Internet<\/span>/);
  assert.match(oct, /<b>29<\/b><span>Sample item<\/span>/);
  assert.match(oct, /<b>15<\/b><span>Water<\/span>/);
  assert.doesNotMatch(oct, /\(31st\)|\(30th\)|\(29th\)/);

  const leap = budget("2028-02-10T12:00:00-05:00");
  assert.match(leap, /aria-label="February 2028"/);
  assert.match(leap, /<b>29<\/b><em class="pay">Paycheck \(31st\)<\/em><span>Internet \(30th\)<\/span><span>Rent \(31st\)<\/span><span>Sample item<\/span>/);
  assert.doesNotMatch(leap, /Sample item \(/);
  assert.doesNotMatch(leap, /<b>28<\/b><em class="pay">/);
  assert.doesNotMatch(leap, /<b>30<\/b>/);
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
  const edits = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Transfer", now: "2026-10-05T18:00:00-04:00" });
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

test("desk links Banking and banking assets are cache-busted at tip do", function () {
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const page = fs.readFileSync(path.join(root, "house/banking/index.html"), "utf8");
  const nav = fs.readFileSync(path.join(root, "house/js/board-b.js"), "utf8");
  const houseCss = fs.readFileSync(path.join(root, "house/house.css"), "utf8");
  const bankCss = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  assert.match(index, /href="\/house\/banking\/"/);
  assert.doesNotMatch(index, /href="\/house\/banking"/);
  assert.match(index, /house\.css\?v=20260904cn/);
  assert.match(nav, /href="\/house\/banking\/">Banking</);
  assert.match(page, /\/house\/js\/banking\.js\?v=20260904do/);
  assert.match(page, /\/house\/banking\.css\?v=20260904do/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dj/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dj/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dn/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dn/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dm/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dm/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dl/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dl/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dk/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dk/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904di/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904di/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dh/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dh/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dg/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dg/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904df/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904df/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904de/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904de/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dd/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dd/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dc/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dc/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904db/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904db/);
  assert.match(page, /\/house\/house\.css\?v=20260904cn/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cn/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cp/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904cp/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cq/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904cq/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cr/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904cr/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cs/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904ct/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904ct/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cu/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904cu/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cv/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cw/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cx/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904cx/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cy/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904cy/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904cz/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904cz/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904da/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904da/);
  assert.doesNotMatch(page, /href="\.\.\//);
  assert.doesNotMatch(page, /src="\.\.\//);
  assert.match(page, /id="bankDesk"/);
  assert.match(page, /href="\/house\/banking\/"/);
  assert.match(houseCss, /@media \(max-width: 720px\) \{\s*header \.section-nav \{ display: none; \}/);
  assert.match(bankCss, /\.bank-mtd-fig b\s*\{[^}]*font-size:\s*28px/);
  assert.match(bankCss, /\.bank-mtd-track\s*\{/);
  assert.match(bankCss, /\.bank-cal \{\s*min-width: 0;\s*\}/);
  assert.match(bankCss, /\.bank-cal-week \{[^}]*repeat\(7, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(bankCss, /\.bank-days/);
  assert.doesNotMatch(bankCss, /flex:\s*0 0 44px/);
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
  assert.match(edits, /class="bank-gear on"/);
  assert.match(edits, /data-bank-overflow="1"[^>]*aria-current="true"/);
  assert.match(edits, /data-bank-tab="edits"[^>]*aria-current="true"/);
  assert.doesNotMatch(edits.slice(edits.indexOf('class="bank-tabs"'), edits.indexOf("</div>", edits.indexOf('class="bank-tabs"'))), /edits|Edits/);
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
    assert.doesNotMatch(page, /data-bank-kind/);
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
  assert.doesNotMatch(src, /t-?\s?mobile/i);
  assert.doesNotMatch(fixtureSrc, /Duquesne|Columbia Gas|T-Mobile|M&T|nfcu/i);
  assert.doesNotMatch(fixtureSrc, /t-?\s?mobile/i);
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
    const cached = categoryRead(url, init, fx.custom_categories);
    if (cached) return cached;
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
  ctx.fetch = function (url, init) {
    const cached = categoryRead(url, init, fx.custom_categories);
    if (cached) return cached;
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
    const cached = categoryRead(url, init, fx.custom_categories);
    if (cached) return cached;
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
  assert.equal(ctx.bankEditRows(fx).length, fx.current.edits_tx.length + 1);
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
  assert.equal(ctx.bankEditRows(long).length, 46);
  assert.equal(ctx.bankEditRows(long).filter(function (r) { return r.desc === "Day Program"; }).length, 1);
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
  assert.equal(prefRows.length, 2);
  assert.equal(prefRows.filter(function (r) { return r.desc === "Edit Only"; }).length, 1);
  assert.equal(prefRows.filter(function (r) { return r.desc === "Edit Only"; })[0].key, "kept-key");
  assert.equal(prefRows.filter(function (r) { return r.desc === "Day Program"; }).length, 1);
  assert.equal(prefRows.some(function (r) { return r.desc === "Tape Only"; }), false);
  const prefCurrent = ctx.bankPageHtml(prefer, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(prefCurrent, /Tape Only/);
  assert.doesNotMatch(prefCurrent, /Edit Only/);
  assert.doesNotMatch(prefCurrent, /Day Program/);

  const blank = JSON.parse(JSON.stringify(fx));
  blank.current.edits_tx = [];
  blank.current.recent_tx = [];
  blank.current.history_tx = [];
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

test("edits dig-in lists a history-only merchant in a planned category", function () {
  const ctx = boot();
  const fx = loadFixture();
  const careKey = "2026-03-14|acct-check|12.34|Day Program";
  assert.equal(fx.current.edits_tx.some(function (r) { return r.desc === "Day Program" || r.category === "Childcare"; }), false);
  assert.equal(fx.budget.planned_by_category.Childcare, 12.34);
  assert.equal(fx.budget.planned_by_category.Tuition, 12.34);
  const lists = ctx.bankEditSourceLists(fx);
  assert.equal(lists[0], fx.current.edits_tx);
  assert.ok(lists.indexOf(fx.current.history_tx) >= 0);
  assert.equal(lists.indexOf(fx.current.recent_tx), -1);
  const same = JSON.parse(JSON.stringify(fx));
  same.current.history_tx = same.current.edits_tx;
  const once = ctx.bankEditSourceLists(same);
  assert.equal(once.filter(function (list) { return list === same.current.edits_tx; }).length, 1);
  const missing = JSON.parse(JSON.stringify(fx));
  delete missing.current.edits_tx;
  const fallback = ctx.bankEditSourceLists(missing);
  assert.equal(fallback[0], missing.current.recent_tx);
  assert.ok(fallback.indexOf(missing.current.history_tx) >= 0);

  const care = ctx.bankEditRows(fx).filter(function (r) { return r.desc === "Day Program"; });
  assert.equal(care.length, 1);
  assert.equal(care[0].category, "Childcare");
  assert.equal(care[0].key, careKey);
  const known = ctx.bankKnownCategories(fx);
  assert.ok(known.indexOf("Childcare") >= 0);
  assert.ok(known.indexOf("Tuition") >= 0);
  const dig = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Childcare" });
  assert.match(dig, /Day Program<\/span><span class="bank-edit-meta">2026-03-14/);
  assert.doesNotMatch(dig, /No items in this category/);
  const pick = dig.match(/<select data-bank-cat[\s\S]*?<\/select>/);
  const chip = dig.match(/<select class="bank-chip" data-bank-tx="[\s\S]*?<\/select>/);
  assert.ok(pick && chip);
  assert.match(pick[0], /value="Childcare"/);
  assert.match(pick[0], /value="Tuition"/);
  assert.match(chip[0], /value="Childcare" selected/);
  assert.match(chip[0], /value="Tuition"/);
  assert.deepEqual(bankAssignOptionValues(chip[0], ctx.BANK_ROW_ADD), bankOptionValues(pick[0]));

  const groceries = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Groceries" });
  assert.match(groceries, /Corner Market/);
  assert.doesNotMatch(groceries, /Day Program/);
  const emptyPlanned = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Tuition" });
  assert.match(emptyPlanned, /No items in this category/);
  assert.doesNotMatch(emptyPlanned, /Day Program/);
  assert.doesNotMatch(emptyPlanned, /data-bank-tx/);
  const current = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(current, /Corner Market/);
  assert.doesNotMatch(current, /Day Program/);
  const budget = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.doesNotMatch(budget, /data-bar="Childcare"/);
  assert.doesNotMatch(budget, /data-bar="Tuition"/);
  assert.match(budget, /data-bar="Groceries"/);
  assert.match(budget, /data-bar="Shopping"/);
});

test("budget hides empty categories from pies, ranks, and month-to-date bars", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.budget.planned_by_category = {
    Groceries: 12.34,
    Shopping: 24,
    Childcare: 40,
    Tuition: 50,
    Health: 8,
    Parking: 3
  };
  fx.budget.mtd_actual_by_category = {
    Groceries: 30,
    Shopping: 12.34,
    Health: 0,
    Parking: null,
    Transit: "0.00",
    Refunds: -4,
    Dust: 0.004,
    "Paycheck/Salary/Wages": 10,
    Transfer: 4
  };
  const bars = ctx.bankBudgetBars(fx.budget);
  assert.deepEqual(JSON.parse(JSON.stringify(bars.map(function (r) { return r.name; }))), ["Groceries", "Shopping"]);
  assert.equal(bars[0].actual, 30);
  assert.equal(bars[0].target, 12.34);
  assert.equal(bars[0].over, true);
  assert.equal(bars[1].actual, 12.34);
  assert.equal(bars[1].target, 24);
  assert.equal(bars[1].over, false);
  const pies = ctx.bankKindPies(fx);
  assert.deepEqual(JSON.parse(JSON.stringify(pies.optional.map(function (r) { return r.raw; }))), ["Groceries", "Shopping"]);
  assert.deepEqual(JSON.parse(JSON.stringify(pies.bills.map(function (r) { return r.name; }))), ["Optional"]);

  const budget = ctx.bankPageHtml(fx, { tab: "budget" });
  const bills = pieBlock(budget, "bills");
  const optional = pieBlock(budget, "optional");
  ["Childcare", "Tuition", "Health", "Parking", "Transit", "Refunds", "Dust", "Paycheck", "Transfer"].forEach(function (name) {
    assert.doesNotMatch(bills, new RegExp(name));
    assert.doesNotMatch(optional, new RegExp(name));
  });
  ["Childcare", "Tuition", "Health", "Parking", "Transit", "Refunds", "Dust", "Paycheck/Salary/Wages", "Transfer"].forEach(function (name) {
    assert.doesNotMatch(budget, new RegExp('data-bar="' + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"'));
  });
  assert.match(optional, /Groceries<\/span><b>\$30\.00<\/b>/);
  assert.match(optional, /Shopping<\/span><b>\$12\.34<\/b>/);
  assert.match(bills, /Optional<\/span><b>\$42\.34<\/b>/);
  assert.match(budget, /data-bar="Groceries"[\s\S]*?MTD \$30\.00[\s\S]*?target \$12\.34/);
  assert.match(budget, /data-bar="Shopping"[\s\S]*?MTD \$12\.34[\s\S]*?target \$24\.00/);
  assert.doesNotMatch(budget, /MTD \$0\.00/);
  assert.doesNotMatch(budget, /MTD \u2014/);

  const edits = ctx.bankPageHtml(fx, { tab: "edits" });
  assert.match(edits, /data-bank-kind="Childcare"[\s\S]*?value="elective" selected/);
  assert.match(edits, /data-bank-kind="Tuition"[\s\S]*?value="must_pay" selected/);
  assert.match(edits, /data-bank-kind="Health"/);
  assert.match(edits, /data-bank-kind="Parking"/);
  assert.match(edits, /data-bank-kind="Transit"/);
  assert.match(edits, /data-bank-kind="Refunds"/);
  assert.match(edits, /data-bank-kind="Dust"/);
  assert.match(edits, /data-bank-kind="Groceries"/);
  assert.doesNotMatch(edits, /data-bank-kind="Paycheck\/Salary\/Wages"/);
  assert.doesNotMatch(edits, /data-bank-kind="Transfer"/);
  assert.doesNotMatch(budget, /data-bank-kind/);

  const quiet = JSON.parse(JSON.stringify(fx));
  quiet.budget.mtd_actual_by_category = { Childcare: 0, Tuition: null, Health: "0", Shopping: -1 };
  quiet.budget.planned_by_category = { Childcare: 12.34, Tuition: 40, Shopping: 9 };
  const quietHtml = ctx.bankPageHtml(quiet, { tab: "budget" });
  assert.match(quietHtml, /No month-to-date category spend in this print/);
  assert.doesNotMatch(quietHtml, /data-bar=/);
  assert.match(pieBlock(quietHtml, "bills"), /No bill spending this month/);
  assert.match(pieBlock(quietHtml, "optional"), /No optional spending this month/);
  assert.doesNotMatch(pieBlock(quietHtml, "bills"), /<path /);
  assert.doesNotMatch(pieBlock(quietHtml, "optional"), /<path /);
  const quietEdits = ctx.bankPageHtml(quiet, { tab: "edits" });
  assert.match(quietEdits, /data-bank-kind="Childcare"/);
  assert.match(quietEdits, /data-bank-kind="Tuition"[\s\S]*?value="must_pay" selected/);
  assert.match(quietEdits, /data-bank-kind="Shopping"/);
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
    const cached = categoryRead(url, init, fx.custom_categories);
    if (cached) return cached;
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
    const cached = categoryRead(url, init, fx && fx.custom_categories);
    if (cached) return cached;
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
  assert.equal(calls.length, 5);
  assert.deepEqual(JSON.parse(calls[2].init.body), { category: "Household" });
  assert.equal(calls[2].url, "/data/banking/categories.json");
  assert.equal(calls[3].url, "/data/banking/overrides.json");
  assert.deepEqual(JSON.parse(calls[3].init.body), { key: key, category: "Household" });
  assert.equal(calls[4].url, "/data/banking/categories.json");
  assert.deepEqual(JSON.parse(calls[4].init.body), { category: "Pets", remove: true });
  assert.deepEqual(JSON.parse(JSON.stringify(el._bank.data.custom_categories)), ["Household", "Gifts"]);
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
  assert.equal(calls.length, 7);
  assert.equal(calls[5].url, "/data/banking/categories.json");
  assert.equal(calls[6].url, "/data/banking/overrides.json");
  assert.equal(JSON.parse(calls[5].init.body).category, "B".repeat(64));
  assert.equal(JSON.parse(calls[6].init.body).category, "B".repeat(64));
  assert.equal(el._bank.editCat, "B".repeat(64));
  const longRow = rowSelectHtml(el.innerHTML, key);
  assert.match(longRow, /value="B{64}" selected/);
  assert.match(el.innerHTML, /data-bank-add-cat/);
});

test("canceling or leaving a row category blank does not post", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const calls = [];
  ctx.fetch = function (url, init) {
    const cached = categoryRead(url, init, fx.custom_categories);
    if (cached) return cached;
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
  ctx.fetch = function (url, init) {
    const cached = categoryRead(url, init, fx.custom_categories);
    if (cached) return cached;
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

test("a select reset still posts the category and assigns that row", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const calls = [];
  const key = "2026-10-05|acct-check|12.34|Corner Market";
  ctx.fetch = function (url, init) {
    const cached = categoryRead(url, init, fx.custom_categories);
    if (cached) return cached;
    calls.push({ url: String(url), init: init || {} });
    const u = String(url);
    if (u === "/data/banking/categories.json") {
      const body = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () {
          return Promise.resolve({
            schema: "banking-custom-categories/v1",
            categories: ["Household", "Gifts", body.category]
          });
        }
      });
    }
    if (u === "/data/banking/overrides.json") {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () { return Promise.resolve({ ok: true }); }
      });
    }
    const stale = JSON.parse(JSON.stringify(fx));
    stale.custom_categories = ["Household", "Gifts", "Pets"];
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () { return Promise.resolve(stale); }
    });
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", editCat: "Groceries" });
  await el.listeners.change(chooseRowAdd(ctx, key));
  await el.listeners.change({
    target: {
      value: "Groceries",
      getAttribute: function (name) { return name === "data-bank-tx" ? key : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.equal(calls.length, 0);
  assert.equal(el._bank.rowAdd && el._bank.rowAdd.key, key);
  el.listeners.input(rowDraftInput("Pets"));
  await el.listeners.click(rowButtonClick("ok"));
  assert.deepEqual(calls.map(function (c) { return c.url; }), [
    "/data/banking/categories.json",
    "/data/banking/overrides.json",
    "/data/banking.json"
  ]);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), { category: "Pets" });
  assert.equal(calls[1].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[1].init.body), { key: key, category: "Pets" });
  const moved = el.innerHTML.match(new RegExp('data-bank-tx="' + key.replace(/[|]/g, "\\|") + '"[\\s\\S]*?<\\/select>'));
  assert.ok(moved);
  assert.match(moved[0], /value="Pets" selected/);
  assert.equal(el._bank.editCat, "Pets");
  assert.match(el.innerHTML, /class="bank-merchant">Corner Market<\/span><span class="bank-edit-meta">2026-10-05<\/span>/);
  ctx.bankActivate(el, "current");
  assert.match(el.innerHTML, /class="bank-merchant">Corner Market<\/span><span class="bank-chip">Pets<\/span>/);
  ["historical", "budget"].forEach(function (tab) {
    const page = ctx.bankPageHtml(el._bank.data, { tab: tab, now: "2026-10-05T18:00:00-04:00" });
    assert.doesNotMatch(page, /data-bank-row-cat/);
    assert.doesNotMatch(page, /data-bank-add-cat/);
    assert.doesNotMatch(page, /Add category/);
  });
});

test("a failed row assign leaves the merchant on its old category", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const calls = [];
  const key = "2026-10-05|acct-check|12.34|Corner Market";
  ctx.fetch = function (url, init) {
    const cached = categoryRead(url, init, fx.custom_categories);
    if (cached) return cached;
    calls.push({ url: String(url), init: init });
    if (String(url) === "/data/banking/categories.json") {
      const body = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () {
          return Promise.resolve({
            schema: "banking-custom-categories/v1",
            categories: ["Household", "Gifts", body.category]
          });
        }
      });
    }
    return Promise.resolve({ ok: false, status: 404, type: "basic" });
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", editCat: "Groceries" });
  await el.listeners.change(chooseRowAdd(ctx, key));
  el.listeners.input(rowDraftInput("Pets"));
  await el.listeners.click(rowButtonClick("ok"));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "/data/banking/categories.json");
  assert.equal(calls[1].url, "/data/banking/overrides.json");
  assert.equal(calls[1].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[1].init.body), { key: key, category: "Pets" });
  assert.equal(el._bank.editCat, "Groceries");
  const row = rowSelectHtml(el.innerHTML, key);
  assert.match(row, /value="Groceries" selected/);
  assert.match(row, /value="Pets"/);
  assert.doesNotMatch(row, /value="Pets" selected/);
  assert.match(el.innerHTML, /not on the feed yet/);
  assert.match(el.innerHTML, /Nothing was saved/);
  assert.doesNotMatch(el.innerHTML, /data-bank-row-cat/);
});

function editsSelects(html) {
  const pick = html.match(/<select data-bank-cat[\s\S]*?<\/select>/);
  const rows = html.match(/<select class="bank-chip" data-bank-tx="[\s\S]*?<\/select>/g) || [];
  return {
    pick: pick ? pick[0] : "",
    pickVals: pick ? bankOptionValues(pick[0]) : [],
    rows: rows,
    rowVals: rows.map(function (row) {
      const vals = bankOptionValues(row);
      return vals[vals.length - 1] === "__add_category__" ? vals.slice(0, -1) : vals;
    })
  };
}

function assertCategoryEverywhere(html, name, want) {
  const sel = editsSelects(html);
  assert.ok(sel.pick, "top category select");
  assert.ok(sel.rows.length > 0, "row assign selects");
  function has(vals) { return vals.indexOf(name) >= 0; }
  if (want) assert.ok(has(sel.pickVals), name + " missing from the top select");
  else assert.equal(sel.pickVals.indexOf(name), -1, name + " still in the top select");
  sel.rowVals.forEach(function (vals) {
    assert.deepEqual(vals, sel.pickVals);
    if (want) assert.ok(has(vals), name + " missing from a row select");
    else assert.equal(vals.indexOf(name), -1, name + " still in a row select");
  });
  return sel;
}

test("a new custom category shows in every edits select while it is still empty", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const key = "2026-10-05|acct-check|12.34|Corner Market";

  async function addPets(mode) {
    const calls = [];
    ctx.fetch = function (url, init) {
      const cached = categoryRead(url, init, fx.custom_categories);
      if (cached) return cached;
      const u = String(url);
      calls.push({ url: u, init: init || {} });
      const body = init && init.body ? JSON.parse(init.body) : null;
      if (u === "/data/banking/categories.json") {
        if (body && body.remove) {
          return Promise.resolve({
            ok: true,
            status: 200,
            type: "basic",
            json: function () { return Promise.resolve({ ok: true }); }
          });
        }
        if (mode === "list") {
          return Promise.resolve({
            ok: true,
            status: 200,
            type: "basic",
            json: function () {
              return Promise.resolve({
                schema: "banking-custom-categories/v1",
                categories: ["Household", "Gifts"]
              });
            }
          });
        }
        if (mode === "snapshot") {
          return Promise.resolve({
            ok: true,
            status: 200,
            type: "basic",
            json: function () { return Promise.resolve(JSON.parse(JSON.stringify(fx))); }
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          type: "basic",
          json: function () { return Promise.resolve({ ok: true }); }
        });
      }
      if (u === "/data/banking.json") {
        return Promise.resolve({
          ok: true,
          status: 200,
          type: "basic",
          json: function () { return Promise.resolve(JSON.parse(JSON.stringify(fx))); }
        });
      }
      return Promise.resolve({ ok: false, status: 500, type: "basic" });
    };
    const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", editCat: "Groceries" });
    await el._bank.prune;
    const typed = addCategoryClick("Pets");
    el.listeners.input(typed.input);
    await el.listeners.click(typed.click);
    assert.equal(el._bank.editCat, "Pets");
    assert.ok(el._bank.data.custom_categories.indexOf("Pets") >= 0);
    const emptyPick = el.innerHTML.match(/<select data-bank-cat[\s\S]*?<\/select>/);
    assert.ok(emptyPick);
    assert.match(emptyPick[0], /value="Pets" selected/);
    assert.match(el.innerHTML, /No items in this category/);
    await el.listeners.change({
      target: {
        value: "Groceries",
        getAttribute: function () { return null; },
        hasAttribute: function (name) { return name === "data-bank-cat"; }
      }
    });
    const shown = assertCategoryEverywhere(el.innerHTML, "Pets", true);
    assert.ok(shown.rows.length > 1);
    assert.ok(shown.pickVals.indexOf("Utilities/Bills") >= 0);
    assert.equal(el.innerHTML.indexOf('data-bank-tx="' + key + '"') >= 0, true);
    const categoryPosts = calls.filter(function (c) { return c.url === "/data/banking/categories.json"; });
    assert.equal(categoryPosts.length, 1);
    assert.deepEqual(JSON.parse(categoryPosts[0].init.body), { category: "Pets" });
    return { el: el, calls: calls };
  }

  const listed = await addPets("list");
  ctx.bankActivate(listed.el, "current");
  await ctx.bankActivate(listed.el, "edits");
  assertCategoryEverywhere(listed.el.innerHTML, "Pets", true);
  assertCategoryEverywhere(listed.el.innerHTML, "Utilities/Bills", true);
  assertCategoryEverywhere(listed.el.innerHTML, "Paycheck/Salary/Wages", true);
  const removed = listed.calls.filter(function (c) {
    return c.url === "/data/banking/categories.json" && c.init && c.init.body && JSON.parse(c.init.body).remove === true;
  });
  assert.equal(removed.length, 0);
  assert.ok(listed.el._bank.data.custom_categories.indexOf("Pets") >= 0);

  await addPets("ack");
  await addPets("snapshot");
});

test("moving the last merchant off a custom category removes it from both selects", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const calls = [];
  ctx.fetch = function (url, init) {
    const cached = categoryRead(url, init, ["Household", "Gifts", "Solo"]);
    if (cached) return cached;
    calls.push({ url: String(url), init: init || {} });
    const body = JSON.parse(init.body);
    if (String(url) === "/data/banking/categories.json") {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () {
          return Promise.resolve({
            schema: "banking-custom-categories/v1",
            categories: ["Household", "Gifts", "Solo"]
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
        return Promise.resolve({ schema: "banking-category-overrides/v1", overrides: overrides });
      }
    });
  };
  const data = JSON.parse(JSON.stringify(fx));
  data.custom_categories = ["Household", "Gifts", "Solo"];
  data.category_overrides = Object.assign({}, data.category_overrides, {
    "2026-04-01|acct-check|12.34|Solo Shop": "Solo"
  });
  data.current.edits_tx.push({
    date: "2026-04-01",
    id: "acct-check",
    desc: "Solo Shop",
    amount: 12.34,
    flow: "outflow",
    category: "Shopping",
    tx_key: "2026-04-01|acct-check|12.34|Solo Shop"
  });
  const el = mount(ctx, data, { tab: "edits", editCat: "Solo" });
  await el._bank.prune;
  assert.equal(calls.length, 0);
  assertCategoryEverywhere(el.innerHTML, "Solo", true);
  assertCategoryEverywhere(el.innerHTML, "Utilities/Bills", true);
  const key = "2026-04-01|acct-check|12.34|Solo Shop";
  await el.listeners.change({
    target: {
      value: "Groceries",
      getAttribute: function (name) { return name === "data-bank-tx" ? key : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "/data/banking/overrides.json");
  assert.deepEqual(JSON.parse(calls[0].init.body), { key: key, category: "Groceries" });
  assert.equal(calls[1].url, "/data/banking/categories.json");
  assert.deepEqual(JSON.parse(calls[1].init.body), { category: "Solo", remove: true });
  assert.equal(el._bank.data.custom_categories.indexOf("Solo"), -1);
  await el.listeners.change({
    target: {
      value: "Groceries",
      getAttribute: function () { return null; },
      hasAttribute: function (name) { return name === "data-bank-cat"; }
    }
  });
  assert.equal(calls.length, 2);
  assertCategoryEverywhere(el.innerHTML, "Solo", false);
  assertCategoryEverywhere(el.innerHTML, "Utilities/Bills", true);
  assertCategoryEverywhere(el.innerHTML, "Household", true);
  const moved = rowSelectHtml(el.innerHTML, key);
  assert.match(moved, /value="Groceries" selected/);
  assert.doesNotMatch(moved, /value="Solo"/);
  ["current", "historical", "budget"].forEach(function (tab) {
    const page = ctx.bankPageHtml(el._bank.data, { tab: tab, now: "2026-10-05T18:00:00-04:00" });
    assert.doesNotMatch(page, /data-bank-cat/);
    assert.doesNotMatch(page, /data-bank-add-cat/);
    assert.doesNotMatch(page, /data-bank-tx/);
  });
});

test("opening edits keeps an unused empty custom and a history-only override", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const calls = [];
  const ancientKey = "2020-01-02|acct-check|12.34|Ancient Shop";
  let serverCats = ["Household", "Gifts", "Linger", "HistOnly", "Ghost"];
  ctx.fetch = function (url, init) {
    const method = init && init.method ? String(init.method).toUpperCase() : "GET";
    const body = init && init.body ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), method: method, body: body });
    if (String(url) === "/data/banking/categories.json" && method === "GET") {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () {
          return Promise.resolve({ categories: serverCats.slice() });
        }
      });
    }
    if (String(url) === "/data/banking/categories.json" && method === "POST" && body && body.remove === true) {
      assert.equal(body.category, "Linger");
      serverCats = serverCats.filter(function (name) { return name !== body.category; });
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () {
          return Promise.resolve({ categories: serverCats.slice() });
        }
      });
    }
    return Promise.resolve({ ok: false, status: 500, type: "basic" });
  };
  const data = JSON.parse(JSON.stringify(fx));
  data.custom_categories = ["Household", "Gifts", "Linger", "HistOnly", "Ghost"];
  data.current.history_tx = [{
    date: "2020-01-02",
    id: "acct-check",
    desc: "Ancient Shop",
    amount: 12.34,
    flow: "outflow",
    category: "Shopping",
    tx_key: ancientKey
  }];
  data.category_overrides = Object.assign({}, data.category_overrides, {
    [ancientKey]: "HistOnly",
    "not-in-any-list": "Ghost"
  });
  const el = mount(ctx, data, { tab: "edits", editCat: "Groceries" });
  await el._bank.prune;
  function removePosts() {
    return calls.filter(function (c) {
      return c.method === "POST" && c.body && c.body.remove === true;
    });
  }
  assert.equal(calls[0].url, "/data/banking/categories.json");
  assert.equal(calls[0].method, "GET");
  assert.deepEqual(removePosts().map(function (c) { return c.body.category; }), []);
  assert.ok(el._bank.data.custom_categories.indexOf("Linger") >= 0);
  ["Linger", "HistOnly", "Ghost", "Household", "Gifts"].forEach(function (name) {
    assert.ok(el._bank.data.custom_categories.indexOf(name) >= 0, name);
    assertCategoryEverywhere(el.innerHTML, name, true);
  });
  assert.doesNotMatch(el.innerHTML, /Ancient Shop/);
  assertCategoryEverywhere(el.innerHTML, "Utilities/Bills", true);
  assertCategoryEverywhere(el.innerHTML, "Paycheck/Salary/Wages", true);
  assert.equal(ctx.bankCategoryCount(el._bank.data, "Utilities/Bills"), 0);
  assert.equal(ctx.bankCategoryCount(el._bank.data, "Paycheck/Salary/Wages"), 0);
  assert.equal(ctx.bankCategoryCount(el._bank.data, "Linger"), 0);
  assert.ok(ctx.bankCategoryCount(el._bank.data, "HistOnly") > 0);
  assert.ok(ctx.bankCategoryCount(el._bank.data, "Ghost") > 0);
  assert.ok(ctx.bankCategoryCount(el._bank.data, "Household") > 0);
  assert.ok(ctx.bankCategoryCount(el._bank.data, "Gifts") > 0);
  assert.equal(ctx.bankOverrideHasCategory(el._bank.data, "HistOnly"), true);
  assert.equal(ctx.bankOverrideHasCategory(el._bank.data, "Linger"), false);

  const posted = removePosts().length;
  ctx.bankActivate(el, "current");
  await ctx.bankActivate(el, "edits");
  await ctx.bankRefreshEmptyCustoms(el);
  assert.equal(removePosts().length, posted);
  assert.equal(posted, 0);
  assert.ok(el._bank.data.custom_categories.indexOf("HistOnly") >= 0);
  assert.ok(el._bank.data.custom_categories.indexOf("Linger") >= 0);
  assertCategoryEverywhere(el.innerHTML, "HistOnly", true);
  assertCategoryEverywhere(el.innerHTML, "Linger", true);
  assertCategoryEverywhere(el.innerHTML, "Household", true);
  assertCategoryEverywhere(el.innerHTML, "Gifts", true);
  assertCategoryEverywhere(el.innerHTML, "Utilities/Bills", true);

  el._bank.data.custom_categories = el._bank.data.custom_categories.concat(["Vacant", "Linger"]);
  el._bank.rowAdd = { key: "2026-10-05|acct-check|12.34|Corner Market", draft: "  Linger  " };
  el._bank.newCatDraft = "Vacant";
  const held = ctx.bankTakeEmptyCustoms(el._bank);
  assert.deepEqual(JSON.parse(JSON.stringify(held)), []);
  assert.ok(el._bank.data.custom_categories.indexOf("Linger") >= 0);
  assert.ok(el._bank.data.custom_categories.indexOf("Vacant") >= 0);
  assert.ok(el._bank.data.custom_categories.indexOf("HistOnly") >= 0);
  el._bank.rowAdd = null;
  el._bank.newCatDraft = "";
  el._bank.keptEmpty = "Linger";
  const keptEmpty = ctx.bankTakeEmptyCustoms(el._bank);
  assert.deepEqual(JSON.parse(JSON.stringify(keptEmpty)), ["Vacant"]);
  assert.ok(el._bank.data.custom_categories.indexOf("Linger") >= 0);
  el._bank.keptEmpty = "";
  const dropped = ctx.bankTakeEmptyCustoms(el._bank);
  assert.deepEqual(JSON.parse(JSON.stringify(dropped)), ["Linger"]);
  assert.ok(el._bank.data.custom_categories.indexOf("HistOnly") >= 0);
  assert.ok(el._bank.data.custom_categories.indexOf("Ghost") >= 0);
  assert.equal(removePosts().length, posted);
  assert.doesNotMatch(el.innerHTML, /Category did not save/);
  assert.doesNotMatch(el.innerHTML, /Nothing was changed/);
});

test("a failed categories read keeps snap customs and does not post removal", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const calls = [];
  ctx.fetch = function (url, init) {
    const method = init && init.method ? String(init.method).toUpperCase() : "GET";
    calls.push({
      url: String(url),
      method: method,
      body: init && init.body ? JSON.parse(init.body) : null
    });
    return Promise.resolve({ ok: false, status: 500, type: "basic" });
  };
  const data = JSON.parse(JSON.stringify(fx));
  data.custom_categories = ["Household", "Gifts", "Linger", "HistOnly"];
  data.category_overrides = Object.assign({}, data.category_overrides, {
    "not-in-any-list": "HistOnly"
  });
  const el = mount(ctx, data, { tab: "edits", editCat: "Groceries" });
  await el._bank.prune;
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "/data/banking/categories.json");
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[1].url, "/data/banking/mustpay-overrides.json");
  assert.equal(calls[1].method, "GET");
  ["Household", "Gifts", "Linger", "HistOnly"].forEach(function (name) {
    assert.ok(el._bank.data.custom_categories.indexOf(name) >= 0, name);
    assertCategoryEverywhere(el.innerHTML, name, true);
  });
  assert.doesNotMatch(el.innerHTML, /Category did not save/);
  assert.doesNotMatch(el.innerHTML, /Nothing was changed/);
});

test("an empty categories list keeps override customs and an unused custom", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const calls = [];
  ctx.fetch = function (url, init) {
    const method = init && init.method ? String(init.method).toUpperCase() : "GET";
    const body = init && init.body ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), method: method, body: body });
    if (String(url) === "/data/banking/categories.json" && method === "GET") {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () { return Promise.resolve({ categories: [] }); }
      });
    }
    if (String(url) === "/data/banking/categories.json" && method === "POST" && body && body.remove === true) {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () { return Promise.resolve({ categories: [] }); }
      });
    }
    return Promise.resolve({ ok: false, status: 500, type: "basic" });
  };
  const data = JSON.parse(JSON.stringify(fx));
  data.custom_categories = ["Household", "Gifts", "Linger", "HistOnly"];
  data.category_overrides = Object.assign({}, data.category_overrides, {
    "not-in-any-list": "HistOnly"
  });
  const el = mount(ctx, data, { tab: "edits", editCat: "Groceries" });
  await el._bank.prune;
  const removed = calls.filter(function (c) { return c.body && c.body.remove === true; });
  assert.deepEqual(removed.map(function (c) { return c.body.category; }), []);
  assert.ok(el._bank.data.custom_categories.indexOf("Linger") >= 0);
  ["Household", "Gifts", "HistOnly", "Linger"].forEach(function (name) {
    assert.ok(el._bank.data.custom_categories.indexOf(name) >= 0, name);
    assertCategoryEverywhere(el.innerHTML, name, true);
  });
  assertCategoryEverywhere(el.innerHTML, "Utilities/Bills", true);
  assert.doesNotMatch(el.innerHTML, /Category did not save/);
});

test("reassigning the last in-window merchant keeps a history-only override", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const calls = [];
  const ancientKey = "2020-01-02|acct-check|12.34|Ancient Shop";
  const windowKey = "2026-03-01|acct-check|12.34|Window Shop";
  const data = JSON.parse(JSON.stringify(fx));
  data.custom_categories = ["Household", "Gifts", "HistOnly"];
  data.current.history_tx = [{
    date: "2020-01-02",
    id: "acct-check",
    desc: "Ancient Shop",
    amount: 12.34,
    flow: "outflow",
    category: "Shopping",
    tx_key: ancientKey
  }];
  data.current.edits_tx.push({
    date: "2026-03-01",
    id: "acct-check",
    desc: "Window Shop",
    amount: 12.34,
    flow: "outflow",
    category: "Shopping",
    tx_key: windowKey
  });
  data.category_overrides = Object.assign({}, data.category_overrides, {
    [ancientKey]: "HistOnly",
    [windowKey]: "HistOnly"
  });
  ctx.fetch = function (url, init) {
    const cached = categoryRead(url, init, data.custom_categories);
    if (cached) return cached;
    calls.push({ url: String(url), init: init || {} });
    const body = JSON.parse(init.body);
    if (String(url) === "/data/banking/categories.json") {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () { return Promise.resolve({ ok: true }); }
      });
    }
    const overrides = Object.assign({}, data.category_overrides);
    overrides[body.key] = body.category;
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () {
        return Promise.resolve({ schema: "banking-category-overrides/v1", overrides: overrides });
      }
    });
  };
  const el = mount(ctx, data, { tab: "edits", editCat: "HistOnly" });
  await el._bank.prune;
  assert.equal(calls.length, 0);
  assert.match(el.innerHTML, /Window Shop/);
  assert.match(el.innerHTML, /Ancient Shop/);
  assertCategoryEverywhere(el.innerHTML, "HistOnly", true);
  await el.listeners.change({
    target: {
      value: "Groceries",
      getAttribute: function (name) { return name === "data-bank-tx" ? windowKey : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/data/banking/overrides.json");
  assert.deepEqual(JSON.parse(calls[0].init.body), { key: windowKey, category: "Groceries" });
  assert.ok(el._bank.data.custom_categories.indexOf("HistOnly") >= 0);
  assert.equal(ctx.bankOverrideHasCategory(el._bank.data, "HistOnly"), true);
  assert.ok(ctx.bankCategoryCount(el._bank.data, "HistOnly") > 0);
  await el.listeners.change({
    target: {
      value: "Groceries",
      getAttribute: function () { return null; },
      hasAttribute: function (name) { return name === "data-bank-cat"; }
    }
  });
  assert.equal(calls.length, 1);
  assertCategoryEverywhere(el.innerHTML, "HistOnly", true);
  assertCategoryEverywhere(el.innerHTML, "Utilities/Bills", true);
  const moved = rowSelectHtml(el.innerHTML, windowKey);
  assert.match(moved, /value="Groceries" selected/);
  assert.match(moved, /value="HistOnly"/);
});

test("a failed category removal restores the label and shows an error", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const key = "2026-04-01|acct-check|12.34|Solo Shop";
  async function failRemove(status) {
    const calls = [];
    ctx.fetch = function (url, init) {
      const cached = categoryRead(url, init, ["Household", "Gifts", "Solo"]);
      if (cached) return cached;
      calls.push({ url: String(url), init: init || {} });
      const body = JSON.parse(init.body);
      if (String(url) === "/data/banking/categories.json") {
        return Promise.resolve({ ok: false, status: status, type: "basic" });
      }
      const overrides = Object.assign({}, fx.category_overrides || {});
      overrides[body.key] = body.category;
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () {
          return Promise.resolve({ schema: "banking-category-overrides/v1", overrides: overrides });
        }
      });
    };
    const data = JSON.parse(JSON.stringify(fx));
    data.custom_categories = ["Household", "Gifts", "Solo"];
    data.category_overrides = Object.assign({}, data.category_overrides, { [key]: "Solo" });
    data.current.edits_tx.push({
      date: "2026-04-01",
      id: "acct-check",
      desc: "Solo Shop",
      amount: 12.34,
      flow: "outflow",
      category: "Shopping",
      tx_key: key
    });
    const el = mount(ctx, data, { tab: "edits", editCat: "Solo" });
    await el._bank.prune;
    assert.equal(calls.length, 0);
    await el.listeners.change({
      target: {
        value: "Groceries",
        getAttribute: function (name) { return name === "data-bank-tx" ? key : null; },
        hasAttribute: function () { return false; }
      }
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, "/data/banking/categories.json");
    assert.deepEqual(JSON.parse(calls[1].init.body), { category: "Solo", remove: true });
    assert.ok(el._bank.data.custom_categories.indexOf("Solo") >= 0);
    assertCategoryEverywhere(el.innerHTML, "Solo", true);
    assertCategoryEverywhere(el.innerHTML, "Utilities/Bills", true);
    const moved = rowSelectHtml(el.innerHTML, key);
    assert.match(moved, /value="Groceries" selected/);
    if (status === 401 || status === 403 || status === 302) {
      assert.match(el.innerHTML, /Sign in again to remove a category/);
    } else if (status === 404 || status === 405) {
      assert.match(el.innerHTML, /not on the feed yet/);
      assert.match(el.innerHTML, /Nothing was saved/);
    } else {
      assert.match(el.innerHTML, /Category did not save/);
      assert.match(el.innerHTML, /Nothing was changed/);
    }
    assert.doesNotMatch(el.innerHTML, /Sign in again to add a category/);
  }
  for (const status of [404, 405, 401, 403, 302, 500]) await failRemove(status);
  ctx.fetch = function (url, init) {
    const cached = categoryRead(url, init, ["Household", "Gifts", "Solo"]);
    if (cached) return cached;
    const body = JSON.parse(init.body);
    if (String(url) === "/data/banking/categories.json") return Promise.reject(new Error("offline"));
    const overrides = Object.assign({}, fx.category_overrides || {});
    overrides[body.key] = body.category;
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () {
        return Promise.resolve({ schema: "banking-category-overrides/v1", overrides: overrides });
      }
    });
  };
  const data = JSON.parse(JSON.stringify(fx));
  data.custom_categories = ["Household", "Gifts", "Solo"];
  data.category_overrides = Object.assign({}, data.category_overrides, { [key]: "Solo" });
  data.current.edits_tx.push({
    date: "2026-04-01",
    id: "acct-check",
    desc: "Solo Shop",
    amount: 12.34,
    flow: "outflow",
    category: "Shopping",
    tx_key: key
  });
  const el = mount(ctx, data, { tab: "edits", editCat: "Solo" });
  await el.listeners.change({
    target: {
      value: "Groceries",
      getAttribute: function (name) { return name === "data-bank-tx" ? key : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.match(el.innerHTML, /Category did not save/);
  assert.match(el.innerHTML, /Nothing was changed/);
  assert.ok(el._bank.data.custom_categories.indexOf("Solo") >= 0);
  assertCategoryEverywhere(el.innerHTML, "Solo", true);
});

test("failed categories read and an empty list both keep an unused snap custom", async function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.custom_categories = ["Pets"];
  fx.current.recent_tx = [];
  fx.current.edits_tx = [];
  delete fx.current.history_tx;
  fx.category_overrides = {};
  fx.history.months.forEach(function (month) {
    delete month.tx;
    delete month.txs;
    delete month.transactions;
    delete month.history_tx;
    delete month.recent_tx;
  });
  ctx.fetch = function () { return Promise.reject(new Error("offline")); };
  const bare = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits" });
  await bare._bank.prune;
  assert.equal(ctx.bankEditRows(bare._bank.data).length, 0);
  assert.match(bare.innerHTML, /No transactions in this print/);
  assert.match(bare.innerHTML, /<select data-bank-cat[^>]*>[\s\S]*value="Pets"/);
  assert.deepEqual(JSON.parse(JSON.stringify(bare._bank.data.custom_categories)), ["Pets"]);
  assert.doesNotMatch(bare.innerHTML, /Category did not save/);

  const calls = [];
  ctx.fetch = function (url, init) {
    const method = init && init.method ? String(init.method).toUpperCase() : "GET";
    const body = init && init.body ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), method: method, body: body });
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () { return Promise.resolve({ categories: [] }); }
    });
  };
  const withRow = JSON.parse(JSON.stringify(fx));
  withRow.custom_categories = ["Pets", "HistOnly"];
  withRow.category_overrides = { "not-in-any-list": "HistOnly" };
  withRow.current.edits_tx = [{
    date: "2026-10-05",
    id: "acct-check",
    desc: "Corner Market",
    amount: 12.34,
    flow: "outflow",
    category: "Groceries",
    tx_key: "2026-10-05|acct-check|12.34|Corner Market"
  }];
  const el = mount(ctx, withRow, { tab: "edits", editCat: "Groceries" });
  await el._bank.prune;
  assert.equal(ctx.bankEditRows(el._bank.data).some(function (row) { return row.category === "Pets"; }), false);
  assertCategoryEverywhere(el.innerHTML, "Pets", true);
  assertCategoryEverywhere(el.innerHTML, "HistOnly", true);
  assert.ok(el._bank.data.custom_categories.indexOf("Pets") >= 0);
  assert.ok(el._bank.data.custom_categories.indexOf("HistOnly") >= 0);
  assert.deepEqual(calls.filter(function (c) { return c.body && c.body.remove === true; }).map(function (c) {
    return c.body.category;
  }), []);
  const seat = { data: { custom_categories: ["Pets"] } };
  ctx.bankAdoptSnapshot(seat, { custom_categories: [], current: { recent_tx: [] } });
  assert.deepEqual(JSON.parse(JSON.stringify(seat.data.custom_categories)), ["Pets"]);
});

test("categories.json GET merges into both edits dropdowns", async function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.custom_categories = [];
  fx.category_overrides = Object.assign({}, fx.category_overrides, { "not-in-any-list": "Pets" });
  const calls = [];
  ctx.fetch = function (url, init) {
    const method = init && init.method ? String(init.method).toUpperCase() : "GET";
    calls.push({ url: String(url), method: method });
    if (String(url) === "/data/banking/mustpay-overrides.json" && method === "GET") {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () { return Promise.resolve({ schema: "banking-mustpay-overrides/v1", overrides: {} }); }
      });
    }
    assert.equal(String(url), "/data/banking/categories.json");
    assert.equal(init.credentials, "include");
    assert.equal(init.headers.Accept, "application/json");
    assert.equal(init.cache, "no-store");
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () { return Promise.resolve({ categories: ["  Pets  ", "", "Pets", "   "] }); }
    });
  };
  const el = mount(ctx, fx, { tab: "edits", editCat: "Groceries" });
  assert.equal(el._bank.data.custom_categories.indexOf("Pets"), -1);
  await el._bank.prune;
  assert.equal(calls.filter(function (c) { return c.url === "/data/banking/categories.json"; }).length, 1);
  assert.equal(calls[0].method, "GET");
  assertCategoryEverywhere(el.innerHTML, "Pets", true);
  assert.deepEqual(JSON.parse(JSON.stringify(el._bank.data.custom_categories)), ["Pets"]);
  ctx.bankMergeCustomCategories(el._bank.data, []);
  assert.deepEqual(JSON.parse(JSON.stringify(el._bank.data.custom_categories)), ["Pets"]);
});

test("an added category still shows after an empty body and a mock reload", async function () {
  const ctx = boot();
  const fx = loadFixture();
  let stored = ["Household", "Gifts"];
  let liveGet = true;
  ctx.fetch = function (url, init) {
    const method = init && init.method ? String(init.method).toUpperCase() : "GET";
    if (String(url) === "/data/banking/categories.json" && method === "GET") {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () { return Promise.resolve({ categories: liveGet ? [] : stored.slice() }); }
      });
    }
    if (String(url) === "/data/banking/categories.json" && method === "POST") {
      const body = JSON.parse(init.body);
      assert.equal(body.category, "Pets");
      if (body.remove === true) {
        stored = stored.filter(function (name) { return name !== body.category; });
        return Promise.resolve({
          ok: true,
          status: 200,
          type: "basic",
          json: function () { return Promise.resolve({ categories: stored.slice() }); }
        });
      }
      assert.equal(body.remove, undefined);
      stored = stored.concat([body.category]);
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () { return Promise.resolve({}); }
      });
    }
    if (String(url) === "/data/banking.json") {
      const snap = JSON.parse(JSON.stringify(fx));
      snap.custom_categories = [];
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () { return Promise.resolve(snap); }
      });
    }
    return Promise.reject(new Error("unexpected " + url));
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", editCat: "Groceries" });
  await el._bank.prune;
  const typed = addCategoryClick("Pets");
  el.listeners.input(typed.input);
  await el.listeners.click(typed.click);
  assert.equal(el._bank.editCat, "Pets");
  assert.match(el.innerHTML, /value="Pets" selected/);
  await el.listeners.change({
    target: {
      value: "Groceries",
      getAttribute: function () { return null; },
      hasAttribute: function (name) { return name === "data-bank-cat"; }
    }
  });
  assertCategoryEverywhere(el.innerHTML, "Pets", true);

  liveGet = false;
  stored = stored.concat(["HistOnly"]);
  ctx.location.hash = "#edits";
  const reloaded = JSON.parse(JSON.stringify(fx));
  reloaded.custom_categories = [];
  reloaded.category_overrides = Object.assign({}, reloaded.category_overrides, {
    "not-in-any-list": "HistOnly"
  });
  const next = { innerHTML: "", addEventListener: function () {} };
  await ctx.bankLoad(next, function () {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: function () { return Promise.resolve(reloaded); }
    });
  });
  assertCategoryEverywhere(next.innerHTML, "HistOnly", true);
  assertCategoryEverywhere(next.innerHTML, "Household", true);
  assertCategoryEverywhere(next.innerHTML, "Gifts", true);
  assertCategoryEverywhere(next.innerHTML, "Pets", true);
  assert.ok(next._bank.data.custom_categories.indexOf("HistOnly") >= 0);
  assert.ok(next._bank.data.custom_categories.indexOf("Pets") >= 0);
});

function pieBlock(html, key) {
  const marker = 'data-bank-pie="' + key + '"';
  const start = html.indexOf(marker);
  assert.ok(start >= 0, key);
  const rest = html.slice(start);
  const close = rest.indexOf("</section>");
  assert.ok(close >= 0, key + " section");
  return rest.slice(0, close);
}

test("budget marks Bill versus Optional and hides a provider prefix", async function () {
  const ctx = boot();
  const fx = loadFixture();
  const phone = ctx.bankNormalizeBills(fx.budget).filter(function (b) { return b.name === "Phone"; })[0];
  assert.equal(phone.typical_day, null);
  assert.equal(ctx.bankResolveKind("Phone", fx), "must_pay");
  assert.equal(ctx.bankResolveKind("Mortgage", fx), "must_pay");
  assert.equal(ctx.bankResolveKind("Groceries", fx), "elective");
  assert.equal(ctx.bankResolveKind("Shopping", fx), "elective");
  assert.equal(ctx.bankResolveKind("Childcare", fx), "elective");
  assert.equal(ctx.bankResolveKind("Tuition", fx), "must_pay");
  assert.equal(ctx.bankResolveKind("Streaming", fx), "elective");

  const base = ctx.bankPageHtml(fx, { tab: "budget" });
  const baseBills = pieBlock(base, "bills");
  const baseOptional = pieBlock(base, "optional");
  assert.match(baseBills, /<h3>Bills<\/h3>/);
  assert.match(baseBills, /Optional<\/span><b>\$42\.34<\/b>/);
  assert.equal((baseBills.match(/<path /g) || []).length, 1);
  assert.doesNotMatch(baseBills, /Groceries|Shopping|Tuition/);
  assert.match(baseOptional, /<h3>Optional<\/h3>/);
  assert.match(baseOptional, /Groceries<\/span><b>\$30\.00<\/b>/);
  assert.match(baseOptional, /Shopping<\/span><b>\$12\.34<\/b>/);
  assert.doesNotMatch(baseOptional, /Tuition|Mortgage/);
  assert.doesNotMatch(base, /Elective|Other spending/);
  assert.doesNotMatch(base, /data-bank-kind/);

  const parked = JSON.parse(JSON.stringify(fx));
  parked.dueday_overrides = { parking: 8 };
  parked.budget.mtd_actual_by_category = { Parking: 5, Groceries: 2 };
  assert.equal(ctx.bankResolveKind("Parking", parked), "must_pay");
  assert.equal(ctx.bankResolveKind("Groceries", parked), "elective");
  parked.mustpay_overrides = { Parking: "elective" };
  assert.equal(ctx.bankResolveKind("Parking", parked), "elective");

  const lantern = JSON.parse(JSON.stringify(fx));
  delete lantern.mustpay_overrides;
  lantern.budget.calendar = [{ day: 9, items: ["Lantern"] }];
  lantern.budget.mtd_actual_by_category = { Lantern: 4, Groceries: 2 };
  assert.equal(ctx.bankResolveKind("Lantern", lantern), "must_pay");
  assert.equal(ctx.bankResolveKind("Groceries", lantern), "elective");

  const flipped = JSON.parse(JSON.stringify(fx));
  flipped.mustpay_overrides = { Mortgage: "elective", Groceries: "must_pay" };
  assert.equal(ctx.bankResolveKind("Mortgage", flipped), "elective");
  assert.equal(ctx.bankResolveKind("Groceries", flipped), "must_pay");
  flipped.budget.mtd_actual_by_category = {
    Groceries: 30,
    Shopping: 10,
    Mortgage: 20,
    "Paycheck/Salary/Wages": 500,
    Transfer: 9
  };
  const split = ctx.bankPageHtml(flipped, { tab: "budget" });
  const bills = pieBlock(split, "bills");
  const optional = pieBlock(split, "optional");
  assert.match(bills, /Groceries<\/span><b>\$30\.00<\/b>/);
  assert.match(bills, /Optional<\/span><b>\$30\.00<\/b>/);
  assert.doesNotMatch(bills, /Paycheck|Transfer|Shopping|Mortgage/);
  assert.match(optional, /Mortgage<\/span><b>\$20\.00<\/b>/);
  assert.match(optional, /Shopping<\/span><b>\$10\.00<\/b>/);
  assert.doesNotMatch(optional, /Groceries|Paycheck|Transfer/);
  assert.doesNotMatch(split, /Elective|Other spending/);

  const nested = JSON.parse(JSON.stringify(fx));
  delete nested.mustpay_overrides;
  nested.budget.mustpay_overrides = { Shopping: "must_pay" };
  assert.equal(ctx.bankResolveKind("Shopping", nested), "must_pay");
  assert.equal(ctx.bankResolveKind("Groceries", nested), "elective");
  nested.mustpay_overrides = { Shopping: "elective" };
  assert.equal(ctx.bankResolveKind("Shopping", nested), "elective");

  const quiet = JSON.parse(JSON.stringify(fx));
  quiet.budget.mtd_actual_by_category = {};
  quiet.mustpay_overrides = {};
  const quietHtml = ctx.bankPageHtml(quiet, { tab: "budget" });
  assert.match(pieBlock(quietHtml, "bills"), /No bill spending this month/);
  assert.match(pieBlock(quietHtml, "optional"), /No optional spending this month/);
  assert.doesNotMatch(pieBlock(quietHtml, "bills"), /<path /);
  assert.doesNotMatch(pieBlock(quietHtml, "optional"), /<path /);

  assert.equal(ctx.bankDisplayName("Acme Mortgage"), "Mortgage");
  assert.equal(ctx.bankDisplayName("Acme Gas (Utility)"), "Gas (Utility)");
  assert.equal(ctx.bankDisplayName("Gas (Utility)"), "Gas (Utility)");
  assert.equal(ctx.bankDisplayName("Northwind Mobile plan"), "Northwind Mobile plan");
  assert.equal(ctx.bankDisplayName("Acme Mobile"), "Acme Mobile");
  assert.equal(ctx.bankDisplayName("Mobile"), "Mobile");
  assert.equal(ctx.bankDisplayName("X Mobile plan"), "X Mobile plan");
  assert.equal(ctx.bankDisplayName("Mobile Deposit"), "Mobile Deposit");
  assert.equal(ctx.bankDisplayName("Exxon Mobil"), "Exxon Mobil");
  assert.equal(ctx.bankBillDisplayName("Northwind Mobile plan"), "Phone");
  assert.equal(ctx.bankBillDisplayName("Acme Mobile"), "Phone");
  assert.equal(ctx.bankBillDisplayName("Mobile"), "Phone");
  assert.equal(ctx.bankBillDisplayName("Mobile plan"), "Phone");
  assert.equal(ctx.bankBillDisplayName("X Mobile plan"), "Phone");
  assert.equal(ctx.bankBillDisplayName("Mobile Deposit"), "Mobile Deposit");
  assert.equal(ctx.bankBillDisplayName("Mobile Deposits"), "Mobile Deposits");
  assert.equal(ctx.bankBillDisplayName("Mobile Home Park"), "Mobile Home Park");
  assert.equal(ctx.bankBillDisplayName("Mobile Home"), "Mobile Home");
  assert.equal(ctx.bankBillDisplayName("Mobile Banking"), "Mobile Banking");
  assert.equal(ctx.bankBillDisplayName("Mobile Transfer"), "Mobile Transfer");
  assert.equal(ctx.bankBillDisplayName("Mobile AL Water"), "Mobile AL Water");
  assert.equal(ctx.bankBillDisplayName("Mobile Bay Electric"), "Mobile Bay Electric");
  assert.equal(ctx.bankBillDisplayName("Mobile Check"), "Mobile Check");
  assert.equal(ctx.bankBillDisplayName("T Mobile"), "Phone");
  assert.equal(ctx.bankBillDisplayName("Exxon Mobil"), "Exxon Mobil");
  assert.equal(ctx.bankBillDisplayName("Acme Mortgage"), "Mortgage");
  assert.equal(ctx.bankDisplayName("Gasoline"), "Gasoline");
  assert.equal(ctx.bankDisplayName("Rent/Mortgage"), "Rent/Mortgage");
  assert.equal(ctx.bankDisplayName("Groceries"), "Groceries");
  assert.equal(ctx.bankDisplayName("Utilities/Bills"), "Utilities/Bills");

  const shown = JSON.parse(JSON.stringify(fx));
  shown.budget.bills = [{ name: "Acme Mortgage", amount: 12.34, typical_day: 4, cadence: "monthly" }];
  shown.budget.bills_monthly = [];
  shown.budget.calendar = [];
  shown.budget.income_monthly = [];
  shown.budget.planned_by_category = {};
  shown.budget.mtd_actual_by_category = { "Acme Mortgage": 8, Groceries: 3 };
  shown.mustpay_overrides = {};
  shown.current.edits_tx = [{
    date: "2026-10-04",
    id: "acct-check",
    desc: "House Note",
    amount: 8,
    flow: "outflow",
    category: "Acme Mortgage",
    tx_key: "acme-1"
  }];
  shown.current.recent_tx = shown.current.edits_tx.slice();
  const beforeBills = JSON.stringify(shown.budget.bills);
  const budget = ctx.bankPageHtml(shown, { tab: "budget" });
  assert.equal(JSON.stringify(shown.budget.bills), beforeBills);
  assert.equal(shown.budget.mtd_actual_by_category["Acme Mortgage"], 8);
  assert.doesNotMatch(budget.replace(/data-bar="[^"]*"/g, ""), /Acme/);
  assert.match(budget, /<b>4<\/b><span>Mortgage<\/span>/);
  assert.match(pieBlock(budget, "bills"), /Mortgage<\/span><b>\$8\.00<\/b>/);
  assert.match(pieBlock(budget, "bills"), /Optional<\/span><b>\$3\.00<\/b>/);
  assert.match(pieBlock(budget, "optional"), /Groceries<\/span><b>\$3\.00<\/b>/);
  assert.doesNotMatch(pieBlock(budget, "optional"), /Mortgage/);
  const edits = ctx.bankPageHtml(shown, { tab: "edits", editCat: "Acme Mortgage" });
  assert.match(edits, /<option value="Acme Mortgage"(?: selected)?>Mortgage<\/option>/);
  assert.match(edits, /data-bank-kind="Acme Mortgage"/);
  assert.match(edits, /aria-label="Bill or Optional for Mortgage"/);
  assert.match(edits, /data-bank-kind="Acme Mortgage"[\s\S]*?value="must_pay" selected/);
  assert.match(edits, />Bill<\/option>/);
  assert.match(edits, />Optional<\/option>/);
  assert.match(edits, /class="bank-merchant">House Note</);
  assert.doesNotMatch(edits, /Elective|Other spending/);
  assert.doesNotMatch(budget, /data-bank-kind/);
  const capped = ctx.bankMtdSplitHtml(5000, 1);
  assert.match(capped, /999%\+ of income/);
  assert.match(capped, /style="width:100%"/);
  assert.match(capped, /class="bank-mtd-meter"/);
  assert.doesNotMatch(capped, /class="bank-pie"/);
  assert.doesNotMatch(capped, /NaN|Infinity/);
  assert.equal(ctx.bankMtdOfIncomeText(9.99, 1), "999%");
  assert.equal(ctx.bankMtdOfIncomeText(10, 1), "999%+");
  assert.equal(ctx.bankMtdOfIncomeText(10, 0), "0%");
  assert.equal(ctx.bankMtdOfIncomeText(10, null), "0%");
  const over = ctx.bankMtdSplitHtml(60, 40);
  assert.match(over, /150% of income/);
  assert.match(over, /class="bank-mtd-track over"/);
  assert.match(over, /Spent so far<\/span><b>\$60\.00<\/b>/);
  assert.match(over, /Income received<\/span><b>\$40\.00<\/b>/);
  assert.doesNotMatch(ctx.bankMtdSplitHtml(10, 0), /bank-mtd-meter|NaN|Infinity/);
  assert.doesNotMatch(ctx.bankMtdSplitHtml(10, null), /bank-mtd-meter|NaN|Infinity/);
  assert.match(ctx.bankMtdBlock(shown), /Month to date · day 5 of 31/);

  const writes = [];
  ctx.localStorage.setItem = function (k, v) { writes.push(k + "=" + v); };
  const calls = [];
  ctx.fetch = function (url, init) {
    const method = init && init.method ? String(init.method).toUpperCase() : "GET";
    if (String(url) === "/data/banking/mustpay-overrides.json" && method === "GET") {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () {
          return Promise.resolve({
            schema: "banking-mustpay-overrides/v1",
            overrides: { "Acme Mortgage": "must_pay" }
          });
        }
      });
    }
    const cached = categoryRead(url, init, shown.custom_categories);
    if (cached) return cached;
    calls.push({ url: String(url), init: init });
    const body = JSON.parse(init.body);
    if (method === "PUT") {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () { return Promise.resolve(JSON.parse(init.body)); }
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () {
        return Promise.resolve({
          schema: "banking-mustpay-overrides/v1",
          overrides: { "Acme Mortgage": body.kind }
        });
      }
    });
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(shown)), { tab: "edits", editCat: "Acme Mortgage" });
  await el._bank.prune;
  assert.match(el.innerHTML, /data-bank-kind="Acme Mortgage"[\s\S]*?value="must_pay" selected/);
  assert.match(el.innerHTML, /Bill or Optional edits sync across your seats/);
  await el.listeners.change({
    target: {
      value: "elective",
      getAttribute: function (name) { return name === "data-bank-kind" ? "Acme Mortgage" : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/data/banking/mustpay-overrides.json");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.credentials, "include");
  assert.deepEqual(JSON.parse(calls[0].init.body), { name: "Acme Mortgage", kind: "elective" });
  assert.match(el.innerHTML, /data-bank-kind="Acme Mortgage"[\s\S]*?value="elective" selected/);
  assert.equal(writes.length, 0);
  ctx.bankActivate(el, "budget");
  assert.doesNotMatch(el.innerHTML.replace(/data-bar="[^"]*"/g, ""), /Acme/);
  assert.match(pieBlock(el.innerHTML, "optional"), /Mortgage<\/span><b>\$8\.00<\/b>/);
  assert.match(pieBlock(el.innerHTML, "bills"), /Optional<\/span><b>\$11\.00<\/b>/);
  assert.doesNotMatch(pieBlock(el.innerHTML, "bills"), /Mortgage/);

  calls.length = 0;
  await ctx.bankPutMustPay(el, { Groceries: "bill", "Acme Mortgage": "optional" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, "PUT");
  const putBody = JSON.parse(calls[0].init.body);
  assert.equal(putBody.schema, "banking-mustpay-overrides/v1");
  assert.deepEqual(putBody.overrides, { Groceries: "must_pay", "Acme Mortgage": "elective" });
  assert.equal(ctx.bankResolveKind("Groceries", el._bank.data), "must_pay");
  assert.equal(writes.length, 0);

  const src = fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8");
  const fixtureSrc = fs.readFileSync(fixturePath, "utf8");
  assert.doesNotMatch(src, /Duquesne|Columbia Gas|T-Mobile|M&T|nfcu/i);
  assert.doesNotMatch(src, /t-?\s?mobile/i);
  assert.match(src, /share the spend-category name space/);
  assert.match(src, /not a second category system/);
  assert.match(src, /function bankBillDisplayName[\s\S]*?\\bmobile\\b/);
  assert.doesNotMatch(src.slice(src.indexOf("function bankDisplayName"), src.indexOf("function bankBillDisplayName")), /\\bmobile\\b/);
  assert.doesNotMatch(src, /BANK_DISPLAY_ALIASES/);
  assert.doesNotMatch(fixtureSrc, /Duquesne|Columbia Gas|T-Mobile|M&T|nfcu/i);
  assert.doesNotMatch(fixtureSrc, /t-?\s?mobile/i);
  assert.doesNotMatch(src, /Elective|Other spending/);
});

test("a mobile name displays as Phone and matching stays on the raw name", async function () {
  const ctx = boot();
  assert.equal(ctx.bankBillDisplayName("Acme Mobile"), "Phone");
  assert.equal(ctx.bankBillDisplayName("acme mobile"), "Phone");
  assert.equal(ctx.bankBillDisplayName("ACME MOBILE"), "Phone");
  assert.equal(ctx.bankBillDisplayName("  Acme Mobile  "), "Phone");
  assert.equal(ctx.bankBillDisplayName("Mobile"), "Phone");
  assert.equal(ctx.bankBillDisplayName("mobile"), "Phone");
  assert.equal(ctx.bankBillDisplayName("X Mobile plan"), "Phone");
  assert.equal(ctx.bankBillDisplayName("x mobile plan"), "Phone");
  assert.equal(ctx.bankBillDisplayName("Phone"), "Phone");
  assert.equal(ctx.bankBillDisplayName("Gasoline"), "Gasoline");
  assert.equal(ctx.bankBillDisplayName("gasoline"), "gasoline");
  assert.equal(ctx.bankBillDisplayName("City Fuel"), "City Fuel");
  assert.equal(ctx.bankBillDisplayName("automobile"), "automobile");
  assert.equal(ctx.bankBillDisplayName("Mobileplan"), "Mobileplan");
  assert.equal(ctx.bankBillDisplayName("Exxon Mobil"), "Exxon Mobil");
  assert.equal(ctx.bankBillDisplayName("Mobile plan"), "Phone");
  assert.equal(ctx.bankBillDisplayName("mobile plan"), "Phone");
  assert.equal(ctx.bankBillDisplayName("Mobile Deposit"), "Mobile Deposit");
  assert.equal(ctx.bankBillDisplayName("Mobile Deposits"), "Mobile Deposits");
  assert.equal(ctx.bankBillDisplayName("mobile deposits"), "mobile deposits");
  assert.equal(ctx.bankBillDisplayName("MOBILE DEPOSITS"), "MOBILE DEPOSITS");
  assert.equal(ctx.bankBillDisplayName("Mobile Home Park"), "Mobile Home Park");
  assert.equal(ctx.bankBillDisplayName("mobile home park"), "mobile home park");
  assert.equal(ctx.bankBillDisplayName("  Mobile Home Park  "), "Mobile Home Park");
  assert.equal(ctx.bankBillDisplayName("Mobile Home"), "Mobile Home");
  assert.equal(ctx.bankBillDisplayName("Acme Mobile Home"), "Acme Mobile Home");
  assert.equal(ctx.bankBillDisplayName("Mobile Banking"), "Mobile Banking");
  assert.equal(ctx.bankBillDisplayName("mobile banking"), "mobile banking");
  assert.equal(ctx.bankBillDisplayName("Mobile Transfer"), "Mobile Transfer");
  assert.equal(ctx.bankBillDisplayName("Home Mobile"), "Home Mobile");
  assert.equal(ctx.bankBillDisplayName("T Mobile"), "Phone");
  assert.equal(ctx.bankBillDisplayName("t mobile"), "Phone");
  assert.equal(ctx.bankBillDisplayName("Mobile AL Water"), "Mobile AL Water");
  assert.equal(ctx.bankBillDisplayName("mobile al water"), "mobile al water");
  assert.equal(ctx.bankBillDisplayName("MOBILE AL WATER"), "MOBILE AL WATER");
  assert.equal(ctx.bankBillDisplayName("  Mobile AL Water  "), "Mobile AL Water");
  assert.equal(ctx.bankBillDisplayName("Mobile Alabama Water"), "Mobile Alabama Water");
  assert.equal(ctx.bankBillDisplayName("Mobile Bay Electric"), "Mobile Bay Electric");
  assert.equal(ctx.bankBillDisplayName("mobile bay electric"), "mobile bay electric");
  assert.equal(ctx.bankBillDisplayName("Mobile Check"), "Mobile Check");
  assert.equal(ctx.bankBillDisplayName("mobile check"), "mobile check");
  assert.equal(ctx.bankBillDisplayName("Mobile Checking"), "Mobile Checking");
  assert.equal(ctx.bankBillDisplayName("Mobile Gas"), "Mobile Gas");
  assert.equal(ctx.bankBillDisplayName("Mobile Power"), "Mobile Power");
  assert.equal(ctx.bankBillDisplayName("Mobile Utility"), "Mobile Utility");
  assert.equal(ctx.bankBillDisplayName("Mobile Utilities"), "Mobile Utilities");
  assert.notEqual(ctx.bankBillDisplayName("Mobile AL Water"), "Water");
  assert.notEqual(ctx.bankBillDisplayName("Mobile AL Water"), "Phone");
  assert.notEqual(ctx.bankBillDisplayName("Mobile Bay Electric"), "Electric");
  assert.notEqual(ctx.bankBillDisplayName("Mobile Gas"), "Gas");
  assert.equal(ctx.bankBillKey("Mobile AL Water"), "mobile al water");
  assert.equal(ctx.bankBillKey("Mobile Bay Electric"), "mobile bay electric");
  assert.equal(ctx.bankBillKey("Mobile Check"), "mobile check");
  assert.equal(ctx.bankBillKey("T Mobile"), "t mobile");
  assert.equal(ctx.bankBillKey("Mobile Home Park"), "mobile home park");
  assert.equal(ctx.bankBillKey("Mobile Deposits"), "mobile deposits");
  assert.equal(ctx.bankBillKey("Mobile Banking"), "mobile banking");
  assert.equal(ctx.bankBillKey("Mobile"), "mobile");
  assert.equal(ctx.bankBillKey("Mobile plan"), "mobile plan");
  assert.equal(ctx.bankDisplayName("Acme Mobile"), "Acme Mobile");
  assert.equal(ctx.bankDisplayName("Mobile Home Park"), "Mobile Home Park");
  assert.equal(ctx.bankDisplayName("Mobile Deposits"), "Mobile Deposits");
  assert.equal(ctx.bankDisplayName("Mobile Banking"), "Mobile Banking");
  assert.equal(ctx.bankDisplayName("Mobile Deposit"), "Mobile Deposit");
  assert.equal(ctx.bankDisplayName("Exxon Mobil"), "Exxon Mobil");
  assert.equal(ctx.bankDisplayName("Gasoline"), "Gasoline");
  assert.equal(ctx.bankDisplayName("automobile"), "automobile");
  assert.equal(ctx.bankDisplayName("Mobileplan"), "Mobileplan");

  const fx = loadFixture();
  const snap = JSON.parse(JSON.stringify(fx));
  snap.budget.bills.push(
    { name: "Acme Mobile", amount: 15, typical_day: 12, cadence: "monthly" },
    { name: "X Mobile plan", amount: 4, typical_day: 8, cadence: "monthly" },
    { name: "Mobile Home Park", amount: 7, typical_day: 3, cadence: "monthly" }
  );
  snap.budget.mtd_actual_by_category["Acme Mobile"] = 15;
  snap.budget.mtd_actual_by_category["X Mobile plan"] = 4;
  snap.budget.mtd_actual_by_category["Mobile Home Park"] = 7;
  snap.budget.mtd_actual_by_category["Mobile Deposits"] = 2;
  snap.budget.mtd_actual_by_category["Mobile Banking"] = 3;
  snap.budget.income_monthly = [{ label: "Paycheck", amount: 12.34, cadence: "biweekly", typical_day: 1, source: "detected" }];
  snap.mustpay_overrides = Object.assign({}, snap.mustpay_overrides, { Phone: "elective" });
  assert.equal(ctx.bankResolveKind("Acme Mobile", snap), "must_pay");
  assert.equal(ctx.bankResolveKind("X Mobile plan", snap), "must_pay");
  assert.equal(ctx.bankResolveKind("Phone", snap), "elective");
  const byPhone = ctx.bankNormalizeBills(snap.budget, { phone: 9 });
  assert.equal(byPhone.filter(function (b) { return b.name === "Acme Mobile"; })[0].typical_day, 12);
  assert.equal(byPhone.filter(function (b) { return b.name === "X Mobile plan"; })[0].typical_day, 8);
  const byRaw = ctx.bankNormalizeBills(snap.budget, { "acme mobile": 9 });
  const rawBill = byRaw.filter(function (b) { return b.name === "Acme Mobile"; })[0];
  assert.equal(rawBill.name, "Acme Mobile");
  assert.equal(rawBill.typical_day, 9);
  assert.equal(byRaw.filter(function (b) { return b.name === "X Mobile plan"; })[0].typical_day, 8);
  const byPlan = ctx.bankNormalizeBills(snap.budget, { "x mobile plan": 3 });
  assert.equal(byPlan.filter(function (b) { return b.name === "X Mobile plan"; })[0].typical_day, 3);
  assert.equal(byPlan.filter(function (b) { return b.name === "Acme Mobile"; })[0].typical_day, 12);

  snap.mustpay_overrides["Acme Mobile"] = "elective";
  assert.equal(ctx.bankResolveKind("Acme Mobile", snap), "elective");
  assert.equal(ctx.bankResolveKind("X Mobile plan", snap), "must_pay");
  assert.equal(ctx.bankResolveKind("Phone", snap), "elective");
  delete snap.mustpay_overrides["Acme Mobile"];
  assert.equal(ctx.bankResolveKind("Acme Mobile", snap), "must_pay");

  snap.current.edits_tx = (snap.current.edits_tx || []).concat([{
    date: "2026-10-04",
    id: "acct-check",
    desc: "Handset",
    amount: 15,
    flow: "outflow",
    category: "Acme Mobile",
    tx_key: "phone-1"
  }]);
  snap.current.recent_tx = [
    { date: "2026-10-05", id: "acct-check", desc: "Acme Mobile", amount: 15, flow: "outflow", category: "Acme Mobile", tx_key: "tape-1" },
    { date: "2026-10-04", id: "acct-check", desc: "Handset", amount: 4, flow: "outflow", category: "X Mobile plan", tx_key: "tape-2" },
    { date: "2026-10-03", id: "acct-check", desc: "Gasoline", amount: 12.34, flow: "outflow", category: "Gasoline", tx_key: "tape-3" },
    { date: "2026-10-02", id: "acct-check", desc: "", amount: 1, flow: "outflow", category: "Mobile", tx_key: "tape-4" },
    { date: "2026-10-01", id: "acct-check", desc: "Mobile Deposit", amount: 20, flow: "inflow", category: "Mobile Deposit", tx_key: "tape-5" },
    { date: "2026-09-30", id: "acct-check", desc: "Lot rent", amount: 7, flow: "outflow", category: "Mobile Home Park", tx_key: "tape-6" },
    { date: "2026-09-29", id: "acct-check", desc: "Check photo", amount: 2, flow: "inflow", category: "Mobile Deposits", tx_key: "tape-7" },
    { date: "2026-09-28", id: "acct-check", desc: "App move", amount: 3, flow: "outflow", category: "Mobile Banking", tx_key: "tape-8" }
  ];
  const before = JSON.stringify(snap.budget.bills);
  const budget = ctx.bankPageHtml(snap, { tab: "budget" });
  assert.equal(JSON.stringify(snap.budget.bills), before);
  assert.equal(snap.budget.mtd_actual_by_category["Acme Mobile"], 15);
  assert.equal(snap.budget.mtd_actual_by_category["X Mobile plan"], 4);
  assert.match(budget, /data-bar="Acme Mobile"/);
  assert.match(budget, /data-bar="X Mobile plan"/);
  const barAt = budget.indexOf('data-bar="Acme Mobile"');
  const bar = budget.slice(barAt, budget.indexOf("</div></div>", barAt));
  assert.match(bar, /<span>Phone<\/span>/);
  assert.doesNotMatch(bar.replace(/data-bar="[^"]*"/, ""), /Acme Mobile/);
  const planAt = budget.indexOf('data-bar="X Mobile plan"');
  const planBar = budget.slice(planAt, budget.indexOf("</div></div>", planAt));
  assert.match(planBar, /<span>Phone<\/span>/);
  assert.doesNotMatch(planBar.replace(/data-bar="[^"]*"/, ""), /X Mobile plan/);
  assert.match(pieBlock(budget, "bills"), /Phone<\/span><b>\$15\.00<\/b>/);
  assert.match(pieBlock(budget, "bills"), /Phone<\/span><b>\$4\.00<\/b>/);
  assert.doesNotMatch(pieBlock(budget, "bills"), /Acme Mobile|X Mobile plan/);
  assert.match(budget, /<b>12<\/b><span>Phone<\/span>/);
  assert.match(budget, /<b>8<\/b><span>Phone<\/span>/);
  assert.match(budget, /<span>Phone<\/span><b>\$15\.00<\/b><i>day 12<\/i>/);
  assert.match(budget, /<span>Phone<\/span><b>\$4\.00<\/b><i>day 8<\/i>/);
  assert.match(budget, /<b>3<\/b><span>Mobile Home Park<\/span>/);
  assert.match(budget, /<span>Mobile Home Park<\/span><b>\$7\.00<\/b><i>day 3<\/i>/);
  const parkAt = budget.indexOf('data-bar="Mobile Home Park"');
  assert.ok(parkAt >= 0);
  const parkBar = budget.slice(parkAt, budget.indexOf("</div></div>", parkAt));
  assert.match(parkBar, /<span>Mobile Home Park<\/span>/);
  assert.doesNotMatch(parkBar, />Phone</);
  assert.match(budget, /data-bar="Mobile Deposits"/);
  assert.match(budget, /data-bar="Mobile Banking"/);
  const depositsAt = budget.indexOf('data-bar="Mobile Deposits"');
  const depositsBar = budget.slice(depositsAt, budget.indexOf("</div></div>", depositsAt));
  assert.match(depositsBar, /<span>Mobile Deposits<\/span>/);
  assert.doesNotMatch(depositsBar, />Phone</);
  const bankingAt = budget.indexOf('data-bar="Mobile Banking"');
  const bankingBar = budget.slice(bankingAt, budget.indexOf("</div></div>", bankingAt));
  assert.match(bankingBar, /<span>Mobile Banking<\/span>/);
  assert.doesNotMatch(bankingBar, />Phone</);
  assert.match(pieBlock(budget, "bills"), /Mobile Home Park<\/span><b>\$7\.00<\/b>/);
  assert.match(pieBlock(budget, "optional"), /Mobile Deposits<\/span><b>\$2\.00<\/b>/);
  assert.match(pieBlock(budget, "optional"), /Mobile Banking<\/span><b>\$3\.00<\/b>/);
  assert.doesNotMatch(pieBlock(budget, "optional"), /Mobile Deposits[\s\S]{0,40}Phone|Mobile Banking[\s\S]{0,40}Phone/);
  const covers = budget.match(/<ul class="bank-covers">[\s\S]*?<\/ul>/);
  assert.ok(covers);
  assert.match(covers[0], /Phone/);
  assert.doesNotMatch(covers[0], /Acme Mobile|X Mobile plan/);
  assert.doesNotMatch(budget.replace(/data-bar="[^"]*"/g, ""), /Acme Mobile|X Mobile plan/);

  const hidden = JSON.parse(JSON.stringify(snap));
  hidden.budget.mtd_actual_by_category["Acme Mobile"] = 0;
  const hiddenHtml = ctx.bankPageHtml(hidden, { tab: "budget" });
  assert.doesNotMatch(hiddenHtml, /data-bar="Acme Mobile"/);
  assert.match(hiddenHtml, /data-bar="X Mobile plan"/);
  assert.doesNotMatch(pieBlock(hiddenHtml, "bills"), /Phone<\/span><b>\$15\.00<\/b>/);
  assert.match(pieBlock(hiddenHtml, "bills"), /Phone<\/span><b>\$4\.00<\/b>/);
  assert.match(hiddenHtml, /<span>Phone<\/span><b>\$15\.00<\/b><i>day 12<\/i>/);

  const current = ctx.bankPageHtml(snap, { tab: "current" });
  const tape = current.match(/<table class="bank-tape">[\s\S]*?<\/table>/);
  assert.ok(tape);
  assert.match(tape[0], /class="bank-merchant">Acme Mobile<\/span><span class="bank-chip">Acme Mobile<\/span>/);
  assert.match(tape[0], /class="bank-merchant">Handset<\/span><span class="bank-chip">X Mobile plan<\/span>/);
  assert.match(tape[0], /class="bank-merchant">Gasoline<\/span><span class="bank-chip">Gasoline<\/span>/);
  assert.match(tape[0], /class="bank-merchant">No description<\/span><span class="bank-chip">Mobile<\/span>/);
  assert.match(tape[0], /class="bank-merchant">Mobile Deposit<\/span><span class="bank-chip">Mobile Deposit<\/span>/);
  assert.match(tape[0], /class="bank-merchant">Lot rent<\/span><span class="bank-chip">Mobile Home Park<\/span>/);
  assert.match(tape[0], /class="bank-merchant">Check photo<\/span><span class="bank-chip">Mobile Deposits<\/span>/);
  assert.match(tape[0], /class="bank-merchant">App move<\/span><span class="bank-chip">Mobile Banking<\/span>/);
  assert.doesNotMatch(tape[0], />Phone</);

  const edits = ctx.bankPageHtml(snap, { tab: "edits", editCat: "Acme Mobile" });
  assert.match(edits, /<option value="Acme Mobile" selected>Phone<\/option>/);
  assert.match(edits, /<option value="X Mobile plan">Phone<\/option>/);
  assert.match(edits, /<option value="Mobile">Phone<\/option>/);
  assert.match(edits, /<option value="Mobile Home Park">Mobile Home Park<\/option>/);
  assert.match(edits, /<option value="Mobile Deposits">Mobile Deposits<\/option>/);
  assert.match(edits, /<option value="Mobile Banking">Mobile Banking<\/option>/);
  assert.match(edits, /<option value="Mobile Deposit">Mobile Deposit<\/option>/);
  const kindAt = edits.indexOf('data-bank-kind="Acme Mobile"');
  assert.ok(kindAt >= 0);
  const kindRow = edits.slice(edits.lastIndexOf("<li>", kindAt), edits.indexOf("</li>", kindAt));
  assert.match(kindRow, /class="bank-kind-name">Phone</);
  assert.match(kindRow, /aria-label="Bill or Optional for Phone"/);
  assert.match(kindRow, /value="must_pay" selected/);
  assert.equal((kindRow.match(/Acme Mobile/g) || []).length, 1);
  const planKindAt = edits.indexOf('data-bank-kind="X Mobile plan"');
  assert.ok(planKindAt >= 0);
  const planKind = edits.slice(edits.lastIndexOf("<li>", planKindAt), edits.indexOf("</li>", planKindAt));
  assert.match(planKind, /class="bank-kind-name">Phone</);
  assert.match(planKind, /value="must_pay" selected/);
  const parkKindAt = edits.indexOf('data-bank-kind="Mobile Home Park"');
  assert.ok(parkKindAt >= 0);
  const parkKind = edits.slice(edits.lastIndexOf("<li>", parkKindAt), edits.indexOf("</li>", parkKindAt));
  assert.match(parkKind, /class="bank-kind-name">Mobile Home Park</);
  assert.match(parkKind, /aria-label="Bill or Optional for Mobile Home Park"/);
  assert.doesNotMatch(parkKind, />Phone</);
  assert.equal((parkKind.match(/Mobile Home Park/g) || []).length, 3);
  const depositsKindAt = edits.indexOf('data-bank-kind="Mobile Deposits"');
  assert.ok(depositsKindAt >= 0);
  const depositsKind = edits.slice(edits.lastIndexOf("<li>", depositsKindAt), edits.indexOf("</li>", depositsKindAt));
  assert.match(depositsKind, /class="bank-kind-name">Mobile Deposits</);
  assert.doesNotMatch(depositsKind, />Phone</);
  const bankingKindAt = edits.indexOf('data-bank-kind="Mobile Banking"');
  assert.ok(bankingKindAt >= 0);
  const bankingKind = edits.slice(edits.lastIndexOf("<li>", bankingKindAt), edits.indexOf("</li>", bankingKindAt));
  assert.match(bankingKind, /class="bank-kind-name">Mobile Banking</);
  assert.doesNotMatch(bankingKind, />Phone</);
  const planBillAt = edits.indexOf('data-bank-kind="Mobile plan"');
  assert.ok(planBillAt >= 0);
  const planBill = edits.slice(edits.lastIndexOf("<li>", planBillAt), edits.indexOf("</li>", planBillAt));
  assert.match(planBill, /class="bank-kind-name">Phone</);
  assert.match(planBill, /data-bank-kind="Mobile plan"/);
  assert.equal((planBill.match(/Mobile plan/g) || []).length, 1);
  const dueAt = edits.indexOf('data-bank-due="acme mobile"');
  assert.ok(dueAt >= 0);
  const dueRow = edits.slice(edits.lastIndexOf("<li>", dueAt), edits.indexOf("</li>", dueAt));
  assert.match(dueRow, /class="bank-merchant">Phone</);
  assert.match(dueRow, /aria-label="Due day for Phone"/);
  assert.doesNotMatch(dueRow.replace(/data-bank-due="[^"]*"/, ""), /Acme Mobile/i);
  const parkDueAt = edits.indexOf('data-bank-due="mobile home park"');
  assert.ok(parkDueAt >= 0);
  const parkDue = edits.slice(edits.lastIndexOf("<li>", parkDueAt), edits.indexOf("</li>", parkDueAt));
  assert.match(parkDue, /class="bank-merchant">Mobile Home Park</);
  assert.match(parkDue, /aria-label="Due day for Mobile Home Park"/);
  assert.match(parkDue, /data-bank-due="mobile home park"/);
  const planDueAt = edits.indexOf('data-bank-due="mobile plan"');
  assert.ok(planDueAt >= 0);
  const planDue = edits.slice(edits.lastIndexOf("<li>", planDueAt), edits.indexOf("</li>", planDueAt));
  assert.match(planDue, /class="bank-merchant">Phone</);
  assert.match(planDue, /aria-label="Due day for Phone"/);
  assert.match(planDue, /data-bank-due="mobile plan"/);
  assert.equal(ctx.bankResolveKind("Mobile Home Park", snap), "must_pay");
  assert.equal(ctx.bankResolveKind("Mobile Deposits", snap), "elective");
  assert.equal(ctx.bankResolveKind("Mobile Banking", snap), "elective");
  assert.equal(ctx.bankResolveKind("Mobile plan", snap), "must_pay");
  const visible = edits
    .replace(/value="[^"]*"/g, "")
    .replace(/data-bank-kind="[^"]*"/g, "")
    .replace(/data-bank-due="[^"]*"/g, "")
    .replace(/data-bank-tx="[^"]*"/g, "")
    .replace(/data-bank-cat="[^"]*"/g, "");
  assert.doesNotMatch(visible, /Acme Mobile|X Mobile plan/i);
  assert.match(visible, /Mobile Home Park/);
  assert.match(visible, /Mobile Deposits/);
  assert.match(visible, /Mobile Banking/);

  const calls = [];
  ctx.fetch = function (url, init) {
    const method = init && init.method ? String(init.method).toUpperCase() : "GET";
    const cached = categoryRead(url, init, snap.custom_categories);
    if (cached) return cached;
    calls.push({ url: String(url), init: init });
    const body = JSON.parse(init.body);
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
        json: function () {
        return Promise.resolve({
          schema: "banking-mustpay-overrides/v1",
          overrides: { "Acme Mobile": body.kind, Phone: "elective" }
        });
      }
    });
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(snap)), { tab: "edits", editCat: "Acme Mobile" });
  await el._bank.prune;
  assert.match(el.innerHTML, /data-bank-kind="Acme Mobile"/);
  assert.match(el.innerHTML, /value="Acme Mobile" selected>Phone</);
  await el.listeners.change({
    target: {
      value: "elective",
      getAttribute: function (name) { return name === "data-bank-kind" ? "Acme Mobile" : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/data/banking/mustpay-overrides.json");
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), { name: "Acme Mobile", kind: "elective" });
  assert.equal(ctx.bankResolveKind("Acme Mobile", el._bank.data), "elective");
  assert.equal(ctx.bankResolveKind("X Mobile plan", el._bank.data), "must_pay");
  assert.equal(ctx.bankResolveKind("Phone", el._bank.data), "elective");
  assert.equal(el._bank.data.mustpay_overrides["Acme Mobile"], "elective");
  assert.equal(el._bank.data.mustpay_overrides.Phone, "elective");
  assert.equal(el._bank.data.mustpay_overrides["X Mobile plan"], undefined);
  assert.equal(el._bank.data.budget.mtd_actual_by_category["Acme Mobile"], 15);
  assert.equal(el._bank.data.budget.mtd_actual_by_category["X Mobile plan"], 4);
  assert.equal(el._bank.data.budget.mtd_actual_by_category.Phone, undefined);
});

test("city and utility mobile names stay raw while a phone bill still displays as Phone", function () {
  const ctx = boot();
  const fx = loadFixture();
  const snap = JSON.parse(JSON.stringify(fx));
  snap.budget.bills_monthly = [];
  snap.budget.calendar = [];
  snap.budget.bills = [
    { name: "Phone", amount: 1, typical_day: 2, cadence: "monthly" },
    { name: "T Mobile", amount: 3, typical_day: 24, cadence: "monthly" },
    { name: "Mobile plan", amount: 4, typical_day: 8, cadence: "monthly" },
    { name: "Acme Mobile", amount: 15, typical_day: 12, cadence: "monthly" },
    { name: "Mobile AL Water", amount: 6, typical_day: 21, cadence: "monthly" },
    { name: "Mobile Bay Electric", amount: 5, typical_day: 22, cadence: "monthly" },
    { name: "Mobile Check", amount: 4.5, typical_day: 23, cadence: "monthly" }
  ];
  snap.budget.mtd_actual_by_category = {
    Phone: 1,
    "T Mobile": 3,
    "Mobile plan": 4,
    "Acme Mobile": 15,
    "Mobile AL Water": 6,
    "Mobile Bay Electric": 5,
    "Mobile Check": 4.5
  };
  snap.mustpay_overrides = { Phone: "elective" };
  snap.current.recent_tx = [
    { date: "2026-10-05", id: "acct-check", desc: "Mobile AL Water", amount: 6, flow: "outflow", category: "Mobile AL Water", tx_key: "city-1" },
    { date: "2026-10-04", id: "acct-check", desc: "Handset", amount: 3, flow: "outflow", category: "T Mobile", tx_key: "city-2" }
  ];
  snap.current.edits_tx = snap.current.recent_tx.slice();
  assert.equal(ctx.bankResolveKind("Phone", snap), "elective");
  assert.equal(ctx.bankResolveKind("T Mobile", snap), "must_pay");
  assert.equal(ctx.bankResolveKind("Mobile AL Water", snap), "must_pay");
  assert.equal(ctx.bankResolveKind("Mobile Check", snap), "must_pay");
  const budget = ctx.bankPageHtml(snap, { tab: "budget" });
  const listAt = budget.indexOf('class="bank-bill-list"');
  const list = budget.slice(listAt, budget.indexOf("</ul>", listAt));
  assert.match(list, />Phone</);
  assert.match(list, />Mobile AL Water</);
  assert.match(list, />Mobile Bay Electric</);
  assert.match(list, />Mobile Check</);
  assert.doesNotMatch(list, />Water<|>Electric</);
  assert.match(budget, /<b>21<\/b><span>Mobile AL Water<\/span>/);
  assert.match(budget, /<b>22<\/b><span>Mobile Bay Electric<\/span>/);
  assert.match(budget, /<b>23<\/b><span>Mobile Check<\/span>/);
  assert.match(budget, /<b>24<\/b><span>Phone<\/span>/);
  const waterAt = budget.indexOf('data-bar="Mobile AL Water"');
  const waterBar = budget.slice(waterAt, budget.indexOf("</div></div>", waterAt));
  assert.match(waterBar, /<span>Mobile AL Water<\/span>/);
  assert.doesNotMatch(waterBar, />Phone</);
  const current = ctx.bankPageHtml(snap, { tab: "current" });
  const tape = current.match(/<table class="bank-tape">[\s\S]*?<\/table>/);
  assert.ok(tape);
  assert.match(tape[0], /class="bank-merchant">Mobile AL Water<\/span><span class="bank-chip">Mobile AL Water<\/span>/);
  assert.match(tape[0], /class="bank-merchant">Handset<\/span><span class="bank-chip">T Mobile<\/span>/);
  assert.doesNotMatch(tape[0], />Phone</);
  const edits = ctx.bankPageHtml(snap, { tab: "edits", editCat: "Mobile AL Water" });
  assert.match(edits, /<option value="Mobile AL Water"(?: selected)?>Mobile AL Water<\/option>/);
  assert.match(edits, /<option value="T Mobile">Phone<\/option>/);
  assert.match(edits, /data-bank-due="mobile al water"/);
  assert.match(edits, /data-bank-due="mobile bay electric"/);
  assert.match(edits, /data-bank-due="mobile check"/);
  assert.match(edits, /data-bank-due="t mobile"/);
  assert.match(edits, /data-bank-due="phone"/);
  assert.match(edits, /data-bank-kind="Phone"/);
  assert.match(edits, /data-bank-kind="T Mobile"/);
  assert.match(edits, /data-bank-kind="Mobile AL Water"/);
  const cityKindAt = edits.indexOf('data-bank-kind="Mobile AL Water"');
  const cityKind = edits.slice(edits.lastIndexOf("<li>", cityKindAt), edits.indexOf("</li>", cityKindAt));
  assert.match(cityKind, /class="bank-kind-name">Mobile AL Water</);
  assert.doesNotMatch(cityKind, />Phone</);
  const phoneKindAt = edits.indexOf('data-bank-kind="Phone"');
  const phoneKind = edits.slice(edits.lastIndexOf("<li>", phoneKindAt), edits.indexOf("</li>", phoneKindAt));
  assert.match(phoneKind, /class="bank-kind-name">Phone</);
  assert.match(phoneKind, /value="elective" selected/);
  const dig = ctx.bankPageHtml(snap, { tab: "edits", editCat: "T Mobile" });
  const txAt = dig.indexOf('data-bank-tx="city-2"');
  assert.ok(txAt >= 0);
  const txRow = dig.slice(dig.lastIndexOf("<li>", txAt), dig.indexOf("</li>", txAt));
  assert.match(txRow, /class="bank-merchant">Handset</);
  assert.doesNotMatch(txRow.slice(0, txRow.indexOf("bank-edit-side")), />Phone</);
});

test("car policy displays as Car Insurance, bare Insurance and exclusions stay off bill surfaces, and fostering stipend is editable income", async function () {
  const ctx = boot();
  assert.equal(ctx.bankBillDisplayName("Car insurance"), "Car Insurance");
  assert.equal(ctx.bankBillDisplayName("car insurance"), "Car Insurance");
  assert.equal(ctx.bankBillDisplayName("Acme Car Insurance"), "Car Insurance");
  assert.equal(ctx.bankBillDisplayName("Acme Auto Insurance"), "Car Insurance");
  assert.equal(ctx.bankBillDisplayName("Acme Vehicle Insurance"), "Car Insurance");
  assert.equal(ctx.bankBillDisplayName("Acme Insurance"), "Car Insurance");
  assert.equal(ctx.bankBillDisplayName("Insurance"), "Insurance");
  assert.equal(ctx.bankBillDisplayName("insurance"), "insurance");
  assert.equal(ctx.bankBillDisplayName("Health insurance"), "Health Insurance");
  assert.equal(ctx.bankBillDisplayName("Acme Health Insurance"), "Health Insurance");
  assert.equal(ctx.bankBillDisplayName("Home insurance"), "Home Insurance");
  assert.equal(ctx.bankBillDisplayName("home insurance"), "Home Insurance");
  assert.equal(ctx.bankBillDisplayName("Acme Home Insurance"), "Home Insurance");
  assert.equal(ctx.bankBillDisplayName("Life insurance"), "Life Insurance");
  assert.equal(ctx.bankBillDisplayName("Acme Life Insurance"), "Life Insurance");
  assert.equal(ctx.bankBillDisplayName("Renters insurance"), "Renters Insurance");
  assert.equal(ctx.bankBillDisplayName("renters insurance"), "Renters Insurance");
  assert.equal(ctx.bankBillDisplayName("Acme Renters Insurance"), "Renters Insurance");
  assert.equal(ctx.bankBillDisplayName("Renter insurance"), "Renters Insurance");
  assert.equal(ctx.bankBillDisplayName("Pet insurance"), "Pet Insurance");
  assert.equal(ctx.bankBillDisplayName("Acme Pet Insurance"), "Pet Insurance");
  assert.notEqual(ctx.bankBillDisplayName("Home insurance"), "Car Insurance");
  assert.notEqual(ctx.bankBillDisplayName("Home insurance"), "insurance");
  assert.notEqual(ctx.bankBillDisplayName("Renters insurance"), "Car Insurance");
  assert.equal(ctx.bankBillKey("Acme Home Insurance"), "acme home insurance");
  assert.equal(ctx.bankBillKey("Car insurance"), "car insurance");
  assert.equal(ctx.bankBillKey("Health insurance"), "health insurance");
  assert.equal(ctx.bankDisplayName("Acme Mobile"), "Acme Mobile");

  const typedFx = loadFixture();
  const typed = JSON.parse(JSON.stringify(typedFx));
  typed.budget.bills_monthly = [];
  typed.budget.calendar = [];
  typed.budget.bills = [
    { name: "Acme Home Insurance", amount: 11, typical_day: 16, cadence: "monthly" },
    { name: "Acme Life Insurance", amount: 12, typical_day: 17, cadence: "monthly" },
    { name: "Acme Renters Insurance", amount: 13, typical_day: 18, cadence: "monthly" },
    { name: "Acme Pet Insurance", amount: 14, typical_day: 19, cadence: "monthly" },
    { name: "Insurance", amount: 3, typical_day: 9, cadence: "monthly" },
    { name: "Health insurance", amount: 4, typical_day: 6, cadence: "monthly" }
  ];
  typed.budget.exclusions = [{ label: "Health insurance", reason: "paycheck_deduction" }];
  typed.budget.mtd_actual_by_category = {};
  typed.budget.income_monthly = [{ label: "Paycheck", amount: 10, cadence: "monthly", typical_day: 1, source: "detected" }];
  const typedHtml = ctx.bankPageHtml(typed, { tab: "budget" });
  const typedAt = typedHtml.indexOf('class="bank-bill-list"');
  assert.ok(typedAt >= 0);
  const typedList = typedHtml.slice(typedAt, typedHtml.indexOf("</ul>", typedAt));
  assert.match(typedList, />Home Insurance</);
  assert.match(typedList, />Life Insurance</);
  assert.match(typedList, />Renters Insurance</);
  assert.match(typedList, />Pet Insurance</);
  assert.doesNotMatch(typedList, />insurance</);
  assert.doesNotMatch(typedList, />Insurance</);
  assert.doesNotMatch(typedList, /Health Insurance|Health insurance/);
  assert.match(typedHtml, /<b>16<\/b><span>Home Insurance<\/span>/);
  assert.match(typedHtml, /<b>19<\/b><span>Pet Insurance<\/span>/);
  assert.doesNotMatch(typedHtml, /<b>9<\/b><span>Insurance<\/span>/);
  assert.doesNotMatch(typedHtml, /<b>6<\/b><span>Health Insurance/);
  const typedEdits = ctx.bankPageHtml(typed, { tab: "edits" });
  assert.match(typedEdits, /data-bank-due="acme home insurance"/);
  assert.match(typedEdits, /data-bank-due="acme life insurance"/);
  assert.match(typedEdits, /data-bank-due="acme renters insurance"/);
  assert.match(typedEdits, /data-bank-due="acme pet insurance"/);
  assert.doesNotMatch(typedEdits, /data-bank-due="insurance"/);
  assert.doesNotMatch(typedEdits, /data-bank-due="health insurance"/);
  const homeDueAt = typedEdits.indexOf('data-bank-due="acme home insurance"');
  const homeDue = typedEdits.slice(typedEdits.lastIndexOf("<li>", homeDueAt), typedEdits.indexOf("</li>", homeDueAt));
  assert.match(homeDue, /class="bank-merchant">Home Insurance</);
  assert.match(homeDue, /aria-label="Due day for Home Insurance"/);
  assert.match(homeDue, /data-bank-due="acme home insurance"/);
  assert.doesNotMatch(homeDue.replace(/data-bank-due="[^"]*"/, ""), /Acme Home Insurance/);
  assert.match(typedEdits, /data-bank-kind="Acme Home Insurance"/);
  assert.match(typedEdits, /aria-label="Bill or Optional for Home Insurance"/);
  assert.doesNotMatch(typedEdits, /data-bank-kind="Health insurance"/);

  const kept = ctx.bankNormalizeBills({
    bills: [{ name: "Insurance", amount: 1, typical_day: 9 }],
    bills_monthly: []
  });
  assert.equal(kept.length, 1);
  assert.equal(kept[0].name, "Insurance");
  assert.equal(ctx.bankSurfaceBills(kept, {}).length, 0);
  const healthOnly = ctx.bankNormalizeBills({
    bills: [{ name: "Health insurance", amount: 1, typical_day: 3 }]
  });
  assert.equal(healthOnly.length, 1);
  assert.equal(ctx.bankSurfaceBills(healthOnly, {}).length, 0);

  const fx = loadFixture();
  const snap = JSON.parse(JSON.stringify(fx));
  snap.budget.bills_monthly = [];
  snap.budget.bills = [
    { name: "Car insurance", amount: 20, typical_day: 11, cadence: "monthly" },
    { name: "Acme Insurance", amount: 8, typical_day: null, cadence: "monthly", prev_key: "prior policy" },
    { name: "Insurance", amount: 3, typical_day: 9, cadence: "monthly" },
    { name: "Health insurance", amount: 4, typical_day: 6, cadence: "monthly" },
    { name: "Clinic Plan", amount: 5, typical_day: 7, cadence: "monthly" },
    { name: "Fostering Per Diem Stipend", amount: 1, typical_day: 4, cadence: "monthly" }
  ];
  snap.budget.exclusions = [
    { label: "Health insurance", reason: "paycheck_deduction" },
    { label: "CLINIC PLAN", reason: "paycheck_deduction" }
  ];
  snap.budget.income_monthly = [
    { label: "Paycheck", amount: 12.34, cadence: "biweekly", typical_day: 1, source: "detected" },
    { label: "Fostering Per Diem Stipend", editable: true, amount: null, typical_day: null }
  ];
  snap.budget.calendar = [
    { day: 2, items: ["Sample item"] },
    { day: 6, items: ["Health insurance"] },
    { day: 7, items: [{ name: "Clinic Plan" }] }
  ];
  snap.budget.planned_by_category = { Insurance: 10, Groceries: 4 };
  snap.budget.mtd_actual_by_category = { Insurance: 6, Groceries: 3, "Health insurance": 20 };
  snap.custom_categories = (snap.custom_categories || []).concat(["Insurance"]);
  snap.mustpay_overrides = { "prior policy": "elective", "Health insurance": "must_pay" };
  snap.dueday_overrides = { "prior policy": 14 };
  snap.current.recent_tx = [{
    date: "2026-10-05", id: "acct-check", desc: "Acme Insurance", amount: 8,
    flow: "outflow", category: "Insurance", tx_key: "ins-1"
  }];
  snap.current.edits_tx = snap.current.recent_tx.slice();

  const rawWins = ctx.bankNormalizeBills(snap.budget, { "acme insurance": 4, "prior policy": 14 });
  const acmeRaw = rawWins.filter(function (b) { return b.name === "Acme Insurance"; })[0];
  assert.equal(acmeRaw.name, "Acme Insurance");
  assert.equal(acmeRaw.typical_day, 4);
  const viaAlias = ctx.bankNormalizeBills(snap.budget, { "prior policy": 14 });
  assert.equal(viaAlias.filter(function (b) { return b.name === "Acme Insurance"; })[0].typical_day, 14);
  assert.equal(viaAlias.filter(function (b) { return b.name === "Car insurance"; })[0].typical_day, 11);
  assert.equal(ctx.bankResolveKind("Acme Insurance", snap), "elective");
  assert.equal(ctx.bankResolveKind("Car insurance", snap), "must_pay");
  assert.equal(ctx.bankResolveKind("Health insurance", snap), "elective");
  assert.equal(ctx.bankResolveKind("Clinic Plan", snap), "elective");
  assert.equal(ctx.bankResolveKind("Fostering Per Diem Stipend", snap), "elective");
  assert.equal(ctx.bankResolveKind("Insurance", snap), "must_pay");
  snap.mustpay_overrides["Acme Insurance"] = "must_pay";
  assert.equal(ctx.bankResolveKind("Acme Insurance", snap), "must_pay");
  delete snap.mustpay_overrides["Acme Insurance"];
  assert.equal(ctx.bankResolveKind("Acme Insurance", snap), "elective");

  const before = JSON.stringify(snap.budget.bills);
  const budget = ctx.bankPageHtml(snap, { tab: "budget" });
  assert.equal(JSON.stringify(snap.budget.bills), before);
  const listAt = budget.indexOf('class="bank-bill-list"');
  assert.ok(listAt >= 0);
  const list = budget.slice(listAt, budget.indexOf("</ul>", listAt));
  assert.match(list, />Car Insurance</);
  assert.match(list, /\$20\.00/);
  assert.match(list, /\$8\.00/);
  assert.doesNotMatch(list, />Insurance</);
  assert.doesNotMatch(list, /Health Insurance|Health insurance|Clinic Plan|Fostering Per Diem Stipend/);
  const incomeAt = budget.indexOf('class="bank-income"');
  assert.ok(incomeAt >= 0);
  const income = budget.slice(incomeAt, budget.indexOf('class="bank-bill-list"'));
  assert.match(income, />Paycheck</);
  assert.match(income, /\$12\.34/);
  assert.match(income, />Fostering Per Diem Stipend</);
  assert.match(income, /amount pending/);
  assert.doesNotMatch(income, /\$0/);
  assert.match(budget, /<b>11<\/b><span>Car Insurance<\/span>/);
  assert.match(budget, /<b>14<\/b><span>Car Insurance<\/span>/);
  assert.match(budget, /<b>1<\/b><em class="pay">Paycheck<\/em>/);
  assert.match(budget, /<b>2<\/b><span>Sample item<\/span>/);
  assert.doesNotMatch(budget, /<b>9<\/b><span>Insurance<\/span>/);
  assert.doesNotMatch(budget, /<b>6<\/b><span>Health Insurance/);
  assert.doesNotMatch(budget, /<b>7<\/b><span>Clinic Plan/);
  assert.doesNotMatch(budget, /<b>4<\/b><span>/);
  assert.doesNotMatch(budget, /Health Insurance|Health insurance|Clinic Plan/);
  const covers = budget.match(/<ul class="bank-covers">[\s\S]*?<\/ul>/);
  assert.ok(covers);
  assert.match(covers[0], /Car Insurance/);
  assert.doesNotMatch(covers[0].replace(/Car Insurance/g, ""), /\bInsurance\b|Health Insurance|Clinic Plan|Fostering/);
  assert.match(pieBlock(budget, "bills"), /Insurance<\/span><b>\$6\.00<\/b>/);
  assert.doesNotMatch(pieBlock(budget, "bills"), /Health Insurance|Health insurance/);
  assert.doesNotMatch(pieBlock(budget, "optional"), /Health Insurance|Health insurance/);
  assert.match(pieBlock(budget, "optional"), /Groceries<\/span><b>\$3\.00<\/b>/);

  const current = ctx.bankPageHtml(snap, { tab: "current" });
  const tape = current.match(/<table class="bank-tape">[\s\S]*?<\/table>/);
  assert.ok(tape);
  assert.match(tape[0], /class="bank-merchant">Acme Insurance<\/span><span class="bank-chip">Insurance<\/span>/);
  assert.doesNotMatch(tape[0], /Car Insurance/i);

  const edits = ctx.bankPageHtml(snap, { tab: "edits", editCat: "Insurance" });
  assert.match(edits, /<option value="Insurance"(?: selected)?>Insurance<\/option>/);
  assert.doesNotMatch(edits, /data-bank-due="insurance"/);
  assert.doesNotMatch(edits, /data-bank-due="health insurance"/);
  assert.doesNotMatch(edits, /data-bank-due="clinic plan"/);
  assert.doesNotMatch(edits, /data-bank-due="fostering per diem stipend"/);
  assert.match(edits, /data-bank-due="car insurance"/);
  assert.match(edits, /data-bank-due="acme insurance"/);
  const dueAt = edits.indexOf('data-bank-due="acme insurance"');
  const dueRow = edits.slice(edits.lastIndexOf("<li>", dueAt), edits.indexOf("</li>", dueAt));
  assert.match(dueRow, /class="bank-merchant">Car Insurance</);
  assert.match(dueRow, /aria-label="Due day for Car Insurance"/);
  assert.doesNotMatch(dueRow.replace(/data-bank-due="[^"]*"/, ""), /Acme Insurance/i);
  assert.match(edits, /data-bank-kind="Insurance"/);
  assert.match(edits, /data-bank-kind="Acme Insurance"[\s\S]*?value="elective" selected/);
  assert.match(edits, /aria-label="Bill or Optional for Car Insurance"/);
  assert.doesNotMatch(edits, /data-bank-kind="Health insurance"/);
  assert.doesNotMatch(edits, /data-bank-kind="Clinic Plan"/);
  assert.doesNotMatch(edits, /data-bank-kind="prior policy"/);
  assert.doesNotMatch(edits, /data-bank-kind="Fostering Per Diem Stipend"/);
  assert.match(edits, /data-bank-income="Fostering Per Diem Stipend"/);
  assert.match(edits, /aria-label="Amount for Fostering Per Diem Stipend"/);
  assert.match(edits, /aria-label="Day for Fostering Per Diem Stipend"/);
  assert.match(edits, /data-bank-income-field="amount"[^>]*value=""/);
  assert.doesNotMatch(edits, /data-bank-income="Paycheck"/);
  assert.match(edits, /class="bank-merchant">Paycheck</);
  const stipendAt = edits.indexOf("Fostering Per Diem Stipend");
  const stipendRow = edits.slice(edits.lastIndexOf("<li>", stipendAt), edits.indexOf("</li>", stipendAt));
  assert.doesNotMatch(stipendRow, /\$0/);

  const entered = ctx.bankPageHtml(snap, {
    tab: "budget",
    edits: { bills: {}, income: { "Fostering Per Diem Stipend": { amount: 40, typical_day: 15 } } }
  });
  const enteredIncome = entered.slice(entered.indexOf('class="bank-income"'), entered.indexOf('class="bank-bill-list"'));
  assert.match(enteredIncome, />Fostering Per Diem Stipend<\/span><b>\$40\.00<\/b><i>day 15<\/i>/);
  assert.match(entered, /<b>15<\/b><em class="pay">Fostering Per Diem Stipend<\/em>/);
  assert.doesNotMatch(enteredIncome, /amount pending/);

  const el = mount(ctx, JSON.parse(JSON.stringify(snap)), { tab: "edits", editCat: "Insurance" });
  await el._bank.prune;
  function fire(field, value) {
    return el.listeners.change({
      target: {
        value: value,
        getAttribute: function (name) {
          if (name === "data-bank-income") return "Fostering Per Diem Stipend";
          if (name === "data-bank-income-field") return field;
          return null;
        },
        hasAttribute: function () { return false; }
      }
    });
  }
  fire("amount", "40");
  assert.match(el.innerHTML, /data-bank-income-field="amount"[^>]*value="40"/);
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].amount, 40);
  fire("day", "15");
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].typical_day, 15);
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].amount, 40);
  ctx.bankActivate(el, "budget");
  assert.match(el.innerHTML, />Fostering Per Diem Stipend<\/span><b>\$40\.00<\/b><i>day 15<\/i>/);
  assert.match(el.innerHTML, /<b>15<\/b><em class="pay">Fostering Per Diem Stipend<\/em>/);
  ctx.bankActivate(el, "edits");
  fire("amount", "");
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].amount, undefined);
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].typical_day, 15);
  ctx.bankActivate(el, "budget");
  const cleared = el.innerHTML.slice(el.innerHTML.indexOf('class="bank-income"'), el.innerHTML.indexOf('class="bank-bill-list"'));
  assert.match(cleared, /amount pending/);
  assert.doesNotMatch(cleared, /\$0|\$40/);
  fire("amount", "nope");
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].typical_day, 15);
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].amount, undefined);
  fire("amount", "-25");
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].amount, 0);
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].typical_day, 15);
  assert.match(el.innerHTML, />Fostering Per Diem Stipend<\/span><b>\$0\.00<\/b><i>day 15<\/i>/);
  assert.doesNotMatch(el.innerHTML, /-\$/);
  ctx.bankActivate(el, "edits");
  assert.match(el.innerHTML, /data-bank-income-field="amount"[^>]*value="0"/);
  fire("amount", " -0.01 ");
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].amount, 0);
  fire("amount", "100000000");
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].amount, 10000000);
  assert.match(el.innerHTML, /data-bank-income-field="amount"[^>]*value="10000000"/);
  fire("amount", "1e7");
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].amount, 10000000);
  fire("amount", "10000000.5");
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].amount, 10000000);
  fire("amount", "12.5");
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].amount, 12.5);
  fire("amount", "nope");
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].amount, 12.5);
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].typical_day, 15);
  fire("amount", "");
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].amount, undefined);
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].typical_day, 15);
  assert.match(el.innerHTML, /data-bank-income-field="amount"[^>]*value=""/);
  fire("amount", "0");
  assert.equal(el._bank.edits.income["Fostering Per Diem Stipend"].amount, 0);

  const src = fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  const page = fs.readFileSync(path.join(root, "house/banking/index.html"), "utf8");
  assert.doesNotMatch(src, /Duquesne|Columbia Gas|T-Mobile|M&T|nfcu/i);
  assert.doesNotMatch(css, /Duquesne|Columbia Gas|T-Mobile|M&T|nfcu/i);
  assert.doesNotMatch(page, /Duquesne|Columbia Gas|T-Mobile|M&T|nfcu/i);
  assert.match(src, /prev_key/);
  assert.match(src, /exclusions/);
  assert.match(page, /banking\.js\?v=20260904do/);
});
