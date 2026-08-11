/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        volt: '#c4ff4d',
        ink: '#0b0f0c',
        panel: '#121814',
        line: '#1f2a22'
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
};
