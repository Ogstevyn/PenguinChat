/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        penguin: {
          primary: '#4F46E5',
          ice: '#F8FAFC',
          dark: '#1E293B',
          bg: '#0F172A',
          bubbleMe: '#4F46E5',
          bubbleOther: '#F1F5F9',
          accent: '#06B6D4',
        },
      },
    },
  },
  plugins: [],
};

