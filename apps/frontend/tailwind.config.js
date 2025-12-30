/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#4f46e5',
        success: '#10b981',
        danger: '#f43f5e',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
}
