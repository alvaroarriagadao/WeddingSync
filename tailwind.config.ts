import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        wedding: {
          sand: '#F5F0EB',
          coral: '#C97B6B',
          gold: '#B8934E',
          turquoise: '#7EC8C8',
          dark: '#1a1a1a',
          ink: '#0a0908',
          cream: '#faf8f5',
          blush: '#FDF5F2',
          terracotta: '#B85C4E',
          sea: '#3D7C7C',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        guest: ['Outfit', 'system-ui', 'sans-serif'],
        'guest-serif': ['Cormorant Garamond', 'Times New Roman', 'serif'],
        'guest-card': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
