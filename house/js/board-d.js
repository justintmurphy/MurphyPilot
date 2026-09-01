function collapseHouseNames(list) {
  function keyName(s) {
    return String(s || "").toLowerCase().replace(/class [a-z]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }
  function sameName(a, b) {
    a = keyName(a);
    b = keyName(b);
    if (!a || !b || a === b) return true;
    if (a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return true;
    var ta = a.split(" ").filter(Boolean), tb = b.split(" ").filter(Boolean), n = 0;
    ta.forEach(function (t) { if (tb.indexOf(t) >= 0) n += 1; });
    return n > 0 && n / Math.min(ta.length, tb.length) >= 0.5;
  }
  var groups = [];
  (list || []).forEach(function (n) {
    var hit = null;
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (g.symbol === n.symbol && String(g.kind || "") === String(n.kind || "") && sameName(g.name, n.name || n.symbol)) {
        hit = g;
        break;
      }
    }
    var cost = n.cost != null ? Number(n.cost) : ((n.avg != null && n.qty != null) ? Number(n.avg) * Number(n.qty) : 0);
    if (!hit) {
      groups.push({
        symbol: n.symbol,
        name: n.name || n.symbol,
        kind: n.kind || "equity",
        qty: Number(n.qty) || 0,
        value: Number(n.value) || 0,
        cost: cost,
        last: n.last != null ? Number(n.last) : null,
        day_pct: n.day_pct,
        last_fill: n.last_fill || n.first_fill || "",
        first_fill: n.first_fill || "",
        accounts: (n.accounts || [n.account]).filter(Boolean),
        sleeves: n.sleeve ? [n.sleeve] : [],
        account: n.account
      });
      return;
    }
    hit.qty += Number(n.qty) || 0;
    hit.value += Number(n.value) || 0;
    hit.cost += cost;
    if (hit.last == null && n.last != null) hit.last = Number(n.last);
    if (n.last_fill && (!hit.last_fill || String(n.last_fill) > String(hit.last_fill))) hit.last_fill = n.last_fill;
    (n.accounts || [n.account]).forEach(function (a) { if (a && hit.accounts.indexOf(a) < 0) hit.accounts.push(a); });
    if (n.sleeve && hit.sleeves.indexOf(n.sleeve) < 0) hit.sleeves.push(n.sleeve);
    if ((n.name || "").length > (hit.name || "").length) hit.name = n.name;
  });
  return groups.map(function (g) {
    g.avg = g.qty ? rnd(g.cost / g.qty) : null;
    g.value = rnd(g.value);
    g.cost = rnd(g.cost);
    g.pnl = rnd(g.value - g.cost);
    g.pnl_pct = g.cost ? rnd((g.pnl / g.cost) * 100) : null;
    if (g.sleeves.length) g.sleeve = g.sleeves.join(" \u00b7 ");
    return g;
  });
}

(function () {
  var prev = merge;
  merge = function (house, pilot, outside) {
    var out = prev(house, pilot, outside);
    if (out && out.combined) out.combined.names = collapseHouseNames(out.combined.names || []);
    return out;
  };
  if (typeof load === "function") load();
})();
