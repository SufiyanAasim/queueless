/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Editorial palette - warm paper + deep ink + single terracotta accent.
        paper:    '#F7F3EC',  // warm off-white background, like ticket paper
        cream:    '#FBF7F0',  // lighter elevation for cards
        ink:      '#171615',  // primary text - just shy of pure black
        graphite: '#5C5854',  // secondary text
        ash:      '#A9A39B',  // muted / disabled
        rule:     '#E5DFD3',  // hairline borders
        accent:   '#C84B26',  // terracotta - the QueueLess "your turn" color
        'accent-deep': '#9F3A1B',
        success:  '#3F6F4F',  // muted forest green for served tokens
        warn:     '#B8881C',  // muted gold for paused
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
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
