  var TABS = [
    { id: "combined", label: "House" },
    { id: "agentic", label: "Agentic" },
    { id: "individual", label: "Individual" },
    { id: "auto_grok", label: "Auto-Grok" },
    { id: "joint", label: "Joint" }
  ];
  var LABEL = { agentic: "Agentic", individual: "Individual", auto_grok: "Auto-Grok", joint: "Joint", combined: "House" };
  var IDS = ["agentic", "individual", "auto_grok", "joint"];
  var JOBS = [
    { t: "21:00", days: [0, 1, 2, 3, 4], name: "Policy Pack Evening", role: "No trading." },
    { t: "06:30", days: [1, 2, 3, 4, 5], name: "Policy Pack AM", role: "Overnight delta only." },
    { t: "09:45", days: [1, 2, 3, 4, 5], name: "Autopilot AM", role: "Deploy + book-state." },
    { t: "10:15", days: [1, 2, 3, 4, 5], name: "Watch AM", role: "Health only." },
    { t: "11:45", days: [1, 2, 3, 4, 5], name: "Eyes", role: "Risk-first." },
    { t: "13:45", days: [1, 2, 3, 4, 5], name: "Eyes", role: "Risk-first." },
    { t: "15:05", days: [1, 2, 3, 4, 5], name: "Autopilot PM", role: "Last redeploy." },
    { t: "15:20", days: [1, 2, 3, 4, 5], name: "Watch PM", role: "Health only." }
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
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      if (c === "&") return "\x26amp;";
      if (c === "<") return "\x26lt;";
      if (c === ">") return "\x26gt;";
      if (c === '"') return "\x26quot;";
      return "\x26#39;";
    });
  }
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
      return { symbol: n.symbol, name: n.name || n.symbol, kind: "equity", qty: q, avg: avg, last: last, value: value, cost: cost, pnl: pnl, pnl_pct: pnl_pct, first_fill: n.first_fill || "", next_stall: n.next_stall || "", account: "agentic", accounts: ["agentic"] };
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
    var rolled = { t: out.asof || (pilot && pilot.asof) || new Date().toISOString(), equity: out.combined.equity };
    out.tape.combined = (out.tape.combined || []).map(normPrint).concat([rolled]);
    out.pilot = pilot;
    return out;
  }
  function normPrint(p) {
    if (!p) return p;
    var t = p.t;
    if (typeof t === "number") t = new Date(t).toISOString();
    return { t: String(t || ""), dtg: p.dtg || "", equity: rnd(p.equity), max: p.max != null ? rnd(p.max) : rnd(p.equity) };
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
