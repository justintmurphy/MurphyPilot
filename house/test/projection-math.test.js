"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const NOW = "2026-10-12T16:00:00-04:00";

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
    setTimeout: function () { return 0; },
    clearTimeout: function () {},
    Intl: Intl,
    Date: (function () {
      const RealDate = Date;
      const fixed = new RealDate(NOW);
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

function snap() {
  const checking = { nickname: "Checking", last4: "2222", suffix: "2222" };
  return {
    asof: NOW,
    accounts: [{ id: "chk", nickname: "Checking", name: "Checking", suffix: "2222", last4: "2222", subType: "checking" }],
    current: {
      month: "2026-10",
      balance_before_first_pay: 500,
      balances: [{ id: "chk", nickname: "Checking", suffix: "2222", balance: 640 }],
      recent_tx: [
        { date: "2026-10-09", amount: 50, flow: "transfer", desc: "Mobile deposit", account_last4: "2222", tx_key: "dep-1" },
        { date: "2026-10-09", amount: 18.5, flow: "outflow", desc: "Affirm", account_last4: "2222", tx_key: "affirm-1" }
      ],
      edits_tx: [],
      history_tx: [
        { date: "2026-09-29", amount: 380, flow: "inflow", desc: "Payroll", account_last4: "2222", tx_key: "pay-sep" }
      ]
    },
    history: {
      months: [{ month: "2026-08", end_balances: { chk: 500 } }],
      tx: []
    },
    budget: {
      tiers: { needs_plan: 0, wants_plan: 0, required_plan: 120 },
      paid_status_month: "2026-10",
      account_funding_combined: 640,
      bills: [{
        name: "Rent",
        bill_id: "rent",
        amount: 100,
        typical_day: 20,
        cadence: "monthly",
        tier: "required",
        usual_account: checking
      }],
      subscriptions: [{
        name: "Affirm",
        sub_id: "affirm",
        amount: 20,
        typical_day: 15,
        tier: "required",
        usual_account: checking,
        paid_current_month: {
          month: "2026-10",
          status: "paid",
          paid_date: "2026-10-09",
          tx_key: "affirm-1",
          source: "bank"
        }
      }],
      income_monthly: [
        { label: "Payroll", amount: 400, cadence: "twice_monthly", usual_account: checking },
        { label: "Stipend", amount: 50, kind: "stipend", cadence: "twice_monthly", usual_account: checking }
      ],
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-09-30", amount: 400, account: checking },
        { name: "Stipend", kind: "stipend", date: "2026-10-10", amount: 50, account: checking },
        { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 400, account: checking },
        { name: "Stipend", kind: "stipend", date: "2026-10-23", amount: 50, account: checking }
      ],
      account_funding: [{
        nickname: "Checking",
        last4: "2222",
        subType: "checking",
        start_balance: 600,
        current_balance: 640,
        start_asof: "2026-10-01",
        pending_unposted: 15
      }],
      calendar: [{ day: 15, items: ["Affirm"] }]
    },
    tier_doc: { rules: {}, plans: { needs: 0 }, bill_status: {}, manual_paid: {}, bill_account: {} }
  };
}

function num(html, attr) {
  const m = html.match(new RegExp(attr + '="([^"]*)"'));
  return m ? Number(m[1]) : null;
}

function cents(n) {
  return Math.round(Number(n) * 100);
}

function chainRows(due) {
  const rows = [];
  due.split(/<tr\b/).slice(1).forEach(function (chunk) {
    if (!/data-bank-chain=/.test(chunk)) return;
    const name = (chunk.match(/class="sym">([^<]*)/) || [])[1] || "";
    const attr = function (key) {
      const m = chunk.match(new RegExp(key + '="([^"]*)"'));
      return m ? m[1] : "";
    };
    rows.push({
      name: name,
      seg: attr("data-bank-chain-seg"),
      prev: Number(attr("data-bank-chain-prev")),
      left: Number(attr("data-bank-chain")),
      delta: Number(attr("data-bank-chain-delta")),
      kind: attr("data-bank-row-kind"),
      shown: Number(attr("data-bank-row-left"))
    });
  });
  return rows;
}

test("projection uses posted deposits, one pending, and a cent-level left-after chain", function () {
  const ctx = boot();
  const fx = snap();
  const opts = { tab: "budget", planMonth: "2026-10", now: NOW };
  const html = ctx.bankPageHtml(fx, opts);
  assert.equal(num(html, "data-bank-hero-now"), 640);
  assert.equal(num(html, "data-bank-hero-in"), 450);
  assert.equal(num(html, "data-bank-hero-out"), 115);
  assert.equal(num(html, "data-bank-hero-end"), 975);
  assert.equal(num(html, "data-bank-ledger-end"), 975);
  assert.equal(cents(num(html, "data-bank-hero-now") + num(html, "data-bank-hero-in") - num(html, "data-bank-hero-out")), cents(975));

  const next = html.slice(html.indexOf('class="bank-next"'), html.indexOf('data-bank-part="calendar"'));
  assert.match(next, /data-bank-next-date="2026-09-29"/);
  assert.doesNotMatch(next, /data-bank-next-date="2026-09-30"/);
  assert.match(next, /data-bank-opening="500"/);
  assert.match(next, /Opening balance/);
  const openCard = next.slice(next.indexOf('data-bank-next-card="1"'), next.indexOf('data-bank-next-card="2"'));
  assert.match(openCard, /data-bank-past="1"/);
  assert.doesNotMatch(openCard, /data-bank-carried=/);
  assert.match(openCard, /\+\$380\.00/);
  const carried = next.match(/data-bank-carried="([^"]*)"/);
  assert.ok(carried, "first open card carries the current balance minus pending");
  assert.equal(Number(carried[1]), 625);

  const due = html.slice(html.indexOf('class="bank-due-month"'), html.indexOf("</section>", html.indexOf('class="bank-due-month"')));
  assert.doesNotMatch(due, /data-bank-today/);
  assert.doesNotMatch(due, /sym">Today/);
  assert.match(due, /sym">Pending/);
  assert.equal((due.match(/data-bank-pending="1"/g) || []).length, 1);
  assert.match(due, /Affirm[\s\S]{0,240}−\$18\.50/);
  assert.doesNotMatch(due, /Affirm[\s\S]{0,160}−\$20\.00/);
  const forwardAt = due.indexOf('data-bank-chain-seg="forward"');
  assert.ok(forwardAt >= 0);
  assert.doesNotMatch(due.slice(forwardAt), /Affirm/);
  assert.doesNotMatch(due, /expected[\s\S]{0,80}Stipend|Stipend[\s\S]{0,80}expected/);

  const rows = chainRows(due);
  assert.ok(rows.length >= 4);
  let seg = "";
  let prev = null;
  rows.forEach(function (row) {
    assert.equal(cents(row.prev + row.delta), cents(row.left), row.name + " chain");
    assert.equal(cents(row.shown), cents(row.left), row.name + " left");
    if (row.seg !== seg) {
      seg = row.seg;
      prev = row.prev;
    }
    assert.equal(cents(prev + row.delta), cents(row.left), row.name + " follows the previous left");
    prev = row.left;
  });
  const past = rows.filter(function (row) { return row.seg === "prior"; });
  const forward = rows.filter(function (row) { return row.seg === "forward"; });
  assert.equal(past[0].prev, 600);
  assert.equal(forward[0].name, "Pending");
  assert.equal(forward[0].prev, 640);
  assert.equal(forward[0].delta, -15);
  forward.forEach(function (row, i) {
    if (!i) return;
    assert.equal(cents(forward[i - 1].left + row.delta), cents(row.left));
  });

  const cal = html.slice(html.indexOf('class="bank-cal"'));
  const labels = [];
  const re = /aria-label="([^"]*)"/g;
  let hit;
  while ((hit = re.exec(cal))) labels.push(hit[1]);
  const day9 = labels.filter(function (label) { return label.indexOf("Oct 9:") === 0; }).join(" ");
  const day10 = labels.filter(function (label) { return label.indexOf("Oct 10:") === 0; }).join(" ");
  const day15 = labels.filter(function (label) { return label.indexOf("Oct 15:") === 0; }).join(" ");
  assert.match(day9, /Stipend/);
  assert.match(day9, /Affirm/);
  assert.doesNotMatch(day10, /Stipend/);
  assert.doesNotMatch(day15, /Affirm/);
});
