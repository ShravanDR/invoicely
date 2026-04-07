/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@react-pdf/renderer"],
  webpack: (config) => {
    // @react-pdf/renderer needs these aliases for server-side rendering
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
