/*! BA horizontal strip: size pairs to viewport height; wheel → scrollLeft; arrows step one. */
(function () {
  function headerH() {
    var h = document.getElementById('themeHeader');
    return h ? h.offsetHeight : 0;
  }

  function windowSpace() {
    return Math.max(320, window.innerHeight - headerH() - 16);
  }

  function slides() {
    return Array.prototype.slice.call(
      document.querySelectorAll('._4ORMAT_module_comparison_slider_01, .format_comparison_slider')
    );
  }

  function sizeSlides() {
    var space = windowSpace();
    var page = document.querySelector('.page');
    var container = document.querySelector('._4ORMAT_content_page_container');
    if (page) {
      page.style.height = space + headerH() + 'px';
    }
    slides().forEach(function (row) {
      row.style.height = space + 'px';
      var wrap = row.querySelector('.comparison_slider__image_wrap') || row;
      var img = row.querySelector('.comparison_slider__slider_image--1') ||
        row.querySelector('.comparison_slider__slider_image');
      if (!img) return;
      var nw = img.naturalWidth || 0;
      var nh = img.naturalHeight || 0;
      var w;
      if (nw > 0 && nh > 0) {
        w = Math.round(space * (nw / nh));
      } else {
        w = Math.round(space * 0.7);
      }
      row.style.width = w + 'px';
      wrap.style.height = space + 'px';
      wrap.style.width = w + 'px';
      row.querySelectorAll('.comparison_slider__slider_image').forEach(function (el) {
        el.style.height = space + 'px';
        el.style.width = w + 'px';
      });
    });
    if (container) {
      container.style.height = space + 'px';
    }
    updateArrows();
  }

  function scrollEl() {
    return document.scrollingElement || document.documentElement;
  }

  function nearestIndex() {
    var list = slides();
    if (!list.length) return 0;
    var x = scrollEl().scrollLeft;
    var best = 0;
    var bestDist = Infinity;
    list.forEach(function (el, i) {
      var d = Math.abs(el.offsetLeft - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  function goTo(index, smooth) {
    var list = slides();
    if (!list.length) return;
    index = Math.max(0, Math.min(list.length - 1, index));
    var el = list[index];
    var left = el.offsetLeft;
    if (smooth && scrollEl().scrollTo) {
      scrollEl().scrollTo({ left: left, behavior: 'smooth' });
    } else {
      scrollEl().scrollLeft = left;
    }
    updateArrows();
  }

  function updateArrows() {
    var prev = document.querySelector('.ba-nav-arrow--prev');
    var next = document.querySelector('.ba-nav-arrow--next');
    var i = nearestIndex();
    var n = slides().length;
    if (prev) prev.disabled = i <= 0;
    if (next) next.disabled = i >= n - 1;
  }

  function onWheel(e) {
    // Vertical wheel → horizontal strip (Format panorama behaviour)
    if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
      scrollEl().scrollLeft += e.deltaY;
      e.preventDefault();
      updateArrows();
    }
  }

  function ensureArrows() {
    if (document.querySelector('.ba-nav-arrow')) return;
    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'ba-nav-arrow ba-nav-arrow--prev';
    prev.setAttribute('aria-label', 'Previous');
    prev.innerHTML = '<svg viewBox="0 0 16 30"><path d="M15.16 30a.827.827 0 0 1-.584-.241L.256 15.615a.867.867 0 0 1 0-1.232L14.577.241a.828.828 0 0 1 1.188.02.87.87 0 0 1-.02 1.212L2.047 15l13.697 13.526a.87.87 0 0 1 .02 1.212.831.831 0 0 1-.604.262z"/></svg>';
    prev.addEventListener('click', function () { goTo(nearestIndex() - 1, true); });

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'ba-nav-arrow ba-nav-arrow--next';
    next.setAttribute('aria-label', 'Next');
    next.innerHTML = '<svg viewBox="0 0 16 30"><path d="M.84 0c.21 0 .42.08.584.241l14.32 14.144a.867.867 0 0 1 0 1.232L1.423 29.759a.828.828 0 0 1-1.188-.02.87.87 0 0 1 .02-1.212L13.953 15 .256 1.474A.87.87 0 0 1 .236.262.831.831 0 0 1 .84 0z"/></svg>';
    next.addEventListener('click', function () { goTo(nearestIndex() + 1, true); });

    document.body.appendChild(prev);
    document.body.appendChild(next);
  }

  function boot() {
    ensureArrows();
    sizeSlides();
    window.addEventListener('resize', sizeSlides);
    window.addEventListener('scroll', updateArrows, { passive: true });
    document.documentElement.addEventListener('wheel', onWheel, { passive: false });
    slides().forEach(function (row) {
      row.querySelectorAll('img').forEach(function (img) {
        if (img.complete) return;
        img.addEventListener('load', sizeSlides);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('load', sizeSlides);
})();
