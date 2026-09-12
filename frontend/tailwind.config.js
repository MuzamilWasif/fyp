/** VigilantEye design tokens — the "control room" system.
 *  Deep navy-black surfaces, hairline elevation, mint accent, three
 *  typefaces: Space Grotesk for display, Inter for body, JetBrains Mono for
 *  labels, identifiers and machine data. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      colors: {
        bg: '#06090F',
        /* sidebar, topbar, table headers and input wells */
        chrome: '#0A0F17',
        surface: { DEFAULT: '#0D131C', 2: '#121A26', 3: '#182231' },
        line: { DEFAULT: '#1E2937', strong: '#2B3A4D' },
        fg: '#F5F7FA',
        muted: '#B8C2D0',
        subtle: '#8A94A6',
        faint: '#5A6472',
        brand: {
          DEFAULT: '#2DE3A7', hover: '#7CF2CB', press: '#22C48D',
          fg: '#061812', soft: 'rgba(45,227,167,0.12)'
        },
        ok: { DEFAULT: '#2DE3A7', soft: 'rgba(45,227,167,0.12)' },
        info: { DEFAULT: '#4D9FFF', soft: 'rgba(77,159,255,0.12)' },
        warn: { DEFAULT: '#FFB020', soft: 'rgba(255,176,32,0.12)' },
        danger: { DEFAULT: '#FF4D4D', soft: 'rgba(255,77,77,0.12)' },
        /* legacy aliases so no existing class breaks */
        ink: '#06090F',
        panel: '#0D131C'
      },
      fontSize: {
        micro: ['0.625rem', { lineHeight: '0.9rem', letterSpacing: '0.1em' }],
        small: ['0.75rem', { lineHeight: '1.1rem' }],
        body: ['0.8125rem', { lineHeight: '1.3rem' }],
        subtitle: ['1.0625rem', { lineHeight: '1.45rem', letterSpacing: '-0.02em' }],
        title: ['1.375rem', { lineHeight: '1.7rem', letterSpacing: '-0.025em' }],
        display: ['1.75rem', { lineHeight: '2.1rem', letterSpacing: '-0.03em' }],
        stat: ['2.5rem', { lineHeight: '1', letterSpacing: '-0.04em' }]
      },
      borderRadius: {
        /* the design's card radius */
        '2xl': '18px'
      },
      boxShadow: {
        e1: '0 1px 2px rgba(0,0,0,0.45)',
        e2: '0 12px 32px -12px rgba(0,0,0,0.7)',
        e3: '0 24px 64px -24px rgba(0,0,0,0.8)',
        focus: '0 0 0 3px rgba(45,227,167,0.15)'
      },
      transitionTimingFunction: { smooth: 'cubic-bezier(.2,.8,.2,1)' },
      transitionDuration: { fast: '160ms', DEFAULT: '160ms' },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-down': { from: { opacity: 0, transform: 'translateY(-6px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { opacity: 0, transform: 'translateX(10px)' }, to: { opacity: 1, transform: 'none' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(.97)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '0%, 100%': { opacity: 0.35 }, '50%': { opacity: 0.75 } },
        've-dot': {
          '0%': { boxShadow: '0 0 0 0 rgba(45,227,167,0.45)' },
          '70%': { boxShadow: '0 0 0 7px rgba(45,227,167,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(45,227,167,0)' }
        },
        've-dot-red': {
          '0%': { boxShadow: '0 0 0 0 rgba(255,77,77,0.5)' },
          '70%': { boxShadow: '0 0 0 7px rgba(255,77,77,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(255,77,77,0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-up': 'slide-up 200ms cubic-bezier(.2,.8,.2,1)',
        'slide-down': 'slide-down 160ms ease-out',
        'slide-in': 'slide-in 200ms ease-out',
        'scale-in': 'scale-in 160ms ease-out',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        've-dot': 've-dot 1.8s ease-out infinite',
        've-dot-red': 've-dot-red 1.6s ease-out infinite'
      }
    }
  },
  plugins: []
}
