import "server-only";

type CheckoutResponse = {
  url?: unknown;
};

export async function createPolarCheckoutUrl({
  userId,
  email,
  origin,
}: {
  userId: string;
  email: string | null;
  origin: string;
}): Promise<string> {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  const productId = process.env.POLAR_PRO_PRODUCT_ID;

  if (!accessToken || !productId) {
    throw new Error("Missing Polar checkout environment variables");
  }

  // Defaults to production; set POLAR_API_BASE=https://sandbox-api.polar.sh for Sandbox testing.
  const apiBase = process.env.POLAR_API_BASE ?? "https://api.polar.sh";

  const response = await fetch(`${apiBase}/v1/checkouts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      products: [productId],
      success_url: `${origin}/dashboard/pricing?checkout=success`,
      return_url: `${origin}/dashboard/pricing`,
      external_customer_id: userId,
      customer_email: email ?? undefined,
      metadata: { user_id: userId },
      customer_metadata: { user_id: userId },
    }),
  });

  if (!response.ok) {
    throw new Error(`Polar checkout failed with status ${response.status}`);
  }

  const checkout = (await response.json()) as CheckoutResponse;

  if (typeof checkout.url !== "string" || checkout.url.trim() === "") {
    throw new Error("Polar checkout response did not include a URL");
  }

  return checkout.url;
}
