/* Format-compatible mobile burger: [data-toggle-nav] ↔ [data-mobile-nav].show + body.menu-is-visible.
   Safe alongside panorama theme.js / theme.js (idempotent; skips if already bound). */
(function () {
  var BOUND = "data-mobile-nav-bound";

  function headerEl() {
    return document.getElementById("themeHeader") || document.querySelector(".theme_header");
  }

  function positionNav(nav) {
    var header = headerEl();
    var h = header ? header.offsetHeight : 0;
    nav.style.top = Math.max(h - 2, 0) + "px";
  }

  function setOpen(btn, nav, open) {
    btn.classList.toggle("show", open);
    nav.classList.toggle("show", open);
    document.body.classList.toggle("menu-is-visible", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    nav.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function bind() {
    var btn = document.querySelector("[data-toggle-nav]");
    var nav = document.querySelector("[data-mobile-nav]");
    if (!btn || !nav) return;
    if (btn.getAttribute(BOUND) === "1") return;
    btn.setAttribute(BOUND, "1");

    positionNav(nav);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      setOpen(btn, nav, !btn.classList.contains("show"));
    });

    nav.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a || !nav.contains(a)) return;
      setOpen(btn, nav, false);
    });

    window.addEventListener("resize", function () {
      positionNav(nav);
      if (window.innerWidth >= 768) setOpen(btn, nav, false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
