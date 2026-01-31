import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          500: '#FF6B35',
          600: '#E55A2B',
        },
        teal: {
          400: '#00d4aa',
        },
        purple: {
          600: '#6366f1',
          700: '#5558e3',
        }
      }
    },
  },
  plugins: [],
}
export default config
