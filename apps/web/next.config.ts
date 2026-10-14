import type { NextConfig } from "next";

// Where the NestJS API listens. Server-side only: browsers always call
// /api on this origin, so the session cookie stays first-party.
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
  async redirects() {
    // The product calls these task types; keep old bookmarks working.
    return [
      { source: "/workflows", destination: "/task-types", permanent: false },
      { source: "/:lang(en|ar)/workflows", destination: "/:lang/task-types", permanent: false },
    ];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
