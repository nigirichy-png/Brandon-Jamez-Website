"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createStripeServerClient, isTrustedStripeRedirect } from "@/lib/stripe/server";

const nonTerminalStatuses = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

function subscribeFailure(code: string): never {
  redirect(`/subscribe?billing=${encodeURIComponent(code)}`);
}

export async function startStripeCheckoutAction(): Promise<never> {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login?next=/subscribe");

  let stripeClient: ReturnType<typeof createStripeServerClient>;
  try {
    stripeClient = createStripeServerClient();
  } catch {
    subscribeFailure("unavailable");
  }

  const { data: contexts, error: contextError } = await supabase.rpc("begin_own_stripe_checkout");
  const context = contexts?.[0];
  if (contextError) {
    subscribeFailure(contextError.message.includes("checkout_rate_limited") ? "try_later" : "denied");
  }
  if (context?.has_active_access) redirect("/account?billing=active");

  const { stripe, subscriptionPriceId, siteOrigin } = stripeClient;
  let customerId = context?.stripe_customer_id ?? null;

  try {
    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || customer.metadata.supabase_user_id !== userData.user.id) {
        subscribeFailure("customer_mismatch");
      }
    } else {
      const customer = await stripe.customers.create({
        metadata: { supabase_user_id: userData.user.id },
      }, { idempotencyKey: `customer-${userData.user.id}` });
      customerId = customer.id;
      const { error: bindError } = await supabase.rpc("bind_own_stripe_customer", {
        p_stripe_customer_id: customer.id,
      });
      if (bindError) subscribeFailure("customer_unavailable");
    }

    const existing = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
    const duplicate = existing.data.some((subscription) =>
      nonTerminalStatuses.has(subscription.status)
      && subscription.items.data.some((item) => item.price.id === subscriptionPriceId),
    );
    if (duplicate) redirect("/account?billing=manage_existing");

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userData.user.id,
      line_items: [{ price: subscriptionPriceId, quantity: 1 }],
      success_url: `${siteOrigin}/account?checkout=success`,
      cancel_url: `${siteOrigin}/subscribe?checkout=canceled`,
      metadata: { supabase_user_id: userData.user.id },
      subscription_data: { metadata: { supabase_user_id: userData.user.id } },
    }, { idempotencyKey: `checkout-${userData.user.id}-${Math.floor(Date.now() / 60_000)}` });

    if (!isTrustedStripeRedirect(checkout.url)) subscribeFailure("unavailable");
    redirect(checkout.url);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    subscribeFailure("unavailable");
  }
}
