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

function snap(schedule) {
  return {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [{ nickname: "Spending", last4: "2222", balance: 80 }],
    current: {
      month: "2026-10",
      edits_tx: [],
      recent_tx: [],
      history_tx: [],
      balances: [{ nickname: "Spending", last4: "2222", balance: 80 }]
    },
    history: { months: [] },
    budget: {
      bills: [
        { name: "Rent", amount: 30, typical_day: 20, cadence: "monthly", tier: "required" },
        { name: "Corner Market", amount: 8, typical_day: 12, cadence: "monthly", tier: "needs" }
      ],
      subscriptions: [],
      income_monthly: [
        { label: "Payroll", amount: 40, deposits: [{ day: 15, amount: 40 }, { day: "EOM", amount: 40 }] },
        { label: "Stipend", amount: 12, deposits: [{ day: 10, amount: 12 }, { day: 25, amount: 12 }] }
      ],
      pay_schedule: schedule
    },
    tier_doc: { rules: {}, plans: {}, categories: [], category_rules: {}, category_tx: {} }
  };
}

function monthEvents(ctx, data, ym) {
  return ctx.bankCollectPayEvents(data, ym).filter(function (ev) {
    return ev && ev.date && ev.date.slice(0, 7) === ctx.bankYm(ym.year, ym.month);
  });
}

function byKind(events, kind) {
  return Array.from(events).filter(function (ev) { return ev.kind === kind; }).map(function (ev) {
    return ev.date + (ev.rolled_from ? "@" + ev.rolled_from : "");
  }).sort();
}

test("a month the schedule does not cover falls back to deposits and rolls the prior business day", function () {
  const ctx = boot();
  const octoberStart = snap([
    { name: "Payroll", kind: "payroll", date: "2026-10-15", pay_date: "2026-10-15", amount: 40 },
    { name: "Payroll", kind: "payroll", date: "2026-10-31", pay_date: "2026-10-30", nominal_date: "2026-10-31", amount: 40 },
    { name: "Stipend", kind: "stipend", date: "2026-10-10", pay_date: "2026-10-09", nominal_date: "2026-10-10", amount: 12 },
    { name: "Stipend", kind: "stipend", date: "2026-10-25", pay_date: "2026-10-23", nominal_date: "2026-10-25", amount: 12 }
  ]);
  const september = monthEvents(ctx, octoberStart, { year: 2026, month: 9 });
  assert.deepEqual(byKind(september, "Payroll"), ["2026-09-15", "2026-09-30"]);
  assert.deepEqual(byKind(september, "Stipend"), ["2026-09-10", "2026-09-25"]);

  const augustStart = snap([
    { name: "Payroll", kind: "payroll", date: "2026-08-14", pay_date: "2026-08-14", nominal_date: "2026-08-15", amount: 40 },
    { name: "Stipend", kind: "stipend", date: "2026-08-10", pay_date: "2026-08-10", amount: 12 }
  ]);
  const july = monthEvents(ctx, augustStart, { year: 2026, month: 7 });
  assert.deepEqual(byKind(july, "Payroll"), ["2026-07-15", "2026-07-31"]);
  assert.deepEqual(byKind(july, "Stipend"), ["2026-07-10", "2026-07-24@2026-07-25"]);

  const incomes = ctx.bankAttachIncomePlan(ctx.bankNormalizeIncome(augustStart.budget), { year: 2026, month: 7 });
  const stipend = incomes.filter(function (inc) { return inc.label === "Stipend"; })[0];
  const payroll = incomes.filter(function (inc) { return inc.label === "Payroll"; })[0];
  assert.deepEqual(Array.from(stipend.pay_days), [10, 24]);
  assert.deepEqual(Array.from(payroll.pay_days), [15, 31]);
});

test("a month the schedule covers uses those rows and does not add deposit days", function () {
  const ctx = boot();
  const data = snap([
    { name: "Payroll", kind: "payroll", date: "2026-10-15", pay_date: "2026-10-15", amount: 40 },
    { name: "Payroll", kind: "payroll", date: "2026-10-31", pay_date: "2026-10-30", nominal_date: "2026-10-31", amount: 40 },
    { name: "Stipend", kind: "stipend", date: "2026-10-10", pay_date: "2026-10-09", nominal_date: "2026-10-10", amount: 12 },
    { name: "Stipend", kind: "stipend", date: "2026-10-25", pay_date: "2026-10-23", nominal_date: "2026-10-25", amount: 12 }
  ]);
  const october = monthEvents(ctx, data, { year: 2026, month: 10 });
  assert.deepEqual(byKind(october, "Payroll"), ["2026-10-15", "2026-10-30@2026-10-31"]);
  assert.deepEqual(byKind(october, "Stipend"), ["2026-10-09@2026-10-10", "2026-10-23@2026-10-25"]);
  october.forEach(function (ev) {
    assert.notEqual(ev.date, "2026-10-10");
    assert.notEqual(ev.date, "2026-10-25");
    assert.notEqual(ev.date, "2026-10-31");
  });
  const incomes = ctx.bankAttachIncomePlan(ctx.bankNormalizeIncome(data.budget), { year: 2026, month: 10 });
  const stipend = incomes.filter(function (inc) { return inc.label === "Stipend"; })[0];
  assert.deepEqual(Array.from(stipend.pay_days), [9, 23]);
});

test("next pay names each deposit under the paycheck, including a rolled original day", function () {
  const ctx = boot();
  const data = snap([
    { name: "Payroll", kind: "payroll", date: "2026-10-15", pay_date: "2026-10-15", amount: 40, account: { last4: "2222" } },
    { name: "Payroll", kind: "payroll", date: "2026-10-31", pay_date: "2026-10-30", nominal_date: "2026-10-31", amount: 40, account: { last4: "2222" } },
    { name: "Stipend", kind: "stipend", date: "2026-10-25", pay_date: "2026-10-23", nominal_date: "2026-10-25", amount: 12, account: { last4: "2222" } }
  ]);
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" };
  const html = ctx.bankPageHtml(data, opts);
  const next = html.slice(html.indexOf('class="bank-next"'), html.indexOf('data-bank-part="calendar"'));
  const payAt = next.indexOf('data-bank-next-date="2026-10-15"');
  const card = next.slice(next.lastIndexOf('<div class="card"', payAt), next.indexOf('data-bank-next-card="', payAt + 20));
  const stipAt = next.indexOf('data-bank-next-date="2026-10-23"');
  const stipend = next.slice(next.lastIndexOf('<div class="card"', stipAt), next.indexOf('data-bank-next-card="', stipAt + 20));
  assert.match(card, /Payroll \u00b7 Thu Oct 15/);
  assert.doesNotMatch(card, /data-bank-also-row|Also in|Stipend/);
  assert.match(stipend, /Stipend \u00b7 Fri Oct 23/);
  assert.match(stipend, /\(for Sun 25th\)/);
  assert.match(stipend, /\+\$12\.00/);
  assert.ok(stipend.indexOf("Stipend") < stipend.indexOf("bank-next-bills"));
  assert.doesNotMatch(stipend, /data-bank-also-row/);
  const periods = ctx.bankPayPeriods(data, opts);
  const payroll = periods.filter(function (p) { return p.focus && p.focus.date === "2026-10-15"; })[0];
  const stipendPeriod = periods.filter(function (p) { return p.focus && p.focus.date === "2026-10-23"; })[0];
  assert.equal(payroll.end, "2026-10-23");
  assert.equal(stipendPeriod.focus.kind, "Stipend");
  const math = ctx.bankPeriodMath(data, opts, payroll, 0);
  assert.equal(math.also, 0);
  assert.equal(math.deposit, 40);
  data.budget.other_income = [{ name: "Refund", amount: 3, date: "2026-10-16" }];
  const withOneOff = ctx.bankPageHtml(data, opts);
  const payCard = withOneOff.slice(withOneOff.indexOf('data-bank-next-date="2026-10-15"'), withOneOff.indexOf('data-bank-next-date="2026-10-23"'));
  assert.match(payCard, /Refund \u00b7 Fri Oct 16/);
  assert.match(payCard, /data-bank-also-row="2026-10-16"/);
  assert.doesNotMatch(payCard, /Stipend \u00b7/);
  const oneMath = ctx.bankPeriodMath(data, opts, payroll, 0);
  assert.equal(oneMath.also, 3);
});

test("a rolled calendar chip uses the income name and the original day points at the new date", function () {
  const ctx = boot();
  const data = snap([
    { name: "Payroll", kind: "payroll", date: "2026-10-15", pay_date: "2026-10-15", amount: 40 },
    { name: "Stipend", kind: "stipend", date: "2026-10-25", pay_date: "2026-10-23", nominal_date: "2026-10-25", amount: 12 }
  ]);
  const html = ctx.bankPageHtml(data, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  const cal = html.slice(html.indexOf('class="bank-cal"'), html.indexOf('data-bank-part="funding"'));
  assert.match(cal, /<b>23<\/b> <em class="pay pay-named" title="Stipend[^"]*" aria-label="Stipend[^"]*">Stipend<\/em>/);
  assert.match(cal, /<small class="bank-day-note">Stipend \u2192 23rd<\/small>/);
  const day25 = cal.slice(cal.indexOf("<b>25</b>") - 80, cal.indexOf("<b>25</b>") + 180);
  assert.match(day25, /Stipend \u2192 23rd/);
  assert.doesNotMatch(day25, />Pay</);
  const prior = ctx.bankPageHtml(data, { tab: "budget", planMonth: "2026-09", now: "2026-10-16T16:00:00Z" });
  const priorCal = prior.slice(prior.indexOf('class="bank-cal"'), prior.indexOf('data-bank-part="funding"'));
  assert.match(priorCal, /aria-label="September 2026"/);
  assert.match(priorCal, /<b>10<\/b> <em class="pay"/);
  assert.match(priorCal, /<b>15<\/b> <em class="pay"/);
  assert.match(priorCal, /<b>25<\/b> <em class="pay"/);
  assert.match(priorCal, /<b>30<\/b> <em class="pay"/);
});
