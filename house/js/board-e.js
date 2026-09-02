(function () {
  if (typeof splitClockCal === "function") {
    var prevSplit = splitClockCal;
    splitClockCal = function () {
      var html = prevSplit();
      if (html.indexOf("overnightPack") < 0) html = '<div id="overnightPack"></div>' + html;
      return html;
    };
  }
})();
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
function safeEsc(s) {
  if (typeof esc === "function") return esc(s);
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
  });
}
var PACK = null;
function packHtml() {
  if (!PACK) return "";
  var items = PACK.items || [];
  function rowsFor(tag) {
    return items.filter(function (i) {
      return String(i.tag || "").toLowerCase().indexOf(tag) >= 0;
    }).map(function (i) {
      var title = safeEsc(i.title || "");
      var link = i.url ? "<a href=\"" + safeEsc(i.url) + "\" target=\"_blank\" rel=\"noopener\">" + title + "</a>" : title;
      return "<div class=\"pack-row\"><b>" + link + "</b><span>" + safeEsc(i.text || "") + "</span></div>";
    }).join("");
  }
  var wh = rowsFor("white");
  var cal = rowsFor("calendar");
  var other = items.filter(function (i) {
    var t = String(i.tag || "").toLowerCase();
    return t.indexOf("white") < 0 && t.indexOf("calendar") < 0;
  }).map(function (i) {
    var title = safeEsc(i.title || "");
    var link = i.url ? "<a href=\"" + safeEsc(i.url) + "\" target=\"_blank\" rel=\"noopener\">" + title + "</a>" : title;
    return "<div class=\"pack-row\"><b>" + link + "</b><span>" + safeEsc(i.text || i.tag || "") + "</span></div>";
  }).join("");
  var rows = (wh ? "<p class=\"hint\">White House</p>" + wh : "") +
    (cal ? "<p class=\"hint\">Coming official prints</p>" + cal : "") +
    other;
  return "<h2>Overnight pack</h2><div class=\"card pack-card\">" +
    "<p class=\"hint\">" + safeEsc(PACK.subject || "Agentic policy pack") +
    (PACK.asof ? " \u00b7 " + safeEsc(PACK.asof) : "") +
    (PACK.expiry ? " \u00b7 expires " + safeEsc(PACK.expiry) : "") + "</p>" +
    "<div class=\"pack-scroll\">" +
    (rows || "<p class=\"hint\" style=\"margin:0\">No pack items.</p>") +
    "</div>" +
    (PACK.sectors ? "<p class=\"hint\">Sectors \u00b7 " + safeEsc(PACK.sectors) + "</p>" : "") +
    "</div>";
}
function injectPack() {
  var desk = document.getElementById("desk");
  if (!desk || !PACK) return;
  var html = packHtml();
  var box = document.getElementById("overnightPack");
  if (!box) {
    box = document.createElement("div");
    box.id = "overnightPack";
  }
  box.innerHTML = html;
  var clock = Array.from(desk.querySelectorAll("h2")).filter(function (h) {
    return String(h.textContent || "").indexOf("Weekday clock") === 0;
  })[0];
  if (clock) desk.insertBefore(box, clock);
  else if (!box.parentNode) desk.appendChild(box);
}
function loadIndexes() {
  var housePath = /\/house(\/|$)/.test(location.pathname);
  fetch((housePath ? "indexes.json" : "house/indexes.json") + "?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(paintIndexes)
    .catch(function () {});
}
function loadPack() {
  var housePath = /\/house(\/|$)/.test(location.pathname);
  fetch((housePath ? "policy-pack.json" : "house/policy-pack.json") + "?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      PACK = data;
      injectPack();
    })
    .catch(function () {});
}
(function () {
  var prevLoad = load;
  var prevPaint = paint;
  load = function () {
    if (typeof prevLoad === "function") prevLoad();
    loadIndexes();
    loadPack();
  };
  paint = function () {
    if (typeof prevPaint === "function") prevPaint();
    injectPack();
  };
  loadIndexes();
  loadPack();
  setTimeout(injectPack, 400);
  setTimeout(injectPack, 1600);
  setInterval(loadPack, 5 * 60 * 1000);
})();
