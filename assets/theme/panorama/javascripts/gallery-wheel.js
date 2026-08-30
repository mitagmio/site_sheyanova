/*! Always map vertical wheel → horizontal gallery scroll (Format only did this for html.win).
   Lookbook overlay pages slides in lookbook.js — do not free-scroll that strip. */
(function () {
  function lookbookOverlayOpen() {
    return document.body && document.body.classList.contains('lookbook-open');
  }

  function galleryWheelEnabled() {
    var body = document.body;
    if (!body) return false;
    if (lookbookOverlayOpen()) return false;
    if (body.classList.contains('lookbook')) return false;
    return body.classList.contains('gallery');
  }

  function scrollRoot() {
    var candidates = [
      document.getElementById('assets'),
      document.querySelector('.gallery .assets'),
      document.getElementById('assets_wrap')
    ];
    var i;
    var el;
    var ox;
    for (i = 0; i < candidates.length; i++) {
      el = candidates[i];
      if (!el) continue;
      ox = window.getComputedStyle(el).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1) {
        return el;
      }
    }
    for (i = 0; i < candidates.length; i++) {
      el = candidates[i];
      if (!el) continue;
      ox = window.getComputedStyle(el).overflowX;
      if (ox === 'auto' || ox === 'scroll') return el;
    }
    var html = document.documentElement;
    var body = document.body;
    var htmlOverflow = window.getComputedStyle(html).overflowX;
    if (htmlOverflow === 'hidden' && body && body.scrollWidth > body.clientWidth + 1) {
      return body;
    }
    var se = document.scrollingElement || html;
    if (se.scrollWidth > se.clientWidth + 1) {
      var seOverflow = window.getComputedStyle(se).overflowX;
      if (seOverflow !== 'hidden') return se;
    }
    if (body && body.scrollWidth > body.clientWidth + 1) return body;
    return se;
  }

  function onWheel(e) {
    if (lookbookOverlayOpen()) return;
    if (!galleryWheelEnabled()) return;
    var dy = e.deltaY || 0;
    var dx = e.deltaX || 0;
    if (Math.abs(dy) < Math.abs(dx)) return; // native horizontal gesture
    if (!dy) return;
    var target = scrollRoot();
    target.scrollLeft += dy;
    e.preventDefault();
  }

  function bind() {
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
