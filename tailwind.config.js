/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Matched to the API logo: deep navy + gold accent.
        brand: {
          50: '#eef1f7',
          100: '#d4dcea',
          500: '#2c4a73',
          600: '#1e3a5f',
          700: '#16294a',
        },
        accent: {
          400: '#d4b35c',
          500: '#c2a14d',
          600: '#a8862f',
        },
      },
    },
  },
  plugins: [],
}
