import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow images from any source during development
  images: {
    unoptimized: true,
  },
}

export default nextConfig
