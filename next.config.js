/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use separate build directories for dev vs production so they don't
  // corrupt each other's webpack output
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  transpilePackages: ["@react-pdf/renderer"],
  webpack: (config) => {
    // @react-pdf/renderer needs these aliases for server-side rendering
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
