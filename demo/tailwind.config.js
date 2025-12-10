/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        neo: '6px 6px 0px rgba(0,0,0,1)',
        'neo-sm': '4px 4px 0px rgba(0,0,0,1)',
        'neo-lg': '8px 8px 0px rgba(0,0,0,1)',
        'neo-xl': '10px 10px 0px rgba(0,0,0,1)',
      },
      keyframes: {
        neopop: {
          '0%': { transform: 'translateY(20px) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-border': {
          '0%, 100%': { boxShadow: '4px 4px 0px 0px rgba(0, 0, 0, 1)' },
          '50%': { boxShadow: '6px 6px 0px 0px rgba(0, 0, 0, 1)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        neopop: 'neopop 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards',
        float: 'float 3s ease-in-out infinite',
        'pulse-border': 'pulse-border 2s ease-in-out infinite',
        marquee: 'marquee 20s linear infinite',
        'marquee-reverse': 'marquee-reverse 20s linear infinite',
        shimmer: 'shimmer 2s infinite',
      },
      colors: {
        ink: '#0f0f0f',
        lemonade: '#fff3bf',
        blush: '#ffe1f0',
        mint: '#c7f8e4',
        sky: '#d7f0ff',
        sunshine: '#fde047',
        coral: '#fb7185',
        electric: '#a78bfa',
        azure: '#67e8f9',
      },
    },
  },
  plugins: [],
};
