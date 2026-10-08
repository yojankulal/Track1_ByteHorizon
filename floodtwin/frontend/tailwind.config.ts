/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B1220',
        surface: '#111A2E',
        'surface-raised': '#18243D',
        border: '#243352',
        primary: '#2F8CFF',
        'primary-accent': '#22D3EE',
        'text-primary': '#E8EEF9',
        'text-secondary': '#9FB0CC',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#2F8CFF',
        severity: {
          0: '#64748B', // None
          1: '#FACC15', // Minor
          2: '#FB923C', // Moderate
          3: '#EF4444', // Severe
          4: '#C026D3', // Critical
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
