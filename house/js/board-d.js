/* collapseHouseNames lives in board-b.js. Do not redefine it here — a second copy rounded avg and dropped printed unrealized. */

/* Sum slice parts in 1e-8 units so binary dust does not move a cent, then money() rounds once. */
function mixPart(s) {
  var n = s && s.exact != null && isFinite(Number(s.exact)) ? Number(s.exact) : Number(s && s.value);
  return isFinite(n) ? n : 0;
}
function mixSum(parts) {
  var units = 0;
  (parts || []).forEach(function (n) {
    n = Number(n);
    if (!isFinite(n)) return;
    units += Math.round(n * 1e8);
  });
  return units / 1e8;
}
/* Book equity, formatted like the Equity KPI. Parts sum only when that equity is missing. Never invent $0. */
function mixCenterLabel(bookObj, partsSum) {
  var raw = bookObj && bookObj.equity;
  if (raw != null && raw !== "" && isFinite(Number(raw))) {
    return (typeof moneyOrDash === "function") ? moneyOrDash(raw) : money(raw);
  }
  if (isFinite(Number(partsSum)) && Number(partsSum) !== 0) return money(partsSum);
  return "\u2014";
}

function mixGrowthCell(d) {
  if (!d) return '<td class="num mix-growth tone-flat">—</td>';
  var amt = (d.delta > 0 ? "+" : "") + money(d.delta);
  return '<td class="num mix-growth tone-' + tone(d.delta) + '"><span class="mix-amt">' + amt + '</span>' +
    '<small class="mix-pct dod tone-' + tone(d.delta) + '">' + pct(d.pct) + "</small></td>";
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
  if (rhEq > 0.004) {
    var rhExact = 0;
    (typeof RH_IDS !== "undefined" ? RH_IDS : []).forEach(function (id) {
      rhExact += Number((snap.accounts && snap.accounts[id] || {}).equity) || 0;
    });
    if (!(rhExact > 0)) rhExact = rhEq;
    rows.push({ key: "robinhood", label: "Robinhood", value: rhEq, exact: rhExact, color: mix[0] });
  }
  var fid = (snap.accounts && snap.accounts.fidelity) || {};
  if ((Number(fid.equity) || 0) > 0.004) rows.push({ key: "fidelity", label: "Fidelity", value: Number(fid.equity) || 0, exact: Number(fid.equity) || 0, color: mix[1] });
  var voya = (snap.accounts && snap.accounts.voya) || {};
  if ((Number(voya.equity) || 0) > 0.004) rows.push({ key: "voya", label: "Voya", value: Number(voya.equity) || 0, exact: Number(voya.equity) || 0, color: mix[2] });
  return rows;
}

function mixDetailSlices() {
  /* Detail table only. Pie uses mixTopSlices / sleeve slices — never · all. */
  var mix = (typeof MIX !== "undefined" && MIX) ? MIX : ["var(--mix-a)", "var(--mix-b)", "var(--mix-c)", "var(--mix-d)", "var(--mix-e)", "var(--mix-f)"];
  var rows = [];
  var i = 0;
  var rhEq = 0;
  (typeof RH_IDS !== "undefined" ? RH_IDS : ["agentic", "individual", "auto_grok", "joint"]).forEach(function (id) {
    var b = (snap.accounts && snap.accounts[id]) || {};
    var eq = Number(b.equity) || 0;
    if (eq <= 0.004) return;
    rhEq += eq;
    var name = (typeof bookDisplayLabel === "function") ? bookDisplayLabel(id, b) : ((LABEL && LABEL[id]) || id);
    rows.push({ key: id, label: "Rob \u00b7 " + name, value: eq, color: mix[i++ % mix.length], tapeKey: id });
  });
  if (rhEq > 0.004) {
    rows.push({ key: "robinhood", label: "Rob \u00b7 all", value: rhEq, color: mix[i++ % mix.length], tapeKey: "robinhood", detailOnly: true });
  }
  var fid = (snap.accounts && snap.accounts.fidelity) || {};
  if (!fid.sleeves && typeof buildFidelitySleeves === "function") {
    fid.sleeves = buildFidelitySleeves(fid, snap.truthifi);
  }
  var sleeves = fid.sleeves || [];
  var fidSum = 0;
  if (sleeves.length) {
    sleeves.forEach(function (s) {
      var eq = Number(s.equity) || 0;
      if (eq <= 0.004 && !(s.names || []).length) return;
      fidSum += eq;
      var key = (typeof fidTabId === "function") ? fidTabId(s.id) : ("fid-" + s.id);
      if (LABEL) LABEL[key] = s.label || s.id;
      rows.push({ key: key, label: "Fid \u00b7 " + (s.label || s.id), value: eq, color: mix[i++ % mix.length], tapeKey: null, noGrowth: true });
    });
    if (fidSum > 0.004) {
      rows.push({ key: "fidelity", label: "Fid \u00b7 all", value: fidSum, color: mix[i++ % mix.length], tapeKey: "fidelity", detailOnly: true });
    }
  } else if ((Number(fid.equity) || 0) > 0.004) {
    rows.push({ key: "fidelity", label: "Fid \u00b7 all", value: Number(fid.equity) || 0, color: mix[i++ % mix.length], tapeKey: "fidelity", detailOnly: true });
  }
  var voya = (snap.accounts && snap.accounts.voya) || {};
  if ((Number(voya.equity) || 0) > 0.004) {
    var voyBits = [];
    var tidy = (typeof bookDisplayLabel === "function") ? bookDisplayLabel("voya", voya) : (voya.label || "Voya");
    if (tidy && tidy !== "Voya" && tidy !== "Voya 401(k)") voyBits.push(tidy);
    else if (voya.suffix) voyBits.push("···" + String(voya.suffix).replace(/\D/g, "").slice(-4));
    else if (voya.sleeve && String(voya.sleeve).toLowerCase() !== "voya") {
      voyBits.push((typeof tidySleeveLabel === "function") ? tidySleeveLabel(voya.sleeve) : voya.sleeve);
    }
    var voyLabel = voyBits.length ? ("Voy \u00b7 " + voyBits.join(" \u00b7 ")) : "Voya";
    rows.push({ key: "voya", label: voyLabel, value: Number(voya.equity) || 0, color: mix[i++ % mix.length], tapeKey: "voya" });
  }
  return rows;
}

mixHtml = function (bookObj, t) {
  var slices;
  var houseMix = (t === "combined" && typeof snap !== "undefined" && snap && tab === "combined");
  var fidSleeveMix = bookObj && bookObj.books && bookObj.books.length && (tab === "fidelity" || t === "fidelity");
  if (houseMix) {
    slices = mixTopSlices();
  } else if (fidSleeveMix) {
    /* Fidelity page: donut = sleeves only (sums to pie). Fid · all is detail-only. */
    var mixC = (typeof MIX !== "undefined" && MIX) ? MIX : ["var(--mix-a)", "var(--mix-b)", "var(--mix-c)", "var(--mix-d)", "var(--mix-e)", "var(--mix-f)"];
    slices = (bookObj.books || []).map(function (b, i) {
      var key = (typeof fidTabId === "function") ? fidTabId(b.id) : ("fid-" + b.id);
      var shown = Number(b.equity) || 0;
      var exact = b.equityExact != null && isFinite(Number(b.equityExact)) ? Number(b.equityExact) : shown;
      return { key: key, label: "Fid · " + (b.label || b.id), value: shown, exact: exact, color: mixC[i % mixC.length], tapeKey: null, noGrowth: true };
    }).filter(function (s) { return s.value > 0.004; });
  } else {
    slices = mixSlices(bookObj, t);
  }
  slices = (slices || []).filter(function (s) { return !s.detailOnly; });
  /* Wedge sizes stay on the slice values. The center is the book equity, via the same helper as the Equity KPI. */
  var labelTotal = slices.reduce(function (s, x) { return s + (Number(x.value) || 0); }, 0) || 1;
  var partsSum = mixSum(slices.map(mixPart));
  var centerLabel = mixCenterLabel(bookObj, partsSum);
  var gap = 0.04;
  var a = -Math.PI / 2;
  var paths = slices.map(function (s) {
    var da = (s.value / labelTotal) * Math.PI * 2;
    var span = Math.max(da - gap, 0.02);
    var d = donutPath(70, 70, 38, 64, a + gap / 2, a + gap / 2 + span);
    a += da;
    return { key: s.key, label: s.label, color: s.color, d: d, pct: (s.value / labelTotal) * 100, value: s.value };
  });
  if (!paths.length) return '<div class="card mix-card"><p class="hint" style="margin:0">No mix yet.</p></div>';
  var top = paths.slice().sort(function (x, y) { return y.value - x.value; })[0];
  var svg = '<div class="mix-ring"><svg class="mix-svg" viewBox="0 0 140 140" aria-hidden="true">' +
    paths.map(function (p) { return '<path d="' + p.d + '" fill="' + p.color + '" data-mix-key="' + esc(p.key) + '"></path>'; }).join("") +
    '</svg><div class="mix-center"><b>' + centerLabel + '</b><span>' + esc(top.label) + " " + top.pct.toFixed(0) + "%</span></div></div>";
  var legend = paths.map(function (p) {
    return '<button type="button" class="mix-leg" data-mix-key="' + esc(p.key) + '">' +
      '<i style="background:' + p.color + '"></i>' +
      '<span class="mix-leg-meta"><span class="mix-leg-name">' + esc(p.label) + "</span>" +
      '<span class="mix-bar"><span style="width:' + Math.max(p.pct, 2).toFixed(1) + "%;background:" + p.color + '"></span></span></span>' +
      "<b>" + p.pct.toFixed(0) + "% \u00b7 " + money(p.value) + "</b></button>";
  }).join("");

  var detailSrc;
  if (houseMix) {
    detailSrc = mixDetailSlices();
  } else {
    detailSrc = slices.map(function (s, idx) {
      var p = paths[idx] || s;
      return {
        key: s.key || p.key,
        label: s.label || p.label,
        color: s.color || p.color,
        value: s.value != null ? s.value : p.value,
        tapeKey: s.tapeKey,
        noGrowth: !!s.noGrowth,
        detailOnly: !!s.detailOnly
      };
    });
    if (fidSleeveMix) {
      var pieTotal = mixSum(slices.map(mixPart));
      if (pieTotal > 0.004) {
        var mixC2 = (typeof MIX !== "undefined" && MIX) ? MIX : ["var(--mix-a)", "var(--mix-b)", "var(--mix-c)"];
        detailSrc.push({
          key: "fidelity",
          label: "Fid · all",
          value: pieTotal,
          color: mixC2[detailSrc.length % mixC2.length],
          tapeKey: "fidelity",
          detailOnly: true
        });
      }
    }
  }
      var detailRows = detailSrc.map(function (p) {
    var day = null, week = null, month = null, year = null;
    var canGrow = !p.noGrowth && p.tapeKey;
    if (canGrow && typeof dodTape === "function" && typeof vsLookback === "function") {
      var prints = dodTape(p.tapeKey);
      var tapeLast = null;
      (prints || []).forEach(function (raw) {
        var eq = Number((raw && raw.equity != null) ? raw.equity : (raw && raw.e));
        if (!isFinite(eq)) return;
        var t = raw && (raw.t || raw.asof || "");
        if (!tapeLast || String(t) >= String(tapeLast.t || "")) tapeLast = { t: t, equity: eq };
      });
      var scaleOk = !tapeLast || tapeLast.equity < 0.01 || !(p.value > 0.004)
        || (p.value / tapeLast.equity >= 0.7 && p.value / tapeLast.equity <= 1.35);
      if (scaleOk) {
        day = vsLookback(prints, p.value, 1);
        week = vsLookback(prints, p.value, 7);
        month = vsLookback(prints, p.value, 30);
        year = (typeof vsYtd === "function") ? vsYtd(prints, p.value) : vsLookback(prints, p.value, 365);
      }
    }
    return '<tr data-mix-key="' + esc(p.key) + '"><td><i class="mix-dot" style="background:' + p.color + '"></i> ' + esc(p.label) + "</td>" +
      '<td class="num">' + money(p.value) + "</td>" +
      mixGrowthCell(day) + mixGrowthCell(week) + mixGrowthCell(month) + mixGrowthCell(year) + "</tr>";
  }).join("");
  var hint = '<p class="mix-hint-click">' + (t === "combined"
    ? "Tap to expand: Rob books + Fid sleeves (Day/Week on Fid · all / Voya / Rob only — sleeve tapes not kept) + growth $ above %."
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
    if (!out) return out;
    if (out.combined) out.combined.names = collapseHouseNames(out.combined.names || []);
    if (out.robinhood) out.robinhood.names = collapseHouseNames(out.robinhood.names || []);
    if (out.accounts && out.accounts.fidelity) {
      out.accounts.fidelity.names = collapseHouseNames(out.accounts.fidelity.names || []);
    }
    if (out.accounts && out.accounts.voya) {
      out.accounts.voya.names = collapseHouseNames(out.accounts.voya.names || []);
    }
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
