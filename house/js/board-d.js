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

function mixGrowthCell(d) {
  if (!d) return '<td class="num tone-flat">\u2014</td>';
  return '<td class="num tone-' + tone(d.delta) + '">' + (d.delta > 0 ? "+" : "") + money(d.delta) +
    '<small class="dod tone-' + tone(d.delta) + '">' + pct(d.pct) + "</small></td>";
}

function mixTopSlices() {
  /* Compact donut: three rollups only — Robinhood / Fidelity / Voya */
  var mix = (typeof MIX !== "undefined" && MIX) ? MIX : ["var(--mix-a)", "var(--mix-b)", "var(--mix-c)"];
  var rows = [];
  var rh = (snap && snap.robinhood) || {};
  var rhEq = Number(rh.equity);
  if (!isFinite(rhEq) || rhEq <= 0) {
    rhEq = 0;
    (typeof RH_IDS !== "undefined" ? RH_IDS : []).forEach(function (id) {
      rhEq += Number((snap.accounts && snap.accounts[id] || {}).equity) || 0;
    });
  }
  if (rhEq > 0.004) rows.push({ key: "robinhood", label: "Robinhood", value: rhEq, color: mix[0] });
  var fid = (snap.accounts && snap.accounts.fidelity) || {};
  if ((Number(fid.equity) || 0) > 0.004) rows.push({ key: "fidelity", label: "Fidelity", value: Number(fid.equity) || 0, color: mix[1] });
  var voya = (snap.accounts && snap.accounts.voya) || {};
  if ((Number(voya.equity) || 0) > 0.004) rows.push({ key: "voya", label: "Voya", value: Number(voya.equity) || 0, color: mix[2] });
  return rows;
}

function mixDetailSlices() {
  /* Click detail: split Robinhood books AND Fidelity sleeves; Voya stays one */
  var mix = (typeof MIX !== "undefined" && MIX) ? MIX : ["var(--mix-a)", "var(--mix-b)", "var(--mix-c)", "var(--mix-d)", "var(--mix-e)", "var(--mix-f)"];
  var rows = [];
  var i = 0;
  (typeof RH_IDS !== "undefined" ? RH_IDS : ["agentic", "individual", "auto_grok", "joint"]).forEach(function (id) {
    var b = (snap.accounts && snap.accounts[id]) || {};
    var eq = Number(b.equity) || 0;
    if (eq > 0.004) rows.push({ key: id, label: (LABEL && LABEL[id]) || id, value: eq, color: mix[i++ % mix.length], tapeKey: id });
  });
  var fid = (snap.accounts && snap.accounts.fidelity) || {};
  if (!fid.sleeves && typeof buildFidelitySleeves === "function") {
    fid.sleeves = buildFidelitySleeves(fid, snap.truthifi);
  }
  var sleeves = fid.sleeves || [];
  if (sleeves.length) {
    sleeves.forEach(function (s) {
      var eq = Number(s.equity) || 0;
      if (eq <= 0.004 && !(s.names || []).length) return;
      var key = (typeof fidTabId === "function") ? fidTabId(s.id) : ("fid-" + s.id);
      if (LABEL) LABEL[key] = s.label || s.id;
      rows.push({ key: key, label: "Fid \u00b7 " + (s.label || s.id), value: eq, color: mix[i++ % mix.length], tapeKey: "fidelity" });
    });
  } else if ((Number(fid.equity) || 0) > 0.004) {
    rows.push({ key: "fidelity", label: "Fidelity", value: Number(fid.equity) || 0, color: mix[i++ % mix.length], tapeKey: "fidelity" });
  }
  var voya = (snap.accounts && snap.accounts.voya) || {};
  if ((Number(voya.equity) || 0) > 0.004) {
    rows.push({ key: "voya", label: "Voya", value: Number(voya.equity) || 0, color: mix[i++ % mix.length], tapeKey: "voya" });
  }
  return rows;
}

mixHtml = function (bookObj, t) {
  var slices;
  if (t === "combined" && typeof snap !== "undefined" && snap) {
    slices = mixTopSlices();
  } else {
    slices = mixSlices(bookObj, t);
  }
  var total = slices.reduce(function (s, x) { return s + x.value; }, 0) || 1;
  var gap = 0.04;
  var a = -Math.PI / 2;
  var paths = slices.map(function (s) {
    var da = (s.value / total) * Math.PI * 2;
    var span = Math.max(da - gap, 0.02);
    var d = donutPath(70, 70, 38, 64, a + gap / 2, a + gap / 2 + span);
    a += da;
    return { key: s.key, label: s.label, color: s.color, d: d, pct: (s.value / total) * 100, value: s.value };
  });
  if (!paths.length) return '<div class="card mix-card"><p class="hint" style="margin:0">No mix yet.</p></div>';
  var top = paths.slice().sort(function (x, y) { return y.value - x.value; })[0];
  var svg = '<div class="mix-ring"><svg class="mix-svg" viewBox="0 0 140 140" aria-hidden="true">' +
    paths.map(function (p) { return '<path d="' + p.d + '" fill="' + p.color + '" data-mix-key="' + esc(p.key) + '"></path>'; }).join("") +
    '</svg><div class="mix-center"><b>' + money(total) + '</b><span>' + esc(top.label) + " " + top.pct.toFixed(0) + "%</span></div></div>";
  var legend = paths.map(function (p) {
    return '<button type="button" class="mix-leg" data-mix-key="' + esc(p.key) + '">' +
      '<i style="background:' + p.color + '"></i>' +
      '<span class="mix-leg-meta"><span class="mix-leg-name">' + esc(p.label) + "</span>" +
      '<span class="mix-bar"><span style="width:' + Math.max(p.pct, 2).toFixed(1) + "%;background:" + p.color + '"></span></span></span>' +
      "<b>" + p.pct.toFixed(0) + "% \u00b7 " + money(p.value) + "</b></button>";
  }).join("");

  var detailSrc = (t === "combined" && snap) ? mixDetailSlices() : paths;
  var detailRows = detailSrc.map(function (p) {
    var tapeKey = p.tapeKey || p.key;
    var prints = (typeof dodTape === "function") ? dodTape(tapeKey) : [];
    var day = (typeof vsLookback === "function") ? vsLookback(prints, p.value, 1) : null;
    var week = (typeof vsLookback === "function") ? vsLookback(prints, p.value, 7) : null;
    var month = (typeof vsLookback === "function") ? vsLookback(prints, p.value, 30) : null;
    var year = (typeof vsYtd === "function") ? vsYtd(prints, p.value) : ((typeof vsLookback === "function") ? vsLookback(prints, p.value, 365) : null);
    return '<tr data-mix-key="' + esc(p.key) + '"><td><i class="mix-dot" style="background:' + p.color + '"></i> ' + esc(p.label) + "</td>" +
      '<td class="num">' + money(p.value) + "</td>" +
      mixGrowthCell(day) + mixGrowthCell(week) + mixGrowthCell(month) + mixGrowthCell(year) + "</tr>";
  }).join("");
  var hint = '<p class="mix-hint-click">' + (t === "combined"
    ? "Tap to expand: Robinhood books + Fidelity sleeves + Voya with Day / Week / Month / Year (dash if tape is short)."
    : "Tap for Day / Week / Month / Year vs this book\u2019s tape.") + "</p>";
  return '<div class="card mix-card"><div class="mix-compact">' + svg + '<div class="mix-legend">' + legend + "</div></div>" +
    hint +
    '<div class="mix-detail"><table><thead><tr><th>Book</th><th class="num">Now</th><th class="num">Day</th><th class="num">Week</th><th class="num">Month</th><th class="num">Year</th></tr></thead><tbody>' +
    detailRows + "</tbody></table></div></div>";
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
    var liveOv = document.getElementById("booksOverlay");
    if (liveOv) {
      var h = liveOv.querySelector(".books-head h2");
      if (h) h.textContent = "Live equity \u00b7 Robinhood + Fidelity books";
    }
  };
  document.addEventListener("click", function (e) {
    if (e.target.closest(".mix-card") && !e.target.closest("[data-tab]")) {
      var card = e.target.closest(".mix-card");
      var keyEl = e.target.closest("[data-mix-key]");
      var key = keyEl ? keyEl.getAttribute("data-mix-key") : "";
      card.classList.add("mix-open");
      Array.from(card.querySelectorAll(".mix-leg, .mix-detail tr")).forEach(function (el) {
        el.classList.toggle("on", key && el.getAttribute("data-mix-key") === key);
      });
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
