/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable transpiling of monorepo packages
  transpilePackages: [
    '@tidkit/ui',
    '@tidkit/config',
    '@tidkit/storage',
    '@tidkit/database',
  ],

  // Allow Web Workers
  webpack: (config) => {
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: { loader: 'worker-loader' },
    });
    return config;
  },
};

export default nextConfig;
