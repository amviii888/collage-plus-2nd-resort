import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
      },
      colors: {
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
        'deep-purple-black': 'hsl(var(--deep-purple-black))',
        'light-lavender': 'hsl(var(--light-lavender))',
        'card-surface': 'hsl(var(--card-surface))',
        'primary-purple': 'hsl(var(--primary-purple))',
        'dark-surface': 'hsl(var(--dark-surface))',
        'muted-purple-text': 'hsl(var(--muted-purple-text))',
        'lavender-accent': 'hsl(var(--lavender-accent))',
        'subtle-border': 'hsl(var(--subtle-border))',
        'violet': 'hsl(var(--violet))',
        'violet-light': 'hsl(var(--violet-light))',
        'accent-purple': 'hsl(var(--accent-purple))',
        'blue': 'hsl(var(--blue))',
        'glass': 'hsl(var(--glass))',
        'glass-border': 'hsl(var(--glass-border))',
        'success': 'hsl(var(--success))',
        'warning': 'hsl(var(--warning))',
        'info': 'hsl(var(--info))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-20px)' },
        },
        'glow-pulse': {
            '0%, 100%': { opacity: '0.4', filter: 'blur(40px)' },
            '50%': { opacity: '0.7', filter: 'blur(60px)' },
        },
        'button-glow': {
            '0%': { boxShadow: '0 0 5px hsl(var(--primary)), 0 0 10px hsl(var(--accent-purple))' },
            '50%': { boxShadow: '0 0 20px hsl(var(--primary)), 0 0 40px hsl(var(--accent-purple))' },
            '100%': { boxShadow: '0 0 5px hsl(var(--primary)), 0 0 10px hsl(var(--accent-purple))' },
        },
        'gradient-shift': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' },
        },
        'bubble-float-1': {
            '0%, 100%': { transform: 'translateY(0) translateX(0) scale(1)' },
            '50%': { transform: 'translateY(-40px) translateX(20px) scale(1.1)' },
        },
        'bubble-float-2': {
            '0%, 100%': { transform: 'translateY(0) translateX(0) scale(1)' },
            '50%': { transform: 'translateY(30px) translateX(-30px) scale(1.05)' },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'slide-up': 'slide-up 0.7s ease-out forwards',
        'gradient-shift': 'gradient-shift 15s ease infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
        'button-glow': 'button-glow 30s ease-in-out infinite',
      },
      boxShadow: {
        'glow-primary': 'var(--shadow-glow-primary)',
        'glow-violet': 'var(--shadow-glow-violet)',
      }
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
