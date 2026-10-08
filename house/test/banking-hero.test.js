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
  assert.match(html, /as of Oct 5, 12:00 PM/);
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
  const fund = html.slice(html.indexOf('class="bank-funding"'), html.indexOf('data-bank-part="calendar"'));
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
  assert.match(html, /as of Oct 5, 9:15 AM/);
  assert.doesNotMatch(html, /as of Oct 7, 9:40 PM/);
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
