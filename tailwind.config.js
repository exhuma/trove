/** @type {import('tailwindcss').Config} */

// The single source of colour for the app. Components reference these semantic
// names only — no hex literals anywhere in src/.
// Palette read off the MagicCon Amsterdam photos: the near-black hall ceiling,
// the violet carpet and booth headers, and the burnt-amber "Art of Magic"
// banner.
export default {
  content: ['./src/**/*.{vue,ts,html}'],
  theme: {
    extend: {
      colors: {
        // Backdrop: the unlit hall.
        hall: {
          DEFAULT: '#0a090f',
          raised: '#131120',
          panel: '#1b1830',
          line: '#2c2745',
        },
        // Primary: the carpet and the booth headers.
        violet: {
          muted: '#3d2a63',
          DEFAULT: '#7c3aed',
          bright: '#a06cf5',
        },
        // Accent: the "Art of Magic" banner. Reserved for progress + completion.
        amber: {
          muted: '#7a4520',
          DEFAULT: '#e08d3c',
          bright: '#f5b463',
        },
        ink: {
          DEFAULT: '#ece9f7',
          muted: '#9c94b8',
          faint: '#645c80',
        },
        danger: '#e05252',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Standard trading-card proportion, so tiles letterbox cards precisely.
      aspectRatio: {
        card: '488 / 680',
      },
    },
  },
  plugins: [],
}
