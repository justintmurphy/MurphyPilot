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
      { nickname: "Checking", last4: "0831", suffix: "0831", subType: "checking" },
      { nickname: "Debit", last4: "4845", suffix: "4845", subType: "checking" }
    ],
    current: { month: "2026-10", edits_tx: [], recent_tx: [], history_tx: [], balances: [] },
    history: { months: [] },
    budget: {
      account_funding: [
        { nickname: "Checking", last4: "0831", current_balance: 1000, subType: "checking" },
        { nickname: "Debit", last4: "4845", current_balance: 20, subType: "checking" }
      ],
      bills: [{
        name: "Education",
        amount: 320,
        typical_day: 16,
        cadence: "monthly",
        tier: "required",
        usual_account: { nickname: "Debit", last4: "4845" }
      }],
      subscriptions: [],
      income_monthly: [{
        label: "Payroll",
        amount: 500,
        cadence: "semi_monthly",
        usual_account: { nickname: "Checking", last4: "0831" }
      }],
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 500, account: { nickname: "Checking", last4: "0831" } },
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 500, account: { nickname: "Checking", last4: "0831" } }
      ]
    },
    tier_doc: { rules: {}, plans: {}, categories: [], bill_account: {} }
  };
}

const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-13T16:00:00Z" };

function cardFor(html, iso) {
  const next = html.slice(html.indexOf('class="bank-next"'), html.indexOf('data-bank-part="calendar"'));
  const at = next.indexOf('data-bank-next-date="' + iso + '"');
  assert.ok(at > 0, iso);
  const end = next.indexOf('data-bank-next-card="', at + 20);
  return next.slice(next.lastIndexOf('<div class="card"', at), end < 0 ? next.length : end);
}

test("print moves are the transfer lines, and an empty list does not invent one", function () {
  const ctx = boot();
  const snap = baseSnap();
  snap.pay_periods = [
    {
      date: "2026-10-15",
      moves: [{
        from: "Debit ··4845",
        to: "Checking ··0831",
        amount: 300,
        move_by: "2026-10-16",
        reason: "Education"
      }]
    },
    { date: "2026-10-30", moves: [] }
  ];
  const html = ctx.bankPageHtml(snap, opts);
  const card = cardFor(html, "2026-10-15");
  const later = cardFor(html, "2026-10-30");
  assert.match(card, /<h3>Move money<\/h3>/);
  assert.match(card, /Move \$300 from Debit ··4845 to Checking ··0831 by Fri Oct 16, for Education/);
  assert.match(card, /type="checkbox" data-bank-move-done="/);
  assert.match(card, /Education/);
  assert.match(card, /from Debit ··4845/);
  assert.match(card, /\+\$500\.00/);
  assert.match(card, /to Checking ··0831/);
  assert.match(card, /data-bank-left-acct="0831"/);
  assert.match(card, /data-bank-left-acct="4845"/);
  assert.match(later, /No transfers needed/);
  assert.doesNotMatch(later, /Move \$/);
  assert.doesNotMatch(card, /Left from this pay|Set aside|Spending budget share|Opening balance|Carried over/);
  const checking = (card.match(/data-bank-left-acct="0831"[\s\S]*?<b[^>]*>([^<]+)/) || [])[1];
  const debit = (card.match(/data-bank-left-acct="4845"[\s\S]*?<b[^>]*>([^<]+)/) || [])[1];
  assert.equal(checking, "$1,800.00");
  assert.equal(debit, "\u2212$600.00");
});

test("a missing moves list is the shortfall below zero before the next deposit", function () {
  const ctx = boot();
  const snap = baseSnap();
  const html = ctx.bankPageHtml(snap, opts);
  const card = cardFor(html, "2026-10-15");
  assert.match(card, /Move \$300 from Checking ··0831 to Debit ··4845 by Fri Oct 16, for Education/);
  assert.match(card, /−\$320\.00/);
  assert.match(card, /from Debit ··4845/);
  assert.match(card, /due Oct 16/);
  const plan = ctx.bankNextPayMovePlan(snap, opts).filter(function (row) { return row.date === "2026-10-15"; })[0];
  assert.equal(plan.moves.length, 1);
  assert.equal(plan.moves[0].amount, 300);
  assert.equal(plan.fromPrint, false);
  const left = {};
  plan.left.forEach(function (row) { left[row.suffix] = row.balance; });
  assert.equal(left["0831"], 1200);
  assert.equal(left["4845"], 0);
});

test("can wait until a later date stays on the bill and skips the transfer when the wait is past this window", function () {
  const ctx = boot();
  const snap = baseSnap();
  snap.budget.bills[0].can_wait_until = "2026-11-02";
  const waited = cardFor(ctx.bankPageHtml(snap, opts), "2026-10-15");
  assert.match(waited, /can wait until Mon Nov 2/);
  assert.match(waited, /No transfers needed/);
  assert.doesNotMatch(waited, /Move \$300/);

  snap.budget.bills[0].can_wait_until = "2026-10-20";
  const soon = cardFor(ctx.bankPageHtml(snap, opts), "2026-10-15");
  assert.match(soon, /can wait until Tue Oct 20/);
  assert.match(soon, /Move \$300 from Checking ··0831 to Debit ··4845 by Tue Oct 20, for Education/);
});

test("a checked transfer stays checked in this browser", function () {
  const ctx = boot();
  const snap = baseSnap();
  const first = cardFor(ctx.bankPageHtml(snap, opts), "2026-10-15");
  const key = (first.match(/data-bank-move-done="([^"]+)"/) || [])[1];
  assert.ok(key);
  assert.doesNotMatch(first, /checked/);
  ctx.bankSetMoveDone(key, true);
  const stored = JSON.parse(ctx.bag.murphyHouseBanking);
  assert.equal(stored.moves[key], 1);
  const again = cardFor(ctx.bankPageHtml(snap, opts), "2026-10-15");
  assert.match(again, /data-bank-move-done="[^"]+" checked/);
  assert.match(again, /bank-move-line is-done/);
  ctx.bankSetMoveDone(key, false);
  const cleared = cardFor(ctx.bankPageHtml(snap, opts), "2026-10-15");
  assert.doesNotMatch(cleared, /checked/);
  assert.equal(JSON.parse(ctx.bag.murphyHouseBanking).moves[key], undefined);
});
