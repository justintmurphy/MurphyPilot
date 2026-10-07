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
    localStorage: {
      getItem: function () { return null; },
      setItem: function () {},
      removeItem: function () {}
    },
    document: document,
    location: { hash: "", pathname: "/", search: "" },
    history: { replaceState: function () {} },
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
  if (String(url) === "/data/banking/tiers.json" && method === "GET") {
    return Promise.resolve({ ok: false, status: 404, type: "basic", json: function () { return Promise.resolve({}); } });
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
  assert.match(html, /class="bank-view-title"[^>]*>Current · October 2026</);
  assert.doesNotMatch(html, /class="bank-tabs"|role="tab"/);
  const debit = html.match(/<article class="bank-tile"[^>]*data-acct="Debit Account"[\s\S]*?<\/article>/);
  assert.ok(debit);
  assert.match(debit[0], /data-balance="missing"/);
  assert.doesNotMatch(debit[0], /\$0/);
  assert.match(debit[0], /\u2014/);
  const total = html.match(/<article class="bank-tile bank-total"[\s\S]*?<\/article>/);
  assert.ok(total);
  assert.match(total[0], /data-total="partial"/);
  assert.match(total[0], /data-pending="1"/);
  assert.match(total[0], /\$24\.68/);
  assert.match(total[0], /\(1 account pending\)/);
  assert.doesNotMatch(total[0], /\$0/);
  assert.match(html, /data-acct="Overdraft"[^>]*data-balance="0"/);
  assert.match(html, /data-acct="Check Account"[\s\S]*?\$12\.34/);
  assert.match(html, /No recent activity in this print/);
  assert.doesNotMatch(html, /<table class="bank-tape">/);
  assert.doesNotMatch(html, /Month-end balances/);
  assert.doesNotMatch(html, /class="bank-spark"/);
  assert.doesNotMatch(html, /bank-stale/);
  assert.doesNotMatch(html, /Last closed month/);
  assert.doesNotMatch(html, /Paycheck\/Salary\/Wages<\/span>/);
});

test("stale badge appears only after 36h", function () {
  const ctx = boot();
  const fx = loadFixture();
  const fresh = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-06T12:00:00-04:00" });
  assert.doesNotMatch(fresh, /bank-stale/);
  const stale = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-07T12:00:00-04:00" });
  assert.match(stale, /bank-stale/);
  assert.match(stale, /Out of date: more than 36 hours old/);
});

test("hash switches the view and historical labels an open month", function () {
  const ctx = boot();
  const fx = loadFixture();
  const el = mount(ctx, fx, { now: "2026-10-05T18:00:00-04:00" });
  assert.match(el.innerHTML, /data-panel="budget"/);
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Budget · October 2026</);
  assert.doesNotMatch(el.innerHTML, /class="bank-tabs"|role="tab"/);
  function fire(type) {
    (ctx._bankListeners[type] || []).forEach(function (fn) { fn(); });
  }
  ctx.location.hash = "#budget";
  fire("hashchange");
  assert.match(el.innerHTML, /data-panel="budget"/);
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Budget · October 2026</);
  ctx.location.hash = "#historical";
  fire("hashchange");
  assert.match(el.innerHTML, /data-panel="historical"/);
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Historical · October 2026</);
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
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Current · October 2026</);
});

function assertNoTabButtons(html) {
  assert.doesNotMatch(html, /class="bank-tabs"/);
  assert.doesNotMatch(html, /role="tab"/);
  assert.doesNotMatch(html, /aria-selected=/);
}

test("edits opens from the gear menu and the page has no tab buttons", function () {
  const ctx = boot();
  const fx = loadFixture();
  const current = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assertNoTabButtons(current);
  assert.match(current, /class="bank-view-title"[^>]*>Current · October 2026</);
  assert.match(current, /aria-label="More"/);
  assert.match(current, /data-bank-overflow="1"/);
  assert.match(current, /aria-haspopup="menu"/);
  assert.match(current, /aria-expanded="false"/);
  assert.match(current, /id="bankOverflowMenu"[^>]*hidden/);
  assert.match(current, /role="menuitem"[^>]*>Edits</);
  assert.ok(current.indexOf('class="bank-view-title"') < current.indexOf('class="bank-overflow"'));

  const el = mount(ctx, fx, { now: "2026-10-05T18:00:00-04:00" });
  assert.match(el.innerHTML, /data-panel="budget"/);
  assertNoTabButtons(el.innerHTML);
  const gear = {
    closest: function (sel) {
      if (sel === "[data-bank-tab]") return null;
      if (sel === "[data-bank-overflow]" || sel === ".bank-overflow") return gear;
      return null;
    }
  };
  el.listeners.click({ target: gear, preventDefault: function () {} });
  assert.match(el.innerHTML, /data-panel="budget"/);
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
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Edits</);
  assertNoTabButtons(el.innerHTML);
  assert.match(el.innerHTML, /class="bank-gear on"/);
  assert.match(el.innerHTML, /aria-current="true"/);
  assert.match(el.innerHTML, /class="bank-gear-mark"/);
  assert.match(el.innerHTML, /aria-label="More"/);
  assert.equal(ctx.bankResolveTab("#edits"), "edits");

  function fire(type) {
    (ctx._bankListeners[type] || []).forEach(function (fn) { fn(); });
  }
  ctx.location.hash = "#current";
  fire("hashchange");
  assert.match(el.innerHTML, /data-panel="current"/);
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Current · October 2026</);
  assert.doesNotMatch(el.innerHTML, /class="bank-gear on"/);

  ["historical", "budget"].forEach(function (tab) {
    const page = ctx.bankPageHtml(fx, { tab: tab, now: "2026-10-05T18:00:00-04:00" });
    const title = tab === "historical" ? "Historical · October 2026" : "Budget · October 2026";
    assert.match(page, new RegExp('class="bank-view-title"[^>]*>' + title));
    assert.match(page, new RegExp('data-panel="' + tab + '"'));
    assertNoTabButtons(page);
    assert.doesNotMatch(page, /class="bank-gear on"/);
    assert.match(page, /aria-label="More"/);
  });

  ctx.location.hash = "#edits";
  const linked = mount(ctx, fx, {});
  assert.match(linked.innerHTML, /data-panel="edits"/);
  assert.match(linked.innerHTML, /class="bank-view-title"[^>]*>Edits</);
  assert.match(linked.innerHTML, /class="bank-gear on"/);
  ctx.bankActivate(el, "edits");
  assert.match(el.innerHTML, /data-panel="edits"/);
  assertNoTabButtons(el.innerHTML);

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
  assert.match(css, /@media \(max-width: 390px\) \{[\s\S]*\.bank-view-title/);
  assert.doesNotMatch(css, /\.bank-tabs/);
});

test("hashchange and popstate switch Historical, Current, Budget, and Edits", function () {
  const ctx = boot();
  const fx = loadFixture();
  const pushes = [];
  const replaces = [];
  ctx.history.pushState = function (_state, _title, url) {
    pushes.push(String(url));
    if (pushes.length > 8) throw new Error("history loop");
    (ctx._bankListeners.popstate || []).forEach(function (fn) { fn(); });
    (ctx._bankListeners.hashchange || []).forEach(function (fn) { fn(); });
    const s = String(url);
    const i = s.indexOf("#");
    ctx.location.hash = i >= 0 ? s.slice(i) : "";
  };
  ctx.history.replaceState = function () { replaces.push("replace"); };
  const el = mount(ctx, fx, { now: "2026-10-05T18:00:00-04:00" });
  assert.match(el.innerHTML, /data-panel="budget"/);
  assert.equal(ctx._bankListeners.hashchange.length, 1);
  assert.equal(ctx._bankListeners.popstate.length, 1);

  function fire(type) {
    (ctx._bankListeners[type] || []).forEach(function (fn) { fn(); });
  }
  function tabBtn(tab) {
    return {
      getAttribute: function (name) { return name === "data-bank-tab" || !name ? tab : null; },
      closest: function (sel) { return sel === "[data-bank-tab]" ? tabBtn(tab) : null; }
    };
  }

  ctx.location.hash = "#historical";
  fire("hashchange");
  assert.match(el.innerHTML, /data-panel="historical"/);
  assert.equal(el._bank.tab, "historical");

  ctx.location.hash = "#budget";
  fire("popstate");
  assert.match(el.innerHTML, /data-panel="budget"/);
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Budget · October 2026</);
  assertNoTabButtons(el.innerHTML);

  ctx.location.hash = "#edits";
  fire("hashchange");
  assert.match(el.innerHTML, /data-panel="edits"/);
  assert.match(el.innerHTML, /class="bank-gear on"/);
  assert.match(el.innerHTML, /aria-current="true"/);
  assertNoTabButtons(el.innerHTML);

  fire("popstate");
  assert.match(el.innerHTML, /data-panel="edits"/);
  assert.equal(pushes.length, 0);

  ctx.location.hash = "";
  fire("popstate");
  assert.match(el.innerHTML, /data-panel="budget"/);
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Budget · October 2026</);
  assertNoTabButtons(el.innerHTML);

  ctx.location.hash = "#current";
  fire("hashchange");
  assert.match(el.innerHTML, /data-panel="current"/);

  el.listeners.click({ target: tabBtn("budget"), preventDefault: function () {} });
  assert.match(el.innerHTML, /data-panel="budget"/);
  assert.equal(pushes.length, 1);
  assert.doesNotMatch(pushes[0], /#/);
  assert.equal(ctx.location.hash, "");
  assert.equal(replaces.length, 0);

  fire("hashchange");
  fire("popstate");
  assert.equal(pushes.length, 1);
  assert.match(el.innerHTML, /data-panel="budget"/);

  el.listeners.click({ target: tabBtn("historical"), preventDefault: function () {} });
  assert.match(el.innerHTML, /data-panel="historical"/);
  assert.match(pushes[1], /#historical$/);

  el.listeners.click({ target: tabBtn("edits"), preventDefault: function () {} });
  assert.match(el.innerHTML, /data-panel="edits"/);
  assert.match(el.innerHTML, /class="bank-gear on"/);
  assert.match(pushes[2], /#edits$/);

  el.listeners.click({ target: tabBtn("current"), preventDefault: function () {} });
  assert.match(el.innerHTML, /data-panel="current"/);
  assert.equal(ctx.location.hash, "#current");
  assert.match(pushes[3], /#current$/);
  assert.equal(pushes.length, 4);
  assert.equal(replaces.length, 0);

  ctx.location.hash = "#edits";
  fire("popstate");
  assert.match(el.innerHTML, /data-panel="edits"/);
  assert.equal(el._bank.tab, "edits");
  assert.equal(pushes.length, 4);

  ctx.location.hash = "#historical";
  fire("hashchange");
  assert.match(el.innerHTML, /data-panel="historical"/);
  ctx.location.hash = "#budget";
  fire("popstate");
  assert.match(el.innerHTML, /data-panel="budget"/);
  assert.equal(pushes.length, 4);

  const src = fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8");
  assert.match(src, /addEventListener\("hashchange", bankActivateFromHistory\)/);
  assert.match(src, /addEventListener\("popstate", bankActivateFromHistory\)/);
  assert.match(src, /history\.pushState\(\{ bankTab: tab \}/);
});

test("empty calendar shows the due-day empty state and insights keep severity", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.budget.bills = [{ name: "Phone", amount: 12.34, typical_day: null, cadence: "monthly", category: "Utilities/Bills" }];
  fx.budget.bills_monthly = [];
  fx.budget.income_monthly = [];
  const html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /Due days need more history/);
  assert.doesNotMatch(html, /class="bank-days"/);
  assert.doesNotMatch(html, /class="bank-cal-grid"/);
  const live = ctx.bankPageHtml(fx, { tab: "current" });
  assert.match(live, /Income for this month is not in the print/);
  assert.doesNotMatch(mtdBlock(live), /class="bank-pie"/);
  assert.doesNotMatch(html, /Income for this month is not in the print/);
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
  assert.match(html, /This check \(Paycheck, day 15 \) covers:/);
  assert.match(html, /This check \(Paycheck, day 30 \) covers:/);
  assert.doesNotMatch(html, /This check \(Paycheck, day 1 \)/);
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
  assert.match(html, /<div class="bank-day has" tabindex="0" role="button" aria-label="Oct 1: Mortgage"><b>1<\/b> <span title="Mortgage" aria-label="Mortgage">Mortgage<\/span>/);
  assert.match(html, /<div class="bank-day has" tabindex="-1" role="button" aria-label="Oct 28: Phone"><b>28<\/b> <span title="Phone" aria-label="Phone">Phone<\/span>/);
  assert.match(html, /<div class="bank-day has multi" tabindex="-1" role="button" title="Paycheck, Car payment, Electric, Gas \(Utility\)" aria-label="Oct 15: Paycheck, Car payment, Electric, Gas \(Utility\)"><span class="bank-day-top"><b>15<\/b> <i class="bank-day-more bank-day-more-narrow" title="Paycheck, Car payment, Electric, Gas \(Utility\)" aria-hidden="true">\+3<\/i> <i class="bank-day-more bank-day-more-wide" title="Paycheck, Car payment, Electric, Gas \(Utility\)" aria-hidden="true">\+2<\/i><\/span> <em class="pay" title="Paycheck" aria-label="Paycheck">Paycheck<\/em> <span class="bank-day-second" title="Car payment" aria-label="Car payment">Car payment<\/span> <span class="bank-day-rest" title="Electric" aria-label="Electric">Electric<\/span> <span class="bank-day-rest" title="Gas \(Utility\)" aria-label="Gas \(Utility\)">Gas \(Utility\)<\/span>/);
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
  assert.match(html.slice(calAt, insightAt), /Due calendar · plan/);
  assert.doesNotMatch(html.slice(calAt, insightAt), /Insights/);
  if (coversAt >= 0) assert.ok(coversAt > calAt && coversAt < insightAt);
  assert.match(html, /role="columnheader">Sun<\/span>[\s\S]*role="columnheader">Sat<\/span>/);
  assert.equal((html.match(/class="bank-cal-week"/g) || []).length, 5);
  assert.match(html, /<div class="bank-cal-week" role="row"><div class="bank-cal-pad" aria-hidden="true"><\/div><div class="bank-cal-pad" aria-hidden="true"><\/div><div class="bank-cal-pad" aria-hidden="true"><\/div><div class="bank-cal-pad" aria-hidden="true"><\/div><div class="bank-day has" tabindex="0" role="button" aria-label="Oct 1: Mortgage"><b>1<\/b> <span title="Mortgage" aria-label="Mortgage">Mortgage<\/span>/);
  assert.match(html, /<div class="bank-day" tabindex="-1" role="button" aria-label="Oct 2"><b>2<\/b><\/div>/);
  assert.match(html, /<div class="bank-day has" tabindex="-1" role="button" aria-label="Oct 3: Sample item"><b>3<\/b> <span title="Sample item" aria-label="Sample item">Sample item<\/span>/);
  assert.doesNotMatch(html, /class="bank-days"/);
  let mtd = mtdBlock(ctx.bankPageHtml(fx, { tab: "current" }));
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
  html = ctx.bankPageHtml(fx, { tab: "current" });
  let block = mtdBlock(html);
  assert.match(block, /class="bank-mtd-meter"/);
  assert.match(block, /class="bank-mtd-track"/);
  assert.match(block, /style="width:43%"/);
  assert.match(block, /43% of income/);
  assert.doesNotMatch(block, /class="bank-pie"/);
  assert.doesNotMatch(block, /<path /);
  assert.doesNotMatch(block, /<svg /);
  assert.match(block, /Spent so far<\/span> <b>\$30\.00<\/b>/);
  assert.match(block, /Income received<\/span> <b>\$70\.00<\/b>/);
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
  html = ctx.bankPageHtml(fx, { tab: "current" });
  block = mtdBlock(html);
  assert.match(block, /Income received<\/span> <b>\$40\.00<\/b>/);
  assert.match(block, /Spent so far<\/span> <b>\$60\.00<\/b>/);
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
  html = ctx.bankPageHtml(fx, { tab: "current" });
  block = mtdBlock(html);
  assert.match(block, /Income received<\/span> <b>\$15\.00<\/b>/);
  assert.match(block, /Spent so far<\/span> <b>\$75\.00<\/b>/);
  assert.match(block, /500% of income/);
  assert.match(block, /style="width:100%"/);
  assert.doesNotMatch(block, /\$999/);
  assert.doesNotMatch(block, /\$80/);

  oct.income = null;
  oct.tx = [];
  oct.income_total = 50;
  fx.budget.mtd_actual_by_category = { Groceries: 50 };
  html = ctx.bankPageHtml(fx, { tab: "current" });
  block = mtdBlock(html);
  assert.doesNotMatch(block, /<path /);
  assert.doesNotMatch(block, /class="bank-mtd-track over"/);
  assert.match(block, /Income received<\/span> <b>\$50\.00<\/b>/);
  assert.match(block, /100% of income/);
  assert.match(block, /style="width:100%"/);

  oct.closed = true;
  oct.income_total = 80;
  fx.budget.income_monthly[0].amount = 80;
  fx.budget.mtd_actual_by_category = { Groceries: 20 };
  html = ctx.bankPageHtml(fx, { tab: "current" });
  block = mtdBlock(html);
  assert.doesNotMatch(block, /class="bank-pie"/);
  assert.doesNotMatch(block, /class="bank-mtd-meter"/);
  assert.doesNotMatch(block, /NaN|Infinity/);
  assert.match(block, /Income for this month is not in the print/);
  assert.match(block, /Spent so far \$20\.00/);

  oct.closed = false;
  oct.income_total = 33;
  fx.budget.mtd_actual_by_category = { "Paycheck/Salary/Wages": 10, Transfer: 4 };
  html = ctx.bankPageHtml(fx, { tab: "current" });
  block = mtdBlock(html);
  assert.doesNotMatch(block, /<path /);
  assert.doesNotMatch(block, /class="bank-mtd-meter"/);
  assert.doesNotMatch(block, /NaN|Infinity/);
  assert.match(block, /Income received \$33\.00/);
  assert.match(block, /No month-to-date spend in this print/);

  oct.income_total = null;
  fx.budget.mtd_actual_by_category = {};
  html = ctx.bankPageHtml(fx, { tab: "current" });
  block = mtdBlock(html);
  assert.match(block, /No month-to-date spend or income in this print/);
  assert.doesNotMatch(block, /<path /);
  assert.doesNotMatch(block, /class="bank-mtd-meter"/);
  assert.doesNotMatch(block, /NaN|Infinity/);
  assert.doesNotMatch(block, /\$0/);

  oct.income_total = 0;
  fx.budget.mtd_actual_by_category = { Groceries: 10 };
  html = ctx.bankPageHtml(fx, { tab: "current" });
  block = mtdBlock(html);
  assert.doesNotMatch(block, /<path /);
  assert.doesNotMatch(block, /class="bank-mtd-meter"/);
  assert.doesNotMatch(block, /NaN|Infinity/);
  assert.match(block, /Income received this month is zero/);
  assert.match(block, /Spent so far \$10\.00/);

  fx.asof = "2026-10-01T03:30:00Z";
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /aria-label="September 2026"/);
  assert.match(html, /<div class="bank-cal-week" role="row"><div class="bank-cal-pad" aria-hidden="true"><\/div><div class="bank-cal-pad" aria-hidden="true"><\/div><div class="bank-day has" tabindex="0" role="button" aria-label="Sep 1: Mortgage"><b>1<\/b> <span title="Mortgage" aria-label="Mortgage">Mortgage<\/span>/);

  fx.asof = "2026-02-10T12:00:00-05:00";
  fx.budget.bills = [
    { name: "Mortgage", amount: 12.34, typical_day: null, cadence: "monthly" },
    { name: "Mobile plan", amount: 12.34, typical_day: null, cadence: "monthly" }
  ];
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /aria-label="February 2026"/);
  assert.match(html, /<div class="bank-cal-week" role="row"><div class="bank-day has" tabindex="0" role="button" aria-label="Feb 1: Mortgage"><b>1<\/b> <span title="Mortgage" aria-label="Mortgage">Mortgage<\/span>/);
  assert.match(html, /<b>27<\/b> <em class="pay" title="Paycheck" aria-label="Paycheck">Paycheck<\/em>/);
  assert.match(html, /<b>28<\/b> <span title="Phone" aria-label="Phone">Phone<\/span>/);
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
  const budgetPage = ctx.bankPageHtml(fresh, { tab: "budget" });
  assert.doesNotMatch(budgetPage, /Spent vs income/);
  assert.doesNotMatch(budgetPage, /of income/);
  assert.doesNotMatch(budgetPage, /Month to date · day/);
  const current = ctx.bankPageHtml(fresh, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.doesNotMatch(current, /Spent vs income/);
  assert.doesNotMatch(current, /This month/);
  assert.match(current, /October · actual/);
  assert.match(current, /Month to date · day 5 of 31/);
  assert.match(current, /of income/);
});

function mtdBlock(html) {
  const start = html.indexOf('class="bank-pie-block bank-mtd"');
  assert.ok(start >= 0, "mtd block");
  const end = html.indexOf("</section>", start);
  assert.ok(end >= 0, "mtd section");
  return html.slice(start, end);
}

test("month-to-date caption uses the Eastern calendar day of asof", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.asof = "2026-11-01T00:30:00Z";
  const html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /aria-label="October 2026"/);
  assert.equal(ctx.bankMtdCaption(fx.asof), "Month to date · day 31 of 31");
  const current = ctx.bankPageHtml(fx, { tab: "current" });
  assert.match(mtdBlock(current), /<h3>Month to date · day 31 of 31<\/h3>/);
  const barsAt = html.indexOf('class="bank-bars"');
  assert.ok(barsAt >= 0);
  assert.match(html.slice(barsAt, barsAt + 80), /<h3>Progress vs limits<\/h3>/);
  assert.doesNotMatch(html, /Month to date · day/);
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
  fx.budget.income_monthly = [{ label: "Bonus", amount: 12.34, typical_day: 31 }];
  fx.budget.calendar = [{ day: 29, items: ["Sample item"] }];

  function budget(asof) {
    fx.asof = asof;
    return ctx.bankPageHtml(fx, { tab: "budget" });
  }

  const feb = budget("2026-02-10T12:00:00-05:00");
  assert.match(feb, /aria-label="February 2026"/);
  assert.match(feb, /<span class="bank-day-top"><b>27<\/b> <i class="bank-day-more bank-day-more-narrow" title="Rent, Internet" aria-hidden="true">\+1<\/i><\/span> <span title="Rent" aria-label="Rent">Rent<\/span> <span class="bank-day-second" title="Internet" aria-label="Internet">Internet<\/span> <small class="bank-day-note">moved from Sat Feb 28<\/small>/);
  assert.match(feb, /aria-label="Feb 27: Rent, Internet, moved from Sat Feb 28"/);
  assert.match(feb, /<span class="bank-day-top"><b>28<\/b> <i class="bank-day-more bank-day-more-narrow" title="Bonus \(31st\), Sample item \(29th\)" aria-hidden="true">\+1<\/i><\/span> <em class="pay" title="Bonus \(31st\)" aria-label="Bonus \(31st\)">Bonus \(31st\)<\/em> <span class="bank-day-second" title="Sample item \(29th\)" aria-label="Sample item \(29th\)">Sample item \(29th\)<\/span>/);
  assert.match(feb, /<b>15<\/b> <span title="Water" aria-label="Water">Water<\/span>/);
  assert.doesNotMatch(feb, /Water \(/);
  assert.doesNotMatch(feb, /<b>29<\/b>/);
  assert.doesNotMatch(feb, /<b>30<\/b>/);
  assert.doesNotMatch(feb, /<b>31<\/b>/);
  assert.match(feb, /due day 27/);
  assert.match(feb, /This check \(Bonus, day 31 \)/);

  const apr = budget("2026-04-10T12:00:00-04:00");
  assert.match(apr, /aria-label="April 2026"/);
  assert.match(apr, /<span class="bank-day-top"><b>30<\/b> <i class="bank-day-more bank-day-more-narrow" title="Bonus \(31st\), Rent, Internet" aria-hidden="true">\+2<\/i> <i class="bank-day-more bank-day-more-wide" title="Bonus \(31st\), Rent, Internet" aria-hidden="true">\+1<\/i><\/span> <em class="pay" title="Bonus \(31st\)" aria-label="Bonus \(31st\)">Bonus \(31st\)<\/em> <span class="bank-day-second" title="Rent" aria-label="Rent">Rent<\/span> <span class="bank-day-rest" title="Internet" aria-label="Internet">Internet<\/span> <small class="bank-day-note">moved from day 31<\/small>/);
  assert.match(apr, /<b>29<\/b> <span title="Sample item" aria-label="Sample item">Sample item<\/span>/);
  assert.doesNotMatch(apr, /Internet \(/);
  assert.doesNotMatch(apr, /Sample item \(/);
  assert.doesNotMatch(apr, /<b>31<\/b>/);
  assert.match(apr, /due day 30/);

  const oct = budget("2026-10-05T12:00:00-04:00");
  assert.match(oct, /aria-label="October 2026"/);
  assert.match(oct, /<span class="bank-day-top"><b>31<\/b> <i class="bank-day-more bank-day-more-narrow" title="Bonus, Rent" aria-hidden="true">\+1<\/i><\/span> <em class="pay" title="Bonus" aria-label="Bonus">Bonus<\/em> <span class="bank-day-second" title="Rent" aria-label="Rent">Rent<\/span>/);
  assert.doesNotMatch(oct, /<b>31<\/b>[\s\S]{0,220}bank-day-more-wide/);
  assert.match(oct, /<b>30<\/b> <span title="Internet" aria-label="Internet">Internet<\/span>/);
  assert.match(oct, /<b>29<\/b> <span title="Sample item" aria-label="Sample item">Sample item<\/span>/);
  assert.match(oct, /<b>15<\/b> <span title="Water" aria-label="Water">Water<\/span>/);
  assert.doesNotMatch(oct, /\(31st\)|\(30th\)|\(29th\)/);

  const leap = budget("2028-02-10T12:00:00-05:00");
  assert.match(leap, /aria-label="February 2028"/);
  assert.match(leap, /<b>29<\/b>[\s\S]*title="Bonus \(31st\)"[\s\S]*title="Rent"[\s\S]*title="Internet"[\s\S]*title="Sample item"/);
  assert.match(leap, /moved from day 31/);
  assert.match(leap, /moved from day 30/);
  assert.doesNotMatch(leap, /Sample item \(/);
  assert.doesNotMatch(leap, /<b>28<\/b> <em class="pay">/);
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
  assert.match(html, /class="bank-merchant">Sample<\/span> <span class="bank-chip">Other<\/span>/);
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

test("desk links Banking and banking assets are cache-busted at tip dx", function () {
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const page = index;
  const stub = fs.readFileSync(path.join(root, "house", "banking", "index.html"), "utf8");
  const investments = fs.readFileSync(path.join(root, "investments/index.html"), "utf8");
  const houseCss = fs.readFileSync(path.join(root, "house/house.css"), "utf8");
  const bankCss = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  assert.match(index, /id="bankDesk"/);
  assert.match(index, /\/js\/nav\.js\?v=20261006ec4/);
  assert.match(index, /id="mpNav"/);
  assert.doesNotMatch(index, /href="\/house\/banking\/"/);
  assert.doesNotMatch(index, /href="\/house\/banking"/);
  assert.match(stub, /location\.replace/);
  assert.match(stub, /noindex/);
  assert.match(stub, /canonical/);
  assert.match(investments, /\/house\/house\.css\?v=20261006ec4/);
  assert.match(page, /\/house\/js\/banking\.js\?v=20261006ec/);
  assert.match(page, /\/house\/banking\.css\?v=20261006ec/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904eb/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904eb/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904ec/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904ec/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dz/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dz/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dy/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dy/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dx/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dx/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904du/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904du/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dt/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dt/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904ds/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904ds/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dr/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dr/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dq/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dq/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dp/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dp/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904do/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904do/);
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
  assert.match(page, /\/house\/house\.css\?v=20261006ec4/);
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
  assert.doesNotMatch(page, /href="\/house\/banking\/"/);
  assert.match(houseCss, /@media \(max-width: 720px\) \{\s*header \.section-nav \{ display: none; \}/);
  assert.match(bankCss, /\.bank-mtd-fig b\s*\{[^}]*font-size:\s*28px/);
  assert.match(bankCss, /\.bank-mtd-track\s*\{/);
  assert.match(bankCss, /\.bank-cal \{\s*min-width: 0;\s*\}/);
  assert.match(bankCss, /\.bank-cal-week \{[^}]*repeat\(7, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(bankCss, /\.bank-days/);
  assert.doesNotMatch(bankCss, /flex:\s*0 0 44px/);
  assert.match(bankCss, /\.bank-budget-top \{\s*grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(bankCss, /rgba\(7,\s*11,\s*17,\s*0\.45\)/);
  assert.match(bankCss, /\[data-theme="nina"\] \.bank-overflow-menu/);
  assert.doesNotMatch(bankCss, /rgba\(74,\s*44,\s*56,\s*0\.16\)/);
  assert.doesNotMatch(bankCss, /\.bank-cal h3,\s*\.bank-insight-block h3,\s*\.bank-edit-block h3 \{[^}]*text-transform:\s*uppercase/);
  assert.doesNotMatch(bankCss, /\.bank-cal h3,\s*\.bank-insight-block h3,\s*\.bank-edit-block h3 \{[^}]*letter-spacing/);
  assert.match(bankCss, /\.bank-cal h3,\s*\.bank-insight-block h3,\s*\.bank-edit-block h3 \{[^}]*font-size:\s*11px/);
  assert.match(bankCss, /\.bank-bill-list li b,\s*\.bank-income-list li b \{[^}]*tabular-nums/);
  assert.match(bankCss, /\.bank-edit-list select\.bank-chip \{[^}]*font:\s*600 13px\/1\.35/);
  assert.match(bankCss, /@media \(max-width: 720px\) \{[\s\S]*\.bank-day\.has\.multi \{[^}]*min-height:\s*40px/);
  assert.match(bankCss, /@media \(max-width: 720px\) \{[\s\S]*\.bank-edit-side \{[^}]*width:\s*100%/);
  assert.match(bankCss, /@media \(max-width: 720px\) \{[\s\S]*\.bank-day span,\s*\.bank-day button,\s*\.bank-day-more \{[^}]*font-size:\s*11px/);
});

test("a successful feed mounts Budget when the hash is empty", async function () {
  const ctx = boot();
  const el = { innerHTML: "", addEventListener: function () {} };
  await ctx.bankLoad(el, function () {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: function () { return Promise.resolve(loadFixture()); }
    });
  });
  assert.match(el.innerHTML, /data-panel="budget"/);
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Budget · October 2026</);
  assertNoTabButtons(el.innerHTML);
  const current = ctx.bankPageHtml(loadFixture(), { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(current, /data-balance="missing"/);
  assert.doesNotMatch(current, /data-acct="Debit Account"[\s\S]{0,120}\$0/);
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
  assert.match(html, /class="bank-merchant">Corner Market<\/span> <span class="bank-chip">Groceries<\/span>/);
  assert.match(html, /class="bank-merchant">City Fuel<\/span> <span class="bank-chip">Transport<\/span>/);
  assert.match(html, /class="bank-merchant">No description<\/span> <span class="bank-chip">Shopping<\/span>/);
  assert.doesNotMatch(html, /class="bank-merchant">Shopping<\/span> <span class="bank-chip">Shopping<\/span>/);
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
  assert.doesNotMatch(edits, /class="bank-tabs"|role="tab"/);
  assert.match(edits, /class="bank-view-title"[^>]*>Edits</);
  assert.match(edits, /aria-label="More"/);
  assert.match(edits, /data-bank-cat/);
  assert.match(edits, /value="Transport" selected/);
  assert.match(edits, /class="bank-merchant">City Fuel<\/span> <span class="bank-edit-meta">2026-10-04<\/span>/);
  const fuel = edits.match(/data-bank-tx="2026-10-04\|acct-check\|12\.34\|City Fuel"[\s\S]*?<\/select>/);
  assert.ok(fuel);
  assert.match(fuel[0], /value="Transport" selected/);
  assert.doesNotMatch(edits, /data-bank-tx="2026-10-05\|acct-check\|12\.34\|Corner Market"/);
  const shopping = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Shopping", now: "2026-10-05T18:00:00-04:00" });
  assert.match(shopping, /class="bank-merchant">No description<\/span> <span class="bank-edit-meta">2026-10-03<\/span>/);
  assert.doesNotMatch(shopping, /class="bank-merchant">Shopping<\/span>/);
  assert.match(edits, /Categories sync across your seats/);
  assert.doesNotMatch(edits, /Category edits sync across your seats/);
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

test("an empty recent tape says the print has no activity", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.current.recent_tx = [];
  const html = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(html, /No recent activity in this print/);
  assert.doesNotMatch(html, /<table class="bank-tape">/);
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
  assert.match(el.innerHTML, /Categories sync across your seats/);
  assert.doesNotMatch(el.innerHTML, /Category edits sync across your seats/);
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
  assert.match(el.innerHTML, /class="bank-merchant">Corner Market<\/span> <span class="bank-edit-meta">2026-10-05<\/span>/);
  ctx.bankActivate(el, "current");
  assert.match(el.innerHTML, /class="bank-merchant">Corner Market<\/span> <span class="bank-chip">Food\/Drink<\/span>/);
  assert.doesNotMatch(el.innerHTML, /data-bank-tx/);
  const rank = el.innerHTML.match(/<ol class="bank-rank">[\s\S]*?<\/ol>/);
  assert.ok(rank);
  assert.match(rank[0], /<span>Groceries<\/span> <b>\$12\.34<\/b>/);
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
  assert.doesNotMatch(html.replace(/<p class="bank-next-left">[\s\S]*?<\/p>/g, ""), /\$0\.00/);
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
  assert.match(el.innerHTML, /<b>16<\/b> <span title="Car payment" aria-label="Car payment">Car payment<\/span>/);
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
  assert.match(el.innerHTML, /<b>15<\/b>[\s\S]{0,500}title="Car payment" aria-label="Car payment">Car payment<\/span>/);
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
  assert.match(groceries, /Neighborhood Grocer<\/span> <span class="bank-edit-meta">2026-05-22/);
  assert.match(groceries, /Neighborhood Grocer<\/span> <span class="bank-edit-meta">2026-08-21/);
  assert.match(groceries, /Weekly Market<\/span> <span class="bank-edit-meta">2026-06-19/);
  assert.match(groceries, /Weekly Market<\/span> <span class="bank-edit-meta">2026-09-18/);
  assert.match(groceries, /Corner Market<\/span> <span class="bank-edit-meta">2026-07-16/);
  assert.match(groceries, /Corner Market<\/span> <span class="bank-edit-meta">2026-10-05/);
  assert.doesNotMatch(groceries, /No recent/);
  const emptyCat = ctx.bankPageHtml(fx, { tab: "edits", editCat: "Paycheck/Salary/Wages" });
  assert.match(emptyCat, /No items in this category/);
  assert.doesNotMatch(emptyCat, /No recent/);

  const budget = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(budget, /Mortgage<\/span> <b>\$40\.00<\/b>/);
  assert.match(budget, /Electric<\/span> <b>\$18\.50<\/b>/);
  assert.doesNotMatch(budget, /Electric<\/span> <b class="bank-pending"/);
  assert.match(budget, /Car payment<\/span> <b class="bank-pending">amount pending/);
  assert.match(budget, /Gas \(Utility\)<\/span> <b class="bank-pending">amount pending/);
  const editsBills = ctx.bankPageHtml(fx, { tab: "edits" });
  assert.match(editsBills, /Mortgage<\/span> <span class="bank-edit-side">[\s\S]*?<b>\$40\.00<\/b>/);
  assert.match(editsBills, /Electric<\/span> <span class="bank-edit-side">[\s\S]*?<b>\$18\.50<\/b>/);
  assert.match(editsBills, /Car payment<\/span> <span class="bank-edit-side">[\s\S]*?class="bank-pending">amount pending/);

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
  assert.match(longCurrent, /class="list-cap"[^>]*tabindex="0"[^>]*aria-label="Recent activity"/);
  assert.match(longCurrent, /Showing 10 of 40, scroll for more/);
  assert.doesNotMatch(longCurrent, /class="bank-tape-scroll"/);
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
  assert.match(histEdits, /August Market<\/span> <span class="bank-edit-meta">2026-08-02/);

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
  assert.match(dig, /Day Program<\/span> <span class="bank-edit-meta">2026-03-14/);
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
  assert.match(optional, /Groceries<\/span> <b>\$30\.00<\/b>/);
  assert.match(optional, /Shopping<\/span> <b>\$12\.34<\/b>/);
  assert.match(bills, /Optional<\/span> <b>\$42\.34<\/b>/);
  assert.match(budget, /data-bar="Groceries"[\s\S]*?Actual \$30\.00[\s\S]*?Limit \$12\.34/);
  assert.match(budget, /data-bar="Shopping"[\s\S]*?Actual \$12\.34[\s\S]*?Limit \$24\.00/);
  assert.doesNotMatch(budget, /Actual \$0\.00/);
  assert.doesNotMatch(budget, /Actual \u2014/);

  const edits = ctx.bankPageHtml(fx, { tab: "edits" });
  assert.match(edits, /data-bank-kind="Childcare"[\s\S]*?value="needs" selected/);
  assert.match(edits, /data-bank-kind="Tuition"[\s\S]*?value="required" selected/);
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
  assert.match(quietHtml, /No category limits in this print/);
  assert.doesNotMatch(quietHtml, /data-bar=/);
  assert.match(pieBlock(quietHtml, "bills"), /No required spending this month/);
  assert.match(pieBlock(quietHtml, "optional"), /No needs or wants spending this month/);
  assert.doesNotMatch(pieBlock(quietHtml, "bills"), /<path /);
  assert.doesNotMatch(pieBlock(quietHtml, "optional"), /<path /);
  const quietEdits = ctx.bankPageHtml(quiet, { tab: "edits" });
  assert.match(quietEdits, /data-bank-kind="Childcare"/);
  assert.match(quietEdits, /data-bank-kind="Tuition"[\s\S]*?value="required" selected/);
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
  assert.match(archive, /Old Stand<\/span> <span class="bank-edit-meta">2026-04-02/);
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
  assert.match(el.innerHTML, /class="bank-merchant">Corner Market<\/span> <span class="bank-edit-meta">2026-10-05<\/span>/);
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
  assert.match(el.innerHTML, /class="bank-merchant">Corner Market<\/span> <span class="bank-edit-meta">2026-10-05<\/span>/);
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
  assert.match(el.innerHTML, /class="bank-merchant">Corner Market<\/span> <span class="bank-edit-meta">2026-10-05<\/span>/);
  ctx.bankActivate(el, "current");
  assert.match(el.innerHTML, /class="bank-merchant">Corner Market<\/span> <span class="bank-chip">Pets<\/span>/);
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
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, "/data/banking/categories.json");
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[1].url, "/data/banking/mustpay-overrides.json");
  assert.equal(calls[1].method, "GET");
  assert.equal(calls[2].url, "/data/banking/tiers.json");
  assert.equal(calls[2].method, "GET");
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
      assert.match(el.innerHTML, /Category was not removed/);
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
  assert.match(el.innerHTML, /Category was not removed/);
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
  assert.match(baseBills, /<h3>Required · plan<\/h3>/);
  assert.match(baseBills, /Optional<\/span> <b>\$42\.34<\/b>/);
  assert.equal((baseBills.match(/<path /g) || []).length, 1);
  assert.doesNotMatch(baseBills, /Groceries|Shopping|Tuition/);
  assert.match(baseOptional, /<h3>Needs and Wants · plan<\/h3>/);
  assert.match(baseOptional, /Groceries<\/span> <b>\$30\.00<\/b>/);
  assert.match(baseOptional, /Shopping<\/span> <b>\$12\.34<\/b>/);
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
  assert.match(bills, /Groceries<\/span> <b>\$30\.00<\/b>/);
  assert.match(bills, /Optional<\/span> <b>\$30\.00<\/b>/);
  assert.doesNotMatch(bills, /Paycheck|Transfer|Shopping|Mortgage/);
  assert.match(optional, /Mortgage<\/span> <b>\$20\.00<\/b>/);
  assert.match(optional, /Shopping<\/span> <b>\$10\.00<\/b>/);
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
  assert.match(pieBlock(quietHtml, "bills"), /No required spending this month/);
  assert.match(pieBlock(quietHtml, "optional"), /No needs or wants spending this month/);
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
  assert.match(budget, /<b>4<\/b> <span title="Mortgage" aria-label="Mortgage">Mortgage<\/span>/);
  assert.match(pieBlock(budget, "bills"), /Mortgage<\/span> <b>\$8\.00<\/b>/);
  assert.match(pieBlock(budget, "bills"), /Optional<\/span> <b>\$3\.00<\/b>/);
  assert.match(pieBlock(budget, "optional"), /Groceries<\/span> <b>\$3\.00<\/b>/);
  assert.doesNotMatch(pieBlock(budget, "optional"), /Mortgage/);
  const edits = ctx.bankPageHtml(shown, { tab: "edits", editCat: "Acme Mortgage" });
  assert.match(edits, /<option value="Acme Mortgage"(?: selected)?>Mortgage<\/option>/);
  assert.match(edits, /data-bank-kind="Acme Mortgage"/);
  assert.match(edits, /aria-label="Tier for Mortgage"/);
  assert.match(edits, /data-bank-kind="Acme Mortgage"[\s\S]*?value="required" selected/);
  assert.match(edits, />Required<\/option>/);
  assert.match(edits, />Needs<\/option>/);
  assert.match(edits, />Wants<\/option>/);
  assert.match(edits, />Default<\/option>/);
  assert.doesNotMatch(edits, />Bill<\/option>|>Optional<\/option>/);
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
  assert.match(over, /Spent so far<\/span> <b>\$60\.00<\/b>/);
  assert.match(over, /Income received<\/span> <b>\$40\.00<\/b>/);
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
  assert.match(el.innerHTML, /data-bank-kind="Acme Mortgage"[\s\S]*?value="required" selected/);
  assert.match(el.innerHTML, /Tier edits sync across your seats\./);
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
  assert.match(el.innerHTML, /data-bank-kind="Acme Mortgage"[\s\S]*?value="needs" selected/);
  assert.equal(writes.length, 0);
  ctx.bankActivate(el, "budget");
  assert.doesNotMatch(el.innerHTML.replace(/data-bar="[^"]*"/g, ""), /Acme/);
  assert.match(pieBlock(el.innerHTML, "optional"), /Mortgage<\/span> <b>\$8\.00<\/b>/);
  assert.match(pieBlock(el.innerHTML, "bills"), /Optional<\/span> <b>\$11\.00<\/b>/);
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
  assert.match(pieBlock(budget, "bills"), /Phone<\/span> <b>\$15\.00<\/b>/);
  assert.match(pieBlock(budget, "bills"), /Phone<\/span> <b>\$4\.00<\/b>/);
  assert.doesNotMatch(pieBlock(budget, "bills"), /Acme Mobile|X Mobile plan/);
  assert.match(budget, /<b>12<\/b> <span title="Phone" aria-label="Phone">Phone<\/span>/);
  assert.match(budget, /<b>8<\/b> <span title="Phone" aria-label="Phone">Phone<\/span>/);
  assert.match(budget, /<span>Phone<\/span> <b>\$15\.00<\/b> <i>day 12<\/i>/);
  assert.match(budget, /<span>Phone<\/span> <b>\$4\.00<\/b> <i>day 8<\/i>/);
  assert.match(budget, /<b>3<\/b> <span title="Mobile Home Park" aria-label="Mobile Home Park">Mobile Home Park<\/span>/);
  assert.match(budget, /<span>Mobile Home Park<\/span> <b>\$7\.00<\/b> <i>day 3<\/i>/);
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
  assert.match(pieBlock(budget, "bills"), /Mobile Home Park<\/span> <b>\$7\.00<\/b>/);
  assert.match(pieBlock(budget, "optional"), /Mobile Deposits<\/span> <b>\$2\.00<\/b>/);
  assert.match(pieBlock(budget, "optional"), /Mobile Banking<\/span> <b>\$3\.00<\/b>/);
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
  assert.doesNotMatch(pieBlock(hiddenHtml, "bills"), /Phone<\/span> <b>\$15\.00<\/b>/);
  assert.match(pieBlock(hiddenHtml, "bills"), /Phone<\/span> <b>\$4\.00<\/b>/);
  assert.match(hiddenHtml, /<span>Phone<\/span> <b>\$15\.00<\/b> <i>day 12<\/i>/);

  const current = ctx.bankPageHtml(snap, { tab: "current" });
  const tape = current.match(/<table class="bank-tape">[\s\S]*?<\/table>/);
  assert.ok(tape);
  assert.match(tape[0], /class="bank-merchant">Acme Mobile<\/span> <span class="bank-chip">Acme Mobile<\/span>/);
  assert.match(tape[0], /class="bank-merchant">Handset<\/span> <span class="bank-chip">X Mobile plan<\/span>/);
  assert.match(tape[0], /class="bank-merchant">Gasoline<\/span> <span class="bank-chip">Gasoline<\/span>/);
  assert.match(tape[0], /class="bank-merchant">No description<\/span> <span class="bank-chip">Mobile<\/span>/);
  assert.match(tape[0], /class="bank-merchant">Mobile Deposit<\/span> <span class="bank-chip">Mobile Deposit<\/span>/);
  assert.match(tape[0], /class="bank-merchant">Lot rent<\/span> <span class="bank-chip">Mobile Home Park<\/span>/);
  assert.match(tape[0], /class="bank-merchant">Check photo<\/span> <span class="bank-chip">Mobile Deposits<\/span>/);
  assert.match(tape[0], /class="bank-merchant">App move<\/span> <span class="bank-chip">Mobile Banking<\/span>/);
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
  assert.match(kindRow, /aria-label="Tier for Phone"/);
  assert.match(kindRow, /value="required" selected/);
  assert.equal((kindRow.match(/Acme Mobile/g) || []).length, 1);
  const planKindAt = edits.indexOf('data-bank-kind="X Mobile plan"');
  assert.ok(planKindAt >= 0);
  const planKind = edits.slice(edits.lastIndexOf("<li>", planKindAt), edits.indexOf("</li>", planKindAt));
  assert.match(planKind, /class="bank-kind-name">Phone</);
  assert.match(planKind, /value="required" selected/);
  const parkKindAt = edits.indexOf('data-bank-kind="Mobile Home Park"');
  assert.ok(parkKindAt >= 0);
  const parkKind = edits.slice(edits.lastIndexOf("<li>", parkKindAt), edits.indexOf("</li>", parkKindAt));
  assert.match(parkKind, /class="bank-kind-name">Mobile Home Park</);
  assert.match(parkKind, /aria-label="Tier for Mobile Home Park"/);
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
  assert.doesNotMatch(dueRow.replace(/data-bank-(?:due|cancel|paidoff-date|paidoff|paid-month|status-undo|status|status-save)="[^"]*"/g, ""), /Acme Mobile/i);
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
    .replace(/data-bank-(?:due|cancel|paidoff-date|paidoff|paid-month|status-undo|status|status-save)="[^"]*"/g, "")
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
  assert.match(budget, /<b>21<\/b> <span title="Mobile AL Water" aria-label="Mobile AL Water">Mobile AL Water<\/span>/);
  assert.match(budget, /<b>22<\/b> <span title="Mobile Bay Electric" aria-label="Mobile Bay Electric">Mobile Bay Electric<\/span>/);
  assert.match(budget, /<b>23<\/b> <span title="Mobile Check" aria-label="Mobile Check">Mobile Check<\/span>/);
  assert.match(budget, /<b>24<\/b> <span title="Phone" aria-label="Phone">Phone<\/span>/);
  const waterAt = budget.indexOf('data-bar="Mobile AL Water"');
  const waterBar = budget.slice(waterAt, budget.indexOf("</div></div>", waterAt));
  assert.match(waterBar, /<span>Mobile AL Water<\/span>/);
  assert.doesNotMatch(waterBar, />Phone</);
  const current = ctx.bankPageHtml(snap, { tab: "current" });
  const tape = current.match(/<table class="bank-tape">[\s\S]*?<\/table>/);
  assert.ok(tape);
  assert.match(tape[0], /class="bank-merchant">Mobile AL Water<\/span> <span class="bank-chip">Mobile AL Water<\/span>/);
  assert.match(tape[0], /class="bank-merchant">Handset<\/span> <span class="bank-chip">T Mobile<\/span>/);
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
  assert.match(phoneKind, /value="needs" selected/);
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
  assert.match(typedHtml, /<b>16<\/b> <span title="Home Insurance" aria-label="Home Insurance">Home Insurance<\/span>/);
  assert.match(typedHtml, /<b>19<\/b> <span title="Pet Insurance" aria-label="Pet Insurance">Pet Insurance<\/span>/);
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
  assert.doesNotMatch(homeDue.replace(/data-bank-(?:due|cancel|paidoff-date|paidoff|paid-month|status-undo|status|status-save)="[^"]*"/g, ""), /Acme Home Insurance/);
  assert.match(typedEdits, /data-bank-kind="Acme Home Insurance"/);
  assert.match(typedEdits, /aria-label="Tier for Home Insurance"/);
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
  assert.match(budget, /<section class="bank-bills"><h3>Bills · plan<\/h3>/);
  assert.ok(budget.indexOf('class="bank-income"') < budget.indexOf('class="bank-bills"'));
  assert.match(budget, /<b>11<\/b> <span title="Car Insurance" aria-label="Car Insurance">Car Insurance<\/span>/);
  assert.match(budget, /<b>14<\/b> <span title="Car Insurance" aria-label="Car Insurance">Car Insurance<\/span>/);
  assert.match(budget, /<b>15<\/b> <em class="pay" title="Paycheck" aria-label="Paycheck">Paycheck<\/em>/);
  assert.match(budget, /<b>30<\/b> <em class="pay" title="Paycheck" aria-label="Paycheck">Paycheck<\/em>/);
  assert.match(budget, /<b>10<\/b> <em class="pay" title="Fostering Per Diem Stipend" aria-label="Fostering Per Diem Stipend">Fostering Per Diem Stipend<\/em>/);
  assert.match(budget, /<b>25<\/b> <em class="pay" title="Fostering Per Diem Stipend" aria-label="Fostering Per Diem Stipend">Fostering Per Diem Stipend<\/em>/);
  assert.doesNotMatch(budget, /<b>1<\/b> <em class="pay"/);
  assert.match(budget, /<b>2<\/b> <span title="Sample item" aria-label="Sample item">Sample item<\/span>/);
  assert.doesNotMatch(budget, /<b>9<\/b><span>Insurance<\/span>/);
  assert.doesNotMatch(budget, /<b>6<\/b><span>Health Insurance/);
  assert.doesNotMatch(budget, /<b>7<\/b><span>Clinic Plan/);
  assert.doesNotMatch(budget, /<b>4<\/b><span>/);
  assert.doesNotMatch(budget, /Health Insurance|Health insurance|Clinic Plan/);
  const covers = budget.match(/<ul class="bank-covers">[\s\S]*?<\/ul>/);
  assert.ok(covers);
  assert.match(covers[0], /Car Insurance/);
  assert.match(covers[0], /This check \(Paycheck, day 15 \)/);
  assert.match(covers[0], /This check \(Paycheck, day 30 \)/);
  assert.match(covers[0], /This check \(Fostering Per Diem Stipend, day 10 \)/);
  assert.match(covers[0], /This check \(Fostering Per Diem Stipend, day 25 \)/);
  const covered = covers[0].split(/covers:<\/b>\s*/).slice(1).map(function (part) { return part.split("</li>")[0]; }).join(" ");
  assert.match(covered, /Car Insurance/);
  assert.doesNotMatch(covered, /Fostering|Health Insurance|Clinic Plan/);
  assert.doesNotMatch(covered.replace(/Car Insurance/g, ""), /\bInsurance\b|Health Insurance|Clinic Plan/);
  assert.match(pieBlock(budget, "bills"), /Insurance<\/span> <b>\$6\.00<\/b>/);
  assert.doesNotMatch(pieBlock(budget, "bills"), /Health Insurance|Health insurance/);
  assert.doesNotMatch(pieBlock(budget, "optional"), /Health Insurance|Health insurance/);
  assert.match(pieBlock(budget, "optional"), /Groceries<\/span> <b>\$3\.00<\/b>/);

  const current = ctx.bankPageHtml(snap, { tab: "current" });
  const tape = current.match(/<table class="bank-tape">[\s\S]*?<\/table>/);
  assert.ok(tape);
  assert.match(tape[0], /class="bank-merchant">Acme Insurance<\/span> <span class="bank-chip">Insurance<\/span>/);
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
  assert.doesNotMatch(dueRow.replace(/data-bank-(?:due|cancel|paidoff-date|paidoff|paid-month|status-undo|status|status-save)="[^"]*"/g, ""), /Acme Insurance/i);
  assert.match(edits, /data-bank-kind="Insurance"/);
  assert.match(edits, /data-bank-kind="Acme Insurance"[\s\S]*?value="needs" selected/);
  assert.match(edits, /aria-label="Tier for Car Insurance"/);
  assert.doesNotMatch(edits, /data-bank-kind="Health insurance"/);
  assert.doesNotMatch(edits, /data-bank-kind="Clinic Plan"/);
  assert.doesNotMatch(edits, /data-bank-kind="prior policy"/);
  assert.doesNotMatch(edits, /data-bank-kind="Fostering Per Diem Stipend"/);
  assert.match(edits, /data-bank-income="Fostering Per Diem Stipend"/);
  assert.match(edits, /aria-label="Amount for Fostering Per Diem Stipend"/);
  assert.match(edits, /aria-label="Day for Fostering Per Diem Stipend"><option value="" selected>Day<\/option>/);
  assert.doesNotMatch(edits, /aria-label="Day for Fostering Per Diem Stipend"><option value="" selected>Default<\/option>/);
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
  assert.match(enteredIncome, />Fostering Per Diem Stipend<\/span> <b>\$40\.00<\/b> <i>per deposit<span class="sep"> · <\/span>2× \/ month<span class="sep"> · <\/span>\$80\.00 \/ month<span class="sep"> · <\/span>days 15 and 25<\/i>/);
  assert.match(entered, /title="Paycheck, Fostering Per Diem Stipend"/);
  assert.match(entered, /<b>25<\/b> <em class="pay" title="Fostering Per Diem Stipend" aria-label="Fostering Per Diem Stipend">Fostering Per Diem Stipend<\/em>/);
  assert.doesNotMatch(entered, /<b>10<\/b> <em class="pay" title="Fostering Per Diem Stipend"/);
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
  assert.match(el.innerHTML, />Fostering Per Diem Stipend<\/span> <b>\$40\.00<\/b> <i>per deposit<span class="sep"> · <\/span>2× \/ month<span class="sep"> · <\/span>\$80\.00 \/ month<span class="sep"> · <\/span>days 15 and 25<\/i>/);
  assert.match(el.innerHTML, /title="Paycheck, Fostering Per Diem Stipend"/);
  assert.match(el.innerHTML, /<b>25<\/b> <em class="pay" title="Fostering Per Diem Stipend" aria-label="Fostering Per Diem Stipend">Fostering Per Diem Stipend<\/em>/);
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
  assert.match(el.innerHTML, />Fostering Per Diem Stipend<\/span> <b>\$0\.00<\/b> <i>per deposit<span class="sep"> · <\/span>2× \/ month<span class="sep"> · <\/span>\$0\.00 \/ month<span class="sep"> · <\/span>days 15 and 25<\/i>/);
  const zeroIncome = el.innerHTML.slice(el.innerHTML.indexOf('class="bank-income"'), el.innerHTML.indexOf('class="bank-bills"'));
  assert.doesNotMatch(zeroIncome, /-\$/);
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
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(src, /Duquesne|Columbia Gas|T-Mobile|M&T|nfcu/i);
  assert.doesNotMatch(css, /Duquesne|Columbia Gas|T-Mobile|M&T|nfcu/i);
  assert.doesNotMatch(page, /Duquesne|Columbia Gas|T-Mobile|M&T|nfcu/i);
  assert.match(src, /prev_key/);
  assert.match(src, /exclusions/);
  assert.match(page, /banking\.js\?v=20261006ec/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dy/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dx/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904du/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dt/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904ds/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dr/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dq/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dp/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904do/);
});

test("tip dr current shows live meters and an in-out bar without linked transfers", function () {
  const ctx = boot();
  const fx = loadFixture();
  const src = fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const htmlFiles = src + "\n" + css + "\n" + page;
  assert.doesNotMatch(htmlFiles, /NFCU|Progressive|UPMC|T-Mobile/i);
  assert.match(css, /\.bank-tape-scroll\s*\{[^}]*max-height:\s*20\.5rem/);
  assert.match(css, /\.bank-tape-scroll\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(css, /\.bank-tape tbody tr\s*\{[^}]*height:\s*2\.05rem/);
  assert.match(css, /\.bank-cap\.under \.fill\s*\{[^}]*background:\s*var\(--go\)/);
  assert.match(css, /\.bank-cap\.over \.fill\s*\{[^}]*background:\s*var\(--stop\)/);
  assert.match(css, /\.bank-io-in\s*\{[^}]*background:\s*var\(--brand-fg\)/);
  assert.match(css, /\.bank-io-out\s*\{[^}]*background:\s*var\(--mix-c\)/);

  const current = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(current, /Balances, money in and out, recent activity/);
  assert.match(current, /October 2026 · as of /);
  assert.match(current, /Day 5 of 31/);
  assert.doesNotMatch(current, /Last closed month · actual/);
  assert.match(current, /Total cash/);
  assert.match(current, /In \/ out · this month/);
  assert.match(current, /Spent so far · actual/);
  assert.match(current, /From the live print — not the plan\./);
  assert.match(current, /October · actual/);
  assert.match(current, /Recent · actual/);
  assert.match(current, /What’s in the print right now\./);
  assert.doesNotMatch(current, /Month-end balances/);
  assert.doesNotMatch(current, /class="bank-spark"/);
  assert.doesNotMatch(current, /data-bar=/);
  assert.equal((current.match(/data-cap="/g) || []).length, 3);

  const rows = ctx.bankCapRows(fx);
  assert.equal(rows[0].label, "Bill");
  assert.equal(rows[0].actual, 0);
  assert.equal(rows[0].limit, 12.34);
  assert.equal(rows[1].label, "Optional");
  assert.equal(rows[1].actual, 42.34);
  assert.equal(Math.round(rows[1].limit * 100), 4868);
  assert.equal(rows[2].label, "Savings");
  assert.equal(rows[2].actual, null);
  assert.equal(rows[2].limit, null);
  assert.match(current, /class="bank-cap under"[^>]*data-cap="bill"/);
  assert.match(current, /class="bank-cap under"[^>]*data-cap="optional"/);
  assert.match(current, /class="bank-cap pending"[^>]*data-cap="savings"/);
  assert.match(current, /Limit pending/);
  assert.doesNotMatch(current.slice(current.indexOf('data-cap="savings"'), current.indexOf('data-cap="savings"') + 500), /role="meter"/);

  const budget = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(budget, /Plan, bills due, progress against limits/);
  assert.match(budget, /Due calendar · plan/);
  assert.match(budget, /<h3>Insights<\/h3>/);
  assert.match(budget, /Required · plan/);
  assert.match(budget, /Needs and Wants · plan/);
  assert.match(budget, /Expected income · plan/);
  assert.match(budget, /Bills · plan/);
  assert.match(budget, /<h3>Progress vs limits<\/h3>/);
  assert.match(budget, /What you planned — and how actuals track the limits\./);
  assert.doesNotMatch(budget, /class="bank-mtd"/);
  assert.doesNotMatch(budget, /Plan check/);
  const hist = ctx.bankPageHtml(fx, { tab: "historical" });
  assert.match(hist, /class="bank-view-title"[^>]*>Historical · October 2026</);
  assert.match(hist, /From the one-time passcode feed\. Blank means the print omitted that figure\./);
  assert.doesNotMatch(hist, /Due calendar · plan/);

  fx.budget.must_pay_budget = 80;
  fx.budget.optional_budget = 10;
  let capped = ctx.bankCapRows(fx);
  assert.equal(capped[0].limit, 80);
  assert.equal(capped[1].limit, 10);
  assert.equal(capped[1].actual, 42.34);
  let overHtml = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(overHtml, /class="bank-cap over"[^>]*data-cap="optional"/);
  assert.match(overHtml, /Limit \$10\.00/);
  assert.doesNotMatch(overHtml, /data-cap="groceries"/);

  fx.budget.mtd_actual_by_category = Object.assign({}, fx.budget.mtd_actual_by_category, { Savings: 25 });
  fx.budget.savings_limit = 20;
  capped = ctx.bankCapRows(fx);
  assert.equal(capped[2].actual, 25);
  assert.equal(capped[2].limit, 20);
  assert.equal(capped[1].actual, 42.34);
  overHtml = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(overHtml, /class="bank-cap over"[^>]*data-cap="savings"/);

  delete fx.budget.savings_limit;
  fx.budget.planned_by_category = Object.assign({}, fx.budget.planned_by_category, { Savings: 40 });
  delete fx.budget.mtd_actual_by_category.Savings;
  capped = ctx.bankCapRows(fx);
  assert.equal(capped[2].limit, 40);
  assert.equal(capped[2].actual, 0);
  fx.budget.savings = 15;
  delete fx.budget.planned_by_category.Savings;
  capped = ctx.bankCapRows(fx);
  assert.equal(capped[2].limit, 15);

  const flowSnap = JSON.parse(JSON.stringify(loadFixture()));
  flowSnap.current.recent_tx = [];
  flowSnap.current.edits_tx = [
    { date: "2026-10-02", id: "acct-check", amount: 100, flow: "inflow", category: "Paycheck/Salary/Wages", tx_key: "pay", desc: "Pay" },
    { date: "2026-10-03", id: "acct-check", amount: 40, flow: "outflow", category: "Transfer", counterparty_id: "acct-share", tx_key: "leg-out", desc: "Move out" },
    { date: "2026-10-03", id: "acct-share", amount: 40, flow: "inflow", category: "Transfer", counterparty_id: "acct-check", tx_key: "leg-in", desc: "Move in" },
    { date: "2026-10-04", id: "acct-check", amount: 10, flow: "outflow", category: "Groceries", tx_key: "groc", desc: "Market" },
    { date: "2026-10-04", id: "acct-check", amount: 15, flow: "outflow", category: "Credit Card Payment", tx_key: "card", desc: "Card" },
    { date: "2026-10-05", id: "acct-check", amount: 7, flow: "outflow", category: "Transfer", external: true, tx_key: "wire", desc: "Outside" },
    { date: "2026-10-05", id: "acct-check", amount: 9, flow: "outflow", category: "Shopping", counterparty_id: "acct-share", tx_key: "pair", desc: "Pair" },
    { date: "2026-10-06", id: "acct-check", amount: 8, flow: "outflow", category: "Transfer", counterparty_id: "acct-outside", tx_key: "foreign", desc: "Foreign" },
    { date: "2026-10-06", id: "acct-check", amount: 3, flow: "outflow", category: "Shopping", internal: true, tx_key: "flag", desc: "Flagged" },
    { date: "2026-09-02", id: "acct-check", amount: 500, flow: "inflow", category: "Paycheck/Salary/Wages", tx_key: "old", desc: "Old pay" }
  ];
  const flow = ctx.bankMonthFlow(flowSnap);
  assert.equal(flow.inSum, 100);
  assert.equal(flow.outSum, 40);
  const flowHtml = ctx.bankPageHtml(flowSnap, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(flowHtml, /aria-label="Incoming \$100\.00, outgoing \$40\.00"/);
  assert.match(flowHtml, /class="bank-io-fill bank-io-in"/);
  assert.match(flowHtml, /class="bank-io-fill bank-io-out"/);
  assert.doesNotMatch(flowHtml, /\$40\.00<\/b><\/div><div class="bank-io-track"[^>]*><span class="bank-io-fill bank-io-in"/);

  const onlyMove = JSON.parse(JSON.stringify(flowSnap));
  onlyMove.current.edits_tx = [
    { date: "2026-10-03", id: "acct-check", amount: 40, flow: "transfer", category: "Transfer", tx_key: "only", desc: "Move" }
  ];
  const quietFlow = ctx.bankMonthFlow(onlyMove);
  assert.equal(quietFlow.any, false);
  assert.match(ctx.bankPageHtml(onlyMove, { tab: "current" }), /No incoming or outgoing in this print/);

  const pending = JSON.parse(JSON.stringify(loadFixture()));
  pending.budget.mtd_actual_by_category = { Savings: 5 };
  pending.budget.planned_by_category = {};
  const pendingRows = ctx.bankCapRows(pending);
  assert.equal(pendingRows[2].actual, 5);
  assert.equal(pendingRows[2].limit, null);
  assert.equal(pendingRows[0].limit, null);
  assert.equal(pendingRows[0].actual, null);
  const pendingHtml = ctx.bankPageHtml(pending, { tab: "current" });
  assert.match(pendingHtml, /data-cap="savings"[\s\S]*?Actual \$5\.00[\s\S]*?Limit pending/);
  assert.doesNotMatch(pendingHtml, /data-cap="savings"[\s\S]{0,400}role="meter"/);
});

test("tip dt counts an unflagged person payment, a partial cash total, and a focusable tape", function () {
  const ctx = boot();
  const src = fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(src + "\n" + css + "\n" + page, /NFCU|Progressive|UPMC|T-Mobile/i);
  assert.match(page, /banking\.js\?v=20261006ec/);
  assert.match(page, /banking\.css\?v=20261006ec/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dy/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dy/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dx/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dx/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904du/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904du/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dt/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dt/);
  const internalFn = src.slice(src.indexOf("function bankIsInternalTransfer"), src.indexOf("function bankFlowSide"));
  assert.doesNotMatch(internalFn, /\\btransfers\?/);
  assert.doesNotMatch(internalFn, /NFCU|Progressive|UPMC|T-Mobile/i);
  assert.match(src, /hashchange/);
  assert.match(src, /function bankViewTitle/);
  assert.match(src, /return "Budget"/);
  assert.match(src, /return "Current"/);
  assert.match(src, /return "Historical"/);
  assert.doesNotMatch(src, /class="bank-tabs"|role="tablist" aria-label="Banking"/);

  function flowOf(rows) {
    const snap = JSON.parse(JSON.stringify(loadFixture()));
    snap.current.recent_tx = [];
    snap.current.edits_tx = rows;
    return ctx.bankMonthFlow(snap);
  }
  const person = flowOf([
    { date: "2026-10-04", id: "acct-check", amount: 21, flow: "outflow", category: "Transfer", tx_key: "p2p", desc: "Person" },
    { date: "2026-10-04", id: "acct-check", amount: 2, flow: "outflow", category: "Transfers", tx_key: "plural", desc: "Also a person" },
    { date: "2026-10-04", id: "acct-check", amount: 4, flow: "inflow", category: "Gifts", tx_key: "gift", desc: "Gift" },
    { date: "2026-10-04", id: "acct-check", amount: 5, flow: "outflow", category: "Transfer", counterparty_id: "acct-share", tx_key: "own", desc: "Own" },
    { date: "2026-10-04", id: "acct-check", amount: 6, flow: "outflow", category: "Shopping", internal: true, tx_key: "flag", desc: "Flag" },
    { date: "2026-10-04", id: "acct-check", amount: 7, flow: "outflow", category: "Shopping", transfer: true, tx_key: "xfer", desc: "Xfer" },
    { date: "2026-10-04", id: "acct-check", amount: 11, flow: "outflow", category: "Shopping", transfer_kind: "internal", tx_key: "kind", desc: "Kind" },
    { date: "2026-10-04", id: "acct-check", amount: 8, flow: "outflow", category: "Transfer", external: true, tx_key: "ext", desc: "Ext" },
    { date: "2026-10-04", id: "acct-check", amount: 9, flow: "outflow", category: "Transfer", counterparty_id: "acct-outside", tx_key: "out", desc: "Outside" }
  ]);
  assert.equal(person.inSum, 4);
  assert.equal(person.outSum, 40);
  const quiet = flowOf([
    { date: "2026-10-04", id: "acct-check", amount: 50, flow: "transfer", category: "Transfer", tx_key: "bare", desc: "No side" }
  ]);
  assert.equal(quiet.any, false);

  const fx = loadFixture();
  const current = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  assert.match(current, /Out is money that left your accounts this month\. Spent so far is category spending month to date\./);
  assert.match(current, /data-total="partial"/);
  assert.match(current, /\$24\.68/);
  assert.match(current, /\(1 account pending\)/);
  assert.doesNotMatch(current, /class="list-cap"|class="bank-tape-scroll"/);
  assertNoTabButtons(current);
  assert.match(current, /data-cap="bill"/);
  assert.match(current, /data-cap="optional"/);
  assert.match(current, /data-cap="savings"/);

  const stated = JSON.parse(JSON.stringify(fx));
  stated.current.total_cash = 100;
  const statedHtml = ctx.bankPageHtml(stated, { tab: "current" });
  assert.match(statedHtml, /data-total="set"/);
  assert.match(statedHtml, /Total cash<\/span> <b>\$100\.00<\/b>/);
  assert.doesNotMatch(statedHtml, /account pending/);

  const two = JSON.parse(JSON.stringify(fx));
  two.current.total_cash = null;
  two.current.balances[2].balance = null;
  const twoHtml = ctx.bankPageHtml(two, { tab: "current" });
  assert.match(twoHtml, /data-total="partial" data-pending="2"><span class="k">Total cash<\/span> <b>\$12\.34<\/b> <i class="bank-total-pending">\(2 accounts pending\)<\/i>/);

  const none = JSON.parse(JSON.stringify(fx));
  none.current.total_cash = null;
  none.current.balances.forEach(function (row) { row.balance = null; });
  const noneHtml = ctx.bankPageHtml(none, { tab: "current" });
  assert.match(noneHtml, /data-total="missing"/);
  assert.match(noneHtml, /data-pending="4"/);
  assert.match(noneHtml, /<b>\u2014<\/b> <i class="bank-total-pending">\(4 accounts pending\)<\/i>/);

  assert.equal(typeof ctx.bankSparkHtml, "undefined");
  assert.equal(typeof ctx.bankSparkSeries, "undefined");
  assert.doesNotMatch(src, /function bankSparkHtml/);
  assert.doesNotMatch(src, /function bankSparkSeries/);
  assert.doesNotMatch(src, /bank-spark/);
  assert.doesNotMatch(css, /\.bank-spark/);
  assert.doesNotMatch(current, /class="bank-spark"/);
  assert.doesNotMatch(current, /Month-end balances/);
});

test("explicit savings limit of zero shows the meter and a caption", function () {
  const ctx = boot();
  const src = fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8");
  assert.doesNotMatch(src, /NFCU|Progressive|UPMC|T-Mobile/i);

  function savingsBlock(html) {
    const i = html.indexOf('data-cap="savings"');
    assert.ok(i >= 0);
    const start = html.lastIndexOf("<div", i);
    return html.slice(start, i + 700);
  }

  const fx = JSON.parse(JSON.stringify(loadFixture()));
  fx.budget.savings_limit = 0;
  fx.budget.savings_gap = -12.34;
  const rows = ctx.bankCapRows(fx);
  assert.equal(rows[2].label, "Savings");
  assert.equal(rows[2].limit, 0);
  assert.equal(rows[2].actual, 0);
  let html = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-05T18:00:00-04:00" });
  let block = savingsBlock(html);
  assert.match(block, /class="bank-cap under"/);
  assert.match(block, /role="meter"/);
  assert.match(block, /Limit \$0\.00/);
  assert.match(block, /Actual \$0\.00/);
  assert.match(block, /class="bank-cap-zero">No room to save this month\. Planned spend is \$12\.34 above income\./);
  assert.doesNotMatch(block, /Limit pending/);
  assert.doesNotMatch(block, /bank-cap pending/);
  assert.equal((html.match(/data-cap="/g) || []).length, 3);

  fx.budget.savings_limit = "0.00";
  delete fx.budget.savings_gap;
  fx.budget.meters_basis = { savings_gap: -4 };
  html = ctx.bankPageHtml(fx, { tab: "current" });
  block = savingsBlock(html);
  assert.match(block, /role="meter"/);
  assert.match(block, /Limit \$0\.00/);
  assert.match(block, /Planned spend is \$4\.00 above income/);
  assert.doesNotMatch(block, /Limit pending/);

  delete fx.budget.meters_basis;
  html = ctx.bankPageHtml(fx, { tab: "current" });
  block = savingsBlock(html);
  assert.match(block, /role="meter"/);
  assert.match(block, /Limit is \$0 because planned spend is above income/);
  assert.doesNotMatch(block, /Limit pending/);
  assert.doesNotMatch(block, /bank-cap pending/);

  delete fx.budget.savings_limit;
  html = ctx.bankPageHtml(fx, { tab: "current" });
  block = savingsBlock(html);
  assert.match(block, /class="bank-cap pending"/);
  assert.match(block, /Limit pending/);
  assert.doesNotMatch(block, /role="meter"/);
  assert.doesNotMatch(block, /No room to save/);
});

test("tip du shows payroll and fostering twice a month on fixed days", function () {
  const ctx = boot();
  const src = fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(src, /BNY|Mellon|UPMC|NFCU/i);
  assert.doesNotMatch(css, /BNY|Mellon|UPMC|NFCU/i);
  assert.doesNotMatch(page, /BNY|Mellon|UPMC|NFCU/i);
  assert.match(page, /\/house\/js\/banking\.js\?v=20261006ec/);
  assert.match(page, /\/house\/banking\.css\?v=20261006ec/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dy/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dy/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dx/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dx/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904du/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dt/);
  assert.doesNotMatch(src, /\+ 14|typical_day \+ 14/);

  assert.equal(ctx.bankIsPayrollIncome("Payroll"), true);
  assert.equal(ctx.bankIsPayrollIncome("PAYCHECK"), true);
  assert.equal(ctx.bankIsPayrollIncome("Side gig"), false);
  assert.equal(ctx.bankIsFosteringIncome("Fostering Per Diem Stipend"), true);
  assert.equal(ctx.bankIsFosteringIncome("per diem stipend"), true);
  assert.equal(ctx.bankIsFosteringIncome("Foster care"), false);
  assert.equal(ctx.bankMonthlyIncomeTotal(50), 50);
  assert.equal(ctx.bankMonthlyIncomeTotal(null), null);

  const fx = loadFixture();
  fx.budget.bills = [{ name: "Rent", amount: 12.34, typical_day: 20, cadence: "monthly" }];
  fx.budget.bills_monthly = [];
  fx.budget.calendar = [];
  fx.budget.income_total = 50;
  fx.budget.income_monthly = [
    {
      label: "Payroll",
      amount: 40,
      cadence: null,
      times_per_month: null,
      amount_basis: "per_deposit",
      typical_day: 3,
      typical_days: [3],
      source: "detected"
    },
    {
      label: "Fostering Per Diem Stipend",
      amount: 10,
      cadence: null,
      typical_day: 4,
      typical_days: [4],
      editable: true
    }
  ];
  const octMonth = fx.history.months.filter(function (m) { return m.month === "2026-10"; })[0];
  octMonth.income_total = 50;
  octMonth.closed = false;

  let html = ctx.bankPageHtml(fx, { tab: "budget" });
  const income = html.slice(html.indexOf('class="bank-income"'), html.indexOf('class="bank-bills"'));
  assert.match(income, />Payroll<\/span> <b>\$40\.00<\/b> <i>per deposit<span class="sep"> · <\/span>2× \/ month<span class="sep"> · <\/span>\$80\.00 \/ month<span class="sep"> · <\/span>days 15 and 30<\/i>/);
  assert.match(income, />Fostering Per Diem Stipend<\/span> <b>\$10\.00<\/b> <i>per deposit<span class="sep"> · <\/span>2× \/ month<span class="sep"> · <\/span>\$20\.00 \/ month<span class="sep"> · <\/span>days 10 and 25<\/i>/);
  assert.doesNotMatch(income, /days 3|day 3|days 4|day 4/);
  assert.match(html, /<b>15<\/b> <em class="pay" title="Payroll" aria-label="Payroll">Payroll<\/em>/);
  assert.match(html, /<b>30<\/b> <em class="pay" title="Payroll" aria-label="Payroll">Payroll<\/em>/);
  assert.match(html, /<b>10<\/b> <em class="pay" title="Fostering Per Diem Stipend" aria-label="Fostering Per Diem Stipend">Fostering Per Diem Stipend<\/em>/);
  assert.match(html, /<b>25<\/b> <em class="pay" title="Fostering Per Diem Stipend" aria-label="Fostering Per Diem Stipend">Fostering Per Diem Stipend<\/em>/);
  assert.doesNotMatch(html, /<b>3<\/b> <em class="pay"/);
  assert.doesNotMatch(html, /<b>4<\/b> <em class="pay"/);
  assert.match(html, /This check \(Payroll, day 15 \) covers:/);
  assert.match(html, /This check \(Payroll, day 30 \) covers:/);
  assert.match(html, /This check \(Fostering Per Diem Stipend, day 10 \)/);
  assert.match(html, /This check \(Fostering Per Diem Stipend, day 25 \)/);
  assert.match(html, /This check \(Payroll, day 15 \) covers:<\/b> Rent/);

  const edited = ctx.bankPageHtml(fx, {
    tab: "budget",
    edits: { income: { "Fostering Per Diem Stipend": { amount: 10, typical_day: 12 } } }
  });
  const editedIncome = edited.slice(edited.indexOf('class="bank-income"'), edited.indexOf('class="bank-bills"'));
  assert.match(editedIncome, /days 12 and 25/);
  assert.match(edited, /<b>12<\/b> <em class="pay" title="Fostering Per Diem Stipend"/);
  assert.match(edited, /<b>25<\/b> <em class="pay" title="Fostering Per Diem Stipend"/);
  assert.doesNotMatch(edited, /<b>10<\/b> <em class="pay" title="Fostering Per Diem Stipend"/);
  const edits = ctx.bankPageHtml(fx, { tab: "edits" });
  assert.match(edits, /aria-label="Day for Fostering Per Diem Stipend"><option value="" selected>Day<\/option>/);
  assert.match(edits, /Days 10 and 25\. A day here replaces the 10th\. The 25th stays\./);
  assert.doesNotMatch(edits, /data-bank-income-field="day2"/);

  function monthOf(asof) {
    fx.asof = asof;
    return ctx.bankPageHtml(fx, { tab: "budget" });
  }
  const feb = monthOf("2026-02-10T12:00:00-05:00");
  assert.match(feb, /<b>13<\/b> <em class="pay" title="Payroll" aria-label="Payroll">Payroll<\/em>/);
  assert.match(feb, /<b>27<\/b> <em class="pay" title="Payroll" aria-label="Payroll">Payroll<\/em>/);
  assert.match(feb, /days 13 and 27/);
  assert.doesNotMatch(feb, /Payroll \(31st\)|\(28th\)/);
  assert.match(feb, /This check \(Payroll, day 27 \)/);
  const apr = monthOf("2026-04-10T12:00:00-04:00");
  assert.match(apr, /<b>30<\/b> <em class="pay" title="Payroll" aria-label="Payroll">Payroll<\/em>/);
  assert.match(apr, /days 15 and 30/);
  const leap = monthOf("2028-02-10T12:00:00-05:00");
  assert.match(leap, /<b>29<\/b> <em class="pay" title="Payroll" aria-label="Payroll">Payroll<\/em>/);
  assert.doesNotMatch(leap, /Payroll \(31st\)/);

  fx.asof = "2026-10-05T12:00:00-04:00";
  fx.budget.income_monthly = [
    { label: "Paycheck", amount: 10, cadence: "biweekly", amount_monthly: 30, typical_day: 2, typical_days: [2] },
    { label: "PER DIEM STIPEND", amount: 7, cadence: "monthly", typical_day: null },
    { label: "Side gig", amount: 8, cadence: "semi_monthly", typical_day: 4 },
    { label: "Other draw", amount: 5, cadence: "2x", times_per_month: 2, typical_days: [6, 20], typical_day: 6 }
  ];
  fx.budget.bills = [];
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  const plan = html.slice(html.indexOf('class="bank-income"'), html.indexOf('class="bank-bill-list"') >= 0 ? html.indexOf('class="bank-bill-list"') : html.length);
  assert.match(plan, />Paycheck<\/span> <b>\$10\.00<\/b> <i>per deposit<span class="sep"> · <\/span>2× \/ month<span class="sep"> · <\/span>\$30\.00 \/ month<span class="sep"> · <\/span>days 15 and 30<\/i>/);
  assert.match(plan, />PER DIEM STIPEND<\/span> <b>\$7\.00<\/b> <i>per deposit<span class="sep"> · <\/span>2× \/ month<span class="sep"> · <\/span>\$14\.00 \/ month<span class="sep"> · <\/span>days 10 and 25<\/i>/);
  assert.match(plan, />Side gig<\/span> <b>\$8\.00<\/b> <i>per deposit<span class="sep"> · <\/span>2× \/ month<span class="sep"> · <\/span>\$16\.00 \/ month<span class="sep"> · <\/span>day 4<\/i>/);
  assert.match(plan, />Other draw<\/span> <b>\$5\.00<\/b> <i>per deposit<span class="sep"> · <\/span>2× \/ month<span class="sep"> · <\/span>\$10\.00 \/ month<span class="sep"> · <\/span>days 6 and 20<\/i>/);
  assert.match(html, /<b>4<\/b> <em class="pay" title="Side gig"/);
  assert.doesNotMatch(html, /<b>18<\/b> <em class="pay" title="Side gig"/);
  assert.match(html, /<b>6<\/b> <em class="pay" title="Other draw"/);
  assert.match(html, /<b>20<\/b> <em class="pay" title="Other draw"/);
  assert.doesNotMatch(html, /<b>2<\/b> <em class="pay" title="Paycheck"/);

  fx.budget.income_monthly = [{ label: "Side gig", amount: 8, cadence: "twice_monthly" }];
  fx.budget.bills = [];
  fx.budget.calendar = [];
  html = ctx.bankPageHtml(fx, { tab: "budget" });
  assert.match(html, /Due days need more history/);
  assert.match(html, /per deposit<span class="sep"> · <\/span>2× \/ month<span class="sep"> · <\/span>\$16\.00 \/ month/);
  assert.doesNotMatch(html, /<em class="pay"/);

  const current = ctx.bankPageHtml(fx, { tab: "current" });
  const block = current.slice(current.indexOf('class="bank-pie-block bank-mtd"'), current.indexOf("</section>", current.indexOf('class="bank-pie-block bank-mtd"')));
  assert.match(block, /Income received<\/span> <b>\$50\.00<\/b>/);
  assert.doesNotMatch(block, /\$100\.00|\$16\.00|\$80\.00/);
  const hist = ctx.bankPageHtml(fx, { tab: "historical", year: "2026", month: "year" });
  assert.match(hist, /2026-10 · in progress<\/td><td>\$50\.00/);
  assert.doesNotMatch(hist, /2026-10 · in progress<\/td><td>\$100\.00/);
  assert.match(hist, /2026-08<\/td><td>\$12\.34/);
});

function billLine(html, name) {
  const listAt = html.indexOf('class="bank-bill-list"');
  let start = listAt;
  if (start < 0) {
    const head = html.indexOf("<h3>Bills</h3>");
    start = html.indexOf('class="bank-edit-list"', head);
  }
  assert.ok(start >= 0, "bill list");
  const slice = html.slice(start);
  const at = slice.indexOf(">" + name);
  assert.ok(at >= 0, name);
  const li = slice.lastIndexOf("<li", at);
  return slice.slice(li >= 0 ? li : at, slice.indexOf("</li>", at));
}

function planBit(html, key) {
  const i = html.indexOf('data-plan="' + key + '"');
  assert.ok(i >= 0, key);
  return html.slice(i, html.indexOf("</span>", i));
}

test("tip dx uses the effective-dated bill amount and a paid-late flag", function () {
  const ctx = boot();
  const src = fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8");
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(page, /banking\.js\?v=20261006ec/);
  assert.match(page, /banking\.css\?v=20261006ec/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dy/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dy/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dx/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dx/);
  assert.equal(typeof ctx.bankBillAmountForMonth, "function");
  assert.equal(typeof ctx.bankMatchBillPayment, "undefined");
  assert.doesNotMatch(src, /function bankMatchBill/);

  assert.equal(ctx.bankBillAmountForMonth({ amount: 1200 }, "2026-09"), 1200);
  assert.equal(ctx.bankBillAmountForMonth({ amount: 1200, prev_amount: 1000 }, "2026-09"), 1200);
  assert.equal(ctx.bankBillAmountForMonth({ amount: 1200, effective_from: "2026-10-01" }, "2026-09"), 1200);
  const dated = { amount: 1200, prev_amount: 1000, effective_from: "2026-10-01" };
  assert.equal(ctx.bankBillAmountForMonth(dated, "2026-09"), 1000);
  assert.equal(ctx.bankBillAmountForMonth(dated, "2026-10"), 1200);
  assert.equal(ctx.bankBillAmountForMonth(dated, "2026-11"), 1200);
  assert.equal(ctx.bankBillAmountForMonth(dated, { year: 2026, month: 9 }), 1000);

  const merged = ctx.bankNormalizeBills({
    bills: [{
      name: "Mortgage",
      amount: 1200,
      typical_day: 1,
      prev_amount: 1000,
      effective_from: "2026-10-01",
      amount_basis: "manual_override",
      history_median: 1000
    }],
    bills_monthly: [
      {
        label: "Mortgage",
        amount: 50,
        due_day: 1,
        prev_amount: 1000,
        effective_from: "2026-10-01",
        paid_current_month: {
          month: "2026-10",
          status: "paid_late",
          paid_date: "2026-10-05",
          due_date: "2026-10-01",
          days_late: 4,
          tx_key: null
        }
      },
      {
        label: "Home Loan",
        amount: 1200,
        due_day: 3,
        prev_amount: 1000,
        effective_from: "2026-10-01",
        amount_basis: "manual_override",
        history_median: 1000
      }
    ]
  });
  assert.equal(merged.length, 2);
  assert.equal(merged[0].name, "Mortgage");
  assert.equal(merged[0].amount, 1200);
  assert.equal(merged[0].prev_amount, 1000);
  assert.equal(merged[0].effective_from, "2026-10-01");
  assert.equal(merged[0].amount_basis, "manual_override");
  assert.equal(merged[0].history_median, 1000);
  assert.equal(merged[0].paid_current_month.status, "paid_late");
  assert.equal(merged[0].paid_current_month.tx_key, null);
  assert.equal(merged[0].typical_day, 1);
  assert.equal(merged[1].name, "Home Loan");
  assert.equal(merged[1].prev_amount, 1000);
  assert.equal(merged[1].effective_from, "2026-10-01");

  const split = ctx.bankNormalizeBills({
    bills: [{ name: "Mortgage", amount: 1200, typical_day: 1 }],
    bills_monthly: [{
      label: "Mortgage",
      due_day: 1,
      prev_amount: 1000,
      effective_from: "2026-10-01",
      amount_basis: "manual_override",
      history_median: 1000,
      paid_current_month: { month: "2026-10", status: "paid_late", paid_date: "2026-10-05", due_date: "2026-10-01", days_late: 4, tx_key: null }
    }]
  });
  assert.equal(split.length, 1);
  assert.equal(split[0].amount, 1200);
  assert.equal(split[0].prev_amount, 1000);
  assert.equal(split[0].effective_from, "2026-10-01");
  assert.equal(split[0].amount_basis, "manual_override");
  assert.equal(split[0].history_median, 1000);
  assert.equal(split[0].paid_current_month.days_late, 4);

  const over = ctx.bankNormalizeBills({
    bills: [{ name: "Mortgage", amount: 1000, effective_from: "2026-10-01", typical_day: 1 }],
    overrides: [{ match: "Mortgage", field: "amount", value: 1200 }]
  })[0];
  assert.equal(over.amount, 1000);
  assert.equal(over.override_amount, 1200);
  assert.equal(ctx.bankBillAmountForMonth(over, "2026-09"), 1000);
  assert.equal(ctx.bankBillAmountForMonth(over, "2026-10"), 1200);
  assert.equal(ctx.bankBillAmountForMonth(over, "2026-11"), 1200);

  const overDated = ctx.bankNormalizeBills({
    bills: [{ name: "Home Loan", amount: 1000, typical_day: 2 }],
    overrides: [{ match: "Home Loan", field: "amount", value: 1200, effective_from: "2026-10-01" }]
  })[0];
  assert.equal(overDated.effective_from, "2026-10-01");
  assert.equal(ctx.bankBillAmountForMonth(overDated, "2026-09"), 1000);
  assert.equal(ctx.bankBillAmountForMonth(overDated, "2026-10"), 1200);

  const fx = loadFixture();
  fx.asof = "2026-10-05T12:00:00-04:00";
  fx.budget.bills = [
    {
      name: "Mortgage",
      amount: 1200,
      typical_amount: 40,
      prev_amount: 1000,
      effective_from: "2026-10-01",
      typical_day: 1,
      amount_basis: "manual_override",
      history_median: 1000,
      paid_current_month: {
        month: "2026-10",
        status: "paid_late",
        paid_date: "2026-10-05",
        due_date: "2026-10-01",
        days_late: 4,
        tx_key: null
      }
    },
    { name: "Electric", amount: 50, typical_day: 15 }
  ];
  fx.budget.bills_monthly = [{
    label: "Mortgage",
    amount: 1200,
    due_day: 1,
    prev_amount: 1000,
    effective_from: "2026-10-01",
    paid_current_month: {
      month: "2026-10",
      status: "paid_late",
      paid_date: "2026-10-05",
      due_date: "2026-10-01",
      days_late: 4,
      tx_key: null
    }
  }];
  fx.budget.overrides = [];
  fx.budget.bills_total = 1250;
  fx.budget.must_pay_budget = 1250;
  fx.budget.left_after_bills = 400;
  fx.budget.calendar = [];
  fx.current.recent_tx = [];
  fx.current.edits_tx = [];

  function monthHtml(plan) {
    return ctx.bankPageHtml(fx, { tab: "budget", planMonth: plan });
  }
  const sep = monthHtml("2026-09");
  const oct = monthHtml("2026-10");
  const nov = monthHtml("2026-11");
  assert.match(sep, /aria-label="September 2026"/);
  assert.match(oct, /aria-label="October 2026"/);
  assert.match(nov, /aria-label="November 2026"/);
  assert.match(sep, /title="Mortgage \$1,000\.00"/);
  assert.match(oct, /title="Mortgage \$1,200\.00"/);
  assert.match(nov, /title="Mortgage \$1,200\.00"/);
  assert.doesNotMatch(sep, /title="Mortgage \$1,200\.00"/);

  const sepBill = billLine(sep, "Mortgage");
  const octBill = billLine(oct, "Mortgage");
  const novBill = billLine(nov, "Mortgage");
  assert.match(sepBill, /\$1,000\.00/);
  assert.doesNotMatch(sepBill, /\$1,200\.00|\$40\.00/);
  assert.match(octBill, /\$1,200\.00/);
  assert.doesNotMatch(octBill, /\$1,000\.00|\$40\.00/);
  assert.match(novBill, /\$1,200\.00/);
  assert.match(billLine(sep, "Electric"), /\$50\.00/);
  assert.match(billLine(nov, "Electric"), /\$50\.00/);
  const octList = oct.slice(oct.indexOf('class="bank-bill-list"'), oct.indexOf("</ul>", oct.indexOf('class="bank-bill-list"')));
  assert.equal((octList.match(/Mortgage/g) || []).length, 1);

  assert.match(octBill, /New amount from Oct 1/);
  assert.match(octBill, /Paid late<span class="sep"> · <\/span>Oct 5/);
  assert.match(octBill, /data-paid="paid_late"/);
  assert.doesNotMatch(sepBill, /New amount from|Paid late|data-paid/);
  assert.doesNotMatch(novBill, /New amount from|Paid late|Paid ·/);

  assert.match(planBit(oct, "dues"), /\$1,250\.00/);
  assert.match(planBit(oct, "left-after-bills"), /\$400\.00/);
  assert.doesNotMatch(planBit(oct, "dues"), /\$1,450\.00/);
  assert.match(planBit(sep, "dues"), /\$1,050\.00/);
  assert.match(planBit(sep, "left-after-bills"), /\$600\.00/);
  assert.match(planBit(nov, "dues"), /\$1,250\.00/);
  assert.match(planBit(nov, "left-after-bills"), /\$400\.00/);

  const totalsOct = ctx.bankPlanTotals(fx, "2026-10");
  assert.equal(totalsOct.bills_total, 1250);
  assert.equal(totalsOct.must_pay, 1250);
  assert.equal(totalsOct.left_after_bills, 400);
  assert.equal(totalsOct.delta, 0);
  const totalsSep = ctx.bankPlanTotals(fx, "2026-09");
  assert.equal(totalsSep.delta, -200);
  assert.equal(totalsSep.bills_total, 1050);
  assert.equal(totalsSep.left_after_bills, 600);
  assert.equal(ctx.bankCapRows(fx)[0].limit, 1250);
  assert.equal(ctx.bankCapRows(fx, "2026-10")[0].limit, 1250);
  assert.equal(ctx.bankCapRows(fx, "2026-09")[0].limit, 1050);
  assert.equal(ctx.bankCapRows(fx, "2026-11")[0].limit, 1250);
  const current = ctx.bankPageHtml(fx, { tab: "current" });
  const meter = current.slice(current.indexOf('data-cap="bill"'), current.indexOf('data-cap="bill"') + 500);
  assert.match(meter, /Limit \$1,250\.00/);
  assert.doesNotMatch(meter, /\$1,450\.00|\$1,050\.00/);

  const edits = { bills: { Mortgage: { amount: 1500 } } };
  const userSep = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-09", edits: edits });
  const userOct = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", edits: edits });
  assert.match(billLine(userSep, "Mortgage"), /\$1,500\.00/);
  assert.doesNotMatch(billLine(userSep, "Mortgage"), /\$1,000\.00/);
  assert.match(userSep, /title="Mortgage \$1,500\.00"/);
  assert.match(billLine(userOct, "Mortgage"), /\$1,500\.00/);
  assert.doesNotMatch(billLine(userOct, "Mortgage"), /\$1,200\.00/);
  assert.match(userOct, /title="Mortgage \$1,500\.00"/);
  assert.equal(ctx.bankPlanTotals(fx, "2026-10").bills_total, 1250);

  const editSep = ctx.bankPageHtml(fx, { tab: "edits", planMonth: "2026-09" });
  const editOct = ctx.bankPageHtml(fx, { tab: "edits", planMonth: "2026-10" });
  assert.match(billLine(editSep, "Mortgage"), /\$1,000\.00/);
  assert.doesNotMatch(billLine(editSep, "Mortgage"), /Paid late/);
  assert.match(billLine(editOct, "Mortgage"), /\$1,200\.00/);
  assert.match(billLine(editOct, "Mortgage"), /New amount from Oct 1/);
  assert.match(billLine(editOct, "Mortgage"), /Paid late<span class="sep"> · <\/span>Oct 5/);
  const editUser = ctx.bankPageHtml(fx, { tab: "edits", planMonth: "2026-11", edits: edits });
  assert.match(billLine(editUser, "Mortgage"), /\$1,500\.00/);
  assert.doesNotMatch(billLine(editUser, "Mortgage"), /\$1,200\.00/);

  const onTimeFx = JSON.parse(JSON.stringify(fx));
  onTimeFx.budget.bills[0].paid_current_month = {
    month: "2026-10",
    status: "paid",
    paid_date: "2026-10-01",
    due_date: "2026-10-01",
    days_late: 0,
    tx_key: null
  };
  const onTime = ctx.bankPageHtml(onTimeFx, { tab: "budget", planMonth: "2026-10" });
  assert.match(billLine(onTime, "Mortgage"), /Paid<span class="sep"> · <\/span>Oct 1/);
  assert.doesNotMatch(billLine(onTime, "Mortgage"), /Paid late/);

  const leakFx = JSON.parse(JSON.stringify(fx));
  leakFx.budget.bills = [{ name: "Home Loan", amount: 1000, effective_from: "2026-10-01", typical_day: 1 }];
  leakFx.budget.bills_monthly = [];
  leakFx.budget.overrides = [{ match: "Home Loan", field: "amount", value: 1200 }];
  leakFx.budget.bills_total = 1200;
  leakFx.budget.must_pay_budget = 1200;
  leakFx.budget.left_after_bills = 100;
  const leakSep = ctx.bankPageHtml(leakFx, { tab: "budget", planMonth: "2026-09" });
  const leakOct = ctx.bankPageHtml(leakFx, { tab: "budget", planMonth: "2026-10" });
  assert.match(billLine(leakSep, "Home Loan"), /\$1,000\.00/);
  assert.doesNotMatch(billLine(leakSep, "Home Loan"), /\$1,200\.00/);
  assert.match(billLine(leakOct, "Home Loan"), /\$1,200\.00/);
  assert.match(planBit(leakOct, "dues"), /\$1,200\.00/);
  assert.doesNotMatch(planBit(leakOct, "dues"), /\$1,400\.00/);
  assert.match(planBit(leakSep, "dues"), /\$1,000\.00/);
  assert.match(planBit(leakSep, "left-after-bills"), /\$300\.00/);
  assert.match(planBit(leakOct, "left-after-bills"), /\$100\.00/);

  const el = mount(ctx, fx, { tab: "budget", now: "2026-10-05T18:00:00-04:00" });
  assert.match(el.innerHTML, /aria-label="October 2026"/);
  const next = {
    getAttribute: function (name) { return name === "data-bank-plan" ? "1" : null; },
    closest: function (sel) { return sel === "[data-bank-plan]" ? next : null; }
  };
  el.listeners.click({ target: next, preventDefault: function () {} });
  assert.match(el.innerHTML, /aria-label="November 2026"/);
  assert.match(billLine(el.innerHTML, "Mortgage"), /\$1,200\.00/);
  assert.doesNotMatch(billLine(el.innerHTML, "Mortgage"), /New amount from/);
  const prev = {
    getAttribute: function (name) { return name === "data-bank-plan" ? "-1" : null; },
    closest: function (sel) { return sel === "[data-bank-plan]" ? prev : null; }
  };
  el.listeners.click({ target: prev, preventDefault: function () {} });
  el.listeners.click({ target: prev, preventDefault: function () {} });
  assert.match(el.innerHTML, /aria-label="September 2026"/);
  assert.match(billLine(el.innerHTML, "Mortgage"), /\$1,000\.00/);
  assert.doesNotMatch(billLine(el.innerHTML, "Mortgage"), /Paid late/);

  const hist = ctx.bankPageHtml(fx, { tab: "historical", year: "2026", month: "2026-09" });
  assert.doesNotMatch(hist, /New amount from|Paid late|data-plan="dues"/);
  assert.match(hist, /2026-09/);
});

test("tip dy plan blocks follow the selected month", function () {
  const ctx = boot();
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(page, /banking\.js\?v=20261006ec/);
  assert.match(page, /banking\.css\?v=20261006ec/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dy/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dy/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dx/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dx/);

  assert.equal(ctx.bankEffectiveText("2026-10-01"), "2026-10-01");
  assert.equal(ctx.bankEffectiveText("2026-10-01T02:00Z"), "2026-09-30");
  assert.equal(ctx.bankEffectiveText("2026-10-01T02:00:00+00:00"), "2026-09-30");
  assert.equal(ctx.bankEffectiveText("2026-10-01T06:00:00-04:00"), "2026-10-01");
  assert.equal(ctx.bankMonthKey("2026-10"), "2026-10");
  assert.equal(ctx.bankMonthKey("2026-10-01"), "2026-10");
  assert.equal(ctx.bankMonthKey("2026-10-01T02:00Z"), "2026-09");
  assert.equal(ctx.bankShortDate("2026-10-01"), "Oct 1");
  assert.equal(ctx.bankShortDate("2026-10-01T02:00Z"), "Sep 30");

  const zoned = ctx.bankNormalizeBills({
    bills: [{
      name: "Mortgage",
      amount: 1200,
      prev_amount: 1000,
      effective_from: "2026-10-01T02:00Z",
      typical_day: 1,
      paid_current_month: {
        month: "2026-10-01T02:00Z",
        status: "paid_late",
        paid_date: "2026-10-01T02:00Z",
        due_date: "2026-10-01T02:00Z",
        days_late: 1,
        tx_key: null
      }
    }]
  })[0];
  assert.equal(zoned.effective_from, "2026-09-30");
  assert.equal(zoned.paid_current_month.month, "2026-09");
  assert.equal(zoned.paid_current_month.paid_date, "2026-09-30");
  assert.equal(zoned.paid_current_month.due_date, "2026-09-30");
  assert.equal(ctx.bankBillAmountForMonth(zoned, "2026-08"), 1000);
  assert.equal(ctx.bankBillAmountForMonth(zoned, "2026-09"), 1200);
  assert.equal(ctx.bankShortDate(zoned.paid_current_month.paid_date), "Sep 30");

  const fx = loadFixture();
  fx.asof = "2026-10-05T12:00:00-04:00";
  fx.budget.bills = [{
    name: "Mortgage",
    amount: 1200,
    prev_amount: 1000,
    effective_from: "2026-10-01",
    typical_day: 1
  }];
  fx.budget.bills_monthly = [];
  fx.budget.overrides = [];
  fx.budget.mtd_actual_by_category = { Mortgage: 1200, Groceries: 30 };
  fx.budget.planned_by_category = { Mortgage: 1200, Groceries: 12.34 };
  const sep = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-09" });
  const oct = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  const sepPie = pieBlock(sep, "bills");
  const octPie = pieBlock(oct, "bills");
  assert.match(sepPie, /Mortgage<\/span> <b>\$1,000\.00<\/b>/);
  assert.doesNotMatch(sepPie, /Mortgage<\/span> <b>\$1,200\.00<\/b>/);
  assert.match(octPie, /Mortgage<\/span> <b>\$1,200\.00<\/b>/);
  assert.match(billLine(sep, "Mortgage"), /\$1,000\.00/);
  assert.match(pieBlock(sep, "optional"), /Groceries<\/span> <b>\$30\.00<\/b>/);
  const sepBars = sep.slice(sep.indexOf('class="bank-bars"'));
  const octBars = oct.slice(oct.indexOf('class="bank-bars"'));
  assert.match(sepBars, /<p class="bank-bar-note">Bars show Oct spending so far, not this month(?:'|&#39;)s\.<\/p>/);
  assert.match(sepBars, /data-bar="Mortgage"[\s\S]*?Actual \$1,200\.00[\s\S]*?Limit \$1,000\.00/);
  assert.match(sepBars, /data-bar="Groceries"[\s\S]*?Actual \$30\.00[\s\S]*?Limit \$12\.34/);
  assert.doesNotMatch(oct, /Bars show Oct spending so far/);
  assert.doesNotMatch(oct, /bank-bar-note/);
  assert.match(octBars, /data-bar="Mortgage"[\s\S]*?Actual \$1,200\.00[\s\S]*?Limit \$1,200\.00/);
  assert.match(octBars, /<h3>Progress vs limits<\/h3>/);

  const face = css.slice(css.indexOf(".bank-cal-nav {"), css.indexOf(".bank-cal-nav::before"));
  assert.match(face, /min-width:\s*28px/);
  assert.match(face, /min-height:\s*28px/);
  const hit = css.slice(css.indexOf(".bank-cal-nav::before"), css.indexOf(".bank-cal-nav::before") + 320);
  assert.match(hit, /width:\s*44px/);
  assert.match(hit, /height:\s*44px/);
  assert.match(hit, /position:\s*absolute/);
});

test("tip dz twice-monthly bills, set-asides, deposits, and dy polish", function () {
  const ctx = boot();
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(page, /banking\.js\?v=20261006ec/);
  assert.match(page, /banking\.css\?v=20261006ec/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904dy/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904dy/);

  const shares = ctx.bankPercentShares([1, 1, 1]);
  assert.deepEqual(Array.from(shares), [34, 33, 33]);
  assert.equal(shares[0] + shares[1] + shares[2], 100);
  const rank = ctx.bankRankHtml([
    { name: "A", amount: 1 },
    { name: "B", amount: 1 },
    { name: "C", amount: 1 }
  ]);
  assert.match(rank, /A<\/span> <b>\$1\.00<\/b> <i>34%/);
  assert.match(rank, /B<\/span> <b>\$1\.00<\/b> <i>33%/);
  assert.match(rank, /C<\/span> <b>\$1\.00<\/b> <i>33%/);

  const dated = ctx.bankNormalizeBills({
    bills: [{ name: "Mortgage", amount: 1200, prev_amount: 1000, effective_from: "2026-10", typical_day: 1 }]
  })[0];
  assert.equal(dated.effective_from, "2026-10-01");
  assert.equal(ctx.bankBillAmountForMonth(dated, "2026-09"), 1000);
  assert.equal(ctx.bankBillAmountForMonth(dated, "2026-10"), 1200);

  const fx = loadFixture();
  fx.asof = "2026-10-05T12:00:00-04:00";
  fx.budget.bills = [
    {
      name: "Water",
      amount: 50,
      prev_amount: 40,
      cadence: "twice_monthly",
      times_per_month: 2,
      typical_days: [15, 28],
      typical_day: 15,
      monthly_amount: 100,
      kind: "bill",
      amount_basis: "per_occurrence",
      effective_from: "2026-10-01",
      prev_key: "old-water",
      aliases: ["Secret Alias"]
    },
    {
      name: "Buffer",
      amount: 40,
      due_day: null,
      kind: "set_aside",
      confidence: "low",
      note: "Winter often over $100 <b>nope</b>"
    }
  ];
  fx.budget.bills_monthly = [];
  fx.budget.calendar = [];
  fx.budget.calendar_unscheduled = ["Buffer"];
  fx.budget.removed_bills = ["Old Rollup"];
  fx.budget.overrides = [];
  fx.budget.bills_total = 140;
  fx.budget.must_pay_budget = 140;
  fx.budget.left_after_bills = 50;
  fx.budget.mtd_actual_by_category = {};
  fx.budget.planned_by_category = { Groceries: 12.34 };
  fx.budget.income_monthly = [{
    label: "Side gig",
    amount: 8,
    cadence: "twice_monthly",
    times_per_month: 2,
    typical_days: [10, 25],
    typical_day: 10
  }];
  fx.budget.income_total = 210;
  fx.budget.income_per_deposit_total = 110;
  fx.current.recent_tx = [];
  fx.current.edits_tx = [];

  const oct = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  const sep = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-09" });
  const water = billLine(oct, "Water");
  assert.match(water, /\$50\.00/);
  assert.match(water, /2× \/ month<span class="sep"> · <\/span>\$100\.00 \/ mo/);
  assert.doesNotMatch(water, /day 15|Secret Alias|old-water/);
  assert.equal((oct.match(/title="Water \$50\.00"/g) || []).length, 2);
  assert.match(oct, /<b>15<\/b> <span title="Water \$50\.00"/);
  assert.match(oct, /<b>28<\/b> <span title="Water \$50\.00"/);
  assert.match(oct, /This check \(Side gig, day 10 \) covers:<\/b> Water/);
  assert.match(oct, /This check \(Side gig, day 25 \) covers:<\/b> Water/);
  const coverBits = oct.split(/covers:<\/b>\s*/).slice(1).map(function (part) { return part.split("</li>")[0]; });
  coverBits.forEach(function (bit) {
    assert.ok((bit.match(/Water/g) || []).length <= 1);
  });

  assert.match(planBit(oct, "dues"), /\$140\.00/);
  assert.doesNotMatch(planBit(oct, "dues"), /\$240\.00|\$190\.00|\$280\.00/);
  assert.match(planBit(sep, "dues"), /\$120\.00/);
  assert.doesNotMatch(planBit(sep, "dues"), /\$130\.00/);
  assert.match(pieBlock(oct, "bills"), /Water<\/span> <b>\$100\.00<\/b>/);
  assert.doesNotMatch(pieBlock(oct, "bills"), /Water<\/span> <b>\$50\.00<\/b>|Water<\/span> <b>\$200\.00<\/b>/);
  assert.match(pieBlock(sep, "bills"), /Water<\/span> <b>\$80\.00<\/b>/);

  const buffer = billLine(oct, "Buffer");
  assert.match(buffer, /Set-aside<span class="sep"> · <\/span>no due day/);
  assert.match(buffer, /Low confidence<span class="sep"> · <\/span>Winter often over \$100 &lt;b&gt;nope&lt;\/b&gt;/);
  assert.match(buffer, /\$40\.00/);
  assert.doesNotMatch(buffer, /day null|NaN|\$0\.00|<b>nope<\/b>/);
  const cal = oct.slice(oct.indexOf('class="bank-cal"'), oct.indexOf('class="bank-insight-block"'));
  assert.doesNotMatch(cal, /Buffer/);
  assert.doesNotMatch(oct, /Secret Alias|old-water/);
  assert.match(pieBlock(oct, "bills"), /Buffer<\/span> <b>\$40\.00<\/b>/);

  const stale = ctx.bankPageHtml(fx, {
    tab: "budget",
    planMonth: "2026-10",
    edits: { bills: { "Old Rollup": { amount: 500 }, "Gone Bill": { amount: 500 } } }
  });
  assert.doesNotMatch(stale, /Old Rollup|Gone Bill|\$500\.00/);
  assert.match(planBit(stale, "dues"), /\$140\.00/);

  fx.budget.bills.push({ name: "Old Rollup", amount: 20, typical_day: 3, kind: "bill" });
  fx.budget.bills_total = 160;
  const kept = ctx.bankPageHtml(fx, {
    tab: "budget",
    planMonth: "2026-10",
    edits: { bills: { "Old Rollup": { amount: 500 } } }
  });
  assert.match(billLine(kept, "Old Rollup"), /\$20\.00/);
  assert.doesNotMatch(billLine(kept, "Old Rollup"), /\$500\.00/);

  fx.asof = "2026-02-10T12:00:00-05:00";
  fx.budget.bills[0].typical_days = [15, "EOM"];
  fx.budget.bills[0].typical_day = 15;
  const feb = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-02" });
  assert.match(feb, /<b>15<\/b> <span title="Water \$40\.00"/);
  assert.match(feb, /<b>27<\/b> <span title="Water \$40\.00"/);
  assert.match(feb, /moved from Sat Feb 28/);
  assert.equal((feb.match(/title="Water \$40\.00"/g) || []).length, 2);
  assert.doesNotMatch(feb, /<b>31<\/b> <span title="Water/);

  const barsFx = loadFixture();
  barsFx.asof = "2026-10-05T12:00:00-04:00";
  barsFx.budget.mtd_actual_by_category = { Groceries: 30, Shopping: 12.34 };
  barsFx.budget.planned_by_category = { Groceries: 12.34, Shopping: 24 };
  const barsSep = ctx.bankPageHtml(barsFx, { tab: "budget", planMonth: "2026-09" });
  const barsOct = ctx.bankPageHtml(barsFx, { tab: "budget", planMonth: "2026-10" });
  assert.doesNotMatch(barsSep, /class="bank-bar over"/);
  assert.match(barsOct, /class="bank-bar over"[^>]*data-bar="Groceries"/);

  const focusRoot = mount(ctx, barsFx, { tab: "budget" });
  focusRoot.querySelector = function (sel) {
    return { focus: function () { focusRoot._focused = sel; } };
  };
  const next = {
    getAttribute: function (name) { return name === "data-bank-plan" ? "1" : null; },
    closest: function (sel) { return sel === "[data-bank-plan]" ? next : null; }
  };
  focusRoot.listeners.click({ target: next, preventDefault: function () {} });
  assert.equal(focusRoot._focused, '[data-bank-plan="1"]');

  const pay = loadFixture();
  pay.asof = "2026-10-05T12:00:00-04:00";
  pay.budget.bills = [{ name: "Rent", amount: 20, typical_day: 12 }];
  pay.budget.bills_monthly = [];
  pay.budget.calendar = [];
  pay.budget.income_total = 210;
  pay.budget.income_per_deposit_total = 110;
  pay.budget.income_monthly = [{
    label: "Side gig",
    amount: 5,
    cadence: "twice_monthly",
    times_per_month: 2,
    monthly_amount: 210,
    typical_days: [10, 25],
    typical_day: 10,
    typical_day_2: 25,
    editable: true,
    deposits: [{ day: 10, amount: 110 }, { day: 25, amount: 100 }]
  }];
  pay.current.recent_tx = [];
  pay.current.edits_tx = [];
  const payHtml = ctx.bankPageHtml(pay, { tab: "budget", planMonth: "2026-10" });
  const payLine = payHtml.slice(payHtml.indexOf('class="bank-income"'), payHtml.indexOf('class="bank-bills"'));
  assert.match(payLine, /\$110\.00 on the 10th<span class="sep"> · <\/span>\$100\.00 on the 25th<span class="sep"> · <\/span>\$210\.00 \/ mo/);
  assert.doesNotMatch(payLine, /\$420\.00|\$110\.00 \/ mo/);
  assert.match(payHtml, /title="Side gig \$110\.00"/);
  assert.match(payHtml, /title="Side gig \$100\.00"/);
  assert.match(payHtml, /This check \(Side gig, day 10, \$110\.00 \) covers:/);
  assert.match(payHtml, /This check \(Side gig, day 25, \$100\.00 \) covers:/);
  const octMonth = pay.history.months.filter(function (m) { return m.month === "2026-10"; })[0];
  octMonth.income_total = 210;
  octMonth.closed = false;
  const current = ctx.bankPageHtml(pay, { tab: "current" });
  assert.match(current, /Income received<\/span> <b>\$210\.00<\/b>/);
  assert.doesNotMatch(current, /Income received<\/span> <b>\$420\.00<\/b>|Income received<\/span> <b>\$110\.00<\/b>/);

  const editedPay = ctx.bankPageHtml(pay, {
    tab: "budget",
    planMonth: "2026-10",
    edits: { income: { "Side gig": { amount: 12 } } }
  });
  const editedLine = editedPay.slice(editedPay.indexOf('class="bank-income"'), editedPay.indexOf('class="bank-bills"'));
  assert.match(editedLine, /\$12\.00 on the 10th<span class="sep"> · <\/span>\$12\.00 on the 25th<span class="sep"> · <\/span>\$24\.00 \/ mo/);

  pay.budget.income_monthly = [{
    label: "Side gig",
    amount: 8,
    cadence: "twice_monthly",
    times_per_month: 2,
    typical_day: 4,
    deposits: [{ day: "nope", amount: "x" }]
  }];
  const fallback = ctx.bankPageHtml(pay, { tab: "budget", planMonth: "2026-10" });
  assert.match(fallback, /per deposit<span class="sep"> · <\/span>2× \/ month<span class="sep"> · <\/span>\$16\.00 \/ month<span class="sep"> · <\/span>day 4/);
  assert.doesNotMatch(fallback, /on the /);

  pay.asof = "2026-02-10T12:00:00-05:00";
  pay.budget.income_monthly = [{
    label: "Side gig",
    amount: 5,
    cadence: "twice_monthly",
    times_per_month: 2,
    typical_days: [15, 28],
    deposits: [{ day: 15, amount: 110 }, { day: "EOM", amount: 100 }]
  }];
  const febPay = ctx.bankPageHtml(pay, { tab: "budget", planMonth: "2026-02" });
  assert.match(febPay, /<b>15<\/b> <em class="pay" title="Side gig \$110\.00"/);
  assert.match(febPay, /<b>28<\/b> <em class="pay" title="Side gig \$100\.00"/);
  assert.match(febPay, /This check \(Side gig, day 28, \$100\.00 \) covers:/);
  assert.match(febPay, /\$110\.00 on the 15th<span class="sep"> · <\/span>\$100\.00 on the 28th/);
  assert.doesNotMatch(febPay, /<b>31<\/b> <em class="pay" title="Side gig/);

  const flowFx = loadFixture();
  flowFx.asof = "2026-10-05T12:00:00-04:00";
  flowFx.current.recent_tx = [
    { date: "2026-10-04", id: "acct-check", amount: 30, flow: "outflow", category: "Shopping", tx_key: "once", desc: "Extra payoff", one_off: true },
    { date: "2026-10-04", id: "acct-check", amount: 9, flow: "outflow", category: "Shopping", tx_key: "avg", desc: "Skip avg", exclude_from_spend_avg: true },
    { date: "2026-10-04", id: "acct-check", amount: 10, flow: "outflow", category: "Groceries", tx_key: "shop", desc: "Market" }
  ];
  flowFx.current.edits_tx = [];
  flowFx.budget.one_off_payoffs = [{ name: "Extra", amount: 30, month: "2026-09", tx_key: "once" }];
  const flow = ctx.bankMonthFlow(flowFx);
  assert.equal(flow.outSum, 10);
  const tape = ctx.bankPageHtml(flowFx, { tab: "current" });
  assert.match(tape, /Extra payoff/);
  assert.match(tape, /Skip avg/);
  assert.match(tape, /aria-label="Incoming \$0\.00, outgoing \$10\.00"|outgoing \$10\.00/);
  const sepHist = flowFx.history.months.filter(function (m) { return m.month === "2026-09"; })[0];
  sepHist.spend_total = 80;
  sepHist.net = 10;
  sepHist.categories = [{ name: "Extra", amount: 30 }, { name: "Groceries", amount: 50 }];
  const hist = ctx.bankPageHtml(flowFx, { tab: "historical", year: "2026", month: "2026-09" });
  assert.match(hist, /Spend<\/span> <b>\$80\.00<\/b>/);
  assert.match(hist, /Net<\/span> <b>\$10\.00<\/b>/);
  assert.match(hist, />Extra</);
  assert.match(hist, /Groceries/);
});

test("payoff flags follow the print and a display label is not shortened", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.asof = "2026-10-05T12:00:00-04:00";
  fx.history.spend_includes_payoffs = false;
  fx.budget.mtd_includes_payoffs = false;
  fx.budget.one_off_payoffs = [{ name: "Extra", amount: 30, month: "2026-09", tx_key: "once" }];
  fx.budget.mtd_actual_by_category = { Shopping: 30, Groceries: 40 };
  fx.current.recent_tx = [
    { date: "2026-09-02", amount: 30, flow: "outflow", category: "Shopping", tx_key: "once", desc: "Other store" },
    { date: "2026-09-03", amount: 12, flow: "outflow", category: "Groceries", tx_key: "shop", desc: "Extra" }
  ];
  fx.current.edits_tx = [];
  const sep = fx.history.months.filter(function (m) { return m.month === "2026-09"; })[0];
  sep.spend_total = 80;
  sep.net = 10;
  sep.categories = [{ name: "Shopping", amount: 30 }, { name: "Groceries", amount: 50 }];
  sep.tx = [{ date: "2026-09-02", amount: 30, category: "Shopping", tx_key: "once", desc: "Other store" }];

  let hist = ctx.bankPageHtml(fx, { tab: "historical", year: "2026", month: "2026-09" });
  assert.match(hist, /Spend<\/span> <b>\$80\.00<\/b>/);
  assert.match(hist, /Net<\/span> <b>\$10\.00<\/b>/);
  assert.match(hist, />Shopping</);

  assert.equal(ctx.bankMtdSpendRows(fx.budget, fx).filter(function (r) { return r.name === "Shopping"; })[0].amount, 30);

  fx.history.spend_includes_payoffs = true;
  hist = ctx.bankPageHtml(fx, { tab: "historical", year: "2026", month: "2026-09" });
  assert.match(hist, /Spend<\/span> <b>\$50\.00<\/b>/);
  assert.match(hist, /Net<\/span> <b>\$40\.00<\/b>/);
  assert.doesNotMatch(hist, />Shopping</);
  assert.match(hist, />Groceries</);

  delete fx.history.spend_includes_payoffs;
  fx.budget.spend_includes_payoffs = true;
  hist = ctx.bankPageHtml(fx, { tab: "historical", year: "2026", month: "2026-09" });
  assert.match(hist, /Spend<\/span> <b>\$50\.00<\/b>/);
  assert.doesNotMatch(hist, />Shopping</);

  fx.budget.spend_includes_payoffs = false;
  fx.budget.mtd_includes_payoffs = true;
  fx.budget.one_off_payoffs = [{ name: "Extra", amount: 30, month: "2026-10", tx_key: "once" }];
  fx.current.recent_tx = [
    { date: "2026-10-02", amount: 30, flow: "outflow", category: "Shopping", tx_key: "once", desc: "Other store" },
    { date: "2026-10-03", amount: 12, flow: "outflow", category: "Groceries", tx_key: "shop", desc: "Extra" }
  ];
  let rows = ctx.bankMtdSpendRows(fx.budget, fx);
  assert.equal(rows.filter(function (r) { return r.name === "Shopping"; }).length, 0);
  assert.equal(rows.filter(function (r) { return r.name === "Groceries"; })[0].amount, 40);

  delete fx.budget.mtd_includes_payoffs;
  fx.budget.spend_includes_payoffs = true;
  rows = ctx.bankMtdSpendRows(fx.budget, fx);
  assert.equal(rows.filter(function (r) { return r.name === "Shopping"; }).length, 0);

  fx.budget.mtd_includes_payoffs = false;
  fx.budget.spend_includes_payoffs = true;
  rows = ctx.bankMtdSpendRows(fx.budget, fx);
  assert.equal(rows.filter(function (r) { return r.name === "Shopping"; })[0].amount, 30);

  assert.equal(ctx.bankBillDisplayName("Acme Mortgage", "North Lot Mortgage Payment"), "North Lot Mortgage Payment");
  assert.equal(ctx.bankBillDisplayName("Acme Mortgage", "   "), "Mortgage");
  fx.budget.bills = [{
    name: "Acme Mortgage",
    display_label: "North Lot Mortgage Payment",
    amount: 12.5,
    typical_day: 4,
    cadence: "monthly"
  }];
  fx.budget.bills_monthly = [];
  const normalized = ctx.bankNormalizeBills(fx.budget);
  const labeled = normalized.filter(function (b) { return b.name === "Acme Mortgage"; })[0];
  assert.equal(labeled.name, "Acme Mortgage");
  assert.equal(labeled.display_label, "North Lot Mortgage Payment");
  const budget = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.match(budget, />North Lot Mortgage Payment</);
  assert.match(budget, /title="North Lot Mortgage Payment"/);
  assert.doesNotMatch(budget, /title="Mortgage Payment"/);
  const edits = ctx.bankPageHtml(fx, { tab: "edits" });
  assert.match(edits, /data-bank-due="acme mortgage"/);
  assert.match(edits, /aria-label="Due day for North Lot Mortgage Payment"/);
  assert.match(edits, /data-bank-kind="Acme Mortgage"/);
  assert.doesNotMatch(edits, /data-bank-due="north lot mortgage payment"/);
});

function blankBudget(fx) {
  fx.asof = "2026-10-06T12:00:00-04:00";
  fx.budget.bills = [];
  fx.budget.bills_monthly = [];
  fx.budget.calendar = [];
  fx.budget.subscriptions = [];
  fx.budget.planned_by_category = {};
  fx.budget.mtd_actual_by_category = {};
  fx.budget.income_monthly = [];
  fx.budget.insights = [];
  fx.budget.tiers = {};
  fx.budget.pay_schedule = [];
  fx.budget.plan_dedupe = [];
  fx.budget.savings_targets = [];
  fx.budget.one_off_payoffs = [];
  fx.mustpay_overrides = {};
  fx.current.recent_tx = [];
  fx.current.edits_tx = [];
  return fx;
}

test("subscriptions land on the calendar and dedupe by name key", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.bills = [{ name: "North Lot", display_label: "Lot Fee", amount: 22, typical_day: 4, cadence: "monthly" }];
  fx.budget.subscriptions = [
    { name: "Lot Fee", amount: 6, typical_day: 4 },
    { name: "North Lot", amount: 9, typical_day: 4 },
    { name: "Stream Club", amount: 5, typical_day: 6 }
  ];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.match(html, /<span[^>]*title="Lot Fee"/);
  assert.match(html, /<em class="sub"[^>]*title="Lot Fee"/);
  assert.match(html, /<em class="sub"[^>]*title="Stream Club"/);
  assert.doesNotMatch(html, /<em class="sub"[^>]*title="North Lot"/);
});

test("a calendar day opens a popup and Escape closes it", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.income_monthly = [{
    label: "Payroll",
    amount: 40,
    monthly_amount: 40,
    cadence: "monthly",
    typical_day: 4,
    deposits: [{ day: 4, amount: 40 }],
    usual_account: { nickname: "Pay" }
  }];
  fx.budget.bills = [
    { name: "Rent", amount: 22, typical_day: 4, cadence: "monthly", usual_account: { nickname: "House" } },
    {
      name: "Power",
      amount: 6,
      typical_day: 9,
      cadence: "monthly",
      usual_account: { last4: "4242" },
      paid_current_month: { month: "2026-10", status: "paid", source: "bank", paid_date: "2026-10-02" }
    }
  ];
  fx.budget.subscriptions = [{ name: "Stream Club", amount: 5, typical_day: 4, usual_account: { last4: "1111" } }];
  const day4 = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", openDay: 4 });
  assert.match(day4, /class="bank-day-dialog"/);
  assert.match(day4, /Payroll \$40\.00<\/b> <i>[\s\S]*?Income[\s\S]*?Expected[\s\S]*?Pay/);
  assert.match(day4, /Rent<\/b> <i>\$22\.00[\s\S]*?Bill[\s\S]*?Estimated[\s\S]*?House/);
  assert.match(day4, /Stream Club<\/b> <i>\$5\.00[\s\S]*?Sub[\s\S]*?Estimated[\s\S]*?··1111/);
  assert.match(day4, /data-bank-day-close="1"/);
  const day9 = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", openDay: 9 });
  assert.match(day9, /Power<\/b> <i>\$6\.00[\s\S]*?Bill[\s\S]*?Paid[\s\S]*?Oct 2[\s\S]*?··4242/);

  const el = mount(ctx, fx, { tab: "budget", planMonth: "2026-10" });
  const day = {
    querySelector: function (sel) { return sel === "b" ? { textContent: "4" } : null; },
    closest: function (sel) { return sel === ".bank-day" ? day : null; }
  };
  el.listeners.click({
    target: { closest: function (sel) { return sel === ".bank-day" ? day : null; } },
    preventDefault: function () {}
  });
  assert.match(el.innerHTML, /class="bank-day-dialog"/);
  assert.match(el.innerHTML, /Rent<\/b> <i>\$22\.00[\s\S]*?Bill[\s\S]*?Estimated[\s\S]*?House/);
  el.listeners.keydown({
    key: "Escape",
    target: day,
    preventDefault: function () {}
  });
  assert.doesNotMatch(el.innerHTML, /class="bank-day-dialog"/);
  el.listeners.keydown({
    key: "Enter",
    target: day,
    preventDefault: function () {}
  });
  assert.match(el.innerHTML, /class="bank-day-dialog"/);
  el.listeners.click({
    target: { closest: function (sel) { return sel === "[data-bank-day-close], [data-bank-day-scrim]" ? { close: true } : null; } },
    preventDefault: function () {}
  });
  assert.doesNotMatch(el.innerHTML, /class="bank-day-dialog"/);
});

test("the plan pie includes required bills, subs, and needs and wants plans", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.bills = [{ name: "Rent", amount: 50, typical_day: 3, cadence: "monthly" }];
  fx.budget.subscriptions = [{ name: "Stream Club", amount: 8, typical_day: 6 }];
  fx.budget.planned_by_category = { Groceries: 12, Shopping: 6 };
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  const pie = pieBlock(html, "tiers");
  assert.match(pie, /Rent<\/span> <b>\$50\.00<\/b> <i>Required/);
  assert.match(pie, /Stream Club<\/span> <b>\$8\.00<\/b> <i>Wants/);
  assert.match(pie, /Groceries<\/span> <b>\$12\.00<\/b> <i>Needs/);
  assert.match(pie, /Shopping<\/span> <b>\$6\.00<\/b> <i>Wants/);
});

test("the plan headline and bar use printed tier totals", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.income_monthly = [{ label: "Payroll", amount: 100, monthly_amount: 100, cadence: "monthly", typical_day: 15 }];
  fx.budget.tiers = {
    plan_total_tiers: 80,
    left_after_tiers: 20,
    required_plan: 10,
    needs_plan: 10,
    wants_plan: 10,
    required_card_payments: 7
  };
  fx.budget.plan_dedupe = [{ name: "Groceries", amount: 3 }];
  const fit = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.match(fit, /Expected income \$100\.00\. Plan \$80\.00 leaves \$20\.00/);
  assert.doesNotMatch(fit, /leaves \$20\.00[\s\S]{0,40}Plan \$30\.00|Plan \$30\.00 leaves/);
  assert.match(fit, /class="bank-plan-seg tier-required"/);
  assert.match(fit, /class="bank-plan-seg tier-needs"/);
  assert.match(fit, /class="bank-plan-seg tier-wants"/);
  assert.match(fit, /class="bank-plan-seg tier-left"/);
  assert.match(fit, /Required<\/span> <em>\$10\.00/);
  assert.match(fit, /incl\. card payments \$7\.00/);
  assert.match(fit, /Category averages exclude bills &amp; subs counted above \(−\$3\.00\/mo\)/);
  assert.match(fit, /class="bank-plan-today" style="left:19\.4%"/);

  fx.budget.income_monthly = [{ label: "Payroll", amount: 65, monthly_amount: 65, cadence: "monthly", typical_day: 15 }];
  fx.budget.tiers.plan_total_tiers = 80;
  fx.budget.tiers.left_after_tiers = -15;
  const over = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.match(over, /Expected income \$65\.00\. Plan \$80\.00 is over by \$15\.00/);
  assert.match(over, /class="bank-plan-seg tier-over"/);
  assert.match(over, /Over income<\/span> <em>\$15\.00/);
});

test("current actuals show month-to-date tiers and known unposted bills", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.tiers_mtd = {
    required_spent: 11,
    needs_spent: 4,
    wants_spent: 2,
    required_known_unposted: [{ name: "Rent", amount: 9 }]
  };
  const html = ctx.bankPageHtml(fx, { tab: "current" });
  assert.match(html, /data-tier="required"[\s\S]*?Spent \$11\.00/);
  assert.match(html, /data-tier="needs"[\s\S]*?Spent \$4\.00/);
  assert.match(html, /data-tier="wants"[\s\S]*?Spent \$2\.00/);
  assert.match(html, /Required bills not posted yet/);
  assert.match(html, /Rent<\/span> <b>\$9\.00/);
});

test("every edits row has a tier picker that posts tiers.json", async function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.planned_by_category = { Groceries: 12 };
  const edits = ctx.bankPageHtml(fx, { tab: "edits" });
  assert.match(edits, /<h3>Tier<\/h3>/);
  assert.match(edits, />Required<\/option>/);
  assert.match(edits, />Needs<\/option>/);
  assert.match(edits, />Wants<\/option>/);
  assert.match(edits, />Default<\/option>/);
  assert.match(edits, /data-bank-plan-tier="required"/);
  assert.match(edits, /data-bank-plan-tier="needs"/);
  assert.match(edits, /data-bank-plan-tier="wants"/);
  assert.match(edits, /aria-label="Tier for Groceries"/);
  assert.doesNotMatch(edits, />Bill<\/option>|>Optional<\/option>/);

  const calls = [];
  const bag = {};
  let offline = false;
  ctx.localStorage.getItem = function (k) { return bag[k] == null ? null : bag[k]; };
  ctx.localStorage.setItem = function (k, v) { bag[k] = String(v); };
  ctx.fetch = function (url, init) {
    const cached = categoryRead(url, init, fx.custom_categories);
    if (cached) return cached;
    const method = init && init.method ? String(init.method).toUpperCase() : "GET";
    calls.push({ url: String(url), method: method, body: init && init.body });
    if (offline) return Promise.resolve({ ok: false, status: 404, type: "basic" });
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () { return Promise.resolve({}); }
    });
  };
  const el = mount(ctx, fx, { tab: "edits" });
  await el._bank.prune;
  await el.listeners.change({
    target: {
      value: "wants",
      getAttribute: function (name) { return name === "data-bank-kind" ? "Groceries" : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/data/banking/tiers.json");
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(JSON.parse(calls[0].body), { rule: { name: "Groceries", tier: "wants" } });
  assert.match(el.innerHTML, /data-bank-kind="Groceries"[\s\S]*?value="wants" selected/);

  offline = true;
  calls.length = 0;
  await el.listeners.change({
    target: {
      value: "18",
      getAttribute: function (name) { return name === "data-bank-plan-tier" ? "needs" : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.equal(calls[0].url, "/data/banking/tiers.json");
  assert.deepEqual(JSON.parse(calls[0].body), { plans: { needs: 18 } });
  const stored = JSON.parse(bag.murphyHouseBanking);
  assert.equal(stored.tiers.plans.needs, 18);
  const fresh = blankBudget(loadFixture());
  ctx.bankPageHtml(fresh, { tab: "budget", planMonth: "2026-10" });
  assert.equal(ctx.bankUserPlanValue(fresh, "needs"), 18);
  fresh.tier_doc = { plans: { needs: 3 }, rules: {} };
  ctx.bankPageHtml(fresh, { tab: "budget", planMonth: "2026-10" });
  assert.equal(ctx.bankUserPlanValue(fresh, "needs"), 3);
});

test("payroll rolls back onto a business day and the stipend stays put", function () {
  const ctx = boot();
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.bankJustinPayDays("Payroll", { year: 2026, month: 11 }))), [13, 30]);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.bankJustinPayDays("Per diem stipend", { year: 2026, month: 10 }))), [10, 25]);
  assert.equal(ctx.bankRollBackDate(2026, 11, 26).key, "2026-11-25");
  assert.equal(ctx.bankFedHolidaySet(2026)["2026-11-26"], true);
  assert.equal(ctx.bankFedHolidaySet(2026)["2026-07-04"], true);
  assert.equal(!!ctx.bankFedHolidaySet(2026)["2026-07-03"], false);
  assert.equal(ctx.bankRollBackDate(2026, 7, 4).key, "2026-07-03");
});

test("the next pay card leads the budget and does not warn about a shortfall", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.pay_schedule = [
    { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 40 },
    { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 40, account: { nickname: "House" } }
  ];
  fx.budget.bills = [{ name: "Rent", amount: 10, typical_day: 20, cadence: "monthly", usual_account: { nickname: "Bills" } }];
  fx.budget.subscriptions = [{ name: "Stream Club", amount: 5, typical_day: 18, usual_account: { last4: "4242" } }];
  fx.budget.savings_targets = [{ nickname: "Rainy", last4: "1111" }];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-05T12:00:00-04:00" });
  assert.ok(html.indexOf('class="bank-next"') < html.indexOf('class="bank-fit"'));
  assert.match(html, /Next pay: Payroll · Thu, Oct 15 · about \$40\.00 to account TBD · in 10 days/);
  assert.match(html, /What this pay covers/);
  assert.match(html, /<h4>Bills<\/h4>[\s\S]*?Rent/);
  assert.match(html, /<h4>··4242<\/h4>[\s\S]*?Stream Club/);
  assert.match(html, /Left after these bills: \$25\.00/);
  assert.match(html, /Savings split not set yet\. Shown as an even split\./);
  assert.doesNotMatch(html, /shortfall|short by|underfunded/i);

  fx.current.recent_tx = [{ date: "2026-10-15", amount: 40, flow: "inflow", desc: "Payroll", category: "Payroll" }];
  const landed = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T12:00:00-04:00" });
  assert.match(landed, /Pay landed · Thu, Oct 15 · \$40\.00/);
  assert.doesNotMatch(landed, /shortfall|short by|underfunded/i);
});

test("cancelled and paid-off bills leave the plan month and calendar_excluded is ignored", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.bills = [
    { name: "Old Plan", amount: 40, typical_day: 8, cadence: "monthly", status: "cancelled", status_from: "2026-10" },
    { name: "Closed Loan", amount: 6, typical_day: 12, cadence: "monthly", status: "paid_off", status_from: "2026-10" },
    { name: "Kept Chip", amount: 15, typical_day: 9, cadence: "monthly" }
  ];
  fx.budget.calendar = [{ day: 3, items: ["Only Excluded"] }, { day: 9, items: ["Kept Chip"] }];
  fx.budget.calendar_excluded = ["Kept Chip", "Only Excluded", "Ghost Name"];
  fx.budget.bills_total = 55;
  fx.budget.bills_total_effective = 15;
  fx.budget.income_monthly = [{ label: "Payroll", amount: 100, monthly_amount: 100, cadence: "monthly", typical_day: 1 }];
  fx.budget.pay_schedule = [
    { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 50 },
    { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 50 }
  ];
  const oct = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-06T12:00:00-04:00" });
  assert.match(oct, /title="Kept Chip"/);
  assert.match(oct, /title="Only Excluded"/);
  assert.doesNotMatch(oct, /Ghost Name/);
  assert.doesNotMatch(oct, /Old Plan|Closed Loan/);
  const legend = oct.match(/class="bank-plan-legend"[\s\S]*?<\/ul>/);
  assert.ok(legend);
  assert.match(legend[0], /Required<\/span> <em>\$15\.00<\/em> <i><span class="sep"> · <\/span>/);
  assert.doesNotMatch(legend[0], /\$55\.00/);
  assert.doesNotMatch(pieBlock(oct, "tiers"), /Old Plan|Closed Loan/);
  assert.doesNotMatch(oct, /class="bank-next"[\s\S]*?Old Plan/);

  const sep = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-09" });
  assert.match(sep, /title="Old Plan"/);
  assert.match(sep, /title="Closed Loan"/);
});

test("a manual paid bill reads Paid ✓ (marked)", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.bills = [
    {
      name: "Rent",
      amount: 22,
      typical_day: 4,
      cadence: "monthly",
      paid_current_month: { month: "2026-10", status: "paid", source: "manual", paid_date: "2026-10-03" }
    },
    {
      name: "Power",
      amount: 6,
      typical_day: 9,
      cadence: "monthly",
      paid_current_month: { month: "2026-10", status: "paid", source: "bank", paid_date: "2026-10-02" }
    }
  ];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.match(html, /Rent[\s\S]{0,180}Paid ✓ \(marked\)/);
  assert.match(html, /Power[\s\S]{0,180}Paid<span class="sep"> · <\/span>Oct 2/);
  assert.doesNotMatch(html, /Rent[\s\S]{0,80}Paid<span class="sep"> · <\/span>Oct 3/);
});

test("lens matches a payoff on tx_id and keeps twice-monthly amounts apart", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.mtd_includes_payoffs = true;
  fx.budget.one_off_payoffs = [{ name: "Extra", amount: 30, month: "2026-10", tx_id: "tx-keep" }];
  fx.budget.mtd_actual_by_category = { Shopping: 30, Groceries: 40 };
  fx.current.recent_tx = [
    { date: "2026-10-02", amount: 30, flow: "outflow", category: "Shopping", tx_id: "tx-other", desc: "Extra" },
    { date: "2026-10-03", amount: 11, flow: "outflow", category: "Groceries", tx_id: "tx-keep", desc: "Market" }
  ];
  const rows = ctx.bankMtdSpendRows(fx.budget, fx);
  assert.equal(rows.filter(function (r) { return r.name === "Shopping"; })[0].amount, 30);
  assert.equal(rows.filter(function (r) { return r.name === "Groceries"; })[0].amount, 10);

  fx.budget.bills = [
    { name: "Cycle Fee", amount: 10, times_per_month: 2, typical_days: [15, 28], cadence: "twice_monthly" },
    { name: "Set Aside Fund", amount: 4, kind: "set_aside", set_aside: true },
    { name: "Acme Mortgage", display_label: "North Lot Mortgage Payment", amount: 12, typical_day: 4, cadence: "monthly" }
  ];
  fx.mustpay_overrides = { "Ghost Plan": "must_pay" };
  fx.budget.income_monthly = [{
    label: "Side gig",
    amount: 5,
    monthly_amount: 99,
    editable: true,
    deposits: [{ day: 3, amount: 30 }, { day: 18, amount: 20 }]
  }];
  const budget = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.match(budget, /title="Cycle Fee \$10\.00"/);
  assert.doesNotMatch(budget, /title="Cycle Fee \$20\.00"/);
  assert.match(budget, /\$20\.00 \/ mo/);
  assert.match(budget, />North Lot Mortgage Payment</);
  assert.doesNotMatch(budget, /title="Mortgage Payment"/);
  const income = budget.slice(budget.indexOf('class="bank-income"'), budget.indexOf('class="bank-bills"'));
  assert.match(income, /\$50\.00 \/ mo/);
  assert.doesNotMatch(income, /\$99\.00/);

  const edits = ctx.bankPageHtml(fx, {
    tab: "edits",
    edits: { bills: { "Cycle Fee": { amount: 7 } }, income: { "Side gig": { amount: 8 } } }
  });
  assert.match(edits, /Days 15 and 28/);
  assert.match(edits, /Set-aside<span class="sep"> · <\/span>no due day/);
  assert.doesNotMatch(edits, /data-bank-due="cycle fee"/);
  assert.doesNotMatch(edits, /data-bank-due="set aside fund"/);
  assert.doesNotMatch(edits, /data-bank-kind="Ghost Plan"/);
  assert.match(edits, /data-bank-kind="Acme Mortgage"/);
  assert.match(edits, /aria-label="Due day for North Lot Mortgage Payment"/);
  const edited = ctx.bankPageHtml(fx, {
    tab: "budget",
    planMonth: "2026-10",
    edits: { bills: { "Cycle Fee": { amount: 7 } }, income: { "Side gig": { amount: 8 } } }
  });
  assert.match(edited, /title="Cycle Fee \$7\.00"/);
  assert.match(edited, /\$14\.00 \/ mo/);
  assert.match(pieBlock(edited, "tiers"), /Cycle Fee<\/span> <b>\$14\.00<\/b>/);
  const editedIncome = edited.slice(edited.indexOf('class="bank-income"'), edited.indexOf('class="bank-bills"'));
  assert.match(editedIncome, /\$16\.00 \/ mo/);
});

function decodeBankText(raw) {
  return String(raw || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripAllowedGlue(text) {
  return text
    .replace(/··\d+/g, " ")
    .replace(/\b\d+(?:st|nd|rd|th)\b/gi, " ")
    .replace(/\b\d{4}-\d{2}(?:-\d{2})?\b/g, " ")
    .replace(/\d+\s*×/g, " ")
    .replace(/\/\s*mo(?:nth)?\b/gi, " ");
}

const GLUE_TEXT = /[A-Za-z][$\d]|\d[A-Za-z]{2,}|\S·|·\S/;

function gluedHits(html) {
  const hits = [];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)>|<([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  const root = { tag: "root", className: "", children: [], parent: null };
  let cur = root;
  let m;
  function classOf(attrs) {
    const found = /class="([^"]*)"/.exec(attrs || "");
    return found ? found[1] : "";
  }
  function insideCal(node) {
    let n = node;
    while (n) {
      if (/(^|\s)(bank-day|bank-cal-grid|bank-cal-week|bank-cal-dow)(\s|$)/.test(n.className || "")) return true;
      if (n.tag === "select") return true;
      n = n.parent;
    }
    return false;
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
    const text = decodeBankText(m[4]);
    cur.children.push({ text: text, parent: cur });
    if (text.trim() && GLUE_TEXT.test(stripAllowedGlue(text))) hits.push(text.trim().slice(0, 80));
  }
  const BLOCK = {
    div: 1, section: 1, article: 1, ul: 1, ol: 1, li: 1, p: 1,
    h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1,
    table: 1, thead: 1, tbody: 1, tr: 1, td: 1, th: 1,
    header: 1, nav: 1, main: 1, form: 1, button: 1, figure: 1, footer: 1, aside: 1, svg: 1, label: 1,
    select: 1, option: 1
  };
  function inlineJoin(node) {
    let out = "";
    (node.children || []).forEach(function (child) {
      if (child.text != null) { out += child.text; return; }
      if (BLOCK[child.tag]) { out += " "; return; }
      out += inlineJoin(child);
    });
    return out;
  }
  function walk(node) {
    if (!node || node.text != null) return;
    if (!insideCal(node) && node.tag !== "select") {
      const joined = inlineJoin(node);
      if (joined.trim() && GLUE_TEXT.test(stripAllowedGlue(joined))) hits.push(node.tag + " " + joined.trim().slice(0, 120));
    }
    (node.children || []).forEach(walk);
  }
  walk(root);
  return hits;
}

function rowText(html) {
  return decodeBankText(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

test("due rows and next pay bills keep a space between the name, amount, and meta", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.bills = [
    { name: "Electric", amount: 120, typical_day: 5, cadence: "monthly", tier: "required" },
    { name: "Rent", amount: 10, typical_day: 20, cadence: "monthly", tier: "required" }
  ];
  fx.budget.pay_schedule = [{ name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 40 }];
  fx.asof = "2026-10-01T12:00:00-04:00";
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-01T12:00:00-04:00" });
  const due = html.match(/<ul class="bank-due-list">[\s\S]*?<\/ul>/);
  assert.ok(due);
  assert.match(due[0], /<\/span> <b>/);
  assert.match(due[0], /<\/b> <i>/);
  assert.match(rowText(due[0]), /Electric \$120\.00 Bill · due day 5/);
  const next = html.match(/<ul class="bank-next-bills">[\s\S]*?<\/ul>/);
  assert.ok(next);
  assert.match(next[0], /<\/span> <b>/);
  assert.match(next[0], /<\/b> <i>/);
  assert.match(rowText(next[0]), /Rent -\$10\.00 day 20/);
});

test("budget, current, and edits text does not glue a word to a dollar amount", function () {
  const ctx = boot();
  const fx = loadFixture();
  ["budget", "current", "edits"].forEach(function (tab) {
    const html = ctx.bankPageHtml(fx, { tab: tab, planMonth: "2026-10", now: "2026-10-06T12:00:00-04:00" });
    const hits = gluedHits(html);
    assert.deepEqual(hits, [], tab);
  });
});

const PLAIN_BLOCK = {
  div: 1, p: 1, li: 1, section: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1,
  ul: 1, ol: 1, table: 1, thead: 1, tbody: 1, tfoot: 1, tr: 1, td: 1, th: 1,
  header: 1, nav: 1, main: 1, article: 1, footer: 1, aside: 1, form: 1,
  figure: 1, figcaption: 1, blockquote: 1, pre: 1, hr: 1, br: 1,
  dl: 1, dt: 1, dd: 1, details: 1, summary: 1, caption: 1
};

function plainPageText(html) {
  let out = "";
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)>|<([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith("<!--")) continue;
    if (m[1]) {
      if (PLAIN_BLOCK[m[1].toLowerCase()]) out += "\n";
      continue;
    }
    if (m[2]) {
      const tag = m[2].toLowerCase();
      if (PLAIN_BLOCK[tag]) out += "\n";
      continue;
    }
    out += decodeBankText(m[4]);
  }
  return out;
}

function glueCopyHits(text) {
  const knownOrdinal = /\d+(?:st|nd|rd|th)\b/gi;
  const hits = [];
  text.split("\n").forEach(function (line) {
    const ordinalsGone = line.replace(knownOrdinal, " ");
    if (/[A-Za-z)][$\d]|[$\d][A-Za-z)]/.test(ordinalsGone)) hits.push(line.trim().slice(0, 160));
    if (/[a-z][A-Z]/.test(line)) hits.push(line.trim().slice(0, 160));
  });
  return hits;
}

test("copy-paste keeps a space between labels and values", function () {
  const ctx = boot();
  const fx = loadFixture();
  const now = "2026-10-06T12:00:00-04:00";
  ["budget", "current", "historical", "edits"].forEach(function (tab) {
    const html = ctx.bankPageHtml(fx, { tab: tab, planMonth: "2026-10", now: now });
    assert.deepEqual(glueCopyHits(plainPageText(html)), [], tab);
  });
  const mountEl = { hidden: true, innerHTML: "", addEventListener: function () {} };
  ctx.MPTicker.render(mountEl, fx, null, { year: 2026, month: 10, day: 6 });
  assert.match(plainPageText(mountEl.innerHTML), /Next in[\s\S]*Next out/);
  assert.deepEqual(glueCopyHits(plainPageText(mountEl.innerHTML)), []);
});

test("a past due day reads unpaid, tier spend can run over the plan, and one-off debits stay out", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.asof = "2026-10-06T12:00:00-04:00";
  fx.budget.bills = [{ name: "Electric", amount: 20, typical_day: 2, cadence: "monthly", tier: "required" }];
  fx.budget.category_tiers = { Electric: "required" };
  fx.budget.tiers = { required_plan: 10, needs_plan: 0, wants_plan: 0, plan_total_tiers: 10, left_after_tiers: 0 };
  fx.current.recent_tx = [
    { date: "2026-10-03", amount: 30, flow: "outflow", category: "Electric", desc: "Electric", tx_key: "el-1", one_off: false },
    { date: "2026-10-04", amount: 99, flow: "outflow", category: "Shopping", desc: "Once", tx_key: "once-1", one_off: true }
  ];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-06T12:00:00-04:00" });
  assert.match(html, /unpaid/);
  const current = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-06T12:00:00-04:00" });
  assert.match(current, /data-tier="required"[^>]*class="bank-cap over"|class="bank-cap over"[^>]*data-tier="required"/);
  assert.match(current, /Spent \$30\.00/);
  assert.doesNotMatch(current, /Spent \$129\.00/);
});

test("saved tier settings fall back to budget.tier_doc and dedupe prefers the printed total", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.tier_doc = {
    doc: { plans: { needs: 9 }, rules: {} },
    stale: true,
    source: "feed"
  };
  fx._tiersGetFailed = true;
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.match(html, /saved settings may be out of date/);
  assert.equal(ctx.bankUserPlanValue(fx, "needs"), 9);
  fx.budget.plan_dedupe = [{ name: "Groceries", deducted: 4, amount: 4 }];
  fx.budget.tiers.plan_dedupe_total = 11;
  assert.equal(ctx.bankPlanDedupeSum(fx.budget), 11);
  delete fx.budget.tiers.plan_dedupe_total;
  assert.equal(ctx.bankPlanDedupeSum(fx.budget), 4);
});

test("banking assets use the ec cache bust", function () {
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(page, /\/house\/js\/banking\.js\?v=20261006ec/);
  assert.match(page, /\/house\/banking\.css\?v=20261006ec/);
  assert.match(page, /list-cap\.js\?v=20261006ec/);
  assert.match(page, /ticker\.js\?v=20261006ec/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904eb/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904eb/);
  assert.doesNotMatch(page, /banking\.js\?v=20260904ec/);
  assert.doesNotMatch(page, /banking\.css\?v=20260904ec/);
  assert.equal((page.match(/id="mp-ticker"/g) || []).length, 1);
  assert.match(page, /<div id="mp-ticker" class="mp-ticker-slot" hidden><\/div>/);
});

test("an empty hash opens Budget and explicit hashes still deep link", function () {
  const ctx = boot();
  assert.equal(ctx.bankResolveTab(""), "budget");
  assert.equal(ctx.bankResolveTab("#"), "budget");
  assert.equal(ctx.bankResolveTab("#budget"), "budget");
  assert.equal(ctx.bankResolveTab("#current"), "current");
  assert.equal(ctx.bankResolveTab("#historical"), "historical");
  assert.equal(ctx.bankResolveTab("#edits"), "edits");
  const fx = loadFixture();
  ctx.location.hash = "";
  const el = mount(ctx, fx, {});
  assert.match(el.innerHTML, /data-panel="budget"/);
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Budget · October 2026</);
  assertNoTabButtons(el.innerHTML);
  function fire(type) {
    (ctx._bankListeners[type] || []).forEach(function (fn) { fn(); });
  }
  ctx.location.hash = "#current";
  fire("hashchange");
  assert.match(el.innerHTML, /data-panel="current"/);
  ctx.location.hash = "#historical";
  fire("popstate");
  assert.match(el.innerHTML, /data-panel="historical"/);
  ctx.location.hash = "#edits";
  fire("hashchange");
  assert.match(el.innerHTML, /data-panel="edits"/);
  ctx.location.hash = "";
  fire("popstate");
  assert.match(el.innerHTML, /data-panel="budget"/);
  assert.equal(el._bank.tab, "budget");
});

test("bill status controls post, undo, and drop cancelled or paid-off bills", async function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.bills = [
    { name: "Rent", amount: 40, typical_day: 5, cadence: "monthly", tier: "required" },
    { name: "Power", amount: 10, typical_day: 9, cadence: "monthly", tier: "required", status: "paid_off", status_from: "2026-09", status_source: "print" }
  ];
  fx.budget.tiers = { required_plan: 40, needs_plan: 0, wants_plan: 0, plan_total_tiers: 40, left_after_tiers: 20 };
  const edits = ctx.bankPageHtml(fx, { tab: "edits", planMonth: "2026-10" });
  assert.match(edits, /Cancelled from/);
  assert.match(edits, /Paid off/);
  assert.match(edits, /Paid this month/);
  assert.match(edits, /set by data feed/);
  const powerAt = edits.indexOf("Power");
  assert.doesNotMatch(edits.slice(powerAt, powerAt + 700), /data-bank-status-undo/);
  const calls = [];
  ctx.fetch = function (url, init) {
    const cached = categoryRead(url, init, fx.custom_categories);
    if (cached) return cached;
    calls.push({ url: String(url), body: init && init.body });
    return Promise.resolve({ ok: true, status: 200, type: "basic", json: function () { return Promise.resolve({}); } });
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", planMonth: "2026-10" });
  await el._bank.prune;
  await el.listeners.change({
    target: {
      value: "2026-10",
      getAttribute: function (name) { return name === "data-bank-cancel" ? "rent" : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.equal(calls.length, 0);
  await el.listeners.click({
    target: {
      closest: function (sel) {
        return sel === "[data-bank-status-save]" ? { getAttribute: function () { return "rent"; } } : null;
      },
      getAttribute: function () { return null; }
    },
    preventDefault: function () {}
  });
  assert.equal(calls.length, 0);
  assert.match(el.innerHTML, /Cancel Rent\?/);
  await el.listeners.click({
    target: {
      closest: function (sel) {
        return sel === "[data-bank-confirm]" ? { getAttribute: function () { return "rent"; } } : null;
      },
      getAttribute: function () { return null; }
    },
    preventDefault: function () {}
  });
  assert.equal(calls[0].url, "/data/banking/tiers.json");
  assert.deepEqual(JSON.parse(calls[0].body).bill_status.Rent, { status: "cancelled", from: "2026-10" });
  const fig = ctx.bankPlanNumbers(el._bank.data, { year: 2026, month: 10 }, null);
  assert.equal(fig.required, 0);
  assert.equal(fig.plan, 0);
  assert.equal(fig.left, 12.34);
  const budget = ctx.bankPageHtml(el._bank.data, { tab: "budget", planMonth: "2026-10" });
  const cal = budget.slice(budget.indexOf('class="bank-cal"'), budget.indexOf('class="bank-insight-block"'));
  assert.doesNotMatch(cal, /Rent|Power/);
  assert.doesNotMatch(budget, /class="bank-due-list"[\s\S]*Rent/);
  calls.length = 0;
  await el.listeners.click({
    target: {
      closest: function (sel) { return sel === "[data-bank-status-undo]" ? { getAttribute: function () { return "rent"; } } : null; },
      getAttribute: function () { return null; }
    },
    preventDefault: function () {}
  });
  assert.equal(JSON.parse(calls[0].body).bill_status.Rent, null);
});

test("account funding paints after the plan bar and next pay shows a move", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.pay_schedule = [
    { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 80, account: { nickname: "Debit", last4: "1111" } }
  ];
  fx.budget.account_funding = [
    { nickname: "Debit", last4: "1111", start_balance: 500, start_asof: "2026-10-01", end_balance: 500 },
    {
      nickname: "Bills",
      last4: "2222",
      start_balance: 20,
      start_asof: "2026-10-01",
      short_by: 40,
      first_short_date: "2026-10-12",
      end_balance: -20,
      outs: [{ date: "2026-10-12", name: "Rent", amount: 60 }]
    }
  ];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-05T12:00:00-04:00" });
  assert.ok(html.indexOf('class="bank-fit"') < html.indexOf('class="bank-funding"'));
  assert.ok(html.indexOf('class="bank-funding"') < html.indexOf('class="bank-cal"'));
  assert.match(html, /Bills ··2222/);
  assert.match(html, /Short \$40\.00 starting Oct 12/);
  assert.match(html, />Start</);
  assert.doesNotMatch(html, /Chase|Wells|Bank of/i);
  assert.match(html, /Move <b class="mp-out">-\$40\.00<\/b> from Debit ··1111 to Bills ··2222/);
  const day = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", openDay: 12 });
  assert.match(day, /id="bank-day-title">Oct 12</);
});

test("the tier picker uses the row tier, includes subs, and other income stays off expected income", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.bills = [{ name: "Rent", amount: 10, typical_day: 3, cadence: "monthly", tier: "needs" }];
  fx.budget.subscriptions = [{ name: "Stream Club", amount: 5, typical_day: 4, tier: "wants" }];
  fx.budget.other_income = [{ name: "Gift", amount: 30, date: "2026-10-03" }];
  fx.budget.other_income_mtd = { month: "2026-10", total: 30 };
  fx.budget.income_monthly = [{
    label: "Payroll",
    amount: 10,
    monthly_amount: 10,
    deposits: [{ day: 15, amount: 40 }, { day: 30, amount: 40 }]
  }];
  fx.budget.income_total = 999;
  fx.budget.tiers = { required_plan: 0, needs_plan: 10, wants_plan: 5, plan_total_tiers: 15, left_after_tiers: 65 };
  const edits = ctx.bankPageHtml(fx, { tab: "edits", planMonth: "2026-10" });
  assert.match(edits, /data-bank-kind="Rent"[\s\S]*?value="needs" selected/);
  assert.match(edits, /data-bank-kind="Stream Club"/);
  assert.match(edits, /data-bank-kind="Gift"/);
  assert.match(edits, /value="other_income"/);
  assert.match(edits, /Fix categories, due days, income, and tiers/);
  const budget = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.match(budget, /Expected income \$80\.00/);
  assert.match(budget, /Bonus income \$30\.00/);
  assert.doesNotMatch(budget.slice(budget.indexOf('class="bank-fit"'), budget.indexOf('class="bank-plan-bar"')), /\$110\.00|\$999\.00/);
  const current = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-06T12:00:00-04:00" });
  assert.match(current, /Received \$30\.00/);
  assert.match(current, /Other income/);
  assert.doesNotMatch(current.slice(0, current.indexOf("Received vs spent") + 220), /\$80\.00/);
});

test("a tier rule changes only the moved delta and a negative plan is refused", async function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.planned_by_category = { Groceries: 12 };
  fx.budget.tiers = { required_plan: 100, needs_plan: 30, wants_plan: 5, plan_total_tiers: 135, left_after_tiers: 15 };
  fx.tier_doc = { rules: { Groceries: { tier: "wants" } }, plans: {} };
  const fig = ctx.bankPlanNumbers(fx, { year: 2026, month: 10 }, null);
  assert.equal(fig.needs, 18);
  assert.equal(fig.wants, 17);
  assert.equal(fig.required, 100);
  assert.equal(fig.plan, 135);
  assert.equal(fig.left, 12.34 - fig.plan);
  const calls = [];
  ctx.fetch = function (url, init) {
    const cached = categoryRead(url, init, fx.custom_categories);
    if (cached) return cached;
    calls.push(String(url));
    return Promise.resolve({ ok: true, status: 200, type: "basic", json: function () { return Promise.resolve({}); } });
  };
  const el = mount(ctx, fx, { tab: "edits" });
  await el.listeners.change({
    target: {
      value: "-4",
      getAttribute: function (name) { return name === "data-bank-plan-tier" ? "needs" : null; },
      hasAttribute: function () { return false; }
    }
  });
  assert.equal(calls.length, 0);
});

test("day cells are focusable and the day dialog traps focus", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.bills = [{ name: "Rent", amount: 10, typical_day: 4, cadence: "monthly" }];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.equal((html.match(/class="bank-day[^"]*" tabindex="0"/g) || []).length, 1);
  assert.match(html, /class="bank-day has" tabindex="-1" role="button" aria-label="Oct 4: Rent"/);
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  assert.match(css, /\.bank-plan-seg\.tier-left \{ background: var\(--bank-left\); \}/);
  assert.match(css, /\.bank-plan-seg\.tier-required \{ background: var\(--bank-required\); \}/);
  const el = mount(ctx, fx, { tab: "budget", planMonth: "2026-10" });
  let returned = "";
  el.querySelectorAll = function () {
    return [{
      querySelector: function () { return { textContent: "4" }; },
      focus: function () { returned = "day"; }
    }];
  };
  const day = {
    querySelector: function () { return { textContent: "4" }; },
    closest: function (sel) { return sel === ".bank-day" ? day : null; }
  };
  el.listeners.keydown({ key: " ", target: day, preventDefault: function () {} });
  assert.match(el.innerHTML, /class="bank-day-dialog"/);
  let trapped = "";
  const close = {
    focus: function () { trapped = "close"; },
    closest: function (sel) { return sel === ".bank-day-dialog" ? dialog : null; }
  };
  const dialog = { querySelectorAll: function () { return [close]; }, closest: function () { return dialog; } };
  let prevented = false;
  el.listeners.keydown({
    key: "Tab",
    target: close,
    preventDefault: function () { prevented = true; }
  });
  assert.equal(trapped, "close");
  assert.equal(prevented, true);
  el.listeners.keydown({ key: "Escape", target: close, preventDefault: function () {} });
  assert.equal(returned, "day");
  assert.doesNotMatch(el.innerHTML, /class="bank-day-dialog"/);
});

test("next pay lists each twice-monthly occurrence and skips a paid bill", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.pay_schedule = [
    { name: "Payroll", kind: "payroll", date: "2026-10-01", amount: 100 },
    { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 100 }
  ];
  fx.budget.bills = [
    { name: "Water", amount: 15, typical_day: 5, typical_days: [5, 20], cadence: "twice_monthly", tier: "required" },
    {
      name: "Power",
      amount: 8,
      typical_day: 12,
      cadence: "monthly",
      tier: "required",
      paid_current_month: { month: "2026-10", status: "paid", source: "bank", paid_date: "2026-10-02" }
    }
  ];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-01T12:00:00-04:00" });
  const nextAt = html.indexOf('class="bank-next"');
  const nextAgain = html.indexOf('class="bank-next"', nextAt + 1);
  const fitAt = html.indexOf('class="bank-fit"');
  const next = html.slice(nextAt, nextAgain > 0 && nextAgain < fitAt ? nextAgain : fitAt);
  assert.equal((next.match(/Water/g) || []).length, 2);
  assert.match(next, /day 5/);
  assert.match(next, /day 20/);
  assert.doesNotMatch(next, /Power/);
  const edits = ctx.bankPageHtml(fx, { tab: "edits", planMonth: "2026-10" });
  assert.match(edits, /Days 5 and 20/);
});

test("a posted manual paid mark merges when the bank debit is in the tape", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.bills = [{ name: "Electric", amount: 20, typical_day: 4, cadence: "monthly" }];
  fx.tier_doc = { rules: {}, plans: {}, manual_paid: { Electric: { month: "2026-10", paid_date: "2026-10-04" } } };
  fx.current.recent_tx = [{ date: "2026-10-04", amount: 20, flow: "outflow", category: "Electric", desc: "Electric", tx_key: "el-9" }];
  const edits = ctx.bankPageHtml(fx, { tab: "edits", planMonth: "2026-10" });
  assert.match(edits, /class="bank-paid-month">Paid this month ✓/);
  assert.doesNotMatch(edits, /data-bank-paid-month="electric"/);
});

function partOrder(html) {
  const names = ["next", "headline", "planbar", "wheel", "due", "calendar", "meters"];
  let prev = -1;
  names.forEach(function (name) {
    const at = html.indexOf('data-bank-part="' + name + '"');
    assert.ok(at > prev, name);
    prev = at;
  });
}

test("budget, current, and historical share one component order", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.asof = "2026-10-06T12:00:00-04:00";
  fx.budget.income_monthly = [{ label: "Payroll", amount: 100, monthly_amount: 100, cadence: "monthly", typical_day: 15 }];
  fx.budget.tiers = { required_plan: 40, needs_plan: 20, wants_plan: 10, plan_total_tiers: 70, left_after_tiers: 30 };
  fx.budget.bills = [{ name: "Rent", amount: 40, typical_day: 4, cadence: "monthly", tier: "required" }];
  fx.budget.snapshots = {
    "2026-09": {
      month: "2026-09",
      thin: false,
      income: { expected: 80 },
      tiers: { required_total: 40, needs_plan: 20, wants: 10, plan_total_tiers: 70, left_after_tiers: 10 },
      bills: [{ name: "Rent", amount: 40, due_day: 4, counted: true }]
    }
  };
  fx.budget.actuals_by_month = {
    "2026-09": { income_received: 80, other_income: 0, required_spent: 40, needs_spent: 10, wants_spent: 5 }
  };
  ["budget", "current", "historical"].forEach(function (tab) {
    const html = ctx.bankPageHtml(fx, { tab: tab, planMonth: "2026-10", histMonth: "2026-09", now: "2026-10-06T12:00:00-04:00" });
    partOrder(html);
  });
  const budget = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  const fund = budget.indexOf('class="bank-funding"');
  if (fund >= 0) {
    assert.ok(fund > budget.indexOf('data-bank-part="planbar"'));
    assert.ok(fund < budget.indexOf('data-bank-part="wheel"'));
  }
  const current = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-06T12:00:00-04:00" });
  assert.ok(current.indexOf('class="bank-next"') < current.indexOf("Received vs spent"));
  const hist = ctx.bankPageHtml(fx, { tab: "historical", histMonth: "2026-09" });
  assert.match(hist, /n\/a for past months/);
  assert.doesNotMatch(hist.slice(hist.indexOf('data-bank-part="next"'), hist.indexOf('data-bank-part="headline"')), /Next pay: Payroll/);
});

test("budget plan mode has no actual fills and only a small paid marker", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.income_monthly = [{ label: "Payroll", amount: 100, monthly_amount: 100, cadence: "monthly", typical_day: 15 }];
  fx.budget.tiers = { required_plan: 40, needs_plan: 10, wants_plan: 10, plan_total_tiers: 60, left_after_tiers: 40 };
  fx.budget.bills = [{
    name: "Rent",
    amount: 40,
    typical_day: 4,
    cadence: "monthly",
    tier: "required",
    paid_current_month: { month: "2026-10", status: "paid", source: "manual", paid_date: "2026-10-03" }
  }];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  const planbar = html.slice(html.indexOf('data-bank-part="planbar"'), html.indexOf('data-bank-part="wheel"'));
  const meters = html.slice(html.indexOf('data-bank-part="meters"'), html.indexOf('data-bank-part="meters"') + 1800);
  assert.doesNotMatch(planbar, /class="fill"/);
  assert.doesNotMatch(meters, /class="fill"/);
  assert.doesNotMatch(html, /class="fill"/);
  assert.match(html, /Expected income \$100\.00\. Plan \$60\.00 leaves \$40\.00/);
  assert.match(html, /class="bank-paid-mark">paid</);
  const due = html.slice(html.indexOf('data-bank-part="due"'), html.indexOf('data-bank-part="calendar"'));
  assert.doesNotMatch(due, /Paid ·|Paid</);
});

test("current meters fill to the actual and tick the plan, with over in red", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.asof = "2026-10-06T12:00:00-04:00";
  fx.budget.income_monthly = [{ label: "Payroll", amount: 100, monthly_amount: 100, cadence: "monthly", typical_day: 15 }];
  fx.budget.tiers = { required_plan: 40, needs_plan: 30, wants_plan: 20, plan_total_tiers: 90, left_after_tiers: 10 };
  fx.budget.actuals_by_month = {
    "2026-10": {
      income_received: 100,
      other_income: 15,
      required_spent: 70,
      needs_spent: 10,
      wants_spent: 20
    }
  };
  const math = ctx.bankFillTick(70, 40);
  assert.equal(math.fill, 100);
  assert.equal(Math.round(math.tick * 10) / 10, 57.1);
  assert.equal(math.over, true);
  assert.equal(math.remain, -30);
  const under = ctx.bankFillTick(10, 30);
  assert.equal(Math.round(under.fill * 10) / 10, 33.3);
  assert.equal(under.tick, 100);
  assert.equal(under.over, false);
  const html = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-06T12:00:00-04:00" });
  const meters = html.slice(html.indexOf('data-bank-part="meters"'), html.indexOf('class="bank-asof"'));
  assert.match(meters, /data-tier="required"[^>]*data-fill="100\.0"/);
  assert.match(meters, /data-tier="required"[^>]*data-tick="57\.1"/);
  assert.match(meters, /class="bank-cap over"[^>]*data-tier="required"/);
  assert.match(meters, /class="bank-over">Over by \$30\.00/);
  assert.match(meters, /data-tier="needs"[^>]*data-fill="33\.3"/);
  assert.match(meters, /Left \$20\.00/);
  assert.match(html, /Received \$100\.00/);
  assert.match(html, /class="bank-other-inc">Other income \$15\.00/);
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  assert.match(css, /\.bank-over,\s*\.bank-delta\.bad\s*\{[^}]*color:\s*var\(--stop\)/);
});

test("historical reads the picked month snapshot and skips counted false bills", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.asof = "2026-10-06T12:00:00-04:00";
  fx.budget.tiers = { required_plan: 999, needs_plan: 999, wants_plan: 999, plan_total_tiers: 999, left_after_tiers: 1 };
  fx.budget.income_monthly = [{ label: "Payroll", amount: 999, monthly_amount: 999, cadence: "monthly", typical_day: 1 }];
  fx.budget.bills = [{ name: "Live Rent", amount: 999, typical_day: 3, cadence: "monthly", tier: "required" }];
  fx.tier_doc = { rules: { Groceries: { tier: "wants" } }, plans: { needs: 5 }, bill_status: {}, manual_paid: {} };
  fx._tiersFromGet = true;
  fx.budget.snapshots = {
    "2026-09": {
      month: "2026-09",
      frozen_at: "2026-10-01",
      source: "month_start",
      thin: false,
      income: { expected: 80, deposits: [{ day: 15, amount: 40 }, { day: 30, amount: 40 }] },
      bills: [
        { name: "Rent", amount: 50, due_day: 4, counted: true, tier: "required" },
        { name: "Old Loan", amount: 40, due_day: 9, counted: false, tier: "required" }
      ],
      subs: [],
      tiers: { required_total: 50, needs: 12, wants_plan: 8, plan_total_tiers: 70, left_after_tiers: 10 }
    }
  };
  fx.budget.actuals_by_month = {
    "2026-09": { income_received: 80, other_income: 0, required_spent: 50, needs_spent: 12, wants_spent: 8, by_category: { Rent: 50 } }
  };
  const html = ctx.bankPageHtml(fx, { tab: "historical", histMonth: "2026-09" });
  const stack = html.slice(html.indexOf('data-bank-part="headline"'), html.indexOf('class="bank-hist-controls"'));
  assert.match(stack, /Plan \$70\.00/);
  assert.match(stack, /leaves \$10\.00|Left \$10\.00/);
  assert.doesNotMatch(stack, /\$999\.00/);
  assert.doesNotMatch(stack, /Live Rent/);
  assert.match(stack, /Old Loan/);
  assert.match(stack, /not counted/);
  assert.doesNotMatch(stack.slice(stack.indexOf('data-bank-part="planbar"'), stack.indexOf('data-bank-part="wheel"')), /\$40\.00/);
  assert.match(html, /data-mom="2026-09"/);
});

test("thin snapshots and null income or left stay blank", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.asof = "2026-10-06T12:00:00-04:00";
  fx.budget.snapshots = {
    "2026-08": {
      month: "2026-08",
      thin: true,
      notes: "backfill",
      source: "backfill",
      income: { expected: null },
      tiers: { required_total: 20, needs_plan: null, wants: null, plan_total_tiers: 20, left_after_tiers: null },
      bills: [{ name: "Rent", amount: 20, due_day: 2, counted: true }]
    }
  };
  fx.budget.actuals_by_month = { "2026-08": { income_received: null, required_spent: 20, needs_spent: null, wants_spent: null } };
  fx.budget.snapshots_basis = "Frozen at month start.";
  fx.budget.actuals_basis = "Cleared totals.";
  const html = ctx.bankPageHtml(fx, { tab: "historical", histMonth: "2026-08" });
  const head = html.slice(html.indexOf('data-bank-part="headline"'), html.indexOf('data-bank-part="planbar"'));
  assert.match(head, /Partial data for this month/);
  assert.match(head, /Expected income —/);
  assert.match(head, /Left —/);
  assert.doesNotMatch(head, /\$0\.00/);
  const meters = html.slice(html.indexOf('data-bank-part="meters"'), html.indexOf('data-bank-part="meters"') + 1600);
  assert.match(meters, /Needs<\/span> <b>Spent —<\/b> <i>Plan —/);
  assert.doesNotMatch(meters, /Needs<\/span> <b>Spent \$0\.00|Plan \$0\.00/);
  assert.match(html, /Frozen at month start\./);
  assert.match(html, /Cleared totals\./);
});

test("month over month deltas color over and under", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.asof = "2026-10-06T12:00:00-04:00";
  fx.budget.snapshots = {
    "2026-08": {
      month: "2026-08",
      income: { expected: 100 },
      tiers: { required_total: 40, needs_plan: 20, wants_plan: 10, plan_total_tiers: 70, left_after_tiers: 30 }
    },
    "2026-09": {
      month: "2026-09",
      income: { expected: 90 },
      tiers: { required_total: 40, needs: 20, wants: 10, plan_total_tiers: 70, left_after_tiers: 20 }
    }
  };
  fx.budget.actuals_by_month = {
    "2026-08": { income_received: 110, required_spent: 30, needs_spent: 20, wants_spent: 10 },
    "2026-09": { income_received: 70, required_spent: 55, needs_spent: 20, wants_spent: 10 }
  };
  const html = ctx.bankPageHtml(fx, { tab: "historical", histMonth: "2026-09" });
  const augAt = html.indexOf('data-mom="2026-08"');
  const sepAt = html.indexOf('data-mom="2026-09"');
  assert.ok(sepAt >= 0 && augAt > sepAt);
  const aug = html.slice(augAt, html.indexOf("</li>", augAt));
  const sep = html.slice(sepAt, augAt);
  assert.ok(html.indexOf('class="bank-month-pick"') < html.indexOf('class="bank-mom"'));
  assert.match(aug, /Required<\/span> <b>plan \$40\.00<\/b> <b>actual \$30\.00<\/b> <em class="bank-delta good">under \$10\.00/);
  assert.match(aug, /Income<\/span> <b>plan \$100\.00<\/b> <b>actual \$110\.00<\/b> <em class="bank-delta good">over \$10\.00/);
  assert.match(sep, /Required<\/span> <b>plan \$40\.00<\/b> <b>actual \$55\.00<\/b> <em class="bank-delta bad">over \$15\.00/);
  assert.match(sep, /Income<\/span> <b>plan \$90\.00<\/b> <b>actual \$70\.00<\/b> <em class="bank-delta bad">under \$20\.00/);
  assert.match(sep, /Total<\/span> <b>plan \$70\.00<\/b> <b>actual \$85\.00<\/b> <em class="bank-delta bad">over \$15\.00/);
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  assert.match(css, /\.bank-delta\.good\s*\{[^}]*color:\s*var\(--go\)/);
});

test("the historical month picker deep links from the hash", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.asof = "2026-10-06T12:00:00-04:00";
  fx.budget.snapshots = {
    "2026-08": {
      month: "2026-08",
      income: { expected: 40 },
      tiers: { required_total: 15, needs_plan: 5, wants_plan: 5, plan_total_tiers: 25, left_after_tiers: 15 },
      bills: [{ name: "August Desk", amount: 15, due_day: 2, counted: true }]
    },
    "2026-09": {
      month: "2026-09",
      income: { expected: 80 },
      tiers: { required_total: 50, needs_plan: 10, wants_plan: 10, plan_total_tiers: 70, left_after_tiers: 10 },
      bills: [{ name: "September Desk", amount: 50, due_day: 4, counted: true }]
    }
  };
  fx.budget.actuals_by_month = {
    "2026-08": { income_received: 40, required_spent: 15, needs_spent: 5, wants_spent: 5 },
    "2026-09": { income_received: 80, required_spent: 50, needs_spent: 10, wants_spent: 10 }
  };
  assert.equal(ctx.bankResolveTab("#historical=2026-08"), "historical");
  assert.equal(ctx.bankParseHash("#historical=2026-08").histMonth, "2026-08");
  assert.equal(ctx.bankDefaultHistMonth(fx), "2026-09");
  const options = ctx.bankHistChrome(fx, {});
  assert.ok(options.indexOf('value="2026-09"') < options.indexOf('value="2026-08"') || options.indexOf("September 2026") < options.indexOf("August 2026"));
  assert.match(options, /value="2026-09" selected/);
  ctx.location.hash = "#historical=2026-08";
  const el = mount(ctx, fx, {});
  function fire(type) {
    (ctx._bankListeners[type] || []).forEach(function (fn) { fn(); });
  }
  fire("hashchange");
  assert.match(el.innerHTML, /data-panel="historical"/);
  assert.match(el.innerHTML, /value="2026-08" selected/);
  assert.match(el.innerHTML, /August Desk/);
  assert.doesNotMatch(el.innerHTML.slice(el.innerHTML.indexOf('data-bank-part="headline"'), el.innerHTML.indexOf('class="bank-hist-controls"')), /September Desk/);
  assert.match(el.innerHTML, /No saved budget for this month|Plan \$25\.00/);
});

test("forge funding rows are flows, and ins and outs stay counts", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.account_funding = [{
    nickname: "Bills",
    last4: "2222",
    start_balance: 100,
    start_asof: "2026-10-01",
    ins: 2,
    outs: 1,
    projected_end: 70,
    rows: [
      { date: "2026-10-05", kind: "in", name: "Pay", amount: 50, source: "deposit", status: "posted", running_balance: 150 },
      { date: "2026-10-12", kind: "out", name: "Rent", amount: 80, source: "bill", status: "posted", running_balance: 70 },
      { date: "2026-10-20", kind: "in", name: "Gift", amount: 10, running_balance: -5 }
    ]
  }];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-06T12:00:00-04:00" });
  assert.match(html, /Short \$5\.00 starting Oct 20/);
  assert.match(html, /Oct 5 Pay/);
  assert.match(html, /Oct 12 Rent/);
  assert.match(html, /class="bank-fund-end"[\s\S]*?\$70\.00/);
  assert.doesNotMatch(html, />2</);
  const quiet = JSON.parse(JSON.stringify(fx));
  quiet.budget.account_funding[0].rows[2].running_balance = 80;
  quiet.budget.account_funding[0].short_by = 0;
  const calm = ctx.bankPageHtml(quiet, { tab: "budget", planMonth: "2026-10" });
  assert.doesNotMatch(calm, /Short \$/);
});

test("bill_id joins status, and a prev_key alias is cleared on save", async function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.bills = [{
    name: "Acme Mobile",
    bill_id: "phone",
    prev_key: "old-carrier",
    alias_keys: ["handset"],
    amount: 15,
    typical_day: 8,
    cadence: "monthly"
  }];
  fx.budget.tiers = { required_plan: 15, needs_plan: 0, wants_plan: 0, plan_total_tiers: 15, left_after_tiers: 0 };
  const edits = ctx.bankPageHtml(fx, { tab: "edits", planMonth: "2026-10" });
  assert.match(edits, /class="bank-merchant">Phone/);
  assert.match(edits, /data-bank-cancel="phone"/);
  assert.doesNotMatch(edits, /data-bank-cancel="acme mobile"/);
  const calls = [];
  ctx.fetch = function (url, init) {
    const cached = categoryRead(url, init, fx.custom_categories);
    if (cached) return cached;
    calls.push({ url: String(url), body: init && init.body });
    return Promise.resolve({ ok: true, status: 200, type: "basic", json: function () { return Promise.resolve({}); } });
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", planMonth: "2026-10" });
  await el.listeners.change({
    target: {
      value: "2026-10",
      getAttribute: function (name) { return name === "data-bank-cancel" ? "phone" : null; },
      hasAttribute: function () { return false; }
    }
  });
  await el.listeners.click({
    target: {
      closest: function (sel) {
        return sel === "[data-bank-status-save]" ? { getAttribute: function () { return "phone"; } } : null;
      },
      getAttribute: function () { return null; }
    },
    preventDefault: function () {}
  });
  await el.listeners.click({
    target: {
      closest: function (sel) {
        return sel === "[data-bank-confirm]" ? { getAttribute: function () { return "phone"; } } : null;
      },
      getAttribute: function () { return null; }
    },
    preventDefault: function () {}
  });
  const bag = JSON.parse(calls[0].body).bill_status;
  assert.deepEqual(bag.phone, { status: "cancelled", from: "2026-10" });
  assert.equal(bag["old-carrier"], null);
  assert.equal(bag.handset, null);
  assert.equal(bag.Phone, undefined);
});

test("bank_match confidence, misses, and basis captions", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  function bill(conf, hits) {
    return {
      name: "Rent",
      bill_id: "rent",
      amount: 40,
      typical_day: 4,
      cadence: "monthly",
      bank_match: {
        descriptors: ["RENT PAY"],
        recent_hits: hits,
        typical_day: 4,
        typical_amount: 40,
        match_count: hits.length,
        window_days: 45,
        confidence: conf
      }
    };
  }
  fx.budget.bills = [bill("high", [{ date: "2026-10-04", amount: 40, account_last4: "2222", description: "Rent pay", tx_key: "r1" }])];
  fx.budget.bank_match_basis = "Matched from descriptors.";
  fx.budget.bill_id_basis = "Slugs follow the bill name.";
  let html = ctx.bankPageHtml(fx, { tab: "edits", planMonth: "2026-10" });
  assert.match(html, /Matched/);
  assert.match(html, /RENT PAY/);
  assert.match(html, /Rent pay/);
  assert.match(html, /Usually around day 4, about \$40\.00/);
  assert.match(html, /Matched from descriptors\./);
  assert.match(html, /Slugs follow the bill name\./);
  assert.doesNotMatch(html, /No matching payments found/);
  fx.budget.bills = [bill("med", [{ date: "2026-10-04", amount: 40, description: "Rent pay", tx_key: "r1" }])];
  assert.match(ctx.bankPageHtml(fx, { tab: "edits" }), /Likely match/);
  fx.budget.bills = [bill("low", [{ date: "2026-10-04", amount: 40, description: "Rent pay", tx_key: "r1" }])];
  assert.match(ctx.bankPageHtml(fx, { tab: "edits" }), /Weak match/);
  fx.budget.bills = [bill("none", [])];
  assert.match(ctx.bankPageHtml(fx, { tab: "edits" }), /class="bank-match-miss">No matching payments found/);
  fx.budget.bills = [bill("high", [])];
  assert.match(ctx.bankPageHtml(fx, { tab: "edits" }), /No matching payments found/);
});

test("current month bill totals use the effective figures", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.bills = [{ name: "Rent", amount: 40, typical_day: 4, cadence: "monthly" }];
  fx.budget.bills_total = 100;
  fx.budget.bills_total_effective = 40;
  fx.budget.left_after_bills = 20;
  fx.budget.tiers = { required_total: 40, required_plan: 40, must_pay: 100, plan_total_tiers: 40, left_after_tiers: 20 };
  const oct = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.match(oct, /data-plan="dues">Bills <b>\$40\.00/);
  assert.doesNotMatch(oct, /data-plan="dues">Bills <b>\$100\.00/);
  assert.doesNotMatch(oct, /data-plan="must-pay"/);
});

test("a past snapshot keeps a later-cancelled bill and notes it", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.asof = "2026-10-06T12:00:00-04:00";
  fx.budget.snapshots = {
    "2026-08": {
      month: "2026-08",
      frozen_at: "2026-08-01",
      source: "month_start",
      income: { expected: 80 },
      tiers: { required_total: 40, needs_plan: 0, wants_plan: 0, plan_total_tiers: 40, left_after_tiers: 40 },
      bills: [{ name: "Rent", bill_id: "rent", amount: 40, due_day: 5, counted: true, status: "" }]
    }
  };
  fx.tier_doc = { bill_status: { rent: { status: "cancelled", from: "2026-10" } }, plans: {}, rules: {} };
  const html = ctx.bankPageHtml(fx, { tab: "historical", histMonth: "2026-08" });
  const due = html.slice(html.indexOf('class="bank-due-month"'), html.indexOf('class="bank-cal"'));
  assert.match(due, /Rent/);
  assert.match(due, /cancelled later/);
  assert.match(html, /<small class="bank-day-note">cancelled later<\/small>/);
});

test("lists cap at ten rows and a short list stays open", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  const many = [];
  for (let i = 0; i < 25; i++) many.push({ name: "Desk " + i, amount: 3, typical_day: (i % 28) + 1, cadence: "monthly", tier: "required" });
  fx.budget.bills = many;
  const longHtml = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.match(longHtml, /class="list-cap"[^>]*aria-label="Due this month"/);
  assert.match(longHtml, /Showing 10 of 25, scroll for more/);
  fx.budget.bills = many.slice(0, 5);
  const shortHtml = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.doesNotMatch(shortHtml, /aria-label="Due this month"/);
  assert.doesNotMatch(shortHtml, /Showing 10 of/);
  const rows = [];
  for (let i = 0; i < 12; i++) rows.push({ date: "2026-10-01", desc: "Row " + i, amount: 1, category: "Shopping", flow: "outflow" });
  const tape = ctx.bankTapeHtml(rows);
  assert.match(tape, /class="list-cap"/);
  assert.match(tape, /Showing 10 of 12/);
  assert.doesNotMatch(ctx.bankTapeHtml(rows.slice(0, 4)), /class="list-cap"/);
});

test("ticker rolls paydays, skips retired bills, and hides when the fetch fails", async function () {
  const ctx = boot();
  assert.equal(ctx.bankRollBackDate(2026, 8, 15).key, "2026-08-14");
  assert.equal(ctx.bankRollBackDate(2026, 5, 31).key, "2026-05-29");
  assert.equal(ctx.bankRollBackDate(2025, 7, 4).key, "2025-07-03");
  const fx = blankBudget(loadFixture());
  fx.budget.income_monthly = [
    { label: "Payroll", amount: 40, cadence: "twice_monthly" },
    { label: "Fostering Per Diem Stipend", amount: 10, cadence: "twice_monthly" }
  ];
  const deposit = ctx.bankNextDeposit(fx, { now: "2026-10-06T12:00:00-04:00" });
  assert.equal(deposit.date, "2026-10-10");
  assert.equal(deposit.kind, "Stipend");
  fx.budget.pay_schedule = [];
  fx.budget.income_monthly = [{
    label: "Side gig",
    amount: 12,
    deposits: [{ date: "2026-10-08", amount: 12, account: { nickname: "Debit", last4: "1111" } }]
  }];
  const dated = ctx.bankNextDeposit(fx, { now: "2026-10-06T12:00:00-04:00" });
  assert.equal(dated.date, "2026-10-08");
  fx.budget.bills = [
    { name: "Old Plan", bill_id: "old-plan", amount: 90, typical_day: 8, cadence: "monthly", status: "cancelled", status_from: "2026-10" },
    { name: "Closed Loan", bill_id: "closed", amount: 80, typical_day: 9, cadence: "monthly", status: "paid_off", status_from: "2026-09" },
    { name: "Power", amount: 6, typical_day: 12, cadence: "monthly", paid_current_month: { month: "2026-10", status: "paid", source: "bank" } },
    { name: "Rent", bill_id: "rent", amount: 40, typical_day: 20, cadence: "monthly" },
    { name: "Water", bill_id: "water", amount: 10, typical_day: 20, cadence: "monthly" }
  ];
  const out = ctx.bankNextBillOut(fx, { now: "2026-10-06T12:00:00-04:00" });
  assert.equal(out.name, "Rent");
  assert.equal(out.due, "2026-10-20");
  assert.equal(out.more, 1);
  const mountEl = { hidden: true, innerHTML: "", addEventListener: function () {} };
  ctx.MPTicker.render(mountEl, fx, null, { year: 2026, month: 10, day: 6 });
  assert.match(mountEl.innerHTML, /data-mp-tick="out"/);
  assert.match(mountEl.innerHTML, /\+1 more/);
  assert.match(mountEl.innerHTML, /··1111|Next in/);
  fx.budget.bills = [{ name: "Rent", amount: 10, typical_day: 2, cadence: "monthly" }];
  const wrapped = ctx.bankNextBillOut(fx, { now: "2026-10-28T12:00:00-04:00" });
  assert.equal(wrapped.due.slice(0, 7), "2026-11");
  const hidden = { hidden: false, innerHTML: "shown", addEventListener: function () {}, _mpTickerPainted: false };
  ctx.MPTicker.load(hidden);
  await new Promise(function (resolve) { setTimeout(resolve, 20); });
  assert.equal(hidden.hidden, true);
  assert.equal(hidden.innerHTML, "");
});

test("a deduped category move, a far debit, and a failed save stay local", async function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.income_total = null;
  fx.budget.planned_by_category = { Fuel: 1200 };
  fx.budget.plan_dedupe = [{ name: "Fuel", deducted: 1000 }];
  fx.budget.tiers = { required_plan: 0, needs_plan: 400, wants_plan: 200, plan_total_tiers: 2000, left_after_tiers: 0 };
  fx.tier_doc = { rules: { Fuel: { tier: "wants" } }, plans: {}, bill_status: {} };
  let fig = ctx.bankPlanNumbers(fx, { year: 2026, month: 10 }, null);
  assert.equal(fig.needs, 200);
  assert.equal(fig.wants, 400);
  assert.equal(fig.plan, 2000);
  fx.tier_doc.rules.Fuel = { tier: "other_income" };
  fig = ctx.bankPlanNumbers(fx, { year: 2026, month: 10 }, null);
  assert.equal(fig.plan, 1800);
  fx.tier_doc.rules = {};
  fx.budget.bills = [{ name: "Old Loan", amount: 80, typical_day: 3, cadence: "monthly", status: "cancelled", status_from: "2026-09", status_source: "print", tier: "required" }];
  fx.tier_doc.rules = { "Old Loan": { tier: "wants" } };
  fig = ctx.bankPlanNumbers(fx, { year: 2026, month: 10 }, null);
  assert.equal(fig.needs, 400);
  assert.equal(fig.wants, 200);
  const snap = blankBudget(loadFixture());
  snap.current.recent_tx = [{ date: "2026-10-04", amount: 200, flow: "outflow", category: "Rent", desc: "Rent", tx_key: "far" }];
  assert.equal(ctx.bankFindMonthDebit(snap, { name: "Rent", amount: 20 }, "2026-10", 20), null);
  snap.current.recent_tx[0].amount = 20.4;
  assert.ok(ctx.bankFindMonthDebit(snap, { name: "Rent", amount: 20 }, "2026-10", 20));
  const scaled = ctx.bankScaleSlices([{ name: "Rent", amount: 40 }, { name: "Power", amount: 40 }], 100);
  assert.equal(scaled[0].amount, 40);
  assert.equal(scaled[2].name, "Plan balance");
  assert.equal(scaled[2].amount, 20);
  ctx.fetch = function (url, init) {
    const cached = categoryRead(url, init, fx.custom_categories);
    if (cached) return cached;
    return Promise.reject(new Error("down"));
  };
  const el = mount(ctx, JSON.parse(JSON.stringify(fx)), { tab: "edits", planMonth: "2026-10" });
  await el.listeners.click({
    target: {
      closest: function (sel) {
        return sel === "[data-bank-plan-clear]" ? { getAttribute: function () { return "needs"; } } : null;
      },
      getAttribute: function () { return null; }
    },
    preventDefault: function () {}
  });
  assert.match(el.innerHTML, /Could not save tiers.json\. The change is still on this screen\./);
});

test("unmatched status entries and a retired calendar name stay off the live month", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.bills = [{ name: "Rent", bill_id: "rent", amount: 10, typical_day: 4, cadence: "monthly" }];
  fx.budget.calendar = [{ day: 9, items: [{ name: "Old Plan", bill_id: "old-plan" }] }];
  fx.tier_doc = {
    bill_status: {
      "old-plan": { status: "cancelled", from: "2026-10" },
      ghost: { status: "cancelled", from: "2026-09" }
    },
    plans: {},
    rules: {}
  };
  fx.budget.bills.push({ name: "Old Plan", bill_id: "old-plan", amount: 8, typical_day: 9, cadence: "monthly" });
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.doesNotMatch(html, /title="Old Plan"/);
  const edits = ctx.bankPageHtml(fx, { tab: "edits", planMonth: "2026-10" });
  assert.match(edits, /Unmatched status entries/);
  assert.match(edits, />ghost</);
  assert.match(edits, /data-bank-status-undo="ghost"/);
});

test("retagging a bill to other income adds it to the bonus line", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.bills = [{ name: "Fuel", amount: 12, typical_day: 6, cadence: "monthly", tier: "needs" }];
  fx.budget.tiers = { required_plan: 0, needs_plan: 12, wants_plan: 0, plan_total_tiers: 12, left_after_tiers: 0 };
  fx.tier_doc = { rules: { Fuel: { tier: "other_income" } }, plans: {}, bill_status: {} };
  fx.budget.other_income_mtd = { month: "2026-10", total: 5 };
  const listed = ctx.bankOtherIncomeMtd(fx, { year: 2026, month: 10 });
  assert.equal(listed.total, 17);
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10" });
  assert.match(html, /Bonus income \$17\.00/);
});

test("banking page links the shared list cap and ticker", function () {
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.equal((page.match(/id="mp-ticker"/g) || []).length, 1);
  assert.match(page, /<div id="mp-ticker" class="mp-ticker-slot" hidden><\/div>/);
  assert.match(page, /list-cap\.js\?v=20261006ec/);
  assert.match(page, /ticker\.js\?v=20261006ec/);
  assert.match(page, /list-cap\.css\?v=20261006ec/);
  assert.match(page, /ticker\.css\?v=20261006ec/);
  const css = fs.readFileSync(path.join(root, "house/list-cap.css"), "utf8");
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /--list-cap-rows/);
  assert.doesNotMatch(css, /overscroll-behavior/);
});

test("tip ec3 funding collapses, signs amounts, and caps lists by the tenth row", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.account_funding_basis = "Funding walks each account from the start balance through dated ins and outs.";
  fx.budget.account_funding = [{
    nickname: "Bills",
    last4: "2222",
    start_balance: 20,
    outs: [{ date: "2026-10-12", name: "Rent", amount: 60 }],
    ins: [{ date: "2026-10-15", name: "Payroll", amount: 40 }]
  }];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-06T12:00:00-04:00" });
  assert.match(html, /<details class="bank-fund-how"><summary>How this works<\/summary>/);
  assert.doesNotMatch(html, /<details class="bank-fund-how"[^>]*\sopen/);
  assert.match(html, /class="mp-out">-\$60\.00/);
  assert.match(html, /class="mp-in">\+\$40\.00/);
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  assert.match(page, /banking\.js\?v=20261006ec4/);
  assert.match(page, /banking\.css\?v=20261006ec4/);
  assert.match(page, /list-cap\.js\?v=20261006ec3/);
  assert.match(page, /list-cap\.css\?v=20261006ec3/);
  assert.match(css, /--mp-in:\s*#8EEDC0/);
  assert.match(css, /--mp-out:\s*#FFB3AD/);
  assert.match(css, /--mp-in:\s*#0E6B3C/);
  assert.match(css, /--mp-out:\s*#9B2C2C/);
  assert.match(css, /12\.53:1/);
  assert.match(css, /6\.59:1/);

  const many = [];
  for (let i = 0; i < 12; i++) many.push({ name: "Cat " + i, amount: i + 1 });
  const rank = ctx.bankRankHtml(many);
  assert.match(rank, /class="bank-rank"/);
  assert.match(rank, /class="list-cap"/);
  assert.match(rank, /Showing 10 of 12, scroll for more/);
  const shortRank = ctx.bankRankHtml(many.slice(0, 4));
  assert.doesNotMatch(shortRank, /class="list-cap"/);
  assert.doesNotMatch(shortRank, /Showing 10 of/);
  const fake = [];
  for (let i = 0; i < 12; i++) fake.push({ tagName: "LI", offsetTop: i * 40, offsetHeight: 36, offsetParent: null });
  const box = {
    tagName: "OL",
    children: fake,
    style: { maxHeight: "" },
    setAttribute: function (k, v) { this[k] = v; },
    getAttribute: function () { return ""; }
  };
  assert.equal(ctx.MPListCap.measure(box, 10), 396);
  assert.equal(box.style.maxHeight, "396px");
  assert.equal(box["data-list-cap-measured"], "1");
  ctx.MPListCap.refresh({});
});

test("tip ec3 reads expected_total, merges one move, and drops the confirm minus", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.snapshots = {
    "2026-09": {
      month: "2026-09",
      income: { expected_total: 80, expected: 1 },
      tiers: { required_plan: 20, needs_plan: 10, wants_plan: 10, plan_total_tiers: 40, left_after_tiers: 40 },
      bills: []
    }
  };
  const hist = ctx.bankPageHtml(fx, { tab: "historical", histMonth: "2026-09" });
  assert.match(hist, /Expected income \$80\.00/);
  assert.doesNotMatch(hist, /Expected income —/);
  fx.budget.bills = [{
    name: "Rent",
    amount: 10,
    typical_day: 4,
    cadence: "monthly",
    bank_match: { confidence: "high", recent_hits: [{ date: "2026-10-04", amount: -120, description: "Rent pay" }] }
  }];
  assert.match(ctx.bankConfirmSentence(fx.budget.bills[0], "cancelled", fx), /\$120\.00/);
  assert.doesNotMatch(ctx.bankConfirmSentence(fx.budget.bills[0], "cancelled", fx), /-\$/);

  fx.budget.pay_schedule = [
    { name: "Payroll", kind: "payroll", date: "2026-10-14", amount: 400, account: { nickname: "Household", last4: "1111" } },
    { name: "Payroll", kind: "payroll", date: "2026-10-19", amount: 400, account: { nickname: "Household", last4: "1111" } },
    { name: "Payroll", kind: "payroll", date: "2026-10-27", amount: 400, account: { nickname: "Household", last4: "1111" } }
  ];
  fx.budget.bills = [{
    name: "Rent",
    amount: 50,
    typical_day: 14,
    cadence: "monthly",
    tier: "required",
    usual_account: { last4: "3333" }
  }];
  fx.budget.account_funding = [
    { nickname: "Household", last4: "1111", start_balance: 500, start_asof: "2026-10-01" },
    { nickname: "Bills", last4: "3333", start_balance: 0, start_asof: "2026-10-01", short_by: 120, first_short_date: "2026-10-14" }
  ];
  const budget = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-06T12:00:00-04:00" });
  const next = budget.slice(budget.indexOf('class="bank-next"'), budget.indexOf('class="bank-fit"'));
  assert.equal((next.match(/\$170\.00/g) || []).length, 1);
  assert.equal((next.match(/\$120\.00/g) || []).length, 0);
  assert.match(next, /Household ··1111/);
  assert.match(next, /Bills ··3333/);
  assert.doesNotMatch(next, /from Household to ··3333/);
});

test("tip ec3 a frozen month before cancel still notes cancelled later", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.budget.snapshots = {
    "2026-09": {
      month: "2026-09",
      income: { expected: 80 },
      tiers: { required_total: 40, needs_plan: 0, wants_plan: 0, plan_total_tiers: 40, left_after_tiers: 40 },
      bills: [{ name: "Rent", bill_id: "rent", amount: 40, due_day: 5, counted: true, status: "" }]
    }
  };
  fx.budget.bills = [{ name: "Rent", bill_id: "rent", amount: 40, typical_day: 5, cadence: "monthly", status: "cancelled", status_from: "2026-10" }];
  let html = ctx.bankPageHtml(fx, { tab: "historical", histMonth: "2026-09" });
  let due = html.slice(html.indexOf('class="bank-due-month"'), html.indexOf('class="bank-cal"'));
  assert.match(due, /Rent/);
  assert.match(due, /cancelled later/);
  fx.budget.bills = [];
  fx.budget.bill_status_active = [{ name: "Rent", bill_id: "rent", status: "cancelled", from: "2026-10" }];
  html = ctx.bankPageHtml(fx, { tab: "historical", histMonth: "2026-09" });
  due = html.slice(html.indexOf('class="bank-due-month"'), html.indexOf('class="bank-cal"'));
  assert.match(due, /cancelled later/);
  fx.budget.snapshots["2026-10"] = {
    month: "2026-10",
    income: { expected: 80 },
    tiers: { required_total: 40, needs_plan: 0, wants_plan: 0, plan_total_tiers: 40, left_after_tiers: 40 },
    bills: [{ name: "Rent", bill_id: "rent", amount: 40, due_day: 5, counted: true, status: "" }]
  };
  const oct = ctx.bankPageHtml(fx, { tab: "historical", histMonth: "2026-10" });
  const octDue = oct.slice(oct.indexOf('class="bank-due-month"'), oct.indexOf('class="bank-cal"'));
  assert.doesNotMatch(octDue, /Rent/);
  assert.doesNotMatch(oct, /cancelled later/);
});

test("tip ec3 current uses today's eastern month and ignores a stale print", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  fx.asof = "2026-09-30T16:00:00Z";
  fx.current.month = "2026-09";
  fx.current.through_date = "2026-09-30";
  fx.current.days_elapsed = 30;
  fx.current.days_in_month = 30;
  fx.current.month_basis = "posted";
  fx.current.month_flow = {
    month: "2026-09", money_in: 80, money_out: 55, income_received: 80, other_income: 15,
    required_spent: 40, needs_spent: 10, wants_spent: 5, net: 25, basis: "posted", through_date: "2026-09-30"
  };
  fx.current.recent_tx = [{ date: "2026-09-02", month: "2026-09", amount: 40, flow: "outflow", category: "Groceries", desc: "Old market" }];
  fx.current.recent_tx_month_range = "2026-09";
  fx.budget.tiers_mtd = { month: "2026-09", required_spent: 40, needs_spent: 10, wants_spent: 5 };
  fx.budget.other_income_mtd = { month: "2026-09", total: 15 };
  fx.budget.mtd_actual_by_category = { Groceries: 40 };
  fx.budget.mtd_actual_by_category_month = "2026-09";
  fx.budget.actuals_by_month = {
    "2026-09": { required_spent: 40, needs_spent: 10, wants_spent: 5, income_received: 80, other_income: 15, spent_total: 55, through_date: "2026-09-30" }
  };
  fx.budget.snapshots = {
    "2026-09": {
      month: "2026-09",
      income: { expected: 80 },
      tiers: { required_plan: 5, needs_plan: 5, wants_plan: 5, plan_total_tiers: 15, left_after_tiers: 65 },
      bills: [{ name: "Old Rent", amount: 5, due_day: 2, counted: true }]
    },
    "2026-10": {
      month: "2026-10",
      income: { expected_total: 100 },
      tiers: { required_plan: 40, needs_plan: 20, wants_plan: 10, plan_total_tiers: 70, left_after_tiers: 30 },
      bills: [{ name: "Rent", amount: 40, due_day: 4, counted: true, tier: "required" }]
    }
  };
  fx.budget.tiers = { required_plan: 999, needs_plan: 999, wants_plan: 999, plan_total_tiers: 999 };
  fx.budget.bills = [{
    name: "Rent",
    amount: 40,
    typical_day: 4,
    cadence: "monthly",
    tier: "required",
    paid_current_month: { month: "2026-09", status: "paid", source: "bank", paid_date: "2026-09-04" }
  }];
  const oct = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-06T14:00:00Z" });
  assert.match(oct, /October 2026 · as of /);
  assert.match(oct, /Day 6 of 31/);
  assert.match(oct, /data-pace="19\.4"/);
  assert.doesNotMatch(oct, /September 2026/);
  assert.doesNotMatch(oct, /Last closed month/);
  assert.doesNotMatch(oct, /data-bank-plan="-1"/);
  assert.doesNotMatch(oct, /Old market/);
  assert.doesNotMatch(oct, /Old Rent/);
  assert.doesNotMatch(oct, /\$999\.00/);
  assert.doesNotMatch(oct, /Other income \$15\.00/);
  assert.match(oct, /No October transactions yet/);
  assert.match(oct, /Spent \$0\.00/);
  assert.match(oct, /Plan \$40\.00/);
  const due = oct.slice(oct.indexOf('class="bank-due-month"'), oct.indexOf('class="bank-cal"'));
  assert.match(due, /Unpaid/);
  assert.doesNotMatch(due, /Paid/);

  fx.current.month = "2026-10";
  fx.current.through_date = "2026-10-06";
  fx.current.month_basis = "posted";
  fx.current.month_flow = {
    month: "2026-10", money_in: 12, money_out: 3, income_received: 12, other_income: 0,
    required_spent: 3, needs_spent: 0, wants_spent: 0, net: 9, basis: "posted", through_date: "2026-10-06"
  };
  fx.budget.actuals_by_month["2026-10"] = {
    required_spent: 70, needs_spent: 1, wants_spent: 1, income_received: 12, other_income: 0, spent_total: 72, through_date: "2026-10-06"
  };
  const live = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-06T14:00:00Z" });
  assert.match(live, /Incoming \$12\.00, outgoing \$3\.00/);
  assert.match(live, /data-tier="required"[\s\S]*?Spent \$3\.00/);
  assert.doesNotMatch(live, /Spent \$70\.00/);
  assert.doesNotMatch(live, /No October transactions yet/);

  fx.current.month_basis = "month_start";
  fx.current.through_date = null;
  fx.current.month_flow = {
    month: "2026-10", money_in: 0, money_out: 0, income_received: 0, other_income: 0,
    required_spent: 0, needs_spent: 0, wants_spent: 0, through_date: null, basis: "month_start"
  };
  const quiet = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-06T14:00:00Z" });
  assert.match(quiet, /No October transactions yet/);

  const nov = ctx.bankPageHtml(fx, { tab: "current", now: "2026-11-01T04:30:00Z" });
  assert.match(nov, /November 2026 · as of /);
  assert.match(nov, /Day 1 of 30/);
  assert.doesNotMatch(nov, /October 2026 · as of /);
  const stillOct = ctx.bankPageHtml(fx, { tab: "current", now: "2026-11-01T03:30:00Z" });
  assert.match(stillOct, /October 2026 · as of /);
  assert.match(stillOct, /Day 31 of 31/);

  fx.budget.pay_schedule = [{
    name: "Payroll",
    kind: "payroll",
    date: "2026-10-13",
    nominal_date: "2026-10-13",
    pay_date: "2026-10-14",
    amount: 50,
    rolled: true,
    roll_rule: "prior_business_day",
    holiday_name: "Sample Day",
    roll_reason: "holiday",
    account: { nickname: "Household", last4: "1111" }
  }];
  const pay = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-06T14:00:00Z" });
  assert.match(pay, /Wed, Oct 14/);
  assert.match(pay, /Moved from Tue, Oct 13 \(Sample Day\)/);
  assert.doesNotMatch(pay.slice(pay.indexOf('class="bank-next"'), pay.indexOf('class="bank-fit"')), /Next pay:[\s\S]{0,80}Oct 13/);
});

test("tip ec3 labels the 1st balance and seeds the projection from its own start", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  const cal = { start: "2026-10-01", end: "2026-10-31", through_date: "2026-10-06", basis: "calendar_month" };
  fx.current.month_window = cal;
  fx.current.accounts_balance_on_first = { "4444": 42 };
  fx.budget.account_funding = [
    {
      nickname: "Bills",
      last4: "2222",
      start_balance: 100,
      start_balance_date: "2026-10-01",
      start_balance_basis: "balance_on_1st",
      start_balance_confidence: "high",
      projection_start_balance: 64,
      projection_start_asof: "2026-10-05",
      start_asof: "2026-10-05",
      end_balance: 70,
      short_by: 3,
      rows: [
        { date: "2026-09-30", name: "Prior", amount: 9, kind: "out" },
        { date: "2026-10-02", name: "Early", amount: 5, kind: "out", likely_unreflected: true },
        { date: "2026-10-06", name: "Rent", amount: 4, kind: "out", balance_lag: true },
        { date: "2026-10-12", name: "Gift", amount: 2, kind: "in", running_balance: 77 },
        { date: "2026-10-31", name: "Payroll", amount: 8, kind: "in" },
        { date: "2026-11-01", name: "Next", amount: 20, kind: "out" }
      ]
    },
    { nickname: "Share", last4: "4444", start_balance_basis: "balance_on_1st" },
    {
      nickname: "Old",
      last4: "5555",
      start_balance: 15,
      start_balance_date: "2026-09-28",
      start_balance_basis: "earliest_available",
      start_asof: "2026-10-05"
    },
    {
      nickname: "Legacy",
      last4: "6666",
      start_balance: 20,
      start_asof: "2026-10-01",
      outs: [{ date: "2026-10-03", name: "Fee", amount: 4 }]
    }
  ];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-06T12:00:00-04:00" });
  function card(tag) {
    const at = html.indexOf('data-fund="' + tag);
    assert.ok(at >= 0, tag);
    const next = html.indexOf('class="bank-fund-card"', at + 10);
    return html.slice(at, next < 0 ? html.length : next);
  }
  const bills = card("Bills");
  assert.match(bills, /data-fund-start="1"><span>Start \(Oct 1\)<\/span> <b>\$100\.00<\/b>/);
  assert.doesNotMatch(bills.slice(0, bills.indexOf("Oct 2")), /Oct 5/);
  assert.doesNotMatch(bills, /as of Oct 5/);
  assert.doesNotMatch(bills, /Prior|Next/);
  assert.match(bills, /Oct 2 Early <i class="bank-fund-lag">unreflected<\/i>/);
  assert.match(bills, /Oct 6 Rent <i class="bank-fund-lag">lag<\/i>[\s\S]*?\$60\.00/);
  assert.doesNotMatch(bills, /\$91\.00|\$96\.00/);
  assert.match(bills, /Oct 12 Gift[\s\S]*?\$77\.00/);
  assert.match(bills, /Oct 31 Payroll[\s\S]*?\$85\.00/);
  assert.match(bills, /Short \$3\.00/);
  assert.match(bills, /class="bank-fund-end"[\s\S]*?\$70\.00/);
  const share = card("Share");
  assert.match(share, /Start \(Oct 1\)<\/span> <b>\$42\.00<\/b>/);
  const old = card("Old");
  assert.match(old, /Start \(Sep 28\)<\/span> <b>\$15\.00<\/b>/);
  assert.match(old, /start balance as of Sep 28/);
  assert.doesNotMatch(old, /Oct 5/);
  const legacy = card("Legacy");
  assert.match(legacy, /<span>Start<\/span> <b>\$20\.00<\/b>/);
  assert.match(legacy, /as of Oct 1/);
  assert.match(legacy, /Oct 3 Fee[\s\S]*?\$16\.00/);
});

test("tip ec3 monthly totals stay on the calendar-month print", function () {
  const ctx = boot();
  const fx = blankBudget(loadFixture());
  const cal = { start: "2026-10-01", end: "2026-10-31", through_date: "2026-10-06", basis: "calendar_month" };
  fx.current.month_window = cal;
  fx.current.month_flow = {
    month: "2026-10",
    money_in: 21,
    money_out: 8,
    income_received: 21,
    required_spent: 5,
    needs_spent: 2,
    wants_spent: 1,
    window: cal
  };
  fx.budget.tiers_mtd = { month: "2026-10", required_spent: 5, needs_spent: 2, wants_spent: 1, window: cal };
  fx.budget.actuals_by_month = {
    "2026-10": { required_spent: 90, needs_spent: 1, wants_spent: 1, income_received: 21, window: cal }
  };
  fx.current.edits_tx = [
    { date: "2026-09-30", amount: 400, flow: "outflow", category: "Groceries", tx_key: "prior", desc: "Prior shop" },
    { date: "2026-10-03", amount: 300, flow: "outflow", category: "Groceries", tx_key: "mid", desc: "Mid shop" },
    { date: "2026-11-01", amount: 200, flow: "inflow", category: "Paycheck/Salary/Wages", tx_key: "next", desc: "Next pay" }
  ];
  fx.current.recent_tx = fx.current.edits_tx.slice();
  const html = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-06T14:00:00Z" });
  const io = html.slice(html.indexOf('class="bank-io"'), html.indexOf('class="bank-caps-block"'));
  assert.match(io, /Incoming \$21\.00, outgoing \$8\.00/);
  assert.doesNotMatch(io, /\$400|\$300|\$200/);
  const head = html.slice(html.indexOf("Received vs spent"), html.indexOf('class="bank-plan-bar"'));
  assert.match(head, /Received \$21\.00/);
  assert.match(head, /Spent \$8\.00/);
  assert.doesNotMatch(head, /\$400|\$300|\$200|\$90/);
  assert.match(html, /data-tier="required"[\s\S]*?Spent \$5\.00/);
  assert.doesNotMatch(html, /Spent \$90\.00/);
  const pieAt = html.indexOf('data-bank-pie="current-actual"');
  assert.ok(pieAt >= 0);
  const pie = html.slice(pieAt, pieAt + 900);
  assert.match(pie, /\$5\.00/);
  assert.doesNotMatch(pie, /\$300|\$400|\$90/);

  fx.current.month_flow.window = { start: "2026-09-15", end: "2026-10-15", through_date: "2026-10-06", basis: "pay_period" };
  const blocked = ctx.bankPageHtml(fx, { tab: "current", now: "2026-10-06T14:00:00Z" });
  const blockedIo = blocked.slice(blocked.indexOf('class="bank-io"'), blocked.indexOf('class="bank-caps-block"'));
  assert.match(blockedIo, /No incoming or outgoing/);
  assert.doesNotMatch(blockedIo, /\$21\.00|\$400|\$300|\$200/);
  assert.match(blocked, /data-tier="required"[\s\S]*?Spent \$90\.00/);
  assert.match(blocked, /Recent · actual[\s\S]*\$200\.00/);
});

function bankControlLabels(html) {
  function decode(s) {
    return String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }
  function labelOf(attrs, inner) {
    const aria = /aria-label="([^"]*)"/.exec(attrs || "");
    if (aria && aria[1].trim()) return decode(aria[1].trim());
    return decode(String(inner || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  }
  const src = String(html).replace(/<div id="mpNav">[\s\S]*?<!--\/mpNav--><\/div>/, "").replace(/<nav\b[\s\S]*?<\/nav>/gi, "");
  const labels = [];
  const patterns = [
    /<button\b([^>]*)>([\s\S]*?)<\/button>/gi,
    /<div\b([^>]*\brole="button"[^>]*)>([\s\S]*?)<\/div>/gi,
    /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  ];
  patterns.forEach(function (re) {
    let m;
    while ((m = re.exec(src))) {
      if (re.source.indexOf("<a\\b") === 0) {
        const attrs = m[1];
        if (!/role="button"/.test(attrs) && !/\bclass="[^"]*\bbtn\b/.test(attrs)) continue;
      }
      const label = labelOf(m[1], m[2]);
      if (label) labels.push(label);
    }
  });
  return labels;
}

test("banking pages do not repeat a button label outside the site nav", function () {
  const ctx = boot();
  const fx = loadFixture();
  const nav = '<div id="mpNav"><nav id="tabs"><a class="mp-top-btn" href="/#budget">Budget</a>' +
    '<a class="mp-top-btn" href="/#current">Current</a><a class="mp-top-btn" href="/#historical">Historical</a>' +
    '<button type="button">Budget</button></nav><!--/mpNav--></div>';
  const now = "2026-10-06T12:00:00-04:00";
  ["budget", "current", "historical", "edits"].forEach(function (tab) {
    const page = nav + ctx.bankPageHtml(fx, { tab: tab, planMonth: "2026-10", now: now, menuOpen: true });
    const labels = bankControlLabels(page);
    const counts = {};
    labels.forEach(function (label) { counts[label] = (counts[label] || 0) + 1; });
    const dups = Object.keys(counts).filter(function (label) { return counts[label] > 1; });
    assert.deepEqual(dups, [], tab + " " + dups.join(", "));
    assert.equal(counts.Budget, undefined, tab);
    assert.equal(counts.Current, undefined, tab);
    assert.equal(counts.Historical, undefined, tab);
  });
  const withNav = bankControlLabels(nav + '<button type="button">Budget</button>');
  assert.deepEqual(withNav, ["Budget"]);
});

function attachNav(ctx) {
  const elements = {};
  function makeEl(id) {
    const el = {
      id: id || "",
      hidden: false,
      className: "",
      _html: "",
      _after: "",
      _afterNode: null,
      insertAdjacentHTML: function (pos, html) { this._after += html; },
      insertAdjacentElement: function (pos, node) { this._afterNode = node; },
      setAttribute: function () {},
      getAttribute: function () { return null; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      classList: { toggle: function () {} },
      focus: function () {}
    };
    Object.defineProperty(el, "innerHTML", {
      configurable: true,
      get: function () { return this._html; },
      set: function (v) { this._html = String(v); }
    });
    if (id) elements[id] = el;
    return el;
  }
  elements.mpNav = makeEl("mpNav");
  const rawSet = Object.getOwnPropertyDescriptor(elements.mpNav, "innerHTML").set;
  Object.defineProperty(elements.mpNav, "innerHTML", {
    get: function () { return elements.mpNav._html; },
    set: function (v) {
      rawSet.call(elements.mpNav, v);
      const nav = /<nav id="tabs"[^>]*>([\s\S]*?)<\/nav>/.exec(String(v));
      if (nav) {
        if (!elements.tabs) elements.tabs = makeEl("tabs");
        elements.tabs.innerHTML = nav[1];
      }
    }
  });
  elements.main = makeEl("main");
  elements.header = makeEl("header");
  ctx.document.getElementById = function (id) { return elements[id] || null; };
  ctx.document.querySelector = function (sel) {
    if (sel === "main") return elements.main;
    if (sel === "header") return elements.header;
    if (sel === "nav.docs-foot") return null;
    return null;
  };
  ctx.document.createElement = function () { return makeEl(""); };
  ctx.document.readyState = "complete";
  ctx.location.replace = function (url) {
    ctx._replaced = ctx._replaced || [];
    ctx._replaced.push(url);
  };
  vm.runInContext(fs.readFileSync(path.join(root, "js/nav.js"), "utf8"), ctx, { filename: "nav.js" });
  return elements;
}

test("tip ec4 titles each banking view and the nav marks the hash", function () {
  const ctx = boot();
  const fx = loadFixture();
  const now = "2026-10-06T15:00:00-04:00";
  ["budget", "current", "historical", "edits"].forEach(function (tab) {
    const html = ctx.bankPageHtml(fx, { tab: tab, now: now, planMonth: "2026-10", histMonth: "2026-09", menuOpen: true });
    assertNoTabButtons(html);
    assert.doesNotMatch(html, /data-bank-tab="budget"|data-bank-tab="current"|data-bank-tab="historical"/);
    assert.match(html, /aria-label="More"/);
    assert.match(html, /role="menuitem"[^>]*>Edits</);
  });
  assert.match(ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-11", now: now }), /class="bank-view-title"[^>]*>Budget · November 2026</);
  assert.match(ctx.bankPageHtml(fx, { tab: "current", now: "2026-11-02T16:00:00-05:00" }), /class="bank-view-title"[^>]*>Current · November 2026</);
  assert.match(ctx.bankPageHtml(fx, { tab: "historical", histMonth: "2026-09", now: now }), /class="bank-view-title"[^>]*>Historical · September 2026</);
  assert.match(ctx.bankPageHtml(fx, { tab: "edits", now: now }), /class="bank-view-title"[^>]*>Edits</);
  assert.doesNotMatch(ctx.bankPageHtml(fx, { tab: "edits", now: now }), /class="bank-view-title"[^>]*>Edits ·/);

  ctx.location.hash = "";
  ctx.location.pathname = "/";
  ctx.location.search = "";
  const elements = attachNav(ctx);
  const el = mount(ctx, fx, { now: now });
  function fire(type) {
    (ctx._bankListeners[type] || []).forEach(function (fn) { fn(); });
  }
  function marked() {
    const html = elements.tabs.innerHTML;
    const hits = [];
    ["budget", "current", "historical"].forEach(function (id) {
      if (new RegExp('data-nav-item="' + id + '"[^>]*aria-current="page"').test(html)) hits.push(id);
    });
    return hits.join(",");
  }
  assert.match(elements.tabs.innerHTML, /href="\/#budget"/);
  assert.match(elements.tabs.innerHTML, /href="\/#current"/);
  assert.match(elements.tabs.innerHTML, /href="\/#historical"/);
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Budget · October 2026</);
  assert.equal(marked(), "budget");
  assert.equal(ctx._replaced, undefined);

  ctx.location.hash = "#current";
  fire("hashchange");
  assert.match(el.innerHTML, /data-panel="current"/);
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Current · October 2026</);
  assert.equal(marked(), "current");

  ctx.location.hash = "#historical";
  fire("popstate");
  assert.match(el.innerHTML, /data-panel="historical"/);
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Historical · October 2026</);
  assert.equal(marked(), "historical");

  ctx.location.hash = "#historical=2026-08";
  fire("hashchange");
  assert.match(el.innerHTML, /data-panel="historical"/);
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Historical · August 2026</);
  assert.equal(marked(), "historical");

  ctx.location.hash = "#edits";
  fire("popstate");
  assert.match(el.innerHTML, /data-panel="edits"/);
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Edits</);
  assert.match(el.innerHTML, /aria-label="More"/);
  assert.equal(marked(), "");

  ctx.location.hash = "#budget";
  fire("hashchange");
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Budget · October 2026</);
  assert.equal(el._bank.tab, "budget");
  assert.equal(marked(), "budget");

  ctx.location.hash = "";
  fire("popstate");
  assert.match(el.innerHTML, /data-panel="budget"/);
  assert.equal(marked(), "budget");

  const planBtn = {
    getAttribute: function (name) { return name === "data-bank-plan" ? "1" : null; }
  };
  el.listeners.click({
    target: {
      closest: function (sel) { return sel === "[data-bank-plan]" ? planBtn : null; }
    },
    preventDefault: function () {}
  });
  assert.match(el.innerHTML, /class="bank-view-title"[^>]*>Budget · November 2026</);
  assert.equal(marked(), "budget");
});
