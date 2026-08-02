import "server-only";

export type StripeConfiguration = Readonly<{
  secretKey: string;
  subscriptionPriceId: string;
  siteOrigin: string;
}>;

function validSecretKey(value: string | undefined): value is string {
  return Boolean(
    value
    && /^(sk_test|sk_live)_[A-Za-z0-9_]+$/.test(value)
    && !value.includes("placeholder"),
  );
}

function validPriceId(value: string | undefined): value is string {
  return Boolean(value && /^price_[A-Za-z0-9]+$/.test(value) && !value.includes("placeholder"));
}

function approvedSiteOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !local) return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getStripeConfiguration(): StripeConfiguration | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const subscriptionPriceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  const siteOrigin = approvedSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (!validSecretKey(secretKey) || !validPriceId(subscriptionPriceId) || !siteOrigin) return null;
  return { secretKey, subscriptionPriceId, siteOrigin };
}

export function isStripeConfigured(): boolean {
  return getStripeConfiguration() !== null;
}
