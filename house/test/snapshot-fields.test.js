"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const fixturePath = path.join(__dirname, "fixtures", "snapshot-fields.json");

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

function loadSnap() {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

const now = "2026-10-13T15:00:00-04:00";
const opts = { tab: "budget", planMonth: "2026-10", now: now };

function billNamed(ctx, snap, name) {
  return ctx.bankPreparedBills(snap).filter(function (b) { return b.name === name; })[0];
}

function cardFor(html, iso) {
  const next = html.slice(html.indexOf('class="bank-next"'), html.indexOf('data-bank-part="calendar"'));
  const at = next.indexOf('data-bank-next-date="' + iso + '"');
  assert.ok(at > 0, iso);
  const end = next.indexOf('data-bank-next-card="', at + 20);
  return next.slice(next.lastIndexOf('<div class="card"', at), end < 0 ? next.length : end);
}

test("a quarterly bill uses quarterly_amount and next_due on screen, and monthly_amount in the plan", function () {
  const ctx = boot();
  const snap = loadSnap();
  const water = billNamed(ctx, snap, "Water");
  assert.equal(water.cadence, "quarterly");
  assert.equal(water.quarterly_amount, 90);
  assert.equal(water.next_due, "2026-10-20");
  assert.equal(ctx.bankBillLineAmount(water, "2026-10", { bills: { Water: { amount: 12, typical_day: 4 } } }), 90);
  assert.equal(ctx.bankBillShownAmount(water, "2026-10", { bills: { Water: { amount: 12 } } }), 90);
  assert.equal(ctx.bankBillMonthPlan(water, "2026-10"), 30);
  assert.equal(ctx.bankUserBillAmount({ bills: { Water: { amount: 12 } } }, water), null);
  const marks = ctx.bankBillDueMarks(water, { year: 2026, month: 10 });
  assert.equal(JSON.stringify(marks.map(function (m) { return m.day; })), "[20]");
  assert.equal(JSON.stringify(ctx.bankBillDueMarks(water, { year: 2026, month: 9 })), "[]");
  assert.equal(ctx.bankQuarterlyPastGrace(water, "2026-10-13"), false);

  const html = ctx.bankPageHtml(snap, Object.assign({}, opts, {
    edits: { bills: { Water: { amount: 12, typical_day: 4 } }, income: {}, moves: {} }
  }));
  assert.match(html, /title="Water \$90\.00"/);
  assert.doesNotMatch(html, /title="Water \$30\.00"|title="Water \$12\.00"/);
  assert.match(html, /<b>20<\/b>[\s\S]{0,500}Water \$90\.00/);
  assert.doesNotMatch(html, /<b>4<\/b>[\s\S]{0,200}Water/);
  const edits = ctx.bankPageHtml(snap, Object.assign({}, opts, { tab: "edits", edits: { bills: { Water: { amount: 12, typical_day: 4 } } } }));
  const waterEdit = edits.slice(edits.indexOf(">Water<"));
  assert.match(waterEdit.slice(0, 800), /\$90\.00/);
  assert.match(waterEdit.slice(0, 800), /Tue Oct 20/);
  assert.doesNotMatch(waterEdit.slice(0, 500), /\$12\.00|\$30\.00/);
  const card = cardFor(html, "2026-10-15");
  assert.match(card, /Water/);
  assert.match(card, /\$90\.00/);
  assert.doesNotMatch(card, /Water[\s\S]{0,80}\$30\.00|Water[\s\S]{0,80}\$12\.00/);
  const pies = ctx.bankKindPies(snap, { year: 2026, month: 10 }, null);
  const slice = pies.bills.filter(function (row) { return row.name === "Water"; })[0];
  assert.ok(slice);
  assert.equal(slice.amount, 30);
});

test("a quarterly bill is overdue only after next_due plus grace days", function () {
  const ctx = boot();
  const snap = loadSnap();
  const sewer = billNamed(ctx, snap, "Sewer");
  const trash = billNamed(ctx, snap, "Trash");
  assert.equal(ctx.bankQuarterlyPastGrace(sewer, "2026-10-13"), true);
  assert.equal(ctx.bankGraceDays(trash), 5);
  assert.equal(ctx.bankQuarterlyPastGrace(trash, "2026-10-13"), false);
  assert.equal(ctx.bankQuarterlyPastGrace(trash, "2026-10-14"), true);
  const bare = {
    cadence: "quarterly",
    quarterly_amount: 15,
    next_due: "2026-10-01",
    monthly_amount: 5,
    name: "Lot fee"
  };
  assert.equal(ctx.bankGraceDays(bare), 5);
  assert.equal(ctx.bankQuarterlyPastGrace(bare, "2026-10-06"), false);
  assert.equal(ctx.bankQuarterlyPastGrace(bare, "2026-10-07"), true);

  const html = ctx.bankPageHtml(snap, opts);
  const groups = html.slice(html.indexOf('data-bank-bill-groups="1"'), html.indexOf('data-bank-bill-groups="1"') + 12000);
  assert.match(groups, /data-bank-overdue="1"[\s\S]{0,200}Sewer|Sewer[\s\S]{0,240}data-bank-overdue="1"/);
  assert.match(groups, />Overdue</);
  assert.doesNotMatch(groups, /Water[\s\S]{0,300}Overdue/);
  const edits = ctx.bankPageHtml(snap, Object.assign({}, opts, { tab: "edits" }));
  assert.match(edits, /Sewer[\s\S]{0,400}Overdue/);
  assert.doesNotMatch(edits, /Trash[\s\S]{0,350}Overdue/);
  const sep = ctx.bankPageHtml(snap, Object.assign({}, opts, { planMonth: "2026-09" }));
  assert.match(sep, /overdue/);
  assert.match(sep, /Sewer \$60\.00/);
});

test("a confirmed cover marks the bill paid for that month and drops it from remaining and moves", function () {
  const ctx = boot();
  const snap = loadSnap();
  const rent = billNamed(ctx, snap, "Rent");
  assert.equal(ctx.bankBillPaidStatus(rent, "2026-10"), "paid");
  assert.equal(ctx.bankBillPaidCaption(rent, "2026-10"), "Covered · handled offline");
  assert.equal(ctx.bankBillPaidStatus(rent, "2026-11"), "");
  const html = ctx.bankPageHtml(snap, opts);
  assert.match(html, /Covered · handled offline/);
  const card = cardFor(html, "2026-10-15");
  assert.match(card, /covered · handled offline/);
  const plan = ctx.bankNextPayMovePlan(snap, opts).filter(function (row) { return row.date === "2026-10-15"; })[0];
  assert.ok(plan);
  assert.equal(plan.moves.some(function (mv) { return /rent/i.test(mv.reason || ""); }), false);
  const rows = ctx.bankPeriodBillRows(snap, opts, "2026-10-15", "2026-10-30");
  const rentRow = rows.filter(function (row) { return row.name === "Rent"; })[0];
  assert.ok(rentRow);
  assert.equal(rentRow.paid, true);

  const open = loadSnap();
  open.budget.confirmed_covers = [];
  const openPlan = ctx.bankNextPayMovePlan(open, opts).filter(function (row) { return row.date === "2026-10-15"; })[0];
  assert.ok(openPlan.moves.some(function (mv) { return /rent/i.test(mv.reason || ""); }));
  const coveredFlows = {};
  ctx.bankCashLedgerHtml(snap, "2026-10", null, [], ctx.bankPreparedBills(snap), { now: now, flows: coveredFlows, mode: "plan" });
  const openFlows = {};
  ctx.bankCashLedgerHtml(open, "2026-10", null, [], ctx.bankPreparedBills(open), { now: now, flows: openFlows, mode: "plan" });
  assert.ok(coveredFlows.remainOut < openFlows.remainOut);

  snap.budget.pay_periods = [{
    date: "2026-10-15",
    moves: [{ from: "Checking ··1111", to: "Spending ··2222", amount: 40, move_by: "2026-10-16", reason: "Rent" }]
  }];
  const printed = ctx.bankNextPayMovePlan(snap, opts).filter(function (row) { return row.date === "2026-10-15"; })[0];
  assert.equal(printed.moves.length, 0);
});

test("one-time bills are flexible rows, never late, and land on Next Pay on the suggested date", function () {
  const ctx = boot();
  const snap = loadSnap();
  const html = ctx.bankPageHtml(snap, opts);
  const flex = html.slice(html.indexOf('data-bank-one-time="1"'));
  assert.match(html, /data-bank-flexible="1"/);
  assert.match(html, /data-bank-late="0"/);
  assert.match(flex, /Parking pass/);
  assert.match(flex, /Suggested Sun Oct 18/);
  assert.match(flex, /Spending ··2222/);
  assert.match(flex, /\$18\.00/);
  assert.match(html, /Dump sticker/);
  assert.match(html, /Suggested Thu Oct 1/);
  assert.doesNotMatch(html.slice(html.indexOf("Dump sticker"), html.indexOf("Dump sticker") + 400), /Overdue|overdue|late/);
  const card = cardFor(html, "2026-10-15");
  assert.match(card, /Parking pass/);
  assert.match(card, /suggested Sun Oct 18/);
  assert.match(card, /Spending ··2222/);
  assert.match(card, /\$18\.00/);
  assert.doesNotMatch(card, /Dump sticker|overdue/);
  const rows = ctx.bankPeriodBillRows(snap, opts, "2026-10-15", "2026-10-30");
  const pass = rows.filter(function (row) { return row.name === "Parking pass"; })[0];
  assert.ok(pass);
  assert.equal(pass.due, "2026-10-18");
  assert.equal(pass.amount, 18);
  assert.equal(pass.flexible, true);
  assert.equal(pass.paid, false);
});

test("a hand mark with no debit stays in Next Pay until grace, and a computed transfer is due on the deposit date", function () {
  const ctx = boot();
  const snap = loadSnap();
  snap.budget.confirmed_covers = [];
  snap.budget.one_time_bills = [];
  snap.budget.bills = [{
    name: "Phone",
    bill_id: "phone",
    amount: 25,
    typical_day: 16,
    cadence: "monthly",
    tier: "required",
    grace_days: 5,
    usual_account: { nickname: "Spending", last4: "2222" },
    paid_current_month: { month: "2026-10", status: "paid", source: "manual", paid_date: "2026-10-12" }
  }];
  snap.budget.awaiting_debit = [{
    name: "Phone",
    bill_id: "phone",
    month: "2026-10",
    amount: 25,
    due: "2026-10-16"
  }];
  snap.budget.paid_status_month = "2026-10";
  snap.current.recent_tx = [];
  const early = Object.assign({}, opts, { now: "2026-10-13T15:00:00-04:00" });
  const plan = ctx.bankNextPayMovePlan(snap, early).filter(function (row) { return row.date === "2026-10-15"; })[0];
  const phone = plan.bills.filter(function (row) { return row.name === "Phone"; })[0];
  assert.ok(phone);
  assert.equal(phone.awaitingBank, true);
  assert.equal(phone.phrase, "Marked paid, awaiting bank");
  assert.ok(plan.moves.some(function (mv) { return /phone/i.test(mv.reason || "") && mv.move_by === "2026-10-15"; }));
  const html = ctx.bankPageHtml(snap, early);
  const card = cardFor(html, "2026-10-15");
  assert.match(card, /Marked paid, awaiting bank/);
  assert.match(card, /by Thu Oct 15, for Phone/);
  assert.match(html, /data-bank-awaiting="1"/);

  const inside = Object.assign({}, opts, { now: "2026-10-21T15:00:00-04:00" });
  const still = ctx.bankNextPayMovePlan(snap, inside).filter(function (row) { return row.date === "2026-10-15"; })[0];
  assert.ok(still.moves.some(function (mv) { return /phone/i.test(mv.reason || ""); }));

  const after = Object.assign({}, opts, { now: "2026-10-22T15:00:00-04:00" });
  const dropped = ctx.bankNextPayMovePlan(snap, after).filter(function (row) { return row.date === "2026-10-15"; })[0];
  assert.equal(dropped.moves.some(function (mv) { return /phone/i.test(mv.reason || ""); }), false);
  const lateRow = dropped.bills.filter(function (row) { return row.name === "Phone"; })[0];
  assert.ok(lateRow);
  assert.equal(lateRow.awaitingBank, false);

  snap.current.recent_tx = [{
    date: "2026-10-12",
    amount: -25,
    flow: "outflow",
    desc: "Phone",
    category: "Phone",
    tx_key: "phone-1"
  }];
  const matched = ctx.bankNextPayMovePlan(snap, early).filter(function (row) { return row.date === "2026-10-15"; })[0];
  const matchedRow = matched.bills.filter(function (row) { return row.name === "Phone"; })[0];
  assert.ok(matchedRow);
  assert.equal(matchedRow.awaitingBank, false);
  assert.equal(matched.moves.some(function (mv) { return /phone/i.test(mv.reason || ""); }), false);
});

test("month-end sweep is advice on the balance card and the last Next Pay card", function () {
  const ctx = boot();
  const snap = loadSnap();
  snap.budget.month_end_sweep = {
    month: "2026-10",
    status: "projected",
    accounts: {
      "1111": {
        balance: 80,
        held_back: 12,
        floor: 50,
        amount: 18,
        reserved: [
          { date: "2026-10-18", name: "Phone", amount: 8 },
          { date: "2026-10-20", name: "Water", amount: 4 }
        ],
        reserved_through: "2026-10-29",
        next_deposit: "2026-11-14"
      },
      "2222": {
        balance: 30,
        held_back: 6,
        floor: 5,
        amount: 22,
        reserved: [],
        reserved_through: "2026-10-29",
        next_deposit: "2026-11-14"
      }
    },
    total: 40,
    to: { last4: "3333", nickname: "savings" },
    move_by: "2026-10-30",
    advice_only: true,
    computed_at: "2026-10-13T12:00:00-04:00",
    basis: "pay cycle"
  };
  const html = ctx.bankPageHtml(snap, opts);
  const hero = html.slice(html.indexOf('data-bank-hero="1"'), html.indexOf('class="bank-next"'));
  assert.match(hero, /data-bank-sweep="1"/);
  assert.match(hero, /Sweep \$40\.00 to 3333 savings by Fri Oct 30/);
  assert.match(hero, /data-bank-sweep-status="projected"/);
  assert.match(hero, /Advice only/);
  assert.match(hero, /data-bank-sweep-acct="1111"/);
  assert.match(hero, /\$18\.00/);
  assert.match(hero, /Held back \$12\.00 through Oct 29/);
  assert.match(hero, /Phone/);
  assert.match(hero, /\$8\.00/);
  assert.match(hero, /data-bank-sweep-acct="2222"/);
  assert.match(hero, /\$22\.00/);
  assert.match(hero, /pay cycle/);
  const early = cardFor(html, "2026-10-15");
  const last = cardFor(html, "2026-10-30");
  assert.doesNotMatch(early, /data-bank-sweep="1"/);
  assert.match(last, /data-bank-sweep="1"/);
  assert.match(last, /Sweep \$40\.00 to 3333 savings by Fri Oct 30/);
  assert.doesNotMatch(last, /Move \$40/);
  snap.budget.month_end_sweep.status = "final";
  const finalHtml = ctx.bankPageHtml(snap, opts);
  assert.match(finalHtml, /data-bank-sweep-status="final"/);
  assert.match(finalHtml, />Final</);
});

test("budget_month is the tier and category spent window, and a missing window stays on the calendar month", function () {
  const ctx = boot();
  function spendSnap(windowed) {
    const snap = loadSnap();
    snap.current.month = "2026-10";
    snap.current.recent_tx = [
      { date: "2026-10-14", amount: -5, flow: "outflow", category: "Groceries", desc: "Market", tx_key: "g-early", tier: "needs" },
      { date: "2026-10-20", amount: -6, flow: "outflow", category: "Groceries", desc: "Market", tx_key: "g-mid", tier: "needs" },
      { date: "2026-11-13", amount: -7, flow: "outflow", category: "Groceries", desc: "Market", tx_key: "g-late", tier: "needs" },
      { date: "2026-11-14", amount: -8, flow: "outflow", category: "Groceries", desc: "Market", tx_key: "g-next", tier: "needs" }
    ];
    snap.budget.mtd_actual_by_category = { Groceries: 99 };
    snap.budget.tiers_mtd = { month: "2026-10", needs_spent: 99, by_category: { groceries: 99 } };
    snap.tier_doc = {
      rules: {},
      plans: {},
      categories: [{ id: "groceries", name: "Groceries", tier: "needs", budget: 40 }]
    };
    if (windowed) {
      snap.budget.budget_month = { start: "2026-10-15", end: "2026-11-13" };
    }
    return snap;
  }
  const open = spendSnap(true);
  const figs = ctx.bankCategoryFigures(open, "2026-10");
  assert.equal(figs.groceries.spent, 13);
  const tierSpent = ctx.bankTierLineSpent(open, { name: "Groceries", key: "Groceries", amount: 40 }, "2026-10", "plan", null, "2026-10-13");
  assert.equal(tierSpent, 13);
  const tiers = ctx.bankTierSpend(open, "2026-10");
  assert.equal(tiers.needs, 13);
  const calendar = spendSnap(false);
  assert.equal(ctx.bankTierLineSpent(calendar, { name: "Groceries", key: "Groceries", amount: 40 }, "2026-10", "plan", null, "2026-10-13"), 99);
  assert.equal(ctx.bankTierSpend(calendar, "2026-10").needs, 99);
  delete calendar.budget.mtd_actual_by_category;
  delete calendar.budget.tiers_mtd;
  const scanned = ctx.bankCategoryFigures(calendar, "2026-10");
  assert.equal(scanned.groceries.spent, 11);
});

test("stale local amounts do not override a quarterly snapshot and utility amounts are cleared", function () {
  const ctx = boot();
  const snap = loadSnap();
  ctx.bag.murphyHouseBanking = JSON.stringify({
    bills: {
      Water: { amount: 12, typical_day: 4 },
      Sewer: { amount: 8, typical_day: 9 },
      Trash: { amount: 3 },
      Garbage: { amount: 2 },
      Rent: { amount: 99, typical_day: 2 }
    },
    income: {},
    moves: { keep: 1 }
  });
  const read = ctx.bankReadStore();
  assert.equal(read.bills.Water.amount, undefined);
  assert.equal(read.bills.Water.typical_day, 4);
  assert.equal(read.bills.Sewer.amount, undefined);
  assert.equal(read.bills.Sewer.typical_day, 9);
  assert.equal(read.bills.Trash, undefined);
  assert.equal(read.bills.Garbage, undefined);
  assert.equal(read.bills.Rent.amount, 99);
  assert.equal(read.moves.keep, 1);
  ctx.bankPageHtml(snap, opts);
  const stored = JSON.parse(ctx.bag.murphyHouseBanking);
  assert.equal(stored.bills.Water, undefined);
  assert.equal(stored.bills.Sewer, undefined);
  assert.equal(stored.bills.Trash, undefined);
  assert.equal(stored.bills.Rent.amount, 99);
  assert.equal(stored.bills.Rent.typical_day, 2);
  assert.equal(stored.moves.keep, 1);
  const html = ctx.bankPageHtml(snap, Object.assign({}, opts, { edits: ctx.bankReadStore() }));
  assert.match(html, /Water \$90\.00/);
  assert.match(html, /<b>20<\/b>[\s\S]{0,500}Water \$90\.00/);
  assert.doesNotMatch(html, /Water \$12\.00/);
});
