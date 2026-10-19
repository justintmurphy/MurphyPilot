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
  assert.equal(fit.bills, 50);
  assert.equal(fit.subs, 0);
  assert.equal(fit.pot, 30);
  assert.equal(fit.categories, 30);
  assert.equal(fit.budgeted, 80);
  assert.equal(fit.left, -60);
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
  assert.equal(gap, 60);
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
  assert.equal(fit.bills, 1499);
  assert.equal(fit.subs, 0);
  assert.equal(fit.pot, 1830);
  assert.equal(fit.budgeted, 3329);
  assert.equal(fit.other, 0);
  assert.equal(fit.extra, 0);
  assert.equal(fit.base, 6322.12);
  assert.equal(fit.overage, 0);
  assert.equal(fit.left, 6322.12);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(snap, "2026-11"), "utilities").budget, 500);
  const edited = ctx.bankBudgetFit(snap, "2026-11", { edits: { bills: { "Housing stack": { amount: 100 } } } });
  assert.equal(edited.bills, 1499);
  assert.equal(edited.budgeted, 3329);
  assert.equal(edited.left, edited.base);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(snap, "2026-11"), "dining").budget, 0);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(snap, "2026-11"), "subscriptions"), null);
  const visible = ctx.bankSpendVisible(ctx.bankSpendCategories(snap, "2026-11")).map(function (row) { return row.id; });
  assert.equal(visible.indexOf("subscriptions"), -1);
  const starters = ctx.bankPlanSpendRows(snap, []);
  assert.equal(starters.some(function (row) { return row.id === "subscriptions"; }), false);
  const emptyOnly = ctx.bankPlanSpendRows(snap, [{ id: "subscriptions", name: "Subscriptions", tier: "wants", plan: 0, budget: 0, spent: 0 }]);
  assert.equal(emptyOnly.length, 0);
  const page = ctx.bankPageHtml(snap, opts);
  const bar = page.slice(page.indexOf('data-bank-bar="income"'), page.indexOf('data-bank-bar="spend"'));
  assert.match(bar, /Main Budget/);
  assert.match(bar, /data-bank-bar-month="2026-11"/);
  assert.match(bar, /data-bank-fit-bills="1499"/);
  assert.match(bar, /data-bank-fit-subs="0"/);
  assert.match(bar, /data-bank-fit-pot="1830"/);
  assert.match(bar, /data-bank-fit-spare="6322.12"/);
  assert.match(bar, /\$3,329\.00 of \$9,651\.12, 34%, /);
  assert.match(bar, /Fits: \$6,322\.12 to spare/);
  assert.doesNotMatch(bar, /data-bank-spare-break|data-bank-reserve-note|overages/);
  assert.match(bar, /data-bank-stack-seg="utilities"[^>]*data-amount="500"/);
  const legend = bar.slice(bar.indexOf("bank-stack-legend"), bar.indexOf("</ul>", bar.indexOf("bank-stack-legend")));
  assert.match(legend, /Utilities<\/span> <b>\$500\.00<\/b>/);
  assert.doesNotMatch(legend, /tone-stop|budget,|due| of |over|spent/i);
  assert.deepEqual(
    Array.from(legend.matchAll(/data-bank-leg="([^"]+)"/g), function (match) { return match[1]; })
      .filter(function (id) { return id !== "spare" && id !== "over"; }),
    ["groceries", "mortgage", "kids-activities", "utilities"]
  );
  assert.doesNotMatch(bar, /data-amount="7094.19"/);
  assert.match(page, /data-bank-bar="spend"[^>]*data-bank-bar-month="2026-10"/);
  assert.match(page, /data-bank-bar="spend"[\s\S]{0,900}>October so far</);
  const month = ctx.bankMonthSpare(snap, opts);
  assert.equal(month.typical, 6322.12);
  assert.equal(month.left, ctx.bankRoundCents(month.typical - month.overage + month.extra));
  assert.equal(ctx.bankSpendBarMonth(snap, opts), "2026-10");
  const spendAt = page.indexOf('data-bank-bar="spend"');
  const spendTail = page.slice(spendAt, page.indexOf('data-bank-spare-break', spendAt) + 800);
  assert.match(spendTail, /Spare left /);
  assert.match(spendTail, new RegExp("Spare left " + ctx.bankMoney(month.left).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
    " = " + ctx.bankMoney(month.typical).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(page, new RegExp('data-bank-after-now="' + month.left + '"'));
  assert.match(page, new RegExp('data-bank-after-month="' + month.left + '"'));
  assert.match(page, new RegExp('data-bank-after-cats="' + month.left + '"'));
  assert.equal(Number((page.match(/data-bank-free="([^"]*)"/) || [])[1]), month.left);
  assert.doesNotMatch(page, /data-bank-cat-row="subscriptions"/);
  assert.doesNotMatch(page, /data-bank-bill-group="subscriptions"/);
  assert.match(page, /data-bank-bill-group="streaming-entertainment"/);
  assert.match(page, /Stream Desk/);
  assert.match(page, /data-bank-bill-group="software-ai"/);
  assert.match(page, /Code Desk/);
  const edits = ctx.bankPageHtml(snap, { tab: "edits", planMonth: "2026-10", now: opts.now });
  assert.match(edits, /data-bank-fit-spare="6322.12"/);
  assert.match(edits, /data-bank-fit-bills="1499"/);
  assert.match(edits, /data-bank-fit-subs="0"/);
  assert.match(edits, /data-bank-fit-pot="1830"/);
  assert.doesNotMatch(edits, /is not counted/);
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
      bills: [{ name: "Late desk", amount: 25, due_day: 27, cadence: "monthly", category: "utilities", category_id: "utilities" }],
      subscriptions: []
    },
    tier_doc: { categories: [] }
  };
  assert.equal(ctx.bankBudgetWindowFor(snap, "2026-11").end, "2026-11-29");
  snap.budget.tiers_overlay = {
    tiers: { categories: [{ id: "utilities", name: "Utilities", tier: "required", budget: 10, merged_into: "" }] },
    november_budget: { month: "2026-11" }
  };
  snap.tier_doc = { categories: snap.budget.tiers_overlay.tiers.categories, category_rules: {}, category_tx: {} };
  snap.budget.bills_total_effective = 99;
  const fit = ctx.bankBudgetFit(snap, "2026-11");
  assert.equal(fit.bills, 10);
  assert.equal(fit.budgeted, 10);
  const page = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  const bar = page.slice(page.indexOf('data-bank-bar="income"'), page.indexOf('data-bank-bar="income"') + 2500);
  assert.match(bar, /data-bank-stack-seg="utilities"[^>]*data-amount="10"/);
  const legend = bar.slice(bar.indexOf("bank-stack-legend"), bar.indexOf("</ul>", bar.indexOf("bank-stack-legend")));
  assert.match(legend, /Utilities<\/span> <b>\$10\.00<\/b>/);
  assert.doesNotMatch(legend, /tone-stop|budget,|due| of |over|spent/i);
  assert.doesNotMatch(bar, /data-amount="25"/);
  assert.doesNotMatch(bar, /data-amount="99"/);
  snap.budget.tiers_overlay.november_budget.guides = { utilities: 4 };
  assert.equal(ctx.bankBudgetFit(snap, "2026-11").bills, 4);
  snap.tier_doc.categories[0].budget = 0;
  snap.tier_doc.budgets_updated_at = { utilities: "2026-10-16T12:00:00Z" };
  assert.equal(ctx.bankBudgetFit(snap, "2026-11").bills, 0);
  const held = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  const heldAt = held.indexOf('data-bank-bar="income"');
  const heldLegendAt = held.indexOf("bank-stack-legend", heldAt);
  const heldLegend = held.slice(heldLegendAt, held.indexOf("</ul>", heldLegendAt));
  assert.doesNotMatch(heldLegend, /Utilities|tone-stop|budget,|due| of |over|spent/i);
  assert.doesNotMatch(held.slice(held.indexOf('data-bank-bar="income"'), held.indexOf('data-bank-bar="spend"')), /data-amount="25"/);
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
  const spendAt = page.indexOf('data-bank-bar="spend"');
  const spend = page.slice(spendAt, spendAt + 2200);
  const spendLegendAt = page.indexOf("bank-stack-legend", spendAt);
  const spendLegend = page.slice(spendLegendAt, page.indexOf("</ul>", spendLegendAt));
  assert.match(spend, /data-bank-bar-month="2026-10"/);
  assert.match(spend, />October so far</);
  assert.match(spend, /data-bank-spend-spent="40"/);
  assert.match(spendLegend, /Groceries<\/span> <span class="bank-leg-sentence">\$40\.00 spent · \$60\.00 left<\/span>/);
  assert.match(spendLegend, /Dining<\/span> <span class="bank-leg-sentence">\$0\.00 spent · \$50\.00 left<\/span>/);
  assert.match(spendLegend, /data-bank-leg-total="1"/);
  assert.match(spendLegend, /Total<\/span> <b class="bank-leg-sentence">\$40\.00 spent · \$110\.00 left<\/b>/);
  assert.doesNotMatch(spendLegend, / of |due | over/i);
  assert.deepEqual(
    Array.from(spendLegend.matchAll(/data-bank-leg="([^"]+)"/g), function (match) { return match[1]; })
      .filter(function (id) { return id !== "spare" && id !== "over"; }),
    ["groceries", "dining"]
  );
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
  function segIds(html) {
    const found = [];
    const re = /data-bank-stack-seg="([^"]+)"/g;
    let match;
    while ((match = re.exec(html))) {
      if (match[1] !== "spare" && match[1] !== "over") found.push(match[1]);
    }
    return found;
  }
  function legIds(bar) {
    const at = page.indexOf('data-bank-bar="' + bar + '"');
    const legendAt = page.indexOf("bank-stack-legend", at);
    const chunk = page.slice(legendAt, page.indexOf("</ul>", legendAt));
    const found = [];
    const re = /data-bank-leg="([^"]+)"/g;
    let match;
    while ((match = re.exec(chunk))) {
      if (match[1] !== "spare" && match[1] !== "over") found.push(match[1]);
    }
    return found;
  }
  assert.deepEqual(segIds(block("income")), ["utilities", "mortgage", "subscriptions", "groceries", "dining"]);
  assert.deepEqual(segIds(block("spend")), ["utilities", "groceries"]);
  assert.deepEqual(legIds("income"), ["utilities", "mortgage", "subscriptions", "groceries", "dining"]);
  assert.deepEqual(legIds("spend"), legIds("income"));
  assert.match(page, />October so far</);
  const spendLegendAt = page.indexOf("bank-stack-legend", page.indexOf('data-bank-bar="spend"'));
  const spendLegend = page.slice(spendLegendAt, page.indexOf("</ul>", spendLegendAt));
  assert.match(spendLegend, /Groceries<\/span> <span class="bank-leg-sentence">\$120\.00 spent · <b class="tone-stop">\$60\.00 over<\/b><\/span>/);
  assert.match(spendLegend, /Utilities<\/span> <span class="bank-leg-sentence">\$80\.00 spent · \$220\.00 left<\/span>/);
  assert.match(spendLegend, /Total<\/span> <b class="bank-leg-sentence">\$200\.00 spent · \$480\.00 left<\/b>/);
  assert.doesNotMatch(spendLegend, / of |due /);
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
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  const narrow = css.split("@media (max-width: 390px)").pop();
  assert.match(narrow, /grid-template-columns:\s*8px minmax\(0,\s*1fr\) auto auto;/);
  assert.match(narrow, /\.bank-leg-spent,\s*\.bank-month-legend \.bank-leg-left \{[^}]*text-align:\s*right;/);
  assert.match(css, /\.bank-month-legend \.bank-leg-sentence/);
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
  const early = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  const earlyBar = early.slice(early.indexOf('data-bank-bar="income"'), early.indexOf('data-bank-bar="spend"'));
  assert.doesNotMatch(earlyBar, /data-bank-reserve-note/);
  assert.doesNotMatch(early, /Town Drain full bill/);
  snap.budget.bills[1].cycle_due = "2026-10-10";
  const page = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  const bar = page.slice(page.indexOf('data-bank-bar="income"'), page.indexOf('data-bank-bar="spend"'));
  assert.doesNotMatch(bar, /data-bank-reserve-note/);
  const spendAt = page.indexOf('data-bank-bar="spend"');
  const spend = page.slice(spendAt, spendAt + 4000);
  assert.match(spend, /data-bank-reserve-note="1"/);
  assert.match(spend, /Town Drain full bill \$80\.00 due 10\/10, reserve not funded yet \(\+\$50\.00 this month\)/);
  snap.budget.bills[1].cycle_due = "2026-12-10";
  assert.equal(ctx.bankFitReserveNote(snap, "2026-10"), "");
});

test("an overage reduces spare, extra income increases it, and a paycheck is not added twice", function () {
  const ctx = boot();
  const cats = [
    { id: "utilities", name: "Utilities", tier: "required", budget: 200, merged_into: "" },
    { id: "groceries", name: "Groceries", tier: "needs", budget: 100, merged_into: "" }
  ];
  const snap = {
    asof: "2026-11-16T12:00:00-04:00",
    accounts: [{ id: "chk", nickname: "Everyday", last4: "1111", suffix: "1111", role: "everyday", subType: "checking" }],
    current: {
      month: "2026-11",
      edits_tx: [
        { date: "2026-11-02", amount: 1000, flow: "inflow", desc: "Payroll", category: "Payroll", tx_key: "pay" },
        { date: "2026-11-03", amount: 50, flow: "inflow", desc: "Rebate", category: "Rebate", tx_key: "reb" },
        { date: "2026-11-04", amount: 40, flow: "transfer", desc: "Mobile deposit", tx_key: "mob" }
      ],
      recent_tx: []
    },
    history: { months: [] },
    budget: {
      budget_month: { month: "2026-10", start: "2026-09-30", end: "2026-10-29" },
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 600 },
        { name: "Payroll", kind: "payroll", date: "2026-11-13", amount: 400 },
        { name: "Payroll", kind: "payroll", date: "2026-11-30", amount: 500 }
      ],
      pay_periods: [{
        start: "2026-10-30",
        end: "2026-11-29",
        current: true,
        accounts: { "1111": { nickname: "Everyday", role: "everyday", subType: "checking", left_at_end: 10 } }
      }],
      other_income: [{ name: "Refund", amount: 30, date: "2026-11-05" }],
      bills: [{ name: "Town Power", amount: 260, category: "utilities", category_id: "utilities", due_day: 8 }],
      subscriptions: [],
      tiers_overlay: {
        updated_at: "2026-11-16T12:00:00Z",
        tiers: { categories: cats },
        november_budget: { month: "2026-11" }
      }
    },
    tier_doc: { categories: cats, category_rules: {}, category_tx: {} }
  };
  const opts = { tab: "budget", planMonth: "2026-11", now: "2026-11-16T16:00:00Z" };
  const fit = ctx.bankBudgetFit(snap, "2026-11", opts);
  assert.equal(fit.income, 1000);
  assert.equal(fit.budgeted, 300);
  assert.equal(fit.base, 700);
  assert.equal(fit.overage, 0);
  assert.equal(fit.extra, 0);
  assert.equal(fit.left, 700);
  const month = ctx.bankMonthSpare(snap, opts);
  assert.equal(month.typical, 700);
  assert.equal(month.overage, 60);
  assert.equal(month.extra, 120);
  assert.equal(month.left, 760);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(snap, "2026-11"), "utilities").budget, 200);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(snap, "2026-11"), "groceries").budget, 100);
  const page = ctx.bankPageHtml(snap, opts);
  const bar = page.slice(page.indexOf('data-bank-bar="income"'), page.indexOf('data-bank-bar="spend"'));
  const legend = bar.slice(bar.indexOf("bank-stack-legend"), bar.indexOf("</ul>", bar.indexOf("bank-stack-legend")));
  assert.match(legend, /Utilities<\/span> <b>\$200\.00<\/b>/);
  assert.match(legend, /Groceries<\/span> <b>\$100\.00<\/b>/);
  assert.doesNotMatch(legend, /tone-stop|budget,|due| of |over|spent/i);
  assert.match(bar, /data-bank-stack-seg="utilities"[^>]*data-amount="200"/);
  assert.match(bar, /Fits: \$700\.00 to spare/);
  assert.doesNotMatch(bar, /data-bank-spare-break|overages/);
  assert.match(bar, /data-bank-fit-spare="700"/);
  const spendAt = page.indexOf('data-bank-bar="spend"');
  const spendLegendAt = page.indexOf("bank-month-legend", spendAt);
  const spendLegend = page.slice(spendLegendAt, page.indexOf("</ul>", spendLegendAt));
  assert.match(spendLegend, /Utilities<\/span> <span class="bank-leg-sentence" data-bank-due-line="1">\$260\.00 due 11\/8 · \$60\.00 over budget<\/span>/);
  assert.match(spendLegend, /Groceries<\/span> <span class="bank-leg-sentence">\$0\.00 spent · \$100\.00 left<\/span>/);
  assert.match(spendLegend, /Total<\/span> <b class="bank-leg-sentence">\$0\.00 spent · \$300\.00 left<\/b>/);
  assert.match(page.slice(spendAt), /Spare left \$760\.00 = \$700\.00, minus \$60\.00 overages, plus \$120\.00 extra income/);
  assert.match(page, /data-bank-after-now="760"/);
  assert.match(page, /data-bank-after-month="760"/);
  assert.equal(Number((page.match(/data-bank-free="([^"]*)"/) || [])[1]), 760);
  const edits = ctx.bankPageHtml(snap, { tab: "edits", planMonth: "2026-11", now: opts.now });
  assert.match(edits, /data-bank-fit-spare="700"/);
  assert.match(edits, /data-bank-fit-bills="200"/);
  assert.match(edits, /Fits: \$700\.00 to spare/);
});
