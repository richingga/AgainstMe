const fs = require('fs');

// 1. UPDATE index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace(/bg-cream text-charcoal/g, 'bg-[#FAF8FF] text-[#1E1B38]');
fs.writeFileSync('index.html', indexHtml);

// 2. UPDATE index.css
const cssContent = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --c1: #6367FF;
  --c2: #8494FF;
  --c3: #C9BEFF;
  --c4: #FFDBFD;
  --dark: #1E1B38;
  --bg: #F7F5FF;
}

body {
  font-family: var(--font);
  background-color: #F7F5FF;
  color: #1E1B38;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  min-height: 100vh;
}

/* Custom palette helpers */
.bg-canvas { background-color: #F7F5FF !important; }
.bg-card { background-color: #FFFFFF !important; }
.border-card { border-color: #E2DCFF !important; }
.text-brand { color: #6367FF !important; }
.text-muted { color: #696291 !important; }
`;
fs.writeFileSync('src/index.css', cssContent);

// 3. UPDATE tailwind.config.js
const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 4 WARNA PALET PILIHAN YANG MULIA:
        // #6367FF (Royal Iris / Deep Periwinkle)
        // #8494FF (Periwinkle Glow)
        // #C9BEFF (Pastel Soft Lavender)
        // #FFDBFD (Pastel Blush Pink)
        
        // Background dasar aplikasi
        cream: {
          DEFAULT: '#F7F5FF',
          dark: '#EBE5FF',
          light: '#FCFBFF'
        },
        // Card Border & container
        sand: {
          DEFAULT: '#DDD5FF',
          light: '#ECE7FF',
          dark: '#C9BEFF'
        },
        // Primary Action & Highlights (Semua tombol aksi, icon brand, active state)
        terracotta: {
          DEFAULT: '#6367FF',
          hover: '#4F53EB',
          light: '#ECE9FF', // lavender tint untuk badge
          card: '#FFFFFF'
        },
        // Secondary Highlight & Progress Bars
        amber: {
          DEFAULT: '#8494FF',
          deep: '#6367FF',
          light: '#EDEFFF'
        },
        // Aksen ketiga (Pengganti Sage hijau jadi Lavender/Periwinkle)
        sage: {
          DEFAULT: '#8494FF',
          deep: '#6367FF',
          light: '#F1EEFF'
        },
        // Text Charcoal & Muted
        charcoal: '#1E1B38',
        brown: {
          DEFAULT: '#2A254B',
          muted: '#696291',
          light: '#9890C7'
        },
        // Aksen Pink Pastel (#FFDBFD)
        blush: {
          DEFAULT: '#FFDBFD',
          light: '#FFF2FE',
          deep: '#F0A5EC'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
`;
fs.writeFileSync('tailwind.config.js', tailwindConfig);

console.log('Base configs updated!');
