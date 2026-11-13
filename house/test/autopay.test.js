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
      const raw = "2026-10-16T16:00:00.000Z";
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

function snap(extra) {
  const doc = {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [
      { nickname: "Pay", suffix: "1111", name: "Pay" },
      { nickname: "Bills", suffix: "2222", name: "Bills" }
    ],
    current: { month: "2026-10", recent_tx: [], edits_tx: [], history_tx: [], balances: [] },
    history: { months: [], tx: [] },
    budget: {
      month: "2026-10",
      tiers: { needs_plan: 40, wants_plan: 0, required_plan: 90 },
      bills: [
        {
          name: "Power",
          bill_id: "power",
          amount: 40,
          typical_day: 12,
          tier: "required",
          category_id: "utilities",
          autopay: true,
          autopay_account: { last4: "2222", nickname: "Bills" },
          autopay_evidence: "recurring debit",
          usual_account: { last4: "2222" }
        },
        {
          name: "Rent",
          bill_id: "rent",
          amount: 50,
          typical_day: 1,
          tier: "required",
          category_id: "housing",
          autopay: false,
          pay_method: "manual",
          usual_account: { last4: "1111" }
        },
        {
          name: "Stream",
          bill_id: "stream",
          amount: 15,
          typical_day: 18,
          tier: "needs",
          category_id: "utilities",
          usual_account: { last4: "2222" }
        },
        {
          name: "Car payment",
          bill_id: "car-payment",
          amount: 30,
          typical_day: 9,
          tier: "required",
          category_id: "transport",
          pay_method: "cash_off_bank",
          usual_account: { last4: "1111" }
        }
      ],
      subscriptions: [],
      income_monthly: []
    },
    tier_doc: {
      rules: {},
      plans: {},
      categories: [
        { id: "utilities", name: "Utilities", tier: "needs", budget: 55 },
        { id: "housing", name: "Housing", tier: "required", budget: 50 },
        { id: "transport", name: "Transport", tier: "required", budget: 30 }
      ],
      bill_status: {},
      manual_paid: {},
      bill_account: {},
      bill_autopay: {}
    }
  };
  return Object.assign(doc, extra || {});
}

const opts = { planMonth: "2026-10", now: "2026-10-16T16:00:00Z" };

function tile(html, name) {
  const at = html.indexOf(">" + name + "<");
  assert.ok(at > 0, name);
  const end = html.indexOf("</li>", at);
  return html.slice(at, end > at ? end : at + 240);
}

test("autopay, manual, unknown, and cash bills tag only the right rows", function () {
  const ctx = boot();
  const page = ctx.bankPageHtml(snap(), Object.assign({ tab: "budget", openDay: 12 }, opts));
  const power = tile(page, "Power");
  const rent = tile(page, "Rent");
  const stream = tile(page, "Stream");
  const car = tile(page, "Car payment");
  assert.match(power, /data-bank-autopay-tag="autopay"/);
  assert.doesNotMatch(power, /2222/);
  assert.match(rent, /data-bank-autopay-tag="manual"/);
  assert.doesNotMatch(stream, /data-bank-autopay-tag/);
  assert.doesNotMatch(car, /data-bank-autopay-tag/);
  assert.match(page, /title="Power · Autopay"/);
  assert.match(page, /title="Rent · Manual"/);
  assert.doesNotMatch(page, /Car payment · Autopay/);
  assert.doesNotMatch(page, /Stream · Autopay/);
  assert.match(page, /data-bank-day-item="1"[\s\S]{0,500}data-bank-autopay-tag="autopay" title="Autopay ··2222"/);
  assert.doesNotMatch(page, /recurring debit/);

  const edits = ctx.bankPageHtml(snap(), Object.assign({ tab: "edits" }, opts));
  assert.match(edits, /data-bank-autopay="power" checked/);
  assert.match(edits, /data-bank-autopay="rent"/);
  assert.doesNotMatch(edits.slice(edits.indexOf('data-bank-autopay="rent"'), edits.indexOf('data-bank-autopay="rent"') + 40), /checked/);
  assert.match(edits, /data-bank-autopay="stream"[\s\S]{0,220}data-bank-autopay-unknown="1"/);
  assert.match(edits, /data-bank-autopay="car-payment"[\s\S]{0,220}data-bank-autopay-unknown="1"/);
  assert.doesNotMatch(edits, /data-bank-autopay-reset=/);
});

test("a saved autopay choice wins over the print and reset is offered", function () {
  const ctx = boot();
  const doc = snap();
  doc.tier_doc.bill_autopay = { power: false, stream: true };
  const page = ctx.bankPageHtml(doc, Object.assign({ tab: "budget" }, opts));
  assert.doesNotMatch(tile(page, "Power"), /data-bank-autopay-tag="autopay"/);
  assert.match(tile(page, "Stream"), /data-bank-autopay-tag="autopay"/);
  const edits = ctx.bankPageHtml(doc, Object.assign({ tab: "edits" }, opts));
  assert.match(edits, /data-bank-autopay="power"(?! checked)/);
  assert.match(edits, /data-bank-autopay-reset="power"/);
  assert.match(edits, /data-bank-autopay="stream" checked/);
  assert.match(edits, /data-bank-autopay-reset="stream"/);
  assert.match(edits, /data-bank-autopay="car-payment"[\s\S]{0,220}data-bank-autopay-unknown="1"/);
});

test("cash stays untagged until Justin turns autopay on", function () {
  const ctx = boot();
  const doc = snap();
  doc.budget.bills[3].autopay = true;
  let page = ctx.bankPageHtml(doc, Object.assign({ tab: "budget" }, opts));
  assert.doesNotMatch(tile(page, "Car payment"), /data-bank-autopay-tag/);
  doc.tier_doc.bill_autopay = { "car-payment": true };
  page = ctx.bankPageHtml(doc, Object.assign({ tab: "budget" }, opts));
  assert.match(tile(page, "Car payment"), /data-bank-autopay-tag="autopay"/);
});

test("bills_monthly fills a missing autopay flag", function () {
  const ctx = boot();
  const doc = snap();
  delete doc.budget.bills[0].autopay;
  delete doc.budget.bills[0].autopay_account;
  doc.budget.bills_monthly = [{ label: "Power", autopay: true, autopay_account: { last4: "2222" } }];
  const page = ctx.bankPageHtml(doc, Object.assign({ tab: "budget", openDay: 12 }, opts));
  assert.match(tile(page, "Power"), /data-bank-autopay-tag="autopay"/);
  assert.match(page, /title="Autopay ··2222"/);
});

test("the autopay switch posts to tiers.json and the tag follows it", async function () {
  const ctx = boot();
  const calls = [];
  ctx.fetch = function (url, init) {
    const method = init && init.method ? String(init.method).toUpperCase() : "GET";
    calls.push({ url: String(url), method: method, body: init && init.body });
    if (method === "POST" && String(url) === "/data/banking/tiers.json") {
      return Promise.resolve({ ok: true, status: 200, type: "basic", json: function () { return Promise.resolve({ ok: true }); } });
    }
    return Promise.resolve({ ok: false, status: 404, type: "basic", json: function () { return Promise.resolve({}); } });
  };
  const el = {
    innerHTML: "",
    listeners: {},
    addEventListener: function (type, fn) { this.listeners[type] = fn; }
  };
  const doc = snap();
  ctx.bankMount(el, doc, Object.assign({ tab: "edits", startupCats: true, tierDoc: doc.tier_doc }, opts));
  await el._bank.prune;
  function change(key, checked) {
    return el.listeners.change({
      target: {
        checked: checked,
        value: "",
        getAttribute: function (name) { return name === "data-bank-autopay" ? key : null; },
        hasAttribute: function () { return false; },
        closest: function () { return null; }
      }
    });
  }
  calls.length = 0;
  await change("stream", true);
  const posts = calls.filter(function (c) { return c.method === "POST"; });
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, "/data/banking/tiers.json");
  assert.equal(JSON.parse(posts[0].body).bill_autopay.stream, true);
  assert.equal(el._bank.data.tier_doc.bill_autopay.stream, true);
  assert.match(el.innerHTML, /data-bank-autopay-tag="autopay"/);
  assert.match(el.innerHTML, /data-bank-autopay="stream" checked/);
  assert.match(el.innerHTML, /data-bank-autopay-reset="stream"/);

  calls.length = 0;
  await el.listeners.click({
    target: {
      closest: function (sel) {
        if (sel === "[data-bank-autopay-reset]") {
          return { getAttribute: function () { return "stream"; } };
        }
        return null;
      }
    },
    preventDefault: function () {}
  });
  const cleared = calls.filter(function (c) { return c.method === "POST"; });
  assert.equal(cleared.length, 1);
  assert.equal(JSON.parse(cleared[0].body).bill_autopay.stream, null);
  assert.equal(Object.prototype.hasOwnProperty.call(el._bank.data.tier_doc.bill_autopay, "stream"), false);
  assert.match(el.innerHTML, /data-bank-autopay-unknown="1"/);
});
