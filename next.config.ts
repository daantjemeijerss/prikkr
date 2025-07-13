import type { NextConfig } from "next";

// ✅ FILE: next.config.ts

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Ignore unused variable lint errors during build
  },
  output: 'standalone', // ✅ for optimal deployment on server platforms like Render
};

export default nextConfig;
