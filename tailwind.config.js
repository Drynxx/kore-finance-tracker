/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Clean Fintech Palette
        primary: {
          DEFAULT: '#4F46E5', // Indigo-600
          hover: '#4338CA',   // Indigo-700
          light: '#E0E7FF',   // Indigo-100
        },
        success: {
          DEFAULT: '#10B981', // Emerald-500
          light: '#D1FAE5',   // Emerald-100
        },
        danger: {
          DEFAULT: '#F43F5E', // Rose-500
          light: '#FFE4E6',   // Rose-100
        },
        background: '#F8FAFC', // Slate-50
        surface: '#FFFFFF',
        text: {
          primary: '#1E293B', // Slate-800
          secondary: '#64748B', // Slate-500
          muted: '#94A3B8',   // Slate-400
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
