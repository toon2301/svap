/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/contexts/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './src/utils/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        // Zmenšenie UI už od 1440px nadol
        hd: '1440px',
        // Žiadosti: plná verzia od 1160px (pod 1159 sa nepáči)
        wide: '1160px',
        // Menšie tlačidlá len pod 1110px; od 1110px (vrátane) rovnaké ako 1111+
        'compact-max': { max: '1109px' },
        compact: '1110px',
        // Od šírky 1379px nadol fixná výška karty žiadosti
        'fixed-h-max': { max: '1379px' },
      },
    },
  },
  plugins: [],
  safelist: [
    // Dynamické triedy, ktoré Tailwind nemôže detekovať pri build-e
    'px-12',
    'py-2',
    'gap-6',
    'max-w-2xl',
    'mx-auto',
    'w-48',
    'h-48',
    'text-6xl',
    'w-32',
    'h-32',
    'text-4xl',
    'w-24',
    'h-24',
    'text-2xl',
    'w-16',
    'h-16',
    'text-lg',
  ],
}

