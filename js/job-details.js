/* =====================================================
   BPOXCEL Job Details Page Script - Premium Dynamic Edition
   - Fetches live job data uniquely from Google Sheets (JobsDatabase)
   - Accurately matches clicked job by JobNo, slug, or role
   - Professional styling matching BPOXCEL design system
   - No emojis: uses clean theme SVG icons
   - Pop-up application modal with lead sync to Google Apps Script
   - Direct WhatsApp apply integration
   - Real-time Google Jobs schema generator
   ===================================================== */

(function () {
  'use strict';

  // ── Endpoints ──
  var SPREADSHEET_ID = '1B96_0hldq1BLyAsoyWmpIO5TTDmuDgt43MKzb_vIuIY';
  var SHEET_NAME     = 'JobsDatabase';
  var CSV_URL        = 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(SHEET_NAME);
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwl6JxvEgx2ACSnGp3FmKYTzqD5GVbVTI73LDLeZ9hcLKj47vX4tKCWmk8fOFnpA8_i/exec';

  var PHONE_REGEX = /^[\+]?[\d\s\-\(\)]{7,15}$/;
  var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var SUBMISSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (1 week)
  var COOKIE_NAME = 'bpoxcel_lead_submitted';
  var STORAGE_KEY = 'bpoxcelLeadSubmitted';
  var STORAGE_TIME_KEY = 'bpoxcelLeadSubmittedAt';

  function getScopedKeys(jobKey) {
    var suffix = (jobKey ? String(jobKey).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'general') || 'general';
    return {
      key: 'bpoxcelJobSubmitted_' + suffix,
      timeKey: 'bpoxcelJobSubmittedAt_' + suffix
    };
  }

  function hasAlreadySubmitted(jobKey) {
    var scoped = getScopedKeys(jobKey);
    try {
      var submitted = localStorage.getItem(scoped.key) || sessionStorage.getItem(scoped.key);
      var submittedAt = parseInt(localStorage.getItem(scoped.timeKey) || sessionStorage.getItem(scoped.timeKey) || '0', 10);
      if (submitted === 'true') {
        if (submittedAt > 0) {
          if (Date.now() - submittedAt < SUBMISSION_TTL_MS) {
            return true;
          } else {
            localStorage.removeItem(scoped.key);
            localStorage.removeItem(scoped.timeKey);
            sessionStorage.removeItem(scoped.key);
            sessionStorage.removeItem(scoped.timeKey);
            return false;
          }
        } else {
          var nowStr = String(Date.now());
          localStorage.setItem(scoped.timeKey, nowStr);
          sessionStorage.setItem(scoped.timeKey, nowStr);
          return true;
        }
      }
    } catch (e) {}

    return false;
  }

  function markAsSubmitted(jobKey) {
    var now = Date.now();
    var scoped = getScopedKeys(jobKey);
    try {
      var expires = new Date(now + SUBMISSION_TTL_MS).toUTCString();
      document.cookie = COOKIE_NAME + '=true; expires=' + expires + '; max-age=604800; path=/; SameSite=Lax';
    } catch (e) {}
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      sessionStorage.setItem(STORAGE_TIME_KEY, String(now));
      sessionStorage.setItem(scoped.key, 'true');
      sessionStorage.setItem(scoped.timeKey, String(now));
    } catch (e) {}
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(STORAGE_TIME_KEY, String(now));
      localStorage.setItem(scoped.key, 'true');
      localStorage.setItem(scoped.timeKey, String(now));
    } catch (e) {}
  }

  var currentJob = null;
  var allActiveJobs = [];

  // ── Utility Functions ──
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Inserts zero-width spaces after slashes and commas without spaces
   * so long compound strings (e.g. "Btech/Engineering/Science/Cibil/Environmental/Mechanical")
   * wrap cleanly at borders instead of overflowing.
   */
  function allowWrap(str) {
    if (!str) return '';
    return String(str)
      .replace(/\/(?=[^\s])/g, '/\u200B')
      .replace(/,(?=[^\s])/g, ',\u200B');
  }

  function getValue(job, key, defaultValue) {
    defaultValue = defaultValue === undefined ? '' : defaultValue;
    if (!job) return defaultValue;
    var targetKey = key.toLowerCase().replace(/[\s\-_.]/g, '');
    var actualKey = Object.keys(job).find(function (k) {
      return k.toLowerCase().replace(/[\s\-_.]/g, '') === targetKey;
    });
    if (actualKey !== undefined && job[actualKey] !== undefined) {
      var val = job[actualKey];
      return typeof val === 'string' ? val.trim() : val;
    }
    return defaultValue;
  }

  function formatSalary(salary) {
    if (!salary) return 'Best in Industry';
    var s = String(salary).trim();
    s = s.replace(/^\?+/, '₹').replace(/\s*\?+/g, ' ₹').replace(/\?/g, '₹');
    if (!s.includes('₹') && !/inr|rs/i.test(s) && /\d/.test(s)) {
      s = '₹' + s;
    }
    return s;
  }

  function safeParseDate(dateStr) {
    if (!dateStr) return new Date(0);
    var cleaned = String(dateStr).trim();
    if (!cleaned) return new Date(0);

    var isoRegex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
    var match = cleaned.match(isoRegex);
    if (match) {
      var y = parseInt(match[1], 10);
      var m = parseInt(match[2], 10) - 1;
      var d = parseInt(match[3], 10);
      var date = new Date(y, m, d);
      return isNaN(date.getTime()) ? new Date(0) : date;
    }

    var slashRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
    match = cleaned.match(slashRegex);
    if (match) {
      var part1 = parseInt(match[1], 10);
      var part2 = parseInt(match[2], 10);
      var year = parseInt(match[3], 10);
      var day, month;
      if (part1 > 12) {
        day = part1;
        month = part2 - 1;
      } else {
        month = part1 - 1;
        day = part2;
      }
      var dt = new Date(year, month, day);
      return isNaN(dt.getTime()) ? new Date(0) : dt;
    }

    var dObj = new Date(cleaned);
    return isNaN(dObj.getTime()) ? new Date(0) : dObj;
  }

  /**
   * Executive Parser for Job Description
   * Converts multi-line text, lists, and section headers into structured HTML
   * Uses theme SVG icons instead of emojis
   */
  function formatJobDescription(text) {
    if (!text) return '<p class="text-gray-500">Please submit your application below for complete job details and screening.</p>';

    var cleaned = String(text).trim();
    // Separate inline concatenated section titles and key-value bullets
    cleaned = cleaned.replace(/(3D Modeling & Virtual Design)(?=[A-Z])/gi, '$1\n');
    cleaned = cleaned.replace(/\.([A-Z][A-Za-z0-9\s&\/\(\)\-]{3,35}:\s)/g, '.\n$1');

    var lines = cleaned.split(/\r?\n/);
    var html = '';
    var inList = false;

    var headerKeywords = [
      'requirements', 'key responsibilities', 'responsibilities',
      'role summary', 'job summary', 'what we\'re looking for', 'what we are looking for',
      'what we offer', 'required skills', 'preferred candidate profile',
      'eligibility criteria', 'qualifications', 'perks and benefits',
      'about the role', 'key skills', 'duties & responsibilities',
      'education & skills', '3d modeling & virtual design', 'shifts & schedule', 'shifts'
    ];

    for (var i = 0; i < lines.length; i++) {
      var rawLine = lines[i].trim();
      if (!rawLine) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        continue;
      }

      // Remove artifacts like question marks or emoji leftovers
      var lineClean = rawLine.replace(/^[?\uFFFD]{1,4}\s*/, '').trim();
      var lower = lineClean.toLowerCase();

      // Check for section headers
      var isHeader = headerKeywords.some(function (kw) {
        return lower === kw || lower === kw + ':' || lower.startsWith(kw + ' -') || lower.startsWith(kw + ':');
      });

      if (isHeader) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += '<h3 class="text-base sm:text-lg font-bold text-gray-900 mt-7 mb-3.5 flex items-center gap-2.5 border-l-3 border-brand-cyan pl-3 break-words">' +
                escapeHTML(allowWrap(lineClean)) +
                '</h3>';
        continue;
      }

      // Check for list items or key: value pairs
      var isBullet = /^[\-\*\•\–\?]\s*/.test(lineClean);
      var isNumbered = /^\d+[\.\)]\s*/.test(lineClean);
      var isKeyVal = /^[A-Z][A-Za-z0-9\s\(\)\/&,\-\–]{2,45}:\s+/.test(lineClean);

      if (isBullet || isNumbered || isKeyVal) {
        if (!inList) {
          html += '<ul class="space-y-2.5 my-3.5 text-sm text-gray-600 pl-1">';
          inList = true;
        }
        var content = lineClean.replace(/^[\-\*\•\–\?]\s*/, '').replace(/^\d+[\.\)]\s*/, '');
        if (isKeyVal) {
          var colonIdx = content.indexOf(':');
          if (colonIdx > 0) {
            var k = content.substring(0, colonIdx).trim();
            var v = content.substring(colonIdx + 1).trim();
            content = '<strong class="text-gray-900 font-semibold">' + escapeHTML(allowWrap(k)) + ':</strong> ' + escapeHTML(allowWrap(v));
          } else {
            content = escapeHTML(allowWrap(content));
          }
        } else {
          content = escapeHTML(allowWrap(content));
        }

        html += '<li class="flex items-start gap-3">' +
                '<span class="w-1.5 h-1.5 rounded-full bg-brand-cyan mt-2 flex-shrink-0"></span>' +
                '<div class="leading-relaxed min-w-0 break-words" style="overflow-wrap: anywhere; word-break: break-word;">' + content + '</div>' +
                '</li>';
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += '<p class="text-sm text-gray-600 leading-relaxed mb-4 break-words" style="overflow-wrap: anywhere; word-break: break-word;">' + escapeHTML(allowWrap(lineClean)) + '</p>';
      }
    }

    if (inList) {
      html += '</ul>';
    }

    return html;
  }

  /**
   * Production-grade CSV Parser
   * Robust handling of quoted newlines, escaped quotes, and duplicate header names (e.g. Location)
   */
  function parseCSV(csvText) {
    var result = [];
    var row = [''];
    var inQuotes = false;
    var i = 0;
    var len = csvText.length;

    while (i < len) {
      var char = csvText[i];
      var nextChar = csvText[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            row[row.length - 1] += '"';
            i += 2;
            continue;
          } else {
            inQuotes = false;
          }
        } else {
          row[row.length - 1] += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          row.push('');
        } else if (char === '\r' || char === '\n') {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          result.push(row);
          row = [''];
        } else {
          row[row.length - 1] += char;
        }
      }
      i++;
    }
    if (row.length > 1 || row[0] !== '') {
      result.push(row);
    }
    if (result.length === 0) return [];

    var seenHeaders = {};
    var rawHeaders = result[0].map(function (h) {
      var trimmed = h.trim();
      var lower = trimmed.toLowerCase();
      if (seenHeaders[lower] !== undefined) {
        seenHeaders[lower]++;
        return trimmed + '_duplicate';
      } else {
        seenHeaders[lower] = 1;
        return trimmed;
      }
    });

    var dataRows = result.slice(1);
    return dataRows.map(function (dataRow) {
      var obj = {};
      rawHeaders.forEach(function (header, index) {
        obj[header] = dataRow[index] !== undefined ? dataRow[index] : '';
      });
      return obj;
    });
  }

  // ── Read URL Query Parameter / Slug / Hash ──
  function getRequestedJobId() {
    // 1. URL Query Parameters (?id=..., ?job=..., ?jobNo=..., ?role=...)
    var params = new URLSearchParams(window.location.search);
    var rawId = params.get('id') || params.get('job') || params.get('jobNo') || params.get('job_no') || params.get('role') || '';

    // 2. Hash fragment (#BP101 or #id=BP101)
    if (!rawId && window.location.hash) {
      var hash = window.location.hash.replace(/^#/, '').trim();
      if (hash.includes('=')) {
        var hParams = new URLSearchParams(hash);
        rawId = hParams.get('id') || hParams.get('job') || '';
      } else {
        rawId = hash;
      }
    }

    // 3. Pathname matching (e.g. /job/bp101 or /job/bp101.html)
    if (!rawId && window.location.pathname) {
      var pathMatch = window.location.pathname.match(/\/job\/([^\/\.]+)/i);
      if (pathMatch && pathMatch[1] && pathMatch[1].toLowerCase() !== 'details') {
        rawId = pathMatch[1];
      }
    }

    // 4. sessionStorage fallback (single-use from card click)
    if (!rawId) {
      try {
        var stored = sessionStorage.getItem('bpoxcel_selected_job_id');
        if (stored) {
          rawId = stored;
          sessionStorage.removeItem('bpoxcel_selected_job_id');
        }
      } catch (e) {}
    }

    // 5. localStorage fallback (only if clicked within last 60 seconds)
    if (!rawId) {
      try {
        var localVal = localStorage.getItem('bpoxcel_selected_job_id');
        var localTime = parseInt(localStorage.getItem('bpoxcel_selected_job_time') || '0', 10);
        if (localVal && (Date.now() - localTime < 60000)) {
          rawId = localVal;
          localStorage.removeItem('bpoxcel_selected_job_id');
        }
      } catch (e) {}
    }

    return rawId ? decodeURIComponent(rawId).trim() : '';
  }

  // ── Fetch and Load Job Details ──
  async function loadJobDetails() {
    var loadingEl = document.getElementById('job-loading');
    var contentEl = document.getElementById('job-content');
    var errorEl   = document.getElementById('job-not-found');

    var targetId = getRequestedJobId();

    try {
      if (loadingEl) loadingEl.classList.remove('hidden');
      if (contentEl) contentEl.classList.add('hidden');
      if (errorEl)   errorEl.classList.add('hidden');

      var response = await fetch(CSV_URL);
      if (!response.ok) throw new Error('HTTP error ' + response.status);

      var csvText = await response.text();
      var rows = parseCSV(csvText);

      allActiveJobs = rows.filter(function (job) {
        var status = getValue(job, 'Status', '').trim().toLowerCase();
        return status === 'open' || status === 'urgent' || status === 'active' || status === 'hot';
      });

      if (allActiveJobs.length === 0) {
        throw new Error('No active jobs available in database');
      }

      currentJob = null;

      if (targetId) {
        var targetClean = targetId.toLowerCase().trim();
        var targetNorm  = targetClean.replace(/[\s\-_.]/g, '');

        // Match 1: Exact or normalized JobNo (BP101, bp101, bp-101, bp 101)
        currentJob = allActiveJobs.find(function (job) {
          var jNo = (getValue(job, 'JobNo') || getValue(job, 'Job No') || getValue(job, 'Job ID')).toLowerCase().trim();
          var jNoNorm = jNo.replace(/[\s\-_.]/g, '');
          return jNo && (jNo === targetClean || jNoNorm === targetNorm);
        });

        // Match 2: Exact normalized Role title
        if (!currentJob) {
          currentJob = allActiveJobs.find(function (job) {
            var jRole = getValue(job, 'Role').toLowerCase().trim();
            var jRoleNorm = jRole.replace(/[\s\-_.]/g, '');
            return jRole && (jRole === targetClean || jRoleNorm === targetNorm);
          });
        }

        // Match 3: Numeric index (e.g. ?id=0 or ?id=1)
        if (!currentJob && /^\d+$/.test(targetClean)) {
          var idx = parseInt(targetClean, 10);
          if (idx >= 0 && idx < allActiveJobs.length) {
            currentJob = allActiveJobs[idx];
          }
        }

        // Match 4: Specific substring match on Role (minimum 5 chars to avoid greedy short words)
        if (!currentJob && targetClean.length >= 5) {
          currentJob = allActiveJobs.find(function (job) {
            var jRole = getValue(job, 'Role').toLowerCase().trim();
            return jRole && (jRole.includes(targetClean) || targetClean.includes(jRole));
          });
        }
      }

      // If still not matched, check if we have active jobs to show as fallback
      if (!currentJob) {
        if (!targetId && allActiveJobs.length > 0) {
          // If user landed on job-details.html with no ID at all, show the first open role
          currentJob = allActiveJobs[0];
        } else {
          // Requested ID was not found: show clean Not Found view with alternatives
          if (loadingEl) loadingEl.classList.add('hidden');
          if (errorEl)   errorEl.classList.remove('hidden');
          renderRelatedJobsFallback(allActiveJobs.slice(0, 6));
          return;
        }
      }

      // Render the current job
      renderJob(currentJob);

      // Render related jobs matching department or location
      var currentJobNo = getValue(currentJob, 'JobNo');
      var currentCat = (getValue(currentJob, 'Industry') || getValue(currentJob, 'Category')).toLowerCase();
      var related = allActiveJobs.filter(function (j) {
        return getValue(j, 'JobNo') !== currentJobNo;
      });

      // Sort by same category first
      related.sort(function (a, b) {
        var catA = (getValue(a, 'Industry') || getValue(a, 'Category')).toLowerCase();
        var catB = (getValue(b, 'Industry') || getValue(b, 'Category')).toLowerCase();
        if (catA === currentCat && catB !== currentCat) return -1;
        if (catB === currentCat && catA !== currentCat) return 1;
        return 0;
      });

      renderRelatedJobs(related.slice(0, 3));

      // Hide loading, show content
      if (loadingEl) loadingEl.classList.add('hidden');
      if (contentEl) contentEl.classList.remove('hidden');

      // Setup dynamic Google Jobs schema
      injectJobSchema(currentJob);

    } catch (err) {
      console.error('BPOXCEL Job Details Error:', err);
      if (loadingEl) loadingEl.classList.add('hidden');
      if (errorEl)   errorEl.classList.remove('hidden');
      if (allActiveJobs.length > 0) {
        renderRelatedJobsFallback(allActiveJobs.slice(0, 6));
      }
    }
  }

  // ── Render Job Content ──
  function renderJob(job) {
    var rawJobNo   = getValue(job, 'JobNo') || getValue(job, 'Job No') || getValue(job, 'Job ID') || 'N/A';
    var jobNo      = rawJobNo.trim();
    var role       = getValue(job, 'Role', 'Career Opportunity').trim();
    var detailedLoc= getValue(job, 'Location', '').trim();
    var cityLoc    = getValue(job, 'Location_duplicate', '').trim();
    var loc        = detailedLoc || cityLoc || 'Gurugram, Delhi NCR';
    var salary     = formatSalary(getValue(job, 'Salary', 'Best in Industry'));
    var exp        = getValue(job, 'Experience', 'Freshers & Experienced').trim();
    var education  = getValue(job, 'Education', 'Graduate / Relevant background').trim();
    var category   = getValue(job, 'Industry', '') || getValue(job, 'Category', 'Recruitment');
    var status     = getValue(job, 'Status', 'Open').trim().toLowerCase();
    var desc       = getValue(job, 'Description', '');

    // Dynamic Title & Meta Tags
    document.title = role + ' | BPOXCEL Careers';
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', role + ' opening in ' + loc + '. Salary: ' + salary + '. Experience: ' + exp + '. Direct apply with BPOXCEL.');
    }
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', role + ' | BPOXCEL Careers');

    // Breadcrumb
    var breadcrumbRole = document.getElementById('breadcrumb-role');
    if (breadcrumbRole) breadcrumbRole.textContent = role;

    // Badges
    var badgeId = document.getElementById('job-badge-id');
    if (badgeId) badgeId.textContent = 'Job No: ' + jobNo;

    var badgeCat = document.getElementById('job-badge-category');
    if (badgeCat) badgeCat.textContent = category;

    var badgeStatus = document.getElementById('job-badge-status');
    if (badgeStatus) {
      var badgeText = 'Active Hiring';
      var badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      var dotColor = 'bg-emerald-500';

      if (status === 'urgent') {
        badgeText = 'Urgent Hiring';
        badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
        dotColor = 'bg-amber-500';
      } else if (status === 'hot') {
        badgeText = 'Hot Job';
        badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
        dotColor = 'bg-rose-500';
      }

      badgeStatus.className = 'px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ' + badgeStyle;
      badgeStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full ' + dotColor + ' animate-pulse"></span>' + badgeText;
    }

    // Header Role Title
    var jobTitle = document.getElementById('job-title');
    if (jobTitle) jobTitle.textContent = allowWrap(role);

    var jobSubtitleLoc = document.getElementById('job-subtitle-location');
    if (jobSubtitleLoc) jobSubtitleLoc.textContent = allowWrap(loc);

    // 4 Key Metrics
    var highlightLoc = document.getElementById('highlight-location');
    if (highlightLoc) highlightLoc.textContent = allowWrap(loc);

    var highlightSalary = document.getElementById('highlight-salary');
    if (highlightSalary) highlightSalary.textContent = salary;

    var highlightExp = document.getElementById('highlight-experience');
    if (highlightExp) highlightExp.textContent = allowWrap(exp);

    var highlightEdu = document.getElementById('highlight-education');
    if (highlightEdu) highlightEdu.textContent = allowWrap(education || 'Graduate / Relevant background');

    // Sidebar Summary
    var sideRole = document.getElementById('side-role');
    if (sideRole) sideRole.textContent = allowWrap(role);

    var sideJobNo = document.getElementById('side-jobno');
    if (sideJobNo) sideJobNo.textContent = jobNo;

    var sideLoc = document.getElementById('side-location');
    if (sideLoc) sideLoc.textContent = allowWrap(loc);

    var sideSalary = document.getElementById('side-salary');
    if (sideSalary) sideSalary.textContent = salary;

    var sideExp = document.getElementById('side-experience');
    if (sideExp) sideExp.textContent = allowWrap(exp);

    var sideEdu = document.getElementById('side-education');
    if (sideEdu) sideEdu.textContent = allowWrap(education || 'Graduate / Relevant background');

    var sideIndustry = document.getElementById('side-industry');
    if (sideIndustry) sideIndustry.textContent = allowWrap(category);

    // Full Description Body
    var descContainer = document.getElementById('job-description-body');
    if (descContainer) {
      descContainer.innerHTML = formatJobDescription(desc);
    }

    // Mobile Sticky Bar
    var mobileRole = document.getElementById('mobile-sticky-role');
    if (mobileRole) mobileRole.textContent = role;
    var mobileSalary = document.getElementById('mobile-sticky-salary');
    if (mobileSalary) mobileSalary.textContent = salary;

    // Share URL update
    var currentShareUrl = window.location.origin + window.location.pathname + '?id=' + encodeURIComponent(jobNo);
    var waShareBtn = document.getElementById('share-whatsapp-btn');
    if (waShareBtn) waShareBtn.remove();
  }

  // ── Render Related Jobs Cards ──
  function renderRelatedJobs(jobs) {
    var container = document.getElementById('related-jobs-grid');
    if (!container || !jobs || jobs.length === 0) return;

    var html = jobs.map(function (j) {
      var jNo = getValue(j, 'JobNo', 'N/A');
      var r = getValue(j, 'Role', 'Job Opening');
      var detailedLoc = getValue(j, 'Location', '');
      var cityLoc = getValue(j, 'Location_duplicate', '');
      var l = cityLoc || detailedLoc || 'Delhi NCR';
      var s = formatSalary(getValue(j, 'Salary', 'Best in Industry'));
      var e = getValue(j, 'Experience', 'Freshers / Experienced');
      var cat = getValue(j, 'Industry', '') || getValue(j, 'Category', 'Recruitment');
      var status = getValue(j, 'Status', '').trim().toLowerCase();
      var badgeClass = 'badge-open';
      var badgeText  = 'Open';
      var dotColor   = 'bg-green-500';

      if (status === 'urgent') {
        badgeClass = 'badge-urgent';
        badgeText  = 'Urgent Hiring';
        dotColor   = 'bg-amber-500';
      } else if (status === 'hot') {
        badgeClass = 'badge-hot';
        badgeText  = 'Hot Job';
        dotColor   = 'bg-red-500';
      }

      var targetParam = (jNo && jNo !== 'N/A') ? jNo : r;
      var encTarget = encodeURIComponent(targetParam);
      var url = 'job-details.html?id=' + encTarget;

      return '<article class="job-card bg-white rounded-2xl border border-gray-100 shadow-sm card-hover overflow-hidden flex flex-col h-full" data-job-id="' + escapeHTML(jNo) + '">' +
        '<div class="h-1 w-full bg-gradient-to-r from-brand-cyan to-brand-blue"></div>' +
        '<div class="p-6 flex flex-col h-full">' +
          '<div class="flex items-center justify-between mb-4">' +
            '<span class="job-number text-xs font-bold text-brand-cyan px-3 py-1 rounded-full">' +
              'Job No: ' + escapeHTML(jNo) +
            '</span>' +
            '<span class="job-tag ' + badgeClass + '">' +
              '<span class="w-1.5 h-1.5 rounded-full ' + dotColor + '"></span>' +
              badgeText +
            '</span>' +
          '</div>' +
          '<h4 class="text-base font-bold text-gray-900 mb-3 break-words" style="overflow-wrap: anywhere; word-break: break-word;">' +
            '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="hover:text-brand-cyan transition-colors">' + escapeHTML(allowWrap(r)) + '</a>' +
          '</h4>' +
          '<div class="grid grid-cols-2 gap-2.5 mb-5 text-xs text-gray-500">' +
            '<div class="flex items-start gap-1.5 min-w-0">' +
              '<svg class="w-3.5 h-3.5 text-brand-cyan flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' +
              '<span class="break-words leading-snug min-w-0" style="overflow-wrap: anywhere; word-break: break-word;">' + escapeHTML(allowWrap(l)) + '</span>' +
            '</div>' +
            '<div class="flex items-start gap-1.5 min-w-0">' +
              '<svg class="w-3.5 h-3.5 text-brand-cyan flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
              '<span class="break-words leading-snug min-w-0" style="overflow-wrap: anywhere; word-break: break-word;">' + escapeHTML(allowWrap(s)) + '</span>' +
            '</div>' +
            '<div class="flex items-start gap-1.5 min-w-0">' +
              '<svg class="w-3.5 h-3.5 text-brand-cyan flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>' +
              '<span class="break-words leading-snug min-w-0" style="overflow-wrap: anywhere; word-break: break-word;">' + escapeHTML(allowWrap(e)) + '</span>' +
            '</div>' +
            '<div class="flex items-start gap-1.5 min-w-0">' +
              '<svg class="w-3.5 h-3.5 text-brand-cyan flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>' +
              '<span class="break-words leading-snug min-w-0" style="overflow-wrap: anywhere; word-break: break-word;">' + escapeHTML(allowWrap(cat)) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="mt-auto">' +
            '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="apply-btn w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-xs font-semibold shadow-sm hover:opacity-95 transition-all">' +
              'View Details &amp; Apply' +
              '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');

    container.innerHTML = html;
  }

  function renderRelatedJobsFallback(jobs) {
    var container = document.getElementById('fallback-jobs-grid');
    if (!container || !jobs || jobs.length === 0) return;

    var html = jobs.map(function (j) {
      var jNo = getValue(j, 'JobNo', 'N/A');
      var r = getValue(j, 'Role', 'Job Opening');
      var l = getValue(j, 'Location', 'Delhi NCR');
      var s = formatSalary(getValue(j, 'Salary', 'Best in Industry'));

      var targetParam = (jNo && jNo !== 'N/A') ? jNo : r;
      var encTarget = encodeURIComponent(targetParam);
      var url = 'job-details.html?id=' + encTarget;

      return '<a href="' + url + '" class="p-4 rounded-xl border border-gray-200 bg-white hover:border-brand-cyan shadow-sm transition block text-left overflow-hidden">' +
        '<div class="text-xs font-bold text-brand-cyan">Job No: ' + escapeHTML(jNo) + '</div>' +
        '<div class="font-bold text-gray-900 text-sm mt-1 mb-1 break-words" style="overflow-wrap: anywhere; word-break: break-word;">' + escapeHTML(allowWrap(r)) + '</div>' +
        '<div class="text-xs text-gray-500 break-words" style="overflow-wrap: anywhere; word-break: break-word;">' + escapeHTML(allowWrap(l)) + ' · ' + escapeHTML(allowWrap(s)) + '</div>' +
      '</a>';
    }).join('');

    container.innerHTML = html;
  }

  // ── Inject Schema ──
  function injectJobSchema(job) {
    var existing = document.getElementById('job-details-schema');
    if (existing) existing.remove();

    var role = getValue(job, 'Role', 'Job Opening');
    var jNo  = getValue(job, 'JobNo', 'N/A');
    var loc  = getValue(job, 'Location', 'Gurugram');
    var desc = getValue(job, 'Description', role);
    var date = safeParseDate(getValue(job, 'Date Added'));
    var datePostedISO = date.getTime() > 0 ? date.toISOString() : new Date().toISOString();

    var validThroughDate = new Date(date.getTime() > 0 ? date.getTime() : Date.now());
    validThroughDate.setDate(validThroughDate.getDate() + 60);

    var schema = {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      "title": role,
      "description": desc,
      "identifier": {
        "@type": "PropertyValue",
        "name": "BPOXCEL",
        "value": jNo
      },
      "datePosted": datePostedISO,
      "validThrough": validThroughDate.toISOString(),
      "employmentType": "FULL_TIME",
      "directApply": true,
      "hiringOrganization": {
        "@type": "Organization",
        "name": "BPOXCEL",
        "sameAs": "https://bpoxcel.com",
        "logo": "https://bpoxcel.com/images/logo.webp"
      },
      "jobLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": loc,
          "addressCountry": "IN"
        }
      }
    };

    var script = document.createElement('script');
    script.id = 'job-details-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  // ── Application Pop-up Modal ──
  function openApplyModal() {
    var overlay = document.getElementById('bpx-details-overlay');
    if (!overlay) return;

    var jobInput = document.getElementById('bpx-modal-job');
    if (jobInput && currentJob) {
      var jNo = getValue(currentJob, 'JobNo', 'N/A');
      var r   = getValue(currentJob, 'Role', 'Job Application');
      jobInput.value = 'Job ID: ' + jNo + ' - ' + r;
    }

    var formView = document.getElementById('bpx-modal-form-view');
    var successView = document.getElementById('bpx-modal-success-view');
    var errorBanner = document.getElementById('bpx-modal-error');
    if (formView) formView.style.display = 'block';
    if (successView) successView.style.display = 'none';
    if (errorBanner) errorBanner.classList.remove('bpx-show');

    var agreeCheckbox = document.getElementById('bpx-modal-agree');
    if (agreeCheckbox) {
      agreeCheckbox.checked = false;
    }
    var agreeErr = document.getElementById('bpx-modal-agree-err');
    if (agreeErr) agreeErr.classList.remove('bpx-show');

    var submitBtn = document.getElementById('bpx-modal-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submit Application';
    }

    document.body.classList.add('bpx-no-scroll');
    overlay.classList.remove('hidden');
    requestAnimationFrame(function () {
      overlay.classList.add('bpx-active');
    });

    setTimeout(function () {
      var nameEl = document.getElementById('bpx-modal-name');
      if (nameEl) nameEl.focus();
    }, 300);
  }

  function closeApplyModal() {
    var overlay = document.getElementById('bpx-details-overlay');
    if (!overlay) return;

    overlay.classList.remove('bpx-active');
    document.body.classList.remove('bpx-no-scroll');
    setTimeout(function () {
      overlay.classList.add('hidden');
    }, 350);
  }

  // ── Setup Event Listeners ──
  function init() {
    loadJobDetails();

    // Delegate Apply Now Clicks to open modal
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.apply-popup-trigger');
      if (btn) {
        e.preventDefault();
        openApplyModal();
      }
    });

    // Modal Close button & Overlay Click
    var closeBtn = document.getElementById('bpx-modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeApplyModal);
    }

    var successCloseBtn = document.getElementById('bpx-modal-success-close');
    if (successCloseBtn) {
      successCloseBtn.addEventListener('click', closeApplyModal);
    }

    var overlay = document.getElementById('bpx-details-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          closeApplyModal();
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeApplyModal();
      }
    });

    // Modal Form Submission
    var form = document.getElementById('bpx-modal-form');
    var agreeCheckbox = document.getElementById('bpx-modal-agree');
    var agreeErr = document.getElementById('bpx-modal-agree-err');
    var modalSubmitBtn = document.getElementById('bpx-modal-submit-btn');

    if (agreeCheckbox && modalSubmitBtn) {
      modalSubmitBtn.disabled = !agreeCheckbox.checked;
      agreeCheckbox.addEventListener('change', function () {
        modalSubmitBtn.disabled = !this.checked;
        if (this.checked && agreeErr) {
          agreeErr.classList.remove('bpx-show');
        }
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var errorBanner = document.getElementById('bpx-modal-error');
        if (errorBanner) errorBanner.classList.remove('bpx-show');

        var nameEl  = document.getElementById('bpx-modal-name');
        var locEl   = document.getElementById('bpx-modal-location');
        var phoneEl = document.getElementById('bpx-modal-phone');
        var emailEl = document.getElementById('bpx-modal-email');
        var jobEl   = document.getElementById('bpx-modal-job');
        var submitBtn = document.getElementById('bpx-modal-submit-btn');

        var valid = true;

        if (!nameEl.value.trim()) {
          showFieldError(nameEl, 'bpx-modal-name-err');
          valid = false;
        }

        if (!locEl.value.trim()) {
          showFieldError(locEl, 'bpx-modal-location-err');
          valid = false;
        }

        if (!phoneEl.value.trim() || !PHONE_REGEX.test(phoneEl.value.trim())) {
          showFieldError(phoneEl, 'bpx-modal-phone-err');
          valid = false;
        }

        if (emailEl && emailEl.value.trim() && !EMAIL_REGEX.test(emailEl.value.trim())) {
          showFieldError(emailEl, 'bpx-modal-email-err');
          valid = false;
        }

        if (!agreeCheckbox || !agreeCheckbox.checked) {
          if (agreeErr) agreeErr.classList.add('bpx-show');
          valid = false;
        } else {
          if (agreeErr) agreeErr.classList.remove('bpx-show');
        }

        if (!valid) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="bpx-spinner"></span> Submitting Application\u2026';

        var lookingForText = jobEl ? jobEl.value.trim() : (currentJob ? getValue(currentJob, 'Role') : 'Job Application');

        function handleSuccess(skipMark) {
          var formView = document.getElementById('bpx-modal-form-view');
          var successView = document.getElementById('bpx-modal-success-view');
          if (formView) formView.style.display = 'none';
          if (successView) successView.style.display = 'block';
          if (skipMark !== true) {
            markAsSubmitted(lookingForText);
          }
          form.reset();
        }

        if (hasAlreadySubmitted(lookingForText)) {
          setTimeout(function () { handleSuccess(true); }, 400);
          return;
        }

        var payload = {
          name: nameEl.value.trim(),
          location: locEl.value.trim(),
          phone: phoneEl.value.trim(),
          email: emailEl ? emailEl.value.trim() : '',
          lookingFor: lookingForText,
          looking_for: lookingForText,
          sourcePage: 'Job Details - ' + lookingForText
        };

        fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        })
          .then(handleSuccess)
          .catch(function (err) {
            console.error('Submission error:', err);
            if (errorBanner) errorBanner.classList.add('bpx-show');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Application';
          });
      });

      // Clear field errors on input
      form.querySelectorAll('input').forEach(function (input) {
        input.addEventListener('input', function () {
          input.classList.remove('bpx-error');
          var err = document.getElementById(input.id + '-err');
          if (err) err.classList.remove('bpx-show');
        });
      });
    }

    function showFieldError(input, errId) {
      input.classList.add('bpx-error');
      var err = document.getElementById(errId);
      if (err) err.classList.add('bpx-show');
    }

    // Share Button Handlers
    var copyBtn = document.getElementById('share-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var copyTextSpan = copyBtn.querySelector('.share-btn-text');
        var targetUrl = window.location.href;
        if (currentJob) {
          var jNo = getValue(currentJob, 'JobNo');
          if (jNo) {
            targetUrl = window.location.origin + window.location.pathname + '?id=' + encodeURIComponent(jNo);
          }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(targetUrl).then(function () {
            if (copyTextSpan) {
              var orig = copyTextSpan.textContent;
              copyTextSpan.textContent = 'Copied!';
              setTimeout(function () { copyTextSpan.textContent = orig; }, 2000);
            }
          });
        } else {
          var dummy = document.createElement('input');
          document.body.appendChild(dummy);
          dummy.value = targetUrl;
          dummy.select();
          document.execCommand('copy');
          document.body.removeChild(dummy);
          if (copyTextSpan) {
            var orig2 = copyTextSpan.textContent;
            copyTextSpan.textContent = 'Copied!';
            setTimeout(function () { copyTextSpan.textContent = orig2; }, 2000);
          }
        }
      });
    }

    var shareLiBtn = document.getElementById('share-linkedin-btn');
    if (shareLiBtn) {
      shareLiBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var targetUrl = window.location.href;
        if (currentJob) {
          var jNo = getValue(currentJob, 'JobNo');
          if (jNo) {
            targetUrl = window.location.origin + window.location.pathname + '?id=' + encodeURIComponent(jNo);
          }
        }
        window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(targetUrl), '_blank');
      });
    }
  }

  // Safe DOM-Ready Initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Listen for history and hash changes without full reload
  window.addEventListener('popstate', loadJobDetails);
  window.addEventListener('hashchange', loadJobDetails);

  // Expose global controller for external or debugging invocation
  window.BPOXCEL_JOB_DETAILS = {
    openApplyModal: openApplyModal,
    closeApplyModal: closeApplyModal,
    getCurrentJob: function () { return currentJob; },
    reload: loadJobDetails
  };

})();
