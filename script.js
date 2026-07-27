/* ==========================================================================
   Brookes AI — site behaviour
   Vanilla JS, no dependencies, no tracking.
   ========================================================================== */

/* ==========================================================================
   >>> CHECKOUT — THIS IS THE ONLY BIT YOU NEED TO EDIT <<<

   1. Create the product in Payhip and upload
      assets/brookes-ai-complete-course.pdf
   2. Payhip gives you a link like  https://payhip.com/b/AbCd1
      The bit after /b/ is your product ID — here, AbCd1
   3. Paste that ID between the quotes below. That's it.

   Every "Get the course" button on the site then opens the Payhip checkout
   as an overlay, so the buyer never leaves brookesai.com.

   While it's left empty, those buttons show a polite "not open yet" note
   rather than leading anyone to a dead end.
   ========================================================================== */
var PAYHIP_PRODUCT_ID = '';

/* Optional: if you ever move away from Payhip, put the full checkout URL here
   instead and it takes priority over the product ID above. */
var CHECKOUT_URL = '';


document.addEventListener('DOMContentLoaded', function () {

  /* ---- Wire up every buy button ---- */
  var buyButtons = document.querySelectorAll('[data-buy]');

  if (PAYHIP_PRODUCT_ID && !CHECKOUT_URL) {
    // Load Payhip's overlay script once, on demand.
    if (!document.getElementById('payhip-js')) {
      var s = document.createElement('script');
      s.id = 'payhip-js';
      s.src = 'https://payhip.com/payhip.js';
      s.async = true;
      document.head.appendChild(s);
    }
    buyButtons.forEach(function (el) {
      el.setAttribute('href', 'https://payhip.com/b/' + PAYHIP_PRODUCT_ID);
      el.classList.add('payhip-buy-button');
      el.setAttribute('data-product', PAYHIP_PRODUCT_ID);
      el.setAttribute('data-theme', 'none');   // keep our own button styling
    });

  } else if (CHECKOUT_URL) {
    buyButtons.forEach(function (el) { el.setAttribute('href', CHECKOUT_URL); });

  } else {
    // Nothing configured yet — fail politely instead of silently.
    buyButtons.forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var note = document.getElementById('buyNote');
        if (note) {
          note.hidden = false;
          note.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.location.href = 'contact.html';
        }
      });
    });
  }

  /* ---- Footer year ---- */
  document.querySelectorAll('#year').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---- Nav shadow on scroll ---- */
  var nav = document.getElementById('siteNav');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Mobile nav ---- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      toggle.innerHTML = isOpen ? '<i class="ph ph-x"></i>' : '<i class="ph ph-list"></i>';
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<i class="ph ph-list"></i>';
      });
    });
  }

  /* ---- FAQ: one open at a time, per list ---- */
  document.querySelectorAll('.faq-list').forEach(function (list) {
    var items = list.querySelectorAll('.faq-item');
    items.forEach(function (item) {
      item.addEventListener('toggle', function () {
        if (item.open) {
          items.forEach(function (other) {
            if (other !== item) other.open = false;
          });
        }
      });
    });
  });

  /* ---- Dismissible announcement bar ---- */
  var announce = document.getElementById('announceBar');
  var announceClose = document.getElementById('announceClose');
  if (announce) {
    try {
      if (localStorage.getItem('brookesai_banner') === 'closed') {
        announce.classList.add('hidden');
      }
    } catch (e) { /* storage unavailable — show the bar */ }

    if (announceClose) {
      announceClose.addEventListener('click', function () {
        announce.classList.add('hidden');
        try { localStorage.setItem('brookesai_banner', 'closed'); } catch (e) {}
      });
    }
  }

  /* ---- Free course progress ----
     Each lesson page sets data-lesson="1".."4" on <body>.
     We remember which lessons have been opened, and mark them on the hub. */
  var LESSONS_KEY = 'brookesai_lessons_done';

  function readProgress() {
    try {
      var raw = localStorage.getItem(LESSONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function writeProgress(list) {
    try { localStorage.setItem(LESSONS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  var thisLesson = document.body.getAttribute('data-lesson');
  if (thisLesson) {
    var done = readProgress();
    if (done.indexOf(thisLesson) === -1) {
      done.push(thisLesson);
      writeProgress(done);
    }
  }

  // Mark completed lessons on the hub page
  var progress = readProgress();
  document.querySelectorAll('[data-lesson-marker]').forEach(function (el) {
    var n = el.getAttribute('data-lesson-marker');
    if (progress.indexOf(n) !== -1) {
      el.classList.add('done');
      var badge = el.querySelector('[data-done-badge]');
      if (badge) badge.hidden = false;
    }
  });

  // Progress rail on lesson pages
  document.querySelectorAll('.progress-rail .seg').forEach(function (seg, i) {
    var current = parseInt(thisLesson || '0', 10);
    if (i + 1 <= current) seg.classList.add('done');
  });

  /* ---- Cheat sheet / notify email capture ----
     No backend on a static site. We confirm to the reader honestly and
     hand off to email so nothing is silently swallowed. */
  document.querySelectorAll('[data-capture]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var status = form.parentElement.querySelector('.form-status');
      var subject = form.getAttribute('data-capture') || 'Brookes AI';

      if (!input || !input.value.trim() || input.value.indexOf('@') === -1) {
        if (status) {
          status.textContent = 'That doesn’t look like an email address — could you check it?';
          status.className = 'form-status visible';
        }
        return;
      }

      var address = form.getAttribute('data-to') || 'hello@brookesai.com';
      var body = encodeURIComponent('Please send this to: ' + input.value.trim());
      window.location.href = 'mailto:' + address +
        '?subject=' + encodeURIComponent(subject) + '&body=' + body;

      if (status) {
        status.textContent = 'Opening your email app — just press send and I’ll get it over to you.';
        status.className = 'form-status visible ok';
      }
      form.reset();
    });
  });

  /* ---- Contact form ---- */
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('cf-name').value.trim();
      var email = document.getElementById('cf-email').value.trim();
      var message = document.getElementById('cf-message').value.trim();
      var status = document.getElementById('contactStatus');

      if (!name || !email || !message) {
        if (status) {
          status.textContent = 'Could you fill in your name, email and message before sending?';
          status.className = 'form-status visible';
        }
        return;
      }

      var subject = encodeURIComponent('Message from ' + name);
      var body = encodeURIComponent(message + '\n\n— ' + name + '\n' + email);
      window.location.href = 'mailto:hello@brookesai.com?subject=' + subject + '&body=' + body;

      if (status) {
        status.textContent = 'Opening your email app — press send and it’ll come straight to me.';
        status.className = 'form-status visible ok';
      }
    });
  }

  /* ---- Print button (cheat sheet) ---- */
  document.querySelectorAll('[data-print]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.print();
    });
  });

});
