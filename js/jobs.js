// HTML escaping utility to prevent XSS
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Format job description safely by escaping HTML and converting newlines to <br>
function formatDesc(desc) {
  return escapeHTML(desc).replace(/\n/g, '<br>');
}

document.addEventListener('DOMContentLoaded', () => {
  // Careers Filtering Click Delegate
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      const filter = e.target.getAttribute('data-filter');
      applyJobFilter(filter);
    }
  });

  // Read More / Read Less Click Delegate
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('read-more-btn')) {
      const btn = e.target;
      const card = btn.closest('article');
      if (!card) return;
      const descText = card.querySelector('.job-desc-text');
      if (!descText) return;

      const isExpanded = btn.getAttribute('data-expanded') === 'true';
      if (isExpanded) {
        // Collapse description
        descText.classList.add('line-clamp-3');
        btn.textContent = 'Read More';
        btn.setAttribute('data-expanded', 'false');
      } else {
        // Expand description
        descText.classList.remove('line-clamp-3');
        btn.textContent = 'Read Less';
        btn.setAttribute('data-expanded', 'true');
      }
    }
  });
});

/* =====================================================
   GOOGLE SHEETS FETCH LOGIC — Finalized & Optimized
   ===================================================== */
const SPREADSHEET_ID = '1B96_0hldq1BLyAsoyWmpIO5TTDmuDgt43MKzb_vIuIY';
const SHEET_NAME     = 'JobsDatabase'; 
const CSV_URL        = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

/**
 * Case-insensitive header value accessor with default value fallback
 */
function getValue(job, key, defaultValue = '') {
  if (!job) return defaultValue;
  const targetKey = key.toLowerCase();
  const actualKey = Object.keys(job).find(k => k.toLowerCase() === targetKey);
  if (actualKey !== undefined && job[actualKey] !== undefined) {
    const val = job[actualKey];
    return typeof val === 'string' ? val.trim() : val;
  }
  return defaultValue;
}

/**
 * Safe Date Parser supporting dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd
 */
function safeParseDate(dateStr) {
  if (!dateStr) return new Date(0);
  const cleaned = dateStr.trim();
  if (!cleaned) return new Date(0);
  
  // Try parsing ISO format first (yyyy-mm-dd)
  const isoRegex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
  let match = cleaned.match(isoRegex);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? new Date(0) : date;
  }
  
  // Try parsing dd/mm/yyyy or mm/dd/yyyy
  const slashRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
  match = cleaned.match(slashRegex);
  if (match) {
    const part1 = parseInt(match[1], 10);
    const part2 = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    let day, month;
    if (part1 > 12) {
      day = part1;
      month = part2 - 1;
    } else if (part2 > 12) {
      month = part1 - 1;
      day = part2;
    } else {
      // Default to mm/dd/yyyy
      month = part1 - 1;
      day = part2;
    }
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? new Date(0) : date;
  }
  
  // Fallback to standard Date constructor
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

let allJobsList = [];
let currentFilter = 'all';

async function fetchJobs() {
  const grid    = document.getElementById('jobs-grid');
  const loading = document.getElementById('loading-state');
  const error   = document.getElementById('error-state');
  const noJobs  = document.getElementById('no-jobs');
  const counter = document.getElementById('job-count');

  if (!grid || !loading || !error || !noJobs) return;

  try {
    // Reset state
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    noJobs.classList.add('hidden');

    // Remove any previous job-cards or skeleton-cards
    grid.querySelectorAll('.job-card, .skeleton-card').forEach(el => el.remove());

    // Show 3-4 skeleton cards while loading
    const skeletonHTML = Array(4).fill(0).map(() => `
      <article class="skeleton-card bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full p-7">
        <div class="h-1 w-full bg-gray-200 skeleton mb-6 -mx-7 -mt-7"></div>
        <div class="flex items-center justify-between mb-5">
          <div class="h-5 w-20 bg-gray-200 skeleton rounded-full"></div>
          <div class="h-5 w-16 bg-gray-200 skeleton rounded-full"></div>
        </div>
        <div class="h-6 w-3/4 bg-gray-200 skeleton mb-4"></div>
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div class="h-4 bg-gray-200 skeleton rounded"></div>
          <div class="h-4 bg-gray-200 skeleton rounded"></div>
          <div class="h-4 bg-gray-200 skeleton rounded"></div>
          <div class="h-4 bg-gray-200 skeleton rounded"></div>
        </div>
        <div class="h-4 bg-gray-200 skeleton rounded mb-2"></div>
        <div class="h-4 bg-gray-200 skeleton rounded mb-6 w-5/6"></div>
        <div class="h-10 bg-gray-200 skeleton rounded-xl mt-auto"></div>
      </article>
    `).join('');
    
    const tempSkelDiv = document.createElement('div');
    tempSkelDiv.innerHTML = skeletonHTML;
    Array.from(tempSkelDiv.children).forEach(el => grid.appendChild(el));
    
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.text();
    const rows = parseCSV(data);
    
    // Filter jobs: "Open", "Urgent", "Active", or "Hot" jobs display; "Closed" and "Paused" are hidden.
    let activeJobs = rows.filter(job => {
      const status = getValue(job, 'Status', '').trim().toLowerCase();
      return status === 'open' || status === 'urgent' || status === 'active' || status === 'hot';
    });

    // Sort by Date Added (Newest First)
    activeJobs.sort((a, b) => {
      const dateA = safeParseDate(getValue(a, 'Date Added'));
      const dateB = safeParseDate(getValue(b, 'Date Added'));
      return dateB - dateA;
    });

    // Filter by location if data-location attribute is present on the grid container
    const targetLoc = grid.getAttribute('data-location');
    let locationJobs = activeJobs;
    if (targetLoc) {
      const targetLocLower = targetLoc.toLowerCase();
      locationJobs = activeJobs.filter(job => {
        const jobLocSimple = getValue(job, 'Location_duplicate', '').trim().toLowerCase();
        const jobLocDetailed = getValue(job, 'Location', '').trim().toLowerCase();
        const jobLoc = jobLocSimple || jobLocDetailed;
        
        // Custom matching logic for specific location pages
        if (targetLocLower === 'gurugram') {
          return jobLoc.includes('gurugram') || jobLoc.includes('gurgaon');
        }
        if (targetLocLower === 'delhi') {
          return jobLoc.includes('delhi');
        }
        if (targetLocLower === 'punjab') {
          return jobLoc.includes('punjab') || 
                 jobLoc.includes('mohali') || 
                 jobLoc.includes('amritsar') || 
                 jobLoc.includes('jalandhar') || 
                 jobLoc.includes('ludhiana') || 
                 jobLoc.includes('chandigarh') || 
                 jobLoc.includes('chd');
        }
        // General fallback: check if target location is a substring of the job location
        return jobLoc.includes(targetLocLower);
      });
    }

    allJobsList = locationJobs;

    // Hide loading spinner and remove skeleton cards
    loading.classList.add('hidden');
    grid.querySelectorAll('.skeleton-card').forEach(el => el.remove());

    if (locationJobs.length === 0) {
      noJobs.classList.remove('hidden');
      const noJobsText = noJobs.querySelector('p');
      if (noJobsText) {
        noJobsText.textContent = 'This location does not have any open job roles currently';
      }
      if (counter) {
        counter.textContent = '0';
      }
      // Remove any existing job-cards
      grid.querySelectorAll('.job-card').forEach(el => el.remove());
      return;
    }

    // Update counter dynamically if present
    if (counter) {
      counter.textContent = `${locationJobs.length}+`;
    }

    // Render cards
    const cardsHTML = locationJobs.map((job, index) => createJobCard(job, index)).join('');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cardsHTML;
    
    // Remove previous job cards just in case
    grid.querySelectorAll('.job-card').forEach(el => el.remove());
    
    // Append real cards
    Array.from(tempDiv.children).forEach(el => grid.appendChild(el));

    // Staggered entrance animation
    grid.querySelectorAll('.job-card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.transitionDelay = `${Math.min(i * 60, 400)}ms`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        });
      });
    });

    // Observe dynamic reveal elements inside grid (if any are left)
    if (window.revealObserver) {
      grid.querySelectorAll('.reveal').forEach(el => window.revealObserver.observe(el));
    }
    
    generateJobSchema(locationJobs);

  } catch (err) {
    console.error('BPOXCEL Jobs Error:', err);
    loading.classList.add('hidden');
    error.classList.remove('hidden');
    grid.querySelectorAll('.skeleton-card, .job-card').forEach(el => el.remove());
    // Show technical details in console for debugging
    console.log('Error details:', err.message);
  }
}

function applyJobFilter(filterType) {
  currentFilter = filterType;
  
  // Update button classes to highlight active filter
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    if (btn.getAttribute('data-filter') === filterType) {
      btn.className = 'filter-btn px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-brand-cyan to-brand-blue text-white shadow-sm hover:shadow-md transition-all';
    } else {
      btn.className = 'filter-btn px-4 py-2 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-600 hover:border-brand-cyan hover:text-brand-cyan transition-all';
    }
  });

  const grid = document.getElementById('jobs-grid');
  const noJobs = document.getElementById('no-jobs');
  
  if (!grid) return;

  let filtered = allJobsList;
  if (filterType !== 'all') {
    filtered = allJobsList.filter(job => {
      const role = getValue(job, 'Role', '').toLowerCase();
      const desc = getValue(job, 'Description', '').toLowerCase();
      const exp = getValue(job, 'Experience', '').toLowerCase();
      const category = getValue(job, 'Category', '').toLowerCase();
      const industry = getValue(job, 'Industry', '').toLowerCase();
      const expLevel = getValue(job, 'Experience Level', '').toLowerCase();

      if (filterType === 'bpo') {
        return (industry && (industry.includes('bpo') || industry.includes('call') || industry.includes('voice') || industry.includes('sales'))) ||
               category.includes('bpo') || category.includes('call') || category.includes('voice') || category.includes('sales') ||
               role.includes('bpo') || role.includes('voice') || role.includes('customer') || role.includes('support') || role.includes('telecaller') || role.includes('back office') || role.includes('sales') ||
               desc.includes('bpo') || desc.includes('voice') || desc.includes('customer') || desc.includes('support') || desc.includes('telecaller') || desc.includes('sales');
      }
      if (filterType === 'it') {
        return (industry && (industry.includes('it') || industry.includes('tech') || industry.includes('software'))) ||
               category.includes('it') || category.includes('tech') || category.includes('software') ||
               role.includes('it') || role.includes('developer') || role.includes('software') || role.includes('tech') || role.includes('engineer') ||
               desc.includes('it') || desc.includes('developer') || desc.includes('software') || desc.includes('tech') || desc.includes('engineer');
      }
      if (filterType === 'fresher') {
        const fromLevel = expLevel ? (expLevel.includes('fresher') || expLevel.includes('entry') || expLevel.includes('0')) : false;
        if (expLevel) return fromLevel;
        
        const cleanExp = exp.trim();
        if (!cleanExp) return false;
        
        if (/\b(fresher|entry|no experience|0)\b/i.test(cleanExp)) return true;
        if (/^0\s*(?:-|to)\s*\d+/i.test(cleanExp)) return true;
        
        const match = cleanExp.match(/\d+/);
        if (match && parseInt(match[0], 10) === 0) return true;
        
        if (cleanExp.toLowerCase().includes('fresher')) return true;
        return false;
      }
      if (filterType === 'experienced') {
        const fromLevel = expLevel ? (expLevel.includes('experienced') || expLevel.includes('experience') || (expLevel.includes('exp') && !expLevel.includes('no'))) : false;
        if (expLevel) return fromLevel;
        
        const cleanExp = exp.trim();
        if (!cleanExp) return false;
        
        if (/\b(experienced|experience)\b/i.test(cleanExp) && !/no\s+experience/i.test(cleanExp)) return true;
        
        const match = cleanExp.match(/\d+/);
        if (match && parseInt(match[0], 10) > 0) return true;
        
        return false;
      }
      return true;
    });
  }

  if (filtered.length === 0) {
    noJobs.classList.remove('hidden');
    grid.querySelectorAll('.job-card, .skeleton-card').forEach(el => el.remove());
  } else {
    noJobs.classList.add('hidden');
    
    // Remove previous cards and skeletons
    grid.querySelectorAll('.job-card, .skeleton-card').forEach(el => el.remove());
    
    // Append new filtered cards
    const cardsHTML = filtered.map((job, index) => createJobCard(job, index)).join('');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cardsHTML;
    Array.from(tempDiv.children).forEach(el => grid.appendChild(el));
    
    // Staggered entrance animation
    grid.querySelectorAll('.job-card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.transitionDelay = `${Math.min(i * 60, 400)}ms`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        });
      });
    });
    
    // Observe dynamic reveal elements inside grid
    if (window.revealObserver) {
      grid.querySelectorAll('.reveal').forEach(el => window.revealObserver.observe(el));
    }
  }
}

/**
 * Production-grade State Machine CSV Parser
 * Properly handles commas, quotes, line breaks, and escaped quotes inside cells.
 */
function parseCSV(csvText) {
  const result = [];
  let row = [''];
  let inQuotes = false;
  let i = 0;
  const len = csvText.length;

  while (i < len) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote character (e.g. "")
          row[row.length - 1] += '"';
          i += 2;
          continue;
        } else {
          // Close quotes
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
        // Handle CRLF or LF newlines
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

  // Add last row if it contains data
  if (row.length > 1 || row[0] !== '') {
    result.push(row);
  }

  if (result.length === 0) return [];

  // Extract headers and handle duplicates by appending a suffix
  const seenHeaders = {};
  const rawHeaders = result[0].map(h => {
    const trimmed = h.trim();
    const lower = trimmed.toLowerCase();
    if (seenHeaders[lower] !== undefined) {
      seenHeaders[lower]++;
      return `${trimmed}_duplicate`;
    } else {
      seenHeaders[lower] = 1;
      return trimmed;
    }
  });
  const dataRows = result.slice(1);

  return dataRows.map(dataRow => {
    const obj = {};
    rawHeaders.forEach((header, index) => {
      obj[header] = dataRow[index] !== undefined ? dataRow[index] : '';
    });
    return obj;
  });
}function createJobCard(job, index = 0) {
  const status = getValue(job, 'Status', '').trim().toLowerCase();
  let badgeClass = 'badge-open';
  let badgeText  = 'Open';
  let dotColor   = 'bg-green-500';
  
  if (status === 'urgent') {
    badgeClass = 'badge-urgent';
    badgeText  = 'Urgent Hiring';
    dotColor   = 'bg-amber-500';
  } else if (status === 'hot') {
    badgeClass = 'badge-hot';
    badgeText  = 'Hot';
    dotColor   = 'bg-red-500';
  } else if (status === 'active') {
    badgeClass = 'badge-open';
    badgeText  = 'Active';
    dotColor   = 'bg-green-500';
  }
  
  // Fallbacks for missing data
  let jobNo      = getValue(job, 'JobNo', 'N/A').trim();
  if (!jobNo || jobNo.toLowerCase() === 'n/a') {
    jobNo = 'N/A';
  }
  const role     = getValue(job, 'Role', 'Job Opportunity').trim();
  const loc      = getValue(job, 'Location', 'Gurugram, Haryana').trim();
  const salary   = getValue(job, 'Salary', 'Best in Industry').trim();
  const exp      = getValue(job, 'Experience', 'Freshers / Experienced').trim();
  const desc     = getValue(job, 'Description', 'Please contact us for full job details and requirements.').trim();
  
  // Support category/industry default if missing or empty
  let category   = getValue(job, 'Industry', '') || getValue(job, 'Category', '');
  if (!category) {
    category = 'BPO / Call Centre';
  }

  // Application Link Validation
  let applyLink = getValue(job, 'ApplyLink', '').trim();
  if (!/^https?:\/\//i.test(applyLink)) {
    // Fallback to Google Form link
    applyLink = 'https://docs.google.com/forms/d/e/1FAIpQLScvWwDRqwFsx1uA7blOgJTVqWMBRrrnx7HmEdhITNDSM8NQlA/viewform';
  }

  const delayClass = `delay-${((index % 2) + 1) * 100}`;

  // Escape variables for XSS protection
  const escapedJobNo = escapeHTML(jobNo);
  const escapedRole = escapeHTML(role);
  const escapedLoc = escapeHTML(loc);
  const escapedSalary = escapeHTML(salary);
  const escapedExp = escapeHTML(exp);
  const escapedCategory = escapeHTML(category);
  const escapedApplyLink = escapeHTML(applyLink);

  return `
    <article class="job-card bg-white rounded-2xl border border-gray-100 shadow-sm card-hover overflow-hidden flex flex-col h-full">
      <div class="h-1 w-full bg-gradient-to-r from-brand-cyan to-brand-blue"></div>
      <div class="p-7 flex flex-col h-full">
        <div class="flex items-center justify-between mb-5">
          <span class="job-number text-xs font-bold text-brand-cyan px-3 py-1 rounded-full">
            Job No: ${escapedJobNo}
          </span>
          <span class="job-tag ${badgeClass}">
            <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>
            ${badgeText}
          </span>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-3">${escapedRole}</h3>
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <svg class="w-4 h-4 text-brand-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span class="truncate">${escapedLoc}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <svg class="w-4 h-4 text-brand-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span class="truncate">${escapedSalary}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <svg class="w-4 h-4 text-brand-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            <span class="truncate">${escapedExp}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <svg class="w-4 h-4 text-brand-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            <span class="truncate">${escapedCategory}</span>
          </div>
        </div>
        ${desc.length > 150 ? `
          <p class="text-sm text-gray-500 leading-relaxed mb-1 line-clamp-3 job-desc-text">
            ${formatDesc(desc)}
          </p>
          <button class="read-more-btn text-xs font-semibold text-brand-cyan hover:text-brand-blue mb-5 focus:outline-none transition-colors" data-expanded="false">
            Read More
          </button>
        ` : `
          <p class="text-sm text-gray-500 leading-relaxed mb-6">
            ${formatDesc(desc)}
          </p>
        `}
        <div class="mt-auto">
          <a href="${escapedApplyLink}"
             target="_blank" rel="noopener noreferrer"
             class="apply-btn w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold shadow-sm">
            Apply Now
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
    </article>
  `;
}

/**
 * Google Jobs SEO Schema Generator
 * Dynamically adds JSON-LD JobPosting schema for Google indexing.
 */
function generateJobSchema(activeJobs) {
  const existingSchema = document.getElementById('dynamic-job-schema');
  if (existingSchema) existingSchema.remove();

  function parseSalary(salaryStr) {
    if (!salaryStr || salaryStr.toLowerCase().includes('best') || salaryStr.toLowerCase().includes('competitive')) {
      return null;
    }
    const numbers = salaryStr.replace(/,/g, '').match(/\d+/g);
    if (!numbers || numbers.length === 0) return null;
    
    const minVal = parseFloat(numbers[0]);
    const maxVal = numbers.length > 1 ? parseFloat(numbers[1]) : minVal;
    
    let unit = 'MONTH';
    let minSalary = minVal;
    let maxSalary = maxVal;
    
    const salLower = salaryStr.toLowerCase();
    if (salLower.includes('lpa') || salLower.includes('lacs') || salLower.includes('lakh') || minVal < 100) {
      unit = 'YEAR';
      if (minVal < 100) {
        minSalary = minVal * 100000;
        maxSalary = maxVal * 100000;
      }
    }
    
    return {
      "@type": "MonetaryAmount",
      "currency": "INR",
      "value": {
        "@type": "QuantitativeValue",
        "minValue": minSalary,
        "maxValue": maxSalary,
        "unitText": unit
      }
    };
  }

  const schemas = activeJobs.map(job => {
    const parsedDate = safeParseDate(getValue(job, 'Date Added'));
    const datePostedISO = parsedDate.getTime() > 0 ? parsedDate.toISOString() : new Date().toISOString();

    const validThroughDate = new Date(parsedDate.getTime() > 0 ? parsedDate.getTime() : Date.now());
    validThroughDate.setDate(validThroughDate.getDate() + 60);
    const validThroughISO = validThroughDate.toISOString();

    const loc = getValue(job, 'Location', 'Gurugram').trim();
    let region = 'Haryana';
    const locLower = loc.toLowerCase();
    if (locLower.includes('delhi')) {
      region = 'Delhi';
    } else if (locLower.includes('noida')) {
      region = 'Uttar Pradesh';
    } else if (locLower.includes('ghaziabad')) {
      region = 'Uttar Pradesh';
    } else if (locLower.includes('faridabad')) {
      region = 'Haryana';
    } else if (locLower.includes('amritsar') || locLower.includes('mohali') || locLower.includes('jalandhar') || locLower.includes('punjab')) {
      region = 'Punjab';
    } else if (locLower.includes('chandigarh')) {
      region = 'Chandigarh';
    }

    const desc = getValue(job, 'Description', 'BPOXCEL Job Opportunity').trim();
    let empType = 'FULL_TIME';
    const descLower = desc.toLowerCase();
    if (descLower.includes('part-time') || descLower.includes('part time')) {
      empType = 'PART_TIME';
    } else if (descLower.includes('intern') || descLower.includes('internship')) {
      empType = 'INTERN';
    } else if (descLower.includes('contract')) {
      empType = 'CONTRACTOR';
    }

    const salaryObj = parseSalary(getValue(job, 'Salary'));
    const expText = getValue(job, 'Experience', '').trim();
    let monthsOfExperience = 0;
    const expMatch = expText.match(/(\d+)\s*(?:-|to)?/);
    if (expMatch) {
      monthsOfExperience = parseInt(expMatch[1], 10) * 12;
    }

    const isRemote = locLower.includes('remote') || locLower.includes('work from home') || locLower.includes('wfh');

    const jobSchema = {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      "title": getValue(job, 'Role', 'BPO Job'),
      "description": desc,
      "identifier": {
        "@type": "PropertyValue",
        "name": "BPOXCEL",
        "value": getValue(job, 'JobNo', 'N/A')
      },
      "datePosted": datePostedISO,
      "validThrough": validThroughISO,
      "employmentType": empType,
      "directApply": true,
      "hiringOrganization": {
        "@type": "Organization",
        "name": "BPOXCEL",
        "sameAs": "https://www.bpoxcel.com",
        "logo": "https://www.bpoxcel.com/images/logo.webp"
      },
      "industry": getValue(job, 'Industry', 'BPO / Call Centre'),
      "experienceRequirements": {
        "@type": "OccupationalExperienceRequirements",
        "monthsOfExperience": monthsOfExperience
      },
      "applicantLocationRequirements": {
        "@type": "Country",
        "name": "IN"
      }
    };

    if (isRemote) {
      jobSchema["jobLocationType"] = "TELECOMMUTE";
    } else {
      jobSchema["jobLocation"] = {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": loc,
          "addressRegion": region,
          "addressCountry": "IN"
        }
      };
    }

    if (salaryObj) {
      jobSchema["baseSalary"] = salaryObj;
    }

    return jobSchema;
  });

  const graphSchema = {
    "@context": "https://schema.org",
    "@graph": schemas.map(schema => {
      delete schema["@context"];
      return schema;
    })
  };

  const script = document.createElement('script');
  script.id = 'dynamic-job-schema';
  script.type = 'application/ld+json';
  script.text = JSON.stringify(graphSchema).replace(/</g, '\\u003c');
  document.head.appendChild(script);
}

// Initial Fetch on Load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fetchJobs);
} else {
  fetchJobs();
}
