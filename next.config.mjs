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
      remotePatterns: [
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' }, // regional style
    ],
};

export default nextConfig;