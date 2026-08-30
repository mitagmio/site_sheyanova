/*! Lookbook: masonry grid + panorama overlay (not CSS Fullscreen API).
   Overlay paging is relative to the photo whose center is closest to the
   overlay midpoint — not a stale hash. Aria-hidden side spacers (not .asset)
   let the open frame sit in the viewport center, including first and last.
   Beauty / panorama keeps no spacers (gallery-center.js). */
(function () {
  var ANIM_MS = 480;
  var WHEEL_LOCK_MS = 560;
  var IDLE_MS = 2400;
  var overlay, grid, closeBtn, prevBtn, nextBtn, wrapEl;
  var activeIndex = 0;
  var targetIndex = 0;
  var lastFocus = null;
  var savedY = 0;
  var paging = false;
  var wheelLock = false;
  var idleTimer = null;
  var snapTimer = null;
  var openGen = 0;
  var origLoadSlide = window.loadSlideAtIndex;
  var origMoveSlider = window.moveSlider;

  function assets() {
    if (!overlay) return [];
    return overlay.querySelectorAll('.asset.image');
  }

  function isOpen() {
    return document.body.classList.contains('lookbook-open');
  }

  function dimFor(i) {
    var data = window._4ORMAT_DATA && window._4ORMAT_DATA.page && window._4ORMAT_DATA.page.assets;
    if (data && data[i] && data[i].image_dimensions_1600x1200) {
      var d = data[i].image_dimensions_1600x1200;
      if (d[0] && d[1]) return d;
    }
    return null;
  }

  function expectedWidth(el, i, h) {
    var d = dimFor(i);
    if (d) return (h * d[0]) / d[1];
    var r = el.getBoundingClientRect();
    if (r.width > 1) return r.width;
    return el.offsetWidth || 0;
  }

  function nearestIndex() {
    var list = assets();
    if (!list.length) return 0;
    var root = overlay.getBoundingClientRect();
    var mid = root.left + root.width / 2;
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
    var root = overlay.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    var elMid = r.left + r.width / 2;
    var viewMid = root.left + root.width / 2;
    return overlay.scrollLeft + (elMid - viewMid);
  }

  function maxScroll() {
    return Math.max(0, overlay.scrollWidth - overlay.clientWidth);
  }

  function clampScroll(left) {
    return Math.max(0, Math.min(left, maxScroll()));
  }

  function scrollTargetFor(index, list) {
    if (!list[index]) return overlay.scrollLeft;
    return clampScroll(centerLeftFor(list[index]));
  }

  function syncHash(index) {
    try {
      history.replaceState(null, null, '#' + index);
    } catch (e) {}
    if (typeof activeSlideIndex !== 'undefined') {
      try {
        activeSlideIndex = index;
      } catch (e2) {}
    }
  }

  function markActive(index) {
    var list = assets();
    Array.prototype.forEach.call(list, function (a, i) {
      a.classList.toggle('active', i === index);
    });
    activeIndex = index;
    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) nextBtn.disabled = index >= list.length - 1;
  }

  function ensureSpacers() {
    wrapEl = overlay.querySelector('#assets_wrap') || overlay.querySelector('#assets');
    if (!wrapEl) return;
    wrapEl.style.paddingLeft = '';
    wrapEl.style.paddingRight = '';
    wrapEl.querySelectorAll('.gallery-center-spacer').forEach(function (el) {
      el.parentNode.removeChild(el);
    });
    var start = wrapEl.querySelector('.lookbook-spacer-start');
    var end = wrapEl.querySelector('.lookbook-spacer-end');
    if (!start) {
      start = document.createElement('div');
      start.className = 'lookbook-spacer-start';
      start.setAttribute('aria-hidden', 'true');
      start.setAttribute('role', 'presentation');
      wrapEl.insertBefore(start, wrapEl.firstChild);
    }
    if (!end) {
      end = document.createElement('div');
      end.className = 'lookbook-spacer-end';
      end.setAttribute('aria-hidden', 'true');
      end.setAttribute('role', 'presentation');
      wrapEl.appendChild(end);
    }
  }

  function sizeSpacers(list, h) {
    ensureSpacers();
    if (!wrapEl || !list.length) return;
    var start = wrapEl.querySelector('.lookbook-spacer-start');
    var end = wrapEl.querySelector('.lookbook-spacer-end');
    if (!start || !end) return;
    var viewW = overlay.clientWidth;
    var firstW = expectedWidth(list[0], 0, h);
    var lastW = expectedWidth(list[list.length - 1], list.length - 1, h);
    start.style.width = Math.max(0, (viewW - firstW) / 2) + 'px';
    end.style.width = Math.max(0, (viewW - lastW) / 2) + 'px';
  }

  function sizeStrip() {
    var list = assets();
    var h = overlay.clientHeight;
    if (h < 1) return;
    Array.prototype.forEach.call(list, function (el, i) {
      var img = el.querySelector('img');
      if (!img) return;
      var w = expectedWidth(el, i, h);
      if (w > 1) {
        img.style.height = h + 'px';
        img.style.width = w + 'px';
        el.style.width = w + 'px';
      }
      el.classList.remove('loading');
    });
    sizeSpacers(list, h);
  }

  function scrollOverlayTo(left, instant, done) {
    left = clampScroll(left);
    var from = overlay.scrollLeft;
    if (instant || Math.abs(from - left) < 1.5) {
      paging = false;
      if (window.jQuery) {
        try {
          window.jQuery(overlay).stop(true, true);
        } catch (e) {}
      }
      overlay.scrollLeft = left;
      if (done) done();
      return;
    }
    paging = true;
    if (window.jQuery) {
      window.jQuery(overlay).stop(true).animate({ scrollLeft: left }, ANIM_MS, 'swing', function () {
        overlay.scrollLeft = left;
        paging = false;
        if (done) done();
      });
      return;
    }
    if (typeof overlay.scrollTo === 'function') {
      overlay.scrollTo({ left: left, behavior: 'smooth' });
      setTimeout(function () {
        overlay.scrollLeft = left;
        paging = false;
        if (done) done();
      }, ANIM_MS);
      return;
    }
    overlay.scrollLeft = left;
    paging = false;
    if (done) done();
  }

  function settle(index) {
    var n = nearestIndex();
    if (typeof index === 'number' && Math.abs(n - index) > 1) n = index;
    targetIndex = n;
    markActive(n);
    syncHash(n);
  }

  function goTo(index, instant) {
    sizeStrip();
    var list = assets();
    if (!list.length) return;
    index = clampIndex(index, list);
    targetIndex = index;
    markActive(index);
    var left = scrollTargetFor(index, list);
    scrollOverlayTo(left, instant, function () {
      sizeStrip();
      var list2 = assets();
      if (list2[index]) overlay.scrollLeft = scrollTargetFor(index, list2);
      settle(index);
    });
  }

  function step(delta) {
    goTo(currentIndex() + delta, false);
  }

  function bumpIdle() {
    if (!overlay) return;
    overlay.classList.remove('lookbook-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (isOpen()) overlay.classList.add('lookbook-idle');
    }, IDLE_MS);
  }

  function place(index, instant) {
    goTo(index, instant);
  }

  function openAt(index, tile) {
    lastFocus = tile || document.activeElement;
    savedY = window.scrollY || 0;
    var gen = ++openGen;
    document.documentElement.classList.add('win');
    document.body.classList.add('gallery', 'gallery_page', 'lookbook-open');
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.remove('lookbook-idle');
    overlay.scrollLeft = 0;
    if (window.sheyanovaGalleryLoad && typeof window.sheyanovaGalleryLoad.primeStrip === 'function') {
      window.sheyanovaGalleryLoad.primeStrip(overlay, index);
    }
    place(index, true);
    requestAnimationFrame(function () {
      if (gen !== openGen || !isOpen()) return;
      place(index, true);
      requestAnimationFrame(function () {
        if (gen !== openGen || !isOpen()) return;
        place(index, true);
      });
    });
    Array.prototype.forEach.call(assets(), function (el) {
      var img = el.querySelector('img');
      if (!img) return;
      if (img.getAttribute('src') && img.complete) return;
      img.addEventListener(
        'load',
        function () {
          if (gen !== openGen || !isOpen() || paging) return;
          place(targetIndex, true);
        },
        { once: true }
      );
    });
    bumpIdle();
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    openGen += 1;
    paging = false;
    wheelLock = false;
    clearTimeout(idleTimer);
    clearTimeout(snapTimer);
    if (window.jQuery) {
      try {
        window.jQuery(overlay).stop(true, true);
      } catch (e) {}
    }
    document.body.classList.remove('gallery', 'gallery_page', 'lookbook-open');
    overlay.classList.remove('lookbook-idle', 'cursor-left', 'cursor-right');
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.scrollLeft = 0;
    try {
      history.replaceState(null, null, location.pathname + location.search);
    } catch (e) {}
    window.scrollTo(0, savedY);
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    }
  }

  window.loadSlideAtIndex = function (n) {
    if (document.body && document.body.classList.contains('lookbook')) {
      if (!isOpen()) return;
      sizeStrip();
      goTo(n, true);
      return;
    }
    if (typeof origLoadSlide === 'function') return origLoadSlide(n);
  };

  window.moveSlider = function (n, t) {
    if (document.body && document.body.classList.contains('lookbook')) {
      if (!isOpen()) return false;
      goTo(n, t === 0);
      return;
    }
    if (typeof origMoveSlider === 'function') return origMoveSlider(n, t);
  };

  function onOverlayClick(e) {
    if (e.target.closest('.lookbook-close') || e.target.closest('.lookbook-nav')) return;
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    var rect = overlay.getBoundingClientRect();
    var x = e.clientX - rect.left;
    if (x < rect.width / 2) step(-1);
    else step(1);
    bumpIdle();
  }

  function onOverlayMove(e) {
    var rect = overlay.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var n = currentIndex();
    var last = assets().length - 1;
    overlay.classList.toggle('cursor-left', x < rect.width / 2 && n > 0);
    overlay.classList.toggle('cursor-right', x >= rect.width / 2 && n < last);
    bumpIdle();
  }

  function onWheel(e) {
    if (!isOpen()) return;
    e.preventDefault();
    e.stopPropagation();
    var dy = e.deltaY || 0;
    var dx = e.deltaX || 0;
    if (e.deltaMode === 1) {
      dy *= 16;
      dx *= 16;
    } else if (e.deltaMode === 2) {
      dy *= overlay.clientHeight;
      dx *= overlay.clientWidth;
    }
    var delta = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
    if (e.shiftKey && dx) delta = dx;
    if (Math.abs(delta) < 6) return;
    if (wheelLock) return;
    wheelLock = true;
    if (delta > 0) step(1);
    else step(-1);
    setTimeout(function () {
      wheelLock = false;
    }, WHEEL_LOCK_MS);
  }

  function bind() {
    overlay = document.getElementById('lookbook-overlay');
    grid = document.getElementById('lookbook-grid');
    if (!overlay || !grid) return;
    closeBtn = overlay.querySelector('.lookbook-close');
    prevBtn = overlay.querySelector('.lookbook-nav-prev');
    nextBtn = overlay.querySelector('.lookbook-nav-next');

    grid.addEventListener('click', function (e) {
      var tile = e.target.closest('.lookbook-tile');
      if (!tile) return;
      var n = parseInt(tile.getAttribute('data-index'), 10);
      if (isNaN(n)) n = 0;
      openAt(n, tile);
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        close();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        step(-1);
        bumpIdle();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        step(1);
        bumpIdle();
      });
    }

    overlay.addEventListener('gallery-ready', function () {
      if (!isOpen()) return;
      place(targetIndex, true);
    });
    overlay.addEventListener('click', onOverlayClick, true);
    overlay.addEventListener('mousemove', onOverlayMove);
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });

    overlay.addEventListener('scroll', function () {
      if (!isOpen()) return;
      var best = nearestIndex();
      if (best !== activeIndex) markActive(best);
      if (paging) return;
      clearTimeout(snapTimer);
      snapTimer = setTimeout(function () {
        if (!isOpen() || paging) return;
        settle();
      }, 140);
    });

    document.addEventListener(
      'keydown',
      function (e) {
        if (!isOpen()) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          close();
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          step(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          step(1);
        }
      },
      true
    );

    window.addEventListener('resize', function () {
      if (!isOpen()) return;
      place(targetIndex, true);
    });

    var hash = location.hash.match(/^#(\d+)$/);
    if (hash) {
      var start = parseInt(hash[1], 10);
      var tile = grid.querySelector('.lookbook-tile[data-index="' + start + '"]');
      openAt(start, tile);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
