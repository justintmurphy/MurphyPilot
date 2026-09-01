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
  var liveEq = 0;
  LIVE_IDS.forEach(function (id) { liveEq += Number((out.accounts[id] || {}).equity) || 0; });
  out.tape = out.tape || {};
  out.tape.live = (out.tape.combined || []).map(normPrint);
  var outsideAsOf = (outside && outside.asof) || "";
  out.tape.fidelity = [{ t: outsideAsOf, equity: Number((out.accounts.fidelity || {}).equity) || 0 }];
  out.tape.voya = [{ t: outsideAsOf, equity: Number((out.accounts.voya || {}).equity) || 0 }];
  out.combined.live_equity = rnd(liveEq);
  out.combined.outside_asof = outsideAsOf;
  return out;
};

cardsHtml = function () {
  return "<h2>Books</h2><div class=\"acct-grid\">" + IDS.map(function (id) {
    var b = snap.accounts[id] || {};
    return '<button type="button" class="acct-mini" data-tab="' + id + '"><div class="k">' + esc(LABEL[id]) + "</div><b>" + money(b.equity) + '</b><div class="m">' + (b.names || []).length + " names</div></button>";
  }).join("") + "</div>";
};

tableHtml = function (names, showBook, showStall) {
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
    if (n.sleeve) books = (books ? books + " \u00b7 " : "") + n.sleeve;
    var chg = n.day_pct != null ? n.day_pct : n.pnl_pct;
    return "<tr><td class=\"name-cell tone-" + tone(chg) + "\"><span class=\"sym\">" + esc(n.symbol) + '</span><span class="sub">' + esc(n.name || "") + "</span></td>" +
      (showBook ? "<td>" + esc(books) + "</td>" : "") +
      '<td class="num">' + qty(n.qty) + '</td><td class="num">' + (n.avg == null ? "\u2014" : money(n.avg)) + "</td>" +
      '<td class="num">' + (n.last == null ? "\u2014" : money(n.last)) + "</td>" +
      (showStall ? "<td>" + esc(n.first_fill || "\u2014") + "</td><td>" + esc(n.next_stall || "\u2014") + "</td>" : "") +
      "<td>" + esc(n.last_fill || n.first_fill || "\u2014") + "</td>" +
      '<td class="num">' + money(n.value) + '</td><td class="num tone-' + tone(n.pnl) + '">' + money(n.pnl) + " " + pct(n.pnl_pct) + "</td></tr>";
  }).join("");
  var wrap = (showBook || names.length > 10) ? "card book-scroll" : "card";
  return '<div class="' + wrap + '"><table class="book"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table></div>";
};

var _paint = paint;
paint = function () {
  if (!snap) return;
  _paint();
  var foot = document.querySelector(".desk-foot");
  if (foot) foot.textContent = "Murphy Pilot \u00b7 House rolls up Agentic, Individual, Auto-Grok, Joint, Fidelity, and Voya.";
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
