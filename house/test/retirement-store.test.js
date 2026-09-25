"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const storeKey = "murphyHouseRetirement";

/* Synthetic file. Not the saved retirement.json figures. */
function fileA(over) {
  const o = {
    version: 1,
    ssa62: 1000,
    ssa67: 1500,
    ssa70: 2000,
    salary: 80000,
    salary_year: 2026,
    raise_pct: 1,
    emp_pct: 6,
    match_pct: 6,
    filing: "MFJ",
    partb_people: 2,
    birth_ym: "1980-06",
    state_pct: 0,
    real_return_pct: 5,
    inflation_pct: 2.5
  };
  if (over) Object.keys(over).forEach(function (k) { o[k] = over[k]; });
  return o;
}

function boot() {
  const mem = new Map();
  const localStorage = {
    getItem: function (k) { return mem.has(k) ? mem.get(k) : null; },
    setItem: function (k, v) { mem.set(k, String(v)); },
    removeItem: function (k) { mem.delete(k); }
  };
  const location = { hash: "", pathname: "/", search: "" };
  const history = {
    replaceState: function (_s, _t, url) {
      location.hash = "";
      location._url = url;
    }
  };
  const document = {
    addEventListener: function () {},
    removeEventListener: function () {},
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    documentElement: { setAttribute: function () {} }
  };
  const sandbox = {
    localStorage: localStorage,
    document: document,
    location: location,
    history: history,
    console: console,
    atob: atob,
    TextDecoder: TextDecoder,
    fetch: function () { return new Promise(function () {}); },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    navigator: { userAgent: "node" }
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = function () {};
  sandbox.removeEventListener = function () {};
  sandbox.matchMedia = function () {
    return { addEventListener: function () {}, addListener: function () {} };
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/board-a.js"), "utf8"), sandbox, { filename: "board-a.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/board-b.js"), "utf8"), sandbox, { filename: "board-b.js" });
  return sandbox;
}

function useFile(ctx, raw) {
  ctx.RET_SAVED = ctx.retParseSaved(raw);
  assert.ok(ctx.RET_SAVED, "fixture file should parse");
}

function stored(ctx) {
  const raw = ctx.localStorage.getItem(storeKey);
  return raw ? JSON.parse(raw) : null;
}

function seed(ctx, obj) {
  ctx.localStorage.setItem(storeKey, JSON.stringify(obj));
}

function fakeCard(vals) {
  const inputs = {};
  Object.keys(vals).forEach(function (k) {
    inputs[k] = { value: String(vals[k]), setAttribute: function () {}, style: {} };
  });
  return {
    querySelector: function (sel) {
      const m = /data-ret-in="([^"]+)"/.exec(sel);
      if (m) return inputs[m[1]] || { value: "" };
      return null;
    },
    querySelectorAll: function () { return []; },
    inputs: inputs
  };
}

function cardFrom(state, over) {
  const vals = {
    real: state.realPct,
    infl: state.inflPct,
    raise: state.raisePct,
    ee: state.eePct,
    match: state.matchPct,
    extra: state.extraMonthly,
    monthly: "",
    salary: state.salary == null ? "" : state.salary,
    ss62: state.ss62 == null ? "" : state.ss62,
    ss67: state.ss67 == null ? "" : state.ss67,
    ss70: state.ss70 == null ? "" : state.ss70,
    retireAge: state.retireAge,
    filing: state.filing,
    partBPeople: "",
    state: state.statePct,
    extra401k: state.extra401kPct || 0
  };
  if (over) Object.keys(over).forEach(function (k) { vals[k] = over[k]; });
  return fakeCard(vals);
}

test("fresh profile fills SS, salary, and totals from the file", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  assert.equal(ctx.localStorage.getItem(storeKey), null);
  const d = ctx.retLoad();
  assert.equal(d.salary, 80000);
  assert.equal(d.salaryYear, 2026);
  assert.equal(d.ss62, 1000);
  assert.equal(d.ss67, 1500);
  assert.equal(d.ss70, 2000);
  assert.equal(d.birthMonth, 6);
  assert.equal(d.birthYear, 1980);
  assert.equal(d.filing, "mfj");
  assert.equal(d.realPct, 5);
  assert.equal(d.inflPct, 2.5);
  assert.equal(d.partBPeople, null);
  assert.equal(ctx.retPartBCount(d), 2);
  assert.equal(ctx.retSsMonthly(62, d), 1000);
  assert.equal(ctx.retSsMonthly(67, d), 1500);
  assert.equal(ctx.retSsMonthly(70, d), 2000);
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 100 } }
  };
  const view = ctx.retView(d);
  assert.equal(view.ss, 1500);
  assert.ok(view.income != null && isFinite(view.income));
  assert.ok(view.total != null && isFinite(view.total));
  assert.ok(Math.abs(view.total - (view.income + view.ss)) < 0.001);
  assert.equal(ctx.localStorage.getItem(storeKey), null);
  assert.match(ctx.retSavedUrl(), /retirement\.json\?v=20260904bt$/);
});

test("slider touch does not pin salary, so a later file salary shows without Reset", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = { robinhood: { equity: 10000, label: "Robinhood" }, accounts: {}, combined: { cashflow_30d: { owner_deposits: 100 } } };
  let state = ctx.retLoad();
  const card = cardFrom(state, { retireAge: "64", monthly: "100", extra401k: "1.5" });
  state = ctx.retRead(card);
  ctx.retSave(state);
  const saved = stored(ctx);
  assert.ok(saved);
  assert.equal(saved.retireAge, 64);
  assert.equal(saved.extra401kPct, 1.5);
  assert.equal(Object.prototype.hasOwnProperty.call(saved, "salary"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(saved, "salaryYear"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(saved, "ss67"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(saved, "birthYear"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(saved, "monthly"), false);
  assert.deepEqual(saved._edited.slice().sort(), ["extra401kPct", "retireAge"]);
  useFile(ctx, fileA({ salary: 90000, salary_year: 2026 }));
  state = ctx.retLoad();
  assert.equal(state.salary, 90000);
  assert.equal(state.salaryYear, 2026);
  assert.equal(state.retireAge, 64);
  assert.equal(state.extra401kPct, 1.5);
  assert.equal(state.ss67, 1500);
});

test("an explicit salary edit survives a later file change", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  let state = ctx.retLoad();
  state.salary = 123456;
  state.salaryYear = null;
  ctx.retSave(state);
  const saved = stored(ctx);
  assert.equal(saved.salary, 123456);
  assert.equal(saved.salaryYear, null);
  assert.ok(saved._edited.indexOf("salary") >= 0);
  assert.ok(saved._edited.indexOf("salaryYear") >= 0);
  useFile(ctx, fileA({ salary: 90000 }));
  state = ctx.retLoad();
  assert.equal(state.salary, 123456);
  assert.equal(state.salaryYear, null);
  assert.equal(state.ss62, 1000);
});

test("old null blob and old full snapshot both fill from the file", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  seed(ctx, { ss62: null, ss67: null, ss70: null, salary: null, monthly: null });
  let state = ctx.retLoad();
  assert.equal(state.ss62, 1000);
  assert.equal(state.ss67, 1500);
  assert.equal(state.ss70, 2000);
  assert.equal(state.salary, 80000);
  assert.equal(state.salaryYear, 2026);
  assert.equal(state.monthly, null);
  assert.equal(ctx.localStorage.getItem(storeKey), null);

  seed(ctx, {
    realPct: 5, inflPct: 2.5, raisePct: 1, eePct: 6, matchPct: 6,
    extraMonthly: 0, monthly: null, salary: 55555, salaryYear: 2020,
    ss62: null, ss67: null, ss70: null,
    retireAge: 67, birthMonth: 6, birthYear: 1980,
    filing: "mfj", statePct: 0, partBPeople: 2, extra401kPct: 0
  });
  state = ctx.retLoad();
  assert.equal(state.salary, 80000);
  assert.equal(state.salaryYear, 2026);
  assert.equal(state.ss67, 1500);
  assert.equal(state.retireAge, 67);
  assert.equal(state.birthYear, 1980);
  assert.equal(state.partBPeople, null);
  assert.equal(ctx.retPartBCount(state), 2);
  assert.equal(ctx.localStorage.getItem(storeKey), null);

  seed(ctx, {
    realPct: 5, inflPct: 2.5, raisePct: 1, eePct: 6, matchPct: 6, statePct: 0,
    extraMonthly: 0, salary: 55555, salaryYear: 2020,
    ss62: 1000, ss67: 1500, ss70: 2000,
    retireAge: 64, birthMonth: 6, birthYear: 1980,
    filing: "mfj", partBPeople: 2, extra401kPct: 0, monthly: null
  });
  state = ctx.retLoad();
  assert.equal(state.retireAge, 64);
  assert.equal(state.salary, 80000);
  assert.equal(state.ss67, 1500);
  let blob = stored(ctx);
  assert.deepEqual(blob._edited, ["retireAge"]);
  useFile(ctx, fileA({ salary: 90000, ssa67: 1600 }));
  state = ctx.retLoad();
  assert.equal(state.salary, 90000);
  assert.equal(state.ss67, 1600);
  assert.equal(state.retireAge, 64);

  seed(ctx, {
    salary: 55555, ss67: 3333, ss62: null, ss70: "",
    birthMonth: 7, birthYear: 1971, realPct: 4
  });
  state = ctx.retLoad();
  assert.equal(state.salary, 90000);
  assert.equal(state.ss67, 3333);
  assert.equal(state.ss62, 1000);
  assert.equal(state.ss70, 2000);
  assert.equal(state.birthMonth, 7);
  assert.equal(state.birthYear, 1971);
  assert.equal(state.realPct, 4);
  blob = stored(ctx);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "salary"), false);
  assert.ok(blob._edited.indexOf("ss67") >= 0);
  assert.ok(blob._edited.indexOf("birthYear") >= 0);
});

test("legacy single ss field migrates and a numeric override wins", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  seed(ctx, { ss: 3333 });
  let state = ctx.retLoad();
  assert.equal(state.ss67, 3333);
  assert.equal(state.ss62, 1000);
  assert.ok(stored(ctx)._edited.indexOf("ss67") >= 0);

  seed(ctx, { ss62: 2222, _edited: ["ss62"] });
  state = ctx.retLoad();
  assert.equal(state.ss62, 2222);
  assert.equal(state.ss67, 1500);
  assert.equal(state.salary, 80000);
});

test("clearing a file-backed input reverts to the default", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = { accounts: {}, combined: {} };
  let state = ctx.retLoad();
  state.salary = 123456;
  state.salaryYear = null;
  ctx.retSave(state);
  const card = cardFrom(ctx.retLoad(), { salary: "" });
  ctx.retCommit(card);
  state = ctx.retLoad();
  assert.equal(state.salary, 80000);
  assert.equal(state.salaryYear, 2026);
  assert.equal(card.inputs.salary.value, "80000");
  assert.equal(ctx.localStorage.getItem(storeKey), null);
});

test("Part B follows filing unless this browser set it", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  let state = ctx.retLoad();
  assert.equal(ctx.retPartBCount(state), 2);
  state.filing = "single";
  ctx.retSave(state);
  state = ctx.retLoad();
  assert.equal(state.filing, "single");
  assert.equal(state.partBPeople, null);
  assert.equal(ctx.retPartBCount(state), 1);
  const blob = stored(ctx);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "partBPeople"), false);
  assert.ok(blob._edited.indexOf("filing") >= 0);
  state.partBPeople = 2;
  ctx.retSave(state);
  state = ctx.retLoad();
  assert.equal(state.partBPeople, 2);
  assert.equal(ctx.retPartBCount(state), 2);
  useFile(ctx, fileA({ partb_people: 1 }));
  state = ctx.retLoad();
  assert.equal(ctx.retPartBCount(state), 2);

  ctx.retClear();
  useFile(ctx, fileA());
  state = ctx.retLoad();
  state.partBPeople = 1;
  ctx.retSave(state);
  state = ctx.retLoad();
  assert.equal(state.partBPeople, 1);
  state.filing = "single";
  ctx.retSave(state);
  state = ctx.retLoad();
  assert.equal(state.partBPeople, 1);
  assert.equal(ctx.retPartBCount(state), 1);
  state.filing = "mfj";
  ctx.retSave(state);
  state = ctx.retLoad();
  assert.equal(state.partBPeople, 1);
  assert.equal(ctx.retPartBCount(state), 1);
  state.partBPeople = 2;
  ctx.retSave(state);
  state = ctx.retLoad();
  assert.equal(state.partBPeople, null);
  assert.equal(ctx.retPartBCount(state), 2);
});

test("Reset to saved clears every override", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  let state = ctx.retLoad();
  state.salary = 123456;
  state.salaryYear = null;
  state.retireAge = 64;
  state.ss62 = 2222;
  state.filing = "single";
  state.partBPeople = 2;
  ctx.retSave(state);
  assert.ok(ctx.localStorage.getItem(storeKey));
  ctx.retClear();
  assert.equal(ctx.localStorage.getItem(storeKey), null);
  state = ctx.retLoad();
  assert.equal(state.salary, 80000);
  assert.equal(state.salaryYear, 2026);
  assert.equal(state.retireAge, 67);
  assert.equal(state.ss62, 1000);
  assert.equal(state.filing, "mfj");
  assert.equal(state.partBPeople, null);
  assert.equal(ctx.retPartBCount(state), 2);
});

test("#ret= prefill merges as explicit overrides and strips the hash", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  seed(ctx, {
    salary: 55555, ss62: null, ss67: null, ss70: null,
    realPct: 5, retireAge: 67, filing: "mfj"
  });
  const payload = Buffer.from(JSON.stringify({
    ssa67: 1800,
    salary: 66000,
    filing: "single",
    birth_ym: "1981-03",
    partb: 2
  })).toString("base64url");
  ctx.location.hash = "#ret=" + payload;
  ctx.retConsumeRetHash();
  assert.equal(ctx.location.hash, "");
  const state = ctx.retLoad();
  assert.equal(state.ss67, 1800);
  assert.equal(state.salary, 66000);
  assert.equal(state.salaryYear, null);
  assert.equal(state.filing, "single");
  assert.equal(state.birthYear, 1981);
  assert.equal(state.birthMonth, 3);
  assert.equal(ctx.retPartBCount(state), 2);
  const blob = stored(ctx);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "ss62"), false);
  assert.ok(blob._edited.indexOf("salary") >= 0);
  assert.equal(blob.retireAge, undefined);
});
