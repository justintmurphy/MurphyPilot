"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const root = path.join(__dirname, "..", "..");
const vm = require("vm");

function bootBank() {
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

const NOW = "2026-10-19T10:00:00-04:00";

function optsFor(extra) {
  return Object.assign({ now: NOW, planMonth: "2026-10", month: "2026-10", tab: "budget" }, extra || {});
}

function loadSnap(ctx) {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/budget-consistency.json"), "utf8"));
  const doc = raw._tier_doc_for_test;
  delete raw._tier_doc_for_test;
  ctx.bankSpendApply(raw, doc);
  return raw;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function attr(html, name) {
  const found = [];
  const re = new RegExp(name + '="([^"]*)"', "g");
  let m;
  while ((m = re.exec(html))) found.push(m[1]);
  return found;
}

test("pay deposits collapse to one event per paycheck and stay inside the window", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  const card = ctx.bankBudgetCard(snap, opts);
  assert.equal(card.pay, 2800);
  const pays = (card.deposits || []).filter(function (row) { return row.payKind; });
  assert.equal(pays.length, 4);
  const keys = {};
  pays.forEach(function (row) {
    const id = row.payKind + "|" + row.date;
    assert.equal(keys[id], undefined);
    keys[id] = true;
  });
  assert.equal(pays.some(function (row) { return row.date === "2026-10-30"; }), false);
  const income = ctx.bankIncomeRowsFor(snap, "2026-10", opts) || [];
  assert.equal(income.some(function (row) { return /10\/30|Oct 30|2026-10-30/.test(String(row.meta || "") + String(row.date || "")); }), false);
  const early = clone(snap);
  early.budget.pay_schedule[0].date = "2026-09-29";
  early.budget.pay_schedule[0].nominal_date = "2026-09-30";
  const earlyCard = ctx.bankBudgetCard(early, opts);
  const earlyPays = (earlyCard.deposits || []).filter(function (row) { return row.payKind === "payroll" && row.amount === 1000 && row.date === "2026-09-30"; });
  assert.equal(earlyPays.length, 1);
  assert.equal(earlyCard.pay, 2800);
});

test("extra income skips pay, moves, and a repeated rebate", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  assert.equal(ctx.bankFitExtraIncome(snap, "2026-10", opts), 25);
  const card = ctx.bankBudgetCard(snap, opts);
  assert.equal(card.surplus, 25);
  const blob = (card.surplusRows || []).map(function (row) { return String(row.name || "") + " " + String(row.label || ""); }).join(" | ").toLowerCase();
  assert.equal(/move|stipend/.test(blob), false);
});

test("a paid slot marks that due date and leaves the later slot unpaid", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  const due = ctx.bankRenderDueList(snap, opts, "plan", "2026-10", false);
  assert.match(due, /data-bank-row-date="2026-10-15"[^>]*data-bank-row-paid="1"/);
  assert.match(due, /due 10\/15[\s\S]{0,40}paid Oct 17/);
  assert.match(due, /\$52\.00/);
  const unpaid = due.split("data-bank-row-date=\"2026-10-29\"")[1] || "";
  assert.equal(unpaid.slice(0, 80).indexOf('data-bank-row-paid="1"'), -1);
  assert.equal(/data-bank-row-date="2026-10-3/.test(due), false);
  const next = ctx.bankNextPaySection(snap, opts);
  assert.match(next, /due 10\/15 · paid/);
  assert.match(next, /\$52\.00/);
  const tiers = ctx.bankTierSummaryHtml(snap, opts, "plan", "2026-10");
  assert.match(tiers, /10\/15 paid · 10\/29 unpaid/);
  const panels = ctx.bankBudgetPanelsHtml(snap, opts);
  assert.match(panels, /Due this window /);
  assert.match(panels, /data-state="paid"/);
  assert.match(panels, /\$52\.00/);
  const glance = ctx.bankBudgetGlance(snap, opts);
  assert.equal(glance.remainingBills, 50);
  const win = ctx.bankBudgetWindowFor(snap, "2026-10");
  const oblig = ctx.bankWindowObligations(snap, opts, win, true);
  const phone = (oblig.remaining || []).filter(function (item) { return item.name === "Phone"; });
  assert.equal(phone.length, 1);
  assert.equal(String(phone[0].date), "2026-10-29");
  assert.equal(phone[0].amount, 50);
});

test("partial status keeps slot paid and unpaid dates", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const phone = snap.budget.bills.filter(function (row) { return row.bill_id === "phone"; })[0];
  phone.paid_current_month.status = "partial";
  phone.paid_current_month.paid_count = 1;
  phone.paid_current_month.expected = 2;
  phone.paid_current_month.paid_days = [15];
  const prepared = ctx.bankPreparedBills(snap, undefined).filter(function (row) { return row.bill_id === "phone"; })[0];
  const part = ctx.bankBillPartial(prepared, "2026-10");
  assert.equal(part && part.paid, 1);
  assert.equal(part && part.of, 2);
  assert.equal(ctx.bankBillOccurrencePaid(prepared, "2026-10-15"), "paid");
  assert.equal(ctx.bankBillOccurrencePaid(prepared, "2026-10-29"), "");
  const card = ctx.bankBudgetCard(snap, optsFor());
  const rows = (card.bills || []).filter(function (row) { return row.name === "Phone"; });
  const on15 = rows.filter(function (row) { return row.date === "2026-10-15"; })[0];
  const on29 = rows.filter(function (row) { return row.date === "2026-10-29"; })[0];
  assert.equal(on15 && on15.state, "paid");
  assert.equal(on29 && on29.state, "unpaid");
  const bare = clone(prepared);
  delete bare.schedule;
  bare.paid_current_month = { month: "2026-10", status: "due" };
  assert.equal(ctx.bankBillOccurrencePaid(bare, "2026-10-15"), "");
});

test("past-month next pay reads schedule for bills and subs", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const phone = snap.budget.bills.filter(function (row) { return row.bill_id === "phone"; })[0];
  phone.schedule = [
    { date: "2026-09-29", status: "paid", paid_date: "2026-09-28", tx_key: "h:phone0929", amount: 48, source: "alert_email", bill_id: "other" },
    { date: "2026-09-29", status: "paid", paid_date: "2026-09-29", tx_key: "h:phone0929", amount: 48, source: "alert_email", bill_id: "phone" }
  ];
  const sub = snap.budget.subscriptions.filter(function (row) { return row.sub_id === "toolco"; })[0];
  sub.typical_day = 29;
  sub.schedule = [
    { date: "2026-09-29", status: "paid_late", paid_date: "2026-09-30", tx_key: "h:tool0929", amount: 11, source: "bank", sub_id: "toolco" }
  ];
  const rows = ctx.bankPeriodBillRows(snap, optsFor(), "2026-09-29", "2026-10-13");
  const bill = rows.filter(function (row) { return row.name === "Phone" && row.due === "2026-09-29"; })[0];
  const tool = rows.filter(function (row) { return row.name === "Toolco" && row.due === "2026-09-29"; })[0];
  assert.equal(bill && bill.paid, true);
  assert.equal(bill && bill.amount, 48);
  assert.match(bill.phrase, /due 9\/29 · paid/);
  assert.equal(tool && tool.paid, true);
  assert.equal(tool && tool.amount, 11);
  assert.match(tool.phrase, /paid late/);
  const prepared = ctx.bankPreparedBills(snap, undefined).filter(function (row) { return row.bill_id === "phone"; })[0];
  const hit = ctx.bankFindPaidOut(snap, prepared, "2026-10", 52);
  assert.equal(hit && hit.bill_id, "phone");
});

test("october bars and overage share one actual", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  const model = ctx.bankStackActualModel(snap, "2026-10", opts);
  const over = ctx.bankFitOverage(snap, "2026-10", null);
  const spare = ctx.bankMonthSpare(snap, opts);
  let above = 0;
  (model.legend || []).forEach(function (row) {
    if (!row || row.kind === "spare" || row.kind === "over") return;
    const hit = (over.rows || []).filter(function (item) { return item.id === row.id; })[0];
    const rowOver = row.overAmt || 0;
    const rowLeft = row.remain || 0;
    if (hit) {
      assert.equal(rowOver, hit.over);
      assert.equal(rowLeft, 0);
    } else {
      assert.equal(rowOver, 0);
    }
    above += rowOver;
  });
  assert.equal(ctx.bankRoundCents(above), spare.overage);
  assert.equal(over.total, spare.overage);
  const soft = (model.legend || []).filter(function (row) { return row.id === "software-ai"; })[0];
  assert.equal(soft.spent, 40);
  assert.equal(soft.overAmt, 20);
  const html = ctx.bankStackBarHtml("spend", "actual", "2026-10", "October so far", "", model, "");
  assert.match(html, /data-bank-leg="software-ai"[^>]*data-spent="40"[^>]*data-above="20"/);
});

test("a saved category budget is not reduced by a cancelled bill", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const figs = ctx.bankCategoryFigures(snap, "2026-10");
  assert.equal(figs["software-ai"].plan, 20);
  assert.equal(figs["household-health"].plan, 50);
  assert.equal(figs["personal-health"].plan, 40);
  assert.equal(figs["phone-internet"].plan, 100);
  const parts = ctx.bankBudgetParts(snap, "2026-10", null);
  const fit = ctx.bankBudgetFit(snap, "2026-10", optsFor());
  assert.equal(parts.total, fit.budgeted);
  assert.equal(parts.total, 270);
  const groups = ctx.bankDatedPlanGroupsHtml(snap, optsFor(), "2026-10");
  ["phone-internet", "utilities"].forEach(function (id) {
    const block = groups.split('data-bank-bill-group="' + id + '"')[1] || "";
    const budget = Number((block.match(/data-bank-group-budget="([^"]*)"/) || [])[1]);
    assert.equal(budget, figs[id].plan);
  });
});

test("a retired one-time bill is spend, not a planned row", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  const tiers = ctx.bankTierSummaryHtml(snap, opts, "plan", "2026-10");
  assert.equal(tiers.indexOf("Lawn service"), -1);
  const fit = ctx.bankBudgetFit(snap, "2026-10", opts);
  const line = ctx.bankIncomeBudgetLineHtml(snap, "2026-10");
  const lineBudget = Number((line.match(/data-budget="([^"]*)"/) || [])[1]);
  assert.equal(fit.budgeted, 270);
  assert.equal(lineBudget, 370);
  const scan = ctx.bankSpendScan(snap, "2026-10", ctx.bankSpendCategories(snap, "2026-10"));
  assert.equal(scan.totals["household-health"], 60);
});

test("labels name bill budgets, the window, and spare lines that add up", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  const fitHtml = ctx.bankBudgetFitHtml(snap, opts, "2026-10");
  assert.match(fitHtml, /Bill budgets/);
  assert.match(fitHtml, /data-bank-fit-line="bills"/);
  const panels = ctx.bankBudgetPanelsHtml(snap, opts);
  assert.match(panels, /Due this window /);
  const glance = ctx.bankBudgetGlance(snap, opts);
  const more = ctx.bankGlanceMoreHtml(glance);
  const typical = Number((more.match(/data-bank-free-typical="([^"]*)"/) || [])[1]);
  const over = Number((more.match(/data-bank-free-over="([^"]*)"/) || [])[1]);
  const extra = Number((more.match(/data-bank-free-extra="([^"]*)"/) || [])[1]);
  const free = Number((more.match(/data-bank-free="([^"]*)"/) || [])[1]);
  assert.equal(ctx.bankRoundCents(typical + over + extra), free);
  assert.match(more, /data-bank-free-available="/);
  assert.equal(ctx.bankDueExpectedPhrase("2026-10-15", "2026-10-17"), "due 10/15 · expected 10/17");
  assert.equal(ctx.bankDueExpectedPhrase("2026-10-15", "2026-10-15"), "");
});

test("due this month stops at the budget window end", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const due = ctx.bankRenderDueList(snap, optsFor(), "plan", "2026-10", false);
  const dates = attr(due, "data-bank-row-date").filter(function (day) { return /^\d{4}-\d{2}-\d{2}/.test(day); });
  dates.forEach(function (day) {
    assert.ok(day <= "2026-10-29", day);
  });
});

test("an unfunded sewer reserve uses the full bill once", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const base = ctx.bankFitReserveNote(snap, "2026-11");
  assert.equal(base, "Sewer full bill $120.00 due 11/10, reserve not funded yet (+$60.00 this month)");
  const sewer = snap.budget.bills.filter(function (row) { return row.bill_id === "sewer"; })[0];
  sewer.full_amount = 120;
  sewer.reserve_funded = false;
  sewer.reserve_id = "wsw";
  snap.budget.bills_monthly = [{
    bill_id: "sewer-monthly",
    name: "Sewer",
    amount: 30,
    monthly_amount: 30,
    kind: "set_aside",
    reserve_id: "wsw",
    reserve_funded: false,
    full_amount: 120,
    next_due: "2026-11-10"
  }];
  const noted = ctx.bankFitReserveNote(snap, "2026-11");
  assert.equal(noted, "Sewer full bill $120.00 due 11/10, reserve not funded yet (+$60.00 this month)");
  assert.equal(noted.indexOf("+$30.00"), -1);
});

test("a category_tx assignment wins over a transfer feed and an atm merchant rule", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const row = snap.current.edits_tx.filter(function (tx) { return tx.tx_key === "h:atm1016"; })[0];
  row.category_basis = "category_tx";
  row.feed_category = "Transfer";
  row.spend_override = { flow: "transfer" };
  row.merchant_key = "atm withdrawal";
  ctx.bankSpendApply(snap, { category_rules: { "atm withdrawal": "cash" } });
  const mapped = ctx.bankMapSpendCategory(row, snap);
  assert.equal(mapped && mapped.id, "personal-health");
  const scan = ctx.bankSpendScan(snap, "2026-10", ctx.bankSpendCategories(snap, "2026-10"));
  assert.equal(scan.totals["personal-health"], 30);
  assert.equal(scan.totals.cash || 0, 0);
});
