const defaultTheme = require('tailwindcss/defaultTheme');

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
        // Paleta "Obsidian & Raw Bone" (rebrand 2026-08-27 v2). Nombres
        // actualizados otra vez — grep por asphalt/galleryBone/crimson/
        // hypeGold si algo viejo no compila.
        obsidian: '#050507',
        rawBone: '#F5F1E8',
        laserCrimson: '#FF1E42',
        mutedGold: '#C5A059',
        // Tokens de tema (next-themes) — ver src/styles/globals.css para los valores reales por modo
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: { DEFAULT: 'var(--card)', foreground: 'var(--foreground)' },
        popover: { DEFAULT: 'var(--popover)', foreground: 'var(--foreground)' },
        primary: { DEFAULT: 'var(--primary)', foreground: '#FFFFFF' },
        secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--foreground)' },
        accent: { DEFAULT: 'var(--accent)', foreground: '#050507' },
        destructive: { DEFAULT: 'var(--destructive)', foreground: '#FFFFFF' },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        sidebar: 'var(--sidebar)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
        display: ['var(--font-display)', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [],
}