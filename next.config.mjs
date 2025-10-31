/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // experimental: {
  //   appDir: true,
  // },

  images: {
    // Allow local API image endpoints that use search params
    localPatterns: [
      {
        // your route handler or rewrite path
        pathname: '/api/images/:path*',
        search: 'fit=**',
      },
      { pathname: '/api/images/:path*' }, 
    ],
  },
}

export default nextConfig
