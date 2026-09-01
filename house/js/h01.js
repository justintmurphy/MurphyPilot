      var on = btn.getAttribute("data-theme-choice") === t;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function donutPath(cx, cy, r0, r1, a0, a1) {
    var large = a1 - a0 > Math.PI ? 1 : 0;
    function p(r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var p0 = p(r1, a0), p1 = p(r1, a1), p2 = p(r0, a1), p3 = p(r0, a0);
    return "M" + p0[0] + " " + p0[1] + " A" + r1 + " " + r1 + " 0 " + large + " 1 " + p1[0] + " " + p1[1] +
      " L" + p2[0] + " " + p2[1] + " A" + r0 + " " + r0 + " 0 " + large + " 0 " + p3[0] + " " + p3[1] + " Z";
  }
  function mixSlices(book, t) {
    if (t === "combined" && book.books && book.books.length) {
      return book.books.map(function (b, i) {
        return { key: b.id, label: b.label, value: b.equity, color: MIX[i % MIX.length] };
      }).concat([{ key: "cash", label: "Cash", value: book.cash, color: "var(--mix-cash)" }]).filter(function (s) { return s.value > 0.004; });
    }
    var held = (book.names || []).filter(function (n) { return (n.value || 0) > 0.004; });
    var rows = held.slice(0, 8).map(function (n, i) {
      return { key: n.symbol, label: n.symbol, value: n.value || 0, color: MIX[i % MIX.length] };
    });
    var rest = held.slice(8).reduce(function (s, n) { return s + (n.value || 0); }, 0);
    if (rest > 0.004) rows.push({ key: "other", label: "Other", value: rest, color: MIX[4] });
    if (book.cash > 0.004) rows.push({ key: "cash", label: "Cash", value: book.cash, color: "var(--mix-cash)" });
    return rows;
  }

  function yStep(rng) {
    if (rng > 2000) return 250;
    if (rng > 500) return 100;
    if (rng > 250) return 50;
    if (rng > 100) return 25;
    if (rng > 50) return 10;
    if (rng > 20) return 5;
    if (rng > 5) return 1;
    if (rng > 2) return 0.5;
    if (rng > 0.4) return 0.25;
    return 0.1;
  }
  function sparkSvg(vals, dtg, cost, opt) {
    opt = opt || {};
    var axis = !!opt.axis;
    var narrow = window.innerWidth < 720;
    var w = axis ? 760 : 640;
    var h = axis ? (narrow ? 148 : 132) : (opt.miniH || 56);
    var pL = axis ? (narrow ? 52 : 48) : 8;
    var pR = axis ? 12 : 8;
    var pT = axis ? 16 : 8;
    var pB = axis ? (narrow ? 28 : 26) : 8;
    var mn = Math.min.apply(null, vals.concat(cost == null ? [] : [cost]));
    var mx = Math.max.apply(null, vals.concat(cost == null ? [] : [cost]));
    var yTicks = [];
    if (axis) {
      var padY = Math.max((mx - mn) * 0.16, 0.08);
      var step = yStep(mx - mn + padY * 2);
      var lo = Math.floor((mn - padY) / step) * step;
      var hi = Math.ceil((mx + padY) / step) * step;
      var ticks = [];
      for (var v = lo; v <= hi + step / 2; v = Math.round((v + step) * 100) / 100) ticks.push(Math.round(v * 100) / 100);
      while (ticks.length > 4) {
        step *= 2; ticks = [];
        lo = Math.floor((mn - padY) / step) * step;
        hi = Math.ceil((mx + padY) / step) * step;
        for (v = lo; v <= hi + step / 2; v = Math.round((v + step) * 100) / 100) ticks.push(Math.round(v * 100) / 100);
      }
      yTicks = ticks; mn = yTicks[0]; mx = yTicks[yTicks.length - 1];
    }
    var span = mx - mn || 1;
    var ptsArr = vals.map(function (val, i) {
      var x = pL + i * (w - pL - pR) / Math.max(vals.length - 1, 1);
      var y = pT + (h - pT - pB) * (1 - (val - mn) / span);
      return [x, y];
    });
    var last = vals[vals.length - 1];
    var up = last >= (cost == null ? vals[0] : cost);
    var stroke = up ? "var(--go)" : "var(--stop)";
    var pts = ptsArr.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
    var lastPt = ptsArr[ptsArr.length - 1];
    var firstPt = ptsArr[0];
    var area = pts + " " + lastPt[0].toFixed(1) + "," + (h - pB) + " " + firstPt[0].toFixed(1) + "," + (h - pB);
    var extras = "";
    if (axis) {
      yTicks.forEach(function (tick) {
        var y = pT + (h - pT - pB) * (1 - (tick - mn) / (mx - mn || 1));
        extras += '<line x1="' + pL + '" x2="' + (w - pR) + '" y1="' + y + '" y2="' + y + '" stroke="var(--chart-grid)"/>';
        extras += '<text x="' + (pL - 6) + '" y="' + (y + 3) + '" text-anchor="end" font-size="10" fill="var(--chart-axis)">$' + tick.toFixed(0) + "</text>";
      });
      extras += '<line x1="' + pL + '" x2="' + pL + '" y1="' + pT + '" y2="' + (h - pB) + '" stroke="var(--chart-axis)" stroke-width="1.2"/>';
      extras += '<line x1="' + pL + '" x2="' + (w - pR) + '" y1="' + (h - pB) + '" y2="' + (h - pB) + '" stroke="var(--chart-axis)" stroke-width="1.2"/>';
      var lastI = vals.length - 1;
      var picks = lastI < 3 || narrow ? [0, lastI] : [0, Math.round(lastI / 2), lastI];
      var seen = {};
      picks.forEach(function (i) {
        if (i < 0 || i > lastI || seen[i] || !dtg[i]) return;
        seen[i] = true;
        var x = pL + i * (w - pL - pR) / Math.max(lastI, 1);
        var anchor = i === 0 ? "start" : i === lastI ? "end" : "middle";
        extras += '<line x1="' + x + '" x2="' + x + '" y1="' + (h - pB) + '" y2="' + (h - pB + 6) + '" stroke="var(--chart-axis)"/>';
        extras += '<text x="' + x + '" y="' + (h - 8) + '" text-anchor="' + anchor + '" font-size="10" fill="var(--chart-axis)">' + esc(dtg[i]) + "</text>";
      });
    }
    if (cost != null) {
      var cy = pT + (h - pT - pB) * (1 - (cost - mn) / span);
      extras += '<line x1="' + pL + '" x2="' + (w - pR) + '" y1="' + cy + '" y2="' + cy + '" stroke="var(--chart-dash)" stroke-dasharray="3 3"/>';
      if (axis && opt.dashLabel) extras += '<text x="' + (pL + 8) + '" y="' + (cy - 6) + '" font-size="10" fill="var(--ink-soft)">' + esc(opt.dashLabel) + "</text>";
    }
    extras += '<polygon points="' + area + '" fill="' + stroke + '" fill-opacity="0.14" pointer-events="none"/>';
    extras += '<polyline points="' + pts + '" fill="none" stroke="' + stroke + '" stroke-width="' + (axis ? 2 : 1.8) + '" pointer-events="none"/>';
    var sel = opt.selected == null ? vals.length - 1 : opt.selected;
    var hi = Math.max.apply(null, vals);
    var loVal = Math.min.apply(null, vals);
    if (axis) {
      vals.forEach(function (val, i) {
        var p = ptsArr[i];
        var on = i === sel;
        extras += '<circle class="tape-hit" data-i="' + i + '" cx="' + p[0] + '" cy="' + p[1] + '" r="14" fill="transparent"/>';
        extras += '<circle class="tape-pt' + (on ? " on" : "") + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (on ? 5 : 3.4) + '" fill="' + (on ? stroke : "var(--chart-axis)") + '" fill-opacity="' + (on ? 1 : 0.55) + '" pointer-events="none"/>';
      });
      if (hi !== last) {
        var hiI = vals.indexOf(hi);
        extras += '<text x="' + ptsArr[hiI][0] + '" y="' + (ptsArr[hiI][1] - 10) + '" text-anchor="middle" font-size="10" fill="var(--go)">$' + hi.toFixed(2) + "</text>";
      }
      if (loVal !== last && loVal !== hi) {
        var loI = vals.indexOf(loVal);
        extras += '<text x="' + ptsArr[loI][0] + '" y="' + (ptsArr[loI][1] + 14) + '" text-anchor="middle" font-size="10" fill="var(--stop)">$' + loVal.toFixed(2) + "</text>";
      }
      var selPt = ptsArr[Math.min(sel, ptsArr.length - 1)];
      var label = "$" + vals[sel].toFixed(2);
      var tw = Math.max(64, 12 + label.length * 8.6);
      var th = 24;
      var fx = selPt[0] - tw / 2;
      var fy = selPt[1] - th - 14;
      if (fy < 4) fy = selPt[1] + 16;
      if (fx < 72) fx = 72;
      if (fx + tw > w - 8) fx = w - 8 - tw;
      extras += '<rect x="' + fx + '" y="' + fy + '" width="' + tw + '" height="' + th + '" rx="3" fill="var(--paper)" stroke="' + stroke + '" stroke-width="1.6"/>';
      extras += '<text x="' + (fx + tw / 2) + '" y="' + (fy + th - 7) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + stroke + '">' + label + "</text>";
    } else {
      extras += '<circle cx="' + lastPt[0] + '" cy="' + lastPt[1] + '" r="3.2" fill="' + stroke + '"/>';
    }
