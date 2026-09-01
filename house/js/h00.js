window.HOUSE_SEED = {asof:"",brand:"Murphy House",note:"DATA ONLY",accounts:{individual:{id:"individual",label:"Individual Investing",equity:0,cash:0,buying_power:0,pending_deposits:0,invested_pct:0,open_orders:0,names:[]},auto_grok:{id:"auto_grok",label:"Auto-Grok",equity:0,cash:0,buying_power:0,pending_deposits:0,invested_pct:0,open_orders:0,names:[]},joint:{id:"joint",label:"Joint Account",equity:0,cash:0,buying_power:0,pending_deposits:0,invested_pct:0,open_orders:0,names:[]}},combined:{id:"combined",label:"House",equity:0,cash:0,buying_power:0,pending_deposits:0,invested_pct:0,open_orders:0,names:[],books:[]},tape:{combined:[],individual:[],auto_grok:[],joint:[]}};
(function () {
  var THEME_KEY = "murphyHouseTheme";
  var STATE_KEY = "murphyHouseDesk";
  var URL_KEY = "murphyHouseUrl";
  var AUTO_KEY = "murphyHouseAuto";
  var MIX = ["var(--mix-a)", "var(--mix-b)", "var(--mix-c)", "var(--mix-d)", "var(--mix-e)", "var(--mix-f)"];
  var TABS = [
    { id: "combined", label: "House" },
    { id: "individual", label: "Individual" },
    { id: "auto_grok", label: "Auto-Grok" },
    { id: "joint", label: "Joint" }
  ];
  var ACCOUNT_LABEL = { individual: "Individual", auto_grok: "Auto-Grok", joint: "Joint" };
  var TAPE_KEYS = ["combined", "individual", "auto_grok", "joint"];
  var SEED = window.HOUSE_SEED;
  var tab = "combined";
  var snap = withTape(SEED);
  var paste = "";
  var url = "";
  var auto = true;
  var status = "";
  var tapeSel = {};
  var tapeOpen = false;
  function pad(n) { return String(n).padStart(2, "0"); }
  function etParts(date) {
    return new Date((date || new Date()).toLocaleString("en-US", { timeZone: "America/New_York" }));
  }
  function money(n, d) {
    if (n == null || !isFinite(n)) return "\u2014";
    d = d == null ? 2 : d;
    var abs = Math.abs(n).toFixed(d);
    return n < 0 ? "-$" + abs : "$" + abs;
  }
  function signedMoney(n, d) {
    if (n == null || !isFinite(n)) return "\u2014";
    d = d == null ? 2 : d;
    var abs = Math.abs(n).toFixed(d);
    if (n > 0) return "+$" + abs;
    if (n < 0) return "\u2212$" + abs;
    return "$" + abs;
  }
  function pct(n, d) {
    if (n == null || !isFinite(n)) return "\u2014";
    d = d == null ? 2 : d;
    var t = n.toFixed(d);
    return n > 0 ? "+" + t + "%" : t + "%";
  }
  function qty(n) {
    if (n == null || !isFinite(n)) return "\u2014";
    if (Math.abs(n) >= 100) return n.toFixed(2);
    if (Math.abs(n) >= 1) return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  }
  function tone(n) {
    if (n == null || !isFinite(n)) return "flat";
    if (n > 0.0005) return "go";
    if (n < -0.0005) return "stop";
    return "flat";
  }
  function formatAsof(iso) {
    if (!iso) return "local";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var et = etParts(d);
    return et.getFullYear() + "-" + pad(et.getMonth() + 1) + "-" + pad(et.getDate()) + " " + pad(et.getHours()) + ":" + pad(et.getMinutes()) + " ET";
  }
  function formatDtg(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short"
    }).formatToParts(d);
    function grab(type) {
      for (var i = 0; i < parts.length; i++) if (parts[i].type === type) return parts[i].value;
      return "";
    }
    var zone = grab("timeZoneName") === "EST" ? "Q" : "R";
    return pad(Number(grab("day"))) + pad(Number(grab("hour"))) + pad(Number(grab("minute"))) + zone + " " + grab("month").slice(0, 3).toUpperCase() + " " + String(grab("year")).slice(2);
  }
  function roundEq(n) { return Math.round(n * 100) / 100; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      if (c === "&") return "&" + "amp;";
      if (c === "<") return "&" + "lt;";
      if (c === ">") return "&" + "gt;";
      if (c === '"') return "&" + "quot;";
      return "&#39;";
    });
  }
  function isHouse(x) {
    return !!(x && x.accounts && x.combined && x.accounts.individual && x.accounts.auto_grok && x.accounts.joint);
  }
  function nameMapFrom(s) {
    var map = {};
    function eat(book) {
      ((book && book.names) || []).forEach(function (n) {
        if (n && n.symbol && n.name) map[n.symbol] = n.name;
      });
    }
    if (!s) return map;
    eat(s.combined);
    if (s.accounts) {
      eat(s.accounts.individual);
      eat(s.accounts.auto_grok);
      eat(s.accounts.joint);
    }
    return map;
  }
  function enrichSnap(s) {
    if (!isHouse(s)) return s;
    var map = nameMapFrom(SEED);
    var extra = nameMapFrom(s);
    var k;
    for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) map[k] = extra[k];
    function enrichBook(b, id) {
      if (!b) return b;
      if (!Array.isArray(b.names)) b.names = [];
      if (!b.id) b.id = id;
      if (!b.label) b.label = id === "combined" ? "House" : (ACCOUNT_LABEL[id] || id);
      b.names.forEach(function (n) {
        if (n && n.symbol && !n.name && map[n.symbol]) n.name = map[n.symbol];
        if (n && !n.account) n.account = id === "combined" ? n.account : id;
      });
      return b;
    }
    enrichBook(s.accounts.individual, "individual");
    enrichBook(s.accounts.auto_grok, "auto_grok");
    enrichBook(s.accounts.joint, "joint");
    enrichBook(s.combined, "combined");
    (s.combined.names || []).forEach(function (n) {
      if (!n || (n.accounts && n.accounts.length)) return;
      var acc = [];
      ["individual", "auto_grok", "joint"].forEach(function (id) {
        var book = s.accounts[id];
        if (book && (book.names || []).some(function (x) { return x.symbol === n.symbol && x.kind === n.kind; })) acc.push(id);
      });
      if (acc.length) {
        n.accounts = acc;
        if (acc.length === 1) n.account = acc[0];
      }
    });
    return s;
  }
  function bookFor(s, t) { return t === "combined" ? s.combined : s.accounts[t]; }
  function emptyTape() { return { combined: [], individual: [], auto_grok: [], joint: [] }; }
  function mergePrints() {
    var map = {};
    for (var a = 0; a < arguments.length; a++) {
      var list = arguments[a] || [];
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p || !p.t || !isFinite(p.equity)) continue;
        map[p.t] = p;
      }
    }
    var keys = Object.keys(map).sort();
    var max = -Infinity;
    return keys.map(function (k) {
      var p = map[k];
      var equity = roundEq(p.equity);
      max = Math.max(max, equity);
      return { t: p.t, dtg: p.dtg || formatDtg(p.t), equity: equity, max: max };
    });
  }
  function tapeFromSnap(s) {
    function mk(eq) {
      var v = roundEq(eq);
      return [{ t: s.asof, dtg: formatDtg(s.asof), equity: v, max: v }];
    }
    return {
      combined: mk((s.combined && s.combined.equity) || 0),
      individual: mk((s.accounts && s.accounts.individual && s.accounts.individual.equity) || 0),
      auto_grok: mk((s.accounts && s.accounts.auto_grok && s.accounts.auto_grok.equity) || 0),
      joint: mk((s.accounts && s.accounts.joint && s.accounts.joint.equity) || 0)
    };
  }
  function mergeTapes() {
    var out = emptyTape();
    var tapes = arguments;
    TAPE_KEYS.forEach(function (key) {
      var lists = [];
      for (var i = 0; i < tapes.length; i++) lists.push(tapes[i] && tapes[i][key]);
      out[key] = mergePrints.apply(null, lists);
    });
    return out;
  }
  function withTape(s, extra) {
    var copy = JSON.parse(JSON.stringify(s));
    copy.tape = mergeTapes(tapeFromSnap(s), extra, s.tape);
    return enrichSnap(copy);
  }
  function printsFor(s, t) {
    var tape = s.tape || tapeFromSnap(s);
    return tape[t] || [];
  }
  function readTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t === "light" || t === "dark") return t;
    } catch (e) {}
    try {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch (e) {}
    return "light";
  }
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#0A100E" : "#1B3A2F");
    document.querySelectorAll("[data-theme-choice]").forEach(function (btn) {
