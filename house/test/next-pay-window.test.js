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
    setTimeout: function (fn) { return 0; },
    clearTimeout: function () {},
    Intl: Intl,
    Date: (function () {
      const RealDate = Date;
      const raw = process.env.FAKE_NOW || "2026-10-16";
      const fixed = new RealDate(raw.length === 10 ? raw + "T16:00:00.000Z" : raw);
      function FixedDate() {
        var args = arguments;
        if (!(this instanceof FixedDate)) return args.length ? RealDate.apply(null, args) : RealDate(fixed);
        if (!args.length) return new RealDate(fixed.getTime());
        var list = [null];
        for (var i = 0; i < args.length; i++) list.push(args[i]);
        return new (Function.prototype.bind.apply(RealDate, list))();
      }
      FixedDate.now = function () { return fixed.getTime(); };
      FixedDate.parse = RealDate.parse;
      FixedDate.UTC = RealDate.UTC;
      FixedDate.prototype = RealDate.prototype;
      return FixedDate;
    })(),
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

/* Live shape: semimonthly payroll on the 15th and last day, stipend on the 10th and 25th.
   Forge has already rolled pay_schedule past the September check. That check lives only in history. */
function livePaySnap(postedDates) {
  const history = [{
    date: "2026-09-29",
    amount: 40,
    flow: "inflow",
    desc: "Payroll",
    category: "Paycheck/Salary/Wages",
    tx_key: "2026-09-29|acct-check|40|Payroll"
  }];
  (postedDates || []).forEach(function (iso) {
    history.push({
      date: iso,
      amount: 40,
      flow: "inflow",
      desc: "Payroll",
      category: "Paycheck/Salary/Wages",
      tx_key: iso + "|acct-check|40|Payroll"
    });
  });
  return {
    asof: "2026-10-08T15:00:00-04:00",
    accounts: [{ nickname: "Bills", last4: "2222", balance: 100 }],
    current: {
      month: "2026-10",
      edits_tx: [],
      recent_tx: [],
      history_tx: [],
      balances: [{ nickname: "Bills", last4: "2222", balance: 100 }]
    },
    history: { months: [{ month: "2026-09", history_tx: history }] },
    budget: {
      account_funding: [{ nickname: "Bills", last4: "2222", start_balance: 100, current_balance: 100 }],
      bills: [],
      subscriptions: [],
      income_monthly: [
        { label: "Payroll", amount: 40, cadence: "semi_monthly", deposits: [{ day: 15, amount: 40 }, { day: "EOM", amount: 40 }] },
        { label: "Fostering per diem stipend", amount: 12.34, cadence: "semi_monthly", deposits: [{ day: 10, amount: 12.34 }, { day: 25, amount: 12.34 }] }
      ],
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-15", pay_date: "2026-10-15", amount: 40 },
        { name: "Payroll", kind: "payroll", date: "2026-10-31", pay_date: "2026-10-30", nominal_date: "2026-10-31", amount: 40, rolled: true, roll_reason: "weekend" },
        { name: "Fostering per diem stipend", kind: "stipend", date: "2026-10-10", pay_date: "2026-10-09", nominal_date: "2026-10-10", amount: 12.34 },
        { name: "Fostering per diem stipend", kind: "stipend", date: "2026-10-25", pay_date: "2026-10-23", nominal_date: "2026-10-25", amount: 12.34 }
      ]
    },
    tier_doc: { rules: {}, plans: {}, categories: [], category_rules: {}, category_tx: {} }
  };
}

function nextSlice(html) {
  return html.slice(html.indexOf('class="bank-next"'), html.indexOf('data-bank-part="calendar"'));
}

function cardBits(html) {
  const next = nextSlice(html);
  const cards = [];
  const parts = next.split('data-bank-next-card="').slice(1);
  parts.forEach(function (chunk) {
    cards.push({
      date: (chunk.match(/data-bank-next-date="([^"]+)"/) || [])[1],
      thisPay: /data-bank-this-pay="1"/.test(chunk.split('data-bank-next-card="')[0]),
      expected: /data-bank-expected="1"/.test(chunk.split('data-bank-next-card="')[0]),
      past: /data-bank-past="1"/.test(chunk.split('data-bank-next-card="')[0]),
      chunk: chunk
    });
  });
  return cards;
}

test("the calendar marks only today in the viewed month", function () {
  const ctx = boot();
  const snap = livePaySnap([]);
  const html = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-10-08T16:00:00Z" });
  const cal = html.slice(html.indexOf('class="bank-cal"'), html.indexOf('data-bank-part="funding"'));
  const marks = cal.match(/aria-current="date"/g) || [];
  assert.equal(marks.length, 1);
  assert.match(cal, /aria-current="date"[^>]*>\s*(?:<span class="bank-day-top">\s*)?<b>8<\/b>/);
  const other = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-11", now: "2026-10-08T16:00:00Z" });
  const otherCal = other.slice(other.indexOf('class="bank-cal"'), other.indexOf('data-bank-part="funding"'));
  assert.equal((otherCal.match(/aria-current="date"/g) || []).length, 0);
});

test("October 8 starts on the posted September check, then October 15 and October 30", function () {
  const ctx = boot();
  const snap = livePaySnap([]);
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-08T16:00:00Z" };
  const html = ctx.bankPageHtml(snap, opts);
  const cards = cardBits(html);
  assert.deepEqual(cards.map(function (c) { return c.date; }), ["2026-09-30", "2026-10-15", "2026-10-30"]);
  assert.equal(cards[0].thisPay, true);
  assert.equal(cards[1].expected, true);
  assert.equal(cards[2].expected, true);
  assert.match(cards[0].chunk, /This pay/);
  assert.match(cards[0].chunk, /through Wed, Oct 14/);
  assert.match(cards[0].chunk, /data-bank-also-in="12.34"/);
  assert.doesNotMatch(nextSlice(html), /data-bank-next-date="2026-10-09"|data-bank-next-date="2026-10-23"/);
  const periods = ctx.bankPayPeriods(snap, opts);
  let carry = 0;
  periods.forEach(function (period, i) {
    const math = ctx.bankPeriodMath(snap, opts, period, carry);
    let stepped = i === 0 ? 0 : carry;
    stepped = ctx.bankLeftAfter(stepped, { kind: "in", amount: math.deposit || 0, counted: true, pending: false });
    stepped = ctx.bankLeftAfter(stepped, { kind: "in", amount: math.also || 0, counted: true, pending: false });
    stepped = ctx.bankLeftAfter(stepped, { kind: "out", amount: math.aside || 0, counted: true, pending: false });
    assert.equal(math.left, stepped);
    carry = math.left;
  });
});

test("a schedule that already skipped October 15 still inserts that payday", function () {
  const ctx = boot();
  const snap = livePaySnap([]);
  snap.budget.pay_schedule = snap.budget.pay_schedule.filter(function (row) {
    return !(row.kind === "payroll" && row.pay_date === "2026-10-15");
  });
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-08T16:00:00Z" };
  const cards = cardBits(ctx.bankPageHtml(snap, opts));
  assert.deepEqual(cards.map(function (c) { return c.date; }), ["2026-09-30", "2026-10-15", "2026-10-30"]);
  assert.equal(cards[0].thisPay, true);
  assert.equal(cards[1].expected, true);
});

test("next pay follows the posted check across the October paydays", function () {
  const ctx = boot();
  const cases = [
    { now: "2026-10-08T16:00:00Z", posted: [], dates: ["2026-09-30", "2026-10-15", "2026-10-30"], thisPay: "2026-09-30", past: [] },
    { now: "2026-10-14T16:00:00Z", posted: [], dates: ["2026-09-30", "2026-10-15", "2026-10-30"], thisPay: "2026-09-30", past: [] },
    { now: "2026-10-15T16:00:00Z", posted: [], dates: ["2026-09-30", "2026-10-15", "2026-10-30"], thisPay: "2026-09-30", past: [] },
    { now: "2026-10-15T16:00:00Z", posted: ["2026-10-15"], dates: ["2026-09-30", "2026-10-15", "2026-10-30"], thisPay: "2026-10-15", past: ["2026-09-30"] },
    { now: "2026-10-16T16:00:00Z", posted: ["2026-10-15"], dates: ["2026-09-30", "2026-10-15", "2026-10-30"], thisPay: "2026-10-15", past: ["2026-09-30"] },
    { now: "2026-10-29T16:00:00Z", posted: ["2026-10-15"], dates: ["2026-09-30", "2026-10-15", "2026-10-30"], thisPay: "2026-10-15", past: ["2026-09-30"] },
    { now: "2026-10-30T16:00:00Z", posted: ["2026-10-15"], dates: ["2026-09-30", "2026-10-15", "2026-10-30"], thisPay: "2026-10-15", past: ["2026-09-30"] },
    { now: "2026-10-30T16:00:00Z", posted: ["2026-10-15", "2026-10-30"], dates: ["2026-09-30", "2026-10-15", "2026-10-30", "2026-11-13"], thisPay: "2026-10-30", past: ["2026-09-30", "2026-10-15"] },
    { now: "2026-10-31T16:00:00Z", posted: ["2026-10-30"], dates: ["2026-09-30", "2026-10-15", "2026-10-30", "2026-11-13"], thisPay: "2026-10-30", past: ["2026-09-30", "2026-10-15"] }
  ];
  cases.forEach(function (row) {
    const ctx = boot();
    const snap = livePaySnap(row.posted);
    const opts = { tab: "budget", planMonth: "2026-10", now: row.now };
    const cards = cardBits(ctx.bankPageHtml(snap, opts));
    const dates = cards.map(function (c) { return c.date; });
    assert.deepEqual(dates.slice(0, row.dates.length), row.dates, row.now + " posted " + row.posted.join(","));
    const focus = cards.filter(function (c) { return c.date === row.thisPay; })[0];
    assert.ok(focus && focus.thisPay, row.now + " this pay " + row.thisPay);
    const past = row.past || [];
    past.forEach(function (iso) {
      const card = cards.filter(function (c) { return c.date === iso; })[0];
      assert.ok(card && card.past, row.now + " past " + iso);
      assert.equal(card.thisPay, false);
    });
    cards.forEach(function (c) {
      if (c.date === row.thisPay || past.indexOf(c.date) >= 0) return;
      assert.equal(c.expected, true, row.now + " " + c.date);
    });
    const focusAt = dates.indexOf(row.thisPay);
    assert.match(ctx.bankPageHtml(snap, opts), new RegExp('class="book-chip on" data-bank-next-dot="' + focusAt + '"'));
  });
});

test("October 20 keeps September 30 as a past card and lands on October 15", function () {
  const ctx = boot();
  const snap = livePaySnap(["2026-10-15"]);
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-20T16:00:00Z" };
  const html = ctx.bankPageHtml(snap, opts);
  const cards = cardBits(html);
  assert.deepEqual(cards.map(function (c) { return c.date; }), ["2026-09-30", "2026-10-15", "2026-10-30"]);
  assert.equal(cards[0].past, true);
  assert.equal(cards[0].thisPay, false);
  assert.match(cards[0].chunk, /Sep 30 to Oct 14/);
  assert.doesNotMatch(cards[0].chunk.split('data-bank-next-card="')[0], /This pay/);
  assert.equal(cards[1].thisPay, true);
  assert.match(cards[1].chunk, /This pay/);
  assert.equal(cards[2].expected, true);
  assert.match(html, /class="book-chip on" data-bank-next-dot="1"/);
  assert.doesNotMatch(nextSlice(html), /data-bank-next-date="2026-09-15"/);
  const periods = ctx.bankPayPeriods(snap, opts);
  let carry = 0;
  periods.forEach(function (period, i) {
    const math = ctx.bankPeriodMath(snap, opts, period, carry);
    let stepped = i === 0 ? 0 : carry;
    stepped = ctx.bankLeftAfter(stepped, { kind: "in", amount: math.deposit || 0, counted: true, pending: false });
    stepped = ctx.bankLeftAfter(stepped, { kind: "in", amount: math.also || 0, counted: true, pending: false });
    stepped = ctx.bankLeftAfter(stepped, { kind: "out", amount: math.aside || 0, counted: true, pending: false });
    assert.equal(math.left, stepped);
    carry = math.left;
  });
  assert.equal(periods[1].thisPay, true);
  assert.equal(periods[2].focus.date, "2026-10-30");
});
