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

function allowWrap(str) {
  if (!str) return '';
  return String(str)
    .replace(/\/(?!\s)/g, '/\u200B')
    .replace(/,(?!\s)/g, ',\u200B');
}

// Format job description safely by escaping HTML and converting newlines to <br>
function formatDesc(desc) {
  return escapeHTML(allowWrap(desc)).replace(/\n/g, '<br>');
}

document.addEventListener('DOMContentLoaded', () => {
  // Check for URL filter query param (e.g. ?filter=it or ?category=bpo)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilter = urlParams.get('filter') || urlParams.get('category') || urlParams.get('type');
    if (initialFilter) {
      const normalized = initialFilter.toLowerCase().trim();
      const validFilters = ['all', 'bpo', 'it', 'engineering', 'sales', 'fresher', 'experienced'];
      if (validFilters.includes(normalized)) {
        currentFilter = normalized;
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
          if (btn.getAttribute('data-filter') === normalized) {
            btn.className = 'filter-btn px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-brand-cyan to-brand-blue text-white shadow-sm hover:shadow-md transition-all cursor-pointer';
          } else {
            btn.className = 'filter-btn px-4 py-2 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-600 hover:border-brand-cyan hover:text-brand-cyan transition-all cursor-pointer';
          }
        });
      }
    }
  } catch (e) {
    // ignore query parsing errors
  }

  // Careers Filtering Click Delegate
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (btn) {
      const filter = btn.getAttribute('data-filter');
      applyJobFilter(filter);
    }
  });

  // Search Input Event
  const searchInput = document.getElementById('job-search-input');
  const clearBtn = document.getElementById('clear-search-btn');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.toLowerCase().trim();
      
      // Show/hide clear button
      if (clearBtn) {
        if (currentSearchQuery) {
          clearBtn.classList.remove('hidden');
        } else {
          clearBtn.classList.add('hidden');
        }
      }
      
      applyFilters();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
      }
      currentSearchQuery = '';
      clearBtn.classList.add('hidden');
      applyFilters();
    });
  }

  // Open unique Job Role Details when clicking anywhere on a job card
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.job-card');
    if (!card) return;

    // If clicking a link, button, or form control directly, let native/button behavior handle it
    const interactive = e.target.closest('a, button, input, textarea, select');
    if (interactive) return;

    // Otherwise, find the card's job details link and open in a new window/tab
    const link = card.querySelector('a[href*="job-details"]');
    if (link && link.href) {
      window.open(link.href, '_blank', 'noopener,noreferrer');
    }
  });

  // Browse other Jobs Click Delegate
  document.addEventListener('click', (e) => {
    if (e.target.id === 'browse-all-jobs-btn') {
      const searchInput = document.getElementById('job-search-input');
      const clearBtn = document.getElementById('clear-search-btn');
      
      // Reset search query
      if (searchInput) {
        searchInput.value = '';
      }
      currentSearchQuery = '';
      if (clearBtn) {
        clearBtn.classList.add('hidden');
      }

      // Reset filter buttons active classes to 'all'
      const filterButtons = document.querySelectorAll('.filter-btn');
      filterButtons.forEach(btn => {
        if (btn.getAttribute('data-filter') === 'all') {
          btn.className = 'filter-btn px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-brand-cyan to-brand-blue text-white shadow-sm hover:shadow-md transition-all cursor-pointer';
        } else {
          btn.className = 'filter-btn px-4 py-2 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-600 hover:border-brand-cyan hover:text-brand-cyan transition-all cursor-pointer';
        }
      });
      currentFilter = 'all';

      // Re-apply filters (will show all jobs)
      applyFilters();
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
  const targetKey = key.toLowerCase().replace(/[\s\-_.]/g, '');
  const actualKey = Object.keys(job).find(k => k.toLowerCase().replace(/[\s\-_.]/g, '') === targetKey);
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
let currentSearchQuery = '';

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

    // Render filtered cards initially
    applyFilters();
    
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
      btn.className = 'filter-btn px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-brand-cyan to-brand-blue text-white shadow-sm hover:shadow-md transition-all cursor-pointer';
    } else {
      btn.className = 'filter-btn px-4 py-2 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-600 hover:border-brand-cyan hover:text-brand-cyan transition-all cursor-pointer';
    }
  });

  applyFilters();
}

function applyFilters() {
  const grid = document.getElementById('jobs-grid');
  const noJobs = document.getElementById('no-jobs');
  
  if (!grid) return;

  // 1. Filter by category/experience tab (currentFilter)
  let filtered = allJobsList;
  if (currentFilter !== 'all') {
    filtered = allJobsList.filter(job => {
      const jobNo = (getValue(job, 'Job No') || getValue(job, 'JobNo') || getValue(job, 'Job Id') || '').trim().toUpperCase();
      const role = (getValue(job, 'Role') || getValue(job, 'Job Title') || getValue(job, 'Title') || '').toLowerCase();
      const desc = (getValue(job, 'Description') || getValue(job, 'Job Description') || '').toLowerCase();
      const exp = (getValue(job, 'Experience') || getValue(job, 'Work Experience') || '').toLowerCase();
      const category = (getValue(job, 'Category') || getValue(job, 'Job Category') || '').toLowerCase();
      const industry = (getValue(job, 'Industry') || getValue(job, 'Sector') || '').toLowerCase();
      const expLevel = (getValue(job, 'Experience Level') || getValue(job, 'Exp Level') || '').toLowerCase();

      if (currentFilter === 'bpo') {
        if (jobNo.startsWith('BP')) return true;
        if (/\bbpo\b/i.test(industry) || /\bbpo\b/i.test(category)) return true;
        if (/\b(call cent(er|re)|customer support|customer service|customer care|voice process|telecaller|telecalling|telesales|chat support|email support|inbound|outbound|back office|process associate)\b/i.test(role) &&
            !/\b(desktop|interior|water treatment|cad)\b/i.test(role) &&
            !/\b(it|interior designers|engineering)\b/i.test(industry)) {
          return true;
        }
        return false;
      }

      if (currentFilter === 'it') {
        if (jobNo.startsWith('IT')) return true;
        if (/\b(it|information technology|software|tech|developer|web development)\b/i.test(category) && !category.includes('interior')) return true;
        if (/\b(it|information technology|software|tech support|it services)\b/i.test(industry) && !industry.includes('interior')) return true;
        if (/\b(it|desktop engineer|it support|software developer|software engineer|system admin|network engineer|full stack|frontend|backend|devops|database admin|programmer|coder|qa engineer|test engineer|cloud|cybersecurity)\b/i.test(role)) return true;
        if (/\b(desktop support|desktop engineer|hardware & networking|it technician)\b/i.test(desc)) return true;
        return false;
      }

      if (currentFilter === 'engineering') {
        if (jobNo.startsWith('EN')) return true;
        if (/\b(engineering|mechanical|civil|electrical|electronic|chemical|cad)\b/i.test(category)) return true;
        if (/\b(engineering|water treatment|cad engineer|civil engineer|mechanical engineer|electrical engineer)\b/i.test(industry)) return true;
        if (/\b(cad|autocad|draftsman|water treatment plant|2d\/3d design|civil engineer|mechanical engineer|electrical engineer|site engineer|structural engineer)\b/i.test(role) && !industry.includes('interior')) return true;
        return false;
      }

      if (currentFilter === 'sales') {
        if (jobNo.startsWith('SA') || jobNo.startsWith('BU') || jobNo.startsWith('PR')) return true;
        if (/\b(sales|business development|bdm|bde|marketing)\b/i.test(category)) return true;
        if (/\b(sales|business development|presales|insurance|b2b sales)\b/i.test(industry)) return true;
        if (/\b(sales|business development|bdm|bde|sdr|account executive|telesales|inside sales|relationship manager|client acquisition)\b/i.test(role)) return true;
        return false;
      }

      if (currentFilter === 'fresher') {
        if (/\b(fresher|entry|intern|trainee|no experience)\b/i.test(expLevel)) return true;
        if (/\b(fresher|entry|intern|trainee|no experience)\b/i.test(exp)) return true;
        if (/\b(fresher|trainee|intern)\b/i.test(role)) return true;
        if (/^0\b|^0\s*(year|yr|month|–|-|—|\/|to|&)/i.test(exp.trim())) return true;
        if (/\bfreshers?\s+(can|are|welcome|eligible|encouraged)\b/i.test(desc)) return true;
        return false;
      }

      if (currentFilter === 'experienced') {
        if (/\b(experienced|experience)\b/i.test(expLevel)) return true;
        const cleanExp = exp.trim();
        if (/\b([1-9]|1[0-9])\s*(year|yr)/i.test(cleanExp) && !cleanExp.startsWith('0')) return true;
        if (/0\s*(?:-|–|—|to)\s*([1-9]\d*)\s*(?:year|yr)/i.test(cleanExp)) return true;
        if (/\b(6|12)\s*month/i.test(cleanExp) && !cleanExp.startsWith('0')) return true;
        if (/0\s*months?\s*(?:-|–|—|to)\s*([1-9]\d*)\s*(?:year|yr)/i.test(cleanExp)) return true;
        if (/\bexperienced\b/i.test(cleanExp)) return true;
        return false;
      }

      return true;
    });
  }

  // 2. Filter by search query (currentSearchQuery)
  if (currentSearchQuery) {
    filtered = filtered.filter(job => {
      const role = getValue(job, 'Role', '').toLowerCase();
      const desc = getValue(job, 'Description', '').toLowerCase();
      const loc = getValue(job, 'Location', '').toLowerCase();
      const locDup = getValue(job, 'Location_duplicate', '').toLowerCase();
      const category = getValue(job, 'Category', '').toLowerCase();
      const industry = getValue(job, 'Industry', '').toLowerCase();
      const exp = getValue(job, 'Experience', '').toLowerCase();
      const salary = getValue(job, 'Salary', '').toLowerCase();
      const jobNo = getValue(job, 'Job No', '').toLowerCase();

      return role.includes(currentSearchQuery) ||
             desc.includes(currentSearchQuery) ||
             loc.includes(currentSearchQuery) ||
             locDup.includes(currentSearchQuery) ||
             category.includes(currentSearchQuery) ||
             industry.includes(currentSearchQuery) ||
             exp.includes(currentSearchQuery) ||
             salary.includes(currentSearchQuery) ||
             jobNo.includes(currentSearchQuery);
    });
  }

  // Update counter dynamically
  const counter = document.getElementById('job-count');
  if (counter) {
    counter.textContent = `${filtered.length}+`;
  }

  if (filtered.length === 0) {
    if (noJobs) {
      noJobs.classList.remove('hidden');
      if (currentSearchQuery || currentFilter !== 'all') {
        noJobs.innerHTML = `
          <p class="text-gray-500 text-sm">There are no relevant jobs according to your needs/skills.</p>
          <button id="browse-all-jobs-btn" class="mt-4 inline-flex items-center gap-1.5 px-6 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-brand-cyan to-brand-blue hover:opacity-90 transition-opacity shadow-sm hover:shadow-md cursor-pointer">
            Browse other Jobs &rarr;
          </button>
        `;
      } else {
        // Default empty page fallback
        noJobs.innerHTML = `
          <p class="text-gray-400 text-sm">No openings at the moment. Check back soon for future openings.</p>
          <a href="contact.html"
             class="mt-4 inline-block px-6 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-brand-cyan to-brand-blue">
            Contact Recruitment Team
          </a>
        `;
      }
    }
    grid.querySelectorAll('.job-card, .skeleton-card').forEach(el => el.remove());
  } else {
    if (noJobs) noJobs.classList.add('hidden');
    
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
}

function formatSalary(salary) {
  if (!salary) return 'Best in Industry';
  let s = String(salary).trim();
  s = s.replace(/^\?+/, '₹').replace(/\s*\?+/g, ' ₹').replace(/\?/g, '₹');
  if (!s.includes('₹') && !/inr|rs/i.test(s) && /\d/.test(s)) {
    s = '₹' + s;
  }
  return s;
}

function createJobCard(job, index = 0) {
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
  let rawJobNo   = (getValue(job, 'JobNo') || getValue(job, 'Job No') || getValue(job, 'Job ID') || '').trim();
  let jobNo      = (rawJobNo && rawJobNo.toLowerCase() !== 'n/a') ? rawJobNo : 'N/A';
  const role     = getValue(job, 'Role', 'Job Opportunity').trim();
  const loc      = getValue(job, 'Location', 'Gurugram, Haryana').trim();
  let salary     = getValue(job, 'Salary', 'Best in Industry').trim();
  salary         = formatSalary(salary);
  const exp      = getValue(job, 'Experience', 'Freshers / Experienced').trim();
  const desc     = getValue(job, 'Description', 'Please contact us for full job details and requirements.').trim();
  
  // Support category/industry default if missing or empty
  let category   = getValue(job, 'Industry', '') || getValue(job, 'Category', '');
  if (!category) {
    category = 'BPO / Call Centre';
  }

  // Always use unique JobNo as primary query parameter, fallback to role
  const targetParam = (jobNo && jobNo !== 'N/A') ? jobNo : role;
  const encodedParam = encodeURIComponent(targetParam);
  const jobDetailsUrl = `job-details.html?id=${encodedParam}`;
  const delayClass = `delay-${((index % 2) + 1) * 100}`;

  // Escape variables for XSS protection
  const escapedJobNo = escapeHTML(jobNo);
  const escapedRole = escapeHTML(role);
  const wrappedRole = escapeHTML(allowWrap(role));
  const escapedLoc = escapeHTML(allowWrap(loc));
  const escapedSalary = escapeHTML(allowWrap(salary));
  const escapedExp = escapeHTML(allowWrap(exp));
  const escapedCategory = escapeHTML(allowWrap(category));

  return `
    <article class="job-card bg-white rounded-2xl border border-gray-100 shadow-sm card-hover overflow-hidden flex flex-col h-full cursor-pointer" data-job-id="${escapedJobNo}" data-role="${escapedRole}">
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
        <h3 class="text-lg font-bold text-gray-900 mb-3 break-words" style="overflow-wrap: anywhere; word-break: break-word;">
          <a href="${jobDetailsUrl}" target="_blank" rel="noopener noreferrer" class="hover:text-brand-cyan transition-colors">
            ${wrappedRole}
          </a>
        </h3>
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div class="flex items-start gap-2 text-xs text-gray-500 min-w-0">
            <svg class="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span class="break-words leading-snug min-w-0" style="overflow-wrap: anywhere; word-break: break-word;">${escapedLoc}</span>
          </div>
          <div class="flex items-start gap-2 text-xs text-gray-500 min-w-0">
            <svg class="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span class="break-words leading-snug min-w-0" style="overflow-wrap: anywhere; word-break: break-word;">${escapedSalary}</span>
          </div>
          <div class="flex items-start gap-2 text-xs text-gray-500 min-w-0">
            <svg class="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            <span class="break-words leading-snug min-w-0" style="overflow-wrap: anywhere; word-break: break-word;">${escapedExp}</span>
          </div>
          <div class="flex items-start gap-2 text-xs text-gray-500 min-w-0">
            <svg class="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            <span class="break-words leading-snug min-w-0" style="overflow-wrap: anywhere; word-break: break-word;">${escapedCategory}</span>
          </div>
        </div>
        ${desc.length > 150 ? `
          <p class="text-sm text-gray-500 leading-relaxed mb-1 line-clamp-3 job-desc-text break-words" style="overflow-wrap: anywhere; word-break: break-word;">
            ${formatDesc(desc)}
          </p>
          <a href="${jobDetailsUrl}" target="_blank" rel="noopener noreferrer" class="view-details-link text-xs font-semibold text-brand-cyan hover:text-brand-blue mb-5 inline-block focus:outline-none transition-colors">
            View Details &amp; Apply &rarr;
          </a>
        ` : `
          <p class="text-sm text-gray-500 leading-relaxed mb-6 break-words" style="overflow-wrap: anywhere; word-break: break-word;">
            ${formatDesc(desc)}
          </p>
        `}
        <div class="mt-auto">
          <a href="${jobDetailsUrl}"
             target="_blank" rel="noopener noreferrer"
             class="apply-btn w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-all">
            Apply Now
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
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
        "sameAs": "https://bpoxcel.com",
        "logo": "https://bpoxcel.com/images/logo.webp"
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

// Premium Job Application Popup Handler for pages loading jobs.js
(function () {
  'use strict';

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

  function persistSelectedJob(el) {
    try {
      var card = el.closest('.job-card');
      var jId = card ? (card.getAttribute('data-job-id') || card.getAttribute('data-role')) : '';
      if (jId && jId !== 'N/A') {
        sessionStorage.setItem('bpoxcel_selected_job_id', jId);
        localStorage.setItem('bpoxcel_selected_job_id', jId);
        localStorage.setItem('bpoxcel_selected_job_time', String(Date.now()));
      }
    } catch (err) {}
  }

  // Intercept apply-btn clicks
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.apply-btn');
    if (!btn) return;
    var url = btn.getAttribute('href');
    // If the button points to a job-details page, allow regular navigation!
    if (url && (url.includes('job-details') || url.includes('job.html'))) {
      persistSelectedJob(btn);
      return;
    }
    // Only intercept if it's an explicit Google Form application link
    if (url && url.includes('docs.google.com/forms')) {
      e.preventDefault();

      // Dynamically load CSS if not present
      if (!document.getElementById('bpx-popup-css-link')) {
        var link = document.createElement('link');
        link.id = 'bpx-popup-css-link';
        link.rel = 'stylesheet';
        var isSubdir = /\/(blog|apply|job)\//.test(window.location.pathname);
        link.href = isSubdir ? '../css/popup.min.css' : 'css/popup.min.css';
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

  // Preserve job selection in both sessionStorage & localStorage on any link click
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="job-details"], a[href*="job.html"], .read-more-btn, .view-details-link');
    if (a) {
      persistSelectedJob(a);
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
              '<input type="text" class="bpx-input" id="bpx-job-looking" name="looking_for" value="' + escapeHTML(jobNo) + '" readonly style="background:#f1f5f9;color:#64748b;font-weight:600;cursor:not-allowed;" />' +
            '</div>' +

            '<!-- Error Banner -->' +
            '<div class="bpx-form-error" id="bpx-job-form-error" role="alert">Something went wrong. Please try again.</div>' +

            '<!-- Agreement Checkbox -->' +
            '<div class="bpx-checkbox-field">' +
              '<input type="checkbox" id="bpx-job-agree" class="bpx-checkbox-input" required />' +
              '<label for="bpx-job-agree" class="bpx-checkbox-label">By applying you agree to recieve assistance for further alignments.</label>' +
            '</div>' +
            '<span class="bpx-error-msg" id="bpx-job-agree-err">Please agree to proceed.</span>' +

            '<!-- Privacy notice -->' +
            '<p style="text-align:center;font-size:11px;color:#94a3b8;margin:0;display:flex;align-items:center;justify-content:center;gap:5px;">' +
              '<svg style="width:14px;height:14px;color:#0891b2;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>' +
              'Your information is secure and will only be used for recruitment purposes.' +
            '</p>' +

            '<!-- Submit -->' +
            '<button type="submit" class="bpx-submit-btn" id="bpx-job-submit-btn" disabled>Submit Application</button>' +
          '</form>' +
        '</div>' +

        '<!-- Success View -->' +
        '<div id="bpx-job-success-view" style="display:none;">' +
          '<div class="bpx-success">' +
            '<div class="bpx-success-icon">' +
              '<div style="width:56px;height:56px;border-radius:50%;background:#ecfeff;border:1.5px solid #cffafe;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;color:#0891b2;box-shadow:0 4px 12px rgba(8,145,178,0.15);">' +
                '<svg style="width:28px;height:28px;stroke:#0891b2;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>' +
              '</div>' +
            '</div>' +
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
    var agreeCb = document.getElementById('bpx-job-agree');
    var agreeErr = document.getElementById('bpx-job-agree-err');

    if (agreeCb && submitBtn) {
      submitBtn.disabled = !agreeCb.checked;
      agreeCb.addEventListener('change', function () {
        submitBtn.disabled = !this.checked;
        if (this.checked && agreeErr) {
          agreeErr.classList.remove('bpx-show');
        }
      });
    }

    // Clear errors on input
    var inputs = form.querySelectorAll('input:not([type="checkbox"])');
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

      // Validate Agreement Checkbox
      if (!agreeCb || !agreeCb.checked) {
        if (agreeErr) agreeErr.classList.add('bpx-show');
        valid = false;
      } else {
        if (agreeErr) agreeErr.classList.remove('bpx-show');
      }

      if (!valid) return;

      // Submit form
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="bpx-spinner"></span> Submitting\u2026';

      function handleSuccess(skipMark) {
        document.getElementById('bpx-job-form-view').style.display = 'none';
        document.getElementById('bpx-job-success-view').style.display = 'block';
        if (skipMark !== true) {
          markAsSubmitted(jobNo);
        }

        var successCloseBtn = document.getElementById('bpx-job-close-success-btn');
        successCloseBtn.focus();
        successCloseBtn.addEventListener('click', closePopup);
      }

      if (hasAlreadySubmitted(jobNo)) {
        setTimeout(function () { handleSuccess(true); }, 400);
        return;
      }

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
        .then(handleSuccess)
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
