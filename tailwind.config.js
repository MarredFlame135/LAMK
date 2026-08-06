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
        // Tokens de tema (next-themes) — ver src/styles/globals.css para los valores reales por modo
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: { DEFAULT: 'var(--card)', foreground: 'var(--foreground)' },
        popover: { DEFAULT: 'var(--popover)', foreground: 'var(--foreground)' },
        primary: { DEFAULT: 'var(--primary)', foreground: '#FFFFFF' },
        secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--foreground)' },
        accent: { DEFAULT: 'var(--accent)', foreground: '#0A0A0C' },
        destructive: { DEFAULT: 'var(--destructive)', foreground: '#FFFFFF' },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        sidebar: 'var(--sidebar)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
    },
  },
  plugins: [],
}