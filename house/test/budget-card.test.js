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
    asof: "2026-10-15T12:00:00-04:00",
    accounts: [
      { nickname: "Bills", last4: "0831", role: "bills", subType: "checking" },
      { nickname: "Everyday", last4: "4845", role: "everyday", subType: "checking" },
      { nickname: "Reserve", last4: "4925", role: "reserve", subType: "savings" }
    ],
    current: { month: "2026-10", edits_tx: [], recent_tx: [], balance_after_pending: { "0831": 10, "4845": 10, "4925": 9000 } },
    history: { months: [] },
    budget: {
      budget_month: { start: "2026-09-30", end: "2026-10-29" },
      pay_periods: [
        {
          current: true,
          start: "2026-10-15",
          end: "2026-10-22",
          accounts: {
            "0831": {
              nickname: "Bills", role: "bills", subType: "checking",
              start_balance: 800, left_at_end: 81.18,
              events: [
                { kind: "out", name: "Electric", amount: 400, date: "2026-10-18" },
                { kind: "out", name: "Internet", amount: 200, date: "2026-10-20" }
              ]
            },
            "4845": {
              nickname: "Everyday", role: "everyday", subType: "checking",
              start_balance: 1151.36, left_at_end: 382.13,
              events: [{ kind: "out", name: "Household", amount: 888.05, date: "2026-10-22" }]
            },
            "4925": {
              nickname: "Reserve", role: "reserve", subType: "savings",
              start_balance: 9000, left_at_end: 9000
            }
          }
        },
        { start: "2026-10-23", end: "2026-11-05" },
        {
          start: "2026-09-30",
          end: "2026-10-29",
          accounts: {
            "0831": { nickname: "Bills", role: "bills", subType: "checking", left_at_end: 1039.05 },
            "4845": { nickname: "Everyday", role: "everyday", subType: "checking", left_at_end: 75.37 },
            "4925": { nickname: "Reserve", role: "reserve", subType: "savings", left_at_end: 9000 }
          },
          deposits: [
            { name: "Payroll", date: "2026-09-30", amount: 4315.56, landed: true },
            { name: "Payroll", date: "2026-10-15", amount: 4315.56, landed: true },
            { name: "Stipend", date: "2026-10-23", amount: 1020, landed: false }
          ],
          outs: [
            { name: "Later", amount: 357.89, date: "2026-10-28" },
            { name: "Cloud", amount: 11, date: "2026-10-21" }
          ]
        }
      ],
      bills: [
        { name: "Electric", amount: 400, typical_day: 18, cadence: "monthly" },
        { name: "Internet", amount: 200, typical_day: 20, cadence: "monthly" },
        { name: "Household", amount: 888.05, typical_day: 22, cadence: "monthly" },
        {
          name: "Later",
          amount: 357.89,
          typical_day: 28,
          cadence: "monthly",
          paid_current_month: { month: "2026-10", status: "paid", source: "manual" }
        },
        {
          name: "Water",
          amount: 40,
          quarterly_amount: 424.75,
          cadence: "quarterly",
          next_due: "2026-10-20",
          paid_current_month: { month: "2026-10", status: "paid", source: "alert_email", paid_date: "2026-10-20" }
        },
        { name: "Car payment", amount: 500, typical_day: 10, off_bank: true },
        {
          name: "Settled stack",
          amount: 4688.77,
          typical_day: 5,
          paid_current_month: { month: "2026-10", status: "paid", source: "bank", tx_key: "settled", paid_date: "2026-10-05" }
        },
        { name: "Mortgage", amount: 3544, cycle_due: "2026-11-01", cadence: "monthly" },
        { name: "Garbage", amount: 40, cycle_due: "2026-11-05", cadence: "monthly" }
      ],
      subscriptions: [{ name: "Cloud", amount: 11, typical_day: 21, cadence: "monthly" }],
      one_time_bills: [{ name: "TruGreen", amount: 80, date: "2026-10-12", status: "retired" }],
      awaiting_debit: [{ name: "Later", month: "2026-10" }],
      account_funding: [
        { nickname: "Bills", last4: "0831", subType: "checking", current_balance: 800 },
        { nickname: "Everyday", last4: "4845", subType: "checking", current_balance: 1151.36 },
        { nickname: "Reserve", last4: "4925", role: "reserve", subType: "savings", current_balance: 9000 }
      ]
    },
    tier_doc: { rules: {}, plans: {}, categories: [], category_rules: {}, category_tx: {} }
  };
}

const NOW = "2026-10-15T15:00:00-04:00";

test("the budget card reads right now and month-end left from the ledger", function () {
  const ctx = boot();
  const fx = snap();
  const card = ctx.bankBudgetCard(fx, { planMonth: "2026-10", now: NOW });
  assert.equal(card.nowBalances, 1951.36);
  assert.equal(card.nowDue, 1488.05);
  assert.equal(card.nowLeft, 463.31);
  assert.equal(card.pay, 9651.12);
  assert.equal(card.landed, 8631.12);
  assert.equal(card.owed, 7470.46);
  assert.equal(card.paid, 5613.52);
  assert.equal(card.unpaid, 1856.94);
  assert.equal(card.monthLeft, 1114.42);
  assert.equal(card.everyday, null);
  assert.equal(card.warn, false);
  const names = card.bills.filter(function (row) { return row.state === "unpaid"; }).map(function (row) { return row.name; });
  assert.equal(names.indexOf("Mortgage"), -1);
  assert.equal(names.indexOf("TruGreen"), -1);
  assert.equal(names.indexOf("Garbage"), -1);
  assert.ok(names.indexOf("Cloud") >= 0);
  assert.ok(names.indexOf("Later") >= 0);
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: NOW });
  const nowAt = html.indexOf('data-bank-now="1"');
  const overallAt = html.indexOf('data-bank-overall="1"');
  assert.ok(nowAt >= 0 && nowAt < overallAt);
  assert.match(html, /data-bank-now-balances="1951.36"/);
  assert.match(html, /data-bank-now-due="1488.05"/);
  assert.match(html, /data-bank-now-left="463.31"/);
  assert.match(html, /data-bank-now-acct="81.18"/);
  assert.match(html, /data-bank-now-acct="382.13"/);
  assert.equal(card.nextDeposit, "2026-10-23");
  assert.match(html, /Left until Oct 23/);
  const face = html.slice(nowAt, html.indexOf("fills-more"));
  assert.equal((face.match(/<details class="bank-card-fold"/g) || []).length, 5);
  assert.doesNotMatch(face, /<details class="bank-card-fold"[^>]*\sopen/);
  assert.match(html, /data-bank-pay-total="9651.12"/);
  assert.match(html, /data-bank-pay-landed="8631.12"/);
  const payListAt = html.indexOf('data-bank-pay-list="1"');
  const payList = html.slice(payListAt, html.indexOf("</ul>", payListAt));
  assert.match(payList, /Payroll/);
  assert.match(payList, /Stipend/);
  assert.doesNotMatch(payList, /Opening|Refund|Surplus/);
  assert.equal(card.deposits.every(function (row) { return row.payKind === "payroll" || row.payKind === "stipend"; }), true);
  assert.equal(card.surplus, null);
  assert.match(html, /data-bank-owed="7470.46"/);
  assert.match(html, /data-bank-paid="5613.52"/);
  assert.match(html, /data-bank-unpaid="1856.94"/);
  assert.match(html, /data-bank-month-left="1114.42"/);
  assert.match(html, /data-bank-month-acct="1039.05"/);
  assert.match(html, /data-bank-month-acct="75.37"/);
  assert.doesNotMatch(html, /data-bank-everyday=/);
  assert.match(html, /Landed/);
  assert.match(html, /Not yet/);
  assert.match(html, /Left at month end Oct 29/);
  const listAt = html.indexOf('data-bank-bill-list="1"');
  const list = html.slice(listAt, html.indexOf("</details>", listAt));
  assert.match(list, /Water[\s\S]*Paid/);
  assert.match(list, /Car payment[\s\S]*Paid/);
  assert.match(list, /Cloud[\s\S]*Unpaid/);
  assert.match(list, /Later[\s\S]*Unpaid/);
  assert.doesNotMatch(list, /Mortgage|TruGreen|Garbage/);
  const panels = html.slice(nowAt, html.indexOf("fills-more"));
  assert.doesNotMatch(panels, /4925|9000|9,000/);
  assert.doesNotMatch(html, /data-bank-ledger-warn/);
  assert.match(html, /data-bank-pace="1"/);
  assert.match(html, /data-bank-cushion-note="1"/);
  assert.match(html, /data-bank-after-cats=/);
  assert.match(html, /What you can put off|Category room|Cushion /);
  const src = fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8");
  assert.doesNotMatch(src, /4925|1951\.36|1114\.42|1,114\.42/);
});

test("a retired one-time is not reserved and a ledger mismatch warns", function () {
  const ctx = boot();
  const fx = snap();
  const oblig = ctx.bankWindowObligations(fx, { planMonth: "2026-10", now: NOW }, ctx.bankBudgetWindowFor(fx, "2026-10"), 100);
  const reserved = oblig.reserve.map(function (row) { return row.name; });
  const once = oblig.remaining.filter(function (row) { return row.source === "once"; }).map(function (row) { return row.name; });
  assert.equal(reserved.length, 0);
  assert.equal(once.indexOf("TruGreen"), -1);
  assert.equal(oblig.remaining.some(function (row) { return row.date > "2026-10-29"; }), false);
  fx.budget.bills[3].amount = 10;
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: NOW });
  assert.match(html, /data-bank-ledger-warn="1"/);
});

test("everyday spending adds the opening balance and landed pay", function () {
  const ctx = boot();
  const fx = {
    asof: "2026-10-15T12:00:00-04:00",
    accounts: [
      { nickname: "Bills", last4: "0831", role: "bills", subType: "checking" },
      { nickname: "Everyday", last4: "4845", role: "everyday", subType: "checking" },
      { nickname: "Reserve", last4: "4925", role: "reserve", subType: "savings" }
    ],
    current: {
      month: "2026-10",
      edits_tx: [],
      recent_tx: [{ date: "2026-09-30", amount: 4235.75, flow: "inflow", desc: "Payroll", category: "Payroll" }],
      balance_before_first_pay: { "0831": 1200, "4845": 1096.25, "4925": 9000 }
    },
    history: { months: [] },
    budget: {
      budget_month: { start: "2026-09-30", end: "2026-10-29" },
      pay_schedule: [{ name: "Payroll", kind: "payroll", date: "2026-09-30", amount: 4000 }],
      pay_periods: [
        {
          current: true,
          start: "2026-10-15",
          end: "2026-10-22",
          deposit: { name: "Stipend", date: "2026-10-23", amount: 1020, landed: false },
          events: [
            { kind: "in", name: "Stipend", date: "2026-10-23", amount: 1020, landed: false },
            { kind: "in", name: "Move", date: "2026-10-18", amount: 10, from_last4: "0831", to_last4: "4845" }
          ],
          accounts: {
            "0831": { nickname: "Bills", role: "bills", subType: "checking", left_at_end: 81.18 },
            "4845": { nickname: "Everyday", role: "everyday", subType: "checking", left_at_end: 382.13 }
          }
        },
        {
          start: "2026-09-30",
          end: "2026-10-29",
          "in": [
            { name: "Payroll", date: "2026-10-15", amount: 4235.75, landed: true },
            { name: "Refund", date: "2026-10-16", amount: 40 },
            { name: "Outside transfer", date: "2026-10-17", amount: 25, from_last4: "4925", to_last4: "4845" }
          ],
          accounts: {
            "0831": { nickname: "Bills", role: "bills", subType: "checking", left_at_end: 1039.05 },
            "4845": { nickname: "Everyday", role: "everyday", subType: "checking", left_at_end: 75.37 }
          }
        }
      ],
      bills: [{
        name: "Mortgage",
        amount: 3544,
        cadence: "monthly",
        cycle_due: "2026-11-01",
        paid_current_month: { month: "2026-10", status: "paid", source: "bank", paid_date: "2026-10-01" }
      }, {
        name: "Comcast",
        amount: 164.99,
        cadence: "monthly",
        cycle_due: "2026-11-08",
        paid_current_month: { month: "2026-10", status: "paid", source: "bank", paid_date: "2026-10-08" }
      }, {
        name: "Car payment",
        amount: 755.08,
        typical_day: 10,
        cadence: "monthly",
        off_bank: true
      }, {
        name: "Gas",
        amount: 50,
        cadence: "monthly",
        cycle_due: "2026-11-05",
        paid_current_month: { month: "2026-10", status: "paid", source: "bank", paid_date: "2026-10-05" }
      }, {
        name: "OneMain",
        amount: 524,
        cadence: "monthly",
        cycle_due: "2026-11-10",
        paid_current_month: { month: "2026-10", status: "paid", source: "bank", paid_date: "2026-10-10" }
      }, {
        name: "Electric",
        amount: 150.7,
        cadence: "monthly",
        cycle_due: "2026-11-18",
        paid_current_month: { month: "2026-10", status: "paid", source: "alert_email", paid_date: "2026-10-18" }
      }, {
        name: "Water",
        amount: 40,
        quarterly_amount: 424.75,
        cadence: "quarterly",
        next_due: "2027-01-20",
        paid_current_month: { month: "2026-10", status: "paid", source: "alert_email", paid_date: "2026-10-20" }
      }, {
        name: "Stack",
        amount: 1976.73,
        typical_day: 22,
        cadence: "monthly"
      }],
      one_time_bills: [{ name: "TruGreen", amount: 247.96, date: "2026-10-12", status: "paid" }],
      subscriptions: []
    }
  };
  const card = ctx.bankBudgetCard(fx, { planMonth: "2026-10", now: NOW });
  assert.equal(card.opening, 2296.25);
  assert.equal(card.pay, 9491.5);
  assert.equal(card.landed, 8471.5);
  assert.equal(card.owed, 7838.21);
  assert.equal(card.monthLeft, 1114.42);
  assert.equal(card.surplusIn, 65);
  assert.equal(card.surplus, 2361.25);
  assert.equal(card.everyday, 2900.12);
  assert.ok(card.everyday >= 0);
  assert.equal(card.deposits.length, 3);
  assert.equal(card.deposits.every(function (row) { return row.name === "Payroll" || row.name === "Stipend"; }), true);
  assert.equal(card.surplusRows.map(function (row) { return row.name; }).sort().join(","), "Outside transfer,Refund");
  assert.equal(ctx.bankRoundCents(card.opening + card.pay + card.surplusIn - card.owed - card.monthLeft), card.everyday);
  assert.equal(ctx.bankRoundCents(card.opening + card.surplusIn), card.surplus);
  const paidNames = card.bills.filter(function (row) { return row.state === "paid"; }).map(function (row) { return row.name; });
  assert.ok(paidNames.indexOf("Water") >= 0);
  assert.ok(paidNames.indexOf("TruGreen") >= 0);
  assert.ok(paidNames.indexOf("Mortgage") >= 0);
  assert.ok(paidNames.indexOf("Car payment") >= 0);
  const payPct = Math.round((card.landed / card.pay) * 100);
  const billPct = Math.round((card.paid / card.owed) * 100);
  const expectedLeft = ctx.bankRoundCents(card.opening + card.pay + card.surplusIn - card.owed);
  const leftPct = Math.round((card.everyday / expectedLeft) * 100);
  assert.ok(card.paid > 5000);
  assert.equal(ctx.bankRoundCents(card.paid + card.unpaid), card.owed);
  assert.equal(payPct, 89);
  assert.equal(expectedLeft, 4014.54);
  assert.equal(leftPct, 72);
  assert.equal(ctx.bankCardBarHue(0), 120);
  assert.equal(ctx.bankCardBarHue(50), 60);
  assert.equal(ctx.bankCardBarHue(100), 0);
  assert.equal(ctx.bankCardBarHue(150), 0);
  const over = ctx.bankCardBarHtml("pay", "Pay", "$2.00 of $1.00", 150);
  assert.match(over, /width:100\.0%/);
  assert.match(over, /aria-valuenow="150"/);
  assert.match(over, /150%/);
  fx.budget.month_end_sweep = {
    month: "2026-10",
    status: "projected",
    total: 15,
    to: { last4: "0831", nickname: "Bills" },
    move_by: "2026-10-30",
    accounts: { "4845": { amount: 15, held_back: 2 } },
    basis: "after the bills"
  };
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: NOW });
  const payAt = html.indexOf('data-bank-pay-total="9491.5"');
  const surplusAt = html.indexOf('data-bank-surplus="2361.25"');
  const owedAt = html.indexOf("data-bank-owed");
  assert.ok(payAt >= 0 && surplusAt > payAt && owedAt > surplusAt);
  assert.doesNotMatch(html.slice(payAt, surplusAt), /data-bank-opening|Opening balance/);
  assert.match(html.slice(surplusAt, owedAt), /data-bank-opening="2296.25"/);
  const payNames = html.slice(html.indexOf('data-bank-pay-list="1"'), html.indexOf("</ul>", html.indexOf('data-bank-pay-list="1"')));
  assert.match(payNames, /Payroll/);
  assert.match(payNames, /Stipend/);
  assert.doesNotMatch(payNames, /Refund|Outside|Move|Opening/);
  const surplusNames = html.slice(html.indexOf('data-bank-surplus-list="1"'), html.indexOf("</ul>", html.indexOf('data-bank-surplus-list="1"')));
  assert.match(surplusNames, /Refund/);
  assert.match(surplusNames, /Outside/);
  assert.doesNotMatch(surplusNames, /Move|Payroll|Stipend/);
  assert.match(html, /data-bank-pay-landed="8471.5"/);
  assert.match(html, /data-bank-everyday="2900.12"/);
  const hero = html.slice(html.indexOf('data-bank-hero="1"'), html.indexOf('class="bank-next"'));
  const face = hero.slice(0, hero.indexOf("fills-more"));
  const more = hero.slice(hero.indexOf("fills-more"));
  assert.match(face, /data-bank-sweep-line="1"/);
  assert.doesNotMatch(face, /data-bank-sweep-acct=/);
  assert.match(more, /data-bank-sweep-acct="4845"/);
  assert.ok(face.indexOf('data-bank-sweep-line="1"') < face.indexOf('data-bank-card-bars="1"'));
  const shownPaid = Number((html.match(/data-bank-paid="([^"]+)"/) || [])[1]);
  assert.equal(shownPaid, card.paid);
  function moneyRe(amount) {
    return ctx.bankMoney(amount).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  assert.match(face, /data-bank-bar="pay"[^>]*data-pct="89"/);
  assert.match(face, new RegExp('data-bank-bar="bills"[^>]*data-pct="' + billPct + '"'));
  assert.match(face, /data-bank-bar="left"[^>]*data-pct="72"/);
  assert.match(face, /\$8,471\.50 of \$9,491\.50, 89%/);
  assert.match(face, new RegExp(moneyRe(card.paid) + " of " + moneyRe(card.owed) + ", " + billPct + "%"));
  assert.match(face, /\$2,900\.12 used of \$4,014\.54, 72%/);
  assert.match(face, /data-bank-bar="income"/);
  assert.match(face, /Fits: /);
  assert.ok(face.indexOf('data-bank-bar="income"') < face.indexOf('data-bank-card-bars="1"'));
  assert.equal((face.match(/role="progressbar"/g) || []).length, 4);
  assert.match(face, /aria-valuemin="0"/);
  assert.match(face, /aria-valuemax="100"/);
  assert.match(face, /aria-valuenow="89"/);
  assert.match(face, new RegExp("background:hsl\\(" + ctx.bankCardBarHue((card.landed / card.pay) * 100) + ","));
  const src = fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8");
  assert.doesNotMatch(src, /2296\.25|2,296\.25|9491\.50|9,491\.50|7838\.21|2835\.12|2,835\.12/);
});

test("after budgets subtracts remaining category budgets from that left", function () {
  const ctx = boot();
  const fx = snap();
  fx.tier_doc.categories = [
    { id: "groceries", name: "Groceries", tier: "needs", budget: 400 },
    { id: "gas", name: "Gas", tier: "needs", budget: 200 },
    { id: "dining", name: "Dining", tier: "wants", budget: 113 },
    { id: "fun", name: "Fun", tier: "wants", budget: 50 },
    { id: "mortgage", name: "Mortgage", tier: "required", budget: 3544 }
  ];
  fx.budget.pay_periods[0].accounts["4845"].category_room = 90;
  const card = ctx.bankBudgetCard(fx, { planMonth: "2026-10", now: NOW });
  const rows = ctx.bankCategoryDiscretionary(fx, "2026-10");
  const room = ctx.bankRoundCents(rows.reduce(function (sum, row) { return sum + row.amount; }, 0));
  assert.equal(room, 763);
  assert.equal(rows.some(function (row) { return row.name === "Mortgage"; }), false);
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: NOW });
  const opts = { planMonth: "2026-10", now: NOW };
  const fit = ctx.bankBudgetFit(fx, ctx.bankFitMonth(fx, opts), opts);
  const spare = ctx.bankMonthSpare(fx, opts).left;
  const nowAfter = ctx.bankRoundCents(card.nowLeft - room);
  const monthAfter = ctx.bankRoundCents(card.monthLeft - room);
  function tone(amount) { return amount < -0.004 ? "tone-stop" : "tone-go"; }
  const nowPanel = html.slice(html.indexOf('data-bank-now="1"'), html.indexOf('data-bank-overall="1"'));
  const overallPanel = html.slice(html.indexOf('data-bank-overall="1"'), html.indexOf("fills-more"));
  assert.match(nowPanel, new RegExp('class="' + tone(nowAfter) + '" data-bank-after-now="' + nowAfter + '"'));
  assert.match(overallPanel, new RegExp('class="' + tone(monthAfter) + '" data-bank-after-month="' + monthAfter + '"'));
  assert.match(nowPanel, /After budgets/);
  assert.match(nowPanel, /Groceries, Gas, Dining…/);
  assert.doesNotMatch(nowPanel, /Fun|Mortgage/);
  assert.match(nowPanel, new RegExp(ctx.bankMoney(room).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(nowPanel, /href="#edits">Adjust budgets/);
  assert.match(overallPanel, /href="#edits">Adjust budgets/);
  const acctAfter = ctx.bankRoundCents(382.13 - 90);
  assert.match(nowPanel, new RegExp('data-bank-after-acct="1"[\\s\\S]*class="tone-go" data-bank-after-acct-amt="' + acctAfter + '"'));
  assert.doesNotMatch(overallPanel, /data-bank-after-acct=/);
  const catsAfter = Number((html.match(/data-bank-after-cats="([^"]+)"/) || [])[1]);
  assert.equal(catsAfter, spare);
  const barSpare = Number((html.match(/data-bank-bar="income"[^>]*data-bank-fit-spare="([^"]+)"/) || [])[1]);
  assert.equal(barSpare, fit.left);
  assert.equal(card.nowLeft != null, true);
});

test("after budgets is left minus remaining budgets and ignores carried spare", function () {
  const ctx = boot();
  const cats = [
    { id: "groceries", name: "Groceries", tier: "needs", budget: 180 },
    { id: "personal-health", name: "Personal Health", tier: "wants", budget: 120 },
    { id: "rent", name: "Rent", tier: "required", budget: 500 }
  ];
  const snap = {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [{ id: "chk", nickname: "Everyday", last4: "1111", role: "everyday", subType: "checking" }],
    current: { month: "2026-10", edits_tx: [], recent_tx: [] },
    history: { months: [] },
    budget: {
      budget_month: { month: "2026-10", start: "2026-10-01", end: "2026-10-31" },
      pay_schedule: [{ name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 400 }],
      pay_periods: [{
        current: true,
        start: "2026-10-01",
        end: "2026-10-31",
        accounts: {
          "1111": { nickname: "Everyday", role: "everyday", subType: "checking", left_at_end: 1000 }
        }
      }],
      bills: [],
      subscriptions: [],
      carried_spare: { month: "2026-09", net: 250 }
    },
    tier_doc: { categories: cats, category_rules: {}, category_tx: {}, bill_status: {}, manual_paid: {} }
  };
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" };
  const room = ctx.bankCardCategoryRoom(snap, opts);
  assert.equal(room.room, 300);
  assert.equal(room.rows.map(function (row) { return row.name; }).join(", "), "Groceries, Personal Health");
  const card = ctx.bankBudgetCard(snap, opts);
  assert.equal(card.nowLeft, 1000);
  assert.equal(card.monthLeft, 1000);
  const spare = ctx.bankMonthSpare(snap, opts);
  assert.notEqual(spare.left, 700);
  const page = ctx.bankPageHtml(snap, opts);
  assert.match(page, /data-bank-now-left="1000"/);
  assert.match(page, /data-bank-month-left="1000"/);
  assert.match(page, /data-bank-after-now="700"/);
  assert.match(page, /data-bank-after-month="700"/);
  assert.match(page, /Groceries, Personal Health/);
  assert.match(page, /\$300\.00/);
  assert.match(page, /href="#edits">Adjust budgets/);
  const nowPanel = page.slice(page.indexOf('data-bank-now="1"'), page.indexOf('data-bank-overall="1"'));
  assert.match(nowPanel, /class="tone-go" data-bank-after-now="700"/);
  const short = ctx.bankCardAfterBudgetsHtml(200, room, [], "now");
  assert.match(short, /class="tone-stop" data-bank-after-now="-100"/);
  assert.equal(Number((page.match(/data-bank-free="([^"]*)"/) || [])[1]), spare.left);
  snap.budget.carried_spare = { month: "2026-09", net: -40 };
  const again = ctx.bankPageHtml(snap, opts);
  assert.match(again, /data-bank-after-now="700"/);
  assert.match(again, /data-bank-after-month="700"/);
  assert.notEqual(ctx.bankMonthSpare(snap, opts).left, spare.left);
});
