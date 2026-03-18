/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/pages/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#FCB60F',
          goldLight: '#F9CE42',
          purple: '#BE70E7',
          bg: '#F9F3FC',
          slate: '#515A6A',
          soft: '#C98CE8',
          pale: '#E9D3F2',
          mauve: '#D9AAE3',
          deep: '#9567B9',
        },
        primary: {
          DEFAULT: '#BE70E7',
          50: '#F9F3FC',
          100: '#E9D3F2',
          200: '#D9AAE3',
          300: '#C98CE8',
          400: '#BE70E7',
          500: '#BE70E7',
          600: '#BE70E7',
          700: '#9567B9',
          800: '#9567B9',
          900: '#515A6A'
        }
      }
    }
  },
  plugins: []
}


