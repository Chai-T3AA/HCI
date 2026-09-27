/**
 * TAILWIND CONFIG
 * ----------------
 * TimeWise's color system, "Soft Winter/Cream" (light) and "Deep Cocoa/Ice
 * Blue" (dark) — see the design brief this was built from. Every themeable
 * color is a CSS variable defined in index.css (`:root` for light, `.dark`
 * for dark) and referenced here via `rgb(var(--x) / <alpha-value>)`, so:
 *   1. Switching a color for BOTH modes at once means editing exactly one
 *      place (index.css), not hunting through ~20 component files.
 *   2. Every token still supports Tailwind's opacity modifiers, e.g.
 *      `bg-primary/50`, exactly like a plain hex color would.
 * A few tokens are deliberately fixed (not variables) because they're
 * meant to look the same in both themes — see the comments below.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // 'class' (not the default 'media') means dark mode is driven by adding
  // a `dark` class to <html> — see SettingsContext, which toggles it based
  // on the user's Appearance setting rather than their OS preference.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // --- Theme-reactive tokens (values swap via CSS var, see index.css) ---
        background: 'rgb(var(--color-background) / <alpha-value>)', // main page background
        surface: 'rgb(var(--color-surface) / <alpha-value>)', // cards, secondary surfaces
        surfaceElevated: 'rgb(var(--color-surface-elevated) / <alpha-value>)', // modals, popovers, elevated cards
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)', // primary interactive elements / selected states
          hover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
        },
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)', // secondary interactive elements / highlights
        accent: 'rgb(var(--color-accent) / <alpha-value>)', // subtle warm accents, "Best Match", selected chips
        textPrimary: 'rgb(var(--color-text-primary) / <alpha-value>)', // headings, important text
        textSecondary: 'rgb(var(--color-text-secondary) / <alpha-value>)', // secondary/muted text
        border: 'rgb(var(--color-border) / <alpha-value>)',

        // --- Fixed tokens (identical in both themes) ---
        // The sidebar is a brand anchor, not a "page surface" — it stays the
        // same deep chocolate-brown regardless of light/dark, matching how
        // the app already behaved before this theme (sidebar never flipped).
        sidebar: '#4B3325',
        onSidebar: '#F0F2EE', // text/icons sitting on the sidebar
        // Small color chips (priority badges, "Best Match" pill) carry their
        // own background and need one text color that reads on all of them;
        // rather than swap it per-theme, it's fixed dark ink, chosen because
        // every chip color in this palette is light/mid-toned enough for it.
        onAccent: '#4B3325',
        // Semantic status colors — kept distinct from the brand blues/browns
        // per the brief ("harmonize, don't replace semantic meaning"), but
        // muted to match the palette's soft, non-neon register.
        danger: {
          DEFAULT: '#B3423A',
          50: '#F8E7E4',
          100: '#F0CDC7',
          700: '#8A322C',
        },
        warning: '#B08246', // muted ochre — "heavy" workload, distinct from "overloaded" (danger)
      },
      fontFamily: {
        // Serif for editorial headings, sans for everyday UI text.
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -4px rgba(75, 51, 37, 0.14)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
