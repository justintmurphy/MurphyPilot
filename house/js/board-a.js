  var TABS = [
    { id: "combined", label: "House" },
    { id: "agentic", label: "Agentic" },
    { id: "individual", label: "Individual" },
    { id: "auto_grok", label: "Auto-Grok" },
    { id: "joint", label: "Joint" }
  ];
  var LABEL = { agentic: "Agentic", individual: "Individual", auto_grok: "Auto-Grok", joint: "Joint", combined: "House" };
  var IDS = ["agentic", "individual", "auto_grok", "joint"];
  var TAPE_SEED = [{"t":"2026-08-28T13:32:00-04:00","dtg":"281332R AUG 26","equity":2592.67,"max":2592.67},{"t":"2026-08-28T14:01:00-04:00","dtg":"281401R AUG 26","equity":2595.86,"max":2595.86},{"t":"2026-08-28T14:32:00-04:00","dtg":"281432R AUG 26","equity":2588.97,"max":2595.86},{"t":"2026-08-28T15:07:00-04:00","dtg":"281507R AUG 26","equity":2587.74,"max":2595.86},{"t":"2026-08-28T15:33:00-04:00","dtg":"281533R AUG 26","equity":2596.67,"max":2596.67},{"t":"2026-08-28T16:13:00-04:00","dtg":"281613R AUG 26","equity":2597.59,"max":2597.59},{"t":"2026-08-31T10:08:00-04:00","dtg":"311008R AUG 26","equity":2623.75,"max":2623.75},{"t":"2026-08-31T11:08:00-04:00","dtg":"311108R AUG 26","equity":2627.66,"max":2627.66},{"t":"2026-08-31T12:10:00-04:00","dtg":"311210R AUG 26","equity":2634.22,"max":2634.22},{"t":"2026-08-31T13:14:00-04:00","dtg":"311314R AUG 26","equity":2638.04,"max":2638.04},{"t":"2026-08-31T14:05:00-04:00","dtg":"311405R AUG 26","equity":2642.11,"max":2642.11},{"t":"2026-08-31T15:05:00-04:00","dtg":"311505R AUG 26","equity":2636.39,"max":2642.11},{"t":"2026-08-31T16:05:18-04:00","dtg":"311605R AUG 26","equity":2661.39,"max":2661.39},{"t":"2026-09-01T10:15:30-04:00","dtg":"011015R SEP 26","equity":2629.1,"max":2661.39},{"t":"2026-09-01T11:20:09-04:00","dtg":"011120R SEP 26","equity":2619.77,"max":2661.39},{"t":"2026-09-01T12:07:40-04:00","dtg":"011207R SEP 26","equity":2635.42,"max":2661.39},{"t":"2026-09-01T13:09:00-04:00","dtg":"011309R SEP 26","equity":2616.21,"max":2661.39},{"t":"2026-09-01T14:04:00-04:00","dtg":"011404R SEP 26","equity":2615.45,"max":2661.39},{"t":"2026-09-01T15:10:00-04:00","dtg":"011510R SEP 26","equity":2604.12,"max":2661.39},{"t":"2026-09-01T16:03:00-04:00","dtg":"011603R SEP 26","equity":2597.66,"max":2661.39},{"t":"2026-09-02T10:42:00-04:00","dtg":"021042R SEP 26","equity":2629.94,"max":2661.39},{"t":"2026-09-02T12:50:22-04:00","dtg":"021250R SEP 26","equity":2622.38,"max":2661.39},{"t":"2026-09-02T14:04:16-04:00","dtg":"021404R SEP 26","equity":2626.07,"max":2661.39},{"t":"2026-09-02T15:30:10-04:00","dtg":"021530R SEP 26","equity":2636.42,"max":2661.39},{"t":"2026-09-03T12:13:56-04:00","dtg":"031213R SEP 26","equity":2700.89,"max":2700.89},{"t":"2026-09-03T13:50:31-04:00","dtg":"031350R SEP 26","equity":2716.96,"max":2716.96},{"t":"2026-09-03T14:03:56-04:00","dtg":"031403R SEP 26","equity":2717.86,"max":2717.86},{"t":"2026-09-03T15:15:00-04:00","dtg":"031515R SEP 26","equity":2715.53,"max":2717.86},{"t":"2026-09-03T15:36:05-04:00","dtg":"031536R SEP 26","equity":2716.66,"max":2717.86}];
  var JOBS = [
    { t: "21:00", days: [0, 1, 2, 3, 4], name: "Policy Pack Evening", role: "No trading. World events + WH." },
    { t: "06:30", days: [1, 2, 3, 4, 5], name: "Policy Pack AM", role: "Overnight delta only." },
    { t: "09:50", days: [1, 2, 3, 4, 5], name: "Autopilot research", role: "Name pick. Grok exec." },
    { t: "10:00", days: [1, 2, 3, 4, 5], name: "Snapshot", role: "Stops only." },
    { t: "11:50", days: [1, 2, 3, 4, 5], name: "Eyes", role: "Risk-first pick." },
    { t: "13:50", days: [1, 2, 3, 4, 5], name: "Eyes", role: "Risk-first pick." },
    { t: "14:50", days: [1, 2, 3, 4, 5], name: "Autopilot PM", role: "Last redeploy pick." },
    { t: "15:00", days: [1, 2, 3, 4, 5], name: "Snapshot", role: "Stops only." },
    { t: "16:00", days: [1, 2, 3, 4, 5], name: "Truthifi", role: "Close scan." }
  ];
  var CAL = [
    ["2026-09-01", "JOLTS; beef TRQ first tranche"],
    ["2026-09-03", "UAS import duties start"],
    ["2026-09-04", "NFP 08:30 ET"],
    ["2026-09-07", "Labor Day \u2014 NYSE closed"],
    ["2026-09-10", "PPI; EIA weekly"],
    ["2026-09-11", "CPI 08:30 ET"],
    ["2026-09-15", "FOMC + SEP"],
    ["2026-09-16", "FOMC decision ~14:00 ET"],
    ["2026-09-30", "PCE + GDP third estimate"]
  ];
  var MIX = ["var(--mix-a)", "var(--mix-b)", "var(--mix-c)", "var(--mix-d)", "var(--mix-e)", "var(--mix-f)"];
  var LAST_FILL = {
    "individual|SPCX": "2026-06-25",
    "individual|NVDA": "2026-08-26",
    "individual|TSLA": "2026-08-25",
    "individual|BTC": "2026-08-26",
    "individual|XRP": "2026-08-29",
    "auto_grok|MU": "2026-08-27",
    "auto_grok|ARIS": "2026-08-27",
    "auto_grok|AUGO": "2026-08-27",
    "auto_grok|FSM": "2026-08-27",
    "auto_grok|AVGO": "2026-08-27",
    "auto_grok|KGC": "2026-08-27",
    "auto_grok|CDE": "2026-08-27",
    "auto_grok|VST": "2026-08-27",
    "auto_grok|SNDK": "2026-08-27",
    "auto_grok|KTOS": "2026-08-27",
    "auto_grok|ZETA": "2026-08-27",
    "auto_grok|AU": "2026-08-27",
    "auto_grok|CECO": "2026-08-27",
    "auto_grok|ASM": "2026-08-27",
    "auto_grok|LBTYA": "2026-08-27",
    "auto_grok|SRRK": "2026-08-27",
    "auto_grok|EXK": "2026-08-27",
    "auto_grok|OSCR": "2026-08-27",
    "joint|SNDK": "2026-08-27",
    "joint|BW": "2026-08-27",
    "joint|MU": "2026-08-27",
    "joint|ZETA": "2026-08-27",
    "joint|NVDA": "2026-08-27",
    "joint|MLTX": "2026-08-27",
    "joint|ARIS": "2026-08-27",
    "joint|NG": "2026-08-27",
    "joint|RUM": "2026-08-27",
    "joint|OPRA": "2026-08-27",
    "joint|FRO": "2026-08-27",
    "joint|KTOS": "2026-08-27",
    "joint|VST": "2026-08-27",
    "joint|ABCL": "2026-08-27",
    "joint|PGY": "2026-08-27",
    "joint|IOVA": "2026-08-27",
    "joint|STRL": "2026-08-27",
    "agentic|XLE": "2026-09-01",
    "agentic|RTX": "2026-09-01"
  };
  var tab = "combined";
  var snap = null;

  function pad(n) { return String(n).padStart(2, "0"); }
  function nyNow() { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" })); }
  function money(n) { n = Number(n); return isFinite(n) ? (n < 0 ? "-$" + Math.abs(n).toFixed(2) : "$" + n.toFixed(2)) : "\u2014"; }
  function pct(n) { n = Number(n); return isFinite(n) ? (n > 0 ? "+" : "") + n.toFixed(2) + "%" : "\u2014"; }
  function qty(n) {
    n = Number(n);
    if (!isFinite(n)) return "\u2014";
    if (Math.abs(n) >= 100) return n.toFixed(2);
    if (Math.abs(n) >= 1) return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  }
  function tone(n) { n = Number(n); if (!isFinite(n) || Math.abs(n) < 0.0005) return "flat"; return n > 0 ? "go" : "stop"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "\u0026amp;", "<": "\u0026lt;", ">": "\u0026gt;", '"': "\u0026quot;", "'": "\u0026#39;" })[c]; }); }
  function rnd(n) { return Math.round(Number(n) * 100) / 100; }

  function hashTab() {
    var h = (location.hash || "").replace(/^#/, "");
    if (h === "house") h = "combined";
    if (TABS.some(function (t) { return t.id === h; })) tab = h;
  }
  function setHash() {
    try { history.replaceState(null, "", "#" + (tab === "combined" ? "house" : tab)); } catch (e) {}
  }

  function agenticBook(p) {
    if (!p) return { id: "agentic", label: "Agentic", equity: 0, cash: 0, buying_power: 0, pending_deposits: 0, invested_pct: 0, open_orders: 0, equity_value: 0, slots: 0, names: [], tape: [] };
    var names = (p.names || []).map(function (n) {
      var last = n.last != null ? Number(n.last) : null;
      var avg = n.avg != null ? Number(n.avg) : null;
      var q = n.qty != null ? Number(n.qty) : null;
      var value = n.value != null ? Number(n.value) : (last != null && q != null ? last * q : null);
      var cost = n.cost != null ? Number(n.cost) : (avg != null && q != null ? avg * q : null);
      var pnl = value != null && cost != null ? value - cost : null;
      var pnl_pct = cost ? (pnl / cost) * 100 : (avg && last ? ((last / avg) - 1) * 100 : null);
      return { symbol: n.symbol, name: n.name || n.symbol, kind: "equity", qty: q, avg: avg, last: last, value: value, cost: cost, pnl: pnl, pnl_pct: pnl_pct, first_fill: n.first_fill || "", last_fill: n.last_fill || LAST_FILL["agentic|" + n.symbol] || n.first_fill || "", next_stall: n.next_stall || "", account: "agentic", accounts: ["agentic"] };
    });
    return {
      id: "agentic", label: "Agentic",
      equity: Number(p.equity) || 0, equity_value: Number(p.equity_value) || 0,
      cash: Number(p.cash) || 0, buying_power: Number(p.buying_power) || 0,
      pending_deposits: Number(p.pending_deposits) || 0, invested_pct: Number(p.invested_pct) || 0,
      open_orders: Number(p.open_orders) || 0, slots: p.slots != null ? Number(p.slots) : Math.floor((Number(p.equity) || 0) / 75),
      names: names, tape: p.tape || [], asof: p.asof || ""
    };
  }

  function merge(house, pilot) {
    var out = JSON.parse(JSON.stringify(house || { accounts: {}, combined: {}, tape: {} }));
    if (!out.accounts) out.accounts = {};
    out.accounts.agentic = agenticBook(pilot);
    var eq = 0, cash = 0, bp = 0, pend = 0, ev = 0, cv = 0, orders = 0, names = [];
    IDS.forEach(function (id) {
      var b = out.accounts[id] || { names: [] };
      if (!b.id) b.id = id;
      if (!b.label) b.label = LABEL[id];
      eq += Number(b.equity) || 0;
      cash += Number(b.cash) || 0;
      bp += Number(b.buying_power) || 0;
      pend += Number(b.pending_deposits) || 0;
      ev += Number(b.equity_value) || 0;
      cv += Number(b.crypto_value) || 0;
      orders += Number(b.open_orders) || 0;
      (b.names || []).forEach(function (n) {
        var row = JSON.parse(JSON.stringify(n));
        row.account = row.account || id;
        row.accounts = row.accounts && row.accounts.length ? row.accounts : [id];
        row.last_fill = row.last_fill || LAST_FILL[id + "|" + row.symbol] || row.first_fill || "";
        names.push(row);
      });
    });
    out.combined = {
      id: "combined", label: "House",
      equity: rnd(eq), cash: rnd(cash), buying_power: rnd(bp), pending_deposits: rnd(pend),
      equity_value: rnd(ev), crypto_value: rnd(cv), open_orders: orders,
      invested_pct: eq ? Math.min(100, (ev / eq) * 100) : 0,
      names: names,
      books: IDS.map(function (id) {
        var b = out.accounts[id] || {};
        return { id: id, label: LABEL[id], equity: Number(b.equity) || 0, cash: Number(b.cash) || 0, pending_deposits: Number(b.pending_deposits) || 0, invested_pct: Number(b.invested_pct) || 0, names: (b.names || []).length };
      })
    };
    if (!out.tape) out.tape = {};
    out.tape.agentic = (out.accounts.agentic.tape || []).map(normPrint);
    var houseEq = house && house.combined ? Number(house.combined.equity) : NaN;
    var rolled = isFinite(houseEq) ? { t: (house && house.asof) || out.asof, equity: houseEq } : null;
    out.tape.combined = mergePrints([].concat(TAPE_SEED, out.tape.combined || [], rolled ? [rolled] : [], loadTape("combined")));
    persistTape("combined", out.tape.combined);
    out.pilot = pilot;
    return out;
  }
  function normPrint(p) {
    if (!p) return p;
    var t = p.t;
    if (typeof t === "number") t = new Date(t).toISOString();
    return { t: String(t || ""), dtg: p.dtg || "", equity: rnd(p.equity), max: p.max != null ? rnd(p.max) : rnd(p.equity) };
  }
  function mergePrints(arr) {
    var byBucket = {};
    (arr || []).forEach(function (raw) {
      var p = normPrint(raw);
      if (!p || !isFinite(p.equity) || !p.t) return;
      var ms = Date.parse(p.t);
      if (!isFinite(ms)) return;
      var bucket = String(Math.round(ms / 120000));
      var prev = byBucket[bucket];
      if (!prev || Date.parse(p.t) >= Date.parse(prev.t)) byBucket[bucket] = p;
    });
    var keys = Object.keys(byBucket);
    keys.sort(function (a, b) { return Number(a) - Number(b); });
    var out = keys.map(function (k) { return byBucket[k]; });
    var mx = null;
    return out.map(function (p) {
      mx = mx == null || p.equity > mx ? p.equity : mx;
      return { t: p.t, dtg: p.dtg, equity: p.equity, max: mx };
    });
  }
  function loadTape(key) {
    try {
      var raw = localStorage.getItem("murphyTape." + key);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function persistTape(key, prints) {
    try { localStorage.setItem("murphyTape." + key, JSON.stringify(prints || [])); } catch (e) {}
  }

  function book() {
    if (!snap) return { names: [], equity: 0, cash: 0, buying_power: 0, pending_deposits: 0, invested_pct: 0, open_orders: 0 };
    return tab === "combined" ? snap.combined : (snap.accounts[tab] || { names: [] });
  }

  function spark(vals) {
    if (!vals.length) return "";
    if (vals.length === 1) vals = [vals[0], vals[0]];
    var w = 640, h = 88, pL = 8, pR = 8, pT = 8, pB = 8;
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mx === mn) { var padY = Math.max(Math.abs(mx) * 0.01, 0.5); mn -= padY; mx += padY; }
    var span = mx - mn || 1;
    var pts = vals.map(function (v, i) {
      var x = pL + i * (w - pL - pR) / Math.max(vals.length - 1, 1);
      var y = pT + (h - pT - pB) * (1 - (v - mn) / span);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    var up = vals[vals.length - 1] >= vals[0];
    return '<svg class="axis-svg" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none"><polyline fill="none" stroke="' + (up ? "var(--go)" : "var(--stop)") + '" stroke-width="2" points="' + pts + '"/></svg>';
  }

  function nextJob(now) {
    var best = null;
    for (var add = 0; add < 8; add++) {
      var day = new Date(now.getTime());
      day.setDate(day.getDate() + add);
      var dow = day.getDay();
      for (var i = 0; i < JOBS.length; i++) {
        var j = JOBS[i];
        if (j.days.indexOf(dow) < 0) continue;
        var parts = j.t.split(":");
        var when = new Date(day);
        when.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
        if (when <= now) continue;
        if (!best || when < best.when) best = { when: when, t: j.t, name: j.name, role: j.role, add: add };
      }
      if (best) break;
    }
    return best;
  }

  function jobAlert(now) {
    var n = nextJob(now);
    if (!n) return { n: null, eta: "\u2014", cls: "later", label: "Idle" };
    var secs = Math.max(0, Math.floor((n.when - now) / 1000));
    var h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
    var eta = (n.add ? n.add + "d " : "") + pad(h) + ":" + pad(m);
    var mins = secs / 60;
    var cls, label;
    if (mins <= 15) { cls = "hot"; label = "Due now"; }
    else if (mins <= 60) { cls = "soon"; label = "Soon"; }
    else if (n.add === 0) { cls = "today"; label = "Today"; }
    else { cls = "later"; label = n.add === 1 ? "Tomorrow" : n.add + " days"; }
    return { n: n, eta: eta, cls: cls, label: label, mins: mins };
  }

  function donutPath(cx, cy, r0, r1, a0, a1) {
    var large = a1 - a0 > Math.PI ? 1 : 0;
    function p(r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var p0 = p(r1, a0), p1 = p(r1, a1), p2 = p(r0, a1), p3 = p(r0, a0);
    return "M" + p0[0] + " " + p0[1] + " A" + r1 + " " + r1 + " 0 " + large + " 1 " + p1[0] + " " + p1[1] +
      " L" + p2[0] + " " + p2[1] + " A" + r0 + " " + r0 + " 0 " + large + " 0 " + p3[0] + " " + p3[1] + " Z";
  }
  function mixSlices(book, t) {
    if (t === "combined" && book.books && book.books.length) {
      return book.books.map(function (b, i) {
        return { key: b.id, label: b.label, value: Number(b.equity) || 0, color: MIX[i % MIX.length] };
      }).filter(function (s) { return s.value > 0.004; });
    }
    var held = (book.names || []).filter(function (n) { return (Number(n.value) || 0) > 0.004; })
      .sort(function (a, b) { return (Number(b.value) || 0) - (Number(a.value) || 0); });
    var rows = held.map(function (n, i) {
      return { key: n.symbol, label: n.symbol, value: Number(n.value) || 0, color: MIX[i % MIX.length] };
    });
    if ((Number(book.cash) || 0) > 0.004) rows.push({ key: "cash", label: "Cash", value: Number(book.cash) || 0, color: "var(--mix-cash)" });
    return rows;
  }
