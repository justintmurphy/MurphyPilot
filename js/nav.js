(function (w, d) {
  "use strict";
  var BANKING_HASHES = ["budget", "historical", "edits"];
  var BANKING_DEFAULT = "budget";
  var NAV = {
    order: ["banking", "investments"],
    sections: {
      banking: {
        label: "BANKING",
        href: "/",
        items: [
          { id: "budget", label: "Budget", href: "/#budget" },
          { id: "historical", label: "Historical", href: "/#historical" },
          { id: "pay", label: "Pay", href: "/pay/" },
          { id: "taxes", label: "Taxes", href: "/taxes/" }
        ]
      },
      investments: {
        label: "INVESTMENTS",
        href: "/investments/",
        items: []
      }
    },
    foot: {
      label: "Docs",
      links: [
        { label: "Manual", href: "/Murphy_Pilot_Manual.html" },
        { label: "Setup", href: "/Murphy_Pilot_Setup.html" },
        { label: "Desk", href: "/Murphy_Pilot_Desk.html" }
      ],
      note: "Agentic / AI WWIII only"
    }
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function currentPath(pathname) {
    var path = String(pathname || "/").replace(/\/index\.html$/, "");
    if (path.length > 1 && path.charAt(path.length - 1) === "/") path = path.slice(0, -1);
    return path === "/current";
  }
  function forwardFor(pathname, hash, search) {
    if (currentPath(pathname)) return "/" + (search || "");
    var sec = /^\/investments(\/|$)/.test(pathname) ? "investments" : "banking";
    var h = (hash || "").replace(/^#/, "");
    /* Old Current links land on Budget. Stay on Banking and drop the hash. */
    if (h === "current") {
      if (sec === "investments") return "/" + (search || "");
      return "";
    }
    var bankId = bankingHashId(hash);
    if (sec === "banking" && h && !bankId) {
      return "/investments/" + (search || "") + (h === "combined" ? "#house" : hash);
    }
    if (sec === "investments" && bankId) {
      return "/" + (search || "") + hash;
    }
    return "";
  }
  function stripCurrentHash() {
    var h = String(location.hash || "").replace(/^#/, "");
    if (h !== "current") return;
    if (currentPath(location.pathname)) return;
    try {
      history.replaceState(history.state, "", (location.pathname || "/") + (location.search || ""));
    } catch (e) {}
    location.hash = "";
  }
  var section = /^\/investments(\/|$)/.test(location.pathname) ? "investments" : "banking";
  var hopped = forwardFor(location.pathname, location.hash, location.search);
  if (hopped) { location.replace(hopped); return; }
  if (section === "banking") stripCurrentHash();
  if (location.pathname === "/investments") {
    try { history.replaceState(history.state, "", "/investments/" + (location.search || "") + (location.hash || "")); } catch (e) {}
  }

  var invActive = null;
  var mounted = false;

  function bankingHashId(hash) {
    var h = String(hash || "").replace(/^#/, "");
    if (h === "current" || h === "budget") return "budget";
    if (h === "edits") return "edits";
    if (h === "historical" || h.indexOf("historical=") === 0) return "historical";
    return "";
  }
  function bankingPathId() {
    var path = String(location.pathname || "/").replace(/\/index\.html$/, "/");
    if (path.length > 1 && path.charAt(path.length - 1) !== "/") path += "/";
    if (path === "/pay/") return "pay";
    if (path === "/taxes/") return "taxes";
    return "";
  }
  function bankingActive() {
    return bankingPathId() || bankingHashId(location.hash) || BANKING_DEFAULT;
  }
  function itemsHtml() {
    var s = NAV.sections[section];
    var on = section === "banking" ? bankingActive() : invActive;
    return s.items.map(function (it) {
      var a = it.id === on ? ' class="on" aria-current="page"' : "";
      return section === "banking"
        ? '<a href="' + it.href + '" data-nav-item="' + esc(it.id) + '"' + a + ">" + esc(it.label) + "</a>"
        : '<button type="button" data-tab="' + esc(it.id) + '" data-nav-item="' + esc(it.id) + '"' + a + ">" + esc(it.label) + "</button>";
    }).join("");
  }
  var PICK_KEY = "murphyPilotThemePick";
  var WHO_KEY = "murphyPilotWho";
  var LEGACY_KEY = "murphyPilotTheme";
  var COLOR_JUSTIN = "#08090B";
  var COLOR_NINA = "#1A0A24";
  var whoNow = null;
  var whoReady = false;
  var pendingPick = null;

  function readStore(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStore(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }
  function knownWho(v) {
    return v === "justin" || v === "nina" ? v : null;
  }
  function knownTheme(v) {
    return v === "justin" || v === "nina" ? v : null;
  }
  function themeFor(who) {
    var pick;
    if (who === "justin" || who === "nina") {
      pick = knownTheme(readStore(PICK_KEY + ":" + who));
      return pick || who;
    }
    pick = knownTheme(readStore(PICK_KEY));
    if (pick) return pick;
    var cached = knownWho(readStore(WHO_KEY));
    if (cached) return knownTheme(readStore(PICK_KEY + ":" + cached)) || cached;
    return "justin";
  }
  function currentTheme() {
    var t = "justin";
    try { t = d.documentElement.getAttribute("data-theme") || "justin"; } catch (e) {}
    return knownTheme(t) || "justin";
  }
  function syncThemeButtons(t) {
    t = knownTheme(t) || currentTheme();
    var buttons = [];
    try { buttons = d.querySelectorAll("[data-theme-choice]"); } catch (e) { buttons = []; }
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute("data-theme-choice") === t;
      if (buttons[i].classList && buttons[i].classList.toggle) buttons[i].classList.toggle("on", on);
      if (buttons[i].setAttribute) buttons[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
  }
  function applyTheme(t) {
    t = knownTheme(t) || "justin";
    try { d.documentElement.setAttribute("data-theme", t); } catch (e) {}
    writeStore(LEGACY_KEY, t);
    try {
      var meta = d.querySelector('meta[name="theme-color"]');
      if (meta && meta.setAttribute) meta.setAttribute("content", t === "nina" ? COLOR_NINA : COLOR_JUSTIN);
    } catch (e2) {}
    syncThemeButtons(t);
  }
  function commitPick(t) {
    if (whoNow === "justin" || whoNow === "nina") writeStore(PICK_KEY + ":" + whoNow, t);
    else writeStore(PICK_KEY, t);
    applyTheme(t);
  }
  function chooseTheme(choice) {
    var t = knownTheme(choice);
    if (!t) return;
    if (!whoReady) {
      pendingPick = t;
      applyTheme(t);
      return;
    }
    commitPick(t);
  }
  function settleWho(who) {
    whoNow = who;
    whoReady = true;
    if (who === "justin" || who === "nina") writeStore(WHO_KEY, who);
    if (pendingPick) {
      var pick = pendingPick;
      pendingPick = null;
      commitPick(pick);
      return;
    }
    applyTheme(themeFor(whoNow));
  }
  function loadWho() {
    var fetcher = w.fetch;
    if (typeof fetcher !== "function") { settleWho(null); return; }
    var init = { credentials: "same-origin", cache: "no-store" };
    try {
      Promise.resolve(fetcher("/data/whoami", init)).then(function (res) {
        if (!res || res.ok !== true || typeof res.json !== "function") return Promise.reject(new Error("who"));
        return res.json();
      }).then(function (data) {
        settleWho(data && knownWho(data.who));
      }).catch(function () { settleWho(null); });
    } catch (e) { settleWho(null); }
  }
  function themeSwitchHtml() {
    var t = currentTheme();
    function btn(id, label) {
      var on = t === id;
      return '<button type="button" class="book-chip' + (on ? " on" : "") + '" data-theme-choice="' + id + '" aria-pressed="' + (on ? "true" : "false") + '">' + label + "</button>";
    }
    return '<div class="book-nav-chips" role="group" aria-label="Looks">' + btn("justin", "Justin") + btn("nina", "Nina") + "</div>";
  }
  function mountFoot() {
    if (d.querySelector("nav.docs-foot")) return;
    var main = d.querySelector("main");
    if (!main || !main.insertAdjacentHTML) return;
    var foot = NAV.foot;
    var docsHref = foot.links[0] ? foot.links[0].href : "/";
    var note = section === "investments" ? "<span>" + esc(foot.note) + "</span>" : "";
    var html = '<nav class="docs-foot" aria-label="Documentation"><a href="' + docsHref + '">' + esc(foot.label) + "</a>" +
      foot.links.map(function (l) {
        return '<a href="' + l.href + '">' + esc(l.label) + "</a>";
      }).join("") +
      note + themeSwitchHtml() + "</nav>";
    main.insertAdjacentHTML("afterend", html);
  }
  function mountTicker() {
    if (d.getElementById("mp-ticker")) return;
    var header = d.querySelector("header");
    if (!header || !header.insertAdjacentElement || !d.createElement) return;
    var slot = d.createElement("div");
    slot.id = "mp-ticker";
    slot.className = "mp-ticker-slot";
    slot.hidden = true;
    header.insertAdjacentElement("afterend", slot);
  }
  function close(returnFocus) {
    var menu = d.getElementById("deskMenu");
    var btn = d.getElementById("menuBtn");
    var wasOpen = !!(menu && !menu.hidden);
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (returnFocus && wasOpen && btn && typeof btn.focus === "function") btn.focus();
  }
  function toggle() {
    var menu = d.getElementById("deskMenu");
    var btn = d.getElementById("menuBtn");
    if (!menu) return;
    menu.hidden = !menu.hidden;
    if (btn) btn.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
  }
  function repaint() {
    var t = d.getElementById("tabs");
    if (t) t.innerHTML = itemsHtml();
  }
  function mount() {
    if (mounted) return true;
    var el = d.getElementById("mpNav");
    if (!el) return false;
    el.innerHTML = '<div class="mp-top" role="navigation" aria-label="Sections">' + NAV.order.map(function (id) {
      var t = NAV.sections[id];
      var on = id === section;
      return '<a class="mp-top-btn' + (on ? " on" : "") + '" href="' + t.href + '"' + (on ? ' aria-current="page"' : "") + ">" + t.label + "</a>";
    }).join("") +
      '<button type="button" id="menuBtn" class="mp-menu-btn" aria-haspopup="true" aria-expanded="false" aria-controls="deskMenu" aria-label="Menu"><span class="mp-caret" aria-hidden="true"></span></button></div>' +
      '<div id="deskMenu" class="desk-menu mp-menu" hidden><nav id="tabs" aria-label="Section pages">' + itemsHtml() + "</nav></div>";
    applyTheme(themeFor(knownWho(readStore(WHO_KEY))));
    mountFoot();
    mountTicker();
    syncThemeButtons();
    loadWho();
    mounted = true;
    return true;
  }

  w.MPNav = {
    section: section,
    config: NAV,
    bankingHashes: BANKING_HASHES.slice(),
    mount: mount,
    close: close,
    setItems: function (sec, items, activeId) {
      if (sec !== "investments") return;
      NAV.sections.investments.items = (items || []).map(function (i) {
        return { id: String(i.id), label: String(i.label) };
      });
      invActive = activeId || null;
      if (mount()) repaint();
    },
    syncBanking: function () { if (section === "banking") repaint(); }
  };

  function tickClock() {
    var el = d.getElementById("clock");
    if (!el || !el.querySelector) return;
    var tEl = el.querySelector(".t");
    var dEl = el.querySelector(".d");
    var now;
    try { now = new Date(); } catch (e) { return; }
    var clock = "--:--:-- ET";
    var date = "";
    try {
      clock = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).format(now) + " ET";
      date = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        weekday: "short",
        month: "short",
        day: "numeric"
      }).format(now);
    } catch (e2) {}
    if (tEl) tEl.textContent = clock;
    if (dEl) dEl.textContent = date;
    if (typeof w.mpPaintPrintAge === "function") {
      try { w.mpPaintPrintAge(); } catch (e3) {}
    }
  }
  function startClock() {
    if (!d.getElementById || !d.getElementById("clock")) return;
    tickClock();
    if (typeof w.setInterval === "function") w.setInterval(tickClock, 1e3);
  }
  d.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var themeBtn = t.closest("[data-theme-choice]");
    if (themeBtn) chooseTheme(themeBtn.getAttribute("data-theme-choice"));
    if (t.closest("#menuBtn")) { toggle(); return; }
    if (t.closest("#deskMenu [data-nav-item]") || !t.closest(".mp-nav")) close();
    if (section === "banking" && t.closest("[data-bank-tab]")) w.setTimeout(w.MPNav.syncBanking, 0);
  });
  d.addEventListener("keydown", function (e) { if (e && e.key === "Escape") close(true); });
  function onLocationChange() {
    var dest = forwardFor(location.pathname, location.hash, location.search);
    if (dest) { location.replace(dest); return; }
    if (section === "banking") stripCurrentHash();
    if (section === "banking" && w.MPNav) w.MPNav.syncBanking();
  }
  w.addEventListener("hashchange", onLocationChange);
  w.addEventListener("popstate", onLocationChange);
  w.addEventListener("pageshow", function () { close(); w.MPNav.syncBanking(); });
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { mount(); startClock(); });
  else { mount(); startClock(); }
})(window, document);
