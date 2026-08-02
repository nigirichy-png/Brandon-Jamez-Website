import "server-only";

import Stripe from "stripe";

import { getStripeConfiguration } from "@/lib/stripe/config";

export function createStripeServerClient(): { stripe: Stripe; subscriptionPriceId: string; siteOrigin: string } {
  const configuration = getStripeConfiguration();
  if (!configuration) throw new Error("stripe_not_configured");
  return {
    stripe: new Stripe(configuration.secretKey),
    subscriptionPriceId: configuration.subscriptionPriceId,
    siteOrigin: configuration.siteOrigin,
  };
}

export function isTrustedStripeRedirect(value: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "checkout.stripe.com" || url.hostname.endsWith(".stripe.com"));
  } catch {
    return false;
  }
}
