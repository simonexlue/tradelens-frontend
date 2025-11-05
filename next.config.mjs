/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    localPatterns: [
      { pathname: '/api/images/**' },
    ],
  },
      remotePatterns: [
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' }, // regional style
    ],
};

export default nextConfig;