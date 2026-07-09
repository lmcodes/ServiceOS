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
        brand: {
          50: '#f5f7ff',
          500: '#3b82f6', // primary blue accent
          600: '#2563eb',
          900: '#1e3a8a',
        },
        slate: {
          950: '#0b0f19', // deep dark layout background
          900: '#0f172a', // premium dark background
          800: '#1e293b', // card background
          700: '#334155', // borders
        },
        success: '#10b981', // green for serving/completed
        warning: '#f59e0b', // orange for called
        danger: '#ef4444',  // red for cancelled/no-show
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'], // Premium modern font family
      },
      borderRadius: {
        'glass': '12px',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
