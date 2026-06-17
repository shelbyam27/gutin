import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        'brand-deep': 'rgb(var(--brand-deep) / <alpha-value>)',
        'brand-from': 'rgb(var(--brand) / <alpha-value>)',
        'brand-to': 'rgb(var(--brand) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-deep': 'rgb(var(--accent-deep) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
      },
      maxWidth: {
        page: '1200px',
      },
      boxShadow: {
        brutal: '4px 4px 0 0 rgb(var(--ink))',
        'brutal-sm': '3px 3px 0 0 rgb(var(--ink))',
        'brutal-lg': '6px 6px 0 0 rgb(var(--ink))',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'tilt-in': {
          '0%': { transform: 'rotate(-3deg) scale(.94)', opacity: '0' },
          '100%': { transform: 'rotate(-2deg) scale(1)', opacity: '1' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        'tilt-in': 'tilt-in .6s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
