/*! Sheyanova gallery load: header/nav first; per-frame 1px charcoal
   strip until each photo decodes; first 3 (center + neighbors) then
   sequential rest. */
(function () {
  var PRIORITY = 3;
  var GATE_MS = 12000;
  var loadGen = 0;
  var MARK =
    '<span class="gallery-load-mark" aria-hidden="true"><span class="gallery-load-line"></span></span>';

  function startIndexFromHash() {
    var m = location.hash.match(/^#(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  }

  /* Window of 3 around the opening/centered frame: start + neighbors,
     clamped to the strip (index 0 → 0,1,2; last → last three). */
  function priorityWindow(start, n) {
    var out = [];
    var i;
    if (n <= 0) return out;
    if (n <= PRIORITY) {
      for (i = 0; i < n; i++) out.push(i);
      return out;
    }
    start = Math.max(0, Math.min(start | 0, n - 1));
    var a = Math.max(0, start - 1);
    var b = Math.min(n - 1, a + 2);
    a = Math.max(0, b - 2);
    for (i = a; i <= b; i++) out.push(i);
    return out;
  }

  function stripImgs(root) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll('.asset.image img'));
  }

  function galleryHost(root) {
    if (!root) return null;
    return root.querySelector('.gallery_content') || root;
  }

  function urlOf(img) {
    return (img && (img.getAttribute('data-src') || img.getAttribute('src'))) || '';
  }

  function assetOf(img) {
    var n = img;
    while (n && n !== document.documentElement) {
      if (n.classList && n.classList.contains('asset')) return n;
      n = n.parentNode;
    }
    return null;
  }

  function idle(fn) {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(function () {
        fn();
      }, { timeout: 700 });
      return;
    }
    setTimeout(fn, 60);
  }

  function waitLoad(img) {
    return new Promise(function (resolve) {
      if (!img) return resolve();
      if (img.complete && img.naturalWidth) return resolve();
      var done = function () {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
        resolve();
      };
      img.addEventListener('load', done);
      img.addEventListener('error', done);
    });
  }

  function decodeImg(img) {
    if (!img) return Promise.resolve();
    return waitLoad(img).then(function () {
      if (img.decode) {
        return img.decode().then(
          function () {},
          function () {}
        );
      }
    });
  }

  function applySrc(img, high) {
    var url = urlOf(img);
    if (!img || !url) return;
    img.setAttribute('decoding', 'async');
    if (high) {
      img.setAttribute('loading', 'eager');
      img.setAttribute('fetchpriority', 'high');
      try {
        img.fetchPriority = 'high';
      } catch (e) {}
    } else {
      img.setAttribute('loading', 'lazy');
      img.setAttribute('fetchpriority', 'low');
      try {
        img.fetchPriority = 'low';
      } catch (e2) {}
    }
    if (img.getAttribute('src') !== url) img.src = url;
  }

  function ensureFrameMark(host) {
    if (!host) return null;
    var found = host.querySelector('.gallery-load-mark');
    if (found && found.parentNode === host) return found;
    if (found) return found;
    var wrap = document.createElement('div');
    wrap.innerHTML = MARK;
    var el = wrap.firstChild;
    host.insertBefore(el, host.firstChild);
    return el;
  }

  function markAssetPending(asset) {
    if (!asset) return;
    var box = asset.querySelector('.img') || asset;
    ensureFrameMark(box);
    asset.classList.add('asset-await');
    asset.classList.remove('asset-ready');
  }

  function markAssetReady(asset) {
    if (!asset || asset.classList.contains('asset-ready')) return;
    asset.classList.remove('asset-await');
    asset.classList.add('asset-ready');
  }

  function settleAsset(img) {
    var asset = assetOf(img);
    if (!asset) return Promise.resolve();
    markAssetPending(asset);
    if (img.complete && img.naturalWidth) {
      markAssetReady(asset);
      return decodeImg(img);
    }
    return decodeImg(img).then(function () {
      markAssetReady(asset);
    });
  }

  function armStripFrames(imgs) {
    var i;
    for (i = 0; i < imgs.length; i++) {
      var asset = assetOf(imgs[i]);
      if (!asset) continue;
      markAssetPending(asset);
      if (imgs[i].complete && imgs[i].naturalWidth) markAssetReady(asset);
    }
  }

  function reserveWidths(root, imgs) {
    var data = window._4ORMAT_DATA && window._4ORMAT_DATA.page && window._4ORMAT_DATA.page.assets;
    if (!data || !imgs.length) return;
    var header = document.getElementById('themeHeader');
    var overlay = document.getElementById('lookbook-overlay');
    var h;
    if (document.body && document.body.classList.contains('lookbook-open') && overlay) {
      h = overlay.clientHeight || window.innerHeight;
    } else {
      h = window.innerHeight - (header ? header.offsetHeight : 0) - 40;
    }
    if (h < 120) h = 400;
    var i;
    for (i = 0; i < imgs.length; i++) {
      var d = data[i] && data[i].image_dimensions_1600x1200;
      if (!d || !d[0] || !d[1]) continue;
      var w = (h * d[0]) / d[1];
      var asset = assetOf(imgs[i]);
      if (asset) asset.style.width = w + 'px';
    }
  }

  function bumpLayout() {
    try {
      window.dispatchEvent(new Event('resize'));
    } catch (e) {}
    if (window.jQuery) {
      try {
        window.jQuery(window).trigger('resize');
      } catch (e2) {}
    }
  }

  function revealHost(host) {
    if (!host) return;
    host.classList.remove('gallery-await');
    host.classList.add('gallery-ready');
    try {
      host.dispatchEvent(new CustomEvent('gallery-ready', { bubbles: true }));
    } catch (e) {}
    bumpLayout();
  }

  function pumpRest(gen, imgs, skip) {
    var i = 0;
    function next() {
      if (gen !== loadGen) return;
      while (i < imgs.length && skip[i]) i++;
      if (i >= imgs.length) return;
      var img = imgs[i];
      skip[i] = true;
      i += 1;
      applySrc(img, false);
      settleAsset(img).then(function () {
        idle(next);
      });
    }
    idle(next);
  }

  function primeStrip(root, start) {
    var host = galleryHost(root);
    var imgs = stripImgs(root);
    if (!host) return;
    var gen = ++loadGen;
    host.classList.remove('gallery-await');
    if (!imgs.length) {
      revealHost(host);
      return;
    }
    armStripFrames(imgs);
    reserveWidths(root, imgs);
    if (typeof start !== 'number' || isNaN(start)) start = startIndexFromHash();
    var pri = priorityWindow(start, imgs.length);
    var skip = {};
    var i;
    for (i = 0; i < pri.length; i++) {
      skip[pri[i]] = true;
      applySrc(imgs[pri[i]], true);
      settleAsset(imgs[pri[i]]);
    }
    var settled = false;
    function finish() {
      if (settled || gen !== loadGen) return;
      settled = true;
      revealHost(host);
      pumpRest(gen, imgs, skip);
    }
    var t = setTimeout(finish, GATE_MS);
    Promise.all(
      pri.map(function (idx) {
        return decodeImg(imgs[idx]);
      })
    ).then(function () {
      clearTimeout(t);
      finish();
    });
  }

  function initLookbookTiles() {
    var tiles = document.querySelectorAll('.lookbook-tile');
    Array.prototype.forEach.call(tiles, function (tile) {
      ensureFrameMark(tile);
      var img = tile.querySelector('img');
      var ready = function () {
        decodeImg(img).then(function () {
          tile.classList.add('is-ready');
          if (img) img.classList.add('is-ready');
        });
      };
      if (!img) {
        tile.classList.add('is-ready');
        return;
      }
      if (img.complete && img.naturalWidth) ready();
      else img.addEventListener('load', ready, { once: true });
      img.addEventListener(
        'error',
        function () {
          tile.classList.add('is-ready');
          img.classList.add('is-ready');
        },
        { once: true }
      );
    });
  }

  function initBA() {
    var pairs = document.querySelectorAll('.comparison_slider, .ba-pair');
    Array.prototype.forEach.call(pairs, function (pair, idx) {
      pair.classList.add('ba-pair', 'ba-await');
      pair.classList.remove('ba-ready');
      var wrap = pair.querySelector('.comparison_slider__image_wrap') || pair;
      ensureFrameMark(wrap);
      var imgs = pair.querySelectorAll('.comparison_slider__slider_image');
      var finish = function () {
        pair.classList.remove('ba-await');
        pair.classList.add('ba-ready');
      };
      Promise.all(Array.prototype.map.call(imgs, decodeImg)).then(finish);
      if (idx === 0) {
        setTimeout(function () {
          if (pair.classList.contains('ba-await')) finish();
        }, GATE_MS);
      }
    });
  }

  function boot() {
    if (document.body && document.body.classList.contains('lookbook')) {
      initLookbookTiles();
      return;
    }
    if (document.body && document.body.classList.contains('gallery')) {
      var content = document.getElementById('content');
      if (content) primeStrip(content, startIndexFromHash());
    }
    initBA();
  }

  window.sheyanovaGalleryLoad = {
    primeStrip: primeStrip,
    priorityWindow: priorityWindow
  };

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
