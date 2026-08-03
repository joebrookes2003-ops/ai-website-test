/* ==========================================================================
   Brookes AI — site behaviour
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------------
     1. Current year in footer
     ------------------------------------------------------------------ */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------------------
     2. Sticky header shadow
     ------------------------------------------------------------------ */
  var header = $('#header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------
     3. Mobile navigation
     ------------------------------------------------------------------ */
  var toggle = $('#nav-toggle');
  var navLinks = $('#nav-links');

  if (toggle && navLinks) {
    var setNav = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      navLinks.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', function () {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Close when a link is followed
    navLinks.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setNav(false);
        toggle.focus();
      }
    });

    // Reset state if resized up to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 864) setNav(false);
    });
  }

  /* ------------------------------------------------------------------
     4. FAQ accordion
     ------------------------------------------------------------------ */
  $$('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (item) item.classList.toggle('is-open', !open);
    });
  });

  /* ------------------------------------------------------------------
     5. Scroll reveal
     ------------------------------------------------------------------ */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealables = $$('.reveal');

  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------
     6. Enquiry form
     ------------------------------------------------------------------ */
  var form = $('#enquiry-form');
  if (!form) return;

  var statusEl = $('#form-status');
  var submitBtn = $('#submit-btn');
  var btnLabel = submitBtn ? $('.btn-label', submitBtn) : null;
  var loadedAt = $('#loadedAt');

  // Timestamp so the server can reject sub-3-second bot submissions
  if (loadedAt) loadedAt.value = String(Date.now());

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var rules = {
    name:    function (v) { return v.trim().length >= 2; },
    company: function (v) { return v.trim().length >= 2; },
    email:   function (v) { return EMAIL_RE.test(v.trim()); },
    size:    function (v) { return v !== ''; },
    area:    function (v) { return v !== ''; },
    message: function (v) { return v.trim().length >= 15; }
  };

  var setFieldError = function (input, bad) {
    var field = input.closest('.field');
    if (field) field.classList.toggle('has-error', bad);
    if (bad) {
      input.setAttribute('aria-invalid', 'true');
      var errId = 'err-' + input.id;
      if (document.getElementById(errId)) input.setAttribute('aria-describedby', errId);
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  };

  var validateField = function (input) {
    var rule = rules[input.name];
    if (!rule) return true;
    var ok = rule(input.value);
    setFieldError(input, !ok);
    return ok;
  };

  // Re-validate a field once it has been touched and corrected
  Object.keys(rules).forEach(function (name) {
    var input = form.elements[name];
    if (!input) return;
    var evt = input.tagName === 'SELECT' ? 'change' : 'blur';
    input.addEventListener(evt, function () { validateField(input); });
    input.addEventListener('input', function () {
      if (input.closest('.field') && input.closest('.field').classList.contains('has-error')) {
        validateField(input);
      }
    });
  });

  var showStatus = function (message, ok) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'form-status is-visible ' + (ok ? 'is-ok' : 'is-bad');
  };

  var setBusy = function (busy) {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    if (btnLabel) btnLabel.textContent = busy ? 'Sending…' : 'Request my free audit';
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Validate everything, focus the first problem
    var firstBad = null;
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      if (!validateField(input) && !firstBad) firstBad = input;
    });

    if (firstBad) {
      showStatus('Please check the highlighted fields and try again.', false);
      firstBad.focus();
      return;
    }

    // Silent bot rejection
    if (form.elements.website && form.elements.website.value !== '') return;

    setBusy(true);
    if (statusEl) statusEl.className = 'form-status';

    var payload = {};
    new FormData(form).forEach(function (value, key) { payload[key] = value; });

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.data.error || 'Request failed');

        form.reset();
        $$('.field.has-error', form).forEach(function (f) { f.classList.remove('has-error'); });
        showStatus(
          'Thanks — your enquiry is with us. You\'ll hear back within one working day, ' +
          'usually sooner. If it\'s urgent, email hello@brookesai.com directly.',
          true
        );
        if (statusEl) statusEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      })
      .catch(function () {
        showStatus(
          'Something went wrong sending that. Please email hello@brookesai.com ' +
          'and we\'ll pick it up straight away.',
          false
        );
      })
      .then(function () {
        setBusy(false);
      });
  });
})();
