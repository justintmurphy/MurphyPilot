      '<p class="hint">Cash ' + money(book.cash) + " \u00b7 pending already in " + money(book.pending_deposits) +
      " \u00b7 orders " + book.open_orders + " \u00b7 " + esc(formatAsof(snap.asof)) + "</p></div>";

    var title = tab === "combined" ? "House" : ACCOUNT_LABEL[tab];
    html += "<h2>Live equity \u00b7 " + esc(title) + "</h2>" + tapeBoard(printsFor(snap, tab), title);
    html += "<h2>Mix</h2>" + mixHtml(book, tab);
    html += "<h2>Book</h2>" + bookTable(book, tab === "combined");
    html += '<details class="tools"><summary>Update from a snapshot</summary><div class="card">' +
      '<p class="hint" style="margin-top:0">This board does not log into Robinhood. On GitHub Pages it loads house-snapshot.json. You can also paste JSON. Saved only in this browser.</p>' +
      "<label>Snapshot URL</label><input id=\"fUrl\" placeholder=\"house-snapshot.json\">" +
      '<p class="hint">Fetches on save, and every 5 minutes when auto-fetch is on.</p>' +
      '<button type="button" class="act" id="mailBtn">Reload local snapshot</button>' +
      '<button type="button" class="act" id="urlBtn">Save URL and fetch now</button>' +
      '<label class="check"><input type="checkbox" id="autoBox"> Auto-fetch URL every 5 minutes</label>' +
      "<label>Or paste House snapshot JSON</label><textarea id=\"fJson\"></textarea>" +
      '<button type="button" class="act" id="jsonBtn">Load snapshot JSON</button>' +
      '<button type="button" class="act ghost" id="resetBtn">Reset</button>' +
      (status ? '<p class="hint" id="statusLine">' + esc(status) + "</p>" : "") +
      "</div></details>" +
      '<footer class="desk-foot">Murphy Pilot \u00b7 House books are data only. Agentic is the trading book. Does not log into Robinhood.</footer>';
    document.getElementById("desk").innerHTML = html;
    var urlEl = document.getElementById("fUrl");
    if (urlEl) urlEl.value = url;
    var autoEl = document.getElementById("autoBox");
    if (autoEl) autoEl.checked = auto;
    var jsonEl = document.getElementById("fJson");
    if (jsonEl) jsonEl.value = paste;
  }

  function hostedPull() {
    if (typeof google === "undefined" || !google.script || !google.script.run) return false;
    return false;
  }

  function loadJson(raw) {
    if (!isHouse(raw)) {
      status = "Need a House snapshot with individual, auto_grok, joint, and combined.";
      paintDesk();
      return false;
    }
    snap = withTape(raw, snap.tape);
    try { localStorage.setItem(STATE_KEY, JSON.stringify(snap)); } catch (e) {}
    status = "Loaded " + formatAsof(raw.asof);
    paintDesk();
    return true;
  }
  function fetchUrl(target) {
    var u = String(target || "").trim();
    if (!u) return;
    status = "Fetching\u2026";
    paintDesk();
    fetch(u).then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    }).then(function (json) { loadJson(json); }).catch(function () {
      status = "Could not fetch that URL. On GitHub Pages use house-snapshot.json.";
      paintDesk();
    });
  }

  document.addEventListener("click", function (e) {
    var themeBtn = e.target.closest("[data-theme-choice]");
    if (themeBtn) { applyTheme(themeBtn.getAttribute("data-theme-choice")); return; }
    var tabBtn = e.target.closest("[data-tab]");
    if (tabBtn) { tab = tabBtn.getAttribute("data-tab"); try { history.replaceState(null, "", "#" + (tab==="combined"?"house":tab)); } catch (err) {} paintDesk(); return; }
    var tapeRow = e.target.closest("[data-tape-i]");
    if (tapeRow) { tapeSel[tab] = Number(tapeRow.getAttribute("data-tape-i")); paintDesk(); return; }
    var hit = e.target.closest("circle.tape-hit");
    if (hit) {
      var idx = Number(hit.getAttribute("data-i"));
      var prints = printsFor(snap, tab);
      tapeSel[tab] = prints.length === 1 ? 0 : idx;
      paintDesk();
      return;
    }
    if (e.target.id === "mailBtn") { localFilePull(); return; }
    if (e.target.id === "urlBtn") {
      url = document.getElementById("fUrl").value;
      try { localStorage.setItem(URL_KEY, url); } catch (err) {}
      fetchUrl(url);
      return;
    }
    if (e.target.id === "jsonBtn") {
      paste = document.getElementById("fJson").value;
      try { loadJson(JSON.parse(paste)); } catch (err) { status = "JSON did not parse."; paintDesk(); }
      return;
    }
    if (e.target.id === "resetBtn") {
      snap = withTape(SEED);
      try { localStorage.removeItem(STATE_KEY); } catch (err) {}
      status = "Reset.";
      paintDesk();
      localFilePull();
    }
  });
  document.addEventListener("change", function (e) {
    if (e.target.id === "autoBox") {
      auto = e.target.checked;
      try { localStorage.setItem(AUTO_KEY, auto ? "1" : "0"); } catch (err) {}
    }
    if (e.target.id === "fUrl") url = e.target.value;
    if (e.target.id === "fJson") paste = e.target.value;
  });
  document.addEventListener("toggle", function (e) {
    if (e.target.classList && e.target.classList.contains("tape-more")) tapeOpen = e.target.open;
  }, true);

  applyTheme(readTheme());
  try {
    var saved = localStorage.getItem(STATE_KEY);
    if (saved) {
      var parsed = JSON.parse(saved);
      if (isHouse(parsed)) snap = withTape(parsed, SEED.tape);
    }
    url = localStorage.getItem(URL_KEY) || "";
    auto = localStorage.getItem(AUTO_KEY) !== "0";
  } catch (e) {}
  function localFilePull(){
    fetch("house-snapshot.json?t="+Date.now(),{cache:"no-store"}).then(function(res){
      if(!res.ok) throw new Error(String(res.status));
      return res.json();
    }).then(function(json){ loadJson(json); status = "GitHub house-snapshot.json"; paintDesk(); }).catch(function(){});
  }
  (function(){ var h=(location.hash||"").replace(/^#/,""); if(h==="house") tab="combined"; else if(h==="individual"||h==="auto_grok"||h==="joint"||h==="combined") tab=h; })();
  paintDesk();
  localFilePull();
  if (auto && url) fetchUrl(url);
  setInterval(function () {
    if (auto && url) fetchUrl(url);
    else localFilePull();
  }, 5 * 60 * 1000);
  function tickClock() {
    var now = etParts();
    var el = document.getElementById("clock");
    if (!el) return;
    el.querySelector(".t").textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds()) + " ET";
    el.querySelector(".d").textContent = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  }
  tickClock();
  setInterval(tickClock, 1000);
})();
