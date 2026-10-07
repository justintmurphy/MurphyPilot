"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const JUSTIN_COLOR = "#08" + "09" + "0B";
const NINA_COLOR = "#1A0A24";

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function headScript(rel) {
  return read(rel).match(/<script>([\s\S]*?)<\/script>/)[1];
}

function runHead(store, rel) {
  const attrs = {};
  const meta = { content: "" };
  const box = store || {};
  const document = {
    documentElement: {
      setAttribute: function (k, v) { attrs[k] = String(v); }
    },
    querySelector: function (sel) {
      if (sel === 'meta[name="theme-color"]') {
        return { setAttribute: function (k, v) { if (k === "content") meta.content = String(v); } };
      }
      return null;
    }
  };
  const localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(box, k) ? box[k] : null; },
    setItem: function () { throw new Error("pre-paint must not write storage"); }
  };
  vm.runInNewContext(headScript(rel || "index.html"), {
    localStorage: localStorage,
    document: document
  });
  return { theme: attrs["data-theme"], color: meta.content };
}

function boot(opts) {
  opts = opts || {};
  const store = opts.store || {};
  const reads = [];
  const writes = [];
  const fetches = [];
  const buttons = [];
  const meta = { content: "" };
  const rootAttrs = {};
  const listeners = {};
  let fetchImpl = opts.fetch;
  if (!fetchImpl) {
    const status = opts.status || 200;
    fetchImpl = function () {
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status: status,
        json: function () {
          if (opts.badJson) return Promise.reject(new Error("not json"));
          const body = Object.prototype.hasOwnProperty.call(opts, "body") ? opts.body : { who: opts.who || null };
          return Promise.resolve(body);
        }
      });
    };
  }
  function makeBtn(attrText) {
    const attrs = {};
    const re = /([\w:-]+)="([^"]*)"/g;
    let found;
    while ((found = re.exec(attrText))) attrs[found[1]] = found[2];
    return {
      attrs: attrs,
      classList: {
        toggle: function (name, on) {
          const parts = String(attrs.class || "").split(/\s+/).filter(Boolean).filter(function (c) { return c !== name; });
          if (on) parts.push(name);
          attrs.class = parts.join(" ");
        }
      },
      getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
      setAttribute: function (k, v) { attrs[k] = String(v); },
      closest: function (sel) {
        if (sel === "[data-theme-choice]") return this;
        if (sel === ".mp-nav" || sel === "#menuBtn") return null;
        return null;
      }
    };
  }
  function takeButtons(html) {
    buttons.length = 0;
    const re = /<button\b([^>]*)>/g;
    let found;
    while ((found = re.exec(html))) {
      if (/data-theme-choice=/.test(found[1])) buttons.push(makeBtn(found[1]));
    }
  }
  function makeEl(id) {
    const el = {
      id: id || "",
      hidden: true,
      _html: "",
      _after: "",
      classList: { toggle: function () {} },
      insertAdjacentHTML: function (pos, html) {
        this._after += html;
        if (id === "main") takeButtons(html);
      },
      insertAdjacentElement: function () {},
      setAttribute: function () {},
      getAttribute: function () { return null; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      closest: function () { return null; },
      focus: function () {}
    };
    Object.defineProperty(el, "innerHTML", {
      get: function () { return this._html; },
      set: function (v) { this._html = String(v); }
    });
    return el;
  }
  const main = makeEl("main");
  const elements = { mpNav: makeEl("mpNav"), main: main, header: makeEl("header") };
  const document = {
    readyState: "complete",
    documentElement: {
      getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(rootAttrs, k) ? rootAttrs[k] : null; },
      setAttribute: function (k, v) { rootAttrs[k] = String(v); }
    },
    getElementById: function (id) { return elements[id] || null; },
    querySelector: function (sel) {
      if (sel === "main") return elements.main;
      if (sel === "header") return elements.header;
      if (sel === "nav.docs-foot") return null;
      if (sel === 'meta[name="theme-color"]') {
        return { setAttribute: function (k, v) { if (k === "content") meta.content = String(v); } };
      }
      return null;
    },
    querySelectorAll: function (sel) {
      if (sel === "[data-theme-choice]") return buttons.slice();
      return [];
    },
    addEventListener: function (type, fn) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    createElement: function () { return makeEl(""); }
  };
  const location = {
    pathname: opts.pathname || "/",
    search: "",
    hash: "",
    replace: function () {}
  };
  const window = {
    document: document,
    location: location,
    fetch: function (url, init) {
      fetches.push({ url: url, init: init });
      return fetchImpl(url, init);
    },
    setTimeout: setTimeout,
    addEventListener: function () {}
  };
  vm.runInNewContext(read("js/nav.js"), {
    window: window,
    document: document,
    location: location,
    history: { state: null, replaceState: function () {} },
    setTimeout: setTimeout,
    Promise: Promise,
    localStorage: {
      getItem: function (k) {
        reads.push(k);
        return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
      },
      setItem: function (k, v) {
        writes.push(k);
        store[k] = String(v);
      }
    },
    console: console
  });
  return {
    store: store,
    reads: reads,
    writes: writes,
    fetches: fetches,
    buttons: buttons,
    meta: meta,
    theme: function () { return rootAttrs["data-theme"] || ""; },
    foot: function () { return elements.main._after; },
    menu: function () { return elements.mpNav._html; },
    click: function (choice) {
      const btn = buttons.filter(function (b) { return b.getAttribute("data-theme-choice") === choice; })[0];
      assert.ok(btn, choice);
      (listeners.click || []).forEach(function (fn) { fn({ target: btn }); });
    },
    pressed: function (choice) {
      const btn = buttons.filter(function (b) { return b.getAttribute("data-theme-choice") === choice; })[0];
      return btn ? btn.getAttribute("aria-pressed") : "";
    },
    chipOn: function (choice) {
      const btn = buttons.filter(function (b) { return b.getAttribute("data-theme-choice") === choice; })[0];
      return btn ? /(^|\s)on(\s|$)/.test(btn.attrs.class || "") : false;
    }
  };
}

function flush() {
  return Promise.resolve().then(function () { return Promise.resolve(); }).then(function () { return Promise.resolve(); });
}

function pickWrites(ctx) {
  return ctx.writes.filter(function (key) { return key.indexOf("murphyPilotThemePick") === 0; });
}

test("both main pages paint from the cached person and ignore old theme keys", function () {
  ["investments/index.html", "pay/index.html", "taxes/index.html"].forEach(function (rel) {
    assert.equal(headScript(rel), headScript("index.html"), rel);
  });
  const script = headScript("index.html");
  assert.doesNotMatch(script, /fetch\(/);
  assert.doesNotMatch(script, /getItem\("murphyPilotTheme"\)/);
  assert.doesNotMatch(script, /getItem\("murphyHouseTheme"\)/);
  assert.match(script, /murphyPilotWho/);
  assert.match(script, /murphyPilotThemePick:/);
  const cases = [
    [{}, "justin", JUSTIN_COLOR],
    [{ murphyPilotWho: "nina" }, "nina", NINA_COLOR],
    [{ murphyPilotWho: "justin", "murphyPilotThemePick:justin": "nina" }, "nina", NINA_COLOR],
    [{ murphyPilotWho: "nina", "murphyPilotThemePick:nina": "justin" }, "justin", JUSTIN_COLOR],
    [{ murphyPilotThemePick: "nina" }, "nina", NINA_COLOR],
    [{ murphyPilotWho: "nina", murphyPilotThemePick: "justin" }, "nina", NINA_COLOR],
    [{ murphyPilotTheme: "nina", murphyHouseTheme: "nina" }, "justin", JUSTIN_COLOR],
    [{ murphyPilotWho: "justin", murphyPilotTheme: "nina", murphyHouseTheme: "purple" }, "justin", JUSTIN_COLOR]
  ];
  cases.forEach(function (row) {
    ["index.html", "investments/index.html", "pay/index.html", "taxes/index.html"].forEach(function (rel) {
      const got = runHead(row[0], rel);
      assert.equal(got.theme, row[1], rel + " " + JSON.stringify(row[0]));
      assert.equal(got.color, row[2], rel);
    });
  });
});

test("the footer switch is on both main pages and absent from the header and menu", async function () {
  ["index.html", "investments/index.html", "pay/index.html", "taxes/index.html"].forEach(function (rel) {
    const html = read(rel);
    const header = html.slice(html.indexOf("<header>"), html.indexOf("</header>"));
    assert.doesNotMatch(header, /data-theme-choice|theme-switch|book-chip/, rel);
    assert.doesNotMatch(html, /data-theme-choice/, rel);
  });
  for (const pathname of ["/", "/investments/", "/pay/", "/taxes/"]) {
    const ctx = boot({ pathname: pathname, who: "justin" });
    await flush();
    assert.doesNotMatch(ctx.menu(), /data-theme-choice/, pathname);
    const foot = ctx.foot();
    assert.match(foot, /class="book-nav-chips" role="group" aria-label="Looks"/);
    assert.match(foot, /class="book-chip[^"]*" data-theme-choice="justin"/);
    assert.match(foot, /class="book-chip[^"]*" data-theme-choice="nina"/);
    if (pathname === "/investments/") {
      assert.ok(foot.indexOf("Agentic / AI WWIII only") < foot.indexOf("data-theme-choice"), pathname);
    } else {
      assert.equal(foot.indexOf("Agentic / AI WWIII only"), -1, pathname);
    }
    assert.equal(ctx.fetches.length, 1);
    assert.equal(ctx.fetches[0].url, "/data/whoami");
    assert.equal(ctx.fetches[0].init.credentials, "same-origin");
    assert.equal(ctx.fetches[0].init.cache, "no-store");
    assert.equal(ctx.fetches[0].init.headers, undefined);
    assert.equal(JSON.stringify(ctx.fetches[0].init).indexOf("Authorization"), -1);
  }
  const nav = read("js/nav.js");
  assert.doesNotMatch(nav, /Authorization/);
  assert.doesNotMatch(nav, /getItem\(\s*"murphyPilotTheme"\s*\)/);
  assert.doesNotMatch(nav, /getItem\(\s*"murphyHouseTheme"\s*\)/);
  assert.match(nav, /LEGACY_KEY = "murphyPilotTheme"/);
  assert.match(nav, /credentials:\s*"same-origin"/);
  assert.match(nav, /"#08090B"/);
  assert.doesNotMatch(nav.replace(/#[0-9A-Fa-f]{3,8}/g, ""), /\d{4,}/);
});

test("a known person uses their own pick, not the other person's", async function () {
  const store = {};
  const justin = boot({ who: "justin", store: store });
  await flush();
  assert.equal(justin.theme(), "justin");
  assert.equal(justin.meta.content, JUSTIN_COLOR);
  assert.deepEqual(pickWrites(justin), []);
  justin.click("nina");
  assert.equal(store["murphyPilotThemePick:justin"], "nina");
  assert.equal(store.murphyPilotThemePick, undefined);
  assert.equal(store["murphyPilotThemePick:nina"], undefined);
  assert.equal(justin.theme(), "nina");
  assert.equal(justin.meta.content, NINA_COLOR);
  assert.equal(justin.pressed("nina"), "true");
  assert.equal(justin.pressed("justin"), "false");
  assert.equal(justin.chipOn("nina"), true);
  assert.equal(justin.chipOn("justin"), false);
  assert.equal(store.murphyPilotTheme, "nina");

  const nina = boot({ who: "nina", store: store });
  await flush();
  assert.equal(nina.theme(), "nina");
  assert.equal(store["murphyPilotThemePick:justin"], "nina");
  nina.click("justin");
  assert.equal(store["murphyPilotThemePick:nina"], "justin");
  assert.equal(store["murphyPilotThemePick:justin"], "nina");
  assert.equal(nina.theme(), "justin");
  assert.equal(nina.meta.content, JUSTIN_COLOR);

  const again = boot({ who: "justin", store: store });
  await flush();
  assert.equal(again.theme(), "nina");
  assert.equal(again.meta.content, NINA_COLOR);
  assert.equal(again.pressed("nina"), "true");
});

test("who null uses the device pick, then the cached person, then justin", async function () {
  const cached = boot({
    status: 401,
    body: { who: null },
    store: { murphyPilotWho: "nina", "murphyPilotThemePick:nina": "justin" }
  });
  await flush();
  assert.equal(cached.theme(), "justin");
  assert.equal(cached.store.murphyPilotWho, "nina");
  assert.deepEqual(pickWrites(cached), []);

  const device = boot({
    status: 401,
    store: { murphyPilotWho: "nina", murphyPilotThemePick: "justin" }
  });
  await flush();
  assert.equal(device.theme(), "justin");
  device.click("nina");
  assert.equal(device.store.murphyPilotThemePick, "nina");
  assert.equal(device.store["murphyPilotThemePick:nina"], undefined);
  assert.equal(device.store["murphyPilotThemePick:justin"], undefined);
  assert.equal(device.theme(), "nina");
  assert.equal(device.meta.content, NINA_COLOR);

  const plain = boot({ status: 404, store: {} });
  await flush();
  assert.equal(plain.theme(), "justin");
  assert.equal(plain.meta.content, JUSTIN_COLOR);
  plain.click("nina");
  assert.equal(plain.store.murphyPilotThemePick, "nina");
});

test("whoami failures fall back to who null without reading old keys", async function () {
  const store = { murphyPilotTheme: "nina", murphyHouseTheme: "nina", murphyPilotWho: "nina" };
  const network = boot({
    store: Object.assign({}, store),
    fetch: function () { return Promise.reject(new Error("offline")); }
  });
  const bad = boot({
    store: Object.assign({}, store),
    status: 200,
    badJson: true
  });
  const missing = boot({
    store: Object.assign({}, store),
    status: 404
  });
  const denied = boot({
    store: store,
    status: 401,
    body: { who: null }
  });
  await flush();
  [network, bad, missing, denied].forEach(function (ctx) {
    assert.equal(ctx.theme(), "nina");
    assert.equal(ctx.buttons.length, 2);
    assert.equal(ctx.reads.indexOf("murphyPilotTheme"), -1);
    assert.equal(ctx.reads.indexOf("murphyHouseTheme"), -1);
    assert.equal(ctx.writes.indexOf("murphyHouseTheme"), -1);
    assert.deepEqual(pickWrites(ctx), []);
  });
  denied.click("justin");
  assert.equal(denied.theme(), "justin");
  assert.equal(denied.store.murphyPilotThemePick, "justin");
  assert.equal(denied.store["murphyPilotThemePick:nina"], undefined);
  assert.equal(denied.meta.content, JUSTIN_COLOR);
});

test("a click while whoami is in flight commits to the person it returns", async function () {
  let release;
  const ctx = boot({
    fetch: function () {
      return new Promise(function (resolve) { release = resolve; });
    }
  });
  assert.equal(ctx.theme(), "justin");
  ctx.click("nina");
  assert.equal(ctx.theme(), "nina");
  assert.equal(ctx.meta.content, NINA_COLOR);
  assert.deepEqual(pickWrites(ctx), []);
  release({
    ok: true,
    status: 200,
    json: function () { return Promise.resolve({ who: "justin" }); }
  });
  await flush();
  assert.equal(ctx.store["murphyPilotThemePick:justin"], "nina");
  assert.equal(ctx.store.murphyPilotThemePick, undefined);
  assert.equal(ctx.store.murphyPilotWho, "justin");
  assert.equal(ctx.theme(), "nina");
  assert.equal(ctx.pressed("nina"), "true");
});

test("a signed-in pick ignores the device pick and old keys", async function () {
  const ctx = boot({
    who: "nina",
    store: {
      murphyPilotTheme: "justin",
      murphyHouseTheme: "justin",
      murphyPilotThemePick: "justin",
      "murphyPilotThemePick:justin": "nina",
      "murphyPilotThemePick:nina": "nina"
    }
  });
  await flush();
  assert.equal(ctx.theme(), "nina");
  assert.equal(ctx.reads.indexOf("murphyPilotTheme"), -1);
  assert.equal(ctx.reads.indexOf("murphyHouseTheme"), -1);
  assert.equal(ctx.store.murphyPilotWho, "nina");
  ctx.click("justin");
  assert.equal(ctx.store["murphyPilotThemePick:nina"], "justin");
  assert.equal(ctx.store.murphyPilotThemePick, "justin");
  assert.equal(ctx.store["murphyPilotThemePick:justin"], "nina");
  assert.equal(ctx.theme(), "justin");
});

test("footer chips reuse the investments book chip rules", function () {
  const css = read("house/house-b.css");
  assert.match(css, /button\.book-chip \{[\s\S]*border-radius:\s*999px/);
  assert.match(css, /button\.book-chip\.on \{[\s\S]*var\(--nav-line\)/);
  assert.match(css, /nav\.docs-foot \.book-nav-chips \{\s*flex-basis:\s*100%;\s*min-width:\s*0;\s*color:\s*var\(--ink\);/);
  assert.match(css, /@media \(max-width: 640px\) \{\s*button\.book-chip \{ font-size: 10px; padding: 5px 8px; \}/);
  assert.doesNotMatch(css, /theme-switch/);
  assert.doesNotMatch(read("house/house-a.css"), /theme-switch/);
  assert.doesNotMatch(read("house/house.css"), /theme-switch/);
  assert.doesNotMatch(read("house/banking.css"), /theme-switch/);
  assert.doesNotMatch(read("house/mix.css"), /theme-switch/);
  assert.doesNotMatch(read("house/js/banking.js"), /bankApplyTheme/);
  assert.doesNotMatch(read("house/js/board-b.js"), /function applyTheme/);
  assert.doesNotMatch(read("house/js/board-b.js"), /setItem\(\s*"murphyPilotTheme"/);
});

test("board-b does not interval the shared clock", function () {
  const src = read("house/js/board-b.js");
  const nav = read("js/nav.js");
  assert.doesNotMatch(src, /function tickClock/);
  assert.doesNotMatch(src, /setInterval\(\s*tickClock/);
  const intervals = src.match(/setInterval\s*\([\s\S]*?\);/g) || [];
  intervals.forEach(function (call) {
    assert.doesNotMatch(call, /tickClock|getElementById\(\s*"clock"\s*\)|printAge/);
  });
  assert.match(src, /id = "printAge"/);
  assert.match(src, /mpPaintPrintAge/);
  assert.match(src, /className = "d"/);
  assert.equal((nav.match(/setInterval\(tickClock/g) || []).length, 1);
  assert.match(nav, /mpPaintPrintAge/);
  assert.match(read("investments/index.html"), /board-b\.js\?v=20261007ei/);
});
