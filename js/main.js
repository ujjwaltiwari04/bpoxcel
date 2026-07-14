// Scroll spy logic for homepage navigation active states
const spySections = ['home', 'services'].map(id => document.getElementById(id)).filter(el => el !== null);
const spyDesktopLinks = document.querySelectorAll('nav:not(#nav-menu) a[href^="#"]');
const spyMobileLinks = document.querySelectorAll('nav#nav-menu a[href^="#"]');

if (spySections.length > 0) {
  const handleScrollSpy = () => {
    let activeId = 'home';
    const scrollPos = window.scrollY + 120; // Offset for navbar height

    spySections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        activeId = sec.getAttribute('id');
      }
    });

    // Update Desktop nav classes
    spyDesktopLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${activeId}`) {
        link.classList.add('active', 'text-brand-cyan');
        link.classList.remove('text-gray-700');
      } else {
        link.classList.remove('active', 'text-brand-cyan');
        link.classList.add('text-gray-700');
      }
    });

    // Update Mobile nav classes
    spyMobileLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${activeId}`) {
        link.classList.add('text-brand-cyan', 'font-semibold');
        link.classList.remove('text-gray-700', 'font-medium');
      } else {
        link.classList.remove('text-brand-cyan', 'font-semibold');
        link.classList.add('text-gray-700', 'font-medium');
      }
    });
  };

  window.addEventListener('scroll', handleScrollSpy);
  handleScrollSpy(); // Run initially
}

// Form submission AJAX handler (using Formspree)
const form = document.getElementById('contact-form');
const success = document.getElementById('form-success');
const errorBanner = document.getElementById('form-error');
const btn = document.getElementById('submit-btn');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const required = form.querySelectorAll('[required]');
    let valid = true;
    
    // Check required fields
    required.forEach(el => {
      if (!el.value.trim()) {
        el.style.borderColor = '#f87171';
        valid = false;
      } else {
        el.style.borderColor = '';
      }
    });

    // Validate email format if populated
    const emailEl = form.querySelector('input[name="email"]');
    if (emailEl && emailEl.value.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailEl.value.trim())) {
        emailEl.style.borderColor = '#f87171';
        valid = false;
      } else {
        emailEl.style.borderColor = '';
      }
    }

    if (!valid) return;

    // Reset status banners
    if (success) { success.classList.add('hidden'); success.style.display = ''; }
    if (errorBanner) { errorBanner.classList.add('hidden'); errorBanner.style.display = ''; }

    btn.textContent = 'Sending…';
    btn.disabled = true;

    try {
      const data = new FormData(form);
      const res = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        form.reset();
        if (success) {
          success.classList.remove('hidden');
          success.style.display = 'flex';
          setTimeout(() => {
            success.classList.add('hidden');
            success.style.display = '';
          }, 6000);
        }
      } else {
        throw new Error('Form submission failed');
      }
    } catch (_) {
      if (errorBanner) {
        errorBanner.classList.remove('hidden');
        errorBanner.style.display = 'flex';
        setTimeout(() => {
          errorBanner.classList.add('hidden');
          errorBanner.style.display = '';
        }, 6000);
      }
    }

    btn.textContent = 'Send Message';
    btn.disabled = false;
  });

  form.querySelectorAll('input,textarea').forEach(el => {
    el.addEventListener('input', () => { el.style.borderColor = ''; });
  });
  form.querySelectorAll('select').forEach(el => {
    el.addEventListener('change', () => { el.style.borderColor = ''; });
  });
}

// Counter animation for stats
document.addEventListener('DOMContentLoaded', () => {
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1200;
    const start = performance.now();
    const suffix = el.dataset.suffix || '';
    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.floor(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));
});

// Premium Job Application Popup Handler
(function () {
  'use strict';

  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymry09A-4-LJQzIzVnAeylTBItA5KPCL8hA6YN4Ax9TPapKA2bBHldyojegq2Scs7c/exec';
  var PHONE_REGEX = /^[\+]?[\d\s\-\(\)]{7,15}$/;
  var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Intercept apply-btn clicks
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.apply-btn');
    if (!btn) return;

    var url = btn.getAttribute('href');
    // Only intercept if it's a Google Form application link or we are on a jobs page
    if (url && (url.includes('docs.google.com/forms') || window.location.pathname.includes('jobs'))) {
      e.preventDefault();

      // Dynamically load CSS if not present
      if (!document.getElementById('bpx-popup-css-link')) {
        var link = document.createElement('link');
        link.id = 'bpx-popup-css-link';
        link.rel = 'stylesheet';
        var isBlog = window.location.pathname.includes('/blog/');
        link.href = isBlog ? '../css/popup.min.css' : 'css/popup.min.css';
        document.head.appendChild(link);
      }

      // Find Job ID from card
      var card = btn.closest('article');
      var jobNo = 'General Application';
      if (card) {
        var jobNumEl = card.querySelector('.job-number');
        if (jobNumEl) {
          var match = jobNumEl.textContent.match(/Job\s+No:\s*(.+)/i);
          if (match && match[1]) {
            jobNo = match[1].trim();
          } else {
            jobNo = jobNumEl.textContent.replace(/Job\s+No:/i, '').trim();
          }
        }
      }

      openApplyPopup(jobNo);
    }
  });

  function openApplyPopup(jobNo) {
    // Prevent duplicate popups
    if (document.getElementById('bpx-job-overlay')) return;

    // Lock body scroll
    document.body.classList.add('bpx-no-scroll');

    // Create DOM structure
    var overlay = document.createElement('div');
    overlay.className = 'bpx-popup-overlay';
    overlay.id = 'bpx-job-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'bpx-job-heading');
    overlay.setAttribute('aria-describedby', 'bpx-job-subtitle');

    overlay.innerHTML =
      '<div class="bpx-popup" id="bpx-job-popup">' +
        '<button type="button" class="bpx-close-btn" id="bpx-job-close-btn" aria-label="Close popup">&times;</button>' +

        '<!-- Form View -->' +
        '<div id="bpx-job-form-view">' +
          '<h2 class="bpx-heading" id="bpx-job-heading">Let\'s complete your Job Application.</h2>' +
          '<p class="bpx-subtitle" id="bpx-job-subtitle">Fill the details given below to proceed with your Job Application.</p>' +

          '<form id="bpx-job-form" class="bpx-form" novalidate autocomplete="on">' +
            '<!-- Name -->' +
            '<div class="bpx-field">' +
              '<label class="bpx-label" for="bpx-job-name">Name <span class="bpx-required">*</span></label>' +
              '<input type="text" class="bpx-input" id="bpx-job-name" name="name" placeholder="Your full name" required autocomplete="name" />' +
              '<span class="bpx-error-msg" id="bpx-job-name-err">Please enter your name.</span>' +
            '</div>' +

            '<!-- Location -->' +
            '<div class="bpx-field">' +
              '<label class="bpx-label" for="bpx-job-location">Location <span class="bpx-required">*</span></label>' +
              '<input type="text" class="bpx-input" id="bpx-job-location" name="location" placeholder="City, State" required autocomplete="address-level2" />' +
              '<span class="bpx-error-msg" id="bpx-job-location-err">Please enter your location.</span>' +
            '</div>' +

            '<!-- Phone -->' +
            '<div class="bpx-field">' +
              '<label class="bpx-label" for="bpx-job-phone">Phone Number <span class="bpx-required">*</span></label>' +
              '<input type="tel" class="bpx-input" id="bpx-job-phone" name="phone" placeholder="+91 XXXXX XXXXX" required autocomplete="tel" />' +
              '<span class="bpx-error-msg" id="bpx-job-phone-err">Please enter a valid phone number.</span>' +
            '</div>' +

            '<!-- Email -->' +
            '<div class="bpx-field">' +
              '<label class="bpx-label" for="bpx-job-email">Email Address <span style="color:#94a3b8;font-weight:400;">(Optional)</span></label>' +
              '<input type="email" class="bpx-input" id="bpx-job-email" name="email" placeholder="you@example.com" autocomplete="email" />' +
              '<span class="bpx-error-msg" id="bpx-job-email-err">Please enter a valid email address.</span>' +
            '</div>' +

            '<!-- Looking For -->' +
            '<div class="bpx-field">' +
              '<label class="bpx-label" for="bpx-job-looking">Looking For <span class="bpx-required">*</span></label>' +
              '<input type="text" class="bpx-input" id="bpx-job-looking" name="looking_for" value="' + jobNo + '" readonly style="background:#f1f5f9;color:#64748b;font-weight:600;cursor:not-allowed;" />' +
            '</div>' +

            '<!-- Error Banner -->' +
            '<div class="bpx-form-error" id="bpx-job-form-error" role="alert">Something went wrong. Please try again.</div>' +

            '<!-- Privacy notice -->' +
            '<p style="text-align:center;font-size:11px;color:#94a3b8;margin:0;">🔒 Your information is secure and will only be used for recruitment purposes.</p>' +

            '<!-- Submit -->' +
            '<button type="submit" class="bpx-submit-btn" id="bpx-job-submit-btn">Submit Application</button>' +
          '</form>' +
        '</div>' +

        '<!-- Success View -->' +
        '<div id="bpx-job-success-view" style="display:none;">' +
          '<div class="bpx-success">' +
            '<div class="bpx-success-icon">✅</div>' +
            '<h3 class="bpx-success-title">Application Submitted!</h3>' +
            '<p class="bpx-success-text">' +
              'Thank you for applying.<br>' +
              'Our recruitment team will review your profile and contact you shortly.' +
            '</p>' +
            '<button type="button" class="bpx-jobs-btn" id="bpx-job-close-success-btn">Close</button>' +
          '</div>' +
        '</div>' +

      '</div>';

    document.body.appendChild(overlay);

    // Fade-in animation
    requestAnimationFrame(function () {
      overlay.classList.add('bpx-active');
    });

    // Close buttons and overlay clicks
    var closeBtn = document.getElementById('bpx-job-close-btn');
    closeBtn.addEventListener('click', closePopup);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePopup();
    });

    // ESC key press to close
    var handleKeyDown = function (e) {
      if (e.key === 'Escape') {
        closePopup();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Setup Form validation and submission
    var form = document.getElementById('bpx-job-form');
    var submitBtn = document.getElementById('bpx-job-submit-btn');
    var formError = document.getElementById('bpx-job-form-error');

    // Clear errors on input
    var inputs = form.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) {
      (function (inputEl) {
        inputEl.addEventListener('input', function () {
          inputEl.classList.remove('bpx-error');
          var errEl = document.getElementById(inputEl.id + '-err');
          if (errEl) errEl.classList.remove('bpx-show');
        });
      })(inputs[i]);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      formError.classList.remove('bpx-show');

      var valid = true;

      // Validate Name
      var nameEl = document.getElementById('bpx-job-name');
      if (!nameEl.value.trim()) {
        showFieldError(nameEl, 'bpx-job-name-err');
        valid = false;
      }

      // Validate Location
      var locEl = document.getElementById('bpx-job-location');
      if (!locEl.value.trim()) {
        showFieldError(locEl, 'bpx-job-location-err');
        valid = false;
      }

      // Validate Phone
      var phoneEl = document.getElementById('bpx-job-phone');
      if (!phoneEl.value.trim() || !PHONE_REGEX.test(phoneEl.value.trim())) {
        showFieldError(phoneEl, 'bpx-job-phone-err');
        valid = false;
      }

      // Validate Email (optional)
      var emailEl = document.getElementById('bpx-job-email');
      if (emailEl.value.trim() && !EMAIL_REGEX.test(emailEl.value.trim())) {
        showFieldError(emailEl, 'bpx-job-email-err');
        valid = false;
      }

      if (!valid) return;

      // Submit form
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="bpx-spinner"></span> Submitting\u2026';

      var payload = {
        name: nameEl.value.trim(),
        location: locEl.value.trim(),
        phone: phoneEl.value.trim(),
        email: emailEl.value.trim(),
        lookingFor: 'Job ID: ' + jobNo,
        looking_for: 'Job ID: ' + jobNo, // Dual key for backend compatibility
        sourcePage: 'Job Board - ' + (window.location.pathname.split('/').pop() || 'JobsPage')
      };

      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
        .then(function () {
          document.getElementById('bpx-job-form-view').style.display = 'none';
          document.getElementById('bpx-job-success-view').style.display = 'block';

          var successCloseBtn = document.getElementById('bpx-job-close-success-btn');
          successCloseBtn.focus();
          successCloseBtn.addEventListener('click', closePopup);
        })
        .catch(function () {
          formError.classList.add('bpx-show');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Application';
        });
    });

    function showFieldError(input, errMsgId) {
      input.classList.add('bpx-error');
      var errEl = document.getElementById(errMsgId);
      if (errEl) errEl.classList.add('bpx-show');
    }

    function closePopup() {
      overlay.classList.remove('bpx-active');
      document.body.classList.remove('bpx-no-scroll');
      document.removeEventListener('keydown', handleKeyDown);

      setTimeout(function () {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 400);
    }

    // Focus first input
    setTimeout(function () {
      var nameEl = document.getElementById('bpx-job-name');
      if (nameEl) nameEl.focus();
    }, 450);
  }
})();

