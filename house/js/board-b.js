function companySiteUrl(n) {
  if (!n) return "";
  if (n.index) {
    var s = String(n.symbol || "").toLowerCase();
    if (s.indexOf("s&p") >= 0 || s === "spx" || s.indexOf("500") >= 0) return "https://www.spglobal.com/spdji/en/indices/equity/sp-500/";
    if (s.indexOf("nasdaq") >= 0 || s === "ndx") return "https://www.nasdaq.com/market-activity/index/ndx";
    return "https://finance.yahoo.com/";
  }
  var label = String(n.name || "").trim();
  var sym = String(n.symbol || "").trim();
  if (!label && !sym) return "";
  var q = (label && sym && label.toUpperCase() !== sym.toUpperCase())
    ? (label + " " + sym + " official website")
    : ((label || sym) + " official website");
  return "https://duckduckgo.com/?q=" + encodeURIComponent("!ducky " + q);
}
function nameSiteLink(n, innerHtml) {
  var url = companySiteUrl(n);
  if (!url) return innerHtml;
  return '<a class="name-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" title="Company website">' + innerHtml + "</a>";
}
function tidySleeveLabel(raw) {
  var k = String(raw || "").trim();
  if (!k || k === "\u2014" || k === "—") return "—";
  if (typeof FID_SLEEVE_LABELS !== "undefined" && FID_SLEEVE_LABELS[k]) return FID_SLEEVE_LABELS[k];
  if (/^401k$/i.test(k) || /401\s*\(k\)/i.test(k)) return "401(k)";
  if (typeof tidyFidAccountLabel === "function") {
    var t = tidyFidAccountLabel(k);
    if (t && t !== "Fidelity") return t;
  }
  if (typeof LABEL !== "undefined" && LABEL[k]) return LABEL[k];
  return k;
}
function bookDisplayLabel(id, book) {
  book = book || (typeof snap !== "undefined" && snap && snap.accounts && snap.accounts[id]) || {};
  var base = (book && book.label) || (typeof LABEL !== "undefined" && LABEL[id]) || id;
  if (id === "voya" || (book && book.id === "voya")) {
    base = tidySleeveLabel(book.label || book.sleeve || "401(k)");
    if (base === "Voya" || base === "Voya 401(k)") base = "401(k)";
  }
  if (id === "auto_grok" || base === "Auto-Grok" || base === "Auto Grok" || base === "Auto") base = "Grok";
  if (id === "joint" || base === "Joint") base = "Deep Seek";
  if (id === "agentic" || base === "Agentic" || base === "Claude") base = "AI WWIII";
  var suffix = (book && book.suffix) ? String(book.suffix).replace(/\D/g, "").slice(-4) : "";
  if (suffix && String(base).indexOf(suffix) < 0) base = base + " ···" + suffix;
  if (typeof LABEL !== "undefined" && id) LABEL[id] = base;
  return base;
}

function collapseHouseNames(list) {
  /* Merge same ticker across books/sleeves into one Book row. */
  function normSym(s) { return String(s || "").trim().toUpperCase(); }
  function normKind(k) {
    k = String(k || "equity").trim().toLowerCase();
    if (!k || k === "null" || k === "undefined") return "equity";
    return k;
  }
  function keyName(s) { return String(s || "").toLowerCase().replace(/class [a-z]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
  function sameName(a, b) {
    a = keyName(a); b = keyName(b);
    if (!a || !b || a === b) return true;
    if (a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return true;
    var ta = a.split(" ").filter(Boolean), tb = b.split(" ").filter(Boolean), n = 0;
    ta.forEach(function (t) { if (tb.indexOf(t) >= 0) n += 1; });
    return n > 0 && n / Math.min(ta.length, tb.length) >= 0.5;
  }
  var groups = [];
  (list || []).forEach(function (n) {
    if (!n) return;
    var sym = normSym(n.symbol);
    if (!sym) return;
    var kind = normKind(n.kind);
    var hit = null;
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (g.symbol === sym && g.kind === kind && sameName(g.name, n.name || sym)) { hit = g; break; }
    }
    var qty = Number(n.qty) || 0;
    var value = Number(n.value) || 0;
    var cost = n.cost != null ? Number(n.cost) : ((n.avg != null && qty) ? Number(n.avg) * qty : 0);
    if (!isFinite(cost)) cost = 0;
    if (!hit) {
      groups.push({
        symbol: sym,
        name: n.name || sym,
        kind: kind,
        asset_class: n.asset_class || kind,
        qty: qty,
        value: value,
        cost: cost,
        last: n.last != null ? Number(n.last) : null,
        day_pct: n.day_pct != null ? Number(n.day_pct) : null,
        unrealized_pnl: n.unrealized_pnl != null && isFinite(Number(n.unrealized_pnl)) ? Number(n.unrealized_pnl) : null,
        unrealized_pnl_pct: n.unrealized_pnl_pct != null && isFinite(Number(n.unrealized_pnl_pct)) ? Number(n.unrealized_pnl_pct) : null,
        last_fill: n.last_fill || n.first_fill || "",
        first_fill: n.first_fill || "",
        next_stall: n.next_stall || "",
        accounts: (n.accounts || [n.account]).filter(Boolean),
        sleeves: n.sleeve ? [String(n.sleeve)] : [],
        account: n.account
      });
      return;
    }
    hit.qty += qty;
    hit.value += value;
    hit.cost += cost;
    if (n.unrealized_pnl != null && isFinite(Number(n.unrealized_pnl))) {
      hit.unrealized_pnl = (hit.unrealized_pnl == null ? 0 : hit.unrealized_pnl) + Number(n.unrealized_pnl);
    }
    if (hit.last == null && n.last != null) hit.last = Number(n.last);
    if (hit.day_pct == null && n.day_pct != null) hit.day_pct = Number(n.day_pct);
    if (!hit.last_fill && (n.last_fill || n.first_fill)) hit.last_fill = n.last_fill || n.first_fill;
    if (!hit.first_fill && n.first_fill) hit.first_fill = n.first_fill;
    if (!hit.next_stall && n.next_stall) hit.next_stall = n.next_stall;
    (n.accounts || [n.account]).forEach(function (a) { if (a && hit.accounts.indexOf(a) < 0) hit.accounts.push(a); });
    if (n.sleeve && hit.sleeves.indexOf(String(n.sleeve)) < 0) hit.sleeves.push(String(n.sleeve));
    if ((n.name || "").length > (hit.name || "").length) hit.name = n.name;
  });
  var _rnd = (typeof rnd === "function") ? rnd : function (x) { return Math.round(Number(x) * 100) / 100; };
  return groups.map(function (g) {
    g.avg = g.qty ? _rnd(g.cost / g.qty) : null;
    g.value = _rnd(g.value);
    g.cost = _rnd(g.cost);
    g.pnl = _rnd(g.value - g.cost);
    g.pnl_pct = g.cost ? _rnd((g.pnl / g.cost) * 100) : null;
    if (g.unrealized_pnl == null && g.value != null && g.qty != null && g.avg != null) {
      g.unrealized_pnl = _rnd(g.value - (g.qty * g.avg));
    } else if (g.unrealized_pnl != null) {
      g.unrealized_pnl = _rnd(g.unrealized_pnl);
    }
    if (g.unrealized_pnl_pct == null && g.unrealized_pnl != null && g.cost) {
      g.unrealized_pnl_pct = _rnd((g.unrealized_pnl / g.cost) * 100);
    } else if (g.unrealized_pnl_pct != null) {
      g.unrealized_pnl_pct = _rnd(g.unrealized_pnl_pct);
    }
    if (g.sleeves.length) g.sleeve = g.sleeves.join(" \u00b7 ");
    return g;
  });
}


  function nameUnrealized(n) {
    if (!n) return { pnl: null, pct: null };
    var pnl = n.unrealized_pnl != null && isFinite(Number(n.unrealized_pnl)) ? Number(n.unrealized_pnl) : null;
    var pctV = n.unrealized_pnl_pct != null && isFinite(Number(n.unrealized_pnl_pct)) ? Number(n.unrealized_pnl_pct) : null;
    var qty = n.qty != null ? Number(n.qty) : null;
    var avg = n.avg != null ? Number(n.avg) : (n.avg_cost != null ? Number(n.avg_cost) : null);
    var value = n.value != null ? Number(n.value) : null;
    if (pnl == null && value != null && qty != null && avg != null && isFinite(value) && isFinite(qty) && isFinite(avg)) {
      pnl = value - (qty * avg);
    }
    if (pctV == null && pnl != null && qty != null && avg != null && isFinite(qty * avg) && Math.abs(qty * avg) > 0.0005) {
      pctV = (pnl / (qty * avg)) * 100;
    }
    if (pctV == null && n.pnl_pct != null && isFinite(Number(n.pnl_pct))) pctV = Number(n.pnl_pct);
    if (pnl == null && n.pnl != null && isFinite(Number(n.pnl))) pnl = Number(n.pnl);
    return { pnl: pnl, pct: pctV };
  }
  function moneyOrDash(n) {
    return (n == null || !isFinite(Number(n))) ? "\u2014" : money(n);
  }
  function realizedStripHtml(book) {
    if (!book || !book.realized_pnl || typeof book.realized_pnl !== "object") return "";
    var rp = book.realized_pnl;
    var cells = [];
    [["day", "Day"], ["week", "Week"], ["month", "Month"]].forEach(function (pair) {
      if (!Object.prototype.hasOwnProperty.call(rp, pair[0]) || rp[pair[0]] == null) return;
      var v = Number(rp[pair[0]]);
      if (!isFinite(v)) return;
      cells.push("<div><span>Realized " + pair[1] + "</span><b class=\"tone-" + tone(v) + "\">" + money(v) + "</b></div>");
    });
    if (!cells.length) return "";
    return "<h2>Realized P&L</h2><div class=\"card span realized-strip\"><div class=\"kpi\">" + cells.join("") + "</div>" +
      '<p class="hint">Print-only. Periods hide when the feed omits them.</p></div>';
  }
  function cashflowFinite(n) {
    return n != null && n !== "" && isFinite(Number(n));
  }
  function cashflowOffPublic(key) {
    return /utma|smart\s*income/i.test(String(key || ""));
  }
  function cashflowExtraMetrics(src) {
    if (!src || typeof src !== "object") return false;
    if (cashflowFinite(src.dividends)) return true;
    return cashflowFinite(src.reinvested) || cashflowFinite(src.reinvestments);
  }
  function cashflowKpiHtml(src, extraCls) {
    if (src == null) return "";
    if (typeof src !== "object") {
      if (!cashflowFinite(src)) return "";
      src = { market_earnings: src };
    }
    var cells = [];
    var extraAttr = extraCls ? (' class="' + extraCls + '"') : "";
    /* Hide cell if null/non-finite — never invent $0. */
    if (cashflowFinite(src.owner_deposits)) {
      cells.push("<div><span>Deposits</span><b>" + money(Number(src.owner_deposits)) + "</b></div>");
    }
    if (cashflowFinite(src.market_earnings)) {
      cells.push("<div><span>Market earnings</span><b class=\"tone-" + tone(src.market_earnings) + "\">" + money(Number(src.market_earnings)) + "</b></div>");
    }
    if (cashflowFinite(src.dividends)) {
      cells.push("<div" + extraAttr + "><span>Dividends</span><b class=\"tone-" + tone(src.dividends) + "\">" + money(Number(src.dividends)) + "</b></div>");
    }
    var reinv = cashflowFinite(src.reinvested) ? Number(src.reinvested)
      : (cashflowFinite(src.reinvestments) ? Number(src.reinvestments) : null);
    if (reinv != null) {
      cells.push("<div" + extraAttr + "><span>Reinvested</span><b class=\"tone-" + tone(reinv) + "\">" + money(reinv) + "</b></div>");
    }
    if (!cells.length) return "";
    return "<div class=\"kpi\">" + cells.join("") + "</div>";
  }
  function cashflowBreakoutsHtml(by) {
    if (!by || typeof by !== "object") return "";
    var specs = [
      { key: "robinhood", label: "RH" },
      { key: "fidelity", label: "Fid" },
      { key: "voya", label: "Voya" }
    ];
    var rows = [];
    specs.forEach(function (s) {
      if (!Object.prototype.hasOwnProperty.call(by, s.key) || cashflowOffPublic(s.key)) return;
      var slice = by[s.key];
      if (slice == null) return;
      var kpi = cashflowKpiHtml(slice);
      if (!kpi) return;
      rows.push('<div class="cf-block"><p class="cf-k">' + esc(s.label) + "</p>" + kpi + "</div>");
    });
    if (!rows.length) return "";
    return '<div class="cf-breakouts">' + rows.join("") + "</div>";
  }
  function cashflowStripHtml(book, overall) {
    var cf = book && book.cashflow_30d;
    if (!cf || typeof cf !== "object") return "";
    /* tip bk: collapsed = Overall Deposits + Market earnings; expand for by_source + dividends/reinvested */
    var overallKpi = cashflowKpiHtml(cf, "cf-detail");
    var sourceHtml = cashflowBreakoutsHtml(cf.by_source);
    if (!overallKpi && !sourceHtml) return "";
    var from = cf.from ? String(cf.from) : "";
    var to = cf.to ? String(cf.to) : "";
    var windowLine = "";
    if (from && to) windowLine = '<p class="cf-window">' + esc(from) + " \u2013 " + esc(to) + "</p>";
    else if (from || to) windowLine = '<p class="cf-window">' + esc(from || to) + "</p>";
    var basis = cf.market_earnings_basis ? String(cf.market_earnings_basis).trim() : "";
    var basisHtml = basis ? ' <span class="cf-basis">' + esc(basis) + "</span>" : "";
    var overallScope = !!(overall || (book && book.id === "combined"));
    var heading = overallScope ? "Past 30 days \u00b7 RH + Fid + Voya" : "Past 30 days";
    var canExpand = !!(sourceHtml || cashflowExtraMetrics(cf));
    var afford = canExpand
      ? ' <span class="cf-affordance"><i class="cf-chev" aria-hidden="true"></i><span class="cf-lab-show">Details</span><span class="cf-lab-hide">Hide</span></span>'
      : "";
    var overallHtml = overallKpi ? '<div class="cf-block cf-overall"><p class="cf-k">Overall' + afford + "</p>" + overallKpi + "</div>" : "";
    var inner;
    if (canExpand) {
      inner = '<details class="cf-more"' + (cashflowOpen ? " open" : "") + ">" +
        "<summary>" + windowLine + (overallHtml || ('<p class="cf-k">Cashflow' + afford + "</p>")) + "</summary>" +
        sourceHtml + "</details>";
    } else {
      inner = windowLine + overallHtml + sourceHtml;
    }
    return "<h2>" + heading + "</h2><div class=\"card span cashflow-strip" + (canExpand ? " cf-toggle" : "") + "\">" +
      inner +
      '<p class="hint">Deposits are owner capital in, not earnings. Deposits \u2260 market earnings.' + basisHtml + "</p></div>";
  }
  function fillWhen(ts) {
    var s = String(ts || "");
    if (!s) return "\u2014";
    if (s.length >= 16) return s.slice(5, 10) + " " + s.slice(11, 16);
    return s;
  }
  /* tip bf paint: company_url http(s) else Yahoo quote/{SYMBOL}/ ; account map; sell $ else —; buys omit P&L slot */
  var FILL_BOOK_LABEL = { agentic: "AI WWIII", auto_grok: "Grok", joint: "Deep Seek", individual: "Individual" };
  function fillHttpUrl(raw) {
    var u = String(raw == null ? "" : raw).trim();
    return /^https?:\/\//i.test(u) ? u : "";
  }
  function fillQuoteUrl(f) {
    var site = fillHttpUrl(f && f.company_url);
    if (site) return site;
    var sym = String((f && f.symbol) || "").trim();
    if (!sym) return "";
    return "https://finance.yahoo.com/quote/" + encodeURIComponent(sym) + "/";
  }
  function fillSymLink(f) {
    var inner = "<span class=\"sym\">" + esc(f.symbol) + "</span>";
    var name = String((f && f.name) || "").trim();
    if (name && name.toUpperCase() !== String(f.symbol || "").toUpperCase()) {
      inner += '<span class="sub">' + esc(name) + "</span>";
    }
    var url = fillQuoteUrl(f);
    if (!url) return inner;
    return '<a class="name-link fill-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + inner + "</a>";
  }
  function fillBookChip(f) {
    var id = String((f && f.account) || "").trim();
    if (!id) return "";
    var lab = FILL_BOOK_LABEL[id];
    if (!lab) return "";
    return '<span class="fill-chip">' + esc(lab) + "</span>";
  }
  function fillPnlHtml(f, isSell) {
    if (!isSell) return "";
    if (!f || f.pnl == null || !isFinite(Number(f.pnl))) return "\u2014";
    return '<span class="tone-' + tone(f.pnl) + '">' + money(f.pnl) + "</span>";
  }
  function fillRowHtml(f, isSell) {
    var chip = fillBookChip(f);
    return "<tr>" +
      '<td class="fill-when">' + esc(fillWhen(f.ts)) + "</td>" +
      '<td class="name-cell">' + fillSymLink(f) + "</td>" +
      '<td class="fill-book">' + chip + "</td>" +
      '<td class="num">' + qty(f.qty) + "</td>" +
      '<td class="num">' + moneyOrDash(f.price) + "</td>" +
      (isSell ? '<td class="num fill-pnl">' + fillPnlHtml(f, true) + "</td>" : "") +
      "</tr>";
  }
  function fillsSideHtml(title, list, isSell, emptyHint) {
    var inner;
    if (!list.length) {
      inner = '<p class="hint fills-empty">' + emptyHint + "</p>";
    } else {
      var head = "<tr><th>When</th><th>Name</th><th>Book</th><th class=\"num\">Qty</th><th class=\"num\">Px</th>" +
        (isSell ? '<th class="num">P&L</th>' : "") + "</tr>";
      var rows = list.map(function (f) { return fillRowHtml(f, isSell); }).join("");
      inner = '<div class="fills-pane"><table class="book fills-tape"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table></div>";
    }
    return '<section class="fills-col"><h3 class="fills-side">' + title + "</h3>" + inner + "</section>";
  }
  function fillsTapeHtml(book, opts) {
    opts = opts || {};
    var required = !!opts.required;
    var hasKey = book && Object.prototype.hasOwnProperty.call(book, "fills");
    if (!required && !hasKey) return "";
    var fills = (book && Array.isArray(book.fills)) ? book.fills.slice() : [];
    fills = fills.filter(function (f) { return f && f.symbol; });
    fills.sort(function (a, b) { return String(b.ts || "").localeCompare(String(a.ts || "")); });
    var buys = [], sells = [];
    fills.forEach(function (f) {
      var side = String(f.side || "").toLowerCase();
      if (side === "buy") { if (buys.length < 40) buys.push(f); }
      else if (side === "sell") { if (sells.length < 40) sells.push(f); }
    });
    var body = '<div class="fills-split">' +
      fillsSideHtml("Buys", buys, false, "No buys in this print.") +
      fillsSideHtml("Sells", sells, true, "No sells in this print.") +
      "</div>";
    return "<h2>Recent fills</h2><div class=\"card fills-card\">" + body +
      '<p class="hint">Status tape only. No order ticket.</p></div>';
  }
  function bookExtrasHtml(book, opts) {
    return realizedStripHtml(book) + fillsTapeHtml(book, opts);
  }

  var overlayOpen = false;
  var overlayMode = "live";
  var cashflowOpen = false;
  var mixOpen = false;
  var retirementOpen = false;
  var birthEditOpen = false;

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
    if (typeof isFidSleeveTab === "function" ? isFidSleeveTab(tab) : /^fid-/.test(String(tab || ""))) onId = "fidelity";
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
      return '<button type="button" class="acct-mini" data-tab="' + id + '"><div class="k">' + esc(bookDisplayLabel(id, b)) + "</div><b>" + money(b.equity) + '</b><div class="m">' + (b.names || []).length + " names</div></button>";
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
  /* tip bl — print freshness from existing asof / holdings dates only; never invent equity */
  function nyYmdNow() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }
  function asofAgeInfo(raw) {
    var info = { mins: null, ago: "", clockLabel: "", ymd: "", days: null, hasTime: false };
    var s = String(raw == null ? "" : raw).trim();
    if (!s) return info;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) info.ymd = s.slice(0, 10);
    info.hasTime = /T\d{1,2}:\d{2}/.test(s) || /\s\d{1,2}:\d{2}/.test(s);
    if (info.ymd) info.days = ymdDiff(info.ymd, nyYmdNow());
    if (info.hasTime) {
      var ms = Date.parse(s);
      if (isFinite(ms)) {
        info.mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
        var m = info.mins;
        if (m < 1) info.ago = "just now";
        else if (m < 60) info.ago = m + "m ago";
        else if (m < 1440) info.ago = Math.floor(m / 60) + "h ago";
        else info.ago = Math.floor(m / 1440) + "d ago";
        try {
          info.clockLabel = new Date(ms).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
        } catch (e2) { info.clockLabel = ""; }
      }
    } else if (info.days != null) {
      if (info.days <= 0) info.ago = "today";
      else info.ago = info.days + "d ago";
    }
    return info;
  }
  function asofClockStale(info) {
    return !!(info && info.mins != null && info.mins >= 1440);
  }
  function asofHoldingsStale(info) {
    if (!info) return false;
    if (info.days != null && info.days >= 2) return true;
    if (info.mins != null && info.mins >= 1440) return true;
    return false;
  }
  function freshChipHtml(key, text, stale, flag) {
    if (!text) return "";
    var cls = "fresh-chip" + (stale ? " asof-stale" : "") + (flag ? " fresh-flag" : "");
    var body = key ? (key + " \u00b7 " + text) : text;
    return '<span class="' + cls + '">' + esc(body) + "</span>";
  }
  function livePrintChipText(info) {
    var bits = ["live"];
    if (info && info.clockLabel) bits.push(info.clockLabel + " print");
    else if (info && info.ymd) bits.push(info.ymd);
    if (info && info.ago && info.ago !== "today") bits.push(info.ago);
    return bits.join(" \u00b7 ");
  }
  function holdingsChipText(raw, scanned) {
    var ymd = String(raw || "").slice(0, 10);
    if (!ymd) return "";
    var bits = [ymd];
    if (scanned) bits.push("scanned " + String(scanned).replace("T", " ").slice(0, 16));
    var info = asofAgeInfo(raw);
    if (info.ago && info.ago !== "today") bits.push(info.ago);
    return bits.join(" \u00b7 ");
  }
  function fidLiveOverlay() {
    if (!snap) return false;
    var fid = (snap.accounts && snap.accounts.fidelity) || {};
    var sleeve = null;
    if (typeof isFidSleeveTab === "function" && isFidSleeveTab(tab) && typeof fidSleeveFromTab === "function") {
      sleeve = fidSleeveFromTab(tab);
    }
    var b = sleeve || fid;
    return !!(fid.live || fid.source === "snaptrade" || (b && (b.live || b.source === "snaptrade")));
  }
  function sourceFreshnessChipsHtml() {
    if (!snap) return "";
    var chips = [];
    if (snap.asof) {
      var rhInfo = asofAgeInfo(snap.asof);
      chips.push(freshChipHtml("RH", livePrintChipText(rhInfo), asofClockStale(rhInfo)));
    }
    /* tip bm — a failed Truthifi print must not look like "no accounts" */
    var tfFail = snap.truthifiFail || "";
    if (tfFail) {
      var phrase = (typeof truthifiFailPhrase === "function")
        ? truthifiFailPhrase(tfFail)
        : (tfFail === "unavailable" ? "Truthifi unavailable" : "Truthifi print broken");
      var shortFail = (typeof truthifiFailShort === "function")
        ? truthifiFailShort(tfFail)
        : (tfFail === "unavailable" ? "unavailable" : "print broken");
      chips.push(freshChipHtml("", phrase, true, true));
      if (snap.truthifiHeld) chips.push(freshChipHtml("", "last good print", true, true));
    }
    var t = snap.truthifi || {};
    var fid = (snap.accounts && snap.accounts.fidelity) || {};
    var fidT = (t.accounts && t.accounts.fidelity) || {};
    if (tfFail && !fidLiveOverlay()) {
      chips.push(freshChipHtml("Fid", shortFail, true, true));
    } else if (fidLiveOverlay()) {
      var sleeveAsOf = "";
      if (typeof isFidSleeveTab === "function" && isFidSleeveTab(tab) && typeof fidSleeveFromTab === "function") {
        var sl = fidSleeveFromTab(tab);
        sleeveAsOf = (sl && sl.asof) || "";
      }
      var liveRaw = fid.asof || sleeveAsOf || snap.asof || "";
      if (liveRaw) {
        var liveInfo = asofAgeInfo(liveRaw);
        chips.push(freshChipHtml("Fid", livePrintChipText(liveInfo), asofClockStale(liveInfo)));
      }
    } else {
      var fidHold = fidT.asof || t.holdings_asof || fid.asof || t.asof || "";
      if (fidHold) {
        var fidInfo = asofAgeInfo(fidHold);
        chips.push(freshChipHtml("Fid", holdingsChipText(fidHold, t.scanned_at), asofHoldingsStale(fidInfo)));
      }
    }
    if (tfFail) {
      chips.push(freshChipHtml("Voya", shortFail, true, true));
    } else {
      var voya = (snap.accounts && snap.accounts.voya) || {};
      var voyaT = (t.accounts && t.accounts.voya) || {};
      var voyaHold = voyaT.asof || voya.asof || "";
      if (voyaHold) {
        var voyaInfo = asofAgeInfo(voyaHold);
        chips.push(freshChipHtml("Voya", holdingsChipText(voyaHold), asofHoldingsStale(voyaInfo)));
      }
    }
    if (!chips.length) return "";
    return '<div class="fresh-chips" aria-label="Source freshness">' + chips.join("") + "</div>";
  }
  function claudeAsofChipHtml(asof) {
    if (!asof) return "";
    var info = asofAgeInfo(asof);
    var bits = [];
    if (info.clockLabel) bits.push(info.clockLabel + " print");
    else if (info.ymd) bits.push(info.ymd);
    else bits.push(String(asof));
    if (info.ago && info.ago !== "today") bits.push(info.ago);
    return '<div class="fresh-chips claude-asof-chips">' +
      freshChipHtml("asof", bits.join(" \u00b7 "), asofClockStale(info)) +
      "</div>";
  }
  function deskIsNarrow() {
    try { return window.matchMedia("(max-width: 720px)").matches; } catch (e) { return false; }
  }
  function agenticHasHoldings(ag) {
    return !!(ag && (ag.names || []).some(function (n) { return n && n.symbol; }));
  }
  function agenticHasMix(ag) {
    if (!ag || typeof mixSlices !== "function") return false;
    var slices = mixSlices(ag, "agentic");
    return !!(slices && slices.length);
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
      '<p class="hint">Click for every book. Live (Robinhood + Fidelity) ' + money(c.live_equity) + " \u00b7 Voya EOD " + ((snap && snap.truthifiFail && !snap.truthifiHeld) ? "\u2014" : money(c.custodial_equity)) + "." +
      (asof ? " Holdings " + esc(String(asof).slice(0, 10)) + "." : "") + "</p></div>";
  }

  function stateHtml(b, title) {
    var cells = [];
    if (tab === "combined") {
      cells.push("<div><span>Cash</span><b>" + moneyOrDash(b.cash) + "</b></div>");
      cells.push("<div><span>Buying power</span><b>" + moneyOrDash(b.buying_power) + "</b></div>");
      cells.push("<div><span>Invested</span><b>" + (isFinite(b.invested_pct) ? Math.min(b.invested_pct, 100).toFixed(1) + "%" : "\u2014") + "</b></div>");
      cells.push("<div><span>Names</span><b>" + (b.names || []).length + "</b></div>");
    } else {
      cells.push("<div><span>Equity</span><b>" + moneyOrDash(b.equity) + "</b>" + dodHtml(dodTape(tab), b.equity) + "</div>");
      cells.push("<div><span>Cash</span><b>" + moneyOrDash(b.cash) + "</b></div>");
      cells.push("<div><span>Buying power</span><b>" + moneyOrDash(b.buying_power) + "</b></div>");
      cells.push("<div><span>Invested</span><b>" + (isFinite(b.invested_pct) ? Math.min(b.invested_pct, 100).toFixed(1) + "%" : "\u2014") + "</b></div>");
    }
    return "<h2>Book state \u00b7 " + esc(title) + "</h2>" +
      (tab === "combined" ? sourceFreshnessChipsHtml() : "") +
      "<div class=\"card span\"><div class=\"kpi\">" +
      cells.join("") + "</div>" +
      '<p class="hint">pending already in ' + moneyOrDash(b.pending_deposits) +
      (b.asof || (snap && snap.asof) ? " \u00b7 asof " + esc(String(b.asof || snap.asof)) : "") + "</p></div>";
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
    else if (snap.accounts && snap.accounts[key] && snap.accounts[key].equity != null) liveNow = Number(snap.accounts[key].equity);
    var last = (liveNow != null && isFinite(liveNow)) ? liveNow : (vals.length ? vals[vals.length - 1] : (book().equity || 0));
    if (!vals.length) vals = [last, last];
    var open = clickable ? ' data-open-books="1"' : "";
    var hint;
    if (clickable && key === "robinhood") hint = '<p class="hint tape-open-hint">Robinhood session only. Click for AI WWIII / Individual / Grok / Deep Seek charts.</p>';
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
    }).join("") + '<div class="mix-hint">' + (t === "combined" ? "Brokers \u00b7 where the money sits" : ((bookObj.asset_mix || bookObj.equity_value != null || bookObj.crypto_value != null) ? "Asset mix \u00b7 equity / crypto / options / cash" : "Names by market value")) + "</div>";
    return '<div class="card mix-card"><div class="mix-compact">' + svg + '<div class="mix-legend">' + legend + "</div></div></div>";
  }

  function tableHtml(names, showBook, showStall) {
    if (showBook && typeof collapseHouseNames === "function") names = collapseHouseNames(names || []);
    names = (names || []).slice().sort(function (a, b) {
      return (Number(b.value) || 0) - (Number(a.value) || 0);
    });
    if (!names.length) return '<div class="card"><p class="hint" style="margin:0">No names on this book.</p></div>';
    var head = "<tr><th>Name</th>" + (showBook ? "<th>Book</th>" : "") + '<th class="num">Qty</th><th class="num">Avg</th><th class="num">Last</th>' +
      '<th class="num">Value</th><th class="num">Unrealized</th></tr>';
    var rows = names.map(function (n) {
      var books = (n.accounts || []).map(function (a) {
        return (typeof bookDisplayLabel === "function") ? bookDisplayLabel(a, (snap.accounts && snap.accounts[a]) || {}) : (LABEL[a] || a);
      }).join(" \u00b7 ") || ((typeof bookDisplayLabel === "function" && n.account) ? bookDisplayLabel(n.account, (snap.accounts && snap.accounts[n.account]) || {}) : (LABEL[n.account] || ""));
      var u = nameUnrealized(n);
      var chg = n.day_pct != null ? n.day_pct : (u.pct != null ? u.pct : n.pnl_pct);
      var nameTone = tone(chg);
      var cls = n.asset_class || n.kind || "";
      var sub = esc(n.name || "");
      if (cls && cls !== "equity") sub = (sub ? sub + " \u00b7 " : "") + esc(cls);
      var inner = "<span class=\"sym\">" + esc(n.symbol) + '</span><span class="sub">' + sub + "</span>";
      var uHtml = (u.pnl == null && u.pct == null) ? "\u2014" : (moneyOrDash(u.pnl) + " " + pct(u.pct));
      return "<tr><td class=\"name-cell tone-" + nameTone + "\">" + nameSiteLink(n, inner) + "</td>" +
        (showBook ? "<td>" + esc(books) + "</td>" : "") +
        '<td class="num">' + qty(n.qty) + '</td><td class="num">' + (n.avg == null ? "\u2014" : money(n.avg)) + "</td>" +
        '<td class="num">' + (n.last == null ? "\u2014" : money(n.last)) + "</td>" +
        '<td class="num">' + moneyOrDash(n.value) + '</td><td class="num tone-' + tone(u.pnl) + '">' + uHtml + "</td></tr>";
    }).join("");
    var wrap = (showBook || names.length > 10) ? "card book-scroll" : "card";
    return '<div class="' + wrap + '"><table class="book"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table></div>";
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
    var label = (mode === "all" && id === "combined") ? "Overall" : ((typeof bookDisplayLabel === "function" && id && id !== "combined") ? bookDisplayLabel(id, (snap.accounts && snap.accounts[id]) || {}) : (LABEL[id] || id));
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
      return overlaySheet("booksOverlay", "live", "Live equity \u00b7 Robinhood", "Session prints for AI WWIII, Individual, Grok, and Deep Seek.");
    }
    return overlaySheet("booksOverlay", "live", "Live equity \u00b7 Robinhood + Fidelity", "Session prints for Robinhood books and Fidelity. Voya is EOD-only.") +
      overlaySheet("booksOverlayAll", "all", "Overall \u00b7 all books", "Net worth plus every book. Only Voya is EOD.");
  }

  function agenticOnlyHtml() {
    var ag = snap.accounts.agentic || {};
    var asof = ag.asof || (snap && snap.asof) || "";
    var html = "<h2>AI WWIII</h2><div class=\"card span\"><div class=\"kpi\">" +
      "<div><span>Equity</span><b>" + moneyOrDash(ag.equity) + "</b></div>" +
      "<div><span>Cash</span><b>" + moneyOrDash(ag.cash) + "</b></div>" +
      "<div><span>Buying power</span><b>" + moneyOrDash(ag.buying_power) + "</b></div>" +
      "</div>" +
      claudeAsofChipHtml(asof) +
      '<p class="hint">Agentic Robinhood book labeled AI WWIII. Account id stays Agentic. Growth + status only \u2014 no trade chrome.</p></div>';
    html += cashflowStripHtml(ag);
    if (agenticHasMix(ag) && typeof mixHtml === "function") {
      var mixBody = mixHtml(ag, "agentic");
      if (mixBody && !/No mix yet/.test(mixBody)) {
        if (deskIsNarrow() && agenticHasHoldings(ag)) {
          html += '<details class="mix-more"' + (mixOpen ? " open" : "") + ">" +
            '<summary><span class="mix-sum">Asset mix</span>' +
            ' <span class="mix-affordance"><i class="cf-chev" aria-hidden="true"></i>' +
            '<span class="mix-lab-show">Show</span><span class="mix-lab-hide">Hide</span></span></summary>' +
            mixBody + "</details>";
        } else {
          html += "<h2>Asset mix</h2>" + mixBody;
        }
      }
    }
    if (agenticHasHoldings(ag)) {
      html += "<h2>Holdings</h2>" + tableHtml(ag.names, false, true);
    }
    html += bookExtrasHtml(ag, { required: true });
    return html;
  }

  /* tip br — Retirement helper tidy on the tip bq card.
     Part B people, full 2026 brackets, extra 401k estimator, private #ret= prefill.
     Personal inputs stay in localStorage (murphyHouseRetirement) only.
     Tip bq/bp projection math and sanity defaults stay when the new fields are unset. */
  var RET_STORE = "murphyHouseRetirement";
  var RET_SSA_B1 = 1286;
  var RET_SSA_B2 = 7749;
  var RET_SSA_WAGE = 184500;
  /* 2026 IRS figures, Rev. Proc. 2025-32. Standard deduction is indexed.
     Brackets are the full 10/12/22/24/32/35/37 table (upper bounds of every
     bracket except 37%, which applies above the last cap).
     Social Security combined-income thresholds are not indexed, so they are deflated.
     2026 employee deferral limit is $24,500 including the base employee percent,
     plus an $8,000 catch-up in the calendar year age 50 is reached and after. */
  var RET_STD_2026 = { single: 16100, mfj: 32200 };
  var RET_STD_AGED_2026 = { single: 2050, mfj: 1650 };
  var RET_BRACKETS_2026 = {
    single: [12400, 50400, 105700, 201775, 256225, 640600],
    mfj: [24800, 100800, 211400, 403550, 512450, 768700]
  };
  var RET_BRACKET_RATES = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
  var RET_SS_BASE = { single: [25000, 34000], mfj: [32000, 44000] };
  var RET_PART_B = 203;
  var RET_401K_LIMIT = 24500;
  var RET_401K_CATCHUP = 8000;
  var RET_PROMPT = "Set birth date under Edit birth date in the helper.";

  function retFinite(n) {
    return n != null && n !== "" && isFinite(Number(n));
  }
  function retNum(raw) {
    if (raw == null) return null;
    var s = String(raw).replace(/[$,\s]/g, "");
    if (!s || s === "." || s === "-" || s === "-.") return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }
  function retPow(base, exp) {
    var v = Math.pow(base, exp);
    return isFinite(v) ? v : null;
  }
  function retBlank() {
    return {
      realPct: 5, inflPct: 2.5, raisePct: 1, eePct: 6, matchPct: 6,
      extraMonthly: 0, monthly: null, salary: null,
      ss62: null, ss67: null, ss70: null,
      retireAge: 67, birthMonth: null, birthYear: null,
      filing: "mfj", statePct: 0,
      partBPeople: null, extra401kPct: 0
    };
  }
  function retRetireAge(raw) {
    var n = Math.round(Number(raw));
    if (!isFinite(n)) return 67;
    if (n < 62) return 62;
    if (n > 70) return 70;
    return n;
  }
  function retTodayNy() {
    try {
      var fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric", month: "numeric", day: "numeric"
      });
      var parts = fmt.formatToParts(new Date());
      var o = { year: 0, month: 0, day: 0 };
      parts.forEach(function (p) {
        if (p.type === "year" || p.type === "month" || p.type === "day") o[p.type] = Number(p.value);
      });
      if (o.year && o.month && o.day) return o;
    } catch (e) {}
    var d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
  function retOptMonth(raw) {
    if (raw == null || raw === "") return null;
    var n = Math.round(Number(raw));
    if (!isFinite(n) || n < 1 || n > 12) return null;
    return n;
  }
  function retOptYear(raw) {
    if (raw == null || raw === "") return null;
    var n = Math.round(Number(String(raw).replace(/[^\d-]/g, "")));
    if (!isFinite(n)) return null;
    var today = retTodayNy();
    if (n < 1900 || n > today.year) return null;
    return n;
  }
  function retLoad() {
    var d = retBlank();
    var migrated = false;
    try {
      var raw = localStorage.getItem(RET_STORE);
      if (!raw) return d;
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") return d;
      ["realPct", "inflPct", "raisePct", "eePct", "matchPct", "extraMonthly", "statePct"].forEach(function (k) {
        if (retFinite(o[k])) d[k] = Number(o[k]);
      });
      ["monthly", "salary", "ss62", "ss67", "ss70"].forEach(function (k) {
        if (o[k] == null || o[k] === "") d[k] = null;
        else if (retFinite(o[k])) d[k] = Number(o[k]);
      });
      if (d.ss67 == null && retFinite(o.ss)) {
        d.ss67 = Number(o.ss);
        migrated = true;
      }
      if (o.retireAge != null && o.retireAge !== "") d.retireAge = retRetireAge(o.retireAge);
      d.birthMonth = retOptMonth(o.birthMonth);
      d.birthYear = retOptYear(o.birthYear);
      d.filing = o.filing === "single" ? "single" : "mfj";
      d.partBPeople = retPartBExplicit(o.partBPeople);
      if (retFinite(o.extra401kPct)) {
        var extraPct = Number(o.extra401kPct);
        d.extra401kPct = extraPct > 0 ? extraPct : 0;
      }
    } catch (e) {}
    if (migrated) retSave(d);
    return d;
  }
  function retSave(d) {
    try {
      localStorage.setItem(RET_STORE, JSON.stringify({
        realPct: d.realPct, inflPct: d.inflPct, raisePct: d.raisePct,
        eePct: d.eePct, matchPct: d.matchPct, extraMonthly: d.extraMonthly,
        monthly: d.monthly, salary: d.salary,
        ss62: d.ss62, ss67: d.ss67, ss70: d.ss70,
        retireAge: retRetireAge(d.retireAge),
        birthMonth: d.birthMonth, birthYear: d.birthYear,
        filing: d.filing === "single" ? "single" : "mfj",
        statePct: retFinite(d.statePct) ? Number(d.statePct) : 0,
        partBPeople: retPartBExplicit(d.partBPeople),
        extra401kPct: retFinite(d.extra401kPct) && Number(d.extra401kPct) > 0 ? Number(d.extra401kPct) : 0
      }));
    } catch (e) {}
  }
  function retClear() {
    try { localStorage.removeItem(RET_STORE); } catch (e) {}
  }
  /* Private prefill. If location.hash starts with "#ret=", base64url-decode a JSON
     object and merge only these keys into murphyHouseRetirement:
     ssa62, ssa67, ssa70 (monthly anchors), salary, raise, emp, match (percents),
     filing ("single" or "mfj"), birth_ym ("YYYY-MM"), partb (1 or 2).
     Anything else is ignored. Numbers must be finite and inside a sane range.
     Then history.replaceState strips the hash and keeps the path and query.
     Malformed input is ignored. Nothing is logged, fetched, or sent. */
  function retPrefillNum(v, lo, hi) {
    if (typeof v === "string" && String(v).trim() !== "") v = Number(v);
    if (typeof v !== "number" || !isFinite(v)) return null;
    if (v < lo || v > hi) return null;
    return v;
  }
  function retPrefillBirth(v) {
    if (typeof v !== "string") return null;
    var m = /^(\d{4})-(\d{2})$/.exec(v);
    if (!m) return null;
    var year = retOptYear(m[1]);
    var month = retOptMonth(m[2]);
    if (year == null || month == null) return null;
    return { birthYear: year, birthMonth: month };
  }
  function retDecodeRetPayload(raw) {
    if (!raw) return null;
    var t = String(raw).replace(/-/g, "+").replace(/_/g, "/");
    var pad = t.length % 4;
    if (pad === 1) return null;
    if (pad) t += "====".slice(pad);
    var bin = atob(t);
    var json = bin;
    try {
      var bytes = new Uint8Array(bin.length);
      var i;
      for (i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 255;
      if (typeof TextDecoder === "function") json = new TextDecoder("utf-8").decode(bytes);
    } catch (eDec) {}
    var o = JSON.parse(json);
    if (!o || typeof o !== "object" || Array.isArray(o)) return null;
    var out = {};
    if (Object.prototype.hasOwnProperty.call(o, "ssa62")) {
      var s62 = retPrefillNum(o.ssa62, 0, 20000);
      if (s62 != null) out.ss62 = s62;
    }
    if (Object.prototype.hasOwnProperty.call(o, "ssa67")) {
      var s67 = retPrefillNum(o.ssa67, 0, 20000);
      if (s67 != null) out.ss67 = s67;
    }
    if (Object.prototype.hasOwnProperty.call(o, "ssa70")) {
      var s70 = retPrefillNum(o.ssa70, 0, 20000);
      if (s70 != null) out.ss70 = s70;
    }
    if (Object.prototype.hasOwnProperty.call(o, "salary")) {
      var sal = retPrefillNum(o.salary, 0, 10000000);
      if (sal != null) out.salary = sal;
    }
    if (Object.prototype.hasOwnProperty.call(o, "raise")) {
      var raise = retPrefillNum(o.raise, -20, 50);
      if (raise != null) out.raisePct = raise;
    }
    if (Object.prototype.hasOwnProperty.call(o, "emp")) {
      var ee = retPrefillNum(o.emp, 0, 100);
      if (ee != null) out.eePct = ee;
    }
    if (Object.prototype.hasOwnProperty.call(o, "match")) {
      var match = retPrefillNum(o.match, 0, 100);
      if (match != null) out.matchPct = match;
    }
    if (o.filing === "single" || o.filing === "mfj") out.filing = o.filing;
    if (Object.prototype.hasOwnProperty.call(o, "birth_ym")) {
      var born = retPrefillBirth(o.birth_ym);
      if (born) { out.birthMonth = born.birthMonth; out.birthYear = born.birthYear; }
    }
    if (Object.prototype.hasOwnProperty.call(o, "partb")) {
      var partb = retPartBExplicit(o.partb);
      if (partb) out.partBPeople = partb;
    }
    return out;
  }
  function retMergeRetPrefill(patch) {
    if (!patch) return;
    var keys = Object.keys(patch);
    if (!keys.length) return;
    var d = retLoad();
    keys.forEach(function (k) { d[k] = patch[k]; });
    retSave(d);
  }
  function retConsumeRetHash() {
    try {
      var h = String(location.hash || "");
      if (h.indexOf("#ret=") !== 0) return;
      try {
        var raw = h.slice(5);
        try { raw = decodeURIComponent(raw); } catch (eUri) {}
        var obj = retDecodeRetPayload(raw);
        if (obj) retMergeRetPrefill(obj);
      } catch (eBad) {}
      history.replaceState(null, "", location.pathname + location.search);
    } catch (eAll) {}
  }
  function retOffPublic(id, book) {
    var s = String(id || "") + " " + String((book && (book.label || book.name || book.sleeve || book.account_name)) || "");
    return /utma|smart\s*income/i.test(s);
  }
  function retEquity(book) {
    if (!book || book.equity == null || book.equity === "") return null;
    var n = Number(book.equity);
    return isFinite(n) ? n : null;
  }
  function retRhEquity() {
    var rh = snap && snap.robinhood;
    if (rh && !retOffPublic("robinhood", rh)) {
      var eq = retEquity(rh);
      if (eq != null) return eq;
    }
    var ids = (typeof RH_IDS !== "undefined" && RH_IDS && RH_IDS.length)
      ? RH_IDS : ["agentic", "individual", "auto_grok", "joint"];
    var sum = 0, any = false;
    ids.forEach(function (id) {
      var b = snap && snap.accounts && snap.accounts[id];
      if (!b || retOffPublic(id, b)) return;
      var eq = retEquity(b);
      if (eq == null) return;
      any = true;
      sum += eq;
    });
    return any ? sum : null;
  }
  function retTruthifiGap() {
    return !!(snap && snap.truthifiFail && !snap.truthifiHeld);
  }
  function retSources() {
    var gap = retTruthifiGap();
    var phrase = "";
    if (gap) {
      phrase = (typeof truthifiFailPhrase === "function")
        ? truthifiFailPhrase(snap.truthifiFail)
        : (snap.truthifiFail === "unavailable" ? "Truthifi unavailable" : "Truthifi print broken");
    }
    var list = [];
    var rhEq = retRhEquity();
    list.push({ id: "robinhood", label: "Robinhood", equity: rhEq, missing: rhEq == null, flag: false });
    [["fidelity", "Fidelity"], ["voya", "Voya"]].forEach(function (pair) {
      var book = snap && snap.accounts && snap.accounts[pair[0]];
      if (book && retOffPublic(pair[0], book)) return;
      if (gap) {
        list.push({ id: pair[0], label: pair[1], equity: null, missing: true, flag: true });
        return;
      }
      var eq = retEquity(book);
      list.push({ id: pair[0], label: pair[1], equity: eq, missing: eq == null, flag: false });
    });
    var base = 0, any = false, missing = [];
    list.forEach(function (s) {
      if (s.missing) missing.push(s);
      else { any = true; base += s.equity; }
    });
    return {
      list: list,
      base: any ? base : null,
      missing: missing,
      flagPhrase: phrase,
      held: !!(snap && snap.truthifiHeld && snap.truthifiFail)
    };
  }
  function retPrintedMonthly() {
    var cf = snap && snap.combined && snap.combined.cashflow_30d;
    if (!cf || !retFinite(cf.owner_deposits)) return null;
    return Number(cf.owner_deposits);
  }
  function retWithReal(state, realPct) {
    return {
      realPct: realPct, inflPct: state.inflPct, raisePct: state.raisePct,
      eePct: state.eePct, matchPct: state.matchPct, extraMonthly: state.extraMonthly,
      monthly: state.monthly, salary: state.salary,
      ss62: state.ss62, ss67: state.ss67, ss70: state.ss70,
      retireAge: state.retireAge, birthMonth: state.birthMonth, birthYear: state.birthYear,
      filing: state.filing, statePct: state.statePct,
      partBPeople: retPartBExplicit(state.partBPeople),
      extra401kPct: retFinite(state.extra401kPct) ? Number(state.extra401kPct) : 0
    };
  }
  /* Unset until the user picks. Effective count follows filing: 2 MFJ, 1 single. */
  function retPartBExplicit(raw) {
    if (raw === 1 || raw === "1") return 1;
    if (raw === 2 || raw === "2") return 2;
    return null;
  }
  function retPartBCount(state) {
    if (state && (state.partBPeople === 1 || state.partBPeople === 2)) return state.partBPeople;
    return state && state.filing === "single" ? 1 : 2;
  }
  function retDeferralLimit(birthYear, calendarYear) {
    var cap = RET_401K_LIMIT;
    if (birthYear != null && calendarYear != null && calendarYear >= birthYear + 50) cap += RET_401K_CATCHUP;
    return cap;
  }
  function retCurrentAge(state) {
    var y = state.birthYear, m = state.birthMonth;
    if (y == null || m == null) return null;
    var today = retTodayNy();
    var birth = Date.UTC(y, m - 1, 1);
    var now = Date.UTC(today.year, today.month - 1, today.day);
    var days = (now - birth) / 86400000;
    if (!(days >= 0)) return null;
    return days / 365.2425;
  }
  function retHorizon(state) {
    var target = retRetireAge(state.retireAge);
    var age = retCurrentAge(state);
    var today = retTodayNy();
    if (age == null) return { age: null, years: null, raw: null, year: null, target: target };
    var raw = target - age;
    var years = raw > 0 ? raw : 0;
    var year = state.birthYear + target;
    return { age: age, years: years, raw: raw, year: year, target: target, todayYear: today.year };
  }
  function retOneDec(n) {
    var r = Math.round(Number(n) * 10) / 10;
    if (!isFinite(r)) return "";
    if (Math.abs(r - Math.round(r)) < 0.05) return String(Math.round(r));
    return r.toFixed(1);
  }
  function retSavingsMeta(state) {
    var extra = retFinite(state.extraMonthly) ? Number(state.extraMonthly) : 0;
    var printed = retPrintedMonthly();
    var monthly = retFinite(state.monthly) ? Number(state.monthly) : printed;
    var hasSalary = retFinite(state.salary) && Number(state.salary) > 0;
    if (!hasSalary) {
      return {
        mode: "deposits",
        monthlyShown: (monthly == null && extra === 0) ? null : ((monthly == null ? 0 : monthly) + extra),
        year1Annual: null,
        depositsMissing: printed == null && !retFinite(state.monthly),
        extra: extra,
        monthly: monthly,
        hasSalary: false
      };
    }
    var raise = (retFinite(state.raisePct) ? Number(state.raisePct) : 1) / 100;
    var ee = (retFinite(state.eePct) ? Number(state.eePct) : 6) / 100;
    var match = (retFinite(state.matchPct) ? Number(state.matchPct) : 6) / 100;
    var year1 = Number(state.salary) * (1 + raise) * (ee + match) + extra * 12;
    return {
      mode: "salary",
      monthlyShown: year1 / 12,
      year1Annual: year1,
      depositsMissing: false,
      extra: extra,
      monthly: monthly,
      hasSalary: true,
      raise: raise,
      ee: ee,
      match: match
    };
  }
  /* No salary: today's-dollar FV of a level annual deposit.
     Salary set: nominal return R=(1+real)*(1+inflation)-1.
     Each year salary grows by the raise first, then a mid-year contribution
     salary*(employee%+match%) + extra monthly*12 earns half a year of R.
     Headline = nominal / (1+inflation)^years. A partial last year uses the same shape. */
  function retProject(pv, state, years, opts) {
    var meta = retSavingsMeta(state);
    var real = Number(state.realPct) / 100;
    var infl = Number(state.inflPct) / 100;
    var empty = {
      today: null, nominal: null, mode: meta.mode,
      monthlyShown: meta.monthlyShown, year1Annual: meta.year1Annual,
      depositsMissing: meta.depositsMissing
    };
    if (pv == null || !isFinite(pv)) return empty;
    if (years == null || !isFinite(Number(years))) return empty;
    years = Number(years);
    if (years < 0) years = 0;
    if (years === 0) {
      empty.today = pv;
      empty.nominal = pv;
      return empty;
    }
    if (meta.hasSalary) {
      var raise = meta.raise;
      var ee = meta.ee;
      var match = meta.match;
      var extra = meta.extra;
      var R = (1 + real) * (1 + infl) - 1;
      var growth = 1 + R;
      if (!(growth > 0) || !isFinite(growth)) return empty;
      var half = Math.sqrt(growth);
      var bal = pv;
      var sal = Number(state.salary);
      var full = Math.floor(years + 1e-9);
      var frac = years - full;
      var useCap = !!(opts && opts.capDeferral);
      var extraRate = 0;
      var clamped = false;
      var year0 = 0;
      if (useCap) {
        if (retFinite(opts.extra401kPct)) extraRate = Number(opts.extra401kPct) / 100;
        if (!(extraRate > 0)) extraRate = 0;
        year0 = retTodayNy().year;
      }
      var y;
      for (y = 0; y < full; y++) {
        sal = sal * (1 + raise);
        var contrib;
        if (useCap) {
          var employee = sal * (ee + extraRate);
          var capY = retDeferralLimit(state.birthYear, year0 + y);
          if (employee > capY) { employee = capY; clamped = true; }
          contrib = employee + sal * match + extra * 12;
        } else {
          contrib = sal * (ee + match) + extra * 12;
        }
        bal = bal * growth + contrib * half;
        if (!isFinite(bal)) return empty;
      }
      if (frac > 1e-6) {
        sal = sal * Math.pow(1 + raise, frac);
        var annualF;
        if (useCap) {
          var employeeF = sal * (ee + extraRate);
          var capF = retDeferralLimit(state.birthYear, year0 + full);
          if (employeeF > capF) { employeeF = capF; clamped = true; }
          annualF = employeeF + sal * match + extra * 12;
        } else {
          annualF = sal * (ee + match) + extra * 12;
        }
        var contribF = annualF * frac;
        var gFrac = Math.pow(growth, frac);
        if (!(gFrac > 0) || !isFinite(gFrac)) return empty;
        bal = bal * gFrac + contribF * Math.sqrt(gFrac);
        if (!isFinite(bal)) return empty;
      }
      var deflator = retPow(1 + infl, years);
      if (deflator == null || deflator === 0) return empty;
      empty.today = bal / deflator;
      empty.nominal = bal;
      if (useCap) empty.clamped = clamped;
      return empty;
    }
    var monthly = meta.monthly;
    var annual = (monthly == null ? 0 : monthly) * 12 + meta.extra * 12;
    var todayD;
    if (!(real > -0.999) || Math.abs(real) < 1e-8) todayD = pv + annual * years;
    else {
      var g = retPow(1 + real, years);
      if (g == null) return empty;
      todayD = pv * g + annual * ((g - 1) / real);
    }
    if (!isFinite(todayD)) return empty;
    var inf = retPow(1 + infl, years);
    empty.today = todayD;
    empty.nominal = inf == null ? null : todayD * inf;
    return empty;
  }
  /* FRA 67. Early: 5/9 of 1% per month for the first 36 months, then 5/12 of 1%.
     Delayed: 8% per year. Age 62 is 70% of PIA. Age 70 is 124%. */
  function retSsFactor(age) {
    var fromFra = Number(age) - 67;
    if (fromFra >= 0) return 1 + 0.08 * fromFra;
    var earlyMonths = Math.round(-fromFra * 12);
    var first = Math.min(earlyMonths, 36);
    var rest = Math.max(0, earlyMonths - 36);
    var reduction = first * (5 / 9) * 0.01 + rest * (5 / 12) * 0.01;
    var factor = 1 - reduction;
    return factor > 0 ? factor : 0;
  }
  function retSsAnchors(state) {
    var list = [];
    if (state.ss62 != null && isFinite(Number(state.ss62))) list.push({ age: 62, amt: Number(state.ss62) });
    if (state.ss67 != null && isFinite(Number(state.ss67))) list.push({ age: 67, amt: Number(state.ss67) });
    if (state.ss70 != null && isFinite(Number(state.ss70))) list.push({ age: 70, amt: Number(state.ss70) });
    return list;
  }
  function retSsMonthly(age, state) {
    var anchors = retSsAnchors(state);
    if (!anchors.length || !isFinite(Number(age))) return null;
    var i, lo = null, hi = null;
    for (i = 0; i < anchors.length; i++) {
      if (anchors[i].age === age) return anchors[i].amt;
    }
    for (i = 0; i < anchors.length; i++) {
      if (anchors[i].age < age) lo = anchors[i];
      if (anchors[i].age > age && !hi) hi = anchors[i];
    }
    function ratio(a) {
      var f = retSsFactor(a.age);
      return f ? a.amt / f : a.amt;
    }
    if (lo && hi) {
      var t = (age - lo.age) / (hi.age - lo.age);
      var pia = ratio(lo) + (ratio(hi) - ratio(lo)) * t;
      return pia * retSsFactor(age);
    }
    var near = lo || hi;
    if (!near) return null;
    return ratio(near) * retSsFactor(age);
  }
  function retSsExact(age, state) {
    if (age === 62 && state.ss62 != null) return true;
    if (age === 67 && state.ss67 != null) return true;
    if (age === 70 && state.ss70 != null) return true;
    return false;
  }
  function retRoughPia(salary) {
    if (!retFinite(salary) || Number(salary) <= 0) return null;
    var aime = Math.min(Number(salary), RET_SSA_WAGE) / 12;
    var pia = 0.9 * Math.min(aime, RET_SSA_B1)
      + 0.32 * Math.min(Math.max(aime - RET_SSA_B1, 0), RET_SSA_B2 - RET_SSA_B1)
      + 0.15 * Math.max(aime - RET_SSA_B2, 0);
    if (!isFinite(pia)) return null;
    return Math.floor(pia * 10) / 10;
  }
  function retIncome(today) {
    if (today == null || !isFinite(today)) return null;
    return today * 0.04 / 12;
  }
  function retFederalTax(taxable, filing) {
    if (!(taxable > 0)) return 0;
    var caps = RET_BRACKETS_2026[filing] || RET_BRACKETS_2026.mfj;
    var rates = RET_BRACKET_RATES;
    var tax = 0, prev = 0, i;
    for (i = 0; i < caps.length; i++) {
      if (taxable <= prev) break;
      var slice = Math.min(taxable, caps[i]) - prev;
      if (slice > 0) tax += slice * rates[i];
      prev = caps[i];
      if (taxable <= caps[i]) return tax;
    }
    if (taxable > prev) tax += (taxable - prev) * rates[rates.length - 1];
    return tax;
  }
  /* Rate on the last dollar. Zero when nothing is taxable yet. */
  function retMarginalRate(taxable, filing) {
    if (!(taxable > 0)) return 0;
    var caps = RET_BRACKETS_2026[filing] || RET_BRACKETS_2026.mfj;
    var rates = RET_BRACKET_RATES;
    var i;
    for (i = 0; i < caps.length; i++) {
      if (taxable <= caps[i]) return rates[i];
    }
    return rates[rates.length - 1];
  }
  function retTaxableSs(other, ssAnnual, filing, deflator) {
    if (!(ssAnnual > 0)) return 0;
    var bases = RET_SS_BASE[filing] || RET_SS_BASE.mfj;
    var scale = deflator > 0 ? deflator : 1;
    var b1 = bases[0] / scale;
    var b2 = bases[1] / scale;
    var pi = other + 0.5 * ssAnnual;
    if (pi <= b1) return 0;
    var portion50 = Math.min(0.5 * ssAnnual, Math.max(0, 0.5 * (Math.min(pi, b2) - b1)));
    if (pi <= b2) return portion50;
    return Math.min(0.85 * ssAnnual, portion50 + 0.85 * (pi - b2));
  }
  /* Part B and the age-65 additional standard deduction apply at retirement age 65+.
     The aged deduction still follows filing status (1 single, 2 MFJ).
     Part B uses the people toggle once picked; otherwise the same filing default. */
  function retTakeHome(drawMonthly, ssMonthly, state, years, retireAge) {
    if (drawMonthly == null || !isFinite(drawMonthly)) return null;
    var filing = state.filing === "single" ? "single" : "mfj";
    var drawA = drawMonthly * 12;
    var ssA = (ssMonthly == null || !isFinite(ssMonthly)) ? 0 : ssMonthly * 12;
    var deflator = retPow(1 + (Number(state.inflPct) / 100), years);
    if (deflator == null || !(deflator > 0)) deflator = 1;
    var tss = retTaxableSs(drawA, ssA, filing, deflator);
    var agi = drawA + tss;
    var std = RET_STD_2026[filing];
    var agedPeople = filing === "single" ? 1 : 2;
    if (retireAge >= 65) std += RET_STD_AGED_2026[filing] * agedPeople;
    var taxable = Math.max(0, agi - std);
    var federal = retFederalTax(taxable, filing);
    var stateRate = (retFinite(state.statePct) ? Number(state.statePct) : 0) / 100;
    var stateTax = stateRate * taxable;
    var partBPeople = retPartBCount(state);
    var medicare = retireAge >= 65 ? partBPeople * RET_PART_B * 12 : 0;
    var net = drawA + ssA - federal - stateTax - medicare;
    return isFinite(net) ? net / 12 : null;
  }
  /* Savings at 67 cover 36 months of the age-67 total (4% draw + SS at 67)
     while the remainder keeps growing at the real return. Then 4% of what
     remains, per month, plus SS at 70. */
  function retBridge(nest, realPct, ss67, ss70) {
    var real = Number(realPct) / 100;
    if (!(real > -0.999) || nest == null || !isFinite(nest)) return null;
    var spend = nest * 0.04 / 12 + Number(ss67);
    var grown = nest * Math.pow(1 + real, 3);
    if (!isFinite(grown) || !isFinite(spend)) return null;
    var left = grown - 36 * spend;
    if (left < 0) left = 0;
    var out = left * 0.04 / 12 + Number(ss70);
    return isFinite(out) ? out : null;
  }
  function retView(state) {
    var src = retSources();
    var h = retHorizon(state);
    var mid = retProject(src.base, state, h.years);
    var low = retProject(src.base, retWithReal(state, 4), h.years);
    var high = retProject(src.base, retWithReal(state, 6), h.years);
    var income = retIncome(mid.today);
    var ss = retSsMonthly(state.retireAge, state);
    var hasAnchor = retSsAnchors(state).length > 0;
    var total = null;
    if (income != null && ss != null) total = income + ss;
    else if (income != null && !hasAnchor) total = income;
    var take = (h.years == null || income == null) ? null : retTakeHome(income, hasAnchor ? ss : null, state, h.years, state.retireAge);
    var bridge = null;
    if (state.retireAge === 67 && h.age != null && h.age < 67 && state.ss67 != null && state.ss70 != null && mid.today != null) {
      bridge = retBridge(mid.today, state.realPct, state.ss67, state.ss70);
    }
    return {
      src: src, mid: mid, low: low, high: high,
      income: income, ss: ss, hasAnchor: hasAnchor,
      total: total, take: take, bridge: bridge,
      pia: retRoughPia(state.salary),
      horizon: h,
      ssExact: retSsExact(state.retireAge, state)
    };
  }
  function retMoney(n) {
    return (n == null || !isFinite(Number(n))) ? "\u2014" : money(n);
  }
  function retRead(card) {
    function raw(name) {
      var el = card.querySelector('[data-ret-in="' + name + '"]');
      return el ? el.value : "";
    }
    function pct(name, fallback) {
      var n = retNum(raw(name));
      return n == null ? fallback : n;
    }
    function opt(name) {
      var s = String(raw(name)).trim();
      return s === "" ? null : retNum(s);
    }
    var extra = retNum(raw("extra"));
    return {
      realPct: pct("real", 5),
      inflPct: pct("infl", 2.5),
      raisePct: pct("raise", 1),
      eePct: pct("ee", 6),
      matchPct: pct("match", 6),
      extraMonthly: extra == null ? 0 : extra,
      monthly: opt("monthly"),
      salary: opt("salary"),
      ss62: opt("ss62"),
      ss67: opt("ss67"),
      ss70: opt("ss70"),
      retireAge: retRetireAge(raw("retireAge")),
      birthMonth: retOptMonth(raw("birthMonth")),
      birthYear: retOptYear(raw("birthYear")),
      filing: raw("filing") === "single" ? "single" : "mfj",
      statePct: pct("state", 0),
      partBPeople: retPartBExplicit(raw("partBPeople")),
      extra401kPct: (function () {
        var n = retNum(raw("extra401k"));
        return n != null && n > 0 ? n : 0;
      })()
    };
  }
  function retPctLabel(n) {
    var r = Math.round(Number(n) * 10) / 10;
    if (!isFinite(r)) return "0";
    if (Math.abs(r - Math.round(r)) < 0.001) return String(Math.round(r));
    return r.toFixed(1);
  }
  /* What-if on top of the same salary projection. Match stays on match% only.
     Employee deferral (base % + extra %) is clamped to that year's IRS limit. */
  function retExtra401k(state, view) {
    var requested = retFinite(state.extra401kPct) ? Number(state.extra401kPct) : 0;
    if (!(requested > 0)) requested = 0;
    var hasSalary = retFinite(state.salary) && Number(state.salary) > 0;
    var empty = {
      ready: false, extraPct: 0, maxExtra: 0, atCap: false,
      addedNest: null, addedIncome: null, newTotal: null, newTake: null, cost: null
    };
    if (!hasSalary || !view) return empty;
    var salary = Number(state.salary);
    var ee = retFinite(state.eePct) ? Number(state.eePct) : 6;
    var filing = state.filing === "single" ? "single" : "mfj";
    var limit = retDeferralLimit(state.birthYear, retTodayNy().year);
    var maxExtra = (limit / salary) * 100 - ee;
    if (!(maxExtra > 0)) maxExtra = 0;
    var extraPct = requested > maxExtra ? maxExtra : requested;
    var atCap = maxExtra <= 1e-6 || extraPct >= maxExtra - 0.05;
    var h = view.horizon;
    var withX = retProject(view.src.base, state, h.years, { capDeferral: true, extra401kPct: extraPct });
    var baseX = retProject(view.src.base, state, h.years, { capDeferral: true, extra401kPct: 0 });
    var addedNest = (withX.today != null && baseX.today != null) ? withX.today - baseX.today : null;
    var addedIncome = addedNest != null ? addedNest * 0.04 / 12 : null;
    if (withX.clamped) atCap = true;
    var newDraw = (view.income != null && addedIncome != null) ? view.income + addedIncome : null;
    var newTotal = null;
    if (newDraw != null && view.ss != null) newTotal = newDraw + view.ss;
    else if (newDraw != null && !view.hasAnchor) newTotal = newDraw;
    var newTake = (h.years == null || newDraw == null) ? null : retTakeHome(newDraw, view.hasAnchor ? view.ss : null, state, h.years, state.retireAge);
    var std = RET_STD_2026[filing];
    if (h.age != null && h.age >= 65) std += RET_STD_AGED_2026[filing] * (filing === "single" ? 1 : 2);
    var marginal = retMarginalRate(salary - std, filing);
    var stateRate = (retFinite(state.statePct) ? Number(state.statePct) : 0) / 100;
    var baseEmp = Math.min(salary * (ee / 100), limit);
    var withEmp = Math.min(salary * ((ee + extraPct) / 100), limit);
    var extraAnnual = Math.max(0, withEmp - baseEmp);
    var keep = 1 - marginal - stateRate;
    if (keep < 0) keep = 0;
    var cost = extraAnnual / 12 * keep;
    return {
      ready: true, extraPct: extraPct, maxExtra: maxExtra, atCap: atCap,
      addedNest: addedNest, addedIncome: addedIncome, newTotal: newTotal, newTake: newTake,
      cost: isFinite(cost) ? cost : null
    };
  }
  function retSetText(card, name, text) {
    var el = card.querySelector('[data-ret="' + name + '"]');
    if (el) el.textContent = text;
  }
  function retShow(el, on) {
    if (!el) return;
    if (on) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }
  function retFill(card, state) {
    if (!card) return;
    var v = retView(state);
    var src = v.src;
    var h = v.horizon;
    retSetText(card, "base", retMoney(src.base));
    var bits = src.list.map(function (s) {
      return s.label + " " + (s.missing ? "\u2014" : money(s.equity));
    });
    retSetText(card, "sources", bits.join(" \u00b7 "));
    var note = "";
    if (src.missing.length) {
      var names = src.missing.map(function (s) { return s.label; }).join(" and ");
      note = "Partial base \u2014 " + names + " omitted";
      if (src.flagPhrase) note += " (" + src.flagPhrase + ")";
      note += ". Missing sources are left out, not counted as $0.";
    } else if (src.held) {
      note = "Fidelity and Voya use the last good Truthifi print.";
    }
    var noteEl = card.querySelector('[data-ret="gap"]');
    if (noteEl) {
      noteEl.textContent = note;
      noteEl.hidden = !note;
    }
    var salaryOn = v.mid.mode === "salary";
    retSetText(card, "save-k", salaryOn ? "401k + match" : "Monthly savings");
    retSetText(card, "save", retMoney(v.mid.monthlyShown));
    retSetText(card, "save-sub", salaryOn ? "year 1 \u00b7 replaces last 30 days" : "based on last 30 days");
    var depNote = card.querySelector('[data-ret="dep-miss"]');
    if (depNote) {
      var showDep = !salaryOn && v.mid.depositsMissing;
      depNote.hidden = !showDep;
      depNote.textContent = showDep ? "No owner deposits on the last-30-days print." : "";
    }
    retSetText(card, "nest-k", (retFinite(state.realPct) ? String(state.realPct) : "5") + "% real");
    retSetText(card, "nest", retMoney(v.mid.today));
    retSetText(card, "income", retMoney(v.income));
    retSetText(card, "low", retMoney(v.low.today));
    retSetText(card, "low-mo", retMoney(retIncome(v.low.today)));
    retSetText(card, "high", retMoney(v.high.today));
    retSetText(card, "high-mo", retMoney(retIncome(v.high.today)));
    retSetText(card, "retire-val", String(state.retireAge));
    var range = card.querySelector('[data-ret-in="retireAge"]');
    if (range) {
      range.setAttribute("aria-valuenow", String(state.retireAge));
      range.setAttribute("aria-valuetext", String(state.retireAge));
    }
    var prog = card.querySelector('[data-ret="progress"]');
    var ageNow = card.querySelector('[data-ret="age-now"]');
    var chip = card.querySelector('[data-ret="years-chip"]');
    var targetEl = card.querySelector('[data-ret="age-target"]');
    var cap = card.querySelector('[data-ret="progress-cap"]');
    var track = card.querySelector('[data-ret="track"]');
    var fill = card.querySelector('[data-ret="progress-fill"]');
    if (h.age == null) {
      var prompt = (state.birthMonth != null && state.birthYear != null) ? "Check birth date under Edit birth date in the helper." : RET_PROMPT;
      if (ageNow) {
        ageNow.textContent = prompt;
        ageNow.classList.add("ret-prompt");
      }
      retShow(chip, false);
      retShow(targetEl, false);
      retShow(cap, false);
      retShow(track, false);
      if (fill) fill.style.width = "0%";
      if (prog) prog.setAttribute("aria-label", prompt);
    } else {
      var ageTxt = retOneDec(h.age);
      var yrsTxt = retOneDec(h.raw);
      var chipTxt = h.raw < 0 ? "Past retirement age" : (h.years <= 0 ? "At retirement age" : (yrsTxt + " years to go"));
      if (ageNow) {
        ageNow.textContent = "Age " + ageTxt;
        ageNow.classList.remove("ret-prompt");
      }
      if (chip) chip.textContent = chipTxt;
      if (targetEl) targetEl.textContent = String(h.target);
      retShow(chip, true);
      retShow(targetEl, true);
      retShow(cap, true);
      retShow(track, true);
      var span = h.target > 0 ? Math.max(0, Math.min(100, (h.age / h.target) * 100)) : 0;
      if (fill) fill.style.width = span.toFixed(1) + "%";
      if (prog) prog.setAttribute("aria-label", "Age " + ageTxt + " of " + h.target + ", " + chipTxt + ". Bar is current age divided by retirement age.");
    }
    var nomEl = card.querySelector('[data-ret="nominal-line"]');
    if (nomEl) {
      if (h.years == null) nomEl.textContent = "Nominal year \u2014";
      else if (!(h.raw > 0)) nomEl.textContent = "Nest egg is today\u2019s balance.";
      else nomEl.innerHTML = "Nominal in " + h.year + ": <b>" + (v.mid.nominal == null ? "\u2014" : money(v.mid.nominal)) + "</b>";
    }
    if (v.ss == null) {
      retSetText(card, "ss-mo", "\u2014");
      retSetText(card, "ss-sub", "");
    } else {
      retSetText(card, "ss-mo", money(v.ss));
      retSetText(card, "ss-sub", v.ssExact ? ("at " + state.retireAge) : ("at " + state.retireAge + " \u00b7 estimated"));
    }
    if (v.total == null) {
      retSetText(card, "total-mo", "\u2014");
      retSetText(card, "total-sub", "");
    } else if (v.ss == null) {
      retSetText(card, "total-mo", money(v.total));
      retSetText(card, "total-sub", "savings only");
    } else {
      retSetText(card, "total-mo", money(v.total));
      retSetText(card, "total-sub", "savings + SS");
    }
    if (v.take == null) {
      retSetText(card, "take", "\u2014");
      retSetText(card, "take-sub", "");
    } else if (v.ss == null) {
      retSetText(card, "take", money(v.take));
      retSetText(card, "take-sub", "savings only \u00b7 rough; excludes IRMAA, state rules on SS");
    } else {
      retSetText(card, "take", money(v.take));
      retSetText(card, "take-sub", "rough; excludes IRMAA, state rules on SS");
    }
    var br = card.querySelector('[data-ret="bridge"]');
    if (br) {
      if (v.bridge == null) {
        br.hidden = true;
        br.textContent = "";
      } else {
        br.hidden = false;
        br.textContent = "Retire 67, claim 70 \u00b7 " + money(v.bridge) + "/mo after 3 years of age-67 spending.";
      }
    }
    var hint = card.querySelector('[data-ret="monthly-hint"]');
    if (hint) {
      hint.textContent = salaryOn
        ? "Ignored while salary is set. The 401k contribution replaces last-30-days deposits. Extra monthly is added on top."
        : "Default is owner deposits from the last 30 days. Clear this field to use that print again.";
    }
    var piaEl = card.querySelector('[data-ret="pia"]');
    if (piaEl) {
      if (v.pia == null) {
        piaEl.innerHTML = '<p class="ret-pia-empty">Enter annual salary for a rough Social Security estimate. It will not fill the statement fields.</p>';
      } else {
        piaEl.innerHTML = '<p class="ret-pia"><b>Rough estimate ' + money(v.pia) + '/mo</b> at full retirement age. Salary \u00f7 12 stands in for AIME (not a 35-year indexed average), capped at the 2026 wage base ($184,500). 2026 bend points $1,286 and $7,749 at 90% / 32% / 15%, rounded down to the next dime, in today\u2019s dollars. Those bend points are for people who turn 62 in 2026. SSA statement preferred. This does not fill the statement fields.</p>';
      }
    }
    retSyncPartB(card, state);
    retSyncExtra(card, state, v);
  }
  function retSyncPartB(card, state) {
    var n = String(retPartBCount(state));
    var hidden = card.querySelector('[data-ret-in="partBPeople"]');
    if (hidden) hidden.value = (state.partBPeople === 1 || state.partBPeople === 2) ? String(state.partBPeople) : "";
    card.querySelectorAll("[data-ret-partb]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-ret-partb") === n ? "true" : "false");
    });
  }
  function retSyncExtra(card, state, view) {
    var x = retExtra401k(state, view);
    var prompt = card.querySelector('[data-ret="extra401k-prompt"]');
    var controls = card.querySelector('[data-ret="extra401k-controls"]');
    var capEl = card.querySelector('[data-ret="extra401k-cap"]');
    var stats = card.querySelector('[data-ret="extra401k-stats"]');
    var valEl = card.querySelector('[data-ret="extra401k-val"]');
    var range = card.querySelector('[data-ret-in="extra401k"]');
    if (!x.ready) {
      retShow(prompt, true);
      retShow(controls, false);
      retShow(capEl, false);
      if (stats) { stats.hidden = true; stats.innerHTML = ""; }
      if (valEl) valEl.textContent = "\u2014";
      return;
    }
    retShow(prompt, false);
    retShow(controls, true);
    if (range) {
      range.min = "0";
      range.max = String(x.maxExtra);
      range.setAttribute("aria-valuemin", "0");
      range.setAttribute("aria-valuemax", retPctLabel(x.maxExtra));
      range.setAttribute("aria-valuenow", retPctLabel(x.extraPct));
      if (document.activeElement !== range) range.value = String(x.extraPct);
    }
    if (valEl) valEl.textContent = retPctLabel(range && document.activeElement === range ? range.value : x.extraPct);
    if (capEl) capEl.textContent = x.atCap ? "at IRS cap" : "";
    retShow(capEl, x.atCap);
    if (stats) {
      stats.hidden = false;
      stats.innerHTML = "Added nest egg <b>" + retMoney(x.addedNest) + "</b>"
        + " \u00b7 Added income <b>" + retMoney(x.addedIncome) + "/mo</b>"
        + "<br>Total <b>" + retMoney(x.newTotal) + "</b>"
        + " \u00b7 Take-home <b>" + retMoney(x.newTake) + "</b>"
        + "<br>Paycheck cost <b>" + retMoney(x.cost) + "/mo</b>";
    }
  }
  function retInputValue(n) {
    return (n == null || !isFinite(Number(n))) ? "" : String(Number(n));
  }
  function retMonthOptions(selected) {
    var names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var html = '<option value="">Month</option>';
    for (var i = 0; i < 12; i++) {
      var v = i + 1;
      html += '<option value="' + v + '"' + (selected === v ? " selected" : "") + ">" + names[i] + "</option>";
    }
    return html;
  }
  function retirementHtml() {
    if (!snap) return "";
    var state = retLoad();
    var printed = retPrintedMonthly();
    var monthlyVal = state.monthly != null ? state.monthly : printed;
    var open = retirementOpen ? " open" : "";
    var age = state.retireAge;
    return '<h2>Retirement</h2><div class="card span retirement-card" id="retirement">' +
      '<div class="ret-progress" data-ret="progress" role="img" aria-label="' + esc(RET_PROMPT) + '">' +
      '<p class="ret-progress-cap" data-ret="progress-cap" hidden>Elapsed toward retirement age</p>' +
      '<div class="ret-progress-top"><span class="ret-prompt" data-ret="age-now">' + esc(RET_PROMPT) + '</span>' +
      '<span class="ret-chip" data-ret="years-chip" hidden></span><span data-ret="age-target" hidden></span></div>' +
      '<div class="ret-track" data-ret="track" hidden aria-hidden="true"><i data-ret="progress-fill"></i></div></div>' +
      '<div class="ret-slider">' +
      '<div class="ret-slider-head"><span>Retirement age</span><b data-ret="retire-val">' + age + '</b></div>' +
      '<input id="ret-age" data-ret-in="retireAge" type="range" min="62" max="70" step="1" value="' + age + '" aria-label="Retirement age" aria-valuemin="62" aria-valuemax="70" aria-valuenow="' + age + '" aria-valuetext="' + age + '">' +
      '<div class="ret-ticks" aria-hidden="true"><span class="ret-tick ret-tick-lo">62</span><span class="ret-tick ret-tick-mid">67</span><span class="ret-tick ret-tick-hi">70</span></div>' +
      '</div>' +
      '<div class="kpi ret-kpi">' +
      '<div><span>Retirement base</span><b data-ret="base">\u2014</b><i data-ret="sources"></i></div>' +
      '<div><span data-ret="save-k">Monthly savings</span><b data-ret="save">\u2014</b><i data-ret="save-sub">based on last 30 days</i></div>' +
      '<div><span>Nest egg</span><b data-ret="nest">\u2014</b><i><span data-ret="nest-k">5% real</span> \u00b7 today\u2019s dollars</i></div>' +
      '<div><span>4% draw</span><b data-ret="income">\u2014</b><i>per month</i></div>' +
      '</div>' +
      '<p class="ret-gap" data-ret="gap" hidden></p>' +
      '<p class="ret-dep-miss" data-ret="dep-miss" hidden></p>' +
      '<p class="ret-nominal" data-ret="nominal-line">Nominal year \u2014</p>' +
      '<div class="kpi ret-results-kpi">' +
      '<div><span>SS / mo</span><b data-ret="ss-mo">\u2014</b><i data-ret="ss-sub"></i></div>' +
      '<div><span>Total / mo</span><b data-ret="total-mo">\u2014</b><i data-ret="total-sub"></i></div>' +
      '</div>' +
      '<div class="ret-take"><span>Take-home / mo (est.)</span><b data-ret="take">\u2014</b><i data-ret="take-sub"></i></div>' +
      '<p class="ret-bridge" data-ret="bridge" hidden></p>' +
      '<p class="ret-range">Low 4% <b data-ret="low">\u2014</b> \u00b7 <b data-ret="low-mo">\u2014</b>/mo' +
      '<span class="ret-range-gap"></span>High 6% <b data-ret="high">\u2014</b> \u00b7 <b data-ret="high-mo">\u2014</b>/mo</p>' +
      '<p class="hint ret-foot">Estimates, not advice. Assumes deposits continue and these balances are for retirement.</p>' +
      '<details class="ret-more"' + open + '>' +
      '<summary><span class="ret-sum">Helper</span> <span class="ret-affordance"><i class="cf-chev" aria-hidden="true"></i>' +
      '<span class="ret-lab-show">Adjust</span><span class="ret-lab-hide">Hide</span></span></summary>' +
      '<div class="ret-fields">' +
      '<div><label for="ret-monthly">Monthly savings</label>' +
      '<input id="ret-monthly" data-ret-in="monthly" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(retInputValue(monthlyVal)) + '">' +
      '<p class="ret-field-hint" data-ret="monthly-hint"></p></div>' +
      '<div><label for="ret-real">Real return %</label>' +
      '<input id="ret-real" data-ret-in="real" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(retInputValue(state.realPct)) + '"></div>' +
      '<div><label for="ret-infl">Inflation %</label>' +
      '<input id="ret-infl" data-ret-in="infl" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(retInputValue(state.inflPct)) + '"></div>' +
      '<div><label for="ret-extra">Extra monthly deposits</label>' +
      '<input id="ret-extra" data-ret-in="extra" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(retInputValue(state.extraMonthly)) + '">' +
      '<p class="ret-field-hint">On top of 401k. RH and Fidelity savings beyond the match.</p></div>' +
      '<div><label for="ret-salary">Annual salary</label>' +
      '<input id="ret-salary" data-ret-in="salary" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="Optional" value="' + esc(retInputValue(state.salary)) + '">' +
      '<p class="ret-field-hint">Empty uses last-30-days deposits. A salary switches to employee % + match, growing by the raise each year.</p></div>' +
      '<div><label for="ret-raise">Annual raise %</label>' +
      '<input id="ret-raise" data-ret-in="raise" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(retInputValue(state.raisePct)) + '"></div>' +
      '<div><label for="ret-ee">Employee contribution %</label>' +
      '<input id="ret-ee" data-ret-in="ee" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(retInputValue(state.eePct)) + '"></div>' +
      '<div><label for="ret-match">Employer match %</label>' +
      '<input id="ret-match" data-ret-in="match" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(retInputValue(state.matchPct)) + '"></div>' +
      '<div><label for="ret-filing">Filing status</label>' +
      '<select id="ret-filing" data-ret-in="filing" autocomplete="off">' +
      '<option value="mfj"' + (state.filing !== "single" ? " selected" : "") + '>Married filing jointly</option>' +
      '<option value="single"' + (state.filing === "single" ? " selected" : "") + '>Single</option></select></div>' +
      '<div><label id="ret-partb-label">Medicare Part B</label>' +
      '<div class="ret-seg" role="group" aria-labelledby="ret-partb-label">' +
      '<button type="button" data-ret-partb="1" aria-pressed="' + (retPartBCount(state) === 1 ? "true" : "false") + '">1</button>' +
      '<button type="button" data-ret-partb="2" aria-pressed="' + (retPartBCount(state) === 2 ? "true" : "false") + '">2</button>' +
      '</div>' +
      '<input type="hidden" data-ret-in="partBPeople" value="' + (state.partBPeople === 1 || state.partBPeople === 2 ? String(state.partBPeople) : "") + '">' +
      '<p class="ret-field-hint">People on Part B. About $203 a month each from age 65. Starts at 2 for married filing jointly and 1 for single until you pick.</p></div>' +
      '<div><label for="ret-state">State tax %</label>' +
      '<input id="ret-state" data-ret-in="state" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(retInputValue(state.statePct)) + '">' +
      '<p class="ret-field-hint">Percent of taxable income.</p></div>' +
      '<div class="ret-extra401k ret-slider">' +
      '<div class="ret-slider-head"><span>Extra 401k % of pay</span><b data-ret="extra401k-val">0</b></div>' +
      '<p class="ret-field-hint" data-ret="extra401k-prompt">Enter annual salary to estimate an extra 401k deferral.</p>' +
      '<div data-ret="extra401k-controls" hidden>' +
      '<input id="ret-extra401k" data-ret-in="extra401k" type="range" min="0" max="0" step="0.1" value="' + esc(retInputValue(state.extra401kPct)) + '" aria-label="Extra 401k percent of pay">' +
      '<p class="ret-field-hint" data-ret="extra401k-cap" hidden></p></div>' +
      '<p class="ret-extra-stats" data-ret="extra401k-stats" hidden></p></div>' +
      '<div class="ret-ss-field"><label for="ret-ss62">Monthly at 62 <span class="ret-quiet">(from your ssa.gov statement)</span></label>' +
      '<input id="ret-ss62" data-ret-in="ss62" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(retInputValue(state.ss62)) + '"></div>' +
      '<div class="ret-ss-field"><label for="ret-ss67">Monthly at 67 <span class="ret-quiet">(from your ssa.gov statement)</span></label>' +
      '<input id="ret-ss67" data-ret-in="ss67" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(retInputValue(state.ss67)) + '"></div>' +
      '<div class="ret-ss-field"><label for="ret-ss70">Monthly at 70 <span class="ret-quiet">(from your ssa.gov statement)</span></label>' +
      '<input id="ret-ss70" data-ret-in="ss70" inputmode="decimal" autocomplete="off" spellcheck="false" value="' + esc(retInputValue(state.ss70)) + '"></div>' +
      '</div>' +
      '<div data-ret="pia"></div>' +
      '<button type="button" class="ghost" data-ret-reset="1">Reset to defaults</button>' +
      '<details class="ret-birth"' + (birthEditOpen ? " open" : "") + '>' +
      '<summary>Edit birth date</summary>' +
      '<div class="ret-born">' +
      '<div><label for="ret-birth-month">Birth month</label>' +
      '<select id="ret-birth-month" data-ret-in="birthMonth" autocomplete="off">' + retMonthOptions(state.birthMonth) + '</select></div>' +
      '<div><label for="ret-birth-year">Birth year</label>' +
      '<input id="ret-birth-year" data-ret-in="birthYear" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="4" placeholder="Year" value="' + esc(retInputValue(state.birthYear)) + '"></div>' +
      '</div></details>' +
      '</details></div>';
  }
  function retSync() {
    var card = document.querySelector(".retirement-card");
    if (!card) return;
    retFill(card, retRead(card));
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
        var cls = 'ticker-item ' + (n.index ? "idx " : "") + (tone(chg) === "go" ? "up" : tone(chg) === "stop" ? "down" : "flat");
        var body = '<span class="sym">' + esc(n.symbol) + '</span><span class="px">' + px + '</span><span class="chg">' + chgHtml + "</span>";
        var url = companySiteUrl(n);
        if (url) return '<a class="' + cls + '" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" title="Company website">' + body + "</a>";
        return '<span class="' + cls + '">' + body + "</span>";
      }).join("");
    }
    var html = "";
    if (tab === "combined") {
      html += overallStripHtml();
      html += cardsHtml();
      html += stateHtml(b, "House");
      html += cashflowStripHtml(b, true);
      html += retirementHtml();
      html += tapeHtml("combined", "House", true);
      html += "<h2>Where it sits</h2>" + mixHtml(b, "combined");
      html += "<h2>Book</h2>" + tableHtml(b.names, true, true);
      html += bookExtrasHtml(b, { required: false });
      html += overlayHtml();
    } else if (tab === "robinhood") {
      html += cardsHtml();
      html += stateHtml(b, "Robinhood");
      html += cashflowStripHtml(b);
      html += tapeHtml("robinhood", "Robinhood", true);
      html += "<h2>Where it sits</h2>" + mixHtml(b, "combined");
      html += "<h2>Book</h2>" + tableHtml(b.names, true, true);
      html += bookExtrasHtml(b, { required: false });
      html += overlayHtml();
    } else if (tab === "agentic") {
      html += agenticOnlyHtml();
    } else {
      html += stateHtml(b, title);
      html += cashflowStripHtml(b);
      html += tapeHtml(tab, title, false);
      html += "<h2>Where it sits</h2>" + mixHtml(b, tab);
      html += "<h2>Book</h2>" + tableHtml(b.names, false, false);
      html += bookExtrasHtml(b, { required: false });
    }
    var footMsg = "Murphy Pilot \u00b7 Live = Robinhood + Fidelity. Voya is EOD.";
    if (tab === "agentic") footMsg = "Murphy Pilot \u00b7 Agentic / AI WWIII only \u00b7 equity, cash/BP, holdings, realized, fills, asof.";
    else if (tab === "robinhood" || (typeof RH_IDS !== "undefined" && RH_IDS.indexOf(tab) >= 0)) footMsg = "Murphy Pilot \u00b7 Robinhood live books only.";
    else if (tab === "fidelity" || (typeof isFidSleeveTab === "function" ? isFidSleeveTab(tab) : /^fid-/.test(String(tab || "")))) {
      var fidB = (snap.accounts && snap.accounts.fidelity) || {};
      footMsg = fidB.live
        ? "Murphy Pilot \u00b7 Fidelity live overlay on Truthifi books."
        : "Murphy Pilot \u00b7 Fidelity books from Truthifi EOD.";
    }
    else if (tab === "voya") footMsg = "Murphy Pilot \u00b7 Voya is Truthifi EOD.";
    html += '<footer class="desk-foot">' + footMsg + "</footer>";
    document.getElementById("desk").innerHTML = html;
    retSync();
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
    var cfHit = e.target.closest(".cashflow-strip.cf-toggle");
    if (cfHit && !e.target.closest(".hint") && !e.target.closest("a") && !e.target.closest("summary") && !e.target.closest(".cf-breakouts")) {
      var det = cfHit.querySelector("details.cf-more");
      if (det) {
        det.open = !det.open;
        cashflowOpen = !!det.open;
        return;
      }
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
  document.addEventListener("toggle", function (e) {
    if (!e.target || !e.target.classList) return;
    if (e.target.classList.contains("cf-more")) cashflowOpen = !!e.target.open;
    if (e.target.classList.contains("mix-more")) mixOpen = !!e.target.open;
    if (e.target.classList.contains("ret-more")) retirementOpen = !!e.target.open;
    if (e.target.classList.contains("ret-birth")) birthEditOpen = !!e.target.open;
  }, true);
  function retOnEdit(e) {
    if (!e.target || !e.target.closest || !e.target.closest(".retirement-card")) return;
    var card = e.target.closest(".retirement-card");
    var state = retRead(card);
    retSave(state);
    retFill(card, state);
  }
  document.addEventListener("input", retOnEdit);
  document.addEventListener("change", retOnEdit);
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest && e.target.closest("[data-ret-partb]");
    if (!btn) return;
    var card = btn.closest(".retirement-card");
    if (!card) return;
    e.preventDefault();
    var hidden = card.querySelector('[data-ret-in="partBPeople"]');
    if (hidden) hidden.value = btn.getAttribute("data-ret-partb") === "1" ? "1" : "2";
    var state = retRead(card);
    retSave(state);
    retFill(card, state);
  });
  document.addEventListener("click", function (e) {
    var reset = e.target.closest && e.target.closest("[data-ret-reset]");
    if (!reset) return;
    e.preventDefault();
    retClear();
    var card = document.querySelector(".retirement-card");
    if (!card) return;
    var printed = retPrintedMonthly();
    function setIn(name, value) {
      var el = card.querySelector('[data-ret-in="' + name + '"]');
      if (el) el.value = value;
    }
    setIn("monthly", printed == null ? "" : String(printed));
    setIn("real", "5");
    setIn("infl", "2.5");
    setIn("extra", "0");
    setIn("salary", "");
    setIn("raise", "1");
    setIn("ee", "6");
    setIn("match", "6");
    setIn("ss62", "");
    setIn("ss67", "");
    setIn("ss70", "");
    setIn("retireAge", "67");
    setIn("birthMonth", "");
    setIn("birthYear", "");
    setIn("filing", "mfj");
    setIn("state", "0");
    setIn("partBPeople", "");
    setIn("extra401k", "0");
    retFill(card, retLoad());
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeDeskMenu();
      if (overlayOpen) { overlayOpen = false; syncOverlay(); }
    }
  });
  window.addEventListener("hashchange", function () {
    retConsumeRetHash();
    if (typeof hashTab === "function") hashTab();
    if (typeof paint === "function" && snap) paint();
  });

  retConsumeRetHash();
  hashTab();
  try {
    var mixMql = window.matchMedia("(max-width: 720px)");
    var onMixMql = function () {
      if (tab === "agentic" && typeof paint === "function" && snap) paint();
    };
    if (mixMql.addEventListener) mixMql.addEventListener("change", onMixMql);
    else if (mixMql.addListener) mixMql.addListener(onMixMql);
  } catch (eMql) {}
  function tickClock() {
    var now = nyNow();
    var el = document.getElementById("clock");
    if (!el) return;
    var tEl = el.querySelector(".t");
    var dEl = el.querySelector(".d");
    var asof = snap && snap.asof;
    var info = asofAgeInfo(asof);
    if (tEl) tEl.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds()) + " ET";
    if (dEl) {
      if (info.clockLabel) {
        dEl.textContent = info.clockLabel + " print" + (info.ago ? (" · " + info.ago) : "");
      } else {
        dEl.textContent = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      }
      if (asofClockStale(info)) dEl.classList.add("asof-stale");
      else dEl.classList.remove("asof-stale");
    }
  }
  tickClock();
  setInterval(tickClock, 1000);
  setInterval(function () { if (typeof load === "function") load(); }, 5 * 60 * 1000);
