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
  assert.equal(card.everyday, 1066.24);
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
  assert.match(html, /data-bank-pay-total="9651.12"/);
  assert.match(html, /data-bank-pay-landed="8631.12"/);
  assert.match(html, /data-bank-owed="7470.46"/);
  assert.match(html, /data-bank-paid="5613.52"/);
  assert.match(html, /data-bank-unpaid="1856.94"/);
  assert.match(html, /data-bank-month-left="1114.42"/);
  assert.match(html, /data-bank-month-acct="1039.05"/);
  assert.match(html, /data-bank-month-acct="75.37"/);
  assert.match(html, /data-bank-everyday="1066.24"/);
  assert.match(html, /Landed/);
  assert.match(html, /Not yet/);
  assert.match(html, /Left at month end Oct 29/);
  const list = html.slice(html.indexOf('data-bank-bill-list="1"'), html.indexOf("data-bank-everyday"));
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
