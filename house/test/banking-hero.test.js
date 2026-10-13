"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const fixturePath = path.join(__dirname, "fixtures", "banking-ui.json");
const BRANDS = /UPMC|NFCU|Navy Federal|T-Mobile|M&T|Comcast|OneMain|GoodLeap|Aptive|Santander|FirstEnergy|Brightwheel|Progressive|Peoples Gas|BetrLink|Sofyre|Urban Air|Yippee|Dollar Shave|Travel Advantage|CLEFCU|Hooked|Truthifi|Vill Cap|Village/i;

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

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

function blank(fx) {
  fx.budget.bills = [];
  fx.budget.bills_monthly = [];
  fx.budget.calendar = [];
  fx.budget.subscriptions = [];
  fx.budget.planned_by_category = {};
  fx.budget.income_monthly = [];
  fx.budget.insights = [];
  fx.budget.tiers = {};
  fx.budget.pay_schedule = [];
  delete fx.budget.account_funding_combined;
  fx.current.recent_tx = [];
  fx.current.edits_tx = [];
  fx.current.balances = [
    { id: "acct-od", balance: 0, asof_date: "2026-10-05" }
  ];
  fx.accounts = [{ id: "acct-od", suffix: "9999", name: "Overdraft", subType: "savings" }];
  return fx;
}

function moneyHits(html) {
  return String(html || "").replace(/−/g, "-").match(/-?\$[0-9,]+\.[0-9]{2}/g) || [];
}

function heroEnd(html) {
  const tag = html.match(/<b class="([^"]*)" data-bank-hero-end="([^"]*)">([^<]*)</);
  assert.ok(tag, "month-end figure");
  return { cls: tag[1], value: Number(tag[2]), text: tag[3] };
}

function accountSum(html) {
  const block = html.slice(html.indexOf("data-bank-hero-accounts"));
  const rows = [];
  const re = /data-bank-hero-acct="1" data-balance="([^"]*)"/g;
  let hit;
  while ((hit = re.exec(block))) rows.push(Number(hit[1]));
  return rows;
}

test("in the bank now is the sum of the expanded funding accounts", function () {
  const ctx = boot();
  const fx = blank(loadFixture());
  fx.asof = "2026-10-05T12:00:00-04:00";
  fx.budget.account_funding = [
    { nickname: "Checking", last4: "0831", start_balance: 80, balance: 12.34 },
    {
      nickname: "Bills",
      last4: "2222",
      start_balance: 40,
      outs: [{ date: "2026-10-02", name: "Rent", amount: 10 }]
    },
    { nickname: "Overdraft", last4: "9999", start_balance: 500, balance: 500 }
  ];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  assert.ok(html.indexOf('data-bank-hero="1"') < html.indexOf('class="bank-next"'));
  const now = Number((html.match(/data-bank-hero-now="([^"]*)"/) || [])[1]);
  const rows = accountSum(html);
  const sum = Math.round(rows.reduce(function (n, v) { return n + v; }, 0) * 100) / 100;
  assert.deepEqual(rows, [12.34, 30]);
  assert.equal(now, sum);
  assert.match(html, /Checking ··0831/);
  assert.match(html, /Bills ··2222/);
  fx.asof_data_through = "2026-10-05";
  const dated = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  assert.match(dated, /Data through Oct 5/);
  assert.doesNotMatch(dated, /as of Oct 5/);
  const accounts = html.slice(html.indexOf("data-bank-hero-accounts"), html.indexOf("</section>", html.indexOf("data-bank-hero-accounts")));
  assert.doesNotMatch(accounts, BRANDS);
  assert.doesNotMatch(accounts, /Overdraft/);
  assert.doesNotMatch(accounts, /data-bank-hero-acct="1" data-balance="500"/);
  assert.doesNotMatch(accounts, /data-bank-hero-acct="1" data-balance="80"/);
});

test("hero month-end matches funding left and the list month-end", function () {
  const ctx = boot();
  const fx = blank(loadFixture());
  fx.asof = "2026-10-06T12:00:00-04:00";
  fx.budget.account_funding = [{ nickname: "Bills", last4: "2222", start_balance: 100 }];
  fx.budget.bills = [{ name: "Rent", amount: 40, typical_day: 20, cadence: "monthly", tier: "required" }];
  fx.budget.pay_schedule = [{ name: "Payroll", kind: "payroll", date: "2026-10-25", amount: 100 }];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  const fund = html.slice(html.indexOf('class="bank-funding"'), html.indexOf('data-bank-part="income"'));
  const left = Number((fund.match(/data-fund-left="([^"]*)"/) || [])[1]);
  const end = heroEnd(html);
  const ledger = html.match(/data-bank-ledger-end="([^"]*)"/);
  assert.ok(ledger);
  const listEnd = Number(ledger[1]);
  assert.equal(end.value, left);
  assert.equal(end.value, listEnd);
  assert.equal(end.cls.indexOf("tone-stop") >= 0, end.value < 0);
  assert.doesNotMatch(fund, /<span>Left<\/span>/);
  assert.doesNotMatch(fund, /<span>Start<\/span>/);
});

test("print balances sum to the headline and the as-of is the oldest", function () {
  const ctx = boot();
  const fx = blank(loadFixture());
  fx.asof = "2026-10-01T12:00:00-04:00";
  fx.budget.account_funding = [
    {
      nickname: "Checking",
      last4: "0831",
      start_balance: 80,
      current_balance: 12.34,
      current_balance_asof: "2026-10-07T21:40:00-04:00",
      current_balance_asof_source: "print"
    },
    {
      nickname: "Bills",
      last4: "2222",
      start_balance: 40,
      current_balance: 30,
      current_balance_asof: "2026-10-05T09:15:00-04:00",
      current_balance_asof_source: "print"
    }
  ];
  fx.budget.account_funding_combined = 42.34;
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  const now = Number((html.match(/data-bank-hero-now="([^"]*)"/) || [])[1]);
  const rows = accountSum(html);
  const sum = Math.round(rows.reduce(function (n, v) { return n + v; }, 0) * 100) / 100;
  assert.deepEqual(rows, [12.34, 30]);
  assert.equal(now, sum);
  fx.asof_data_through = "2026-10-05";
  const through = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  assert.match(through, /Data through Oct 5/);
  assert.doesNotMatch(through, /as of Oct/);
  delete fx.budget.account_funding_combined;
  const again = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  const now2 = Number((again.match(/data-bank-hero-now="([^"]*)"/) || [])[1]);
  const sum2 = Math.round(accountSum(again).reduce(function (n, v) { return n + v; }, 0) * 100) / 100;
  assert.equal(now2, sum2);
  assert.equal(now2, 42.34);
});

test("a negative month-end uses the red class", function () {
  const ctx = boot();
  const fx = blank(loadFixture());
  fx.budget.account_funding = [{ nickname: "Bills", last4: "2222", start_balance: 10 }];
  fx.budget.bills = [{ name: "Rent", amount: 40, typical_day: 20, cadence: "monthly", tier: "required" }];
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  const end = heroEnd(html);
  assert.ok(end.value < 0, "month-end " + end.value);
  assert.match(end.cls, /tone-stop/);
  assert.match(end.text, /−\$/);
  const accounts = html.slice(html.indexOf("data-bank-hero-accounts"), html.indexOf("</section>", html.indexOf("data-bank-hero-accounts")));
  assert.doesNotMatch(accounts, BRANDS);
});

test("account rows under the hero sum to the combined figure, including a negative account", function () {
  const ctx = boot();
  const fx = blank(loadFixture());
  fx.asof = "2026-10-08T12:00:00-04:00";
  fx.budget.account_funding = [
    { nickname: "Check", last4: "1111", start_balance: 50, current_balance: 50, current_balance_asof: "2026-10-06T09:00:00-04:00" },
    { nickname: "Debit", last4: "2222", start_balance: 0, current_balance: -10.5, current_balance_asof: "2026-10-05T09:00:00-04:00" },
    { nickname: "Savings", last4: "3333", start_balance: 2.84, current_balance: 2.84, current_balance_asof: "2026-10-04T09:00:00-04:00" }
  ];
  fx.budget.account_funding_combined = 42.34;
  const html = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  const now = Number((html.match(/data-bank-hero-now="([^"]*)"/) || [])[1]);
  const rows = accountSum(html);
  const sum = Math.round(rows.reduce(function (n, v) { return n + v; }, 0) * 100) / 100;
  assert.deepEqual(rows, [50, -10.5, 2.84]);
  assert.equal(sum, 42.34);
  assert.equal(now, sum);
  assert.doesNotMatch(html, /data-bank-hero-toggle/);
  assert.doesNotMatch(html.slice(html.indexOf("data-bank-hero-accounts"), html.indexOf("</table>", html.indexOf("data-bank-hero-accounts"))), /hidden/);
  assert.match(html, /Check ··1111/);
  assert.match(html, /Debit ··2222[\s\S]{0,80}tone-stop/);
  fx.asof_data_through = "2026-10-04";
  const dated = ctx.bankPageHtml(fx, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  assert.match(dated, /<p class="hint" data-bank-asof="1">Data through Oct 4/);
  const hero = dated.slice(dated.indexOf('data-bank-hero="1"'), dated.indexOf('data-bank-hero-figs'));
  assert.ok(hero.indexOf("In the bank now") < hero.indexOf("data-bank-hero-accounts"));
  assert.ok(hero.indexOf("data-bank-hero-accounts") > hero.indexOf("</div></div>"));
  assert.ok(hero.indexOf("Data through Oct 4") > hero.indexOf("</table>"));
  assert.doesNotMatch(hero, /as of /);
  assert.doesNotMatch(hero, /books-head/);
  const accounts = html.slice(html.indexOf("data-bank-hero-accounts"), html.indexOf("</table>", html.indexOf("data-bank-hero-accounts")));
  assert.doesNotMatch(accounts, BRANDS);
  assert.doesNotMatch(accounts, /style=/);
});

test("fixture uses balance after pending, the print pending total, and print moves", function () {
  const ctx = boot();
  const fx = blank(loadFixture());
  fx.asof = "2026-10-13T12:00:00-04:00";
  fx.accounts = [
    { id: "chk", nickname: "Checking", name: "Checking", suffix: "0831", last4: "0831", subType: "checking" },
    { id: "deb", nickname: "Debit", name: "Debit", suffix: "4845", last4: "4845", subType: "checking" }
  ];
  fx.current.balances = [
    { id: "chk", balance: 80 },
    { id: "deb", balance: 40 }
  ];
  fx.current.balance_after_pending = { "0831": 50, "4845": 7 };
  fx.current.pending_out = 9;
  fx.current.pending_total = 33;
  fx.budget.account_funding = [
    {
      nickname: "Checking",
      last4: "0831",
      subType: "checking",
      current_balance: 80,
      projection_start_balance: 48,
      pending_unposted: 10
    },
    {
      nickname: "Debit",
      last4: "4845",
      subType: "checking",
      current_balance: 40,
      projection_start_balance: 3.12,
      pending_unposted: 5
    }
  ];
  fx.budget.account_funding_combined = 120;
  fx.budget.bills = [{
    name: "Education",
    amount: 20,
    typical_day: 16,
    cadence: "monthly",
    tier: "required",
    usual_account: { nickname: "Debit", last4: "4845" }
  }];
  fx.budget.subscriptions = [];
  fx.budget.income_monthly = [{
    label: "Payroll",
    amount: 100,
    cadence: "semi_monthly",
    usual_account: { nickname: "Checking", last4: "0831" }
  }];
  fx.budget.pay_schedule = [
    { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 100, account: { nickname: "Checking", last4: "0831" } },
    { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 100, account: { nickname: "Checking", last4: "0831" } }
  ];
  fx.budget.pay_periods = [{
    moves: [{
      from: "4845",
      to: "0831",
      amount: 29,
      move_by: "10-16",
      reason: "Education"
    }]
  }];
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-13T16:00:00Z" };
  const html = ctx.bankPageHtml(fx, opts);
  const hero = html.slice(html.indexOf('data-bank-hero="1"'), html.indexOf("data-bank-hero-figs"));
  assert.match(hero, /data-bank-hero-acct="1" data-balance="50"/);
  assert.match(hero, /data-bank-hero-acct="1" data-balance="7"/);
  assert.match(hero, /Posted \$80\.00/);
  assert.match(hero, /Posted \$40\.00/);
  assert.match(hero, /includes \$33\.00 pending/);
  assert.doesNotMatch(hero, /includes \$9\.00 pending|includes \$15\.00 pending/);
  assert.equal(Number((html.match(/data-bank-hero-now="([^"]*)"/) || [])[1]), 57);
  const next = html.slice(html.indexOf('class="bank-next"'), html.indexOf('data-bank-part="calendar"'));
  const at = next.indexOf('data-bank-next-date="2026-10-15"');
  assert.ok(at > 0);
  const card = next.slice(next.lastIndexOf('<div class="card"', at), next.indexOf('data-bank-next-card="', at + 20));
  assert.match(card, /Move \$29 from Debit ··4845 to Checking ··0831 by Fri Oct 16, for Education/);
  assert.doesNotMatch(card, /\$3\.12/);
  const plan = ctx.bankNextPayMovePlan(fx, opts).filter(function (row) { return row.date === "2026-10-15"; })[0];
  assert.equal(plan.fromPrint, true);
  assert.equal(plan.moves[0].amount, 29);
  const current = ctx.bankPageHtml(fx, { tab: "current", planMonth: "2026-10", now: "2026-10-13T16:00:00Z" });
  assert.match(current, /data-acct="Checking"[^>]*data-balance="50"/);
  assert.match(current, /data-acct="Debit"[^>]*data-balance="7"/);
  assert.match(current, /Posted \$80\.00/);
  assert.match(current, /Posted \$40\.00/);

  const projected = JSON.parse(JSON.stringify(fx));
  delete projected.current.balance_after_pending;
  const projHtml = ctx.bankPageHtml(projected, opts);
  assert.match(projHtml, /data-bank-hero-acct="1" data-balance="48"/);
  assert.match(projHtml, /data-bank-hero-acct="1" data-balance="3.12"/);
  assert.match(projHtml, /Posted \$80\.00/);
  assert.equal(Number((projHtml.match(/data-bank-hero-now="([^"]*)"/) || [])[1]), 51.12);

  const postedOnly = JSON.parse(JSON.stringify(projected));
  postedOnly.budget.account_funding.forEach(function (row) { delete row.projection_start_balance; });
  const postedHtml = ctx.bankPageHtml(postedOnly, opts);
  assert.match(postedHtml, /data-bank-hero-acct="1" data-balance="80"/);
  assert.match(postedHtml, /data-bank-hero-acct="1" data-balance="40"/);
  assert.doesNotMatch(postedHtml.slice(postedHtml.indexOf("data-bank-hero-accounts"), postedHtml.indexOf("</table>", postedHtml.indexOf("data-bank-hero-accounts"))), /Posted \$/);

  const bare = JSON.parse(JSON.stringify(fx));
  delete bare.budget.pay_periods[0].moves;
  const calc = ctx.bankNextPayMovePlan(bare, opts).filter(function (row) { return row.date === "2026-10-15"; })[0];
  assert.equal(calc.fromPrint, false);
  const bareHtml = ctx.bankPageHtml(bare, opts);
  const bareNext = bareHtml.slice(bareHtml.indexOf('class="bank-next"'), bareHtml.indexOf('data-bank-part="calendar"'));
  assert.doesNotMatch(bareNext, /Move \$29 from Debit/);

  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  assert.match(css, /\[data-bank-part="tiers"\],\n  \.bank-panel > \.bank-day-dialog \{\n    grid-column: 1 \/ -1;/);
  assert.match(css, /\[data-bank-part="calendar"\] \{\n    grid-column: 1 \/ -1;/);
});
