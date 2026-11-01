/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Prugna del logo Fratelli Marcantonio (#613846 = 700)
        brand: {
          50: '#faf5f7', 100: '#f3e8ec', 200: '#e6d0d8', 300: '#d1aebb',
          400: '#b38394', 500: '#946073', 600: '#7a4a5c', 700: '#613846',
          800: '#4f2d39', 900: '#3e2430',
        },
        // Arancio della corona del logo (#F7941D = 500): solo accenti, non testo su bianco
        arancio: {
          50: '#fff6eb', 100: '#feead1', 200: '#fdd3a0', 300: '#fbb766',
          400: '#f9a23d', 500: '#f7941d', 600: '#db7a0c', 700: '#b45f0d',
          800: '#8f4b12', 900: '#743f12',
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
