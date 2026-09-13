/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f2f8f3',
          100: '#e0efe2',
          200: '#c1dfc7',
          300: '#96c6a1',
          400: '#67a877',
          500: '#448b59',
          600: '#316f45',
          700: '#295939',
          800: '#234730',
          900: '#1d3b29',
        },
        soil: {
          50: '#faf7f2',
          100: '#f0e8dc',
          200: '#e0cdb2',
          300: '#cdac84',
          400: '#bb8d5f',
          500: '#a97646',
          600: '#8f5f38',
          700: '#734b2f',
          800: '#5f3e2a',
          900: '#513525',
        },
      },
    },
  },
  plugins: [],
}
