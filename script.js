// Brookes AI — shared site behaviour (vanilla JS, no dependencies)

document.addEventListener('DOMContentLoaded', function () {

  // Footer year
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Nav shadow on scroll
  var nav = document.getElementById('siteNav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 8);
    });
  }

  // Mobile nav toggle
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
      toggle.innerHTML = isOpen ? '<i class="ph ph-x"></i>' : '<i class="ph ph-list"></i>';
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', false);
        toggle.innerHTML = '<i class="ph ph-list"></i>';
      });
    });
  }

  // Only one FAQ item open at a time (per list)
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

  // Dismissible announcement bar (remembered via localStorage)
  var announce = document.getElementById('announceBar');
  var announceClose = document.getElementById('announceClose');
  if (announce) {
    if (localStorage.getItem('brookesai_banner_dismissed') === '1') {
      announce.classList.add('hidden');
    }
    if (announceClose) {
      announceClose.addEventListener('click', function () {
        announce.classList.add('hidden');
        localStorage.setItem('brookesai_banner_dismissed', '1');
      });
    }
  }

  // Contact form — builds a mailto link from the fields (no backend on this static site)
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
          status.textContent = 'Please fill in your name, email and message before sending.';
          status.className = 'form-status visible';
        }
        return;
      }

      var subject = encodeURIComponent('Website enquiry from ' + name);
      var body = encodeURIComponent(message + '\n\n— ' + name + ' (' + email + ')');
      var mailto = 'mailto:hello@brookesai.co.uk?subject=' + subject + '&body=' + body;

      if (status) {
        status.textContent = 'Opening your email app to send this message…';
        status.className = 'form-status visible ok';
      }
      window.location.href = mailto;
    });
  }

  // "Get notified" forms on coming-soon courses — client-side only confirmation
  document.querySelectorAll('.notify-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var status = form.parentElement.querySelector('.form-status');
      if (input && status) {
        if (!input.value.trim()) {
          status.textContent = 'Please enter your email address.';
          status.className = 'form-status visible';
          return;
        }
        status.textContent = 'Thanks — we\'ll let you know as soon as this course launches.';
        status.className = 'form-status visible ok';
        form.reset();
      }
    });
  });

});
