/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        asphalt: '#0A0A0C',
        bone: '#EDE7DA',
        alertRed: '#E60026',
        goldAccent: '#E8B84B',
      },
    },
  },
  plugins: [],
}