/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    localPatterns: [
      // exactly /api/images/... with ?fit=thumb
      // { pathname: '/api/images/:path*', search: 'fit=thumb' },

      // (optional) also allow the same path with NO query string
      { pathname: '/api/images/**' },
    ],
  },
};

export default nextConfig;