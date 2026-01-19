import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  // Optimize compilation and prevent hanging
  experimental: {
    // Reduce memory usage during compilation
    optimizePackageImports: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', 'react-icons'],
  },
  // Reduce bundle size
  modularizeImports: {
    'react-icons': {
      transform: 'react-icons/{{member}}',
    },
  },
};

export default nextConfig;
