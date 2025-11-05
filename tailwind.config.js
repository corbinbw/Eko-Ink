/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // EkoInk Brand Colors
        'royal-ink': {
          DEFAULT: '#1C2541',
          50: '#E8EAF0',
          100: '#D1D5E1',
          200: '#A3ABC3',
          300: '#7581A5',
          400: '#475787',
          500: '#1C2541',
          600: '#161E34',
          700: '#111627',
          800: '#0B0F1A',
          900: '#06070D',
        },
        'antique-gold': {
          DEFAULT: '#C6A664',
          50: '#F9F5ED',
          100: '#F3EBDB',
          200: '#E7D7B7',
          300: '#DBC393',
          400: '#CFAF6F',
          500: '#C6A664',
          600: '#9E8550',
          700: '#77643C',
          800: '#4F4228',
          900: '#282114',
        },
        'imperial-purple': {
          DEFAULT: '#5A3E85',
          50: '#F0EDF5',
          100: '#E1DBEB',
          200: '#C3B7D7',
          300: '#A593C3',
          400: '#876FAF',
          500: '#5A3E85',
          600: '#48326A',
          700: '#36254F',
          800: '#241935',
          900: '#120C1A',
        },
        'parchment': {
          DEFAULT: '#FAF3E0',
          50: '#FFFFFF',
          100: '#FFFFFF',
          200: '#FFFFFF',
          300: '#FFFFFF',
          400: '#FCF7EB',
          500: '#FAF3E0',
          600: '#F3E4B8',
          700: '#ECD590',
          800: '#E5C668',
          900: '#DEB740',
        },
        // CSS variable-based colors for shadcn compatibility
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
