/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light (default)
        paper:    '#F7F3EC',
        cream:    '#FBF7F0',
        ink:      '#171615',
        graphite: '#5C5854',
        ash:      '#A9A39B',
        rule:     '#E5DFD3',
        accent:   '#C84B26',
        'accent-deep': '#9F3A1B',
        success:  '#3F6F4F',
        warn:     '#B8881C',
      },
      fontFamily: {
        // Display serif for numbers - Instrument Serif is free via Google Fonts
        // and has the high-contrast, vintage-ticket feel we want.
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        // Body grotesque - DM Sans is clean, refined, NOT Inter.
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      fontSize: {
        // The token number is the hero. Make it enormous on mobile too.
        'token': ['9rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
        'token-lg': ['14rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up': 'fade-up 0.5s ease-out',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [],
};
