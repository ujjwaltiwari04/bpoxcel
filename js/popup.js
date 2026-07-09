/* =====================================================
   BPOXCEL Lead Generation Popup — Script
   Pure vanilla JS, no dependencies
   ===================================================== */
(function () {
  'use strict';

  // ── Guard: only run on homepage (index.html or root /) ──
  // Skip if popup was already dismissed this session or lead already submitted
  if (sessionStorage.getItem('bpoxcelPopupClosed')) return;
  if (localStorage.getItem('bpoxcelLeadSubmitted')) return;

  // ── Constants ──
  var POPUP_DELAY = 3000; // 3 seconds
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysk5nkKcTiu9i3luV8MacpiJMPrvGOob0LRpSlgumBAc0W-LRwqVNfOGdf1pXbN14ig/exec';
  var PHONE_REGEX = /^[\+]?[\d\s\-\(\)]{7,15}$/;
  var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ── Build DOM ──
  function createPopup() {
    // Overlay
    var overlay = document.createElement('div');
    overlay.className = 'bpx-popup-overlay';
    overlay.id = 'bpx-popup-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'bpx-popup-heading');
    overlay.setAttribute('aria-describedby', 'bpx-popup-subtitle');

    overlay.innerHTML =
      '<div class="bpx-popup" id="bpx-popup">' +
        '<button type="button" class="bpx-close-btn" id="bpx-close-btn" aria-label="Close popup">&times;</button>' +

        '<!-- Form View -->' +
        '<div id="bpx-form-view">' +
          '<h2 class="bpx-heading" id="bpx-popup-heading">Welcome! Let Us Help You \ud83d\ude0a</h2>' +
          '<p class="bpx-subtitle" id="bpx-popup-subtitle">Share your details and our recruitment team will contact you with suitable opportunities.</p>' +

          '<form id="bpx-lead-form" class="bpx-form" novalidate autocomplete="on">' +
            '<!-- Name -->' +
            '<div class="bpx-field">' +
              '<label class="bpx-label" for="bpx-name">Name <span class="bpx-required">*</span></label>' +
              '<input type="text" class="bpx-input" id="bpx-name" name="name" placeholder="Your full name" required autocomplete="name" />' +
              '<span class="bpx-error-msg" id="bpx-name-err">Please enter your name.</span>' +
            '</div>' +

            '<!-- Location -->' +
            '<div class="bpx-field">' +
              '<label class="bpx-label" for="bpx-location">Location <span class="bpx-required">*</span></label>' +
              '<input type="text" class="bpx-input" id="bpx-location" name="location" placeholder="City, State" required autocomplete="address-level2" />' +
              '<span class="bpx-error-msg" id="bpx-location-err">Please enter your location.</span>' +
            '</div>' +

            '<!-- Phone -->' +
            '<div class="bpx-field">' +
              '<label class="bpx-label" for="bpx-phone">Phone Number <span class="bpx-required">*</span></label>' +
              '<input type="tel" class="bpx-input" id="bpx-phone" name="phone" placeholder="+91 XXXXX XXXXX" required autocomplete="tel" />' +
              '<span class="bpx-error-msg" id="bpx-phone-err">Please enter a valid phone number.</span>' +
            '</div>' +

            '<!-- Email -->' +
            '<div class="bpx-field">' +
              '<label class="bpx-label" for="bpx-email">Email Address <span style="color:#94a3b8;font-weight:400;">(Optional)</span></label>' +
              '<input type="email" class="bpx-input" id="bpx-email" name="email" placeholder="you@example.com" autocomplete="email" />' +
              '<span class="bpx-error-msg" id="bpx-email-err">Please enter a valid email address.</span>' +
            '</div>' +

            '<!-- Looking For -->' +
            '<div class="bpx-field">' +
              '<label class="bpx-label" for="bpx-looking-for">Looking For <span class="bpx-required">*</span></label>' +
              '<div class="bpx-select-wrap">' +
                '<select class="bpx-select" id="bpx-looking-for" name="looking_for" required>' +
                  '<option value="" disabled selected>Select an option</option>' +
                  '<option value="Looking for a Job">Looking for a Job</option>' +
                  '<option value="Hiring Talent">Hiring Talent</option>' +
                  '<option value="Outsourcing Services">Outsourcing Services</option>' +
                  '<option value="AI Agents & Chatbots">AI Agents &amp; Chatbots</option>' +
                  '<option value="General Inquiry">General Inquiry</option>' +
                '</select>' +
              '</div>' +
              '<span class="bpx-error-msg" id="bpx-looking-err">Please select an option.</span>' +
            '</div>' +

            '<!-- Error Banner -->' +
            '<div class="bpx-form-error" id="bpx-form-error" role="alert">Something went wrong. Please try again.</div>' +

            '<!-- Privacy notice -->' +
            '<p style="text-align:center;font-size:11px;color:#94a3b8;margin:0;">\ud83d\udd12 Your information is secure and will only be used for recruitment purposes.</p>' +

            '<!-- Submit -->' +
            '<button type="submit" class="bpx-submit-btn" id="bpx-submit-btn">Submit Details</button>' +
          '</form>' +
        '</div>' +

        '<!-- Success View -->' +
        '<div id="bpx-success-view" style="display:none;">' +
          '<div class="bpx-success">' +
            '<div class="bpx-success-icon">✅</div>' +
            '<h3 class="bpx-success-title">Thank You!</h3>' +
            '<p class="bpx-success-text">' +
              'Thank you for submitting your details.<br>' +
              'Our recruitment team will contact you shortly.<br>' +
              'We look forward to helping you.' +
            '</p>' +
            '<a href="jobs.html" class="bpx-jobs-btn" id="bpx-jobs-btn">Apply for Jobs</a>' +
          '</div>' +
        '</div>' +

      '</div>';

    document.body.appendChild(overlay);
    return overlay;
  }

  // ── Lifecycle helpers ──
  var overlay, popup, closeBtn, firstFocusable, lastFocusable;

  function open() {
    overlay = createPopup();
    popup = document.getElementById('bpx-popup');
    closeBtn = document.getElementById('bpx-close-btn');

    // Lock body scroll
    document.body.classList.add('bpx-no-scroll');

    // Trigger animation on next frame
    requestAnimationFrame(function () {
      overlay.classList.add('bpx-active');
    });

    // Bind events
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', handleOverlayClick);
    document.addEventListener('keydown', handleKeyDown);

    // Set up form
    setupForm();

    // Focus management — focus first input after animation
    setTimeout(function () {
      var nameInput = document.getElementById('bpx-name');
      if (nameInput) nameInput.focus();
    }, 450);
  }

  function close() {
    if (!overlay) return;

    // Persist dismissal in sessionStorage
    sessionStorage.setItem('bpoxcelPopupClosed', 'true');

    overlay.classList.remove('bpx-active');
    document.body.classList.remove('bpx-no-scroll');

    // Remove from DOM after transition
    setTimeout(function () {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      overlay = null;
      popup = null;
    }, 400);

    // Unbind events
    document.removeEventListener('keydown', handleKeyDown);
  }

  function handleOverlayClick(e) {
    // Close only if clicking the overlay itself, not the popup
    if (e.target === overlay) {
      close();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      close();
      return;
    }

    // Trap focus inside popup
    if (e.key === 'Tab' && popup) {
      var focusableEls = popup.querySelectorAll(
        'button, input, select, a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusableEls.length === 0) return;

      firstFocusable = focusableEls[0];
      lastFocusable = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  }

  // ── Form logic ──
  function setupForm() {
    var form = document.getElementById('bpx-lead-form');
    var submitBtn = document.getElementById('bpx-submit-btn');
    var formError = document.getElementById('bpx-form-error');

    if (!form) return;

    // Clear error on input
    var inputs = form.querySelectorAll('input, select');
    for (var i = 0; i < inputs.length; i++) {
      (function (el) {
        var evtType = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(evtType, function () {
          el.classList.remove('bpx-error');
          var errId = el.id + '-err';
          // Map special case
          if (el.id === 'bpx-looking-for') errId = 'bpx-looking-err';
          var errEl = document.getElementById(errId);
          if (errEl) errEl.classList.remove('bpx-show');
        });
      })(inputs[i]);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var valid = true;
      formError.classList.remove('bpx-show');

      // Name
      var nameEl = document.getElementById('bpx-name');
      if (!nameEl.value.trim()) {
        showFieldError(nameEl, 'bpx-name-err');
        valid = false;
      }

      // Location
      var locEl = document.getElementById('bpx-location');
      if (!locEl.value.trim()) {
        showFieldError(locEl, 'bpx-location-err');
        valid = false;
      }

      // Phone
      var phoneEl = document.getElementById('bpx-phone');
      if (!phoneEl.value.trim() || !PHONE_REGEX.test(phoneEl.value.trim())) {
        showFieldError(phoneEl, 'bpx-phone-err');
        valid = false;
      }

      // Email (optional but validate format if filled)
      var emailEl = document.getElementById('bpx-email');
      if (emailEl.value.trim() && !EMAIL_REGEX.test(emailEl.value.trim())) {
        showFieldError(emailEl, 'bpx-email-err');
        valid = false;
      }

      // Looking For
      var lookingEl = document.getElementById('bpx-looking-for');
      if (!lookingEl.value) {
        showFieldError(lookingEl, 'bpx-looking-err');
        valid = false;
      }

      if (!valid) return;

      // ── Submit ──
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="bpx-spinner"></span> Submitting\u2026';

      var params = new URLSearchParams();
      params.append('name', nameEl.value.trim());
      params.append('location', locEl.value.trim());
      params.append('phone', phoneEl.value.trim());
      params.append('email', emailEl.value.trim());
      params.append('lookingFor', lookingEl.value);
      params.append('sourcePage', 'Homepage');

      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: params
      })
        .then(function () {
          document.getElementById('bpx-form-view').style.display = 'none';
          document.getElementById('bpx-success-view').style.display = 'block';

          // Persist so popup never appears again after successful submission
          localStorage.setItem('bpoxcelLeadSubmitted', 'true');

          // Focus the jobs button for accessibility
          var jobsBtn = document.getElementById('bpx-jobs-btn');
          if (jobsBtn) jobsBtn.focus();
        })
        .catch(function () {
          formError.classList.add('bpx-show');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Details';
        });
    });
  }

  function showFieldError(input, errMsgId) {
    input.classList.add('bpx-error');
    var errEl = document.getElementById(errMsgId);
    if (errEl) errEl.classList.add('bpx-show');
  }

  // ── Auto-trigger after delay ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(open, POPUP_DELAY);
    });
  } else {
    setTimeout(open, POPUP_DELAY);
  }
})();
