/*! Panorama (Beauty / editorial): page from the photo in the viewport center.
   Strip is real gallery_image photos only — no side spacers / empty frames.
   Wheel stays continuous (gallery-wheel.js). Lookbook overlay is owned by lookbook.js. */
(function () {
  var ANIM_MS = 550;
  var origLoadSlide = window.loadSlideAtIndex;
  var origMoveSlider = window.moveSlider;
  var paging = false;
  var targetIndex = 0;
  var hashTimer = null;
  var bound = false;
  var userPaged = false;

  function lookbookPage() {
    return document.body && document.body.classList.contains('lookbook');
  }

  function lookbookOpen() {
    return document.body && document.body.classList.contains('lookbook-open');
  }

  function galleryPage() {
    var body = document.body;
    return body && body.classList.contains('gallery') && !lookbookPage();
  }

  function assets() {
    return document.querySelectorAll('#assets_wrap .asset.image, #assets .asset.image');
  }

  function stripSpacers() {
    var wrap = document.getElementById('assets_wrap') || document.getElementById('assets');
    if (!wrap) return;
    wrap.querySelectorAll('.gallery-center-spacer, .lookbook-spacer-start, .lookbook-spacer-end').forEach(function (el) {
      el.parentNode.removeChild(el);
    });
    wrap.style.paddingLeft = '';
    wrap.style.paddingRight = '';
  }

  function scrollRoot() {
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

  function getScrollLeft() {
    return scrollRoot().scrollLeft;
  }

  function nearestIndex() {
    var list = assets();
    if (!list.length) return 0;
    var mid = window.innerWidth / 2;
    var best = 0;
    var bestDist = Infinity;
    for (var i = 0; i < list.length; i++) {
      var r = list[i].getBoundingClientRect();
      var c = r.left + r.width / 2;
      var dist = Math.abs(c - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  function currentIndex() {
    return paging ? targetIndex : nearestIndex();
  }

  function clampIndex(index, list) {
    return Math.max(0, Math.min(index, list.length - 1));
  }

  function centerLeftFor(el) {
    var r = el.getBoundingClientRect();
    var elMid = r.left + r.width / 2;
    var viewMid = window.innerWidth / 2;
    return getScrollLeft() + (elMid - viewMid);
  }

  function maxScroll() {
    var root = scrollRoot();
    return Math.max(0, root.scrollWidth - root.clientWidth);
  }

  function clampScroll(left) {
    return Math.max(0, Math.min(left, maxScroll()));
  }

  /* Center the photo when the strip allows it. First frame clamps to start;
     last frame clamps to end — never invent empty columns to fake a center. */
  function scrollTargetFor(index, list) {
    if (index <= 0) {
      var firstCenter = centerLeftFor(list[0]);
      return firstCenter < 1 ? 0 : clampScroll(firstCenter);
    }
    if (index >= list.length - 1) {
      var lastCenter = centerLeftFor(list[list.length - 1]);
      var end = maxScroll();
      return lastCenter > end - 1 ? end : clampScroll(lastCenter);
    }
    return clampScroll(centerLeftFor(list[index]));
  }

  function syncHash(index) {
    try {
      history.replaceState(null, null, '#' + index);
    } catch (e) {}
    try {
      activeSlideIndex = index;
    } catch (e2) {}
    targetIndex = index;
  }

  function markActive(index) {
    var list = assets();
    for (var i = 0; i < list.length; i++) {
      list[i].classList.toggle('active', i === index);
    }
  }

  function setScrollLeft(left) {
    left = clampScroll(left);
    var root = scrollRoot();
    root.scrollLeft = left;
    if (document.body !== root) document.body.scrollLeft = left;
    var html = document.documentElement;
    if (html !== root) html.scrollLeft = left;
  }

  function scrollToLeft(left, instant, done) {
    left = clampScroll(left);
    var from = getScrollLeft();
    if (instant || Math.abs(from - left) < 1.5) {
      paging = false;
      if (window.jQuery) {
        try {
          window.jQuery('body, html').stop(true, true);
        } catch (e) {}
      }
      setScrollLeft(left);
      if (done) done();
      return;
    }
    paging = true;
    if (window.jQuery) {
      window.jQuery(scrollRoot()).stop(true).animate({ scrollLeft: left }, ANIM_MS, 'swing', function () {
        setScrollLeft(left);
        paging = false;
        if (done) done();
      });
      return;
    }
    setScrollLeft(left);
    paging = false;
    if (done) done();
  }

  function settle(index) {
    var n = nearestIndex();
    if (typeof index === 'number' && Math.abs(n - index) > 1) n = index;
    markActive(n);
    syncHash(n);
  }

  function goTo(index, instant) {
    if (!galleryPage() || lookbookOpen()) return;
    var list = assets();
    if (!list.length) return;
    index = clampIndex(index, list);
    targetIndex = index;
    markActive(index);
    var left = scrollTargetFor(index, list);
    scrollToLeft(left, instant, function () {
      var list2 = assets();
      if (list2[index]) setScrollLeft(scrollTargetFor(index, list2));
      settle(index);
    });
  }

  function step(delta) {
    userPaged = true;
    if (typeof slideWithDrag !== 'undefined') slideWithDrag = false;
    goTo(currentIndex() + delta, false);
  }

  function skipThemeClick(e) {
    var t = e.target;
    if (!t || !t.closest) return true;
    if (t.closest('form') || t.closest('a') || t.closest('.theme_header') || t.closest('#menu')) return true;
    if (t.classList && (t.classList.contains('image_text') || t.classList.contains('image_text_container'))) return true;
    if (t.closest('.image_text_container')) return true;
    return false;
  }

  window.loadSlideAtIndex = function (n) {
    if (lookbookPage()) {
      if (typeof origLoadSlide === 'function') return origLoadSlide(n);
      return;
    }
    if (!galleryPage()) {
      if (typeof origLoadSlide === 'function') return origLoadSlide(n);
      return;
    }
    if (isNaN(n)) n = 0;
    goTo(n, true);
  };

  window.moveSlider = function (n, t) {
    if (lookbookPage()) {
      if (typeof origMoveSlider === 'function') return origMoveSlider(n, t);
      return;
    }
    if (!galleryPage()) {
      if (typeof origMoveSlider === 'function') return origMoveSlider(n, t);
      return;
    }
    goTo(n, t === 0);
  };

  function bind() {
    if (bound || lookbookPage() || !galleryPage()) return;
    bound = true;
    stripSpacers();

    document.addEventListener(
      'keydown',
      function (e) {
        if (!galleryPage() || lookbookOpen()) return;
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        step(e.key === 'ArrowLeft' ? -1 : 1);
      },
      true
    );

    document.addEventListener(
      'click',
      function (e) {
        if (!galleryPage() || lookbookOpen()) return;
        var content = document.getElementById('content');
        if (!content || !content.contains(e.target)) return;
        if (skipThemeClick(e)) return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        var x = e.clientX;
        if (x < window.innerWidth / 2) step(-1);
        else step(1);
      },
      true
    );

    document.addEventListener(
      'mousemove',
      function (e) {
        if (!galleryPage() || lookbookOpen()) return;
        var content = document.getElementById('content');
        if (!content) return;
        var n = currentIndex();
        var last = assets().length - 1;
        var left = e.clientX < window.innerWidth / 2;
        content.classList.toggle('cursor_left', left && n > 0);
        content.classList.toggle('cursor_right', !left && n < last);
      },
      true
    );

    function onScroll() {
      if (!galleryPage() || lookbookOpen() || paging) return;
      var n = nearestIndex();
      markActive(n);
      clearTimeout(hashTimer);
      hashTimer = setTimeout(function () {
        if (paging) return;
        settle();
      }, 120);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    if (document.body) document.body.addEventListener('scroll', onScroll, { passive: true });

    window.addEventListener(
      'wheel',
      function (e) {
        if (!galleryPage() || lookbookOpen()) return;
        if (Math.abs(e.deltaY || 0) < 6 && Math.abs(e.deltaX || 0) < 6) return;
        userPaged = true;
      },
      { capture: true, passive: true }
    );

    window.addEventListener('resize', function () {
      if (!galleryPage() || lookbookOpen()) return;
      goTo(currentIndex(), true);
    });

    var hash = location.hash.match(/^#(\d+)$/);
    var start = hash ? parseInt(hash[1], 10) : 0;
    requestAnimationFrame(function () {
      stripSpacers();
      goTo(start, true);
      requestAnimationFrame(function () {
        goTo(start, true);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
  window.addEventListener('load', function () {
    if (lookbookPage() || !galleryPage()) return;
    var hash = location.hash.match(/^#(\d+)$/);
    function recenter() {
      if (lookbookPage() || !galleryPage() || userPaged) return;
      stripSpacers();
      var start = hash ? parseInt(hash[1], 10) : 0;
      goTo(start, true);
    }
    recenter();
    setTimeout(recenter, 80);
    setTimeout(recenter, 280);
  });
})();
