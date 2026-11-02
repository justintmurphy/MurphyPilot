"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const NOW = "2026-10-15T16:00:00Z";

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
    asof: "2026-10-15T12:00:00-04:00",
    accounts: [{ nickname: "Desk", last4: "1111", role: "everyday", subType: "checking" }],
    current: { month: "2026-10", edits_tx: [], recent_tx: [], balance_after_pending: { "1111": 20 } },
    history: { months: [] },
    tier_doc: {
      categories: [
        { id: "car-insurance-loans", name: "Car, Insurance & Loans", tier: "required", budget: 18 },
        { id: "utilities", name: "Utilities", tier: "required", budget: 9 },
        { id: "groceries", name: "Groceries", tier: "needs", budget: 5 }
      ],
      budgets_updated_at: { "car-insurance-loans": "2026-10-02T00:00:00Z" },
      category_rules: {},
      category_tx: {},
      rules: {},
      plans: {}
    },
    budget: {
      budget_month: { month: "2026-10", start: "2026-10-01", end: "2026-10-31" },
      income_total: 80,
      income_total_gross_of_401k_loans: 100,
      bills_total: 30,
      bills_total_with_payroll_loans: 45,
      left_after_bills: 50,
      box_categories: {
        categories: [
          { id: "car-insurance-loans", name: "Car, Insurance & Loans", tier: "required", budget: 80 },
          { id: "utilities", name: "Utilities", tier: "required", budget: 9 },
          { id: "groceries", name: "Groceries", tier: "needs", budget: 5 }
        ]
      },
      income_monthly: [{
        label: "Payroll",
        amount: 40,
        cadence: "twice_monthly",
        times_per_month: 2
      }],
      pay_schedule: [{
        name: "Payroll",
        kind: "payroll",
        date: "2026-10-15",
        amount: 40,
        gross_of_401k_loans: 47.5,
        loan_401k_deductions: [{ loan_id: "sample-loan", amount: 7.5 }]
      }],
      pay_periods: [{
        current: true,
        start: "2026-10-15",
        end: "2026-10-30",
        moves: [],
        accounts: {
          "1111": {
            nickname: "Desk",
            role: "everyday",
            subType: "checking",
            start_balance: 20,
            left_at_end: 8
          }
        }
      }],
      bills: [{ name: "Sample bill", amount: 9, typical_day: 20, cadence: "monthly", category: "utilities", category_id: "utilities" }],
      subscriptions: [],
      payroll_loans: [
        {
          id: "sample-loan",
          name: "Sample loan",
          category: "car-insurance-loans",
          tier: "required",
          paid_via: "payroll",
          autopay: true,
          cash_neutral: true,
          estimate: true,
          per_check: 7.5,
          month_total: 15,
          schedule: [
            { date: "2026-10-15", amount: 7.5, status: "paid" },
            { date: "2026-10-30", amount: 7.5, status: "due" }
          ]
        },
        {
          id: "sample-plan",
          name: "Sample plan",
          category: "car-insurance-loans",
          tier: "required",
          paid_via: "payroll",
          autopay: true,
          cash_neutral: true,
          estimate: false,
          per_check: 4,
          month_total: 4,
          schedule: [{ date: "2026-10-15", amount: 4, status: "due" }]
        }
      ]
    }
  };
}

function opts() {
  return { tab: "budget", planMonth: "2026-10", now: NOW };
}

function part(html, name, next) {
  const start = html.indexOf('data-bank-part="' + name + '"');
  assert.ok(start >= 0, name);
  const end = next ? html.indexOf('data-bank-part="' + next + '"', start + 10) : html.length;
  return html.slice(start, end < 0 ? html.length : end);
}

function movePack(ctx, data) {
  return (ctx.bankNextPayMovePlan(data, opts()) || []).map(function (row) {
    return {
      date: row && row.date,
      depositAmount: row && row.depositAmount,
      moves: row && row.moves,
      bills: (row && row.bills || []).map(function (bill) { return (bill.name || "") + ":" + bill.amount; }),
      left: row && row.left
    };
  });
}

test("budget card uses gross income and payroll-loan bills, and left stays put", function () {
  const ctx = boot();
  const fx = snap();
  const totals = ctx.bankCardPrintTotals(fx, "2026-10");
  assert.equal(totals.income, 100);
  assert.equal(totals.bills, 45);
  assert.equal(totals.left, 50);
  assert.equal(ctx.bankPlanTotals(fx, "2026-10").bills_total, 30);

  const html = ctx.bankPageHtml(fx, opts());
  const card = html.slice(html.indexOf('data-bank-card-totals="1"'), html.indexOf("</p>", html.indexOf('data-bank-card-totals="1"')));
  assert.match(card, /data-plan="income" data-amount="100"/);
  assert.match(card, /data-plan="bills" data-amount="45"/);
  assert.match(card, /data-plan="left" data-amount="50"/);
  assert.match(card, /Income <b>\$100\.00<\/b>/);
  assert.match(card, /Bills <b>\$45\.00<\/b>/);
  assert.match(card, /Left after bills <b>\$50\.00<\/b>/);
  assert.doesNotMatch(card, /data-amount="80"|data-amount="30"/);

  delete fx.budget.income_total_gross_of_401k_loans;
  delete fx.budget.bills_total_with_payroll_loans;
  const fallback = ctx.bankCardPrintTotals(fx, "2026-10");
  assert.equal(fallback.income, 80);
  assert.equal(fallback.bills, 30);
  assert.equal(fallback.left, 50);
  const old = ctx.bankPageHtml(fx, opts());
  assert.match(old, /data-plan="income" data-amount="80"/);
  assert.match(old, /data-plan="bills" data-amount="30"/);
  assert.match(old, /data-plan="left" data-amount="50"/);
});

test("payroll loans show on the category list and calendar and stay out of the money math", function () {
  const ctx = boot();
  const fx = snap();
  const cats = ctx.bankSpendCategories(fx, "2026-10");
  assert.equal(ctx.bankSpendById(cats, "car-insurance-loans").budget, 18);
  const fit = ctx.bankBudgetFit(fx, "2026-10", opts());
  const moves = movePack(ctx, fx);
  const funding = ctx.bankFundingHtml(fx, { monthKey: "2026-10", now: NOW });
  const sweep = JSON.stringify(ctx.bankSweepFor(fx));

  const quiet = snap();
  delete quiet.budget.payroll_loans;
  assert.deepEqual(ctx.bankBudgetFit(quiet, "2026-10", opts()), fit);
  assert.deepEqual(movePack(ctx, quiet), moves);
  assert.equal(ctx.bankFundingHtml(quiet, { monthKey: "2026-10", now: NOW }), funding);
  assert.equal(JSON.stringify(ctx.bankSweepFor(quiet)), sweep);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(quiet, "2026-10"), "car-insurance-loans").budget, 18);

  const html = ctx.bankPageHtml(fx, opts());
  assert.match(html, /data-bank-bill-group="car-insurance-loans"[^>]*data-bank-group-budget="18"/);
  assert.doesNotMatch(html, /data-bank-bill-group="car-insurance-loans"[^>]*data-bank-group-budget="(?:15|80|4)"/);
  const group = html.slice(html.indexOf('data-bank-bill-group="car-insurance-loans"'), html.indexOf("bank-bill-block", html.indexOf('data-bank-bill-group="car-insurance-loans"') + 20));
  assert.match(group, /Car, Insurance &amp; Loans/);
  assert.match(group, /data-loan="sample-loan"/);
  assert.match(group, /paid via payroll/);
  assert.match(group, /data-bank-estimate="1">est\./);
  assert.match(group, /data-bank-payroll-status="paid">paid/);
  assert.match(group, /data-bank-payroll-status="due">due/);
  assert.match(group, /Sample plan/);
  const planTile = group.slice(group.indexOf('data-loan="sample-plan"'), group.indexOf('data-loan="sample-plan"') + 500);
  assert.doesNotMatch(planTile, /est\./);
  assert.match(group, /data-bank-cash-neutral="1"/);

  const cal = part(html, "calendar", "tiers");
  assert.match(cal, /Sample loan \$7\.50 · paid via payroll · est\. · paid/);
  assert.match(cal, /Sample loan \$7\.50 · paid via payroll · est\. · due/);
  assert.match(cal, /Sample plan \$4\.00 · paid via payroll · due/);
  assert.doesNotMatch(cal, /Sample plan \$4\.00 · paid via payroll · est\./);

  const payCards = html.slice(html.indexOf('class="bank-next"'), html.indexOf('data-bank-part="calendar"'));
  assert.doesNotMatch(payCards, /Sample loan|Sample plan|paid via payroll/);
  assert.match(payCards, /data-bank-pay-gross="1">Gross \$47\.50 − \$7\.50 = \$40\.00/);
  assert.match(cal, /title="Payroll · Gross \$47\.50 − \$7\.50 = \$40\.00"/);
  const deposit = payCards.slice(payCards.indexOf("bank-move-deposit"), payCards.indexOf("data-bank-pay-gross"));
  assert.match(deposit, /\+\$40\.00/);
  assert.doesNotMatch(deposit, /47\.50/);

  const fund = part(html, "funding", "income");
  assert.doesNotMatch(fund, /Sample loan|Sample plan|paid via payroll/);
  moves.forEach(function (row) {
    row.bills.forEach(function (bill) {
      assert.equal(/sample loan|sample plan/i.test(bill), false);
    });
  });
  assert.equal(moves.some(function (row) { return row.depositAmount === 40; }), true);
  assert.equal(moves.some(function (row) { return row.depositAmount === 47.5; }), false);

  const day = ctx.bankDayDialogHtml(fx, { year: 2026, month: 10 }, 15, null);
  assert.match(day, /Gross \$47\.50 − \$7\.50 = \$40\.00/);
  assert.match(day, /Sample loan \$7\.50 · paid via payroll · est\. · paid/);
  assert.match(day, /Sample plan \$4\.00 · paid via payroll · due/);

  const nov = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-11", now: NOW });
  const novCal = part(nov, "calendar", "tiers");
  assert.doesNotMatch(novCal, /Sample loan|Sample plan/);

  const bare = snap();
  delete bare.tier_doc;
  bare.budget.box_categories = { categories: [{ name: "Pets" }] };
  const section = ctx.bankPayrollLoanSectionHtml(bare, "2026-10");
  assert.match(section, /Car, Insurance &amp; Loans/);
  assert.match(section, /Sample loan/);
  assert.match(section, /paid via payroll/);
  const off = ctx.bankBillGroupsHtml(bare, opts(), "2026-10");
  assert.match(off, /data-bank-payroll-loans="1"/);
  assert.match(off, /Sample plan/);
});
