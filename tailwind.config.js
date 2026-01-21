/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base colors using CSS variables
        background: 'hsl(0 0% 98%)',
        foreground: 'hsl(224 71% 4%)',
        card: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(224 71% 4%)',
        },
        popover: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(224 71% 4%)',
        },
        // Primary - Brightvision Red
        primary: {
          DEFAULT: 'hsl(0 72% 51%)',
          foreground: 'hsl(0 0% 100%)',
          50: 'hsl(0 86% 97%)',
          100: 'hsl(0 93% 94%)',
          200: 'hsl(0 96% 89%)',
          300: 'hsl(0 94% 82%)',
          400: 'hsl(0 91% 71%)',
          500: 'hsl(0 84% 60%)',
          600: 'hsl(0 72% 51%)',
          700: 'hsl(0 74% 42%)',
          800: 'hsl(0 70% 35%)',
          900: 'hsl(0 63% 31%)',
          950: 'hsl(0 75% 15%)',
        },
        // Secondary - Muted gray
        secondary: {
          DEFAULT: 'hsl(220 14% 96%)',
          foreground: 'hsl(220 9% 46%)',
        },
        // Muted
        muted: {
          DEFAULT: 'hsl(220 14% 96%)',
          foreground: 'hsl(220 9% 46%)',
        },
        // Accent
        accent: {
          DEFAULT: 'hsl(220 14% 96%)',
          foreground: 'hsl(224 71% 4%)',
        },
        // Destructive - Light Red
        destructive: {
          DEFAULT: 'hsl(0 84% 60%)',
          foreground: 'hsl(0 0% 100%)',
        },
        // Border
        border: 'hsl(220 13% 91%)',
        input: 'hsl(220 13% 91%)',
        ring: 'hsl(0 72% 51%)',
        // Status colors
        success: {
          DEFAULT: 'hsl(142 76% 36%)',
          foreground: 'hsl(0 0% 100%)',
          50: 'hsl(138 76% 97%)',
          100: 'hsl(141 84% 93%)',
          200: 'hsl(141 79% 85%)',
          300: 'hsl(142 77% 73%)',
          400: 'hsl(142 69% 58%)',
          500: 'hsl(142 71% 45%)',
          600: 'hsl(142 76% 36%)',
          700: 'hsl(142 72% 29%)',
          800: 'hsl(143 64% 24%)',
          900: 'hsl(144 61% 20%)',
          950: 'hsl(145 80% 10%)',
        },
        warning: {
          DEFAULT: 'hsl(38 92% 50%)',
          foreground: 'hsl(0 0% 0%)',
          50: 'hsl(48 100% 96%)',
          100: 'hsl(48 96% 89%)',
          200: 'hsl(48 97% 77%)',
          300: 'hsl(46 97% 65%)',
          400: 'hsl(43 96% 56%)',
          500: 'hsl(38 92% 50%)',
          600: 'hsl(32 95% 44%)',
          700: 'hsl(26 90% 37%)',
          800: 'hsl(23 83% 31%)',
          900: 'hsl(22 78% 26%)',
          950: 'hsl(21 92% 14%)',
        },
        // Platform colors
        linkedin: {
          DEFAULT: 'hsl(201 100% 35%)',
          light: 'hsl(201 100% 45%)',
        },
        google: {
          DEFAULT: 'hsl(217 89% 61%)',
          light: 'hsl(217 89% 71%)',
        },
        meta: {
          DEFAULT: 'hsl(214 89% 52%)',
          light: 'hsl(214 89% 62%)',
        },
        // Chart colors
        chart: {
          1: 'hsl(0 72% 51%)',      // Red - Primary
          2: 'hsl(142 76% 36%)',    // Green - Success
          3: 'hsl(38 92% 50%)',     // Amber - Warning
          4: 'hsl(201 100% 35%)',   // LinkedIn Blue
          5: 'hsl(217 89% 61%)',    // Google Blue
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.08), 0 4px 16px -4px rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
