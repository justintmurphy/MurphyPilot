TABS = [
  { id: "combined", label: "House" },
  { id: "agentic", label: "Agentic" },
  { id: "individual", label: "Individual" },
  { id: "auto_grok", label: "Auto-Grok" },
  { id: "joint", label: "Joint" },
  { id: "fidelity", label: "Fidelity" },
  { id: "voya", label: "Voya" }
];
LABEL.fidelity = "Fidelity";
LABEL.voya = "Voya";
IDS = ["agentic", "individual", "auto_grok", "joint", "fidelity", "voya"];
var LIVE_IDS = ["agentic", "individual", "auto_grok", "joint"];
var OUTSIDE_IDS = ["fidelity", "voya"];

var _mergeCore = merge;
merge = function (house, pilot, outside) {
  var out = _mergeCore(house, pilot);
  if (outside && outside.accounts) {
    OUTSIDE_IDS.forEach(function (id) {
      if (outside.accounts[id]) out.accounts[id] = outside.accounts[id];
    });
    out.truthifi = outside;
  }
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
  var liveEq = 0, liveCash = 0, liveBp = 0;
  LIVE_IDS.forEach(function (id) {
    var b = out.accounts[id] || {};
    liveEq += Number(b.equity) || 0;
    liveCash += Number(b.cash) || 0;
    liveBp += Number(b.buying_power) || 0;
  });
  var custEq = 0;
  OUTSIDE_IDS.forEach(function (id) { custEq += Number((out.accounts[id] || {}).equity) || 0; });
  out.combined.equity = rnd(eq);
  out.combined.cash = rnd(cash);
  out.combined.buying_power = rnd(bp);
  out.combined.pending_deposits = rnd(pend);
  out.combined.equity_value = rnd(ev);
  out.combined.crypto_value = rnd(cv);
  out.combined.open_orders = orders;
  out.combined.invested_pct = eq ? Math.min(100, (ev / eq) * 100) : 0;
  out.combined.names = names;
  out.combined.books = IDS.map(function (id) {
    var b = out.accounts[id] || {};
    return { id: id, label: LABEL[id], equity: Number(b.equity) || 0, cash: Number(b.cash) || 0, pending_deposits: Number(b.pending_deposits) || 0, invested_pct: Number(b.invested_pct) || 0, names: (b.names || []).length };
  });
  out.tape = out.tape || {};
  out.tape.live = (out.tape.combined || []).map(normPrint);
  var outsideAsOf = (outside && (outside.holdings_asof || outside.asof)) || "";
  out.tape.fidelity = [{ t: outsideAsOf, equity: Number((out.accounts.fidelity || {}).equity) || 0 }];
  out.tape.voya = [{ t: outsideAsOf, equity: Number((out.accounts.voya || {}).equity) || 0 }];
  var ovTape = (outside && outside.tape && outside.tape.overall) || [];
  out.tape.overall = ovTape.map(normPrint);
  if (!out.tape.overall.length) out.tape.overall = [{ t: (outside && outside.scanned_at) || "", equity: rnd(eq) }];
  out.combined.live_equity = rnd(liveEq);
  out.combined.live_cash = rnd(liveCash);
  out.combined.live_buying_power = rnd(liveBp);
  out.combined.custodial_equity = rnd(custEq);
  out.combined.outside_asof = outsideAsOf;
  out.combined.overall_asof = (outside && outside.overall && outside.overall.asof) || (outside && outside.scanned_at) || "";
  return out;
};

cardsHtml = function () {
  return "<h2>Books</h2><div class=\"acct-grid\">" + IDS.map(function (id) {
    var b = snap.accounts[id] || {};
    var tag = OUTSIDE_IDS.indexOf(id) >= 0 ? "EOD" : "live";
    return '<button type="button" class="acct-mini" data-tab="' + id + '"><div class="k">' + esc(LABEL[id]) + " \u00b7 " + tag + "</div><b>" + money(b.equity) + '</b><div class="m">' + (b.names || []).length + " names</div></button>";
  }).join("") + "</div>";
};

function overallCardHtml() {
  var c = snap.combined || {};
  var prints = ((snap.tape && snap.tape.overall) || []).map(normPrint).filter(function (p) { return p && isFinite(p.equity); });
  var vals = prints.map(function (p) { return p.equity; });
  var last = vals.length ? vals[vals.length - 1] : (c.equity || 0);
  if (!vals.length) vals = [last, last];
  return "<h2>Overall equity \u00b7 daily close</h2><div class=\"card tape-card\">" +
    '<div class="tape-kpis">' +
    "<div><span>Overall</span><b>" + money(c.equity) + "</b></div>" +
    "<div><span>Live</span><b>" + money(c.live_equity) + "</b></div>" +
    "<div><span>Custodial</span><b>" + money(c.custodial_equity) + "</b></div>" +
    "<div><span>Prints</span><b>" + prints.length + "</b></div></div>" +
    '<div class="tape-plot">' + spark(vals) + "</div>" +
    '<p class="hint">Ticked weekdays at 16:00 ET. Live = Robinhood books. Custodial = Fidelity + Voya' +
    (c.outside_asof ? " as of " + esc(c.outside_asof) : "") + ".</p></div>";
}

var _paint = paint;
paint = function () {
  if (!snap) return;
  _paint();
  var foot = document.querySelector(".desk-foot");
  if (foot) foot.textContent = "Murphy Pilot \u00b7 House rolls up live Robinhood books plus Fidelity and Voya.";
  if (tab !== "combined") return;
  var desk = document.getElementById("desk");
  if (!desk) return;
  Array.from(desk.querySelectorAll("h2")).forEach(function (h) {
    var t = h.textContent || "";
    if (t.indexOf("Live equity") === 0) h.textContent = "Live equity \u00b7 Robinhood";
    if (t.indexOf("Book state") === 0) h.textContent = "Book state \u00b7 all books";
  });
  var liveH = Array.from(desk.querySelectorAll("h2")).filter(function (h) { return (h.textContent || "").indexOf("Live equity") === 0; })[0];
  if (liveH && !desk.querySelector("h2.overall-eq")) {
    var wrap = document.createElement("div");
    wrap.innerHTML = overallCardHtml();
    var h = wrap.querySelector("h2");
    if (h) h.className = "overall-eq";
    while (wrap.firstChild) desk.insertBefore(wrap.firstChild, liveH);
  }
};

load = function () {
  var housePath = /\/house(\/|$)/.test(location.pathname);
  var bust = "?t=" + Date.now();
  Promise.all([
    fetch((housePath ? "house-snapshot.json" : "house/house-snapshot.json") + bust, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch((housePath ? "../pilot-snapshot.json" : "pilot-snapshot.json") + bust, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetch((housePath ? "truthifi-snapshot.json" : "house/truthifi-snapshot.json") + bust, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
  ]).then(function (pair) {
    snap = merge(pair[0], pair[1], pair[2]);
    paint();
  }).catch(function (e) {
    document.getElementById("desk").innerHTML = "<p class='hint'>Could not load snapshots. " + esc(e) + "</p>";
  });
};

load();
