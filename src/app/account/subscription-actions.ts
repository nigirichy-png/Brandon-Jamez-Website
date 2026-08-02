"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createStripeServerClient, isTrustedStripeRedirect } from "@/lib/stripe/server";

export async function openStripePortalAction(): Promise<never> {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login?next=/account");

  let stripeClient: ReturnType<typeof createStripeServerClient>;
  try {
    stripeClient = createStripeServerClient();
  } catch {
    redirect("/account?billing=portal_unavailable");
  }

  const { data: customerId, error } = await supabase.rpc("begin_own_stripe_portal");
  if (error || !customerId) redirect("/account?billing=no_customer");

  try {
    const session = await stripeClient.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${stripeClient.siteOrigin}/account`,
    });
    if (!isTrustedStripeRedirect(session.url)) redirect("/account?billing=portal_unavailable");
    redirect(session.url);
  } catch (portalError) {
    if (portalError && typeof portalError === "object" && "digest" in portalError) throw portalError;
    redirect("/account?billing=portal_unavailable");
  }
}
