(function (w, d) {
  "use strict";
  var BANKING_HASHES = ["budget", "current", "historical", "edits"];
  var BANKING_DEFAULT = "budget";
  var NAV = {
    order: ["banking", "investments"],
    sections: {
      banking: {
        label: "BANKING",
        href: "/",
        themeInMenu: false,
        items: [
          { id: "budget", label: "Budget", href: "/#budget" },
          { id: "current", label: "Current", href: "/#current" },
          { id: "historical", label: "Historical", href: "/#historical" },
          { id: "pay", label: "Pay", href: "/pay/" },
          { id: "taxes", label: "Taxes", href: "/taxes/" }
        ]
      },
      investments: {
        label: "INVESTMENTS",
        href: "/investments/",
        themeInMenu: true,
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

  function forwardFor(pathname, hash, search) {
    var sec = /^\/investments(\/|$)/.test(pathname) ? "investments" : "banking";
    var h = (hash || "").replace(/^#/, "");
    var bankId = bankingHashId(hash);
    if (sec === "banking" && h && !bankId) {
      return "/investments/" + (search || "") + (h === "combined" ? "#house" : hash);
    }
    if (sec === "investments" && bankId) {
      return "/" + (search || "") + hash;
    }
    return "";
  }
  var section = /^\/investments(\/|$)/.test(location.pathname) ? "investments" : "banking";
  var hopped = forwardFor(location.pathname, location.hash, location.search);
  if (hopped) { location.replace(hopped); return; }
  if (location.pathname === "/investments") {
    try { history.replaceState(history.state, "", "/investments/" + (location.search || "") + (location.hash || "")); } catch (e) {}
  }

  var invActive = null;
  var mounted = false;

  function bankingHashId(hash) {
    var h = String(hash || "").replace(/^#/, "");
    if (h === "budget" || h === "current" || h === "edits") return h;
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
  function themeSwitchHtml() {
    return '<div class="theme-switch" role="group" aria-label="Looks">' +
      '<button type="button" data-theme-choice="justin">Justin</button>' +
      '<button type="button" data-theme-choice="nina">Nina</button></div>';
  }
  function syncThemeButtons() {
    var t = "justin";
    try { t = d.documentElement.getAttribute("data-theme") || "justin"; } catch (e) {}
    if (t === "nina" || t === "purple") t = "nina";
    else t = "justin";
    var buttons = d.querySelectorAll("#deskMenu [data-theme-choice]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle("on", buttons[i].getAttribute("data-theme-choice") === t);
    }
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
      note + "</nav>";
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
      '<div id="deskMenu" class="desk-menu mp-menu" hidden><nav id="tabs" aria-label="Section pages">' + itemsHtml() + "</nav>" +
      (NAV.sections[section].themeInMenu ? themeSwitchHtml() : "") + "</div>";
    mountFoot();
    mountTicker();
    syncThemeButtons();
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

  function applyTheme(choice) {
    var t = choice === "nina" || choice === "purple" ? "nina" : "justin";
    try { d.documentElement.setAttribute("data-theme", t); } catch (e) {}
    try { w.localStorage.setItem("murphyPilotTheme", t); } catch (e2) {}
    try {
      var buttons = d.querySelectorAll("[data-theme-choice]");
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.toggle("on", buttons[i].getAttribute("data-theme-choice") === t);
      }
      var meta = d.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", t === "nina" ? "#1A0A24" : "#08090B");
    } catch (e3) {}
  }
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
    if (themeBtn && typeof themeBtn.getAttribute === "function") {
      var choice = themeBtn.getAttribute("data-theme-choice");
      if (choice) { applyTheme(choice); return; }
    }
    if (t.closest("#menuBtn")) { toggle(); return; }
    if (t.closest("#deskMenu [data-nav-item]") || !t.closest(".mp-nav")) close();
    if (section === "banking" && t.closest("[data-bank-tab]")) w.setTimeout(w.MPNav.syncBanking, 0);
  });
  d.addEventListener("keydown", function (e) { if (e && e.key === "Escape") close(true); });
  function onLocationChange() {
    var dest = forwardFor(location.pathname, location.hash, location.search);
    if (dest) { location.replace(dest); return; }
    if (section === "banking" && w.MPNav) w.MPNav.syncBanking();
  }
  w.addEventListener("hashchange", onLocationChange);
  w.addEventListener("popstate", onLocationChange);
  w.addEventListener("pageshow", function () { close(); w.MPNav.syncBanking(); });
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { mount(); startClock(); });
  else { mount(); startClock(); }
})(window, document);
