"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "example-truthifi.json"), "utf8"));
const house = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "example-house.json"), "utf8"));

function jsonRes(body, status) {
  const code = status == null ? 200 : status;
  const text = body == null ? "" : (typeof body === "string" ? body : JSON.stringify(body));
  return {
    ok: code >= 200 && code < 300,
    status: code,
    type: "basic",
    text: function () { return Promise.resolve(text); },
    json: function () { return Promise.resolve(typeof body === "string" ? null : body); }
  };
}

function makeEl(id) {
  return {
    id: id,
    innerHTML: "",
    textContent: "",
    style: {},
    className: "",
    hidden: false,
    classList: {
      add: function () {},
      remove: function () {},
      toggle: function () { return false; },
      contains: function () { return false; }
    },
    setAttribute: function () {},
    removeAttribute: function () {},
    getAttribute: function () { return null; },
    appendChild: function () {},
    insertAdjacentHTML: function (where, html) {
      if (where === "afterbegin") this.innerHTML = html + this.innerHTML;
      else this.innerHTML += html;
    },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
}

function boot(store) {
  const els = {};
  const document = {
    addEventListener: function () {},
    removeEventListener: function () {},
    getElementById: function (id) {
      if (!els[id]) els[id] = makeEl(id);
      return els[id];
    },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    documentElement: { setAttribute: function () {}, getAttribute: function () { return ""; } },
    title: "",
    body: makeEl("body")
  };
  const bag = store || {};
  const sandbox = {
    localStorage: {
      getItem: function () { return null; },
      setItem: function () {},
      removeItem: function () {}
    },
    sessionStorage: {
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : null; },
      setItem: function (key, value) { bag[key] = String(value); },
      removeItem: function (key) { delete bag[key]; }
    },
    document: document,
    location: { hash: "", pathname: "/investments/", search: "" },
    history: { replaceState: function () {} },
    console: console,
    fetch: function () { return new Promise(function () {}); },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    navigator: { userAgent: "node" },
    Intl: Intl,
    Date: Date,
    Promise: Promise
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = function () {};
  sandbox.removeEventListener = function () {};
  sandbox.matchMedia = function () {
    return { matches: false, addEventListener: function () {}, addListener: function () {} };
  };
  vm.createContext(sandbox);
  ["house/js/board-a.js", "house/js/board-b.js", "house/js/board-c.js"].forEach(function (rel) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, { filename: rel });
  });
  sandbox._els = els;
  sandbox._bag = bag;
  return sandbox;
}

function installFetch(ctx, truthifiRes) {
  const calls = [];
  ctx.fetch = function (url, init) {
    const u = String(url);
    calls.push({ url: u, init: init || {} });
    if (u.indexOf("/data/house/truthifi-snapshot.json") === 0) return Promise.resolve(truthifiRes);
    if (u.indexOf("/house/house-snapshot.json") === 0) return Promise.resolve(jsonRes(house));
    if (u.indexOf("/pilot-snapshot.json") === 0) return Promise.resolve(jsonRes(null, 404));
    return Promise.resolve(jsonRes({}, 404));
  };
  return calls;
}

function settle() {
  return new Promise(function (resolve) { setTimeout(resolve, 30); });
}

test("the custodial print is requested like the banking snapshot", async function () {
  const ctx = boot();
  const calls = installFetch(ctx, jsonRes(fixture));
  ctx.load();
  await settle();
  const hit = calls.filter(function (c) { return c.url.indexOf("/data/house/truthifi-snapshot.json") === 0; });
  assert.equal(hit.length, 1);
  assert.match(hit[0].url, /^\/data\/house\/truthifi-snapshot\.json\?v=\d+$/);
  assert.equal(hit[0].init.credentials, "include");
  assert.equal(hit[0].init.cache, "no-store");
  assert.equal(hit[0].init.redirect, "manual");
  assert.equal(hit[0].init.headers.Accept, "application/json");
  assert.equal(hit[0].init.headers["Cache-Control"], "no-cache");
  assert.equal(calls.some(function (c) {
    return c.url.indexOf("truthifi-snapshot.json") >= 0 && c.url.indexOf("/data/house/truthifi-snapshot.json") !== 0;
  }), false);
  assert.equal(ctx.snap.truthifiFail, "");
  assert.equal(ctx.snap.truthifi.accounts.fidelity.names[0].symbol, "SYM1");
  ctx.tab = "fidelity";
  assert.doesNotMatch(ctx.fidelityDeskHtml(), /data-invest-gate/);
});

test("a locked or missing print stays blank and does not reuse the last good copy", async function () {
  const cases = [
    { name: "401", res: jsonRes("", 401), kind: "gate" },
    { name: "403", res: jsonRes("", 403), kind: "gate" },
    { name: "redirect", res: { ok: false, status: 0, type: "opaqueredirect", text: function () { return Promise.resolve("<html>"); }, json: function () { return Promise.resolve(null); } }, kind: "gate" },
    { name: "404", res: jsonRes("", 404), kind: "missing" },
    { name: "empty object", res: jsonRes({}), kind: "missing" },
    { name: "login html", res: jsonRes("<html>sign in</html>", 200), kind: "gate" }
  ];
  for (const item of cases) {
    const bag = {};
    bag.murphyTruthifiLastGood = JSON.stringify(fixture);
    const ctx = boot(bag);
    installFetch(ctx, item.res);
    ctx.load();
    await settle();
    assert.equal(ctx.snap.truthifiFail, item.kind, item.name);
    assert.equal(ctx.snap.truthifiHeld, false, item.name);
    assert.equal(ctx.snap.truthifi, undefined, item.name);
    ctx.tab = "combined";
    const desk = ctx._els.desk.innerHTML;
    assert.match(desk, new RegExp('data-invest-gate="' + item.kind + '"'), item.name);
    assert.doesNotMatch(desk, /SYM1/, item.name);
    ctx.tab = "fidelity";
    const fid = ctx.fidelityDeskHtml();
    assert.match(fid, /data-invest-gate="/);
    assert.doesNotMatch(fid, /SYM1/, item.name);
    if (item.kind === "gate") assert.match(fid, /Investments are locked/);
    if (item.kind === "missing") assert.match(fid, /No investments print/);
  }
});

test("a broken print can keep the last good copy, and a network miss says the feed is unavailable", async function () {
  const bag = {};
  bag.murphyTruthifiLastGood = JSON.stringify(fixture);
  const broken = boot(bag);
  installFetch(broken, jsonRes("{", 200));
  broken.load();
  await settle();
  assert.equal(broken.snap.truthifiFail, "broken");
  assert.equal(broken.snap.truthifiHeld, true);
  assert.equal(broken.snap.truthifi.accounts.fidelity.cash, 6);

  const down = boot();
  down.fetch = function (url) {
    const u = String(url);
    if (u.indexOf("/data/house/truthifi-snapshot.json") === 0) return Promise.reject(new Error("offline"));
    if (u.indexOf("/house/house-snapshot.json") === 0) return Promise.resolve(jsonRes(house));
    return Promise.resolve(jsonRes(null, 404));
  };
  down.load();
  await settle();
  assert.equal(down.snap.truthifiFail, "unavailable");
  assert.equal(down.snap.truthifiHeld, false);
  down.tab = "fidelity";
  assert.match(down.fidelityDeskHtml(), /Truthifi unavailable/);
  assert.doesNotMatch(down.fidelityDeskHtml(), /SYM1/);
});
