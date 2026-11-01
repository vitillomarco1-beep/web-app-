/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Verde prato: colore principale del marchio
        prato: {
          50: '#f1f8f2', 100: '#ddeedf', 200: '#bcdcc1', 300: '#8fc39a',
          400: '#5fa46e', 500: '#3e8851', 600: '#2d6c3f', 700: '#255735',
          800: '#20452c', 900: '#1b3925',
        },
        // Crema: sfondi caldi che richiamano il latte
        crema: {
          50: '#fffdf8', 100: '#fdf8ec', 200: '#f8eed3', 300: '#f1dfae',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
}
