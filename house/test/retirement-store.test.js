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
    state: "PA",
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

/* Small synthetic federal table. Not the shipped brackets. */
function federalFixture(over) {
  const o = {
    tax_year: 2026,
    source: "IRS / CMS",
    checked: "2026-09-25",
    brackets: {
      single: [
        { up_to: 10000, rate: 0.1 },
        { up_to: null, rate: 0.2 }
      ],
      mfj: [
        { up_to: 20000, rate: 0.1 },
        { up_to: null, rate: 0.2 }
      ]
    },
    standard_deduction: { single: 5000, mfj: 10000 },
    additional_deduction_65: { single: 1000, mfj: 800 },
    ss_thresholds: { single: [25000, 34000], mfj: [32000, 44000], unindexed: true },
    part_b_monthly: 100,
    deferral_limit: 20000,
    catchup_50: 5000,
    catchup_60_63: 7000
  };
  if (over) Object.keys(over).forEach(function (k) { o[k] = over[k]; });
  return o;
}

function taxRules(over) {
  const o = {
    version: 1,
    tax_year: 2026,
    state: "PA",
    pit_rate: 0.0307,
    retirement_401k_exempt_after_59_5: true,
    ss_exempt: true,
    employee_401k_contrib_state_deductible: false,
    source: "PA Department of Revenue",
    checked: "2026-09-25",
    federal: federalFixture()
  };
  if (over) Object.keys(over).forEach(function (k) { o[k] = over[k]; });
  return o;
}

function textCard() {
  const els = {};
  function el(name) {
    if (!els[name]) {
      els[name] = {
        textContent: "",
        innerHTML: "",
        hidden: false,
        value: "0",
        style: {},
        setAttribute: function (k, v) {
          this[k] = v;
          if (k === "hidden") this.hidden = true;
        },
        removeAttribute: function (k) {
          if (k === "hidden") this.hidden = false;
        },
        getAttribute: function (k) { return this[k]; }
      };
    }
    return els[name];
  }
  return {
    els: els,
    querySelector: function (sel) {
      const named = /data-ret="([^"]+)"/.exec(sel);
      if (named) return el(named[1]);
      const input = /data-ret-in="([^"]+)"/.exec(sel);
      if (input) return el("in:" + input[1]);
      return null;
    },
    querySelectorAll: function () { return []; }
  };
}

test("retirement draw at 67 and Social Security are state-tax exempt", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  const parsed = ctx.retParseTax(taxRules());
  assert.ok(parsed);
  ctx.RET_TAX = parsed;
  const summary = ctx.retTaxSummary();
  assert.equal(summary.line, "PA 3.07% (retirement income exempt)");
  assert.equal(summary.asof, "checked 2026-09-25");
  assert.match(ctx.retTaxUrl(), /tax-rules\.json\?v=20260904bt$/);
  assert.match(String(ctx.retFetchJson), /no-store/);

  const state = ctx.retLoad();
  const draw = 2000;
  const ss = 800;
  const years = 15;
  const exempt = ctx.retTakeHome(draw, ss, state, years, 67);
  assert.equal(ctx.retStateTax(draw * 12, ss * 12, 67), 0);

  ctx.RET_TAX = ctx.retParseTax(taxRules({ retirement_401k_exempt_after_59_5: false }));
  const taxedDraw = ctx.retTakeHome(draw, ss, state, years, 67);
  assert.ok(Math.abs((exempt - taxedDraw) - draw * parsed.pitRate) < 0.02);

  ctx.RET_TAX = ctx.retParseTax(taxRules({ ss_exempt: false }));
  const taxedSs = ctx.retTakeHome(draw, ss, state, years, 67);
  assert.ok(Math.abs((exempt - taxedSs) - ss * parsed.pitRate) < 0.02);

  ctx.RET_TAX = ctx.retParseTax(taxRules());
  const youngTax = ctx.retStateTax(draw * 12, 0, 55);
  assert.ok(Math.abs(youngTax - draw * 12 * parsed.pitRate) < 0.02);
});

test("extra 401k cost keeps the state rate when contributions are not deductible", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 100 } }
  };
  const state = ctx.retLoad();
  state.extra401kPct = 2;
  state.retireAge = 67;
  const view = ctx.retView(state);
  const parsed = ctx.retParseTax(taxRules());
  ctx.RET_TAX = parsed;
  const plain = ctx.retExtra401k(state, view);
  ctx.RET_TAX = ctx.retParseTax(taxRules({ employee_401k_contrib_state_deductible: true }));
  const ded = ctx.retExtra401k(state, view);
  const salary = ctx.retSalaryNow(state);
  const limit = ctx.retDeferralLimit(state.birthYear, ctx.retTodayNy().year);
  const extraPct = plain.extraPct;
  const baseEmp = Math.min(salary * (state.eePct / 100), limit);
  const withEmp = Math.min(salary * ((state.eePct + extraPct) / 100), limit);
  const extraAnnual = Math.max(0, withEmp - baseEmp);
  const marginal = ctx.retMarginalRate(salary - parsed.federal.standardDeduction.mfj, "mfj");
  const federalOnly = extraAnnual / 12 * (1 - marginal);
  const reduced = extraAnnual / 12 * Math.max(0, 1 - marginal - parsed.pitRate);
  assert.ok(extraAnnual > 0);
  assert.ok(Math.abs(plain.cost - federalOnly) < 0.05);
  assert.ok(Math.abs(ded.cost - reduced) < 0.05);
  assert.ok(Math.abs((plain.cost - ded.cost) - (extraAnnual / 12 * parsed.pitRate)) < 0.05);
});

test("missing or malformed tax rules add no state tax and no line", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  assert.equal(ctx.retParseTax(null), null);
  assert.equal(ctx.retParseTax({ version: 2, state: "PA", pit_rate: 0.0307, retirement_401k_exempt_after_59_5: true, ss_exempt: true, employee_401k_contrib_state_deductible: false }), null);
  assert.equal(ctx.retParseTax({ version: 1, state: "PA" }), null);
  ctx.RET_TAX = null;
  assert.equal(ctx.retTaxSummary(), null);
  const state = ctx.retLoad();
  assert.equal(ctx.retTakeHome(2000, 800, state, 15, 67), null);
  assert.equal(ctx.retStateTax(24000, 9600, 67), 0);
  assert.equal(ctx.retFederalRulesLine(), "");
});

test("old state percent blobs are dropped", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.RET_TAX = ctx.retParseTax(taxRules());
  const state = ctx.retLoad();
  const before = ctx.retTakeHome(2000, 800, state, 15, 67);
  seed(ctx, { statePct: 8, state_pct: 8, _edited: ["statePct", "state_pct", "retireAge"], retireAge: 64 });
  const loaded = ctx.retLoad();
  assert.equal(loaded.retireAge, 64);
  const blob = stored(ctx);
  assert.ok(blob);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "statePct"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "state_pct"), false);
  assert.deepEqual(blob._edited, ["retireAge"]);
  assert.equal(ctx.retTakeHome(2000, 800, loaded, 15, 67), before);
  seed(ctx, { statePct: 8, state_pct: 5, salary: null, ss62: null, ss67: null, ss70: null });
  const again = ctx.retLoad();
  assert.equal(again.salary, 80000);
  assert.equal(ctx.localStorage.getItem(storeKey), null);
});

test("brackets and the standard deduction come from the file", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  const state = ctx.retLoad();
  state.inflPct = 0;
  function take(federal) {
    ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: federal }));
    return ctx.retTakeHome(5000, 0, state, 0, 60);
  }
  const baseFed = federalFixture();
  const base = take(baseFed);
  const wider = federalFixture();
  wider.standard_deduction = { single: 5000, mfj: 40000 };
  const withWider = take(wider);
  const steeper = federalFixture();
  steeper.brackets = {
    single: baseFed.brackets.single,
    mfj: [
      { up_to: 20000, rate: 0.1 },
      { up_to: null, rate: 0.5 }
    ]
  };
  const withSteeper = take(steeper);
  assert.ok(base > 0 && withWider > base);
  assert.ok(withSteeper < base);
  const shipped = ctx.retParseTax(JSON.parse(fs.readFileSync(path.join(root, "house/tax-rules.json"), "utf8")));
  assert.equal(shipped.federal.standardDeduction.single, 16100);
  assert.equal(shipped.federal.standardDeduction.mfj, 32200);
  assert.equal(shipped.federal.brackets.single.length, 7);
  assert.equal(shipped.federal.brackets.mfj[6].upTo, null);
  assert.equal(shipped.federal.brackets.mfj[6].rate, 0.37);
  ctx.RET_TAX = shipped;
  assert.equal(ctx.retFederalRulesLine(), "Tax rules: 2026 (checked Sep 25)");
});

test("super catch-up applies at age 61", function () {
  const ctx = boot();
  const raw = JSON.parse(fs.readFileSync(path.join(root, "house/tax-rules.json"), "utf8"));
  ctx.RET_TAX = ctx.retParseTax(raw);
  const fed = ctx.RET_TAX.federal;
  const year = 2026;
  assert.equal(fed.catchup6063, 11250);
  assert.equal(ctx.retDeferralLimit(year - 61, year), fed.deferralLimit + fed.catchup6063);
  assert.equal(ctx.retDeferralLimit(year - 60, year), fed.deferralLimit + fed.catchup6063);
  assert.equal(ctx.retDeferralLimit(year - 63, year), fed.deferralLimit + fed.catchup6063);
  assert.equal(ctx.retDeferralLimit(year - 59, year), fed.deferralLimit + fed.catchup50);
  assert.equal(ctx.retDeferralLimit(year - 64, year), fed.deferralLimit + fed.catchup50);
  assert.equal(ctx.retDeferralLimit(year - 49, year), fed.deferralLimit);
  raw.federal.catchup_60_63 = 11111;
  ctx.RET_TAX = ctx.retParseTax(raw);
  assert.equal(ctx.retDeferralLimit(year - 61, year), raw.federal.deferral_limit + 11111);
});

test("a missing federal block dashes take-home, extra 401k cost, and the cap", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 100 } }
  };
  const rules = taxRules();
  delete rules.federal;
  ctx.RET_TAX = ctx.retParseTax(rules);
  assert.ok(ctx.RET_TAX);
  assert.equal(ctx.RET_TAX.federal, null);
  assert.equal(ctx.retTaxSummary().line, "PA 3.07% (retirement income exempt)");
  const state = ctx.retLoad();
  state.extra401kPct = 2;
  assert.equal(ctx.retTakeHome(2000, 800, state, 15, 67), null);
  assert.equal(ctx.retDeferralLimit(state.birthYear, 2026), null);
  const view = ctx.retView(state);
  assert.equal(view.take, null);
  const extra = ctx.retExtra401k(state, view);
  assert.equal(extra.cost, null);
  assert.equal(extra.capKnown, false);
  const card = textCard();
  ctx.retFill(card, state);
  assert.equal(card.els.take.textContent, "\u2014");
  assert.equal(card.els["extra401k-cap"].textContent, "\u2014");
  assert.equal(card.els["extra401k-cap"].hidden, false);
  assert.match(card.els["extra401k-stats"].innerHTML, /Paycheck cost <b>\u2014\/mo<\/b>/);
  assert.equal(card.els["tax-rules"].textContent, "");
  assert.equal(card.els["tax-rules"].hidden, true);
  assert.equal(card.els["partb-hint"].textContent.indexOf("$"), -1);
  const broken = taxRules({ federal: { tax_year: 2026 } });
  ctx.RET_TAX = ctx.retParseTax(broken);
  assert.equal(ctx.RET_TAX.federal, null);
  assert.equal(ctx.retTakeHome(2000, 800, state, 15, 67), null);
});

test("Social Security thresholds come from the file", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  const state = ctx.retLoad();
  state.inflPct = 0;
  function taxable(thresholds, unindexed, deflator) {
    const federal = federalFixture({
      ss_thresholds: {
        single: thresholds,
        mfj: thresholds,
        unindexed: unindexed
      }
    });
    ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: federal }));
    return ctx.retTaxableSs(30000, 10000, "mfj", deflator);
  }
  const open = taxable([900000, 950000], true, 1);
  const tight = taxable([1000, 2000], true, 1);
  assert.equal(open, 0);
  assert.ok(tight > 0);
  const deflated = taxable([40000, 50000], true, 2);
  const indexed = taxable([40000, 50000], false, 2);
  assert.equal(indexed, 0);
  assert.ok(deflated > 0);
  const highTake = ctx.retTakeHome(2000, 1000, state, 0, 60);
  ctx.RET_TAX = ctx.retParseTax(taxRules({
    federal: federalFixture({
      ss_thresholds: { single: [1, 2], mfj: [1, 2], unindexed: true }
    })
  }));
  const lowTake = ctx.retTakeHome(2000, 1000, state, 0, 60);
  assert.ok(highTake > lowTake);
});

test("an old raise without an edit marker does not override the file", function () {
  const ctx = boot();
  useFile(ctx, fileA({ raise_pct: 4 }));
  seed(ctx, { raisePct: 1, raise_pct: 9, salary: 55555, realPct: 4 });
  let state = ctx.retLoad();
  assert.equal(state.raisePct, 4);
  assert.equal(state.salary, 80000);
  assert.equal(state.realPct, 4);
  let blob = stored(ctx);
  assert.ok(blob);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "raisePct"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "raise_pct"), false);
  assert.deepEqual(blob._edited, ["realPct"]);

  seed(ctx, { raisePct: 7, _edited: ["raisePct"] });
  useFile(ctx, fileA({ raise_pct: 4 }));
  state = ctx.retLoad();
  assert.equal(state.raisePct, 7);
  blob = stored(ctx);
  assert.equal(blob.raisePct, 7);
});

test("real growth hint shows nominal return from the file inflation", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  assert.equal(ctx.retNominalHint(5), "5% real \u2248 7.6%/yr at 2.5% inflation");
  assert.equal(ctx.retNominalHint(6), "6% real \u2248 8.7%/yr at 2.5% inflation");
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 100 } }
  };
  assert.match(ctx.retirementHtml(), /Growth after inflation \(real\) %/);
  assert.match(ctx.retirementHtml(), /data-ret="real-hint"/);
  const state = ctx.retLoad();
  const card = textCard();
  ctx.retFill(card, state);
  assert.equal(card.els["real-hint"].textContent, "5% real \u2248 7.6%/yr at 2.5% inflation");
  state.realPct = 6;
  state.inflPct = 9;
  ctx.retFill(card, state);
  assert.equal(card.els["real-hint"].textContent, "6% real \u2248 8.7%/yr at 2.5% inflation");
});

test("total line says stocks plus 401k plus Social Security", function () {
  const ctx = boot();
  const both = ctx.retTotalCopy(1000, 250);
  assert.equal(both.sub, "stocks + 401k + SS");
  assert.equal(both.split, "$1,000.00 savings + $250.00 SS");
  const nestOnly = ctx.retTotalCopy(1000, null);
  assert.equal(nestOnly.sub, "stocks + 401k");
  assert.equal(nestOnly.split, "");
});
