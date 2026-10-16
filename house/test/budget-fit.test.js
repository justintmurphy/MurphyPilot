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

test("budget fit is paycheck income minus dated bills, subs, and the spend pot", function () {
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
  assert.equal(fit.income, 20);
  assert.equal(fit.bills, 0);
  assert.equal(fit.subs, 0);
  assert.equal(fit.pot, 30);
  assert.equal(fit.categories, 30);
  assert.equal(fit.left, -10);
  const html = ctx.bankBudgetFitHtml(snap, opts, "2026-10");
  assert.match(html, /data-bank-budget-fit="1"/);
  assert.match(html, /data-bank-fit-bills="0"/);
  assert.match(html, /data-bank-fit-categories="30"/);
  assert.match(html, /Over by/);
  const gap = ctx.bankRoundCents(-fit.left);
  const cuts = ctx.bankCutRows(snap, "2026-10", gap);
  assert.equal(cuts.filter(function (row) { return row.id === "rent"; }).length, 0);
  const g = cuts.filter(function (row) { return row.id === "groceries"; })[0];
  const f = cuts.filter(function (row) { return row.id === "fun"; })[0];
  assert.equal(g.avg, 10);
  assert.equal(f.avg, 4);
  assert.equal(g.trim, 10);
  assert.equal(f.trim, 0);
  assert.equal(gap, 10);
  assert.equal(ctx.bankRoundCents(g.trim + f.trim), 10);
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

test("November uses the computed window and one spare across the bar, Edits, and After budgets", function () {
  const ctx = boot();
  const categories = [
    { id: "groceries", name: "Groceries", tier: "needs", budget: 1000, merged_into: "" },
    { id: "dining", name: "Dining", tier: "wants", budget: 0, merged_into: "" },
    { id: "kids-activities", name: "Kids & Activities", tier: "wants", budget: 931, merged_into: "" },
    { id: "utilities", name: "Utilities", tier: "required", budget: 500, merged_into: "" },
    { id: "mortgage", name: "Mortgage", tier: "required", budget: 999, merged_into: "" },
    { id: "subscriptions", name: "Subscriptions", tier: "wants", budget: 999, merged_into: "" },
    { id: "streaming-entertainment", name: "Streaming & Entertainment", tier: "wants", budget: 0, merged_into: "" },
    { id: "software-ai", name: "Software & AI", tier: "wants", budget: 0, merged_into: "" }
  ];
  const snap = {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [{ id: "chk", nickname: "Everyday", last4: "1111", suffix: "1111", role: "everyday", subType: "checking" }],
    current: { month: "2026-10", edits_tx: [], recent_tx: [] },
    history: { months: [] },
    budget: {
      budget_month: { month: "2026-10", label: "2026-10", start: "2026-09-30", end: "2026-10-29" },
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 4000 },
        { name: "Payroll", kind: "payroll", date: "2026-11-13", amount: 4651.12 },
        { name: "Stipend", kind: "stipend", date: "2026-11-25", amount: 1000 },
        { name: "Payroll", kind: "payroll", date: "2026-11-30", amount: 4000 }
      ],
      pay_periods: [{
        current: true,
        start: "2026-10-30",
        end: "2026-11-13",
        accounts: {
          "1111": {
            nickname: "Everyday", role: "everyday", subType: "checking",
            start_balance: 500, left_at_end: 200
          }
        }
      }, {
        start: "2026-09-30",
        end: "2026-10-29",
        accounts: {
          "1111": {
            nickname: "Everyday", role: "everyday", subType: "checking",
            left_at_end: 80
          }
        }
      }],
      other_income: [{ name: "Side", amount: 40, date: "2026-11-10" }],
      subs_total: 487.96,
      category_deleted: ["subscriptions"],
      bills: [{ name: "Housing stack", amount: 7094.19, due_day: 6, cadence: "monthly", category: "utilities" }],
      subscriptions: [
        { sub_id: "s-stream", name: "Stream Desk", amount: 20, category: "streaming-entertainment", next_date: "2026-11-08" },
        { sub_id: "s-code", name: "Code Desk", amount: 30, category: "software-ai", next_date: "2026-11-12" },
        { sub_id: "s-inbox", name: "Inbox Plus", amount: 8, category: "subscriptions", next_date: "2026-11-04" }
      ],
      box_categories: categories,
      tiers_overlay: {
        updated_at: "2026-10-16T12:00:00Z",
        category_deleted: ["subscriptions"],
        tiers: { categories: categories },
        november_budget: {
          month: "2026-11",
          pot: 9000,
          guides: { groceries: 50, dining: 50, "kids-activities": 50, subscriptions: 40 }
        }
      }
    },
    tier_doc: {
      updated_at: "2026-10-16T15:00:00Z",
      categories: categories,
      budgets_updated_at: {
        groceries: "2026-10-16T15:00:00Z",
        dining: "2026-10-16T15:00:00Z",
        "kids-activities": "2026-10-16T15:00:00Z"
      },
      category_rules: {},
      category_tx: {},
      bill_status: {},
      manual_paid: {}
    }
  };
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" };
  const oct = ctx.bankBudgetWindowFor(snap, "2026-10");
  const nov = ctx.bankBudgetWindowFor(snap, "2026-11");
  assert.equal(oct.start, "2026-09-30");
  assert.equal(oct.end, "2026-10-29");
  assert.equal(nov.start, "2026-10-30");
  assert.equal(nov.end, "2026-11-29");
  assert.equal(ctx.bankFitMonth(snap, opts), "2026-11");
  assert.equal(ctx.bankBudgetPartKind("kids-activities", "wants"), "spend");
  const fit = ctx.bankBudgetFit(snap, "2026-11");
  assert.equal(fit.income, 9651.12);
  assert.equal(fit.bills, 7094.19);
  assert.equal(fit.subs, 487.96);
  assert.equal(fit.pot, 1931);
  assert.equal(fit.other, 40);
  assert.equal(fit.left, 137.97);
  const edited = ctx.bankBudgetFit(snap, "2026-11", { edits: { bills: { "Housing stack": { amount: 100 } } } });
  assert.equal(edited.bills, 100);
  assert.equal(ctx.bankRoundCents(edited.income - edited.bills - edited.subs - edited.pot), edited.left);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(snap, "2026-11"), "dining").budget, 0);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(snap, "2026-11"), "subscriptions"), null);
  const visible = ctx.bankSpendVisible(ctx.bankSpendCategories(snap, "2026-11")).map(function (row) { return row.id; });
  assert.equal(visible.indexOf("subscriptions"), -1);
  const starters = ctx.bankPlanSpendRows(snap, []);
  assert.equal(starters.some(function (row) { return row.id === "subscriptions"; }), false);
  const emptyOnly = ctx.bankPlanSpendRows(snap, [{ id: "subscriptions", name: "Subscriptions", tier: "wants", plan: 0, budget: 0, spent: 0 }]);
  assert.equal(emptyOnly.length, 0);
  const page = ctx.bankPageHtml(snap, opts);
  const bar = page.slice(page.indexOf('data-bank-bar="income"'), page.indexOf('data-bank-bar="income"') + 900);
  assert.match(bar, /data-bank-fit-bills="7094.19"/);
  assert.match(bar, /data-bank-fit-subs="487.96"/);
  assert.match(bar, /data-bank-fit-pot="1931"/);
  assert.match(bar, /data-bank-fit-spare="137.97"/);
  assert.match(bar, /\$9,513\.15 of \$9,651\.12, 99%, /);
  assert.match(bar, /Fits: \$137\.97 to spare/);
  assert.match(page, /data-bank-after-now="137.97"/);
  assert.match(page, /data-bank-after-month="137.97"/);
  assert.match(page, /data-bank-after-cats="137.97"/);
  assert.doesNotMatch(page, /data-bank-cat-row="subscriptions"/);
  assert.doesNotMatch(page, /data-bank-bill-group="subscriptions"/);
  assert.match(page, /data-bank-bill-group="streaming-entertainment"/);
  assert.match(page, /Stream Desk/);
  assert.match(page, /data-bank-bill-group="software-ai"/);
  assert.match(page, /Code Desk/);
  const edits = ctx.bankPageHtml(snap, { tab: "edits", planMonth: "2026-10", now: opts.now });
  assert.match(edits, /data-bank-fit-spare="137.97"/);
  assert.match(edits, /data-bank-fit-bills="7094.19"/);
  assert.match(edits, /data-bank-fit-subs="487.96"/);
  assert.match(edits, /data-bank-fit-pot="1931"/);
  assert.match(edits, /Other income \$40\.00 is not counted/);
  assert.doesNotMatch(edits, /data-bank-cat-jump="subscriptions"/);
  assert.doesNotMatch(edits, /data-bank-edit-group="subscriptions"/);
  assert.match(edits, /data-bank-edit-group="streaming-entertainment"/);
  assert.match(edits, /data-bank-edit-group="software-ai"/);
  const past = JSON.parse(JSON.stringify(snap));
  delete past.budget.tiers_overlay.november_budget.month;
  assert.equal(ctx.bankFitMonth(past, { planMonth: "2026-10", now: "2026-10-16T16:00:00Z" }), "2026-10");
  assert.equal(ctx.bankFitMonth(past, { planMonth: "2026-10", now: "2026-10-30T16:00:00Z" }), "2026-11");
});
