/* Shared list cap. Ten rows stay visible. The rest scroll inside the box. */
(function (root) {
  var MAX = 10;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function capHtml(inner, opts) {
    opts = opts || {};
    var max = opts.max || MAX;
    var count = Number(opts.count);
    if (!(count > max)) return inner || "";
    var label = opts.label || "List";
    return '<div class="list-cap" style="--list-cap-rows:' + max + '" tabindex="0" role="region" aria-label="' +
      esc(label) + '">' + (inner || "") + '</div><p class="list-cap-note">Showing ' + max + " of " + count +
      ", scroll for more</p>";
  }

  function apply(el, opts) {
    if (!el) return el;
    opts = opts || {};
    var max = opts.max || MAX;
    var rows = el.children ? el.children.length : 0;
    if (!(rows > max)) {
      if (el.classList) el.classList.remove("list-cap");
      return el;
    }
    if (el.classList) el.classList.add("list-cap");
    el.setAttribute("tabindex", "0");
    if (!el.getAttribute("role")) el.setAttribute("role", "region");
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", opts.label || "List");
    el.style.setProperty("--list-cap-rows", String(max));
    return el;
  }

  root.MPListCap = { apply: apply, capHtml: capHtml, max: MAX };
})(typeof window !== "undefined" ? window : this);
