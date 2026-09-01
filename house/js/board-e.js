function paintIndexes(data) {
  if (!data) return;
  [["spx", data.spx], ["ndx", data.ndx]].forEach(function (pair) {
    var node = document.querySelector('[data-idx="' + pair[0] + '"]');
    var q = pair[1];
    if (!node || !q || q.last == null) return;
    var last = Number(q.last);
    node.querySelector("b").textContent = last.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var pct = q.pct != null ? Number(q.pct) : (q.prev ? ((last - Number(q.prev)) / Number(q.prev)) * 100 : 0);
    node.classList.toggle("up", pct > 0.005);
    node.classList.toggle("down", pct < -0.005);
    node.title = (q.label || pair[0].toUpperCase()) + " " + last.toFixed(2) + (pct ? " (" + (pct > 0 ? "+" : "") + pct.toFixed(2) + "%)" : "");
  });
}
function loadIndexes() {
  var housePath = /\/house(\/|$)/.test(location.pathname);
  fetch((housePath ? "indexes.json" : "house/indexes.json") + "?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(paintIndexes)
    .catch(function () {});
}
(function () {
  var prev = load;
  load = function () {
    if (typeof prev === "function") prev();
    loadIndexes();
  };
  loadIndexes();
})();
