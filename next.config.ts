import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
  serverExternalPackages: ['pdf-parse', 'mammoth'],
};

export default nextConfig;
