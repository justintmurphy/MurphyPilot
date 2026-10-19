"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
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

function flat(html) {
  return String(html || "").replace(/<span class="sep">\s*·\s*<\/span>/g, " · ");
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
  assert.match(flat(due), /Phone paid \$52\.00 · \$50\.00 due 10\/29/);
  assert.match(due, /\$52\.00/);
  const unpaid = due.split("data-bank-row-date=\"2026-10-29\"")[1] || "";
  assert.equal(unpaid.slice(0, 80).indexOf('data-bank-row-paid="1"'), -1);
  assert.equal(/data-bank-row-date="2026-10-3/.test(due), false);
  const next = ctx.bankNextPaySection(snap, opts);
  assert.match(flat(next), /Phone paid \$52\.00 · \$50\.00 due 10\/29/);
  assert.match(next, /\$52\.00/);
  const tiers = ctx.bankTierSummaryHtml(snap, opts, "plan", "2026-10");
  assert.match(flat(tiers), /Phone paid \$52\.00 · \$50\.00 due 10\/29/);
  const panels = ctx.bankBudgetPanelsHtml(snap, opts);
  assert.match(panels, /Due this window /);
  assert.match(panels, /data-state="paid"/);
  assert.match(flat(panels), /Phone paid \$52\.00 · \$50\.00 due 10\/29/);
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
  assert.match(bill.phrase, /paid \$48\.00/);
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
  assert.equal(lineBudget, 270);
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

function payHash(text) {
  return "h:" + crypto.createHash("sha256").update(String(text)).digest("hex").slice(0, 32);
}

test("the October 30 payroll card and its move stay on next pay", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  const periods = ctx.bankPayPeriods(snap, opts) || [];
  assert.equal(periods.some(function (period) { return period && period.focus && period.focus.date === "2026-10-30"; }), true);
  snap.budget.pay_periods.push({
    start: "2026-10-30",
    end: "2026-11-13",
    deposit: { name: "Payroll", kind: "payroll", amount: 1000, account: "2222", date: "2026-10-30" },
    moves: [{
      date: "2026-10-30",
      move_by: "2026-10-30",
      name: "Planned move",
      amount: 15,
      from: "1111",
      to: "2222"
    }]
  });
  const next = ctx.bankNextPaySection(snap, opts);
  const card = next.split('data-bank-next-date="2026-10-30"')[1] || "";
  assert.notEqual(card, "");
  const body = card.split('data-bank-next-date="')[0];
  assert.match(body, /Move \$15 from/);
  const earlier = next.split('data-bank-next-date="2026-10-30"')[0];
  assert.equal(earlier.indexOf("Move $15 from"), -1);
});

test("a hashed stipend key is pay, not extra income", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  const rawKey = "2026-10-08|acct-1111|400|Deposit Agency Edi Paymts";
  const hashed = payHash(rawKey);
  assert.equal(ctx.bankTxHashedKey(rawKey), hashed);
  const stip = snap.budget.pay_schedule.filter(function (row) { return row.kind === "stipend" && row.received_tx_key; })[0];
  const tx = snap.current.edits_tx.filter(function (row) { return row.desc === "Deposit Agency Edi Paymts"; })[0];
  stip.received_tx_key = hashed;
  tx.tx_key = rawKey;
  assert.equal(ctx.bankFitExtraIncome(snap, "2026-10", opts), 25);
  const card = ctx.bankBudgetCard(snap, opts);
  assert.equal(card.pay, 2800);
  assert.equal(card.surplus, 25);
  const blob = (card.surplusRows || []).map(function (row) { return String(row.name || ""); }).join(" | ");
  assert.equal(/Agency Edi|400/.test(blob), false);
  stip.received_tx_key = payHash("different-stipend-key");
  assert.equal(ctx.bankFitExtraIncome(snap, "2026-10", opts), 25);
  assert.equal(ctx.bankBudgetCard(snap, opts).pay, 2800);
});

test("phone slots stay split when a month tick or a future schedule day is present", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  const phone = snap.budget.bills.filter(function (row) { return row.bill_id === "phone"; })[0];
  const rawKey = phone.paid_current_month.tx_key;
  const hashed = payHash(rawKey);
  phone.paid_current_month.tx_key = hashed;
  phone.paid_current_month.slots[0].tx_key = hashed;
  phone.schedule = [{ date: "2026-10-15", status: "paid", paid_date: "2026-10-17", amount: 52, tx_key: hashed, bill_id: "phone" }];
  const prepared = ctx.bankPreparedBills(snap, undefined).filter(function (row) { return row.bill_id === "phone"; })[0];
  const marks = ctx.bankBillDueMarks(prepared, { year: 2026, month: 10 }).map(function (mark) { return mark.day; });
  assert.equal(marks.indexOf(15) >= 0, true);
  assert.equal(marks.indexOf(29) >= 0, true);
  const phrase = /Phone paid \$52\.00 · \$50\.00 due 10\/29/;
  assert.match(flat(ctx.bankRenderDueList(snap, opts, "plan", "2026-10", false)), phrase);
  assert.match(flat(ctx.bankNextPaySection(snap, opts)), phrase);
  assert.match(flat(ctx.bankTierSummaryHtml(snap, opts, "plan", "2026-10")), phrase);
  assert.match(flat(ctx.bankBudgetPanelsHtml(snap, opts)), phrase);
  assert.equal(ctx.bankBudgetGlance(snap, opts).remainingBills, 50);
  const late = ctx.bankPeriodBillRows(snap, opts, "2026-10-01", "2026-10-17");
  const earlyPhone = late.filter(function (row) { return row.name === "Phone" && row.due === "2026-10-15"; })[0];
  assert.equal(earlyPhone && earlyPhone.paid, false);
  assert.equal(String(earlyPhone && earlyPhone.phrase || "").indexOf("paid $52.00"), -1);
  phone.paid_current_month.slots[0].status = "due";
  if (!snap.tier_doc.manual_paid) snap.tier_doc.manual_paid = {};
  snap.tier_doc.manual_paid.phone = { month: "2026-10", paid_date: "2026-10-16" };
  const ticked = ctx.bankPreparedBills(snap, undefined).filter(function (row) { return row.bill_id === "phone"; })[0];
  const near = ctx.bankPayCheckState(ticked, "2026-10", true, "2026-10-15");
  assert.equal(near.on, true);
  assert.equal(near.manual, true);
  assert.equal(ctx.bankPayCheckState(ticked, "2026-10", true, "2026-10-29").on, false);
  assert.equal(ctx.bankPayCheckState(ticked, "2026-10", true).on, false);
  assert.match(flat(ctx.bankTierSummaryHtml(snap, opts, "plan", "2026-10")), phrase);
  assert.equal(ctx.bankBudgetGlance(snap, opts).remainingBills, 50);
});

test("bill groups and categories add up to the main budget once", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  const fit = ctx.bankBudgetFit(snap, "2026-10", opts);
  const tiers = ctx.bankTierSummaryHtml(snap, opts, "plan", "2026-10");
  const line = tiers.match(/data-bank-income-line="1"[^>]*data-budget="([^"]*)"/);
  assert.equal(Number(line && line[1]), fit.budgeted);
  assert.equal(fit.budgeted, 270);
  const groups = attr(tiers, "data-bank-bill-group").filter(function (id) { return id && id !== "categories"; });
  const cats = attr(tiers, "data-bank-cat-row");
  groups.forEach(function (id) {
    assert.equal(cats.indexOf(id), -1, id);
  });
  let plan = 0;
  groups.forEach(function (id) {
    const block = tiers.split('data-bank-bill-group="' + id + '"')[1] || "";
    plan += Number((block.match(/data-bank-group-budget="([^"]*)"/) || [])[1] || 0);
    const spent = Number((block.match(/data-spent="([^"]*)"/) || [])[1]);
    assert.equal(spent, ctx.bankMonthCategoryActual(snap, "2026-10", id));
  });
  cats.forEach(function (id) {
    const row = tiers.split('data-bank-cat-row="' + id + '"')[1] || "";
    const budget = (row.match(/data-budget="([^"]*)"/) || [])[1];
    if (budget != null && budget !== "") plan += Number(budget);
  });
  assert.equal(ctx.bankRoundCents(plan), fit.budgeted);
});

test("one electric payment covers two months on the card that holds its date", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  snap.budget.bills.push({
    bill_id: "electric",
    name: "Electric",
    amount: 80,
    cadence: "monthly",
    typical_day: 15,
    category: "utilities",
    kind: "bill",
    schedule: [
      { date: "2026-08-15", status: "paid", paid_date: "2026-09-29", tx_key: "elec-1", amount: 80, bill_id: "electric", covers: 2 },
      { date: "2026-09-15", status: "paid", paid_date: "2026-09-29", tx_key: "elec-1", amount: 80, bill_id: "electric", covers: 2 }
    ]
  });
  const rows = ctx.bankPeriodBillRows(snap, opts, "2026-09-29", "2026-10-15");
  const electric = rows.filter(function (row) { return row.name === "Electric"; });
  assert.equal(electric.length, 1);
  assert.equal(electric[0].paid, true);
  assert.equal(electric[0].amount, 80);
  assert.match(electric[0].phrase, /paid \$80\.00 on Sep 29 \(covers 2 bills\)/);
  assert.equal(/-\$80|due/.test(electric[0].phrase), false);
  const counted = ctx.bankMoveWindowBills(snap, opts, { focus: { date: "2026-09-29" }, end: "2026-10-15" }, "2026-10-19").counted;
  assert.equal(counted.filter(function (row) { return row.name === "Electric"; }).length, 0);
  const wide = ctx.bankPeriodBillRows(snap, opts, "2026-08-01", "2026-10-01").filter(function (row) { return row.name === "Electric"; });
  assert.equal(wide.length, 1);
  assert.equal(wide[0].amount, 80);
});

test("the phone bill tile uses the per-slot line", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const groups = ctx.bankDatedPlanGroupsHtml(snap, optsFor(), "2026-10");
  const tile = groups.slice(groups.indexOf('data-bank-tile-key="phone"'), groups.indexOf("</button>", groups.indexOf('data-bank-tile-key="phone"')));
  assert.match(tile, /mix-leg-name">Phone paid \$52\.00 · \$50\.00 due 10\/29</);
  assert.equal(tile.indexOf(">Unpaid<"), -1);
  assert.equal(tile.indexOf("<b>$100.00</b>"), -1);
  assert.match(tile, /data-bank-bill-status="slot"/);
});

test("a paid calendar day shows the posted amount", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  const cal = ctx.bankRenderCalendar(snap, opts, "plan", { year: 2026, month: 10 }, false);
  const day15 = cal.split('aria-label="Oct 15:')[1] || "";
  assert.match(day15.slice(0, 240), /Phone \$52\.00/);
  assert.equal(day15.slice(0, 240).indexOf("Phone $50.00"), -1);
  const paid = ctx.bankDayItems(snap, { year: 2026, month: 10 }, 15, null).filter(function (row) { return row.name === "Phone"; })[0];
  const open = ctx.bankDayItems(snap, { year: 2026, month: 10 }, 29, null).filter(function (row) { return row.name === "Phone"; })[0];
  assert.equal(paid && paid.amount, "$52.00");
  assert.equal(open && open.amount, "$50.00");
});

test("by account repeats next pay moves and does not invent one", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  const advice = ctx.bankNextPayAdviceHtml(snap, opts);
  const next = ctx.bankNextPaySection(snap, opts);
  assert.match(advice, /Move \$50 from/);
  assert.equal(advice.indexOf("→"), -1);
  const moves = [];
  const re = /mix-leg-name">([^<]*)<\/span>/g;
  let m;
  while ((m = re.exec(advice))) moves.push(m[1]);
  assert.ok(moves.length >= 1);
  moves.forEach(function (text) {
    assert.ok(next.indexOf(text) >= 0, text);
  });
  const page = ctx.bankPageHtml(snap, opts);
  assert.equal(page.indexOf("→"), -1);
  const alloc = ctx.bankAllocate(snap, opts);
  (alloc.moves || []).forEach(function (mv) {
    const line = ctx.bankAllocMoveLine(mv);
    if (!line) return;
    if (next.indexOf(line) >= 0) return;
    assert.equal(page.indexOf(line), -1, line);
  });
});

test("a september card shows a cover note for a payment dated before the card", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  snap.budget.bills.push({
    bill_id: "electric",
    name: "Electric",
    amount: 80,
    cadence: "monthly",
    typical_day: 29,
    category: "utilities",
    kind: "bill",
    schedule: [
      { date: "2026-08-29", status: "paid", paid_date: "2026-09-16", tx_key: "elec-aug", amount: 80, bill_id: "electric" },
      { date: "2026-09-15", status: "paid", paid_date: "2026-09-16", tx_key: "elec-sep", amount: 80, bill_id: "electric" }
    ]
  });
  const rows = ctx.bankPeriodBillRows(snap, opts, "2026-09-29", "2026-10-15");
  const electric = rows.filter(function (row) { return row.name === "Electric"; });
  assert.equal(electric.length, 1);
  assert.equal(electric[0].paid, true);
  assert.equal(electric[0].amount, 80);
  assert.match(electric[0].phrase, /paid \$80\.00 on Sep 16 \(covers 2 bills\)/);
  assert.equal(/-\$80|due/.test(electric[0].phrase), false);
  const counted = ctx.bankMoveWindowBills(snap, opts, { focus: { date: "2026-09-29" }, end: "2026-10-15" }, "2026-10-19").counted;
  assert.equal(counted.filter(function (row) { return row.name === "Electric"; }).length, 0);
});

test("streaming spent matches on the bills group and the october bar", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  snap.tier_doc.categories.push({
    id: "streaming-entertainment",
    name: "Streaming & Entertainment",
    budget: 25,
    tier: "wants"
  });
  snap.budget.subscriptions.push({
    sub_id: "stream",
    name: "Stream Desk",
    amount: 20,
    category: "streaming-entertainment",
    typical_day: 8,
    cadence: "monthly"
  });
  snap.current.edits_tx.push({
    date: "2026-10-08",
    id: "acct-2222",
    amount: 12,
    desc: "Stream Desk",
    category: "streaming-entertainment",
    flow: "outflow",
    direction: "out",
    tx_key: "h:stream1008"
  });
  const due = (ctx.bankStackDueMap(snap, "2026-10") || {})["streaming-entertainment"] || 0;
  const spent = ctx.bankMonthCategorySpent(snap, "2026-10", "streaming-entertainment");
  assert.equal(spent, 12);
  assert.ok(due > spent);
  const groups = ctx.bankDatedPlanGroupsHtml(snap, opts, "2026-10");
  const block = groups.split('data-bank-bill-group="streaming-entertainment"')[1] || "";
  const groupSpent = Number((block.match(/data-spent="([^"]*)"/) || [])[1]);
  const model = ctx.bankStackActualModel(snap, "2026-10", opts);
  const leg = (model.legend || []).filter(function (row) { return row.id === "streaming-entertainment"; })[0];
  assert.equal(groupSpent, spent);
  assert.equal(leg && leg.spent, spent);
});

test("the surplus fold lists the same rows as extra income", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  snap.budget.other_income.push({ date: "2026-10-18", name: "Dividend", amount: 0.02 });
  const extra = ctx.bankFitExtraRows(snap, "2026-10", opts);
  assert.equal(ctx.bankFitExtraIncome(snap, "2026-10", opts), 25.02);
  assert.equal(extra.some(function (row) { return row.name === "Dividend" && row.amount === 0.02; }), true);
  const panels = ctx.bankBudgetPanelsHtml(snap, opts);
  const list = panels.slice(panels.indexOf('data-bank-surplus-list="1"'), panels.indexOf("</ul>", panels.indexOf('data-bank-surplus-list="1"')));
  extra.forEach(function (row) {
    assert.ok(list.indexOf(row.name) >= 0, row.name);
  });
  assert.match(list, /Dividend/);
  assert.match(list, /\$0\.02/);
});

test("a payroll deposit with nominal_date counts when the schedule has no row", function () {
  const ctx = bootBank();
  const snap = loadSnap(ctx);
  const opts = optsFor();
  snap.budget.pay_schedule = snap.budget.pay_schedule.filter(function (row) { return row.date !== "2026-10-15"; });
  snap.budget.pay_periods.forEach(function (period) {
    if (period && period.deposit && period.deposit.date === "2026-10-15") period.deposit = null;
  });
  const tx = snap.current.edits_tx.filter(function (row) { return row.desc === "Deposit Acme Payroll"; })[0];
  tx.date = "2026-09-28";
  tx.nominal_date = "2026-10-15";
  const card = ctx.bankBudgetCard(snap, opts);
  assert.equal(card.pay, 2800);
  assert.equal(ctx.bankBudgetPayIncome(snap, "2026-10"), 2800);
  assert.equal(ctx.bankFitExtraIncome(snap, "2026-10", opts), 25);
  const names = (card.surplusRows || []).map(function (row) { return row.name; }).join(" ");
  assert.equal(/Payroll|Acme/.test(names), false);
});
