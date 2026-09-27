/**
 * TAILWIND CONFIG
 * ----------------
 * TimeWise's color system, "Soft Cream + Ocean Teal" (light) and "Charcoal +
 * Deep Teal" (dark) — see the design brief this was built from. Every
 * themeable color is a CSS variable defined in index.css (`:root` for
 * light, `.dark` for dark) and referenced here via
 * `rgb(var(--x) / <alpha-value>)`, so:
 *   1. Switching a color for BOTH modes at once means editing exactly one
 *      place (index.css), not hunting through ~20 component files.
 *   2. Every token still supports Tailwind's opacity modifiers, e.g.
 *      `bg-primary/50`, exactly like a plain hex color would.
 *
 * Unlike the previous palette, the SIDEBAR is also theme-reactive here (the
 * brief gives it distinct light/dark teal shades, not one fixed color), so
 * sidebar/onAccent are CSS variables too now, not fixed hexes.
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
        accent: 'rgb(var(--color-accent) / <alpha-value>)', // subtle accents, "Best Match", selected chips
        textPrimary: 'rgb(var(--color-text-primary) / <alpha-value>)', // headings, important text
        textSecondary: 'rgb(var(--color-text-secondary) / <alpha-value>)', // secondary/muted text
        border: 'rgb(var(--color-border) / <alpha-value>)',
        // Deep teal sidebar — its own distinct light/dark shades per the
        // brief (not the same as `background`/`surface`), plus its own
        // "active nav item" and "inactive label" tones so the sidebar reads
        // correctly without borrowing `accent` for that job.
        sidebar: 'rgb(var(--color-sidebar) / <alpha-value>)',
        sidebarActive: 'rgb(var(--color-sidebar-active) / <alpha-value>)',
        sidebarActiveIcon: 'rgb(var(--color-sidebar-active-icon) / <alpha-value>)',
        sidebarInactive: 'rgb(var(--color-sidebar-inactive) / <alpha-value>)',
        // Small color chips (priority badges, primary buttons) carry their
        // own background and need dark ink text to read on a mid-toned teal
        // — the brief gives slightly different ink shades per theme, so
        // this is a variable too, not one fixed hex.
        onAccent: 'rgb(var(--color-on-accent) / <alpha-value>)',

        // --- Fixed tokens (identical in both themes) ---
        // Light, near-neutral text for sitting on the sidebar — the sidebar
        // itself is a dark-ish teal in BOTH page themes, so this doesn't
        // need to flip the way page text does.
        onSidebar: '#F4F5F1',
        // Priority system — one fixed 3-step scale (the brief lists these
        // once, not per light/dark), independent of primary/secondary so
        // priority meaning stays visually consistent regardless of theme.
        priorityHigh: '#52717A',
        priorityMedium: '#78B5C8',
        priorityLow: '#A9B8B5',
        // Semantic status colors — kept distinct from the teal/charcoal
        // system per the brief ("keep the existing priority concept... keep
        // semantic meaning"), muted to match the palette's soft register.
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
        soft: '0 4px 20px -4px rgba(23, 28, 29, 0.14)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
