function collapseHouseNames(list) {
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
    var hit = null;
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (g.symbol === n.symbol && String(g.kind || "") === String(n.kind || "") && sameName(g.name, n.name || n.symbol)) { hit = g; break; }
    }
    var cost = n.cost != null ? Number(n.cost) : ((n.avg != null && n.qty != null) ? Number(n.avg) * Number(n.qty) : 0);
    if (!hit) {
      groups.push({ symbol: n.symbol, name: n.name || n.symbol, kind: n.kind || "equity", qty: Number(n.qty) || 0, value: Number(n.value) || 0, cost: cost, last: n.last != null ? Number(n.last) : null, last_fill: n.last_fill || n.first_fill || "", accounts: (n.accounts || [n.account]).filter(Boolean), sleeves: n.sleeve ? [n.sleeve] : [], account: n.account });
      return;
    }
    hit.qty += Number(n.qty) || 0; hit.value += Number(n.value) || 0; hit.cost += cost;
    if (hit.last == null && n.last != null) hit.last = Number(n.last);
    (n.accounts || [n.account]).forEach(function (a) { if (a && hit.accounts.indexOf(a) < 0) hit.accounts.push(a); });
    if (n.sleeve && hit.sleeves.indexOf(n.sleeve) < 0) hit.sleeves.push(n.sleeve);
    if ((n.name || "").length > (hit.name || "").length) hit.name = n.name;
  });
  return groups.map(function (g) {
    g.avg = g.qty ? rnd(g.cost / g.qty) : null; g.value = rnd(g.value); g.cost = rnd(g.cost);
    g.pnl = rnd(g.value - g.cost); g.pnl_pct = g.cost ? rnd((g.pnl / g.cost) * 100) : null;
    if (g.sleeves.length) g.sleeve = g.sleeves.join(" \u00b7 ");
    return g;
  });
}

mixHtml = function (bookObj, t) {
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
  var svg = '<svg class="mix-svg" viewBox="0 0 112 112">' + paths.map(function (p) {
    return '<path d="' + p.d + '" fill="' + p.color + '" data-mix-key="' + esc(p.key) + '"></path>';
  }).join("") + "</svg>";
  var legend = paths.map(function (p) {
    return '<div class="mix-leg" data-mix-key="' + esc(p.key) + '"><i style="background:' + p.color + '"></i><span>' + esc(p.label) + "</span><b>" + p.pct.toFixed(1) + "% \u00b7 " + money(p.value) + "</b></div>";
  }).join("");
  var rows = paths.map(function (p) {
    return '<tr data-mix-key="' + esc(p.key) + '"><td>' + esc(p.label) + '</td><td class="num">' + money(p.value) + '</td><td class="num">' + p.pct.toFixed(2) + "%</td></tr>";
  }).join("");
  return '<div class="card mix-card"><div class="mix-compact">' + svg + '<div class="mix-legend">' + legend + "</div></div>" +
    '<p class="mix-hint-click">Click the pie or a slice for detail.</p>' +
    '<div class="mix-detail"><table><thead><tr><th>Slice</th><th class="num">Value</th><th class="num">Share</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
};

(function () {
  var prev = merge;
  merge = function (house, pilot, outside) {
    var out = prev(house, pilot, outside);
    if (out && out.combined) out.combined.names = collapseHouseNames(out.combined.names || []);
    return out;
  };
  var prevPaint = paint;
  paint = function () {
    prevPaint();
    if (!snap || tab !== "combined") return;
    var desk = document.getElementById("desk");
    if (!desk) return;
    var liveOv = document.getElementById("booksOverlay");
    if (liveOv) {
      var h = liveOv.querySelector(".books-head h2");
      if (h) h.textContent = "Live equity \u00b7 Robinhood";
    }
    var ovCard = desk.querySelector("h2.overall-eq");
    if (ovCard && ovCard.nextElementSibling) {
      ovCard.nextElementSibling.setAttribute("data-open-all-books", "1");
      ovCard.nextElementSibling.classList.add("tape-open");
    }
  };
  document.addEventListener("click", function (e) {
    if (e.target.closest(".mix-card") && !e.target.closest("[data-tab]")) {
      var card = e.target.closest(".mix-card");
      var keyEl = e.target.closest("[data-mix-key]");
      var key = keyEl ? keyEl.getAttribute("data-mix-key") : "";
      card.classList.add("mix-open");
      Array.from(card.querySelectorAll(".mix-leg")).forEach(function (el) {
        el.classList.toggle("on", key && el.getAttribute("data-mix-key") === key);
      });
      if (key && LABEL[key] && typeof TABS !== "undefined" && TABS.some(function (t) { return t.id === key; })) {
        overlayOpen = false; tab = key; setHash(); paint(); return;
      }
      if (key && document.getElementById("sleeve-" + key)) {
        document.getElementById("sleeve-" + key).scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    if (e.target.closest("[data-open-all-books]")) {
      overlayMode = "all";
      overlayOpen = true;
      if (typeof syncOverlay === "function") syncOverlay();
    }
  });
  if (typeof load === "function") load();
})();
