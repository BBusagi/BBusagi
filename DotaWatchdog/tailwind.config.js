/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/ui/**/*.{tsx,ts,jsx,js,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#c0392b',
          green: '#27ae60',
          dark: '#1a1a2e',
          panel: '#16213e',
          border: '#0f3460',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
