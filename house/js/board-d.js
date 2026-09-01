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
        symbol: n.symbol, name: n.name || n.symbol, kind: n.kind || "equity",
        qty: Number(n.qty) || 0, value: Number(n.value) || 0, cost: cost,
        last: n.last != null ? Number(n.last) : null, day_pct: n.day_pct,
        last_fill: n.last_fill || n.first_fill || "", first_fill: n.first_fill || "",
        accounts: (n.accounts || [n.account]).filter(Boolean),
        sleeves: n.sleeve ? [n.sleeve] : [], account: n.account
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
    g.value = rnd(g.value); g.cost = rnd(g.cost);
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

  function overlayRows(ids) {
    return ids.map(function (id) {
      var b = snap.accounts[id] || {};
      var names = (b.names || []).slice().sort(function (a, c) { return (Number(c.value) || 0) - (Number(a.value) || 0); }).slice(0, 4);
      var list = names.map(function (n) {
        return '<span class="ov-name tone-' + tone(n.pnl) + '">' + esc(n.symbol) + " " + money(n.value) + "</span>";
      }).join("") || '<span class="ov-name">No names</span>';
      var tag = LIVE_IDS.indexOf(id) >= 0 ? "live" : "EOD";
      return '<button type="button" class="ov-book" data-tab="' + id + '">' +
        '<div class="k">' + esc(LABEL[id]) + " \u00b7 " + tag + "</div><b>" + money(b.equity) + "</b>" +
        '<div class="m">Cash ' + money(b.cash) + " \u00b7 " + (b.names || []).length + " names</div>" +
        '<div class="ov-names">' + list + "</div></button>";
    }).join("");
  }
  function fillOverlay(el, title, ids) {
    if (!el) return;
    var head = el.querySelector(".books-head h2");
    if (head) head.textContent = title;
    var grid = el.querySelector(".ov-grid");
    if (grid) grid.innerHTML = overlayRows(ids);
  }

  var prevPaint = paint;
  paint = function () {
    prevPaint();
    if (!snap || tab !== "combined") return;
    var desk = document.getElementById("desk");
    if (!desk) return;
    fillOverlay(document.getElementById("booksOverlay"), "Live equity \u00b7 Robinhood", LIVE_IDS);
    if (!document.getElementById("booksOverlayAll")) {
      desk.insertAdjacentHTML("beforeend",
        '<div class="books-overlay" id="booksOverlayAll" hidden>' +
        '<div class="books-sheet" role="dialog" aria-label="Overall books">' +
        '<div class="books-head"><h2 style="margin:0">Overall equity \u00b7 all books</h2>' +
        '<button type="button" class="ov-close" data-close-books="1">Close</button></div>' +
        '<div class="ov-grid"></div></div></div>');
    }
    fillOverlay(document.getElementById("booksOverlayAll"), "Overall equity \u00b7 all books", IDS);
    var ovCard = desk.querySelector("[data-open-all-books]");
    if (!ovCard) {
      var oh = desk.querySelector("h2.overall-eq");
      if (oh && oh.nextElementSibling) ovCard = oh.nextElementSibling;
    }
    if (ovCard) {
      ovCard.setAttribute("data-open-all-books", "1");
      ovCard.classList.add("tape-open");
    }
  };

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-open-all-books]")) {
      overlayOpen = true;
      if (typeof overlayWhich !== "undefined") overlayWhich = "all";
      var all = document.getElementById("booksOverlayAll");
      var live = document.getElementById("booksOverlay");
      if (live) { live.classList.remove("on"); live.setAttribute("hidden", ""); }
      if (all) { all.classList.add("on"); all.removeAttribute("hidden"); }
      document.body.style.overflow = "hidden";
      return;
    }
    if (e.target.closest("[data-open-books]")) {
      if (typeof overlayWhich !== "undefined") overlayWhich = "live";
      var all2 = document.getElementById("booksOverlayAll");
      if (all2) { all2.classList.remove("on"); all2.setAttribute("hidden", ""); }
    }
    if (e.target.id === "booksOverlayAll" || e.target.closest("[data-close-books]")) {
      var all3 = document.getElementById("booksOverlayAll");
      if (all3) { all3.classList.remove("on"); all3.setAttribute("hidden", ""); }
    }
  });

  if (typeof load === "function") load();
})();
