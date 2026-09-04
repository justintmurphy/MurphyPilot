  var overlayOpen = false;
  var overlayMode = "live";

  function applyTheme(choice) {
    var t = choice || document.documentElement.getAttribute("data-theme") || "justin";
    if (t === "nina" || t === "purple") t = "nina";
    else t = "justin";
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("murphyPilotTheme", t); } catch (err) {}
    document.querySelectorAll("[data-theme-choice]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-theme-choice") === t);
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "nina" ? "#1A0A24" : "#08090B");
  }
  function closeDeskMenu() {
    var menu = document.getElementById("deskMenu");
    var btn = document.getElementById("menuBtn");
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
  }
  function paintNav() {
    var el = document.getElementById("tabs");
    var onId = tab;
    if (typeof RH_IDS !== "undefined" && RH_IDS.indexOf(tab) >= 0) onId = "robinhood";
    if (el) {
      el.innerHTML = TABS.map(function (item) {
        return '<button type="button" data-tab="' + item.id + '" class="' + (onId === item.id ? "on" : "") + '">' + item.label + "</button>";
      }).join("");
    }
    var sub = document.getElementById("deskSub");
    if (sub) sub.textContent = LABEL[tab] || "HOUSE";
    document.title = "Murphy Pilot \u00b7 " + (LABEL[tab] || "House");
    applyTheme();
  }

  function cardsHtml() {
    return "<h2>Four books</h2><div class=\"acct-grid four\">" + IDS.map(function (id) {
      var b = snap.accounts[id] || {};
      return '<button type="button" class="acct-mini" data-tab="' + id + '"><div class="k">' + esc(LABEL[id]) + "</div><b>" + money(b.equity) + '</b><div class="m">' + (b.names || []).length + " names</div></button>";
    }).join("") + "</div>";
  }


  function dodTape(key) {
    var tape = (typeof snap !== "undefined" && snap && snap.tape) || {};
    if (key === "combined" && tape.overall && tape.overall.length >= 2) return tape.overall;
    if (key === "robinhood") return tape.robinhood || tape.combined || [];
    return tape[key] || [];
  }
  function ymdAdd(ymd, days) {
    var p = String(ymd || "").split("-").map(Number);
    if (p.length < 3 || !p[0]) return "";
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2] + days));
    return dt.toISOString().slice(0, 10);
  }
  function ymdDiff(a, b) {
    var pa = String(a || "").split("-").map(Number);
    var pb = String(b || "").split("-").map(Number);
    if (pa.length < 3 || pb.length < 3) return 0;
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
  }
  function lastByDay(prints) {
    var by = {};
    (prints || []).forEach(function (raw) {
      var p = typeof normPrint === "function" ? normPrint(raw) : raw;
      if (!p || !p.t) return;
      var eq = Number(p.equity);
      if (!isFinite(eq)) return;
      var day = String(p.t).slice(0, 10);
      if (!day) return;
      var prev = by[day];
      if (!prev || String(p.t) >= String(prev.t)) by[day] = { t: p.t, day: day, equity: eq };
    });
    return Object.keys(by).sort().map(function (d) { return by[d]; });
  }
  function vsLookback(prints, currentEq, days) {
    var rows = lastByDay(prints);
    if (!rows.length) return null;
    var lastDay = rows[rows.length - 1].day;
    var target = ymdAdd(lastDay, -days);
    var prior = null;
    rows.forEach(function (row) { if (row.day <= target) prior = row; });
    if (!prior && days > 1 && ymdDiff(rows[0].day, lastDay) >= days - 2) prior = rows[0];
    if (!prior) return null;
    var cur = isFinite(Number(currentEq)) ? Number(currentEq) : rows[rows.length - 1].equity;
    var delta = cur - prior.equity;
    return { delta: delta, pct: prior.equity ? (delta / prior.equity) * 100 : null, prior: prior.equity };
  }
  function vsYtd(prints, currentEq) {
    var rows = lastByDay(prints);
    if (!rows.length) return null;
    var y = rows[rows.length - 1].day.slice(0, 4);
    var yearStart = y + "-01-01";
    var prior = null;
    rows.forEach(function (row) { if (row.day < yearStart) prior = row; });
    if (!prior) return null;
    var cur = isFinite(Number(currentEq)) ? Number(currentEq) : rows[rows.length - 1].equity;
    var delta = cur - prior.equity;
    return { delta: delta, pct: prior.equity ? (delta / prior.equity) * 100 : null, prior: prior.equity };
  }
  function improveLine(tag, d) {
    if (!d) return '<small class="dod tone-flat">' + tag + " \u2014</small>";
    return '<small class="dod tone-' + tone(d.delta) + '">' + tag + " " + (d.delta > 0 ? "+" : "") + money(d.delta) + " \u00b7 " + pct(d.pct) + "</small>";
  }
  function dodHtml(prints, currentEq) {
    return improveLine("Day", vsLookback(prints, currentEq, 1)) +
      improveLine("Week", vsLookback(prints, currentEq, 7)) +
      improveLine("Month", vsLookback(prints, currentEq, 30));
  }
  function improveCell(label, d) {
    if (!d) return "<div><span>" + label + "</span><b class=\"tone-flat\">\u2014</b></div>";
    return "<div><span>" + label + "</span><b class=\"tone-" + tone(d.delta) + "\">" + (d.delta > 0 ? "+" : "") + money(d.delta) + "</b>" +
      '<small class="dod tone-' + tone(d.delta) + '">' + pct(d.pct) + "</small></div>";
  }
  function improveKpis(prints, currentEq) {
    return improveCell("Day", vsLookback(prints, currentEq, 1)) +
      improveCell("Week", vsLookback(prints, currentEq, 7)) +
      improveCell("Month", vsLookback(prints, currentEq, 30));
  }
  function growChip(label, d) {
    if (!d) return '<div class="ov-chip"><span>' + label + '</span><b class="tone-flat">\u2014</b></div>';
    return '<div class="ov-chip"><span>' + label + '</span><b class="tone-' + tone(d.delta) + '">' +
      (d.delta > 0 ? "+" : "") + money(d.delta) + '</b><i class="tone-' + tone(d.delta) + '">' + pct(d.pct) + "</i></div>";
  }
  function overallStripHtml() {
    var c = (snap && snap.combined) || {};
    var prints = dodTape("combined");
    var eq = Number(c.equity) || 0;
    var asof = c.outside_asof || c.overall_asof || "";
    return '<div class="card span overall-strip tape-open" data-open-all-books="1">' +
      '<div class="ov-hero"><span>Overall \u00b7 last close</span><b>' + money(eq) + "</b></div>" +
      '<div class="ov-chips">' +
      growChip("Day", vsLookback(prints, eq, 1)) +
      growChip("Week", vsLookback(prints, eq, 7)) +
      growChip("Month", vsLookback(prints, eq, 30)) +
      growChip("YTD", vsYtd(prints, eq)) +
      growChip("Year", vsLookback(prints, eq, 365)) +
      "</div>" +
      '<div class="tape-plot ov-plot">' + overlayAxisChart(prints) + "</div>" +
      '<p class="hint">Click for every book. Live (Robinhood + Fidelity) ' + money(c.live_equity) + " \u00b7 Voya EOD " + money(c.custodial_equity) + "." +
      (asof ? " Holdings " + esc(String(asof).slice(0, 10)) + "." : "") + "</p></div>";
  }

  function stateHtml(b, title) {
    var eqCell = tab === "combined" ? "" : ("<div><span>Equity</span><b>" + money(b.equity) + "</b>" + dodHtml(dodTape(tab), b.equity) + "</div>");
    return "<h2>Book state \u00b7 " + esc(title) + "</h2><div class=\"card span\"><div class=\"kpi\">" +
      eqCell +
      "<div><span>Buying power</span><b>" + money(b.buying_power) + "</b></div>" +
      "<div><span>Invested</span><b>" + (isFinite(b.invested_pct) ? Math.min(b.invested_pct, 100).toFixed(1) + "%" : "\u2014") + "</b></div>" +
      "<div><span>Names</span><b>" + (b.names || []).length + "</b></div></div>" +
      '<p class="hint">Cash ' + money(b.cash) + " \u00b7 pending already in " + money(b.pending_deposits) + " \u00b7 orders " + (b.open_orders || 0) +
      (b.slots != null ? " \u00b7 slots " + b.slots : "") + "</p></div>";
  }

  function tapeHtml(key, title, clickable) {
    var src = (snap.tape && snap.tape[key]) || [];
    if (key === "robinhood") src = (snap.tape && (snap.tape.robinhood || snap.tape.combined)) || [];
    if (key === "combined" && snap.tape && snap.tape.live && snap.tape.live.length) src = src.concat(snap.tape.live);
    var prints = (typeof mergePrints === "function" ? mergePrints(src) : src.map(normPrint).filter(function (p) { return p && isFinite(p.equity); }));
    var vals = prints.map(function (p) { return p.equity; });
    var liveNow = null;
    if (key === "combined" && snap.combined && snap.combined.live_equity != null) liveNow = Number(snap.combined.live_equity);
    else if (key === "robinhood" && snap.robinhood && snap.robinhood.equity != null) liveNow = Number(snap.robinhood.equity);
    var last = (liveNow != null && isFinite(liveNow)) ? liveNow : (vals.length ? vals[vals.length - 1] : (book().equity || 0));
    if (!vals.length) vals = [last, last];
    var open = clickable ? ' data-open-books="1"' : "";
    var hint;
    if (clickable && key === "robinhood") hint = '<p class="hint tape-open-hint">Robinhood session only. Click for Marlowe / Individual / Auto / Joint charts.</p>';
    else if (clickable) hint = '<p class="hint tape-open-hint">Live Robinhood + Fidelity session. Voya is EOD. Click for live book charts.</p>';
    else hint = '<p class="hint">Day / week / month vs this book\u2019s last print.</p>';
    var liveTitle = title === "House" ? "Robinhood + Fidelity" : title;
    return "<h2>Live equity \u00b7 " + esc(liveTitle) + "</h2><div class=\"card tape-card" + (clickable ? " tape-open" : "") + "\"" + open + ">" +
      '<div class="tape-kpis"><div><span>Now</span><b>' + money(last) + "</b></div>" +
      improveKpis(prints, last) + "</div>" +
      '<div class="tape-plot ov-plot">' + overlayAxisChart(prints) + "</div>" + hint + "</div>";
  }

  function mixHtml(bookObj, t) {
    var slices = mixSlices(bookObj, t);
    var total = slices.reduce(function (s, x) { return s + x.value; }, 0) || 1;
    var a = -Math.PI / 2;
    var paths = slices.map(function (s) {
      var da = (s.value / total) * Math.PI * 2;
      var d = donutPath(56, 56, 28, 52, a, a + Math.max(da, 0.01));
      a += da;
      return { key: s.key, label: s.label, color: s.color, d: d, pct: (s.value / total) * 100, value: s.value };
    });
    if (!paths.length) return '<div class="card mix-card"><p class="hint" style="margin:0">No mix yet.</p></div>';
    var svg = '<svg class="mix-svg" viewBox="0 0 112 112" aria-hidden="true">' +
      paths.map(function (p) { return '<path d="' + p.d + '" fill="' + p.color + '"/>'; }).join("") + "</svg>";
    var legend = paths.map(function (p) {
      return '<div class="mix-leg"><i style="background:' + p.color + '"></i><span>' + esc(p.label) + "</span><b>" + p.pct.toFixed(0) + "% \u00b7 " + money(p.value) + "</b></div>";
    }).join("") + '<div class="mix-hint">' + (t === "combined" ? "Brokers \u00b7 where the money sits" : "Names by market value") + "</div>";
    return '<div class="card mix-card"><div class="mix-compact">' + svg + '<div class="mix-legend">' + legend + "</div></div></div>";
  }

  function tableHtml(names, showBook, showStall) {
    names = (names || []).slice().sort(function (a, b) {
      return (Number(b.value) || 0) - (Number(a.value) || 0);
    });
    if (!names.length) return '<div class="card"><p class="hint" style="margin:0">No names on this book.</p></div>';
    var head = "<tr><th>Name</th>" + (showBook ? "<th>Book</th>" : "") + '<th class="num">Qty</th><th class="num">Avg</th><th class="num">Last</th>' +
      (showStall ? "<th>First fill</th><th>Next stall</th>" : "") +
      "<th>Last fill</th>" +
      '<th class="num">Value</th><th class="num">P&L</th></tr>';
    var rows = names.map(function (n) {
      var books = (n.accounts || []).map(function (a) { return LABEL[a] || a; }).join(" \u00b7 ") || LABEL[n.account] || "";
      var chg = n.day_pct != null ? n.day_pct : n.pnl_pct;
      var nameTone = tone(chg);
      return "<tr><td class=\"name-cell tone-" + nameTone + "\"><span class=\"sym\">" + esc(n.symbol) + '</span><span class="sub">' + esc(n.name || "") + "</span></td>" +
        (showBook ? "<td>" + esc(books) + "</td>" : "") +
        '<td class="num">' + qty(n.qty) + '</td><td class="num">' + (n.avg == null ? "\u2014" : money(n.avg)) + "</td>" +
        '<td class="num">' + (n.last == null ? "\u2014" : money(n.last)) + "</td>" +
        (showStall ? "<td>" + esc(n.first_fill || "\u2014") + "</td><td>" + esc(n.next_stall || "\u2014") + "</td>" : "") +
        "<td>" + esc(n.last_fill || n.first_fill || "\u2014") + "</td>" +
        '<td class="num">' + money(n.value) + '</td><td class="num tone-' + tone(n.pnl) + '">' + money(n.pnl) + " " + pct(n.pnl_pct) + "</td></tr>";
    }).join("");
    var wrap = (showBook || names.length > 10) ? "card book-scroll" : "card";
    return '<div class="' + wrap + '"><table class="book"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table></div>";
  }

  function nextAlertHtml() {
    var a = jobAlert(nyNow());
    var n = a.n;
    return '<div class="next-alert alert-' + a.cls + '"><div class="next-alert-mark">' + esc(a.label) + "</div>" +
      '<div class="next"><div><div class="name">' + (n ? n.t + "  " + n.name : "No job queued") +
      '</div><div class="hint">' + (n ? ((n.who ? n.who + " · " : "") + n.role) : "") + "</div></div><div class=\"eta\">" + a.eta + "</div></div></div>";
  }

  function splitClockCal() {
    var now = nyNow();
    var today = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    var clockRows = JOBS.map(function (j) {
      var when = (typeof jobWhen === "function") ? jobWhen(j) : j.t;
      return "<tr><td>" + esc(when) + "</td><td>" + esc(j.name) + "</td><td>" + esc(j.who || "") + "</td><td>" + esc(j.role) + "</td></tr>";
    }).join("");
    var cal = CAL.map(function (row) {
      var cls = row[0] === today ? "tone-soon" : (row[0] < today ? "tone-flat" : "");
      return '<div class="cal-row ' + cls + '"><b>' + row[0] + "</b> \u00b7 " + esc(row[1]) + (row[0] === today ? " \u00b7 today" : "") + "</div>";
    }).join("");
    return '<div class="split-two">' +
      "<div><h2>Weekly clock</h2><div class=\"card span\"><table><thead><tr><th>ET</th><th>Job</th><th>Who</th><th>Does</th></tr></thead><tbody>" + clockRows + "</tbody></table></div></div>" +
      "<div><h2>Coming weeks</h2><div class=\"card\">" + cal + "</div></div></div>";
  }

  function overlayIds(mode) {
    if (typeof RH_IDS !== "undefined" && tab === "robinhood") return RH_IDS.slice();
    var live = (typeof LIVE_IDS !== "undefined" && LIVE_IDS && LIVE_IDS.length) ? LIVE_IDS.slice() : ["agentic", "individual", "auto_grok", "joint"];
    if (mode === "live") return ["combined"].concat(live);
    var all = (typeof IDS !== "undefined" && IDS && IDS.length) ? IDS.slice() : live.slice();
    return ["combined"].concat(all);
  }
  function overlayPrints(id, mode) {
    var tape = (snap && snap.tape) || {};
    if (mode === "all" && id === "combined") return tape.overall || tape.combined || [];
    if (id === "robinhood") return tape.robinhood || tape.combined || [];
    if (id === "fidelity" || id === "voya") return tape[id] || [];
    var src = tape[id] || [];
    if (id === "combined" && tape.live && tape.live.length) src = src.concat(tape.live);
    return src;
  }
  function axisMoney(n) {
    n = Number(n);
    if (!isFinite(n)) return "\u2014";
    var abs = Math.abs(n), sign = n < 0 ? "\u2212" : "";
    return sign + "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function axisWhen(t, multiDay) {
    var s = String(t || "");
    var day = s.slice(5, 10);
    var hm = s.slice(11, 16);
    if (!day) return "";
    var md = String(Number(day.slice(0, 2))) + "/" + String(Number(day.slice(3, 5)));
    if (!hm || multiDay) return md;
    var h = Number(hm.slice(0, 2)), m = hm.slice(3, 5);
    var ap = h >= 12 ? "p" : "a";
    h = h % 12; if (!h) h = 12;
    return h + ":" + m + ap;
  }
  function overlayAxisChart(prints) {
    prints = (prints || []).filter(function (p) { return p && isFinite(p.equity); });
    if (!prints.length) return "";
    if (prints.length === 1) prints = [prints[0], prints[0]];
    var vals = prints.map(function (p) { return p.equity; });
    var w = 640, h = 88, pL = 4, pR = 4, pT = 6, pB = 6;
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mx === mn) { var padY = Math.max(Math.abs(mx) * 0.01, 0.5); mn -= padY; mx += padY; }
    var span = mx - mn || 1;
    var t0 = Date.parse(prints[0].t), t1 = Date.parse(prints[prints.length - 1].t);
    var multiDay = isFinite(t0) && isFinite(t1) && (t1 - t0) > 36 * 3600 * 1000;
    var pts = vals.map(function (v, i) {
      var x = pL + i * (w - pL - pR) / Math.max(vals.length - 1, 1);
      var y = pT + (h - pT - pB) * (1 - (v - mn) / span);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    var up = vals[vals.length - 1] >= vals[0];
    var svg = '<svg class="ov-line-svg" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none"><polyline fill="none" stroke="' +
      (up ? "var(--go)" : "var(--stop)") + '" stroke-width="2" points="' + pts + '"/></svg>';
    var xLabs = [axisWhen(prints[0].t, multiDay)];
    if (prints.length > 2) xLabs.push(axisWhen(prints[Math.floor((prints.length - 1) / 2)].t, multiDay));
    xLabs.push(axisWhen(prints[prints.length - 1].t, multiDay));
    return '<div class="ov-axis">' +
      '<div class="ov-ycol"><span>' + axisMoney(mx) + "</span><span>" + axisMoney((mx + mn) / 2) + "</span><span>" + axisMoney(mn) + "</span></div>" +
      '<div class="ov-plot-inner">' + svg + "</div></div>" +
      '<div class="ov-xrow">' + xLabs.map(function (lab) { return "<span>" + lab + "</span>"; }).join("") + "</div>";
  }
  function overlayChartCard(id, mode) {
    var raw = overlayPrints(id, mode);
    var prints = (typeof mergePrints === "function" ? mergePrints(raw) : (raw || []).map(normPrint).filter(function (p) { return p && isFinite(p.equity); }));
    var vals = prints.map(function (p) { return p.equity; }).filter(function (v) { return isFinite(v); });
    var last = vals.length ? vals[vals.length - 1] : Number(((id === "combined" ? snap.combined : id === "robinhood" ? snap.robinhood : snap.accounts[id]) || {}).equity) || 0;
    if (!prints.length) prints = [{ t: "", equity: last }];
    var eod = (id === "voya" || (mode === "all" && id === "combined"));
    var label = (mode === "all" && id === "combined") ? "Overall" : (LABEL[id] || id);
    return '<button type="button" class="ov-book ov-chart" data-tab="' + id + '">' +
      '<div class="k">' + esc(label) + " \u00b7 " + (eod ? "EOD" : "live") + "</div><b>" + money(last) + "</b>" +
      '<div class="tape-plot ov-plot">' + overlayAxisChart(prints) + "</div></button>";
  }
  function overlaySheet(domId, mode, title, hint) {
    var rows = overlayIds(mode).map(function (id) { return overlayChartCard(id, mode); }).join("");
    var on = overlayOpen && overlayMode === mode;
    return '<div class="books-overlay' + (on ? " on" : "") + '" id="' + domId + '"' + (on ? "" : " hidden") + '>' +
      '<div class="books-sheet" role="dialog" aria-label="' + esc(title) + '">' +
      '<div class="books-head"><h2 style="margin:0">' + esc(title) + "</h2>" +
      '<button type="button" class="ov-close" data-close-books="1">Close</button></div>' +
      '<p class="hint" style="margin:8px 0 10px">' + esc(hint) + "</p>" +
      '<div class="ov-grid ov-charts">' + rows + "</div></div></div>";
  }
  function overlayHtml() {
    if (!snap) return "";
    if (tab === "robinhood") {
      return overlaySheet("booksOverlay", "live", "Live equity \u00b7 Robinhood", "Session prints for Marlowe, Individual, Auto, and Joint.");
    }
    return overlaySheet("booksOverlay", "live", "Live equity \u00b7 Robinhood + Fidelity", "Session prints for Robinhood books and Fidelity. Voya is EOD-only.") +
      overlaySheet("booksOverlayAll", "all", "Overall \u00b7 all books", "Net worth plus every book. Only Voya is EOD.");
  }

  function agenticOnlyHtml() {
    var ag = snap.accounts.agentic || {};
    return stateHtml(ag, "Marlowe") +
      "<h2>Marlowe book</h2>" + tableHtml(ag.names, false, true) +
      "<h2>Sell / buy thresholds</h2><div class=\"card span\"><ul class=\"buy-lines\">" +
      "<li>Stall: day 2 must clear +5% from that name's cost; later blocks +4% from the survive-mark.</li>" +
      "<li>Floor \u22125% from cost. Hard cap \u22126% at any print. Flatten \u221210%.</li>" +
      "<li>Slots = floor(Marlowe equity / $75). 12h green lock. Same-symbol rebuy waits 24h.</li>" +
      "</ul></div>" +
      splitClockCal() +
      '<p class="hint"><a href="agentic.html">Open the full Marlowe trading desk</a> for charts, pack links, and snapshot paste.</p>';
  }

  function paint() {
    if (!snap) return;
    paintNav();
    var b = book();
    var title = LABEL[tab] || tab;
    var idxLead = [];
    if (typeof INDEXES !== "undefined" && INDEXES) {
      [["spx", "S&P"], ["ndx", "Nasdaq"]].forEach(function (pair) {
        var q = INDEXES[pair[0]];
        if (!q || q.last == null) return;
        var last = Number(q.last);
        var chg = q.pct != null ? Number(q.pct) : (q.prev ? ((last - Number(q.prev)) / Number(q.prev)) * 100 : null);
        idxLead.push({ symbol: q.label || pair[1], last: last, day_pct: chg, index: true });
      });
    }
    var tickerNames = b.names || [];
    var track = document.getElementById("tickerTrack");
    var hideTape = tab === "voya";
    var names = hideTape ? [] : tickerNames.filter(function (n) { return n.last != null; });
    var items = idxLead.concat(names);
    document.getElementById("ticker").style.display = items.length ? "" : "none";
    if (items.length) {
      var loop = items.concat(items);
      track.innerHTML = loop.map(function (n) {
        var chg = n.day_pct != null ? n.day_pct : n.pnl_pct;
        var chgHtml = (chg == null || !isFinite(Number(chg))) ? "" : pct(chg);
        var px = n.index ? Number(n.last).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : money(n.last);
        return '<span class="ticker-item ' + (n.index ? "idx " : "") + (tone(chg) === "go" ? "up" : tone(chg) === "stop" ? "down" : "flat") + '"><span class="sym">' + esc(n.symbol) + '</span><span class="px">' + px + '</span><span class="chg">' + chgHtml + "</span></span>";
      }).join("");
    }
    var html = nextAlertHtml();
    if (tab === "combined") {
      html += overallStripHtml();
      html += cardsHtml();
      html += stateHtml(b, "House");
      html += tapeHtml("combined", "House", true);
      html += "<h2>Where it sits</h2>" + mixHtml(b, "combined");
      html += "<h2>Book</h2>" + tableHtml(b.names, true, true);
      html += splitClockCal();
      html += overlayHtml();
    } else if (tab === "robinhood") {
      html += cardsHtml();
      html += stateHtml(b, "Robinhood");
      html += tapeHtml("robinhood", "Robinhood", true);
      html += "<h2>Where it sits</h2>" + mixHtml(b, "combined");
      html += "<h2>Book</h2>" + tableHtml(b.names, true, true);
      html += splitClockCal();
      html += overlayHtml();
    } else if (tab === "agentic") {
      html += tapeHtml("agentic", "Marlowe", false);
      html += agenticOnlyHtml();
    } else {
      html += stateHtml(b, title);
      html += tapeHtml(tab, title, false);
      html += "<h2>Where it sits</h2>" + mixHtml(b, tab);
      html += "<h2>Book</h2>" + tableHtml(b.names, false, false);
    }
    var footMsg = "Murphy Pilot \u00b7 Live = Robinhood + Fidelity. Voya is EOD.";
    if (tab === "robinhood" || (typeof RH_IDS !== "undefined" && RH_IDS.indexOf(tab) >= 0)) footMsg = "Murphy Pilot \u00b7 Robinhood live books only.";
    else if (tab === "fidelity") footMsg = "Murphy Pilot \u00b7 Fidelity live.";
    else if (tab === "voya") footMsg = "Murphy Pilot \u00b7 Voya is Truthifi EOD.";
    html += '<footer class="desk-foot">' + footMsg + "</footer>";
    document.getElementById("desk").innerHTML = html;
    syncOverlay();
  }

  function syncOverlay() {
    ["booksOverlay", "booksOverlayAll"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var on = overlayOpen && ((id === "booksOverlay" && overlayMode === "live") || (id === "booksOverlayAll" && overlayMode === "all"));
      if (on) {
        el.classList.add("on");
        el.removeAttribute("hidden");
      } else {
        el.classList.remove("on");
        el.setAttribute("hidden", "");
      }
    });
    document.body.style.overflow = overlayOpen ? "hidden" : "";
  }

  function load() {
    Promise.all([
      fetch((/\/house(\/|$)/.test(location.pathname) ? "house-snapshot.json" : "house/house-snapshot.json") + "?t=" + Date.now(), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch((/\/house(\/|$)/.test(location.pathname) ? "../pilot-snapshot.json" : "pilot-snapshot.json") + "?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (pair) {
      snap = merge(pair[0], pair[1]);
      paint();
    }).catch(function (e) {
      document.getElementById("desk").innerHTML = "<p class='hint'>Could not load snapshots. " + esc(e) + "</p>";
    });
  }

  document.addEventListener("click", function (e) {
    var menuBtn = e.target.closest("#menuBtn");
    if (menuBtn) {
      var menu = document.getElementById("deskMenu");
      if (menu) {
        menu.hidden = !menu.hidden;
        menuBtn.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
      }
      return;
    }
    if (!e.target.closest(".menu-wrap")) closeDeskMenu();
    var theme = e.target.closest("[data-theme-choice]");
    if (theme) {
      applyTheme(theme.getAttribute("data-theme-choice"));
      return;
    }
    if (e.target.closest("[data-open-all-books]")) {
      overlayMode = "all";
      overlayOpen = true;
      if (!document.getElementById("booksOverlayAll")) paint();
      else syncOverlay();
      return;
    }
    if (e.target.closest("[data-open-books]")) {
      overlayMode = "live";
      overlayOpen = true;
      if (!document.getElementById("booksOverlay")) paint();
      else syncOverlay();
      return;
    }
    if (e.target.closest("[data-close-books]") || e.target.id === "booksOverlay" || e.target.id === "booksOverlayAll") {
      overlayOpen = false;
      syncOverlay();
      return;
    }
    var btn = e.target.closest("[data-tab]");
    if (btn) {
      overlayOpen = false;
      tab = btn.getAttribute("data-tab");
      closeDeskMenu();
      setHash();
      paint();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeDeskMenu();
      if (overlayOpen) { overlayOpen = false; syncOverlay(); }
    }
  });
  window.addEventListener("hashchange", function () {
    if (typeof hashTab === "function") hashTab();
    if (typeof paint === "function" && snap) paint();
  });

  hashTab();
  function tickClock() {
    var now = nyNow();
    var el = document.getElementById("clock");
    if (!el) return;
    var tEl = el.querySelector(".t");
    var dEl = el.querySelector(".d");
    var asof = snap && snap.asof;
    var ago = "";
    var asofLabel = "";
    if (asof) {
      var ms = Date.parse(asof);
      if (isFinite(ms)) {
        var mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
        ago = mins < 1 ? "just now" : (mins < 60 ? mins + "m ago" : Math.floor(mins / 60) + "h ago");
        var ad = new Date(ms);
        try {
          asofLabel = ad.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
        } catch (e) { asofLabel = ""; }
      }
    }
    if (tEl) tEl.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds()) + " ET";
    if (dEl) dEl.textContent = asofLabel ? (asofLabel + " print") : now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  tickClock();
  setInterval(tickClock, 1000);
  setInterval(function () { if (typeof load === "function") load(); }, 5 * 60 * 1000);
