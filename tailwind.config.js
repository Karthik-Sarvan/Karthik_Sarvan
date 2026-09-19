/**
 * Tailwind build config for karthik.qzz.io
 *
 * The site used to run the Tailwind "Play CDN" in the browser. That is a
 * development tool: it ships a ~400 KB JIT compiler to every visitor and is
 * render-blocking, which wrecks Core Web Vitals (a Google ranking factor).
 *
 * We now compile the exact same design tokens into a small static stylesheet.
 * Run:  npm run build:css
 */
module.exports = {
  content: [
    './index.html',
    './blog.html',
    './post.html',
    './404.html',
    './posts/**/*.html',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        dark: '#111111',
        gray: {
          400: '#999999',
          200: '#E5E5E5',
        },
      },
      fontSize: {
        display: ['clamp(3rem, 12vw, 12rem)', { lineHeight: '0.85', letterSpacing: '-0.05em' }],
        'display-sm': ['clamp(2rem, 5vw, 4rem)', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
    },
  },
  plugins: [],
};
