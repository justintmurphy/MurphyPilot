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
    { id: "kids-activities", name: "Kids & Activities", tier: "wants", budget: 830, merged_into: "" },
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
      bills_total_effective: 7094.19,
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
  assert.equal(fit.pot, 1830);
  assert.equal(fit.other, 40);
  assert.equal(fit.left, 238.97);
  const edited = ctx.bankBudgetFit(snap, "2026-11", { edits: { bills: { "Housing stack": { amount: 100 } } } });
  assert.equal(edited.bills, 7094.19);
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
  const bar = page.slice(page.indexOf('data-bank-bar="income"'), page.indexOf('data-bank-bar="income"') + 1600);
  assert.match(bar, /Main Budget/);
  assert.match(bar, /data-bank-bar-month="2026-11"/);
  assert.match(bar, /data-bank-fit-bills="7094.19"/);
  assert.match(bar, /data-bank-fit-subs="487.96"/);
  assert.match(bar, /data-bank-fit-pot="1830"/);
  assert.match(bar, /data-bank-fit-spare="238.97"/);
  assert.match(bar, /\$9,412\.15 of \$9,651\.12, 98%, /);
  assert.match(bar, /Fits: \$238\.97 to spare/);
  assert.match(page, /data-bank-bar="spend"[^>]*data-bank-bar-month="2026-10"/);
  assert.match(page, /data-bank-bar="spend"[\s\S]{0,900}>October so far</);
  assert.match(page, /data-bank-after-now="238.97"/);
  assert.match(page, /data-bank-after-month="238.97"/);
  assert.match(page, /data-bank-after-cats="238.97"/);
  assert.doesNotMatch(page, /data-bank-cat-row="subscriptions"/);
  assert.doesNotMatch(page, /data-bank-bill-group="subscriptions"/);
  assert.match(page, /data-bank-bill-group="streaming-entertainment"/);
  assert.match(page, /Stream Desk/);
  assert.match(page, /data-bank-bill-group="software-ai"/);
  assert.match(page, /Code Desk/);
  const edits = ctx.bankPageHtml(snap, { tab: "edits", planMonth: "2026-10", now: opts.now });
  assert.match(edits, /data-bank-fit-spare="238.97"/);
  assert.match(edits, /data-bank-fit-bills="7094.19"/);
  assert.match(edits, /data-bank-fit-subs="487.96"/);
  assert.match(edits, /data-bank-fit-pot="1830"/);
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

test("a due-in-window fallback still counts a bill after the last pay period", function () {
  const ctx = boot();
  const snap = {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [],
    current: { month: "2026-10", edits_tx: [], recent_tx: [] },
    history: { months: [] },
    budget: {
      budget_month: { month: "2026-10", start: "2026-09-30", end: "2026-10-29" },
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 1000 },
        { name: "Payroll", kind: "payroll", date: "2026-11-30", amount: 1000 }
      ],
      pay_periods: [{ start: "2026-11-13", end: "2026-11-24", current: true }],
      bills: [{ name: "Late desk", amount: 25, due_day: 27, cadence: "monthly" }],
      subscriptions: []
    },
    tier_doc: { categories: [] }
  };
  assert.equal(ctx.bankBudgetWindowFor(snap, "2026-11").end, "2026-11-29");
  assert.equal(ctx.bankBudgetFit(snap, "2026-11").bills, 25);
  snap.budget.bills_total_effective = 10;
  assert.equal(ctx.bankBudgetFit(snap, "2026-11").bills, 10);
});

test("October spending uses this budget month while the income bar is Main Budget", function () {
  const ctx = boot();
  const snap = {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [],
    current: {
      month: "2026-10",
      edits_tx: [{ date: "2026-10-12", amount: 40, flow: "outflow", desc: "Market", category: "Groceries", tx_key: "m1" }],
      recent_tx: []
    },
    history: { months: [] },
    budget: {
      budget_month: { month: "2026-10", start: "2026-09-30", end: "2026-10-29" },
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 4000 },
        { name: "Payroll", kind: "payroll", date: "2026-11-13", amount: 4000 },
        { name: "Payroll", kind: "payroll", date: "2026-11-30", amount: 4000 }
      ],
      pay_periods: [{
        current: true,
        start: "2026-10-30",
        end: "2026-11-13",
        accounts: { "1111": { nickname: "Everyday", role: "everyday", subType: "checking", left_at_end: 20 } }
      }],
      bills: [],
      subscriptions: [],
      tiers_overlay: {
        updated_at: "2026-10-16T12:00:00Z",
        tiers: { categories: [
          { id: "groceries", name: "Groceries", tier: "needs", budget: 100 },
          { id: "dining", name: "Dining", tier: "wants", budget: 50 }
        ] },
        november_budget: { month: "2026-11", pot: 900, guides: { groceries: 20, dining: 10 } }
      }
    },
    tier_doc: {
      categories: [
        { id: "groceries", name: "Groceries", tier: "needs", budget: 100, merged_into: "" },
        { id: "dining", name: "Dining", tier: "wants", budget: 50, merged_into: "" }
      ],
      budgets_updated_at: { groceries: "2026-10-16T15:00:00Z", dining: "2026-10-16T15:00:00Z" },
      category_rules: {},
      category_tx: {}
    }
  };
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" };
  assert.equal(ctx.bankFitMonth(snap, opts), "2026-11");
  assert.equal(ctx.bankSpendBarMonth(snap, opts), "2026-10");
  assert.equal(ctx.bankSpendingSpent(snap, "2026-11"), 0);
  assert.equal(ctx.bankSpendingSpent(snap, "2026-10"), 40);
  const page = ctx.bankPageHtml(snap, opts);
  const spend = page.slice(page.indexOf('data-bank-bar="spend"'), page.indexOf('data-bank-bar="spend"') + 2200);
  assert.match(spend, /data-bank-bar-month="2026-10"/);
  assert.match(spend, />October so far</);
  assert.match(spend, /data-bank-spend-spent="40"/);
  assert.match(spend, /Groceries[\s\S]{0,80}\$40\.00 of \$100\.00/);
  assert.match(page, /Main Budget/);
  assert.doesNotMatch(spend, /November/);
  const later = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-11-02T16:00:00Z" });
  assert.match(later, /data-bank-bar="spend"[^>]*data-bank-bar-month="2026-11"/);
  assert.match(later, />November so far</);
});

test("today 2026-10-16 labels the 9/30-10/29 window October and spends against that month", function () {
  const ctx = boot();
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" };
  function octoberSnap(monthField) {
    const budgetMonth = { start: "2026-09-30", end: "2026-10-29" };
    if (monthField) budgetMonth.month = monthField;
    return {
      asof: "2026-10-16T12:00:00-04:00",
      accounts: [],
      current: {
        month: "2026-10",
        edits_tx: [{ date: "2026-10-12", amount: 40, flow: "outflow", desc: "Market", category: "Groceries", tx_key: "m1" }],
        recent_tx: []
      },
      history: { months: [] },
      budget: {
        budget_month: budgetMonth,
        pay_schedule: [
          { name: "Payroll", kind: "payroll", date: "2026-09-30", amount: 4000 },
          { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 4000 },
          { name: "Payroll", kind: "payroll", date: "2026-11-30", amount: 4000 }
        ],
        pay_periods: [{
          current: true,
          start: "2026-10-30",
          end: "2026-11-13",
          accounts: { "1111": { nickname: "Everyday", role: "everyday", subType: "checking", left_at_end: 20 } }
        }],
        bills: [],
        subscriptions: [],
        tiers_overlay: {
          updated_at: "2026-10-16T12:00:00Z",
          tiers: { categories: [
            { id: "groceries", name: "Groceries", tier: "needs", budget: 100 },
            { id: "dining", name: "Dining", tier: "wants", budget: 50 }
          ] },
          november_budget: { month: "2026-11", pot: 900, guides: { groceries: 20, dining: 10 } }
        }
      },
      tier_doc: {
        categories: [
          { id: "groceries", name: "Groceries", tier: "needs", budget: 100, merged_into: "" },
          { id: "dining", name: "Dining", tier: "wants", budget: 50, merged_into: "" }
        ],
        budgets_updated_at: { groceries: "2026-10-16T15:00:00Z", dining: "2026-10-16T15:00:00Z" },
        category_rules: {},
        category_tx: {}
      }
    };
  }
  [undefined, "2026-09"].forEach(function (named) {
    const snap = octoberSnap(named);
    const printed = ctx.bankBudgetMonth(snap);
    assert.equal(printed.month, "2026-10");
    assert.equal(printed.start, "2026-09-30");
    assert.equal(printed.end, "2026-10-29");
    const win = ctx.bankBudgetWindowFor(snap, "2026-10");
    assert.equal(win.start, "2026-09-30");
    assert.equal(win.end, "2026-10-29");
    assert.equal(win.month, "2026-10");
    assert.equal(ctx.bankSpendBarMonth(snap, opts), "2026-10");
    assert.ok(ctx.bankSpendingSpent(snap, "2026-10") > 0);
    assert.equal(ctx.bankSpendingSpent(snap, "2026-09"), 0);
    assert.equal(ctx.bankFitPot(snap, "2026-10", null), 150);
    const page = ctx.bankPageHtml(snap, opts);
    const spend = page.slice(page.indexOf('data-bank-bar="spend"'), page.indexOf('data-bank-bar="spend"') + 2200);
    assert.match(spend, /data-bank-bar-month="2026-10"/);
    assert.match(spend, />October so far</);
    assert.match(spend, /data-bank-spend-spent="40"/);
    assert.doesNotMatch(spend, /September/);
    assert.match(page, /Main Budget/);
  });
});

test("stacked bars share category colors, segment sums match the totals, and over pay is a red segment", function () {
  const ctx = boot();
  const cats = [
    { id: "mortgage", name: "Mortgage", tier: "required", budget: 200, merged_into: "" },
    { id: "utilities", name: "Utilities", tier: "required", budget: 300, merged_into: "" },
    { id: "subscriptions", name: "Subscriptions", tier: "wants", budget: 80, merged_into: "" },
    { id: "groceries", name: "Groceries", tier: "needs", budget: 100, merged_into: "" },
    { id: "dining", name: "Dining", tier: "wants", budget: 40, merged_into: "" }
  ];
  const snap = {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [],
    current: {
      month: "2026-10",
      edits_tx: [{ date: "2026-10-12", amount: 120, flow: "outflow", desc: "Market", category: "Groceries", tx_key: "m1" }],
      recent_tx: []
    },
    history: { months: [] },
    budget: {
      budget_month: { start: "2026-09-30", end: "2026-10-29" },
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-09-30", amount: 500 },
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 800 },
        { name: "Payroll", kind: "payroll", date: "2026-11-13", amount: 400 },
        { name: "Payroll", kind: "payroll", date: "2026-11-30", amount: 800 }
      ],
      bills_total_effective: 500,
      subs_total: 80,
      bills: [{
        name: "Town Power", amount: 80, category: "utilities", category_id: "utilities", due_day: 8,
        paid_current_month: { month: "2026-10", status: "paid", source: "manual" }
      }],
      subscriptions: [],
      tiers_overlay: {
        updated_at: "2026-10-16T12:00:00Z",
        tiers: { categories: cats },
        november_budget: { month: "2026-11", guides: { groceries: 60, dining: 40 } }
      }
    },
    tier_doc: { categories: cats, category_rules: {}, category_tx: {} }
  };
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" };
  const plan = ctx.bankStackPlanModel(snap, "2026-11");
  const actual = ctx.bankStackActualModel(snap, "2026-10");
  function drawn(model) {
    return model.segments.filter(function (seg) { return seg.id !== "spare" && seg.id !== "over"; });
  }
  function sum(rows) {
    return ctx.bankRoundCents(rows.reduce(function (n, row) { return n + row.amount; }, 0));
  }
  assert.equal(sum(drawn(plan)), plan.total);
  assert.equal(ctx.bankRoundCents(plan.total + plan.spare), plan.track);
  assert.equal(plan.over, 0);
  assert.equal(plan.total, 680);
  assert.equal(plan.track, 1200);
  assert.equal(sum(drawn(actual)), actual.total);
  assert.equal(ctx.bankRoundCents(actual.total + actual.spare), actual.track);
  assert.equal(actual.total, 200);
  assert.equal(actual.track, 500);
  ["groceries", "utilities", "mortgage", "dining", "subscriptions"].forEach(function (id) {
    assert.equal(ctx.bankStackColor(id), ctx.bankStackColor(id));
  });
  assert.notEqual(ctx.bankStackColor("groceries"), ctx.bankStackColor("utilities"));
  assert.equal(ctx.bankStackColor("groceries"), "#8fd06a");
  const page = ctx.bankPageHtml(snap, opts);
  function block(bar) {
    const at = page.indexOf('data-bank-bar="' + bar + '"');
    return page.slice(at, page.indexOf("bank-stack-legend", at) + 20);
  }
  function colors(html) {
    const found = {};
    const re = /data-bank-stack-seg="([^"]+)" data-amount="([^"]+)" data-plan="[^"]*" data-color="([^"]+)"/g;
    let match;
    while ((match = re.exec(html))) found[match[1]] = { amount: Number(match[2]), color: match[3] };
    return found;
  }
  const planSeg = colors(block("income"));
  const actualSeg = colors(block("spend"));
  assert.equal(planSeg.groceries.color, actualSeg.groceries.color);
  assert.equal(planSeg.utilities.color, actualSeg.utilities.color);
  assert.equal(planSeg.groceries.color, ctx.bankStackColor("groceries"));
  assert.ok(planSeg.spare);
  assert.ok(actualSeg.spare);
  assert.match(page, />October so far</);
  assert.match(page, /Groceries[\s\S]{0,120}\$120\.00 of \$100\.00/);
  assert.match(page, /data-bank-leg="groceries"[^>]*data-color="[^"]+"/);
  const heavy = JSON.parse(JSON.stringify(snap));
  heavy.budget.tiers_overlay.november_budget.guides.groceries = 2000;
  const over = ctx.bankStackPlanModel(heavy, "2026-11");
  assert.ok(over.over > 0);
  assert.equal(sum(drawn(over)), over.total);
  assert.equal(ctx.bankRoundCents(over.track + over.over), over.total);
  const overPage = ctx.bankPageHtml(heavy, opts);
  const overAt = overPage.indexOf('data-bank-bar="income"');
  const overBlock = overPage.slice(overAt, overPage.indexOf("bank-stack-legend", overAt));
  assert.match(overBlock, /data-over="1"/);
  assert.match(overBlock, /data-bank-stack-seg="over"/);
  assert.match(overBlock, /data-bank-bar-over="1"/);
  assert.match(overBlock, /Over by /);
  const overSeg = colors(overBlock);
  const overSum = Object.keys(overSeg).filter(function (id) { return id !== "spare" && id !== "over"; }).reduce(function (n, id) {
    return n + overSeg[id].amount;
  }, 0);
  assert.equal(ctx.bankRoundCents(overSum), over.total);
});

test("an unfunded reserve note uses the full bill minus the shared monthly set-asides", function () {
  const ctx = boot();
  const snap = {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [],
    current: { month: "2026-10", edits_tx: [], recent_tx: [] },
    history: { months: [] },
    budget: {
      budget_month: { month: "2026-10", start: "2026-09-30", end: "2026-10-29" },
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 1000 },
        { name: "Payroll", kind: "payroll", date: "2026-11-30", amount: 1000 }
      ],
      bills_total_effective: 30,
      bills: [
        { name: "Town Water", kind: "set_aside", amount: 10, monthly_amount: 10, reserve: "pipes" },
        { name: "Town Drain", kind: "set_aside", amount: 20, monthly_amount: 20, full_amount: 80, reserve: "pipes", reserve_funded: false, cycle_due: "2026-11-10" }
      ],
      subscriptions: [],
      tiers_overlay: { november_budget: { month: "2026-11" } }
    },
    tier_doc: { categories: [] }
  };
  const note = ctx.bankFitReserveNote(snap, "2026-11");
  assert.equal(note, "Town Drain full bill $80.00 due 11/10, reserve not funded yet (+$50.00 this month)");
  const page = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  assert.match(page, /data-bank-reserve-note="1"/);
  assert.match(page, /Town Drain full bill \$80\.00 due 11\/10, reserve not funded yet \(\+\$50\.00 this month\)/);
  snap.budget.bills[1].cycle_due = "2026-12-10";
  assert.equal(ctx.bankFitReserveNote(snap, "2026-11"), "");
});
