/* =====================================================
   BPOXCEL Job Application Form Logic & Google Apps Script Integration
   Pure Vanilla JS - No external dependencies required
   ===================================================== */

(function () {
  'use strict';

  // ── Google Apps Script Endpoint ──
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx_dlmeAX09S_oPBKwmZIj-bVHqBzIBy6ZDwjSiaV4LYeWUXamMUzoMT2PP3ynkmIHb/exec';

  // ── Source & Job URL Parameter Parsing ──
  function getUrlParams() {
    var searchParams = new URLSearchParams(window.location.search);
    
    // Parse source parameter (e.g., ?source=whatsapp, ?source=instagram, ?source=physical-resources)
    var rawSource = searchParams.get('source');
    var source = 'website'; // Default source
    if (rawSource && rawSource.trim() !== '') {
      source = rawSource.trim().toLowerCase();
    }

    // Parse job parameter (e.g., ?job=customer-support-001)
    var rawJob = searchParams.get('job');
    var job = ''; // Default job parameter
    if (rawJob && rawJob.trim() !== '') {
      job = rawJob.trim();
    }

    return {
      source: source,
      job: job
    };
  }

  var params = getUrlParams();

  // Expose captured parameters in global state for debugging & reference
  window.BPOXCEL_APPLICATION_STATE = {
    source: params.source,
    job: params.job
  };

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('apply-form');
    var formCard = document.getElementById('form-card');
    var successCard = document.getElementById('success-card');
    var submitBtn = document.getElementById('submit-btn');
    var submitBtnText = document.getElementById('submit-btn-text');
    var submitBtnSpinner = document.getElementById('submit-btn-spinner');
    var serverErrorBanner = document.getElementById('server-error-banner');

    // Experience conditional fields
    var priorExpYes = document.getElementById('exp-yes');
    var priorExpNo = document.getElementById('exp-no');
    var totalExpContainer = document.getElementById('total-exp-container');
    var totalExpSelect = document.getElementById('total-experience');

    // Inputs for validation
    var nameInput = document.getElementById('full-name');
    var phoneInput = document.getElementById('mobile-number');
    var emailInput = document.getElementById('email-address');
    var locationInput = document.getElementById('current-location');
    var qualSelect = document.getElementById('qualification');
    var availSelect = document.getElementById('notice-period');

    // ── Conditional Experience Field Handler ──
    function toggleExperienceField() {
      if (priorExpYes && priorExpYes.checked) {
        totalExpContainer.classList.remove('hidden');
        totalExpSelect.setAttribute('required', 'true');
      } else {
        totalExpContainer.classList.add('hidden');
        totalExpSelect.removeAttribute('required');
        totalExpSelect.value = '';
        clearFieldError(totalExpSelect, 'total-exp-err');
      }
    }

    if (priorExpYes && priorExpNo) {
      priorExpYes.addEventListener('change', toggleExperienceField);
      priorExpNo.addEventListener('change', toggleExperienceField);
    }

    // ── Validation Helpers ──
    function showError(inputEl, errorId, message) {
      if (inputEl) {
        inputEl.classList.add('border-red-400', 'focus:ring-red-400', 'bg-red-50/20');
        inputEl.classList.remove('border-gray-300', 'focus:ring-brand-cyan');
      }
      var errEl = document.getElementById(errorId);
      if (errEl) {
        if (message) errEl.textContent = message;
        errEl.classList.remove('hidden');
      }
    }

    function clearFieldError(inputEl, errorId) {
      if (inputEl) {
        inputEl.classList.remove('border-red-400', 'focus:ring-red-400', 'bg-red-50/20');
        inputEl.classList.add('border-gray-300', 'focus:ring-brand-cyan');
      }
      var errEl = document.getElementById(errorId);
      if (errEl) {
        errEl.classList.add('hidden');
      }
    }

    // Phone regex validation (Indian mobile number: optional +91, 10 digits starting with 6-9)
    function isValidIndianPhone(phoneStr) {
      var cleaned = phoneStr.replace(/[\s\-\(\)\+]/g, '');
      if (cleaned.startsWith('91') && cleaned.length === 12) {
        cleaned = cleaned.substring(2);
      }
      return /^[6-9]\d{9}$/.test(cleaned);
    }

    // Email regex validation
    function isValidEmail(emailStr) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
    }

    // Clear error highlights on user input
    var fieldsToClear = [
      { input: nameInput, err: 'name-err' },
      { input: phoneInput, err: 'phone-err' },
      { input: emailInput, err: 'email-err' },
      { input: locationInput, err: 'location-err' },
      { input: totalExpSelect, err: 'total-exp-err' },
      { input: qualSelect, err: 'qual-err' },
      { input: availSelect, err: 'avail-err' }
    ];

    fieldsToClear.forEach(function (item) {
      if (item.input) {
        item.input.addEventListener('input', function () {
          clearFieldError(item.input, item.err);
          if (serverErrorBanner) serverErrorBanner.classList.add('hidden');
        });
        item.input.addEventListener('change', function () {
          clearFieldError(item.input, item.err);
          if (serverErrorBanner) serverErrorBanner.classList.add('hidden');
        });
      }
    });

    if (priorExpYes && priorExpNo) {
      priorExpYes.addEventListener('change', function () {
        var errEl = document.getElementById('prior-exp-err');
        if (errEl) errEl.classList.add('hidden');
        if (serverErrorBanner) serverErrorBanner.classList.add('hidden');
      });
      priorExpNo.addEventListener('change', function () {
        var errEl = document.getElementById('prior-exp-err');
        if (errEl) errEl.classList.add('hidden');
        if (serverErrorBanner) serverErrorBanner.classList.add('hidden');
      });
    }

    // ── Form Submit Listener ──
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (serverErrorBanner) serverErrorBanner.classList.add('hidden');

        var isValid = true;
        var firstErrorField = null;

        // 1. Full Name
        var nameVal = nameInput ? nameInput.value.trim() : '';
        if (!nameVal) {
          showError(nameInput, 'name-err', 'Please enter your full name');
          isValid = false;
          if (!firstErrorField) firstErrorField = nameInput;
        } else {
          clearFieldError(nameInput, 'name-err');
        }

        // 2. Mobile Number
        var phoneVal = phoneInput ? phoneInput.value.trim() : '';
        if (!phoneVal) {
          showError(phoneInput, 'phone-err', 'Please enter your mobile number');
          isValid = false;
          if (!firstErrorField) firstErrorField = phoneInput;
        } else if (!isValidIndianPhone(phoneVal)) {
          showError(phoneInput, 'phone-err', 'Please enter a valid 10-digit Indian mobile number');
          isValid = false;
          if (!firstErrorField) firstErrorField = phoneInput;
        } else {
          clearFieldError(phoneInput, 'phone-err');
        }

        // 3. Email Address (Optional)
        var emailVal = emailInput ? emailInput.value.trim() : '';
        if (emailVal !== '' && !isValidEmail(emailVal)) {
          showError(emailInput, 'email-err', 'Please enter a valid email address');
          isValid = false;
          if (!firstErrorField) firstErrorField = emailInput;
        } else {
          clearFieldError(emailInput, 'email-err');
        }

        // 4. Current Location
        var locationVal = locationInput ? locationInput.value.trim() : '';
        if (!locationVal) {
          showError(locationInput, 'location-err', 'Please enter your current city/location');
          isValid = false;
          if (!firstErrorField) firstErrorField = locationInput;
        } else {
          clearFieldError(locationInput, 'location-err');
        }

        // 5. Any Prior Work Experience?
        var priorExpVal = '';
        if (priorExpYes && priorExpYes.checked) priorExpVal = 'YES';
        else if (priorExpNo && priorExpNo.checked) priorExpVal = 'NO';

        if (!priorExpVal) {
          var priorExpErr = document.getElementById('prior-exp-err');
          if (priorExpErr) priorExpErr.classList.remove('hidden');
          isValid = false;
          if (!firstErrorField) firstErrorField = priorExpYes;
        } else {
          var priorExpErr = document.getElementById('prior-exp-err');
          if (priorExpErr) priorExpErr.classList.add('hidden');
        }

        // 6. Total Experience (Required ONLY if Prior Experience is YES)
        var totalExpVal = totalExpSelect ? totalExpSelect.value : '';
        if (priorExpVal === 'YES' && !totalExpVal) {
          showError(totalExpSelect, 'total-exp-err', 'Please select your total experience');
          isValid = false;
          if (!firstErrorField) firstErrorField = totalExpSelect;
        } else {
          clearFieldError(totalExpSelect, 'total-exp-err');
        }

        // 7. Highest Qualification
        var qualVal = qualSelect ? qualSelect.value : '';
        if (!qualVal) {
          showError(qualSelect, 'qual-err', 'Please select your highest qualification');
          isValid = false;
          if (!firstErrorField) firstErrorField = qualSelect;
        } else {
          clearFieldError(qualSelect, 'qual-err');
        }

        // 8. Notice Period / Availability
        var availVal = availSelect ? availSelect.value : '';
        if (!availVal) {
          showError(availSelect, 'avail-err', 'Please select your notice period / availability');
          isValid = false;
          if (!firstErrorField) firstErrorField = availSelect;
        } else {
          clearFieldError(availSelect, 'avail-err');
        }

        if (!isValid) {
          if (firstErrorField && typeof firstErrorField.focus === 'function') {
            firstErrorField.focus();
          }
          return;
        }

        // Form is valid! Build application data payload object
        var applicationData = {
          name: nameVal,
          phone: phoneVal,
          email: emailVal,
          location: locationVal,
          priorExperience: priorExpVal,
          totalExperience: priorExpVal === 'YES' ? totalExpVal : '',
          qualification: qualVal,
          availability: availVal,
          source: params.source,
          job: params.job
        };

        // Visual loading state
        if (submitBtn) submitBtn.disabled = true;
        if (submitBtnText) submitBtnText.textContent = 'Submitting Application...';
        if (submitBtnSpinner) submitBtnSpinner.classList.remove('hidden');

        try {
          // If APPS_SCRIPT_URL is not set yet, fallback gracefully for local testing
          if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            console.warn('Apps Script URL is not configured yet. Simulating success for local preview.', applicationData);
            setTimeout(function () {
              if (formCard) formCard.classList.add('hidden');
              if (successCard) {
                successCard.classList.remove('hidden');
                successCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 600);
            return;
          }

          // Real fetch POST request to Google Apps Script Web App
          // Note: Avoid custom Content-Type header like application/json to prevent CORS preflight blocking in browsers
          var response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(applicationData)
          });

          var responseText = await response.text();
          var result = {};
          try {
            result = JSON.parse(responseText);
          } catch (jsonErr) {
            console.error('Non-JSON response received from Google Apps Script:', responseText);
            throw new Error('Server returned an invalid non-JSON response.');
          }

          if (result && result.success) {
            if (formCard) formCard.classList.add('hidden');
            if (successCard) {
              successCard.classList.remove('hidden');
              successCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          } else {
            throw new Error((result && result.message) || 'Unable to submit application. Please try again.');
          }

        } catch (err) {
          console.error('Application submission error:', err);
          
          // Reset button state
          if (submitBtn) submitBtn.disabled = false;
          if (submitBtnText) submitBtnText.textContent = 'Apply Now';
          if (submitBtnSpinner) submitBtnSpinner.classList.add('hidden');

          // Show server error message
          if (serverErrorBanner) {
            serverErrorBanner.textContent = 'Unable to submit your application right now. Please try again.';
            serverErrorBanner.classList.remove('hidden');
            serverErrorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      });
    }
  });
})();
