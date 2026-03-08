import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background:    '#0a0a0f',
        surface:       '#111118',
        'surface-active': '#161622',
        border:        '#1e1e2e',
        'text-primary':   '#e2e8f0',
        'text-secondary': '#94a3b8',
        'text-muted':     '#64748b',
        'text-disabled':  '#334155',
        primary:       '#7c3aed',
        secondary:     '#2563eb',
        cyan:          '#06b6d4',
        emerald:       '#10b981',
        amber:         '#f59e0b',
        rose:          '#f43f5e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float':      'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'scan-line':  'scan-line 2s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
