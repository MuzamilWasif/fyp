/** VigilantEye design tokens.
 *  Near-black surfaces, lime accent, elevation by hairline borders (never glow). */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      colors: {
        bg: '#0a0a0a',
        surface: { DEFAULT: '#141414', 2: '#1a1a1a', 3: '#212121' },
        line: { DEFAULT: '#262626', strong: '#333333' },
        fg: '#f2f2f2',
        muted: '#a0a0a0',
        subtle: '#6f6f6f',
        brand: {
          DEFAULT: '#a3e635', hover: '#bef264', press: '#84cc16',
          fg: '#0a0a0a', soft: 'rgba(163,230,53,0.12)'
        },
        ok: { DEFAULT: '#34d399', soft: 'rgba(52,211,153,0.12)' },
        warn: { DEFAULT: '#fbbf24', soft: 'rgba(251,191,36,0.12)' },
        danger: { DEFAULT: '#f87171', soft: 'rgba(248,113,113,0.12)' },
        info: { DEFAULT: '#60a5fa', soft: 'rgba(96,165,250,0.12)' },
        /* legacy aliases kept so no existing class breaks */
        ink: '#0a0a0a',
        panel: '#141414'
      },
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
        small: ['0.8125rem', { lineHeight: '1.15rem' }],
        body: ['0.875rem', { lineHeight: '1.35rem' }],
        subtitle: ['1rem', { lineHeight: '1.5rem' }],
        title: ['1.25rem', { lineHeight: '1.6rem' }],
        display: ['1.75rem', { lineHeight: '2.1rem', letterSpacing: '-0.02em' }]
      },
      boxShadow: {
        e1: '0 1px 2px rgba(0,0,0,0.40)',
        e2: '0 8px 24px -10px rgba(0,0,0,0.60)',
        e3: '0 16px 40px -12px rgba(0,0,0,0.70)'
      },
      transitionTimingFunction: { smooth: 'cubic-bezier(.2,.8,.2,1)' },
      transitionDuration: { fast: '150ms', DEFAULT: '200ms' },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-down': { from: { opacity: 0, transform: 'translateY(-6px)' }, to: { opacity: 1, transform: 'none' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(.97)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } }
      },
      animation: {
        'fade-in': 'fade-in 150ms cubic-bezier(.2,.8,.2,1)',
        'slide-up': 'slide-up 200ms cubic-bezier(.2,.8,.2,1)',
        'slide-down': 'slide-down 150ms cubic-bezier(.2,.8,.2,1)',
        'scale-in': 'scale-in 150ms cubic-bezier(.2,.8,.2,1)'
      }
    }
  },
  plugins: []
}
