/* Shared list cap. Ten rows stay visible. The rest scroll inside the box.
   Height is the 10th row's offsetTop + offsetHeight. CSS max-height is the fallback. */
(function (root) {
  var MAX = 10;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function noteText(max, count) {
    return "Showing " + max + " of " + count + ", scroll for more";
  }

  function capHtml(inner, opts) {
    opts = opts || {};
    var max = opts.max || MAX;
    var count = Number(opts.count);
    if (!(count > max)) return inner || "";
    if (String(inner || "").indexOf("list-cap") >= 0) return inner || "";
    var label = opts.label || "List";
    return '<div class="list-cap" style="--list-cap-rows:' + max + '" tabindex="0" role="region" aria-label="' +
      esc(label) + '">' + (inner || "") + '</div><p class="list-cap-note">' + noteText(max, count) + "</p>";
  }

  function listRows(el) {
    if (!el) return [];
    var tag = String(el.tagName || "").toUpperCase();
    function kids(node) {
      return node && node.children ? Array.prototype.slice.call(node.children) : [];
    }
    if (tag === "TABLE") {
      var body = el.tBodies && el.tBodies[0];
      return kids(body || el).filter(function (n) { return String(n.tagName || "").toUpperCase() === "TR"; });
    }
    if (tag === "OL" || tag === "UL" || tag === "TBODY") {
      return kids(el).filter(function (n) {
        var t = String(n.tagName || "").toUpperCase();
        return t === "LI" || t === "TR";
      });
    }
    var inner = el.querySelector ? (el.querySelector("tbody") || el.querySelector("ol, ul")) : null;
    if (inner) return listRows(inner);
    return kids(el).filter(function (n) {
      var t = String(n.tagName || "").toUpperCase();
      return t === "LI" || t === "TR";
    });
  }

  /* Bottom of the row measured against the cap, not the page. */
  function rowEnd(row, list) {
    if (row && list && typeof row.getBoundingClientRect === "function" && typeof list.getBoundingClientRect === "function") {
      var rowBox = row.getBoundingClientRect();
      var listBox = list.getBoundingClientRect();
      var boxHeight = rowBox.height || Number(row.offsetHeight) || 0;
      if (boxHeight > 0 || rowBox.top || rowBox.bottom) {
        return (rowBox.bottom - listBox.top) + (Number(list.scrollTop) || 0);
      }
    }
    var top = Number(row && row.offsetTop) || 0;
    var height = Number(row && row.offsetHeight) || 0;
    var node = row && row.offsetParent;
    var guard = 0;
    while (node && node !== list && guard < 8) {
      if (list && typeof list.contains === "function" && !list.contains(node)) break;
      top += Number(node.offsetTop) || 0;
      node = node.offsetParent;
      guard += 1;
    }
    return top + height;
  }

  function readMax(el, fallback) {
    var raw = "";
    if (el && el.style && el.style.getPropertyValue) raw = el.style.getPropertyValue("--list-cap-rows") || "";
    if (!raw && el && el.getAttribute) {
      var style = el.getAttribute("style") || "";
      var m = String(style).match(/--list-cap-rows\s*:\s*(\d+)/);
      if (m) raw = m[1];
    }
    var n = Number(raw || fallback || MAX);
    return n > 0 ? n : MAX;
  }

  function measure(el, max) {
    if (!el) return 0;
    max = max || readMax(el, MAX);
    var rows = listRows(el);
    if (!(rows.length > max)) {
      if (el.style) el.style.maxHeight = "";
      if (el.removeAttribute) el.removeAttribute("data-list-cap-measured");
      return 0;
    }
    var end = rowEnd(rows[max - 1], el);
    if (!(end > 0)) return 0;
    if (el.style) el.style.maxHeight = end + "px";
    if (el.setAttribute) el.setAttribute("data-list-cap-measured", "1");
    return end;
  }

  function watch(el, max) {
    if (!el || el._mpListCapWatch) return;
    el._mpListCapWatch = true;
    var run = function () { measure(el, max); };
    if (typeof ResizeObserver === "function") {
      try {
        var ro = new ResizeObserver(run);
        ro.observe(el);
        listRows(el).forEach(function (row) {
          try { ro.observe(row); } catch (e) {}
        });
      } catch (e2) {}
    }
    var win = typeof window !== "undefined" ? window : root;
    if (win && win.addEventListener) win.addEventListener("resize", run);
    if (el.addEventListener) {
      el.addEventListener("toggle", run, true);
      el.addEventListener("click", function (e) {
        var t = e && e.target;
        var hit = t && t.closest && (t.closest("details") || t.closest("[aria-expanded]"));
        if (hit) run();
      });
    }
  }

  function capOwner(el) {
    var node = el && el.parentElement;
    while (node) {
      if (node.classList && node.classList.contains("list-cap")) return node;
      node = node.parentElement;
    }
    return null;
  }

  function apply(el, opts) {
    if (!el) return el;
    opts = opts || {};
    if (capOwner(el)) return el;
    if (el.querySelector && el.querySelector(".list-cap")) return el;
    var max = opts.max || MAX;
    var rows = listRows(el);
    var count = rows.length || (el.children ? el.children.length : 0);
    if (!(count > max)) {
      if (el.classList) el.classList.remove("list-cap");
      if (el.style) el.style.maxHeight = "";
      return el;
    }
    if (el.classList) el.classList.add("list-cap");
    el.setAttribute("tabindex", "0");
    if (!el.getAttribute("role")) el.setAttribute("role", "region");
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", opts.label || "List");
    if (el.style && el.style.setProperty) el.style.setProperty("--list-cap-rows", String(max));
    measure(el, max);
    watch(el, max);
    return el;
  }

  /* One cap per list. A list already inside a cap, or one that wraps a cap, stays as it is. */
  function refresh(scope) {
    if (!scope || !scope.querySelectorAll) return;
    var nodes = scope.querySelectorAll(".list-cap");
    Array.prototype.forEach.call(nodes, function (el) {
      if (capOwner(el)) {
        if (el.classList) el.classList.remove("list-cap");
        if (el.style) el.style.maxHeight = "";
        return;
      }
      var rows = listRows(el);
      var max = readMax(el, MAX);
      if (rows.length > max) {
        measure(el, max);
        watch(el, max);
      }
    });
  }

  root.MPListCap = {
    apply: apply,
    capHtml: capHtml,
    measure: measure,
    refresh: refresh,
    max: MAX,
    note: noteText
  };
})(typeof window !== "undefined" ? window : this);
