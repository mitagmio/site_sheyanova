(function (global) {
  var SEND_FAIL = 'Could not send your message. Please try again later.';
  var TS_ERR = 'Security check failed. Please refresh the page and try again.';

  function val(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    if (!el) return '';
    if (el.type === 'checkbox' || el.type === 'radio') {
      var checked = form.querySelector('[name="' + name + '"]:checked');
      return (checked && checked.value) || '';
    }
    return (el.value || '').trim();
  }

  function turnstileWidget(form) {
    if (!form) return null;
    return form.querySelector('.cf-turnstile, .js-turnstile');
  }

  function widgetHidden(el) {
    return !!(el && el.closest && el.closest('[hidden]'));
  }

  function readToken(form, widgetId) {
    var widget = turnstileWidget(form);
    if (widget) {
      var stored = widget.getAttribute('data-token');
      if (stored) return stored;
      var ts = widget.querySelector('[name="cf-turnstile-response"]');
      if (ts && ts.value) return ts.value;
    }
    var input = form && form.querySelector('[name="cf-turnstile-response"]');
    if (input && input.value) return input.value;
    try {
      if (widgetId && global.turnstile && typeof global.turnstile.getResponse === 'function') {
        var got = global.turnstile.getResponse(widgetId);
        if (got) return got;
      }
    } catch (e) {}
    return '';
  }

  function collect(form) {
    var payload = {};
    var seen = {};
    var i, el, name, n, boxes, arr, c, v;
    for (i = 0; i < form.elements.length; i++) {
      el = form.elements[i];
      name = el && el.name;
      if (!name || el.disabled) continue;
      if (el.type === 'submit' || el.type === 'button' || el.type === 'reset') continue;
      if (seen[name]) continue;
      seen[name] = true;
      if (el.type === 'checkbox') {
        boxes = form.querySelectorAll('input[type="checkbox"][name="' + name + '"]');
        arr = [];
        for (n = 0; n < boxes.length; n++) {
          if (boxes[n].checked && !boxes[n].disabled) arr.push(boxes[n].value);
        }
        if (arr.length) payload[name] = arr;
        continue;
      }
      if (el.type === 'radio') {
        c = form.querySelector('input[type="radio"][name="' + name + '"]:checked');
        if (c && c.value && !c.disabled) payload[name] = c.value;
        continue;
      }
      v = (el.value || '').trim();
      if (v) payload[name] = v;
    }
    return payload;
  }

  function waitTurnstile(ok, fail) {
    var start = Date.now();
    var doneFail = typeof fail === 'function' ? fail : function () {};
    function go() {
      if (global.turnstile) {
        try {
          if (typeof global.turnstile.ready === 'function') {
            global.turnstile.ready(function () {
              try { ok(); } catch (e) { doneFail(); }
            });
          } else {
            ok();
          }
        } catch (e) {
          doneFail();
        }
        return;
      }
      if (Date.now() - start > 8000) {
        doneFail();
        return;
      }
      setTimeout(go, 50);
    }
    go();
  }

  // Overlay forms must not use implicit .cf-turnstile (display:none ancestors).
  // Do not pass size: 'invisible' — render() only accepts normal|flexible|compact;
  // the dashboard widget type (Managed/Invisible) comes from the sitekey.
  function prepareTurnstile(form) {
    var widget = turnstileWidget(form);
    if (!widget || !global.turnstile || typeof global.turnstile.render !== 'function') return '';
    if (widgetHidden(widget)) return '';
    var existing = widget.getAttribute('data-widget-id');
    if (existing) return existing;
    var sitekey = widget.getAttribute('data-sitekey');
    if (!sitekey) return '';
    try {
      var id = global.turnstile.render(widget, {
        sitekey: sitekey,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: function (token) {
          if (token) widget.setAttribute('data-token', token);
          if (typeof widget._tsCb === 'function') widget._tsCb(token || '');
        },
        'error-callback': function () {
          widget.removeAttribute('data-token');
          if (typeof widget._tsCb === 'function') widget._tsCb('');
        },
        'expired-callback': function () {
          widget.removeAttribute('data-token');
          try {
            var wid = widget.getAttribute('data-widget-id');
            if (wid) global.turnstile.reset(wid);
          } catch (e) {}
        }
      });
      if (id != null && id !== false && id !== '') {
        widget.setAttribute('data-widget-id', String(id));
        return String(id);
      }
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('SheyanovaForms: turnstile render skipped', e);
      }
    }
    return widget.getAttribute('data-widget-id') || '';
  }

  function obtainToken(form, done) {
    var widget = turnstileWidget(form);
    if (!widget) {
      done('');
      return;
    }
    var existing = readToken(form, widget.getAttribute('data-widget-id'));
    if (existing) {
      done(existing);
      return;
    }
    waitTurnstile(function () {
      var finished = false;
      var finish = function (tok) {
        if (finished) return;
        finished = true;
        widget._tsCb = null;
        var id = widget.getAttribute('data-widget-id');
        done(tok || readToken(form, id) || '');
      };
      widget._tsCb = finish;
      var id = '';
      try {
        id = prepareTurnstile(form);
      } catch (e) {
        finish('');
        return;
      }
      if (!id) {
        finish('');
        return;
      }
      try {
        if (typeof global.turnstile.execute === 'function') {
          global.turnstile.execute(id);
        }
      } catch (e) {
        finish('');
        return;
      }
      setTimeout(function () { finish(readToken(form, id)); }, 12000);
    }, function () { done(''); });
  }

  function attach(form, opts) {
    if (!form) return;
    opts = opts || {};
    var action = opts.action || form.getAttribute('action');
    var successMsg = opts.successMessage || 'Thank you. Your message has been sent.';
    var t = form.querySelector('input[name="_t"]');
    var loaded = Date.now();
    if (t) t.value = String(loaded);
    var status = form.querySelector('.contact_form__status, .rate-form__status');

    function setStatus(kind, text) {
      if (!status) return;
      status.className = 'error_messages contact_form__status rate-form__status' + (kind ? ' is-' + kind : '');
      status.textContent = text || '';
    }

    function unlock() {
      if (!form.classList.contains('is-sent')) form.classList.remove('is-busy');
    }

    function failTurnstile() {
      setStatus('err', TS_ERR);
      unlock();
    }

    function send(token) {
      var payload = collect(form);
      if (opts.extra) {
        for (var k in opts.extra) {
          if (Object.prototype.hasOwnProperty.call(opts.extra, k) && opts.extra[k] != null && opts.extra[k] !== '') {
            payload[k] = opts.extra[k];
          }
        }
      }
      payload._t = loaded;
      if (turnstileWidget(form)) {
        if (!token) {
          failTurnstile();
          return;
        }
        payload['cf-turnstile-response'] = token;
      }
      fetch(action, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.json().then(function (body) {
          return { res: res, body: body };
        }).catch(function () {
          return { res: res, body: {} };
        });
      }).then(function (out) {
        if (out.res.ok && out.body && out.body.ok) {
          setStatus('ok', (out.body.message || successMsg));
          if (opts.lockOnSuccess) {
            form.classList.add('is-sent');
          }
          if (!opts.stayOpen) {
            form.reset();
            loaded = Date.now();
            if (t) t.value = String(loaded);
          } else {
            loaded = Date.now();
            if (t) t.value = String(loaded);
            var doneBtn = form.querySelector('.rate-form-done');
            if (doneBtn) doneBtn.hidden = false;
          }
          if (typeof opts.onSuccess === 'function') opts.onSuccess(form, out.body.message || successMsg);
          var w = turnstileWidget(form);
          if (w) {
            w.removeAttribute('data-token');
            try {
              var wid = w.getAttribute('data-widget-id');
              if (wid && global.turnstile) global.turnstile.reset(wid);
            } catch (e2) {}
          }
        } else {
          setStatus('err', (out.body && out.body.error) || SEND_FAIL);
        }
      }).catch(function () {
        setStatus('err', SEND_FAIL);
      }).then(unlock);
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (form.classList.contains('is-busy') || form.classList.contains('is-sent')) return;
      if (typeof opts.validate === 'function') {
        var err = opts.validate(form);
        if (err) {
          setStatus('err', err);
          return;
        }
      }
      form.classList.add('is-busy');
      setStatus('', 'Sending…');
      var widget = turnstileWidget(form);
      if (widget) {
        try {
          obtainToken(form, function (token) {
            if (!token) {
              failTurnstile();
              return;
            }
            send(token);
          });
        } catch (e) {
          failTurnstile();
        }
        return;
      }
      send('');
    });

    var host = turnstileWidget(form);
    if (host && !widgetHidden(host)) {
      waitTurnstile(function () {
        try { prepareTurnstile(form); } catch (e) {}
      }, function () {});
    }
  }

  global.SheyanovaForms = {
    attach: attach,
    collect: collect,
    val: val,
    prepareTurnstile: prepareTurnstile
  };
})(window);
