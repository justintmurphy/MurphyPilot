"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const navPath = path.join(root, "js/nav.js");
const RET = Buffer.from('{"filing":"single"}').toString("base64url");

const HOUSE_HASHES = [
  ["#house", "#house"],
  ["#combined", "#house"],
  ["#robinhood", "#robinhood"],
  ["#agentic", "#agentic"],
  ["#individual", "#individual"],
  ["#auto_grok", "#auto_grok"],
  ["#joint", "#joint"],
  ["#fidelity", "#fidelity"],
  ["#fid-bny", "#fid-bny"],
  ["#fid-per", "#fid-per"],
  ["#fid-roth", "#fid-roth"],
  ["#fid-trad", "#fid-trad"],
  ["#fid-espp", "#fid-espp"],
  ["#fid-rsu", "#fid-rsu"],
  ["#fid-high", "#fid-high"],
  ["#fid-custom", "#fid-custom"],
  ["#voya", "#voya"],
  ["#ret=" + RET, "#ret=" + RET],
  ["#nonsense", "#nonsense"]
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function runStub(rel, search, hash) {
  const html = read(rel);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const replaced = [];
  const location = {
    search: search || "",
    hash: hash || "",
    replace: function (url) { replaced.push(url); }
  };
  vm.runInNewContext(script, { location: location });
  const scriptAt = html.indexOf("<script>");
  const metaAt = html.indexOf('http-equiv="refresh"');
  assert.ok(scriptAt >= 0 && scriptAt < metaAt, rel + " runs the script before the meta refresh");
  assert.match(html, /noindex, nofollow/);
  assert.match(html, /rel="canonical" href="https:\/\/www\.murphysbn\.com/);
  assert.match(html, /location\.replace/);
  assert.equal(replaced.length, 1);
  return replaced[0];
}

function bootNav(opts) {
  opts = opts || {};
  const elements = {};
  function makeEl(id) {
    const el = {
      id: id || "",
      hidden: false,
      className: "",
      attrs: {},
      _html: "",
      _after: "",
      _afterNode: null,
      classList: { toggle: function () {} },
      insertAdjacentHTML: function (pos, html) { this._after += html; },
      insertAdjacentElement: function (pos, node) {
        this._afterNode = node;
        if (node && node.id) elements[node.id] = node;
      },
      setAttribute: function (k, v) { this.attrs[k] = String(v); },
      getAttribute: function (k) {
        return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null;
      },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      closest: function () { return null; },
      focus: function () { this._focused = (this._focused || 0) + 1; }
    };
    Object.defineProperty(el, "innerHTML", {
      get: function () { return this._html; },
      set: function (v) {
        this._html = String(v);
        const nav = /<nav id="tabs"[^>]*>([\s\S]*?)<\/nav>/.exec(this._html);
        if (nav) {
          if (!elements.tabs) elements.tabs = makeEl("tabs");
          elements.tabs._html = nav[1];
        }
        if (/id="deskMenu"/.test(this._html) && !elements.deskMenu) {
          elements.deskMenu = makeEl("deskMenu");
          elements.deskMenu.hidden = true;
        }
        if (/id="menuBtn"/.test(this._html) && !elements.menuBtn) elements.menuBtn = makeEl("menuBtn");
      }
    });
    if (id) elements[id] = el;
    return el;
  }
  elements.mpNav = makeEl("mpNav");
  elements.main = makeEl("main");
  elements.header = makeEl("header");
  if (opts.withTicker) {
    elements["mp-ticker"] = makeEl("mp-ticker");
    elements["mp-ticker"].hidden = true;
    elements["mp-ticker"].className = "mp-ticker-slot";
  }
  const listeners = {};
  const windowListeners = {};
  const replaced = [];
  const stated = [];
  const location = {
    pathname: opts.pathname || "/",
    search: opts.search || "",
    hash: opts.hash || "",
    replace: function (url) { replaced.push(url); }
  };
  const history = {
    state: { kept: true },
    replaceState: function (state, title, url) { this.state = state; stated.push(url); }
  };
  const document = {
    readyState: opts.readyState || "complete",
    documentElement: (function () {
      var attrs = { "data-theme": opts.theme || "justin" };
      return {
        getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
        setAttribute: function (k, v) { attrs[k] = String(v); }
      };
    })(),
    getElementById: function (id) { return elements[id] || null; },
    querySelector: function (sel) {
      if (sel === "main") return elements.main;
      if (sel === "header") return elements.header;
      if (sel === "nav.docs-foot") return null;
      return null;
    },
    querySelectorAll: function () { return []; },
    addEventListener: function (type, fn) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    createElement: function () { return makeEl(""); }
  };
  const window = {
    document: document,
    location: location,
    setTimeout: setTimeout,
    addEventListener: function (type, fn) {
      if (!windowListeners[type]) windowListeners[type] = [];
      windowListeners[type].push(fn);
    }
  };
  vm.runInNewContext(read("js/nav.js"), {
    window: window,
    document: document,
    location: location,
    history: history,
    setTimeout: setTimeout,
    console: console
  });
  return {
    elements: elements,
    listeners: listeners,
    windowListeners: windowListeners,
    replaced: replaced,
    stated: stated,
    location: location,
    history: history,
    MPNav: window.MPNav
  };
}

function fire(ctx, type, target, extra) {
  const event = Object.assign({ target: target }, extra || {});
  (ctx.listeners[type] || []).forEach(function (fn) { fn(event); });
}

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
    history: { replaceState: function () {}, pushState: function () {} },
    addEventListener: function () {},
    removeEventListener: function () {},
    console: console,
    fetch: function () { return Promise.reject(new Error("no fetch")); },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    setTimeout: function () { return 0; },
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
  vm.runInContext(read("house/js/banking.js"), sandbox, { filename: "banking.js" });
  return sandbox;
}

test("route map sends old House and Banking URLs to their new homes", function () {
  const routes = [];
  HOUSE_HASHES.forEach(function (pair) {
    routes.push({
      from: "/" + pair[0],
      to: "/investments/" + pair[1],
      got: bootNav({ pathname: "/", hash: pair[0] }).replaced[0]
    });
    routes.push({
      from: "/index.html" + pair[0],
      to: "/investments/" + pair[1],
      got: bootNav({ pathname: "/index.html", hash: pair[0] }).replaced[0]
    });
  });
  ["#budget", "#historical", "#edits"].forEach(function (hash) {
    routes.push({
      from: "/investments/" + hash,
      to: "/" + hash,
      got: bootNav({ pathname: "/investments/", hash: hash }).replaced[0]
    });
  });
  routes.push({
    from: "/investments/#current",
    to: "/",
    got: bootNav({ pathname: "/investments/", hash: "#current" }).replaced[0]
  });
  routes.push({
    from: "/?x=1#joint",
    to: "/investments/?x=1#joint",
    got: bootNav({ pathname: "/", search: "?x=1", hash: "#joint" }).replaced[0]
  });
  routes.push({
    from: "/?x=1#combined",
    to: "/investments/?x=1#house",
    got: bootNav({ pathname: "/", search: "?x=1", hash: "#combined" }).replaced[0]
  });
  routes.push({
    from: "/investments/?x=1#edits",
    to: "/?x=1#edits",
    got: bootNav({ pathname: "/investments/", search: "?x=1", hash: "#edits" }).replaced[0]
  });
  const houseStub = [
    ["", "", "/investments/"],
    ["", "#agentic", "/investments/#agentic"],
    ["", "#voya", "/investments/#voya"],
    ["", "#combined", "/investments/#combined"],
    ["", "#ret=" + RET, "/investments/#ret=" + RET],
    ["?x=1", "#joint", "/investments/?x=1#joint"]
  ];
  houseStub.forEach(function (row) {
    routes.push({
      from: "/house/" + row[0] + row[1],
      to: row[2],
      got: runStub("house/index.html", row[0], row[1])
    });
  });
  const bankStub = [
    ["", "", "/"],
    ["", "#budget", "/#budget"],
    ["", "#current", "/"],
    ["", "#historical", "/#historical"],
    ["", "#edits", "/#edits"],
    ["", "#foo", "/"],
    ["", "#ret=" + RET, "/"],
    ["?x=1", "#historical", "/?x=1#historical"],
    ["?x=1", "#foo", "/?x=1"]
  ];
  bankStub.forEach(function (row) {
    routes.push({
      from: "/house/banking/" + row[0] + row[1],
      to: row[2],
      got: runStub("house/banking/index.html", row[0], row[1])
    });
  });
  const slash = bootNav({ pathname: "/investments", search: "?x=1", hash: "#joint" });
  routes.push({ from: "/investments?x=1#joint", to: "/investments/?x=1#joint", got: slash.stated[0] });
  assert.equal(slash.replaced.length, 0);
  assert.equal(slash.history.state.kept, true);
  const pages = [
    ["/", "index.html", /id="bankDesk"/],
    ["/investments/", "investments/index.html", /class="inv-page"/],
    ["/house/", "house/index.html", /url=\/investments\//],
    ["/house/banking/", "house/banking/index.html", /url=\//]
  ];
  pages.forEach(function (row) { assert.match(read(row[1]), row[2], row[0]); });
  routes.forEach(function (row) {
    assert.equal(row.got, row.to, row.from);
  });
  assert.ok(routes.length >= 42, "mapped " + routes.length);
  assert.equal(HOUSE_HASHES.length, 19);
});

test("banking hashes stay put and investments hashes stay put", function () {
  ["", "#budget", "#current", "#historical", "#edits", "#historical=2026-09"].forEach(function (hash) {
    const ctx = bootNav({ pathname: "/", search: "?ok=1", hash: hash });
    assert.deepEqual(ctx.replaced, []);
    assert.equal(ctx.MPNav.section, "banking");
  });
  const home = bootNav({ pathname: "/investments/", hash: "#fid-roth" });
  assert.deepEqual(home.replaced, []);
  assert.equal(home.MPNav.section, "investments");
});

test("top nav is two buttons and the open menu matches the section", function () {
  const bank = bootNav({ pathname: "/", hash: "" });
  const bankHtml = bank.elements.mpNav.innerHTML;
  assert.equal((bankHtml.match(/mp-top-btn/g) || []).length, 2);
  const bankAt = bankHtml.indexOf(">BANKING</a>");
  const invLinkAt = bankHtml.indexOf(">INVESTMENTS</a>");
  const menuBtnAt = bankHtml.indexOf('id="menuBtn"');
  const menuAt = bankHtml.indexOf('id="deskMenu"');
  assert.ok(bankAt >= 0 && invLinkAt > bankAt && menuBtnAt > invLinkAt && menuAt > menuBtnAt);
  assert.match(bankHtml, /<a class="mp-top-btn on" href="\/" aria-current="page">BANKING<\/a>/);
  assert.match(bankHtml, /<a class="mp-top-btn" href="\/investments\/">INVESTMENTS<\/a>/);
  assert.match(bankHtml, /<button type="button" id="menuBtn"[^>]*aria-controls="deskMenu"[^>]*aria-label="Menu"/);
  assert.doesNotMatch(bankHtml, />House<|>Docs<|>Manual<|>Setup<|>Edits</);
  const bankItems = bank.elements.tabs.innerHTML;
  assert.match(bankItems, /href="\/#budget"[^>]*data-nav-item="budget"[^>]*class="on" aria-current="page"/);
  assert.doesNotMatch(bankItems, /href="\/#current"|Current/);
  assert.match(bankItems, /href="\/#historical"/);
  assert.doesNotMatch(bankItems, /data-tab|edits|Overview/i);
  assert.doesNotMatch(bankHtml, /data-theme-choice/);
  assert.match(bank.elements.main._after, /class="book-nav-chips"/);
  assert.match(bank.elements.main._after, /class="book-chip on"[^>]*data-theme-choice="justin"/);
  assert.match(bank.elements.main._after, /data-theme-choice="nina"/);

  const inv = bootNav({ pathname: "/investments/", hash: "#house" });
  const invHtml = inv.elements.mpNav.innerHTML;
  assert.equal((invHtml.match(/mp-top-btn/g) || []).length, 2);
  const bankLinkAt = invHtml.indexOf(">BANKING</a>");
  const invAt = invHtml.indexOf(">INVESTMENTS</a>");
  const invBtnAt = invHtml.indexOf('id="menuBtn"');
  const invMenuAt = invHtml.indexOf('id="deskMenu"');
  assert.ok(bankLinkAt >= 0 && invAt > bankLinkAt && invBtnAt > invAt && invMenuAt > invBtnAt);
  assert.match(invHtml, /href="\/">BANKING<\/a>/);
  assert.match(invHtml, /aria-current="page"[^>]*>INVESTMENTS<\/a>/);
  assert.match(invHtml, /id="menuBtn"[^>]*aria-controls="deskMenu"/);
  assert.doesNotMatch(invHtml, /data-theme-choice/);
  assert.match(inv.elements.main._after, /data-theme-choice="justin"/);
  assert.match(inv.elements.main._after, /data-theme-choice="nina"/);
  inv.MPNav.setItems("investments", [
    { id: "combined", label: "Overview" },
    { id: "robinhood", label: "Robinhood" },
    { id: "fidelity", label: "Fidelity" },
    { id: "voya", label: "Voya" }
  ], "robinhood");
  const tabs = inv.elements.tabs.innerHTML;
  assert.match(tabs, /data-tab="combined"/);
  assert.match(tabs, />Overview</);
  assert.match(tabs, /data-tab="robinhood"[^>]*class="on"/);
  assert.match(tabs, /data-tab="fidelity"/);
  assert.match(tabs, /data-tab="voya"/);
  assert.doesNotMatch(tabs, /Budget|Current|Historical|Edits|href="\/#/);
  assert.match(inv.elements.main._after, /href="\/Murphy_Pilot_Manual\.html"/);
  assert.match(inv.elements.main._after, /href="\/Murphy_Pilot_Setup\.html"/);
  assert.match(inv.elements.main._after, /href="\/Murphy_Pilot_Desk\.html"/);
  assert.match(inv.elements.main._after, /Agentic \/ AI WWIII only/);
  assert.match(inv.elements.main._after, /<a href="\/Murphy_Pilot_Manual\.html">Docs<\/a>/);
  assert.doesNotMatch(bank.elements.main._after, /Agentic \/ AI WWIII only/);
  assert.match(bank.elements.main._after, /<a href="\/Murphy_Pilot_Manual\.html">Docs<\/a>/);

  const edits = bootNav({ pathname: "/", hash: "#edits" });
  assert.doesNotMatch(edits.elements.tabs.innerHTML, /class="on"/);
  edits.location.hash = "#current";
  edits.windowListeners.hashchange.forEach(function (fn) { fn(); });
  assert.match(edits.elements.tabs.innerHTML, /data-nav-item="budget"[^>]*class="on" aria-current="page"/);
  assert.doesNotMatch(edits.elements.tabs.innerHTML, /data-nav-item="current"/);
  assert.equal(edits.location.hash, "");
  assert.equal(edits.replaced.length, 0);
});

test("a same-document hash change still forwards to the other section", function () {
  const bank = bootNav({ pathname: "/", hash: "" });
  assert.equal(bank.replaced.length, 0);
  bank.location.hash = "#joint";
  bank.windowListeners.hashchange.forEach(function (fn) { fn(); });
  assert.deepEqual(bank.replaced, ["/investments/#joint"]);

  const stay = bootNav({ pathname: "/", hash: "#budget" });
  stay.location.hash = "#current";
  stay.windowListeners.hashchange.forEach(function (fn) { fn(); });
  stay.windowListeners.popstate.forEach(function (fn) { fn(); });
  assert.equal(stay.replaced.length, 0);
  assert.equal(stay.location.hash, "");
  assert.match(stay.elements.tabs.innerHTML, /data-nav-item="budget"[^>]*class="on" aria-current="page"/);

  const inv = bootNav({ pathname: "/investments/", hash: "#house" });
  inv.location.hash = "#edits";
  inv.windowListeners.popstate.forEach(function (fn) { fn(); });
  assert.deepEqual(inv.replaced, ["/#edits"]);

  const combined = bootNav({ pathname: "/", search: "?x=1", hash: "#budget" });
  combined.location.hash = "#combined";
  combined.windowListeners.hashchange.forEach(function (fn) { fn(); });
  assert.deepEqual(combined.replaced, ["/investments/?x=1#house"]);
});

test("the menu toggles from the active button and closes around it", async function () {
  const ctx = bootNav({ pathname: "/", hash: "#budget" });
  const btn = {
    closest: function (sel) { return sel === "#menuBtn" || sel === ".mp-nav" ? btn : null; }
  };
  fire(ctx, "click", btn);
  assert.equal(ctx.elements.deskMenu.hidden, false);
  assert.equal(ctx.elements.menuBtn.attrs["aria-expanded"], "true");
  const theme = {
    getAttribute: function () { return "nina"; },
    closest: function (sel) {
      if (sel === "#menuBtn" || sel === "#deskMenu [data-nav-item]" || sel === ".mp-nav") return null;
      if (sel === "[data-theme-choice]" || sel === "nav.docs-foot") return theme;
      return null;
    }
  };
  fire(ctx, "click", theme);
  assert.equal(ctx.elements.deskMenu.hidden, true);
  const item = {
    closest: function (sel) {
      if (sel === "#menuBtn") return null;
      if (sel === "#deskMenu [data-nav-item]" || sel === ".mp-nav") return item;
      return null;
    }
  };
  fire(ctx, "click", item);
  assert.equal(ctx.elements.deskMenu.hidden, true);
  fire(ctx, "click", btn);
  assert.equal(ctx.elements.deskMenu.hidden, false);
  fire(ctx, "click", { closest: function () { return null; } });
  assert.equal(ctx.elements.deskMenu.hidden, true);
  fire(ctx, "click", btn);
  ctx.elements.menuBtn._focused = 0;
  fire(ctx, "keydown", { closest: function () { return null; } }, { key: "Escape" });
  assert.equal(ctx.elements.deskMenu.hidden, true);
  assert.equal(ctx.elements.menuBtn.attrs["aria-expanded"], "false");
  assert.equal(ctx.elements.menuBtn._focused, 1);
  const closedFocus = ctx.elements.menuBtn._focused;
  fire(ctx, "keydown", {
    closest: function (sel) { return sel === "#deskMenu" ? {} : null; }
  }, { key: "Escape" });
  assert.equal(ctx.elements.menuBtn._focused, closedFocus);
  fire(ctx, "click", btn);
  ctx.windowListeners.pageshow.forEach(function (fn) { fn(); });
  assert.equal(ctx.elements.deskMenu.hidden, true);

  ctx.location.hash = "#historical";
  fire(ctx, "click", {
    closest: function (sel) { return sel === "[data-bank-tab]" ? {} : null; }
  });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.match(ctx.elements.tabs.innerHTML, /data-nav-item="historical"[^>]*class="on" aria-current="page"/);
});

test("the banking menu marks the current page for each hash", function () {
  function marked(ctx) {
    const html = ctx.elements.tabs.innerHTML;
    const hits = [];
    ["budget", "current", "historical"].forEach(function (id) {
      const re = new RegExp('data-nav-item="' + id + '"[^>]*aria-current="page"');
      if (re.test(html)) hits.push(id);
    });
    return hits;
  }
  const pages = [
    ["", "budget"],
    ["#budget", "budget"],
    ["#current", "budget"],
    ["#historical", "historical"],
    ["#historical=2026-09", "historical"],
    ["#edits", ""]
  ];
  pages.forEach(function (row) {
    const ctx = bootNav({ pathname: "/", hash: row[0] });
    const html = ctx.elements.tabs.innerHTML;
    assert.match(html, /href="\/#budget"/);
    assert.doesNotMatch(html, /href="\/#current"|Current/);
    assert.match(html, /href="\/#historical"/);
    assert.equal(marked(ctx).join(","), row[1], row[0]);
    if (row[1]) {
      assert.match(html, new RegExp('data-nav-item="' + row[1] + '"[^>]*class="on" aria-current="page"'));
    } else {
      assert.doesNotMatch(html, /aria-current="page"/);
      assert.doesNotMatch(html, /class="on"/);
    }
  });
  const live = bootNav({ pathname: "/", hash: "#budget" });
  live.location.hash = "#current";
  live.windowListeners.hashchange.forEach(function (fn) { fn(); });
  assert.equal(live.location.hash, "");
  assert.equal(marked(live).join(","), "budget");
  live.location.hash = "#historical";
  live.windowListeners.popstate.forEach(function (fn) { fn(); });
  assert.equal(marked(live).join(","), "historical");
  live.location.hash = "#edits";
  live.windowListeners.hashchange.forEach(function (fn) { fn(); });
  assert.equal(marked(live).join(","), "");
  const fromInv = bootNav({ pathname: "/investments/", hash: "#historical=2026-08" });
  assert.deepEqual(fromInv.replaced, ["/#historical=2026-08"]);
});

test("each page has one empty ticker slot under the header", function () {
  ["index.html", "investments/index.html"].forEach(function (rel) {
    const html = read(rel);
    assert.equal((html.match(/id="mp-ticker"/g) || []).length, 1, rel);
    assert.match(html, /<div id="mp-ticker" class="mp-ticker-slot" hidden><\/div>/);
    const headerAt = html.indexOf("</header>");
    const slotAt = html.indexOf('id="mp-ticker"');
    const mainAt = html.indexOf("<main");
    assert.ok(headerAt >= 0 && headerAt < slotAt && slotAt < mainAt, rel);
  });
  const fresh = bootNav({ pathname: "/", withTicker: false });
  assert.equal(fresh.elements.header._afterNode.id, "mp-ticker");
  assert.equal(fresh.elements.header._afterNode.className, "mp-ticker-slot");
  assert.equal(fresh.elements.header._afterNode.hidden, true);
  const kept = bootNav({ pathname: "/", withTicker: true });
  assert.equal(kept.elements.header._afterNode, null);
  assert.equal(kept.elements["mp-ticker"].id, "mp-ticker");
});

test("links and fetches on the moved pages are root-absolute", function () {
  ["index.html", "investments/index.html", "house/index.html", "house/banking/index.html", "js/nav.js"].forEach(function (rel) {
    const html = read(rel);
    assert.doesNotMatch(html, /href="house\//);
    assert.doesNotMatch(html, /src="house\//);
    assert.doesNotMatch(html, /href="investments/);
    const attrs = html.match(/\b(?:href|src)\s*=\s*["'][^"']+["']/g) || [];
    attrs.forEach(function (attr) {
      const val = attr.replace(/^.*?=\s*["']/, "").replace(/["']$/, "");
      if (/^(https?:|mailto:|data:|#)/.test(val)) return;
      assert.ok(val.startsWith("/"), rel + " " + attr);
    });
  });
  ["house/js/board-b.js", "house/js/board-c.js", "house/js/board-e.js"].forEach(function (rel) {
    const src = read(rel);
    assert.doesNotMatch(src, /housePath/);
    assert.doesNotMatch(src, /href="house\//);
    assert.doesNotMatch(src, /fetch\(\s*["'](?!\/)/);
    assert.doesNotMatch(src, /["']house\//);
  });
  const boardB = read("house/js/board-b.js");
  const boardC = read("house/js/board-c.js");
  const boardE = read("house/js/board-e.js");
  assert.match(boardB, /fetch\("\/house\/house-snapshot\.json/);
  assert.match(boardB, /fetch\("\/pilot-snapshot\.json/);
  assert.match(boardB, /return "\/house\/" \+ name \+ "\?v=20260904cn"/);
  assert.match(boardB, /return "\/data\/retirement\.json"/);
  assert.match(boardC, /fetch\("\/house\/house-snapshot\.json" \+ bust/);
  assert.match(boardC, /fetch\("\/pilot-snapshot\.json" \+ bust/);
  assert.match(boardC, /fetchTruthifi\("\/house\/truthifi-snapshot\.json" \+ bust\)/);
  assert.match(boardE, /fetch\("\/house\/indexes\.json/);
  assert.match(boardE, /fetch\("\/house\/policy-pack\.json/);
  assert.doesNotMatch(boardB, /section-link|\/house\/banking\//);
  assert.match(read("agentic.html"), /href="\/investments\/">Investments</);
  assert.doesNotMatch(read("agentic.html"), /href="index\.html"|href="house\/index\.html"/);
  assert.match(read("Murphy_Pilot_Desk.html"), /href="\/investments\/"/);
  assert.doesNotMatch(read("Murphy_Pilot_Desk.html"), /href="index\.html"/);
});

test("banking hash ids match bankResolveTab and stay off the investments menu", function () {
  const bank = bootBank();
  assert.equal(bank.bankResolveTab("#current"), "budget");
  const accepted = ["budget", "historical", "edits"];
  accepted.forEach(function (h) { assert.equal(bank.bankResolveTab("#" + h), h); });
  assert.equal(bank.bankResolveTab(""), "budget");
  assert.equal(bank.bankResolveTab("#"), "budget");
  assert.equal(bank.bankResolveTab("#nope"), "budget");
  const nav = bootNav({ pathname: "/" });
  assert.deepEqual(JSON.parse(JSON.stringify(nav.MPNav.bankingHashes)), accepted);
  assert.equal(nav.MPNav.config.sections.banking.items.map(function (it) { return it.id; }).indexOf("edits"), -1);
  const boardC = read("house/js/board-c.js");
  const tabBlock = /TABS\s*=\s*\[([\s\S]*?)\];/.exec(boardC)[1];
  const tabIds = Array.from(tabBlock.matchAll(/id:\s*"([^"]+)"/g)).map(function (m) { return m[1]; });
  const rhIds = Array.from(/RH_IDS\s*=\s*\[([^\]]+)\]/.exec(boardC)[1].matchAll(/"([^"]+)"/g)).map(function (m) { return m[1]; });
  accepted.forEach(function (h) {
    assert.equal(tabIds.indexOf(h), -1);
    assert.equal(rhIds.indexOf(h), -1);
    assert.equal(/^fid-/.test(h), false);
    assert.equal(h.indexOf("ret="), -1);
  });
  assert.match(boardC, /label:\s*"Overview"/);
  assert.match(boardC, /LABEL\.combined\s*=\s*"House"/);
});

test("nav source stays free of figures and institution names", function () {
  const nav = read("js/nav.js");
  assert.doesNotMatch(nav, /\$\d/);
  assert.doesNotMatch(nav, /\u00b7\u00b7\u00b7/);
  assert.match(nav, /"#08090B"/);
  assert.doesNotMatch(nav, /"#080"\s*\+\s*"90B"/);
  assert.doesNotMatch(nav.replace(/#[0-9A-Fa-f]{3,8}/g, ""), /\d{4,}/);
  assert.doesNotMatch(nav, /Robinhood|Fidelity|Voya|Schwab|Chase|Wells|T-Mobile|NFCU|BNY|Mellon|Duquesne|Marlowe|Claude/i);
  assert.doesNotMatch(nav, /console\./);
  ["house/index.html", "house/banking/index.html"].forEach(function (rel) {
    const html = read(rel);
    assert.doesNotMatch(html, /\$\d/);
    assert.doesNotMatch(html, /\d{4,}/);
    assert.doesNotMatch(html, /<script src=/);
  });
});

test("touched assets use the ei cache bust", function () {
  const bank = read("index.html");
  const inv = read("investments/index.html");
  assert.match(bank, /\/js\/nav\.js\?v=20261007ep/);
  assert.match(bank, /\/house\/house\.css\?v=20261008ey/);
  assert.match(bank, /\/house\/js\/banking\.js\?v=20261008ey/);
  assert.match(bank, /\/house\/banking\.css\?v=20261008ey/);
  assert.match(bank, /id="mpNav" class="mp-nav" data-section="banking"/);
  assert.match(bank, /<a class="brand-block" href="\/">/);
  assert.match(bank, /aria-label="Murphy Pilot"/);
  assert.doesNotMatch(bank, /Murphy Pilot House/);
  assert.doesNotMatch(bank, /section-nav/);
  assert.match(inv, /\/js\/nav\.js\?v=20261007ep/);
  assert.match(inv, /list-cap\.js\?v=20261007eh/);
  assert.match(inv, /list-cap\.css\?v=20261007eh/);
  assert.match(inv, /\/house\/house\.css\?v=20261008ey/);
  assert.match(inv, /\/house\/js\/board-b\.js\?v=20261007ei/);
  assert.match(inv, /aria-label="Murphy Pilot"/);
  assert.doesNotMatch(inv, /Murphy Pilot House/);
  assert.match(inv, /\/house\/js\/board-c\.js\?v=20261007ei/);
  assert.match(inv, /\/house\/js\/board-e\.js\?v=20261007ei/);
  assert.match(inv, /\/house\/js\/board-a\.js\?v=20261007ei/);
  assert.match(inv, /\/house\/js\/board-d\.js\?v=20261007ei/);
  assert.match(inv, /id="mpNav" class="mp-nav" data-section="investments"/);
  assert.match(inv, /<a class="brand-block" href="\/investments\/">/);
  assert.match(inv, /id="deskSub">INVESTMENTS</);
  const css = read("house/house.css");
  const bankCss = read("house/banking.css");
  assert.doesNotMatch(css, /grid-column:\s*auto/);
  assert.doesNotMatch(css, /grid-row:\s*auto/);
  assert.match(css, /grid-template-areas:\s*"mark brand clock"\s*"end end end"/);
  assert.doesNotMatch(bankCss, /grid-column:\s*auto/);
  assert.doesNotMatch(bankCss, /grid-row:\s*auto/);
  assert.match(bankCss, /grid-template-areas:\s*\n\s*"mark brand clock"\s*\n\s*"end end end"/);
  assert.doesNotMatch(inv, /menu-wrap|docs-foot|section-nav/);
  const header = inv.slice(inv.indexOf("<header>"), inv.indexOf("</header>"));
  assert.ok(header.indexOf('id="clock"') < header.indexOf('class="header-end"'));
});

test("each asset path has one cache bust across html pages", function () {
  function walk(dir, out) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (ent) {
      if (ent.name === "node_modules" || ent.name === ".git") return;
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(abs, out);
      else if (ent.name.endsWith(".html")) out.push(abs);
    });
  }
  const files = [];
  walk(root, files);
  assert.ok(files.length >= 4);
  const seen = new Map();
  const re = /(?:src|href)\s*=\s*["']([^"'?#]+)\?v=([^"'#&]+)/g;
  files.forEach(function (file) {
    const html = fs.readFileSync(file, "utf8");
    re.lastIndex = 0;
    let found;
    while ((found = re.exec(html))) {
      const asset = found[1].replace(/^\//, "");
      const ver = found[2];
      const prev = seen.get(asset);
      if (!prev) seen.set(asset, { ver: ver, file: file });
      else assert.equal(ver, prev.ver, asset + " " + path.relative(root, file) + " vs " + path.relative(root, prev.file));
    }
  });
  assert.ok(seen.has("js/nav.js"));
  assert.equal(seen.get("js/nav.js").ver, "20261007ep");
  assert.equal(seen.get("house/js/ticker.js").ver, "20261007ei");
  assert.equal(seen.get("house/ticker.css").ver, "20261007ei");
  assert.equal(seen.get("house/js/board-a.js").ver, "20261007ei");
  assert.equal(seen.get("house/js/board-b.js").ver, "20261007ei");
  assert.equal(seen.get("house/js/board-c.js").ver, "20261007ei");
  assert.equal(seen.get("house/js/board-d.js").ver, "20261007ei");
  assert.equal(seen.get("house/js/board-e.js").ver, "20261007ei");
  assert.equal(seen.get("house/js/paydesk.js").ver, "20261007en");
  assert.equal(seen.get("house/js/list-cap.js").ver, "20261007eh");
});
