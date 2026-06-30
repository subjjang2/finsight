#!/usr/bin/env node
// Polar sandbox connectivity smoke-check.
//
// Verifies the checkout half of the Polar integration against the configured API base
// using the credentials in .env.local: that the access token is valid, the Pro product
// exists, and a checkout session can be created (the exact payload lib/billing/checkout.ts
// sends). Read-only-ish: it creates a checkout *session* only — no charge happens.
//
// Secrets are only ever sent in the Authorization header; nothing secret is printed.
//
// Usage:
//   node scripts/polar-sandbox-check.mjs
//
// Requires in .env.local: POLAR_ACCESS_TOKEN, POLAR_PRO_PRODUCT_ID
// Optional: POLAR_API_BASE (defaults to https://api.polar.sh; sandbox is
//           https://sandbox-api.polar.sh), NEXT_PUBLIC_SITE_URL.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env.local");

function loadEnv(path) {
  const env = {};
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    console.error(`Cannot read ${path}. Copy .env.example to .env.local and fill it in.`);
    process.exit(1);
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv(envPath);
const accessToken = env.POLAR_ACCESS_TOKEN;
const productId = env.POLAR_PRO_PRODUCT_ID;
const apiBase = env.POLAR_API_BASE || "https://api.polar.sh";
const origin = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

if (!accessToken || !productId) {
  console.error("Missing POLAR_ACCESS_TOKEN or POLAR_PRO_PRODUCT_ID in .env.local");
  process.exit(1);
}

const auth = { Authorization: `Bearer ${accessToken}` };
let failed = false;

console.log(`API base : ${apiBase}`);
console.log(`Product  : ${productId}`);

// 1) Token + product existence (GET, read-only).
const prodRes = await fetch(`${apiBase}/v1/products/${productId}`, { headers: auth });
if (prodRes.ok) {
  const p = await prodRes.json();
  const prices = (p.prices || [])
    .map((x) => `${x.price_amount ?? "?"}${x.price_currency ?? ""}`)
    .join(", ");
  console.log(`\n[GET product]  200  ${p.name} | recurring=${p.is_recurring} | ${prices}`);
} else {
  failed = true;
  console.log(`\n[GET product]  ${prodRes.status} ${prodRes.statusText}`);
  console.log(`  ${(await prodRes.text()).slice(0, 300)}`);
}

// 2) Checkout creation (POST) — same payload as lib/billing/checkout.ts.
const coRes = await fetch(`${apiBase}/v1/checkouts/`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({
    products: [productId],
    success_url: `${origin}/dashboard/pricing?checkout=success`,
    return_url: `${origin}/dashboard/pricing`,
    external_customer_id: "smoke-check",
    metadata: { user_id: "smoke-check" },
    customer_metadata: { user_id: "smoke-check" },
  }),
});
if (coRes.ok) {
  const c = await coRes.json();
  console.log(`[POST checkout] ${coRes.status}  url=${c.url}`);
} else {
  failed = true;
  console.log(`[POST checkout] ${coRes.status} ${coRes.statusText}`);
  console.log(`  ${(await coRes.text()).slice(0, 400)}`);
}

console.log(failed ? "\nFAIL" : "\nOK — checkout path is reachable.");
process.exit(failed ? 1 : 0);
