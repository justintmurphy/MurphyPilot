    var cls = axis ? "axis-svg" : "mini-svg";
    var par = axis ? "xMidYMid meet" : "none";
    return '<svg class="' + cls + '" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="' + par + '" aria-hidden="true">' + extras + "</svg>";
  }

  function mixHtml(book, t) {
    var slices = mixSlices(book, t);
    var total = slices.reduce(function (s, x) { return s + x.value; }, 0) || 1;
    var a = -Math.PI / 2;
    var paths = slices.map(function (s) {
      var da = (s.value / total) * Math.PI * 2;
      var d = donutPath(56, 56, 28, 52, a, a + Math.max(da, 0.01));
      a += da;
      return { key: s.key, label: s.label, color: s.color, d: d, pct: (s.value / total) * 100 };
    });
    var svg = '<svg class="mix-svg" viewBox="0 0 112 112" aria-hidden="true">' +
      paths.map(function (p) { return '<path d="' + p.d + '" fill="' + p.color + '"/>'; }).join("") + "</svg>";
    var legend = paths.map(function (p) {
      return '<div class="mix-leg"><i style="background:' + p.color + '"></i><span>' + esc(p.label) + "</span><b>" + p.pct.toFixed(0) + "%</b></div>";
    }).join("") + '<div class="mix-hint">' + (t === "combined" ? "Three books + cash" : "Names by market value") + "</div>";
    return '<div class="card mix-card"><div class="mix-compact">' + svg + '<div class="mix-legend">' + legend + "</div></div></div>";
  }

  function bookTable(book, showAccount) {
    if (!book.names || !book.names.length) return '<div class="card"><p class="hint" style="margin:0">No names on this book.</p></div>';
    var head = "<tr><th>Name</th>" + (showAccount ? "<th>Book</th>" : "") +
      '<th class="num">Qty</th><th class="num">Avg</th><th class="num">Last</th><th class="num">Value</th><th class="num">P&L</th><th class="num">Vs cost</th></tr>';
    var rows = book.names.map(function (n) {
      var books = n.accounts && n.accounts.length
        ? n.accounts.map(function (a) { return ACCOUNT_LABEL[a]; }).join(" \u00b7 ")
        : (n.account && n.account !== "combined" ? ACCOUNT_LABEL[n.account] : "\u2014");
      return "<tr><td><span class=\"sym\">" + esc(n.symbol) + '</span><span class="sub">' + esc(n.name || (n.kind === "crypto" ? "Crypto" : "Equity")) + "</span></td>" +
        (showAccount ? "<td>" + esc(books) + "</td>" : "") +
        '<td class="num">' + qty(n.qty) + '</td><td class="num">' + (n.avg == null ? "\u2014" : money(n.avg, n.kind === "crypto" ? 0 : 2)) + "</td>" +
        '<td class="num">' + (n.last == null ? "\u2014" : money(n.last, n.kind === "crypto" ? 0 : 2)) + "</td>" +
        '<td class="num">' + money(n.value) + '</td><td class="num tone-' + tone(n.pnl) + '">' + signedMoney(n.pnl) + "</td>" +
        '<td class="num tone-' + tone(n.pnl_pct) + '">' + pct(n.pnl_pct) + "</td></tr>";
    }).join("");
    return '<div class="card"><table class="book"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table></div>";
  }

  function tapeBoard(prints, title, hint) {
    if (!prints.length) return '<div class="card"><p class="hint" style="margin:0">No value ticks yet. The next snapshot JSON adds the first print.</p></div>';
    var eq = prints.map(function (p) { return p.equity; });
    var mx = prints.map(function (p) { return p.max; });
    var dtg = prints.map(function (p) { return p.dtg; });
    var plotEq = eq.length === 1 ? [eq[0], eq[0]] : eq;
    var plotMax = mx.length === 1 ? [mx[0], mx[0]] : mx;
    var plotDtg = dtg.length === 1 ? [dtg[0], dtg[0]] : dtg;
    var lastEq = eq[eq.length - 1];
    var first = eq[0];
    var hwm = mx[mx.length - 1];
    var lo = Math.min.apply(null, eq);
    var vsFirst = first ? ((hwm / first) - 1) * 100 : null;
    var vsHwm = hwm ? ((lastEq / hwm) - 1) * 100 : null;
    var grown = hwm - first;
    var nowCls = lastEq + 0.004 < hwm ? "tone-stop" : "tone-go";
    var growCls = "tone-" + tone(vsFirst);
    var i = tapeSel[tab] == null ? prints.length - 1 : Math.min(tapeSel[tab], prints.length - 1);
    var plotSel = eq.length === 1 ? 1 : i;
    var shown = prints.slice(Math.max(0, prints.length - 40));
    var startI = prints.length - shown.length;
    var ledger = shown.slice().reverse().map(function (p, revI) {
      var idx = startI + (shown.length - 1 - revI);
      return '<button type="button" class="tape-row' + (idx === i ? " on" : "") + '" data-tape-i="' + idx + '"><span>' + esc(p.dtg) + "</span><b>" + money(p.equity) + "</b></button>";
    }).join("");
    return '<div class="card tape-card">' +
      '<div class="tape-kpis">' +
        "<div><span>Now</span><b class=\"" + nowCls + "\">" + money(lastEq) + "</b></div>" +
        "<div><span>High</span><b class=\"tone-go\">" + money(hwm) + "</b></div>" +
        "<div><span>Vs high</span><b class=\"" + nowCls + "\">" + pct(vsHwm) + "</b></div>" +
        "<div><span>Vs first</span><b class=\"" + growCls + "\">" + pct(vsFirst) + "</b></div>" +
      "</div>" +
      '<div class="tape-plot" id="tapePlot">' +
        sparkSvg(plotEq, plotDtg, hwm, { axis: true, dashLabel: "high", selected: plotSel }) +
      "</div>" +
      '<div class="tape-readout"><b>' + money(prints[i].equity) + "</b><span> \u00b7 " + esc(prints[i].dtg) + (i === prints.length - 1 ? " \u00b7 last" : "") + " \u00b7 " + prints.length + " print" + (prints.length === 1 ? "" : "s") + "</span></div>" +
      '<details class="tape-more"' + (tapeOpen ? " open" : "") + ">" +
        "<summary><span class=\"tape-sum\">Prints</span><span class=\"held\">first " + money(first) + " \u00b7 low " + money(lo) + " \u00b7 " + signedMoney(grown) + " grown</span></summary>" +
        '<div class="tape-ledger">' + ledger + "</div></details></div>";
  }

  function paintTicker(names) {
    var items = (names || []).filter(function (n) { return n.last != null; });
    var el = document.getElementById("tickerTrack");
    if (!items.length) { document.getElementById("ticker").style.display = "none"; return; }
    document.getElementById("ticker").style.display = "";
    var loop = items.concat(items);
    el.innerHTML = loop.map(function (n) {
      var chg = n.day_pct != null ? n.day_pct : n.pnl_pct;
      var cls = tone(chg);
      var up = cls === "go" ? "up" : cls === "stop" ? "down" : "flat";
      var meta = n.account && n.account !== "combined" ? '<span class="meta">' + esc(ACCOUNT_LABEL[n.account]) + "</span>" : "";
      return '<span class="ticker-item ' + up + '"><span class="sym">' + esc(n.symbol) + '</span><span class="px">' +
        money(n.last, n.kind === "crypto" ? 0 : 2) + '</span><span class="chg">' + pct(chg) + "</span>" + meta + "</span>";
    }).join("");
  }

  function paintTabs() {
    document.getElementById("tabs").innerHTML = TABS.map(function (t) {
      return '<button type="button" data-tab="' + t.id + '" class="' + (tab === t.id ? "on" : "") + '">' + t.label + "</button>";
    }).join("");
  }

  function paintDesk() {
    var book = bookFor(snap, tab);
    var tickerNames = tab === "combined" ? snap.combined.names : book.names;
    paintTicker(tickerNames);
    paintTabs();
    var html = "";
    if (tab === "combined") {
      html += "<h2>Three books</h2><div class=\"acct-grid\">";
      ["individual", "auto_grok", "joint"].forEach(function (id) {
        var a = snap.accounts[id];
        html += '<button type="button" class="acct-mini" data-tab="' + id + '"><div class="k">' + esc(a.label) + "</div><b>" +
          money(a.equity) + '</b><div class="m">' + a.names.length + " names \u00b7 " + Math.min(a.invested_pct, 100).toFixed(1) + "% in</div></button>";
      });
      html += "</div>";
    }
    html += "<h2>Book state</h2><div class=\"card span\"><div class=\"kpi\">" +
      "<div><span>Equity</span><b>" + money(book.equity) + "</b></div>" +
      "<div><span>Buying power</span><b>" + money(book.buying_power) + "</b></div>" +
      "<div><span>Invested</span><b>" + Math.min(book.invested_pct, 100).toFixed(1) + "%</b></div>" +
      "<div><span>Names</span><b>" + book.names.length + "</b></div></div>" +
