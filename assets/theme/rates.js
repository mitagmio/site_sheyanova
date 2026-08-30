(function () {
  var KEYS = ['fashion', 'beauty', 'lookbook', 'editorial', 'product', 'manual'];
  var WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var lastFocus = null;
  var openKey = '';
  var openDatePop = null;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function modalFor(key) {
    return document.getElementById(key);
  }

  function bannerFor(key) {
    return document.getElementById('rate-banner-' + key);
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function toISO(y, m, d) {
    return y + '-' + pad(m) + '-' + pad(d);
  }

  function parseDateValue(s) {
    s = (s || '').trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    return null;
  }

  function validDate(dt) {
    return dt instanceof Date && !isNaN(dt.getTime());
  }

  function normalizeDate(s, minISO) {
    var dt = parseDateValue(s);
    if (!validDate(dt)) return '';
    var iso = toISO(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
    if (minISO && iso < minISO) return '';
    return iso;
  }

  function closeDatePicker() {
    if (!openDatePop) return false;
    openDatePop.hidden = true;
    openDatePop = null;
    return true;
  }

  function renderCalendar(pop, input, view) {
    var minISO = input.getAttribute('data-rate-min') || todayISO();
    var selected = normalizeDate(input.value, '') || '';
    var y = view.getFullYear();
    var m = view.getMonth();
    var first = new Date(y, m, 1);
    var startPad = (first.getDay() + 6) % 7;
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var today = todayISO();
    var html = '';
    html += '<div class="rate-date__nav">';
    html += '<button type="button" class="rate-date__nav-btn" data-date-prev aria-label="Previous month">‹</button>';
    html += '<span class="rate-date__month">' + MONTHS[m] + ' ' + y + '</span>';
    html += '<button type="button" class="rate-date__nav-btn" data-date-next aria-label="Next month">›</button>';
    html += '</div>';
    html += '<div class="rate-date__dow">';
    for (var i = 0; i < WEEKDAYS.length; i++) {
      html += '<span>' + WEEKDAYS[i] + '</span>';
    }
    html += '</div><div class="rate-date__grid">';
    var cell;
    for (cell = 0; cell < startPad; cell++) {
      html += '<span></span>';
    }
    for (var day = 1; day <= daysInMonth; day++) {
      var iso = toISO(y, m + 1, day);
      var disabled = iso < minISO ? ' disabled' : '';
      var cls = 'rate-date__day';
      if (iso === selected) cls += ' is-selected';
      if (iso === today) cls += ' is-today';
      html += '<button type="button" class="' + cls + '" data-date-iso="' + iso + '"' + disabled + '>' + day + '</button>';
    }
    html += '</div>';
    pop.innerHTML = html;
    pop.setAttribute('data-view', y + '-' + pad(m + 1));
  }

  function openDatePicker(wrap) {
    var input = wrap.querySelector('[data-rate-date]');
    var pop = wrap.querySelector('.rate-date__pop');
    if (!input || !pop) return;
    if (openDatePop && openDatePop !== pop) closeDatePicker();
    var view = parseDateValue(input.value) || new Date();
    var minISO = input.getAttribute('data-rate-min') || todayISO();
    if (!validDate(view) || toISO(view.getFullYear(), view.getMonth() + 1, view.getDate()) < minISO) {
      view = parseDateValue(minISO) || new Date();
    }
    renderCalendar(pop, input, view);
    pop.hidden = false;
    openDatePop = pop;
  }

  function bindDateField(input) {
    if (!input || input.getAttribute('data-rate-date-bound')) return;
    input.setAttribute('data-rate-date-bound', '1');
    var wrap = input.closest('.rate-date');
    if (!wrap) return;
    var min = todayISO();
    input.setAttribute('data-rate-min', min);
    input.setAttribute('placeholder', 'YYYY-MM-DD');
    var btn = wrap.querySelector('[data-rate-date-toggle]');
    var pop = wrap.querySelector('.rate-date__pop');
    if (!pop) {
      pop = document.createElement('div');
      pop.className = 'rate-date__pop';
      pop.hidden = true;
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-label', 'Choose delivery date');
      pop.setAttribute('lang', 'en');
      wrap.appendChild(pop);
    }
    if (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (openDatePop === pop && !pop.hidden) closeDatePicker();
        else openDatePicker(wrap);
      });
    }
    input.addEventListener('change', function () {
      var iso = normalizeDate(input.value, input.getAttribute('data-rate-min') || todayISO());
      if (iso) input.value = iso;
    });
    pop.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var t = ev.target;
      var viewStr = pop.getAttribute('data-view') || '';
      var parts = viewStr.split('-');
      var view = new Date(+parts[0] || new Date().getFullYear(), (+parts[1] || 1) - 1, 1);
      if (t.closest('[data-date-prev]')) {
        renderCalendar(pop, input, new Date(view.getFullYear(), view.getMonth() - 1, 1));
        return;
      }
      if (t.closest('[data-date-next]')) {
        renderCalendar(pop, input, new Date(view.getFullYear(), view.getMonth() + 1, 1));
        return;
      }
      var dayBtn = t.closest('[data-date-iso]');
      if (dayBtn && !dayBtn.disabled) {
        input.value = dayBtn.getAttribute('data-date-iso');
        closeDatePicker();
      }
    });
  }

  function setOpen(key, fromHash) {
    if (KEYS.indexOf(key) < 0) {
      closeAll(fromHash);
      return;
    }
    if (openKey && openKey !== key) {
      hideModal(openKey);
    }
    var modal = modalFor(key);
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('rate-modal-open');
    openKey = key;
    var form = $('form.rate-form', modal);
    function prepTs() {
      if (!form || !window.SheyanovaForms || !window.SheyanovaForms.prepareTurnstile) return;
      function render() {
        try {
          window.SheyanovaForms.prepareTurnstile(form);
        } catch (e) {}
      }
      try {
        if (window.turnstile && typeof window.turnstile.ready === 'function') {
          window.turnstile.ready(render);
          return;
        }
      } catch (e) {}
      render();
    }
    if (window.requestAnimationFrame) window.requestAnimationFrame(prepTs);
    window.setTimeout(prepTs, 400);
    if (!fromHash) {
      if (history.replaceState) history.replaceState(null, '', '#' + key);
      else location.hash = key;
    }
    var closeBtn = $('.rates-dialog-close, .rate-modal__close', modal);
    var first = $('input, select, textarea, button', modal);
    (closeBtn || first || modal).focus();
  }

  function hideModal(key) {
    var modal = modalFor(key);
    if (modal) modal.hidden = true;
  }

  function closeAll(fromHash) {
    closeDatePicker();
    KEYS.forEach(hideModal);
    document.body.classList.remove('rate-modal-open');
    var prev = openKey;
    openKey = '';
    if (!fromHash) {
      if (history.replaceState) {
        history.replaceState(null, '', location.pathname + location.search);
      } else if (location.hash) {
        location.hash = '';
      }
    }
    var back = lastFocus;
    if (!back || !back.focus) back = bannerFor(prev);
    if (back && back.focus) back.focus();
    lastFocus = null;
  }

  function keyFromHash() {
    var h = (location.hash || '').replace(/^#/, '').toLowerCase();
    return KEYS.indexOf(h) >= 0 ? h : '';
  }

  function syncHash() {
    var key = keyFromHash();
    if (key) setOpen(key, true);
    else if (openKey) closeAll(true);
  }

  function setDisabled(root, disabled) {
    if (!root) return;
    var els = root.querySelectorAll('input, select, textarea');
    for (var i = 0; i < els.length; i++) {
      els[i].disabled = disabled;
    }
  }

  function applyManualTask(form) {
    var taskEl = form.querySelector('[name="task"]');
    var task = taskEl ? taskEl.value : '';
    var groups = form.querySelectorAll('[data-task-show]');
    for (var i = 0; i < groups.length; i++) {
      var show = (groups[i].getAttribute('data-task-show') || '').split(',');
      var on = task && show.indexOf(task) >= 0;
      groups[i].hidden = !on;
      setDisabled(groups[i], !on);
    }
    var cut = task === 'cut_model' || task === 'cut_object';
    var stdWrap = form.querySelector('[data-format-mode="std"]');
    var cutWrap = form.querySelector('[data-format-mode="cut"]');
    if (stdWrap && cutWrap) {
      stdWrap.hidden = cut;
      cutWrap.hidden = !cut;
      setDisabled(stdWrap, cut);
      setDisabled(cutWrap, !cut);
    }
    var colorRef = form.querySelector('[data-rate-color-ref]');
    if (colorRef) {
      var needRef = task === 'color' || task === 'hair';
      colorRef.required = needRef;
    }
  }

  function applyContactPhone(form) {
    var contact = form.querySelector('[name="Contact"]');
    var phone = form.querySelector('[name="Phone"]');
    if (!contact || !phone) return;
    var need = contact.value === 'Phone' || contact.value === 'WhatsApp';
    phone.required = need;
    phone.setAttribute('aria-required', need ? 'true' : 'false');
  }

  function bindRetouch(form) {
    var cards = form.querySelectorAll('.rate-retouch');
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        var inp = card.querySelector('input[name="Retouch_level"]');
        if (!inp) return;
        function sync() {
          card.classList.toggle('is-selected', !!inp.checked);
        }
        inp.addEventListener('change', function () {
          for (var j = 0; j < cards.length; j++) {
            var other = cards[j].querySelector('input[name="Retouch_level"]');
            cards[j].classList.toggle('is-selected', !!(other && other.checked));
          }
        });
        sync();
      })(cards[i]);
    }
  }

  function bindForm(form) {
    if (!form || !window.SheyanovaForms) return;
    var dateInputs = form.querySelectorAll('[data-rate-date]');
    for (var i = 0; i < dateInputs.length; i++) {
      bindDateField(dateInputs[i]);
    }
    applyContactPhone(form);
    var contact = form.querySelector('[name="Contact"]');
    if (contact) contact.addEventListener('change', function () { applyContactPhone(form); });
    if (form.getAttribute('data-rate-form') === 'rates_manual') {
      applyManualTask(form);
      var task = form.querySelector('[data-rate-task]');
      if (task) task.addEventListener('change', function () { applyManualTask(form); });
    }
    bindRetouch(form);
    window.SheyanovaForms.attach(form, {
      stayOpen: false,
      lockOnSuccess: true,
      successMessage: 'Thank you. Your message has been sent.',
      validate: function (f) {
        applyContactPhone(f);
        if (f.getAttribute('data-rate-form') === 'rates_manual') applyManualTask(f);
        var dateEl = f.querySelector('[data-rate-date]');
        if (dateEl) {
          var iso = normalizeDate(dateEl.value, dateEl.getAttribute('data-rate-min') || todayISO());
          if (!iso) {
            if (dateEl.focus) dateEl.focus();
            return 'Please choose a delivery date (YYYY-MM-DD).';
          }
          dateEl.value = iso;
        }
        if (!window.SheyanovaForms.val(f, 'name')) return 'Please enter your name.';
        if (!window.SheyanovaForms.val(f, 'email')) return 'Please enter a valid email address.';
        var method = window.SheyanovaForms.val(f, 'Contact');
        if (!method) return 'Please choose a contact method.';
        if ((method === 'Phone' || method === 'WhatsApp') && !window.SheyanovaForms.val(f, 'Phone')) {
          return 'Please enter a phone number.';
        }
        if (!f.checkValidity()) {
          var bad = f.querySelector(':invalid');
          if (bad && bad.focus) bad.focus();
          return 'Please fill in the required fields.';
        }
        return '';
      },
      onSuccess: function (f) {
        window.setTimeout(function () {
          closeAll(false);
          f.classList.remove('is-sent', 'is-busy');
        }, 1400);
      }
    });
  }

  document.addEventListener('click', function (ev) {
    if (openDatePop && !ev.target.closest('.rate-date')) {
      closeDatePicker();
    }
    var close = ev.target.closest('[data-rate-close]');
    if (close) {
      ev.preventDefault();
      closeAll(false);
      return;
    }
    var banner = ev.target.closest('.rate-banner');
    if (banner) {
      ev.preventDefault();
      setOpen(banner.getAttribute('data-rate-key') || '', false);
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (closeDatePicker()) {
      ev.preventDefault();
      return;
    }
    if (openKey) {
      ev.preventDefault();
      closeAll(false);
    }
  });

  window.addEventListener('hashchange', syncHash);

  document.querySelectorAll('form.rate-form').forEach(bindForm);
  syncHash();
})();
