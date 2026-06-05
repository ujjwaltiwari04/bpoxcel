// Sticky navbar shadow on scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('navbar-scrolled', window.scrollY > 20);
});

// Hamburger toggle for mobile menu
const hamburger = document.getElementById('hamburger');
const navMenu   = document.getElementById('nav-menu');
hamburger.addEventListener('click', () => navMenu.classList.toggle('open'));
navMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navMenu.classList.remove('open'));
});

// Intersection Observer for scroll-reveal animations
let observer;
document.addEventListener('DOMContentLoaded', () => {
  const revealElements = document.querySelectorAll('.reveal');
  
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // Stop observing once revealed
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });
  
  revealElements.forEach(el => observer.observe(el));

  // Careers Filtering Click Delegate
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      const filter = e.target.getAttribute('data-filter');
      applyJobFilter(filter);
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
    return job[actualKey];
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
      // Default to dd/mm/yyyy (Indian standard format)
      day = part1;
      month = part2 - 1;
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

  try {
    // Reset state
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    noJobs.classList.add('hidden');
    
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

    allJobsList = activeJobs;

    // Hide loading
    loading.classList.add('hidden');

    if (activeJobs.length === 0) {
      noJobs.classList.remove('hidden');
      counter.textContent = '0';
      grid.innerHTML = '';
      return;
    }

    // Update counter dynamically
    counter.textContent = `${activeJobs.length}+`;

    // Render cards & Generate SEO Schema
    grid.innerHTML = activeJobs.map((job, index) => createJobCard(job, index)).join('');
    
    // Observe dynamic reveal elements inside grid
    if (observer) {
      grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }
    
    generateJobSchema(activeJobs);

  } catch (err) {
    console.error('BPOXCEL Jobs Error:', err);
    loading.classList.add('hidden');
    error.classList.remove('hidden');
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

      if (filterType === 'bpo') {
        return category.includes('bpo') || category.includes('call') || category.includes('voice') || category.includes('sales') ||
               role.includes('bpo') || role.includes('voice') || role.includes('customer') || role.includes('support') || role.includes('telecaller') || role.includes('back office') || role.includes('sales') ||
               desc.includes('bpo') || desc.includes('voice') || desc.includes('customer') || desc.includes('support') || desc.includes('telecaller') || desc.includes('sales');
      }
      if (filterType === 'it') {
        return category.includes('it') || category.includes('tech') || category.includes('software') ||
               role.includes('it') || role.includes('developer') || role.includes('software') || role.includes('tech') || role.includes('engineer') ||
               desc.includes('it') || desc.includes('developer') || desc.includes('software') || desc.includes('tech') || desc.includes('engineer');
      }
      if (filterType === 'fresher') {
        return exp.includes('0') || exp.includes('fresher') || exp.includes('entry') ||
               (!exp.includes('1') && !exp.includes('2') && !exp.includes('3') && !exp.includes('4') && !exp.includes('5') && !exp.includes('6') && !exp.includes('7') && !exp.includes('8') && !exp.includes('9'));
      }
      if (filterType === 'experienced') {
        return exp.includes('1') || exp.includes('2') || exp.includes('3') || exp.includes('4') || exp.includes('5') || exp.includes('6') || exp.includes('7') || exp.includes('8') || exp.includes('9') || exp.includes('experience');
      }
      return true;
    });
  }

  if (filtered.length === 0) {
    noJobs.classList.remove('hidden');
    grid.innerHTML = '';
  } else {
    noJobs.classList.add('hidden');
    grid.innerHTML = filtered.map((job, index) => createJobCard(job, index)).join('');
    
    // Observe dynamic reveal elements inside grid
    if (observer) {
      grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
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

  // Extract headers (case-insensitive conversion handled dynamically by getValue)
  const rawHeaders = result[0].map(h => h.trim());
  const dataRows = result.slice(1);

  return dataRows.map(dataRow => {
    const obj = {};
    rawHeaders.forEach((header, index) => {
      obj[header] = dataRow[index] !== undefined ? dataRow[index] : '';
    });
    return obj;
  });
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
  let jobNo      = getValue(job, 'JobNo', 'N/A').trim();
  if (!jobNo || jobNo.toLowerCase() === 'n/a') {
    jobNo = 'N/A';
  }
  const role     = getValue(job, 'Role', 'Job Opportunity').trim();
  const loc      = getValue(job, 'Location', 'Gurugram, Haryana').trim();
  const salary   = getValue(job, 'Salary', 'Best in Industry').trim();
  const exp      = getValue(job, 'Experience', 'Freshers / Experienced').trim();
  const desc     = getValue(job, 'Description', 'Please contact us for full job details and requirements.').trim();
  
  // Support category default if missing or empty
  let category   = getValue(job, 'Category', '').trim();
  if (!category) {
    category = 'BPO / Call Centre';
  }

  // Application Link Validation
  let applyLink = getValue(job, 'ApplyLink', '').trim();
  if (!/^https?:\/\//i.test(applyLink)) {
    // Fallback to WhatsApp with context-aware template message
    const message = jobNo !== 'N/A' 
      ? `Hi BPOXCEL, I want to apply for Job No. ${jobNo} (${role}).`
      : `Hi BPOXCEL, I want to apply for the ${role} position.`;
    applyLink = `https://wa.me/918588931044?text=${encodeURIComponent(message)}`;
  }

  const delayClass = `delay-${((index % 2) + 1) * 100}`;

  return `
    <article class="bg-white rounded-2xl border border-gray-100 shadow-sm card-hover overflow-hidden flex flex-col h-full reveal reveal-up ${delayClass}">
      <div class="h-1 w-full bg-gradient-to-r from-brand-cyan to-brand-blue"></div>
      <div class="p-7 flex flex-col h-full">
        <div class="flex items-center justify-between mb-5">
          <span class="job-number text-xs font-bold text-brand-cyan px-3 py-1 rounded-full">
            Job No: ${jobNo}
          </span>
          <span class="job-tag ${badgeClass}">
            <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>
            ${badgeText}
          </span>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-3">${role}</h3>
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <svg class="w-4 h-4 text-brand-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span class="truncate">${loc}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <svg class="w-4 h-4 text-brand-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span class="truncate">${salary}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <svg class="w-4 h-4 text-brand-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            <span class="truncate">${exp}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <svg class="w-4 h-4 text-brand-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            <span class="truncate">${category}</span>
          </div>
        </div>
        <p class="text-sm text-gray-500 leading-relaxed mb-6 line-clamp-3">
          ${desc}
        </p>
        <div class="mt-auto">
          <a href="${applyLink}"
             target="_blank" rel="noopener noreferrer"
             class="apply-btn w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold shadow-sm">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Apply Now
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

  const schemas = activeJobs.map(job => {
    const parsedDate = safeParseDate(getValue(job, 'Date Added'));
    const datePostedISO = parsedDate.getTime() > 0 ? parsedDate.toISOString() : new Date().toISOString();

    return {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      "title": getValue(job, 'Role', 'BPO Job'),
      "description": getValue(job, 'Description', 'BPOXCEL Job Opportunity'),
      "identifier": {
        "@type": "PropertyValue",
        "name": "BPOXCEL",
        "value": getValue(job, 'JobNo', 'N/A')
      },
      "datePosted": datePostedISO,
      "hiringOrganization": {
        "@type": "Organization",
        "name": "BPOXCEL",
        "sameAs": "https://www.bpoxcel.com",
        "logo": "https://www.bpoxcel.com/images/logo.png"
      },
      "jobLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": getValue(job, 'Location', 'Gurugram'),
          "addressRegion": "Haryana",
          "addressCountry": "IN"
        }
      }
    };
  });

  const script = document.createElement('script');
  script.id = 'dynamic-job-schema';
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schemas);
  document.head.appendChild(script);
}

// Initial Fetch on Load
document.addEventListener('DOMContentLoaded', fetchJobs);

// Floating Back to Top Button
const backToTopBtn = document.getElementById('back-to-top');
if (backToTopBtn) {
  window.addEventListener('scroll', () => {
    backToTopBtn.classList.toggle('show', window.scrollY > 300);
  });
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
