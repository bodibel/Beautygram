import type { NextConfig } from "next";

// Force restart - sync Prisma changes

const nextConfig: NextConfig = {
  // Removing standalone for now to ensure full public/static serving by next start
  // output: 'standalone',
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/.git/**",
          "**/.next/**",
          "**/node_modules/**",
          "**/.codex-logs/**",
          "**/test-results/**",
          "**/*.tar",
          "**/*.tar.gz",
        ],
      };
    }

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
