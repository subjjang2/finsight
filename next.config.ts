import type { NextConfig } from "next";

// Production headers are locked down; dev needs a few relaxations because Next's
// Fast Refresh evaluates code via eval() (needs 'unsafe-eval') and HMR runs over a
// localhost websocket. upgrade-insecure-requests + HSTS also force localhost to https,
// which breaks the http dev server (CSS served as text/plain, dead bundles), so they
// are production-only.
const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy tuned for a Next.js App Router app.
// 'unsafe-inline' on script/style is required by Next's inline runtime/hydration
// bootstrap and Tailwind's injected styles; everything else is locked to 'self'.
const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  // OAuth sign-in posts a form whose redirect chain leaves the origin
  // (→ Supabase /auth/v1/authorize → accounts.google.com); form-action governs
  // the whole chain, so both hops must be allowlisted.
  // The Pro upgrade form posts to /api/polar/checkout, which 303-redirects to
  // Polar's hosted checkout (polar.sh in prod, sandbox.polar.sh in Sandbox);
  // form-action covers that redirect target too, so Polar must be allowlisted.
  "form-action 'self' https://*.supabase.co https://accounts.google.com https://polar.sh https://*.polar.sh",
  "frame-ancestors 'none'",
  "object-src 'none'",
  isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  isProd
    ? "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.polar.sh"
    : "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.polar.sh ws://localhost:* http://localhost:*",
];

if (isProd) {
  cspDirectives.push("upgrade-insecure-requests");
}

const contentSecurityPolicy = cspDirectives.join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  // HSTS is production-only: it would pin localhost to https and break local dev.
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
