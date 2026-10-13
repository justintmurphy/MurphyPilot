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
    documentElement: { setAttribute: function () {}, getAttribute: function () { return "justin"; } }
  };
  const sandbox = {
    localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
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

test("budget fit is income minus bills minus category budgets, and trims spend the slack first", function () {
  const ctx = boot();
  const rows = [
    { id: "groceries", name: "Groceries", tier: "needs", budget: 40, avg: 10 },
    { id: "dining", name: "Dining", tier: "wants", budget: 20, avg: 18 },
    { id: "rent", name: "Rent", tier: "required", budget: 100, avg: 0 }
  ];
  const first = ctx.bankTrimSuggestions(rows, 25);
  assert.equal(first.filter(function (row) { return row.id === "rent"; }).length, 0);
  assert.equal(first.filter(function (row) { return row.id === "groceries"; })[0].trim, 25);
  assert.equal(first.filter(function (row) { return row.id === "dining"; })[0].trim, 0);
  const shared = ctx.bankTrimSuggestions([
    { id: "groceries", name: "Groceries", tier: "needs", budget: 40, avg: 30 },
    { id: "fun", name: "Fun", tier: "wants", budget: 20, avg: 20 }
  ], 16);
  const groceries = shared.filter(function (row) { return row.id === "groceries"; })[0];
  const fun = shared.filter(function (row) { return row.id === "fun"; })[0];
  assert.equal(groceries.trim, 13.6);
  assert.equal(fun.trim, 2.4);
  assert.equal(ctx.bankRoundCents(groceries.trim + fun.trim), 16);
  const snap = {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [{ id: "chk", nickname: "Checking", last4: "2222", suffix: "2222" }],
    current: { month: "2026-10", edits_tx: [], recent_tx: [] },
    history: { months: [] },
    budget: {
      income_monthly: [{ label: "Payroll", amount: 20, deposits: [{ day: 15, amount: 10 }, { day: 30, amount: 10 }] }],
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 10 },
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 10 }
      ],
      bills: [],
      subscriptions: [],
      actuals_by_month: {
        "2026-07": { categories_spent: { groceries: 10, fun: 4 } },
        "2026-08": { categories_spent: { groceries: 10, fun: 4 } },
        "2026-09": { categories_spent: { groceries: 10, fun: 4 } }
      },
      account_funding: [{ nickname: "Checking", last4: "2222", current_balance: 80, pending_unposted: 0 }]
    },
    tier_doc: {
      rules: {},
      plans: {},
      categories: [
        { id: "rent", name: "Rent", tier: "required", budget: 50, merged_into: "" },
        { id: "groceries", name: "Groceries", tier: "needs", budget: 22, merged_into: "" },
        { id: "fun", name: "Fun", tier: "wants", budget: 8, merged_into: "" }
      ],
      category_rules: {},
      category_tx: {},
      bill_status: {},
      manual_paid: {}
    }
  };
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" };
  const fit = ctx.bankBudgetFit(snap, "2026-10");
  assert.equal(fit.income, ctx.bankMonthDepositIncome(snap, "2026-10"));
  assert.equal(fit.bills, 50);
  assert.equal(fit.categories, 30);
  assert.equal(fit.left, ctx.bankRoundCents(fit.income - 50 - 30));
  assert.ok(fit.left < 0);
  const html = ctx.bankBudgetFitHtml(snap, opts, "2026-10");
  assert.match(html, /data-bank-budget-fit="1"/);
  assert.match(html, /data-bank-fit-bills="50"/);
  assert.match(html, /data-bank-fit-categories="30"/);
  assert.match(html, /Over by/);
  const gap = ctx.bankRoundCents(-fit.left);
  const cuts = ctx.bankCutRows(snap, "2026-10", gap);
  assert.equal(cuts.filter(function (row) { return row.id === "rent"; }).length, 0);
  const g = cuts.filter(function (row) { return row.id === "groceries"; })[0];
  const f = cuts.filter(function (row) { return row.id === "fun"; })[0];
  assert.equal(g.avg, 10);
  assert.equal(f.avg, 4);
  assert.equal(g.trim, 22);
  assert.equal(f.trim, 8);
  assert.ok(gap > 30);
  assert.equal(ctx.bankRoundCents(g.trim + f.trim), 30);
  assert.match(html, new RegExp('data-bank-cut-row="groceries"[^>]*data-trim="' + g.trim + '"'));
  assert.match(html, new RegExp('data-bank-cut-row="fun"[^>]*data-trim="' + f.trim + '"'));
});

test("monthly income counts a received deposit once when it matches the expected paycheck", function () {
  const ctx = boot();
  const data = {
    asof: "2026-10-06T12:00:00-04:00",
    accounts: [{ id: "chk", nickname: "Checking", last4: "2222" }],
    current: {
      month: "2026-10",
      edits_tx: [
        { date: "2026-10-15", amount: 10, flow: "inflow", desc: "Payroll", tx_key: "pay-1", category: "Payroll" },
        { date: "2026-10-20", amount: 4, flow: "inflow", desc: "Gift", tx_key: "gift-1", category: "Gift" }
      ],
      recent_tx: []
    },
    budget: {
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 10 },
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 10 }
      ],
      bills: [],
      subscriptions: []
    },
    tier_doc: { categories: [] }
  };
  assert.equal(ctx.bankMonthDepositIncome(data, "2026-10"), 24);
});
