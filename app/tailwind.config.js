/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 4 PALET WARNA PILIHAN YANG MULIA:
        // #6367FF - Primary Royal Iris
        // #8494FF - Periwinkle Blue
        // #C9BEFF - Pastel Soft Lavender
        // #FFDBFD - Pastel Blush Pink
        
        palette: {
          1: '#6367FF',
          2: '#8494FF',
          3: '#C9BEFF',
          4: '#FFDBFD',
          dark: '#1E1B38',
          canvas: '#F7F5FF',
          muted: '#6D6796'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
