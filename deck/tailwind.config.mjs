/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'neopop': 'neopop 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards',
        'fill-bar': 'fillBar 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
      },
      keyframes: {
        neopop: {
          '0%': { transform: 'scale(0.98) translate(-2px, -2px)', opacity: '0' },
          '100%': { transform: 'scale(1) translate(0, 0)', opacity: '1' },
        },
        fillBar: {
          from: { width: '0%' },
          to: { width: 'var(--target-width)' },
        },
      },
      boxShadow: {
        'neo': '4px 4px 0px 0px rgba(0,0,0,1)',
        'neo-lg': '6px 6px 0px 0px rgba(0,0,0,1)',
        'neo-xl': '8px 8px 0px 0px rgba(0,0,0,1)',
      },
    },
  },
  plugins: [],
};
