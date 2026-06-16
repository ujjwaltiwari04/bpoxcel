/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./jobs.html",
    "./jobs-*.html",
    "./blog/**/*.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif']
      },
      colors: {
        brand: {
          cyan: '#0891b2',
          cyandark: '#0e7490',
          blue: '#1e3a5f',
          bluemid: '#1d4ed8',
          light: '#e0f2fe',
          accent: '#06b6d4',
        }
      }
    },
  },
  plugins: [],
}
