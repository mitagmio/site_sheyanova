/*! Always map vertical wheel → horizontal gallery scroll (Format only did this for html.win). */
(function () {
  function scrollRoot() {
    return document.scrollingElement || document.documentElement;
  }

  function onWheel(e) {
    if (!document.body || !document.body.classList.contains('gallery')) return;
    var dy = e.deltaY || 0;
    var dx = e.deltaX || 0;
    if (Math.abs(dy) < Math.abs(dx)) return; // native horizontal gesture
    if (!dy) return;
    var root = scrollRoot();
    // Prefer scrolling the element that actually overflows
    var target = root;
    if (root.scrollWidth <= root.clientWidth + 1) {
      if (document.body.scrollWidth > document.body.clientWidth + 1) {
        target = document.body;
      } else if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
        target = document.documentElement;
      }
    }
    target.scrollLeft += dy;
    e.preventDefault();
  }

  function bind() {
    // Capture so it wins over passive listeners / nested handlers
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
