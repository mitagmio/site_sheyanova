/*! Before/After: show light back-to-top control once the 2nd pair is in view. */
(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    if (!document.body || !document.body.classList.contains('content_page')) return;

    var pairs = document.querySelectorAll(
      '#content_page_wrapper ._4ORMAT_module_comparison_slider_01, #content_page_wrapper .format_comparison_slider'
    );
    if (pairs.length < 2) return;

    var second = pairs[1];
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ba-back-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(btn);

    function thresholdY() {
      var rect = second.getBoundingClientRect();
      return window.scrollY + rect.top;
    }

    function update() {
      // Visible once the page has scrolled to (or past) the start of the 2nd BA block.
      var show = window.scrollY + 8 >= thresholdY() - window.innerHeight * 0.15;
      btn.classList.toggle('is-visible', show);
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        update();
      });
    }

    btn.addEventListener('click', function () {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  });
})();
