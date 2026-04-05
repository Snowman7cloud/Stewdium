/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        pink: {
          50: '#fdf2f4', 100: '#fce7eb', 200: '#f9ced8',
          300: '#f4a5b8', 400: '#ed7a97', 500: '#e04d73',
        },
        sage: {
          50: '#f4f7f4', 100: '#e5ede5', 200: '#c8dbc8',
          300: '#a3c2a3', 400: '#7ba67b', 500: '#5a8a5a', 600: '#476e47',
        },
      },
      fontFamily: {
        display: ['DM Serif Display', 'serif'],
        body: ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
