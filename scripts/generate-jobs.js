/**
 * Optional Static Job Page Generator
 * Fetches all jobs from Google Sheets and generates individual static HTML files
 * in the /job/ folder for offline archiving or static hosts.
 *
 * Usage: npm run build:jobs
 */

const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1B96_0hldq1BLyAsoyWmpIO5TTDmuDgt43MKzb_vIuIY';
const SHEET_NAME     = 'JobsDatabase';
const CSV_URL        = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

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

function escapeHTML(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function generate() {
  console.log('Fetching live jobs from Google Sheets...');
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error('HTTP error ' + res.status);
  const csv = await res.text();
  const rows = parseCSV(csv);

  const activeJobs = rows.filter(job => {
    const status = getValue(job, 'Status', '').trim().toLowerCase();
    return status === 'open' || status === 'urgent' || status === 'active' || status === 'hot';
  });

  console.log(`Found ${activeJobs.length} active jobs in sheet.`);

  // Create job folder if needed
  const outDir = path.join(__dirname, '..', 'job');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let generatedCount = 0;
  for (const job of activeJobs) {
    const rawJobNo = getValue(job, 'JobNo', '').trim();
    const jobNo = rawJobNo.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!jobNo) continue;

    const safeRole = escapeHTML(getValue(job, 'Role'));
    const encodedJobNo = encodeURIComponent(rawJobNo);

    // Create a static redirect/alias page for each job: e.g. /job/en101.html
    const staticHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeRole} | BPOXCEL</title>
  <meta http-equiv="refresh" content="0; url=../job-details.html?id=${encodedJobNo}">
  <script>
    window.location.replace('../job-details.html?id=${encodedJobNo}');
  </script>
</head>
<body>
  <p>Redirecting to <a href="../job-details.html?id=${encodedJobNo}">${safeRole}</a>...</p>
</body>
</html>`;

    fs.writeFileSync(path.join(outDir, `${jobNo}.html`), staticHtml, 'utf8');
    generatedCount++;
  }

  console.log(`Successfully generated ${generatedCount} job redirect files in /job/ directory.`);
}

generate().catch(console.error);
