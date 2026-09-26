/**
 * TAILWIND CONFIG
 * ----------------
 * Wires the TimeWise brand palette and typography into Tailwind so every
 * component can use semantic class names (bg-navy, text-cream, font-serif)
 * instead of hard-coded hex values. Keeping the palette here means the
 * whole app's look can be re-themed by editing this one file.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // The five TimeWise brand colors (see PRD section 4 / color rules).
        navy: {
          DEFAULT: '#102A6B', // Silent Navy - headings, primary buttons, sidebar, high priority
          50: '#EEF1F8',
          100: '#D6DCEE',
          600: '#16327E',
          700: '#0C1F52',
        },
        amber: {
          DEFAULT: '#CEA273', // Sandy Amber - accents, "Best Match", selected states
          50: '#FBF3EA',
          100: '#F3E2CD',
        },
        current: {
          DEFAULT: '#015185', // Blue Current - secondary buttons, links, medium priority
          50: '#E6F0F6',
        },
        haze: {
          DEFAULT: '#5990C0', // Blue Haze - soft UI, progress, low priority
          50: '#EEF4FA',
        },
        cream: {
          DEFAULT: '#FCEDD3', // Light Cream - page/card/modal backgrounds
          50: '#FFFBF4',
        },
      },
      fontFamily: {
        // Serif for editorial headings, sans for everyday UI text.
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -4px rgba(16, 42, 107, 0.12)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
