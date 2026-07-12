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
          655: '#1d4ed8', // vibrant primary blue
          900: '#1e3a8a',
        },
        slate: {
          950: '#0b0f19', // deep dark layout background
          900: '#0f172a', // premium dark background
          800: '#1e293b', // card background
          700: '#334155', // borders
          655: '#475569', // Slate 600
          650: '#475569',
        },
        emerald: {
          650: '#059669', // Emerald 600
          655: '#059669',
        },
        red: {
          650: '#dc2626', // Red 600
          655: '#dc2626',
        },
        indigo: {
          650: '#4f46e5', // Indigo 600
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
