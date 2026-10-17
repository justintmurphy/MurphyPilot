"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");

function boot() {
  const store = {};
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
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
      setItem: function (key, value) { store[key] = String(value); },
      removeItem: function (key) { delete store[key]; }
    },
    document: document,
    location: { hash: "", pathname: "/", search: "" },
    history: { replaceState: function () {} },
    addEventListener: function () {},
    removeEventListener: function () {},
    console: console,
    fetch: function () { return Promise.reject(new Error("no fetch")); },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    setTimeout: function () { return 0; },
    clearTimeout: function () {},
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
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/list-cap.js"), "utf8"), sandbox, { filename: "list-cap.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/ticker.js"), "utf8"), sandbox, { filename: "ticker.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8"), sandbox, { filename: "banking.js" });
  return sandbox;
}

function snap() {
  return {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [
      { id: "chk", nickname: "Checking", name: "Checking", last4: "1111", suffix: "1111", subType: "checking" },
      { id: "deb", nickname: "Debit", name: "Debit", last4: "2222", suffix: "2222", subType: "checking" },
      { id: "pad", nickname: "Backstop", name: "Backstop", last4: "3333", suffix: "3333", subType: "savings", backstop: true }
    ],
    current: {
      month: "2026-10",
      balance_after_pending: { "1111": 80, "2222": 20, "3333": 500 },
      edits_tx: [],
      recent_tx: []
    },
    history: { months: [] },
    budget: {
      budget_month: { month: "2026-10", start: "2026-09-30", end: "2026-10-29" },
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-09-30", amount: 40 },
        { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 50 },
        { name: "Payroll", kind: "payroll", date: "2026-10-18", amount: 10 },
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 40 },
        { name: "Payroll", kind: "payroll", date: "2026-11-30", amount: 40 }
      ],
      bills: [
        { name: "Rent", amount: 30, typical_day: 20, cadence: "monthly", tier: "required" },
        { name: "Mortgage", amount: 100, typical_day: 14, cadence: "monthly", tier: "required" },
        { name: "Sample insurance", amount: 15, typical_day: 14, cadence: "monthly", tier: "required" },
        { name: "Auto loan", amount: 22, typical_day: 14, cadence: "monthly", tier: "required" },
        { name: "Stream", amount: 8, typical_day: 14, cadence: "monthly", tier: "required" },
        { name: "Power", amount: 9, typical_day: 8, cadence: "monthly", tier: "required" }
      ],
      one_time_bills: [
        { name: "Trip", amount: 12, date: "2026-10-21", flexible: true },
        { name: "Locked fee", amount: 7, date: "2026-10-22", flexible: false }
      ],
      subscriptions: [],
      account_funding: [
        { nickname: "Checking", last4: "1111", subType: "checking", current_balance: 80 },
        { nickname: "Debit", last4: "2222", subType: "checking", current_balance: 20 },
        { nickname: "Backstop", last4: "3333", subType: "savings", backstop: true, current_balance: 500 }
      ]
    },
    tier_doc: {
      rules: {},
      plans: {},
      categories: [
        { id: "groceries", name: "Groceries", tier: "needs", budget: 10 },
        { id: "dining", name: "Dining", tier: "wants", budget: 6 },
        { id: "mortgage", name: "Mortgage", tier: "required", budget: 100 }
      ],
      category_rules: {},
      category_tx: {}
    }
  };
}

const NOW = "2026-10-16T16:00:00Z";

test("a missing budget month is labeled as the calendar month", function () {
  const ctx = boot();
  const fx = snap();
  delete fx.budget.budget_month;
  const win = ctx.bankBudgetWindowFor(fx, "2026-10");
  assert.equal(win.basis, "calendar");
  assert.equal(win.start, "2026-10-01");
  assert.equal(win.end, "2026-10-31");
  assert.equal(ctx.bankMonthRangeLabel(win), "Calendar month: Oct 1 \u2013 Oct 31");
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: NOW });
  assert.match(html, /data-bank-month-range="1"[^>]*data-basis="calendar"/);
  assert.match(html, /Calendar month: Oct 1 \u2013 Oct 31/);
  assert.match(html, /class="bank-view-title"[^>]*>Budget · October 2026</);
  assert.match(html, /data-bank-cal-range="1">Calendar month</);
});

test("the budget header and month control use the printed window", function () {
  const ctx = boot();
  const fx = snap();
  const win = ctx.bankBudgetWindowFor(fx, "2026-10");
  assert.equal(win.basis, "budget");
  assert.equal(win.start, "2026-09-30");
  assert.equal(win.end, "2026-10-29");
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: NOW });
  assert.match(html, /Budget month: Sep 30 \u2013 Oct 29/);
  assert.match(html, /data-bank-now="1"/);
  assert.match(html, /Right now/);
  assert.match(html, /data-bank-overall="1"/);
  assert.match(html, /data-bank-cal-range="1">Sep 30 \u2013 Oct 29</);
  const nov = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-11", now: NOW });
  assert.match(nov, /Budget month: Oct 30 \u2013 Nov 29/);
  assert.match(nov, /data-bank-cal-range="1">Oct 30 \u2013 Nov 29</);
});

test("a month key computes the window from last payroll dates", function () {
  const ctx = boot();
  const fx = snap();
  fx.budget.budget_month = "2026-10";
  const win = ctx.bankBudgetWindowFor(fx, "2026-10");
  assert.equal(win.start, "2026-09-30");
  assert.equal(win.end, "2026-10-29");
  assert.equal(win.basis, "budget");
});

test("free to spend uses spending cash, remaining income, tied bills, and the next-week reserve", function () {
  const ctx = boot();
  const fx = snap();
  const glance = ctx.bankBudgetGlance(fx, { planMonth: "2026-10", now: NOW });
  assert.equal(glance.available, 100);
  assert.ok(glance.available < 500);
  assert.equal(glance.remainingIncome, 60);
  assert.equal(glance.expectedIncome, 60);
  assert.ok(glance.remainingBills > glance.reserve);
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: NOW });
  assert.match(html, /data-bank-free-available="100"/);
  assert.equal(Number((html.match(/data-bank-free="([^"]*)"/) || [])[1]), glance.free);
  assert.ok(glance.free < 0);
  assert.match(html, /data-bank-free="[^"]*" class="tone-stop"/);
  assert.match(html, /aria-label="Shortfall"/);
  const face = html.slice(html.indexOf('data-bank-pace="1"'), html.indexOf('data-bank-free-math'));
  assert.match(face, /data-bank-pace-spent=/);
  assert.match(face, /data-bank-pace-income="60"/);
  assert.match(face, /class="bank-pace-today"/);
  assert.match(html, /data-bank-free-math="1"/);
  assert.doesNotMatch(face, /data-bank-free-math/);
  assert.doesNotMatch(html.slice(0, html.indexOf('data-bank-defer="1"')), /<p class="hint"/);
});

test("the put-off list is advice, skips protected and past-grace bills, and keeps four lines", function () {
  const ctx = boot();
  const fx = snap();
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: NOW });
  const face = html.slice(html.indexOf('data-bank-defer="1"'), html.indexOf("data-bank-free-math"));
  const restAt = html.indexOf('data-bank-defer-rest="1"');
  const rest = html.slice(restAt, html.indexOf("data-bank-hero-now", restAt));
  const advice = html.slice(html.indexOf('data-bank-defer="1"'), html.indexOf("data-bank-hero-now"));
  assert.match(face, /What you can put off/);
  assert.match(face, /Advice/);
  assert.match(face, /data-bank-advice="1"/);
  assert.match(face, />Trip</);
  assert.match(face, /Put off/);
  assert.match(face, />Groceries</);
  assert.match(face, /Trim/);
  assert.match(face, /data-bank-defer-total="1"/);
  assert.equal((face.match(/<li/g) || []).length, 4);
  assert.doesNotMatch(face, /Mortgage|insurance|Auto loan|Power|Stream/);
  assert.match(rest, />Stream</);
  assert.match(rest, /Move to Oct 18 · no late fee/);
  assert.doesNotMatch(advice, /Mortgage|Sample insurance|Auto loan|>Power</);
  const freed = Number((face.match(/data-freed="([^"]*)"/) || [])[1]);
  const gap = Number((face.match(/data-gap="([^"]*)"/) || [])[1]);
  assert.ok(freed > 0);
  assert.ok(gap > freed);
  assert.match(face, new RegExp("Freed[\\s\\S]{0,40}" + freed));
});

test("a positive balance under the cushion still lists cuts, and room above it does not", function () {
  const ctx = boot();
  const low = snap();
  low.budget.bills = [];
  low.budget.one_time_bills = [{ name: "Trip", amount: 12, date: "2026-10-21", flexible: true }];
  low.current.balance_after_pending = { "1111": 4, "2222": 0, "3333": 500 };
  low.budget.pay_schedule = [
    { name: "Payroll", kind: "payroll", date: "2026-09-30", amount: 40 },
    { name: "Payroll", kind: "payroll", date: "2026-10-20", amount: 10 },
    { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 40 }
  ];
  const lowOpts = { tab: "budget", planMonth: "2026-10", now: NOW, edits: { cushionPct: 50 } };
  const lowHtml = ctx.bankPageHtml(low, lowOpts);
  const lowFree = Number((lowHtml.match(/data-bank-free="([^"]*)"/) || [])[1]);
  const lowSpare = ctx.bankBudgetFit(low, ctx.bankFitMonth(low, lowOpts), lowOpts).left;
  assert.equal(lowFree, lowSpare);
  assert.match(lowHtml, /What you can put off/);
  const high = snap();
  high.budget.bills = [];
  high.budget.one_time_bills = [];
  high.budget.pay_schedule = [{ name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 40 }];
  high.current.balance_after_pending = { "1111": 400, "2222": 0, "3333": 900 };
  const highOpts = { tab: "budget", planMonth: "2026-10", now: NOW };
  const highHtml = ctx.bankPageHtml(high, highOpts);
  const highSpare = ctx.bankBudgetFit(high, ctx.bankFitMonth(high, highOpts), highOpts).left;
  assert.doesNotMatch(highHtml, /What you can put off/);
  assert.doesNotMatch(highHtml, /data-bank-defer="1"/);
  assert.equal(Number((highHtml.match(/data-bank-free="([^"]*)"/) || [])[1]), highSpare);
  if (highSpare < -0.004) assert.match(highHtml, /data-bank-free="[^"]*" class="tone-stop"/);
  else assert.doesNotMatch(highHtml.match(/data-bank-free="[^"]*" class="([^"]*)"/)[1], /tone-stop/);
});

test("Edits stores the cushion percent and the public script has no backstop digits", function () {
  const ctx = boot();
  const fx = snap();
  const edits = ctx.bankPageHtml(fx, { tab: "edits", now: NOW });
  assert.match(edits, /data-bank-cushion="1"/);
  assert.match(edits, /aria-label="Emergency cushion percent"[^>]*value="5"/);
  const host = { _bank: { data: fx, edits: {} }, innerHTML: "" };
  ctx.bankSaveCushion(host, "12.5");
  assert.equal(host._bank.edits.cushionPct, 12.5);
  const again = ctx.bankPageHtml(fx, { tab: "edits", now: NOW, edits: host._bank.edits });
  assert.match(again, /value="12.5"/);
  const src = fs.readFileSync(path.join(__dirname, "..", "js", "banking.js"), "utf8");
  assert.doesNotMatch(src, /4925/);
  assert.doesNotMatch(src, /What you can put off[\s\S]{0,80}employer/i);
});
