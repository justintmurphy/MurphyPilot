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
          { id: "historical", label: "Historical", href: "/#historical" }
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

  var section = /^\/investments(\/|$)/.test(location.pathname) ? "investments" : "banking";
  var h0 = (location.hash || "").replace(/^#/, "");
  if (section === "banking" && h0 && BANKING_HASHES.indexOf(h0) < 0) {
    location.replace("/investments/" + (location.search || "") + (h0 === "combined" ? "#house" : location.hash));
    return;
  }
  if (section === "investments" && BANKING_HASHES.indexOf(h0) >= 0) {
    location.replace("/" + (location.search || "") + location.hash);
    return;
  }
  if (location.pathname === "/investments") {
    try { history.replaceState(history.state, "", "/investments/" + (location.search || "") + (location.hash || "")); } catch (e) {}
  }

  var invActive = null;
  var mounted = false;

  function bankingActive() {
    var h = (location.hash || "").replace(/^#/, "");
    return BANKING_HASHES.indexOf(h) >= 0 ? h : BANKING_DEFAULT;
  }
  function itemsHtml() {
    var s = NAV.sections[section];
    var on = section === "banking" ? bankingActive() : invActive;
    return s.items.map(function (it) {
      var a = it.id === on ? ' class="on" aria-current="true"' : "";
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
    var html = '<nav class="docs-foot" aria-label="Documentation"><span>' + esc(foot.label) + "</span>" +
      foot.links.map(function (l) {
        return '<a href="' + l.href + '">' + esc(l.label) + "</a>";
      }).join("") +
      "<span>" + esc(foot.note) + "</span></nav>";
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
  function close() {
    var menu = d.getElementById("deskMenu");
    var btn = d.getElementById("menuBtn");
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
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
      return id === section
        ? '<button type="button" id="menuBtn" class="mp-top-btn on" aria-current="page" aria-haspopup="true" aria-expanded="false" aria-controls="deskMenu">' + t.label + '<span class="mp-caret" aria-hidden="true"></span></button>'
        : '<a class="mp-top-btn" href="' + t.href + '">' + t.label + "</a>";
    }).join("") + "</div>" +
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

  d.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest("#menuBtn")) { toggle(); return; }
    if (t.closest("#deskMenu [data-nav-item]") || !t.closest(".mp-nav")) close();
    if (section === "banking" && t.closest("[data-bank-tab]")) w.setTimeout(w.MPNav.syncBanking, 0);
  });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  if (section === "banking") {
    w.addEventListener("hashchange", w.MPNav.syncBanking);
    w.addEventListener("popstate", w.MPNav.syncBanking);
  }
  w.addEventListener("pageshow", function () { close(); w.MPNav.syncBanking(); });
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", mount);
  else mount();
})(window, document);
