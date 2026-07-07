import withPWA from 'next-pwa';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Turbopack (next dev --turbo) doesn't support typedRoutes and hard-errors on it.
    // Keep it for `next build` (webpack); disable only under turbo. TURBOPACK is set by --turbo.
    typedRoutes: !process.env.TURBOPACK,
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
