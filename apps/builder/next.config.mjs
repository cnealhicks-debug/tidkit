/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable transpiling of monorepo packages
  transpilePackages: [
    '@tidkit/ui',
    '@tidkit/config',
    '@tidkit/storage',
    '@tidkit/database',
  ],

  // Disable React strict mode for Three.js compatibility
  reactStrictMode: false,

  // Output configuration for Vercel
  output: 'standalone',
};

export default nextConfig;
