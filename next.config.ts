import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  // 添加HTTPS配置
  server: {
    https: process.env.NODE_ENV === 'development' && process.env.HTTPS === 'true',
  },
};

export default nextConfig;
