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
    amount: 20,
    typical_day: 15,
    tier: "required",
    kind: "bill",
    cadence: "monthly"
  }, extra);
}

function snap(bills, extra) {
  return Object.assign({
    asof: "2026-11-18T12:00:00-05:00",
    accounts: [{ nickname: "Bills", suffix: "2222", name: "Bills" }],
    current: { month: "2026-11", recent_tx: [], edits_tx: [], history_tx: [], balances: [] },
    history: { months: [], tx: [] },
    budget: {
      month: "2026-11",
      tiers: { required_plan: 80, needs_plan: 0, wants_plan: 0 },
      bills: bills
    }
  }, extra || {});
}

function tile(html, name) {
  const marker = 'mix-leg-name">' + name + "<";
  const at = html.indexOf(marker);
  assert.notEqual(at, -1, name);
  const start = html.lastIndexOf("<button", at);
  return html.slice(start, html.indexOf("</button>", at));
}

test("a saved due day of 13 replaces the printed 15th", function () {
  const ctx = boot();
  const base = snap([
    bill({
      name: "Yard gas",
      bill_id: "yard-gas",
      typical_days: [15],
      schedule: [
        { date: "2026-11-15", status: "due", amount: 20, bill_id: "yard-gas" }
      ]
    })
  ]);
  base.dueday_overrides = { "yard gas": 13 };
  const row = ctx.bankViewBills(base).filter(function (b) { return b.bill_id === "yard-gas"; })[0];
  assert.equal(row.due_set_by_you, true);
  assert.equal(ctx.bankBillDueDays(row, { year: 2026, month: 11 }).join(","), "13");
  const rows = ctx.bankPeriodBillRows(base, {}, "2026-11-01", "2026-12-01").filter(function (r) {
    return r.billKey === "yard-gas";
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].due, "2026-11-13");
});

test("a printed projected date of the 20th is the due day", function () {
  const ctx = boot();
  const onBill = snap([
    bill({ name: "Cabin cover", bill_id: "cabin-cover", projected_date: "2026-11-20", amount: 30 })
  ]);
  const direct = ctx.bankViewBills(onBill).filter(function (b) { return b.name === "Cabin cover"; })[0];
  assert.equal(ctx.bankBillDueDays(direct, { year: 2026, month: 11 }).join(","), "20");

  const fromFunding = snap([
    bill({ name: "Cabin cover", bill_id: "cabin-cover", amount: 30 })
  ]);
  fromFunding.budget.account_funding = [{
    nickname: "Bills",
    last4: "2222",
    rows: [{ name: "Cabin cover", amount: 30, date: "2026-11-15", projected_date: "2026-11-20" }]
  }];
  const funded = ctx.bankViewBills(fromFunding).filter(function (b) { return b.name === "Cabin cover"; })[0];
  assert.equal(funded.projected_date, "2026-11-20");
  assert.equal(ctx.bankBillDueDays(funded, { year: 2026, month: 11 }).join(","), "20");
});

test("an edits amount wins over this cycle's printed amount", function () {
  const ctx = boot();
  const base = snap([
    bill({
      name: "Rolled fee",
      bill_id: "rolled-fee",
      amount: 10,
      cycle_due: "2026-11-20",
      cycle_amount: 44
    })
  ]);
  const row = ctx.bankViewBills(base).filter(function (b) { return b.name === "Rolled fee"; })[0];
  const cycle = ctx.bankBillPaidFacts(base, row, "2026-11", null);
  assert.equal(cycle.due, 44);
  const saved = ctx.bankBillPaidFacts(base, row, "2026-11", { bills: { "Rolled fee": { amount: 7 } } });
  assert.equal(saved.due, 7);
});

test("the ring fills from matched payments, not a planned status", function () {
  const ctx = boot();
  const base = snap([
    bill({
      name: "Twin draft",
      bill_id: "twin-draft",
      amount: 40,
      cadence: "twice_monthly",
      typical_days: [15, 25],
      schedule: [
        { date: "2026-11-15", status: "paid", paid_date: "2026-11-15", amount: 40, bill_id: "twin-draft" },
        { date: "2026-11-25", status: "due", amount: 40, bill_id: "twin-draft" }
      ]
    }),
    bill({
      name: "Open lamp",
      bill_id: "open-lamp",
      amount: 20,
      typical_day: 8,
      schedule: [{ date: "2026-11-08", status: "due", amount: 20, bill_id: "open-lamp" }]
    }),
    bill({
      name: "Paid lamp",
      bill_id: "paid-lamp",
      amount: 30,
      typical_day: 4,
      paid_current_month: { month: "2026-11", status: "paid", paid_date: "2026-11-04" },
      schedule: [{ date: "2026-11-04", status: "paid", paid_date: "2026-11-04", amount: 30, bill_id: "paid-lamp" }]
    }),
    bill({
      name: "Marked only",
      bill_id: "marked-only",
      amount: 16,
      typical_day: 9,
      paid_current_month: { month: "2026-11", status: "paid", paid_date: "2026-11-09" }
    })
  ]);
  const html = ctx.bankBillGroupsHtml(base, {}, "2026-11");
  const twin = tile(html, "Twin draft");
  assert.match(twin, /\$40\.00 paid of \$80\.00|\$40\.00 of \$80\.00 due/);
  assert.match(twin, /data-pct="50"/);
  assert.match(twin, /Due Nov 15 and Nov 25/);
  assert.match(twin, /Paid Nov 15/);
  assert.equal(twin.indexOf("Paid Nov 25"), -1);

  const open = tile(html, "Open lamp");
  assert.match(open, /\$0\.00 of \$20\.00 due/);
  assert.match(open, /data-pct="0"/);
  assert.match(open, /Due Nov 8/);
  assert.equal(open.indexOf("Paid Nov"), -1);

  const paid = tile(html, "Paid lamp");
  assert.match(paid, /\$30\.00 paid of \$30\.00/);
  assert.match(paid, /data-pct="100"/);
  assert.match(paid, /Due Nov 4/);
  assert.match(paid, /Paid Nov 4/);

  const marked = tile(html, "Marked only");
  assert.match(marked, /data-pct="0"/);
  assert.match(marked, /\$0\.00 of \$16\.00 due/);
  assert.match(marked, /Due Nov 9/);
});
