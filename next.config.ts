import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // For MP3 uploads
    },
  },
};

export default nextConfig;
