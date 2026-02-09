/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tidkit/ui', '@tidkit/config'],
  output: 'standalone',
};

export default nextConfig;
