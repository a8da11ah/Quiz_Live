/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f0ff',
          100: '#e4e3ff',
          200: '#cccbff',
          300: '#aba9ff',
          400: '#857ffe',
          500: '#6557fb',
          600: '#5438f2',
          700: '#4728de',
          800: '#3b22b8',
          900: '#321e93',
          950: '#1e1163',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'bounce-in': 'bounceIn 0.5s ease-out',
      },
    },
  },
  plugins: [],
}
