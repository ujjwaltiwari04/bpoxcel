# BPOXCEL Website - Codebase & Maintenance Guide

Welcome to the **BPOXCEL Website** repository. BPOXCEL is a leading recruitment consultancy and workforce solutions partner based in Gurugram, servicing Delhi NCR and North India. 

This repository contains the high-performance static website, career portal, and blog pages.

---

## 🛠️ Tech Stack & Architecture

- **Core**: HTML5, Vanilla JavaScript (ES6+), and CSS3.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) (compiled and optimized).
- **Database**: Integration with Google Sheets CSV API for a dynamic careers portal.
- **Form Handling**: [Formspree](https://formspree.io) endpoint integration for the contact form.
- **SEO**: Structured JSON-LD schemas (`EmploymentAgency` and dynamic Google `JobPosting` graphs) for advanced Search Engine visibility.

---

## 📁 Directory Structure

```text
├── blog/                      # Blog articles & career guides (SEO content landing pages)
├── css/
│   ├── style.css              # Custom custom styling (Source)
│   ├── style.min.css          # Compiled & minified custom styling (Production)
│   ├── tailwind-src.css       # Tailwind CSS v4 directives (Source)
│   └── tailwind.min.css       # Compiled & minified Tailwind CSS classes (Production)
├── images/                    # Website image assets (logos, webp banners, favicon)
├── js/
│   ├── jobs.js                # Google Sheets fetching & filtering logic (Source)
│   ├── jobs.min.js            # Compiled & minified jobs script (Production)
│   ├── main.js                # Form validations, scroll reveals & navbar logic (Source)
│   └── main.min.js            # Compiled & minified main script (Production)
├── pages/                     # Inner website pages
│   ├── blog.html              # Blog landing page
│   ├── contact.html           # Contact page
│   ├── jobs.html              # Main careers board
│   ├── services.html          # Our Services details page
│   └── jobs-*.html            # Regional landing pages for local SEO (Delhi, Noida, etc.)
├── .gitignore                 # Standard files and directories to ignore in Git
├── index.html                 # Homepage (Root entry point)
├── package.json               # Development dependencies & build scripts
├── robots.txt                 # Search engine crawling rules
└── sitemap.xml                # XML Sitemap mapping all pages for indexing
```

---

## ⚙️ Development & Asset Build System

This project uses **Node.js** and **npm** to automate asset compilation and minification. 

> [!IMPORTANT]
> **Workflow Rule**: Always edit the source files (`css/style.css`, `js/main.js`, `js/jobs.js`). Do **NOT** edit `.min.js` or `.min.css` files directly. The build tools will overwrite them.

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org) (v18+) installed.

### 2. Setup
Install development dependencies:
```bash
npm install
```

### 3. Running Local Development Mode
Start watch mode. This will automatically compile Tailwind and minify your custom JS and CSS files whenever they change:
```bash
npm run dev
```

### 4. Compiling for Production
Before deploying or committing changes, run the production build script to compile and minify all assets:
```bash
npm run build
```
This runs the following build pipeline:
1. **Tailwind CSS**: Compiles `@tailwindcss/cli` to `css/tailwind.min.css` with the `--minify` option.
2. **Custom CSS**: Minifies `css/style.css` to `css/style.min.css` using `clean-css-cli`.
3. **JavaScript**: Compresses and mangles `js/main.js` and `js/jobs.js` to their `.min.js` equivalents using `terser`.

---

## 📊 Google Sheets Jobs Database Integration

The careers board on `pages/jobs.html` dynamically fetches current openings from a Google Sheet.

### Configuration Details
- **Spreadsheet ID**: `1B96_0hldq1BLyAsoyWmpIO5TTDmuDgt43MKzb_vIuIY`
- **Tab Name**: `JobsDatabase`
- **Export Endpoint**: The script calls the Google Sheets Visualization API to fetch spreadsheet data in CSV format:
  `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/gviz/tq?tqx=out:csv&sheet=JobsDatabase`

### Database Columns (Case-Insensitive)
To ensure the script loads and displays jobs correctly, columns in the Google Sheet should match these headers:
- `JobNo`: Unique identifier (e.g., `BPO101`).
- `Role`: Job title (e.g., `International Customer Care`).
- `Location`: Job location (e.g., `Gurugram, Haryana`).
- `Salary`: Monthly range or package (e.g., `25,000 - 45,000` or `3.5 - 5.5 LPA`).
- `Experience`: Required tenure (e.g., `Freshers` or `1-4 Years`).
- `Experience Level`: Used for filters (`fresher`, `entry`, `experienced`, `experience`).
- `Category`: Categorization (`BPO`, `Call Centre`, `IT`, etc.).
- `Industry`: Vertical (e.g., `BPO`, `IT`, `Finance`).
- `Description`: The full description of job responsibilities and requirements.
- `Status`: Control field.
  - **Show**: `open`, `urgent`, `active`, `hot`.
  - **Hide**: `closed`, `paused`, or empty.
- `Date Added`: Date formatted as `dd/mm/yyyy`, `mm/dd/yyyy`, or `yyyy-mm-dd`.

### SEO and Schema
The `js/jobs.js` file automatically generates [Schema.org JSON-LD JobPosting](https://schema.org/JobPosting) schemas dynamically for all active job postings, allowing Google Jobs indexer to parse and display BPOXCEL job postings in search results.

---

## ✉️ Contact Forms (Formspree)
The contact form on `pages/contact.html` and `index.html` submits queries to a Formspree endpoint. If you need to change the recipient inbox, replace the form action attribute:
```html
<form id="contact-form" action="https://formspree.io/f/YOUR_ENDPOINT_ID" method="POST">
```

---

## 📝 Best Practices for Future Maintenance
- **Keep SEO tags in sync**: When adding new pages, ensure you update metadata, Open Graph tags, canonical links, and register them in the `sitemap.xml`.
- **Maintain No-JS support**: The `pages/jobs.html` file contains a `<noscript>` block with static fallback job cards so crawlers (like Googlebot) can index the site layout even if JavaScript execution is disabled. Ensure these fallbacks remain representative of core listings.
