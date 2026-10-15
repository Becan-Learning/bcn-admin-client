import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const backendUrl = process.env.BACKEND_URL?.trim().replace(/\/+$/, "");

if (process.env.NODE_ENV === "production" && !backendUrl) {
  throw new Error("BACKEND_URL is required in production");
}

const nextConfig: NextConfig = {
  // Request-time reads (cookies, the session) sit inside Suspense boundaries, as the Next.js
  // "Authentication with Cache Components" guide recommends. Do not turn this off to dodge a build
  // error: wrap the read in <Suspense> instead.
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
  async redirects() {
    // There is no overview page in v1: Accounts is the home. proxy.ts then sends a visitor without
    // a session on to /sign-in.
    return [{ source: "/", destination: "/accounts", permanent: false }];
  },
  async rewrites() {
    // The browser only talks to this origin, so session cookies stay first-party. The backend
    // holds all Admin authority (ADR 0001).
    return [
      {
        source: "/api/auth/:path*",
        destination: `${backendUrl || "http://localhost:3000"}/api/auth/:path*`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl || "http://localhost:3000"}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    // The admin dashboard is internal: keep every page and response out of search engines.
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
