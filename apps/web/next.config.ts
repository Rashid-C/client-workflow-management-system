import type { NextConfig } from "next";

// Where the NestJS API listens. Server-side only: browsers always call
// /api on this origin, so the session cookie stays first-party.
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:3001";
const isProduction = process.env.NODE_ENV === "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.google.com https://*.googleapis.com https://*.gstatic.com",
  "font-src 'self' data:",
  `connect-src 'self'${isProduction ? "" : " ws: wss:"} https://*.google.com https://*.googleapis.com https://*.gstatic.com`,
  "frame-src https://www.google.com https://maps.google.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

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
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), display-capture=(), geolocation=(), microphone=(), payment=(), usb=()" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    }];
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
