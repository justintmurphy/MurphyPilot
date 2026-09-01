  function paintNav() {
    var el = document.getElementById("tabs");
    el.innerHTML = TABS.map(function (t) {
      return '<button type="button" data-tab="' + t.id + '" class="' + (tab === t.id ? "on" : "") + '">' + t.label + "</button>";
    }).join("");
    var sub = document.getElementById("deskSub");
    if (sub) sub.textContent = LABEL[tab] || "HOUSE";
    document.title = "Murphy Pilot \u00b7 " + (LABEL[tab] || "House");
  }

  function cardsHtml() {
    return "<h2>Four books</h2><div class=\"acct-grid\">" + IDS.map(function (id) {
      var b = snap.accounts[id] || {};
      return '<button type="button" class="acct-mini" data-tab="' + id + '"><div class="k">' + esc(LABEL[id]) + "</div><b>" + money(b.equity) + '</b><div class="m">' + (b.names || []).length + " names</div></button>";
    }).join("") + "</div>";
  }

  function stateHtml(b, title) {
    return "<h2>Book state \u00b7 " + esc(title) + "</h2><div class=\"card span\"><div class=\"kpi\">" +
      "<div><span>Equity</span><b>" + money(b.equity) + "</b></div>" +
      "<div><span>Buying power</span><b>" + money(b.buying_power) + "</b></div>" +
      "<div><span>Invested</span><b>" + (isFinite(b.invested_pct) ? Math.min(b.invested_pct, 100).toFixed(1) + "%" : "\u2014") + "</b></div>" +
      "<div><span>Names</span><b>" + (b.names || []).length + "</b></div></div>" +
      '<p class="hint">Cash ' + money(b.cash) + " \u00b7 pending already in " + money(b.pending_deposits) + " \u00b7 orders " + (b.open_orders || 0) +
      (b.slots != null ? " \u00b7 slots " + b.slots : "") + "</p></div>";
  }

  function tapeHtml(key, title) {
    var prints = ((snap.tape && snap.tape[key]) || []).map(normPrint).filter(function (p) { return p && isFinite(p.equity); });
    var vals = prints.map(function (p) { return p.equity; });
    var last = vals.length ? vals[vals.length - 1] : (book().equity || 0);
    if (!vals.length) vals = [last, last];
    return "<h2>Live equity \u00b7 " + esc(title) + "</h2><div class=\"card tape-card\">" +
      '<div class="tape-kpis"><div><span>Now</span><b>' + money(last) + "</b></div><div><span>Prints</span><b>" + prints.length + "</b></div></div>" +
      '<div class="tape-plot">' + spark(vals) + "</div></div>";
  }

  function tableHtml(names, showBook, showStall) {
    names = names || [];
    if (!names.length) return '<div class="card"><p class="hint" style="margin:0">No names on this book.</p></div>';
    var head = "<tr><th>Name</th>" + (showBook ? "<th>Book</th>" : "") + '<th class="num">Qty</th><th class="num">Avg</th><th class="num">Last</th>' +
      (showStall ? "<th>First fill</th><th>Next stall</th>" : "") +
      '<th class="num">Value</th><th class="num">P&L</th></tr>';
    var rows = names.map(function (n) {
      var books = (n.accounts || []).map(function (a) { return LABEL[a] || a; }).join(" \u00b7 ") || LABEL[n.account] || "";
      return "<tr><td><span class=\"sym\">" + esc(n.symbol) + '</span><span class="sub">' + esc(n.name || "") + "</span></td>" +
        (showBook ? "<td>" + esc(books) + "</td>" : "") +
        '<td class="num">' + qty(n.qty) + '</td><td class="num">' + (n.avg == null ? "\u2014" : money(n.avg)) + "</td>" +
        '<td class="num">' + (n.last == null ? "\u2014" : money(n.last)) + "</td>" +
        (showStall ? "<td>" + esc(n.first_fill || "\u2014") + "</td><td>" + esc(n.next_stall || "\u2014") + "</td>" : "") +
        '<td class="num">' + money(n.value) + '</td><td class="num tone-' + tone(n.pnl) + '">' + money(n.pnl) + " " + pct(n.pnl_pct) + "</td></tr>";
    }).join("");
    return '<div class="card"><table class="book"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table></div>";
  }

  function agenticDeskHtml() {
    var ag = snap.accounts.agentic || {};
    var now = nyNow();
    var n = nextJob(now);
    var eta = "\u2014";
    if (n) {
      var secs = Math.max(0, Math.floor((n.when - now) / 1000));
      var h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
      eta = (n.add ? n.add + "d " : "") + pad(h) + ":" + pad(m);
    }
    var today = now.toISOString().slice(0, 10);
    var clockRows = JOBS.map(function (j) {
      return "<tr><td>" + j.t + "</td><td>" + esc(j.name) + "</td><td>" + esc(j.role) + "</td></tr>";
    }).join("");
    var cal = CAL.map(function (row) {
      var cls = row[0] === today ? "tone-soon" : (row[0] < today ? "tone-flat" : "");
      return '<div class="cal-row ' + cls + '"><b>' + row[0] + "</b> \u00b7 " + esc(row[1]) + (row[0] === today ? " \u00b7 today" : "") + "</div>";
    }).join("");
    return "<h2>Agentic \u00b7 next job</h2><div class=\"card span\"><div class=\"next\"><div><div class=\"name\">" +
      (n ? n.t + "  " + n.name : "\u2014") + '</div><div class="hint">' + (n ? n.role : "") + "</div></div><div class=\"eta\">" + eta + "</div></div></div>" +
      stateHtml(ag, "Agentic") +
      "<h2>Agentic book</h2>" + tableHtml(ag.names, false, true) +
      "<h2>Sell / buy thresholds</h2><div class=\"card span\"><ul class=\"buy-lines\">" +
      "<li>Stall: day 2 must clear +5% from that name's cost; later blocks +4% from the survive-mark.</li>" +
      "<li>Floor \u22125% from cost. Hard cap \u22126% at any print. Flatten \u221210%.</li>" +
      "<li>Slots = floor(Agentic equity / $75). 12h green lock. Same-symbol rebuy waits 24h.</li>" +
      "</ul></div>" +
      "<h2>Weekday clock</h2><div class=\"card span\"><table><thead><tr><th>ET</th><th>Job</th><th>Role</th></tr></thead><tbody>" + clockRows + "</tbody></table></div>" +
      "<h2>Coming weeks</h2><div class=\"card\">" + cal + "</div>" +
      '<p class="hint"><a href="../agentic.html">Open the full Agentic trading desk</a> for charts, pack links, and snapshot paste.</p>';
  }

  function paint() {
    if (!snap) return;
    paintNav();
    var b = book();
    var title = LABEL[tab] || tab;
    var tickerNames = b.names || [];
    var track = document.getElementById("tickerTrack");
    var items = tickerNames.filter(function (n) { return n.last != null; });
    document.getElementById("ticker").style.display = items.length ? "" : "none";
    if (items.length) {
      var loop = items.concat(items);
      track.innerHTML = loop.map(function (n) {
        var chg = n.pnl_pct;
        return '<span class="ticker-item ' + (tone(chg) === "go" ? "up" : tone(chg) === "stop" ? "down" : "flat") + '"><span class="sym">' + esc(n.symbol) + '</span><span class="px">' + money(n.last) + '</span><span class="chg">' + pct(chg) + "</span></span>";
      }).join("");
    }
    var html = "";
    if (tab === "combined") {
      html += cardsHtml();
      html += stateHtml(b, "House");
      html += tapeHtml("combined", "House");
      html += "<h2>Book</h2>" + tableHtml(b.names, true, true);
      html += agenticDeskHtml();
    } else if (tab === "agentic") {
      html += tapeHtml("agentic", "Agentic");
      html += agenticDeskHtml();
    } else {
      html += stateHtml(b, title);
      html += tapeHtml(tab, title);
      html += "<h2>Book</h2>" + tableHtml(b.names, false, false);
    }
    html += '<footer class="desk-foot">Murphy Pilot \u00b7 House rolls up Agentic, Individual, Auto-Grok, and Joint.</footer>';
    document.getElementById("desk").innerHTML = html;
  }

  function load() {
    Promise.all([
      fetch("house-snapshot.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch("../pilot-snapshot.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (pair) {
      snap = merge(pair[0], pair[1]);
      paint();
    }).catch(function (e) {
      document.getElementById("desk").innerHTML = "<p class='hint'>Could not load snapshots. " + esc(e) + "</p>";
    });
  }

  document.addEventListener("click", function (e) {
    var theme = e.target.closest("[data-theme-choice]");
    if (theme) {
      var t = theme.getAttribute("data-theme-choice");
      document.documentElement.setAttribute("data-theme", t);
      try { localStorage.setItem("murphyPilotTheme", t); } catch (err) {}
      return;
    }
    var btn = e.target.closest("[data-tab]");
    if (btn) { tab = btn.getAttribute("data-tab"); setHash(); paint(); }
  });

  hashTab();
  function tickClock() {
    var now = nyNow();
    var el = document.getElementById("clock");
    if (!el) return;
    el.querySelector(".t").textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds()) + " ET";
    el.querySelector(".d").textContent = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  }
  tickClock();
  setInterval(tickClock, 1000);
  load();
  setInterval(load, 5 * 60 * 1000);
})();
