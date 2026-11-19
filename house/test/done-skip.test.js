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
    history: { replaceState: function () {}, pushState: function () {} },
    addEventListener: function () {},
    removeEventListener: function () {},
    console: console,
    fetch: function () { return Promise.reject(new Error("no fetch")); },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    setTimeout: function () { return 0; },
    clearTimeout: function () {},
    Intl: Intl,
    Date: (function () {
      const RealDate = Date;
      const raw = "2026-11-18T16:00:00.000Z";
      const fixed = new RealDate(raw);
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

function bill(extra) {
  return Object.assign({
    name: "Cabin cover",
    bill_id: "cabin-cover",
    amount: 40,
    typical_day: 20,
    tier: "required",
    kind: "bill",
    cadence: "monthly",
    category: "cabin",
    usual_account: { suffix: "2222", nickname: "Bills" }
  }, extra || {});
}

function snap(extraBill, extra) {
  const base = {
    asof: "2026-11-18T12:00:00-05:00",
    _tiersFromGet: true,
    accounts: [{ nickname: "Bills", suffix: "2222", name: "Bills" }],
    current: { month: "2026-11", recent_tx: [], edits_tx: [], history_tx: [], balances: [] },
    history: { months: [], tx: [] },
    budget: {
      month: "2026-11",
      paid_status_month: "2026-11",
      tiers: { required_plan: 40, needs_plan: 40, wants_plan: 0 },
      bills: [bill(extraBill)]
    },
    tier_doc: {
      plans: {},
      categories: [{ id: "cabin", name: "Cabin", tier: "needs", budget: 40 }]
    }
  };
  return Object.assign(base, extra || {});
}

function mark(doc, month, id, status) {
  doc.completions = doc.completions || {};
  doc.completions[month] = doc.completions[month] || {};
  if (status == null) {
    delete doc.completions[month][id];
    return;
  }
  doc.completions[month][id] = {
    status: status,
    at: "2026-11-18T16:00:00.000Z",
    by: "justin"
  };
}

function counted(ctx, base, start, end) {
  return ctx.bankMoveWindowBills(base, {}, { focus: { date: start }, end: end }, "2026-11-18").counted
    .filter(function (row) { return row.name === "Cabin cover"; });
}

test("a paid bill under its budget shows complete with nothing still owed", function () {
  const ctx = boot();
  const base = snap({
    paid_current_month: {
      month: "2026-11",
      status: "paid",
      source: "bank",
      paid_date: "2026-11-12"
    },
    schedule: [
      { date: "2026-11-12", status: "paid", paid_date: "2026-11-12", amount: 12, bill_id: "cabin-cover" }
    ]
  });
  const row = ctx.bankPreparedBills(base, undefined).filter(function (item) { return item.bill_id === "cabin-cover"; })[0];
  const facts = ctx.bankBillPaidFacts(base, row, "2026-11", null);
  assert.equal(facts.complete, true);
  assert.equal(facts.paid, 12);
  assert.equal(facts.due, 40);
  assert.equal(facts.owed, 0);
  assert.equal(ctx.bankBillPaidPhrase(facts), "Paid $12.00");
  const pie = ctx.bankBillPieForFacts(facts);
  assert.match(pie, /data-pct="100"/);
  assert.match(pie, /\u2713/);
  const html = ctx.bankBillGroupsHtml(base, {}, "2026-11");
  assert.match(html, /Paid \$12\.00/);
  assert.equal(/\$12\.00 of \$40\.00 due/.test(html), false);
  assert.match(html, /data-bank-owed="0"/);
});

test("manual complete releases the unspent remainder from moves and category room", function () {
  const ctx = boot();
  const base = snap();
  const open = counted(ctx, base, "2026-11-01", "2026-12-01");
  assert.equal(open.length, 1);
  assert.equal(open[0].amount, 40);
  const before = ctx.bankCategoryDiscretionary(base, "2026-11");
  const yardBefore = before.filter(function (row) { return row.name === "Cabin"; })[0];
  assert.ok(yardBefore);
  assert.equal(yardBefore.amount, 40);

  mark(base.tier_doc, "2026-11", "cabin-cover", "complete");
  const closed = counted(ctx, base, "2026-11-01", "2026-12-01");
  assert.equal(closed.length, 0);
  const after = ctx.bankCategoryDiscretionary(base, "2026-11");
  assert.equal(after.filter(function (row) { return row.name === "Cabin"; }).length, 0);
  const row = ctx.bankPreparedBills(base, undefined).filter(function (item) { return item.bill_id === "cabin-cover"; })[0];
  const facts = ctx.bankBillPaidFacts(base, row, "2026-11", null);
  assert.equal(facts.complete, true);
  assert.equal(facts.owed, 0);
  assert.equal(ctx.bankBillPaidPhrase(facts), "Done");
  const later = counted(ctx, base, "2026-12-01", "2027-01-01");
  assert.equal(later.length, 1);
  assert.equal(later[0].amount, 40);
});

test("skip drops this month's draft from moves and says Skipped", function () {
  const ctx = boot();
  const base = snap();
  mark(base.tier_doc, "2026-11", "cabin-cover", "skipped");
  assert.equal(counted(ctx, base, "2026-11-01", "2026-12-01").length, 0);
  const row = ctx.bankPreparedBills(base, undefined).filter(function (item) { return item.bill_id === "cabin-cover"; })[0];
  const facts = ctx.bankBillPaidFacts(base, row, "2026-11", null);
  assert.equal(facts.skipped, true);
  assert.equal(facts.owed, 0);
  assert.equal(ctx.bankBillPaidPhrase(facts), "Skipped");
  const html = ctx.bankBillGroupsHtml(base, {}, "2026-11");
  assert.match(html, /Skipped/);
  assert.match(html, /data-bank-month-undo="cabin-cover"/);
  assert.match(html, /Done for this month|aria-label="Done for this month"/);
  const later = counted(ctx, base, "2026-12-01", "2027-01-01");
  assert.equal(later.length, 1);
});

test("undo restores the draft that skip had dropped", function () {
  const ctx = boot();
  const base = snap();
  mark(base.tier_doc, "2026-11", "cabin-cover", "skipped");
  assert.equal(counted(ctx, base, "2026-11-01", "2026-12-01").length, 0);
  mark(base.tier_doc, "2026-11", "cabin-cover", null);
  const back = counted(ctx, base, "2026-11-01", "2026-12-01");
  assert.equal(back.length, 1);
  assert.equal(back[0].amount, 40);
  const row = ctx.bankPreparedBills(base, undefined).filter(function (item) { return item.bill_id === "cabin-cover"; })[0];
  const facts = ctx.bankBillPaidFacts(base, row, "2026-11", null);
  assert.equal(facts.skipped, false);
  assert.equal(facts.complete, false);
  assert.equal(facts.owed, 40);
});

test("a charge posted after a skip still shows the spend", function () {
  const ctx = boot();
  const base = snap();
  mark(base.tier_doc, "2026-11", "cabin-cover", "skipped");
  base.current.recent_tx.push({
    date: "2026-11-21",
    amount: 9,
    flow: "out",
    desc: "Cabin cover",
    bill_id: "cabin-cover",
    tx_key: "cabin-cover-nov"
  });
  const row = ctx.bankPreparedBills(base, undefined).filter(function (item) { return item.bill_id === "cabin-cover"; })[0];
  const facts = ctx.bankBillPaidFacts(base, row, "2026-11", null);
  assert.equal(facts.skipped, true);
  assert.equal(facts.paid, 9);
  assert.equal(facts.owed, 0);
  assert.match(ctx.bankBillPaidPhrase(facts), /Skipped/);
  assert.match(ctx.bankBillPaidPhrase(facts), /\$9\.00/);
  const html = ctx.bankBillPaidHtml(facts);
  assert.match(html, /data-bank-skipped-charge="1"/);
  assert.match(html, /\$9\.00/);
  assert.equal(counted(ctx, base, "2026-11-01", "2026-12-01").length, 0);
});

function nextSnap(billExtra, completions) {
  return {
    asof: "2026-11-18T12:00:00-05:00",
    _tiersFromGet: true,
    accounts: [
      { nickname: "Checking", suffix: "1111", name: "Checking" },
      { nickname: "Bills", suffix: "2222", name: "Bills" }
    ],
    current: { month: "2026-11", recent_tx: [], edits_tx: [], history_tx: [], balances: [] },
    history: { months: [], tx: [] },
    budget: {
      month: "2026-11",
      paid_status_month: "2026-11",
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-11-13", amount: 200, account: { nickname: "Checking", last4: "1111" } },
        { name: "Payroll", kind: "payroll", date: "2026-11-30", amount: 200, account: { nickname: "Checking", last4: "1111" } }
      ],
      tiers: { required_plan: 40, needs_plan: 0, wants_plan: 0 },
      bills: [bill(Object.assign({
        usual_account: { suffix: "2222", nickname: "Bills" }
      }, billExtra || {}))]
    },
    tier_doc: { plans: {}, completions: completions || {} }
  };
}

function nextCard(ctx, base) {
  const html = ctx.bankNextPaySection(base, { planMonth: "2026-11", now: "2026-11-18T16:00:00Z" });
  const at = html.indexOf(">Cabin cover</span>");
  assert.notEqual(at, -1);
  return html.slice(html.lastIndexOf("<li", at), html.indexOf("</li>", at) + 5);
}

test("next pay shows the matched payment, not the budget, for a paid bill", function () {
  const ctx = boot();
  const fromSchedule = nextSnap({
    paid_current_month: { month: "2026-11", status: "paid", source: "bank", paid_date: "2026-11-12", amount: 12 },
    schedule: [{ date: "2026-11-20", status: "paid", paid_date: "2026-11-12", amount: 40, bill_id: "cabin-cover" }]
  });
  const card = nextCard(ctx, fromSchedule);
  assert.match(card, /−\$12\.00/);
  assert.equal(/−\$40\.00/.test(card), false);
  assert.match(card, /paid/i);
  const opts = { planMonth: "2026-11", now: "2026-11-18T16:00:00Z" };
  assert.equal(counted(ctx, fromSchedule, "2026-11-13", "2026-11-30").length, 0);
  const math = ctx.bankPeriodMath(fromSchedule, opts, { focus: { date: "2026-11-13", amount: 200 }, end: "2026-11-30" }, 0);
  assert.equal(math.countedBills, 12);

  const fromTx = nextSnap({
    paid_current_month: { month: "2026-11", status: "paid", source: "bank", paid_date: "2026-11-12", tx_key: "cabin-nov" }
  });
  fromTx.current.recent_tx.push({
    date: "2026-11-12",
    amount: 12,
    flow: "out",
    desc: "Cabin cover",
    bill_id: "cabin-cover",
    tx_key: "cabin-nov"
  });
  const txCard = nextCard(ctx, fromTx);
  assert.match(txCard, /−\$12\.00/);
  assert.equal(/−\$40\.00/.test(txCard), false);
});

test("next pay drops a skipped draft from outflows and shows Skipped", function () {
  const ctx = boot();
  const base = nextSnap({}, {
    "2026-11": { "cabin-cover": { status: "skipped", at: "2026-11-18T16:00:00.000Z", by: "justin" } }
  });
  const opts = { planMonth: "2026-11", now: "2026-11-18T16:00:00Z" };
  const html = ctx.bankNextPaySection(base, opts);
  assert.match(html, /Skipped/);
  assert.equal(/−\$40\.00/.test(html), false);
  assert.match(html, /data-bank-month-undo="cabin-cover"/);
  assert.equal(counted(ctx, base, "2026-11-13", "2026-11-30").length, 0);
  const math = ctx.bankPeriodMath(base, opts, { focus: { date: "2026-11-13", amount: 200 }, end: "2026-11-30" }, 0);
  assert.equal(math.countedBills, 0);
});

test("next pay uses the pay-period posted amount for a paid bill", function () {
  const ctx = boot();
  const opts = { planMonth: "2026-11", now: "2026-11-18T16:00:00Z" };
  const base = nextSnap();
  base.budget.pay_periods = [{
    date: "2026-11-13",
    end: "2026-11-30",
    bills: [{
      name: "Cabin cover",
      bill_id: "cabin-cover",
      status: "paid",
      amount: 12,
      budget_amount: 40,
      date: "2026-11-20"
    }]
  }];
  const card = nextCard(ctx, base);
  assert.match(card, /−\$12\.00/);
  assert.equal(/−\$40\.00/.test(card), false);
  assert.match(card, /paid/i);
  const math = ctx.bankPeriodMath(base, opts, { focus: { date: "2026-11-13", amount: 200 }, end: "2026-11-30" }, 0);
  assert.equal(math.countedBills, 12);
  assert.equal(counted(ctx, base, "2026-11-13", "2026-11-30").length, 0);

  const noAmount = nextSnap();
  noAmount.budget.pay_periods = [{
    date: "2026-11-13",
    bills: [{ name: "Cabin cover", bill_id: "cabin-cover", status: "paid", budget_amount: 40, date: "2026-11-20" }]
  }];
  const fallback = nextCard(ctx, noAmount);
  assert.match(fallback, /−\$40\.00/);
});

test("next pay reserves nothing for a manual complete and offers Done and Skip", function () {
  const ctx = boot();
  const open = nextSnap();
  const openCard = nextCard(ctx, open);
  assert.match(openCard, /−\$40\.00/);
  assert.match(openCard, /data-bank-month-done="cabin-cover"/);
  assert.match(openCard, /data-bank-month-skip="cabin-cover"/);
  assert.match(openCard, /aria-label="Done for this month Cabin cover 2026-11-20"/);

  const done = nextSnap({}, {
    "2026-11": { "cabin-cover": { status: "complete", at: "2026-11-18T16:00:00.000Z", by: "justin" } }
  });
  const opts = { planMonth: "2026-11", now: "2026-11-18T16:00:00Z" };
  const card = nextCard(ctx, done);
  assert.equal(/−\$40\.00/.test(card), false);
  assert.match(card, /Done|paid/i);
  assert.equal(counted(ctx, done, "2026-11-13", "2026-11-30").length, 0);
  const math = ctx.bankPeriodMath(done, opts, { focus: { date: "2026-11-13", amount: 200 }, end: "2026-11-30" }, 0);
  assert.equal(math.countedBills, 0);
});

test("edits rows offer Done and Skip for the month on screen", function () {
  const ctx = boot();
  const base = snap();
  const row = ctx.bankPreparedBills(base, undefined).filter(function (item) { return item.bill_id === "cabin-cover"; })[0];
  const controls = ctx.bankBillStatusControls(row, "2026-11", null);
  assert.match(controls, /Done for this month/);
  assert.match(controls, /Skip this month/);
  assert.match(controls, /data-bank-month-done="cabin-cover"/);
  assert.match(controls, /data-bank-month="2026-11"/);
  const subs = ctx.bankEditSubSection(Object.assign({}, base, {
    budget: Object.assign({}, base.budget, {
      subscriptions: [{ name: "Pond feed", sub_id: "pond-feed", amount: 8, typical_day: 6, kind: "subscription" }]
    })
  }), "2026-11", {});
  assert.match(subs, /data-bank-month-skip="pond-feed"/);
  assert.match(subs, /Skip this month/);
});
