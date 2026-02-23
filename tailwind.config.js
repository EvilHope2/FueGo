/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfeff",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e"
        }
      }
    }
  },
  plugins: []
};

