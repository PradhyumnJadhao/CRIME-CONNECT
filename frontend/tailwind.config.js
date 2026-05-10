/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#060b14', // New dark background
          surface: '#0c1322', // New surface
          card: 'rgba(12, 19, 34, 0.70)',
        },
        cyan: {
          DEFAULT: '#00d4ff',
          glow: 'rgba(0, 212, 255, 0.4)',
          border: 'rgba(0, 212, 255, 0.25)',
        },
        alert: {
          DEFAULT: '#ff3b5c',
          glow: 'rgba(255, 59, 92, 0.4)',
        },
        warning: {
          DEFAULT: '#ffab00',
          glow: 'rgba(255, 171, 0, 0.4)',
        },
        // Mapping old colors to new theme so the app doesn't crash 
        // while we transition components
        violet: {
          DEFAULT: '#00d4ff',
          light: '#38bdf8',
          dim: '#0284c7',
          glow: 'rgba(0, 212, 255, 0.35)',
          border: 'rgba(0, 212, 255, 0.20)',
        },
        amber: {
          DEFAULT: '#ff3b5c',
          light: '#f43f5e',
          dim: '#e11d48',
          glow: 'rgba(244, 63, 94, 0.30)',
          border: 'rgba(244, 63, 94, 0.22)',
        },
        semantic: {
          danger: '#ff3b5c',
          success: '#00d4ff',
          info: '#ffab00',
        },
        text: {
          main: '#e2e8f0',
          muted: '#94a3b8',
          placeholder: '#475569',
        }
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'grad-cyan': 'linear-gradient(135deg, #00d4ff, #0088ff)',
        'grad-surface': 'linear-gradient(180deg, #0c1322, #060b14)',
        'glass-panel': 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        // Map old gradients
        'grad-hero-text': 'linear-gradient(135deg, #00d4ff 0%, #0088ff 35%, #e2e8f0 100%)',
        'grad-violet': 'linear-gradient(135deg, #00d4ff, #0088ff)',
        'grad-gold': 'linear-gradient(135deg, #ff3b5c, #e11d48)',
        'grad-card': 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,0,0,0.04))',
        'grad-bg': `
          radial-gradient(ellipse 80% 60% at 20% 0%, rgba(0,212,255,0.12) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 80% 100%, rgba(255,59,92,0.08) 0%, transparent 55%),
          #060b14
        `,
      },
      boxShadow: {
        'glow-cyan': '0 0 30px rgba(0, 212, 255, 0.3)',
        'glow-alert': '0 0 30px rgba(255, 59, 92, 0.3)',
        'panel': '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(0,212,255,0.2)',
        // Map old shadows
        'glow-amber': '0 0 40px rgba(255, 59, 92, 0.30)',
        'glow-violet': '0 0 24px rgba(0, 212, 255, 0.35)',
        'card-glow': '0 24px 60px rgba(0, 212, 255, 0.10), 0 0 0 1px rgba(0, 212, 255, 0.22)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'border-pulse': 'border-pulse 3s ease-in-out infinite',
        'ripple': 'ripple 0.6s linear',
        'blink': 'blink 2s infinite',
        'bounce-down': 'bounce-down 1.6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'border-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 1px rgba(0,212,255,0.20),0 40px 100px rgba(0,212,255,0.12)' },
          '50%': { boxShadow: '0 0 0 2px rgba(255,59,92,0.30),0 40px 100px rgba(255,59,92,0.10)' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.4' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'bounce-down': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(8px)' },
        }
      }
    },
  },
  plugins: [],
}
