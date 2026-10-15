"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");

function boot() {
  const bag = {};
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
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : null; },
      setItem: function (key, value) { bag[key] = String(value); },
      removeItem: function (key) { delete bag[key]; }
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
  sandbox.bag = bag;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/list-cap.js"), "utf8"), sandbox, { filename: "list-cap.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/ticker.js"), "utf8"), sandbox, { filename: "ticker.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8"), sandbox, { filename: "banking.js" });
  return sandbox;
}

function baseSnap() {
  return {
    asof: "2026-10-13T12:00:00-04:00",
    accounts: [
      { nickname: "Checking", last4: "1111", suffix: "1111", subType: "checking" },
      { nickname: "Debit", last4: "2222", suffix: "2222", subType: "checking" }
    ],
    current: { month: "2026-10", edits_tx: [], recent_tx: [], history_tx: [], balances: [] },
    history: { months: [] },
    budget: {
      account_funding: [
        { nickname: "Checking", last4: "1111", current_balance: 200, subType: "checking" },
        { nickname: "Debit", last4: "2222", current_balance: 100, subType: "checking" }
      ],
      bills: [],
      subscriptions: [],
      income_monthly: [{
        label: "Payroll",
        amount: 400,
        cadence: "semi_monthly",
        usual_account: { nickname: "Checking", last4: "1111" }
      }],
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 400, account: { nickname: "Checking", last4: "1111" } },
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 400, account: { nickname: "Checking", last4: "1111" } }
      ]
    },
    tier_doc: { rules: {}, plans: {}, categories: [], bill_account: {} }
  };
}

const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-13T16:00:00Z" };

function bill(extra) {
  return Object.assign({
    cadence: "monthly",
    tier: "required",
    grace_days: 5,
    usual_account: { nickname: "Debit", last4: "2222" }
  }, extra);
}

function planOn(ctx, snap, date) {
  return ctx.bankNextPayMovePlan(snap, opts).filter(function (row) { return row.date === date; })[0];
}

function leftOf(plan, suffix) {
  const row = (plan.left || []).filter(function (item) { return item.suffix === suffix; })[0];
  assert.ok(row, suffix);
  return row.balance;
}

function cardWith(html, token) {
  const next = html.slice(html.indexOf('class="bank-next"'), html.indexOf('data-bank-part="calendar"'));
  const at = next.indexOf(token);
  assert.ok(at > 0, token);
  const end = next.indexOf('data-bank-next-card="', at + 20);
  return next.slice(next.lastIndexOf('<div class="card"', at), end < 0 ? next.length : end);
}

test("alert, bank, tx key, and email recognition do not reduce Left; only awaiting_debit does", function () {
  const ctx = boot();
  const snap = baseSnap();
  snap.budget.email_overlay = [{ name: "Water", month: "2026-10", status: "confirmed" }];
  snap.budget.email_confirmations = {};
  snap.budget.awaiting_debit = [{ name: "Membership", bill_id: "membership", month: "2026-10", amount: 15, due: "2026-10-17" }];
  snap.budget.bills = [
    bill({
      name: "Grocer",
      amount: 500,
      typical_day: 16,
      paid_current_month: { month: "2026-10", status: "paid", source: "alert_email", paid_date: "2026-10-10" }
    }),
    bill({
      name: "Power",
      amount: 70,
      typical_day: 16,
      paid_current_month: { month: "2026-10", status: "paid", source: "bank", paid_date: "2026-10-10" }
    }),
    bill({
      name: "Internet",
      amount: 30,
      typical_day: 16,
      paid_current_month: { month: "2026-10", status: "paid", tx_key: "net-1", paid_date: "2026-10-11" }
    }),
    bill({ name: "Water", amount: 40, typical_day: 16 }),
    bill({
      name: "Streaming",
      amount: 25,
      typical_day: 16,
      paid_current_month: { month: "2026-10", status: "paid", source: "manual", paid_date: "2026-10-12" }
    }),
    bill({ name: "Rent", amount: 20, typical_day: 18 }),
    bill({ name: "Membership", bill_id: "membership", amount: 15, typical_day: 17 })
  ];
  const plan = planOn(ctx, snap, "2026-10-15");
  assert.ok(plan);
  const byName = {};
  plan.bills.forEach(function (row) { byName[row.name] = row; });
  ["Grocer", "Power", "Internet", "Water"].forEach(function (name) {
    assert.equal(byName[name].inBalance, true, name);
    assert.equal(byName[name].awaitingBank, false, name);
    assert.equal(byName[name].paid, true, name);
  });
  assert.equal(byName.Streaming.awaitingBank, false);
  assert.equal(byName.Streaming.inBalance, false);
  assert.equal(byName.Membership.awaitingBank, true);
  assert.equal(byName.Membership.phrase, "Marked paid, awaiting bank");
  assert.equal(byName.Rent.paid, false);
  assert.equal(leftOf(plan, "2222"), 65);
  plan.left.forEach(function (row) {
    assert.ok(row.balance >= 0, row.suffix + " " + row.balance);
  });
  assert.equal(plan.moves.some(function (mv) { return /grocer|power|internet|water|streaming/i.test(mv.reason || ""); }), false);
});

test("a rolled cycle_due lands in its window at cycle_amount, and quarterly stays on next_due", function () {
  const ctx = boot();
  const snap = baseSnap();
  snap.budget.pay_periods = [{
    start: "2026-10-15",
    end: "2026-10-22",
    date: "2026-10-15"
  }];
  snap.budget.bills = [
    bill({ name: "Rolled", amount: 10, typical_day: 3, cycle_due: "2026-10-18", cycle_amount: 44, grace_days: 5 }),
    bill({
      name: "Quarter",
      amount: 12,
      typical_day: 3,
      cadence: "quarterly",
      quarterly_amount: 90,
      monthly_amount: 30,
      next_due: "2026-10-20"
    }),
    bill({ name: "Later", amount: 12, typical_day: 28 })
  ];
  const plan = planOn(ctx, snap, "2026-10-15");
  assert.equal(plan.winStart, "2026-10-15");
  assert.equal(plan.winEnd, "2026-10-22");
  const rolled = plan.bills.filter(function (row) { return row.name === "Rolled"; })[0];
  assert.ok(rolled);
  assert.equal(rolled.due, "2026-10-18");
  assert.equal(rolled.amount, 44);
  const quarter = plan.bills.filter(function (row) { return row.name === "Quarter"; })[0];
  assert.ok(quarter);
  assert.equal(quarter.due, "2026-10-20");
  assert.equal(quarter.amount, 90);
  assert.equal(plan.bills.some(function (row) { return row.name === "Later" || row.due === "2026-10-03"; }), false);
});

test("printed pay period windows and ledger left replace the recomputed card", function () {
  const ctx = boot();
  const snap = baseSnap();
  snap.budget.pay_schedule = [
    { name: "Payroll", kind: "payroll", date: "2026-10-14", amount: 400, account: { nickname: "Checking", last4: "1111" } },
    { name: "Payroll", kind: "payroll", date: "2026-10-23", amount: 400, account: { nickname: "Checking", last4: "1111" } }
  ];
  snap.budget.bills = [
    bill({ name: "Early", amount: 10, typical_day: 14 }),
    bill({ name: "Mid", amount: 9000, typical_day: 16 }),
    bill({ name: "End", amount: 11, typical_day: 22 }),
    bill({ name: "After", amount: 12, typical_day: 23 })
  ];
  snap.budget.pay_periods = [{
    start: "2026-10-15",
    end: "2026-10-22",
    date: "2026-10-14",
    accounts: {
      "1111": { nickname: "Checking", left_at_end: 400, low: 350, low_date: "2026-10-16" },
      "2222": { nickname: "Debit", left_at_end: 80, low: 40, low_date: "2026-10-18" }
    },
    moves: [{ from: "Checking ··1111", to: "Debit ··2222", amount: 50, move_by: "2026-10-16", reason: "Mid" }],
    completed_moves: [{ from: "1111", to: "2222", amount: 50 }]
  }];
  const plan = planOn(ctx, snap, "2026-10-14");
  assert.ok(plan);
  assert.equal(plan.winStart, "2026-10-15");
  assert.equal(plan.winEnd, "2026-10-22");
  assert.equal(plan.fromLedger, true);
  const names = plan.bills.map(function (row) { return row.name; });
  assert.equal(names.filter(function (name) { return name === "Early" || name === "Mid" || name === "End" || name === "After"; }).sort().join(","), "End,Mid");
  assert.equal(plan.moves.length, 0);
  assert.equal(leftOf(plan, "1111"), 400);
  assert.equal(leftOf(plan, "2222"), 80);
  plan.left.forEach(function (row) { assert.ok(row.balance >= 0, row.balance); });
  const html = ctx.bankPageHtml(snap, opts);
  const card = cardWith(html, 'data-bank-window="2026-10-15/2026-10-22"');
  assert.match(card, /Oct 15 – Oct 22/);
  assert.match(card, /Figures from bank ledger/);
  assert.match(card, /data-bank-low="1"/);
  assert.match(card, /Low \$350\.00 · Oct 16/);
  assert.match(card, /Low \$40\.00 · Oct 18/);
  assert.match(card, /\$400\.00/);
  assert.match(card, /\$80\.00/);
  assert.doesNotMatch(card, /data-bank-window="2026-10-14\/2026-10-23"/);
  assert.doesNotMatch(card, /Move \$/);
  const leftHtml = card.slice(card.indexOf('data-bank-left="1"'), card.indexOf("</section>", card.indexOf('data-bank-left="1"')));
  assert.doesNotMatch(leftHtml, /tone-stop|−\$/);
});

test("running_balance is Left when left_at_end is absent, and projection_start is not pending twice", function () {
  const ctx = boot();
  const snap = baseSnap();
  snap.budget.pay_periods = [{ start: "2026-10-15", end: "2026-10-22", date: "2026-10-15" }];
  snap.budget.account_funding[1].rows = [
    { date: "2026-10-16", name: "Sample", amount: 10, running_balance: 140 },
    { date: "2026-10-20", name: "Sample two", amount: 5, running_balance: 135 },
    { date: "2026-10-24", name: "Later", amount: 5, running_balance: 9 }
  ];
  snap.budget.bills = [bill({ name: "Wide", amount: 5000, typical_day: 16 })];
  const running = planOn(ctx, snap, "2026-10-15");
  assert.equal(running.fromLedger, true);
  assert.equal(leftOf(running, "2222"), 135);
  running.left.forEach(function (row) { assert.ok(row.balance >= 0, row.balance); });

  const open = baseSnap();
  open.budget.account_funding[0].projection_start_balance = 100;
  open.budget.account_funding[0].pending_unposted = 90;
  open.budget.account_funding[0].current_balance = 100;
  open.budget.bills = [bill({
    name: "Fee",
    amount: 30,
    typical_day: 16,
    usual_account: { nickname: "Checking", last4: "1111" }
  })];
  const projected = planOn(ctx, open, "2026-10-15");
  assert.equal(projected.fromLedger, false);
  assert.equal(leftOf(projected, "1111"), 470);
  projected.left.forEach(function (row) { assert.ok(row.balance >= 0, row.balance); });
});
