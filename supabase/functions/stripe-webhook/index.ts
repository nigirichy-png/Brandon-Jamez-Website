import Stripe from "npm:stripe@^22";
import { createClient } from "npm:@supabase/supabase-js@^2";

const handledEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
]);

type JsonObject = Record<string, unknown>;

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function optionalSecret(...names: string[]): string | null {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value && !value.includes("placeholder")) return value;
  }
  return null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function objectId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return optionalString((value as JsonObject).id);
  return null;
}

function unixDate(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : null;
}

function subscriptionIdFromInvoice(invoice: JsonObject): string | null {
  const direct = objectId(invoice.subscription);
  if (direct) return direct;
  const parent = invoice.parent;
  if (!parent || typeof parent !== "object") return null;
  const details = (parent as JsonObject).subscription_details;
  return details && typeof details === "object"
    ? objectId((details as JsonObject).subscription)
    : null;
}

async function subscriptionForEvent(stripe: Stripe, event: Stripe.Event): Promise<JsonObject | null> {
  const object = event.data.object as unknown as JsonObject;

  if (event.type.startsWith("customer.subscription.")) return object;

  let subscriptionId: string | null = null;
  if (event.type === "checkout.session.completed") {
    if (object.mode !== "subscription") return null;
    subscriptionId = objectId(object.subscription);
  } else if (event.type.startsWith("invoice.")) {
    subscriptionId = subscriptionIdFromInvoice(object);
  }

  if (!subscriptionId) return null;
  return await stripe.subscriptions.retrieve(subscriptionId) as unknown as JsonObject;
}

function normalizedSubscription(
  subscription: JsonObject,
  configuredPriceId: string,
): Record<string, unknown> | null {
  const customerId = objectId(subscription.customer);
  const subscriptionId = optionalString(subscription.id);
  const status = optionalString(subscription.status);
  const metadata = subscription.metadata;
  const userId = metadata && typeof metadata === "object"
    ? optionalString((metadata as JsonObject).supabase_user_id)
    : null;
  const itemsContainer = subscription.items;
  const items = itemsContainer && typeof itemsContainer === "object"
    && Array.isArray((itemsContainer as JsonObject).data)
    ? ((itemsContainer as JsonObject).data as JsonObject[])
    : [];
  const matchingItem = items.find((item) => {
    const price = item.price;
    return price && typeof price === "object"
      && optionalString((price as JsonObject).id) === configuredPriceId;
  });

  if (!customerId || !subscriptionId || !status || !userId || !matchingItem) return null;

  const periodStart = unixDate(matchingItem.current_period_start ?? subscription.current_period_start);
  const periodEnd = unixDate(matchingItem.current_period_end ?? subscription.current_period_end);
  if (!periodStart || !periodEnd) return null;

  return {
    p_user_id: userId,
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: subscriptionId,
    p_stripe_price_id: configuredPriceId,
    p_status: status === "canceled" ? "canceled" : status,
    p_current_period_start: periodStart,
    p_current_period_end: periodEnd,
    p_cancel_at_period_end: subscription.cancel_at_period_end === true,
    p_canceled_at: unixDate(subscription.canceled_at),
    p_ended_at: unixDate(subscription.ended_at),
  };
}

function hasConfiguredPrice(subscription: JsonObject, configuredPriceId: string): boolean {
  const itemsContainer = subscription.items;
  const items = itemsContainer && typeof itemsContainer === "object"
    && Array.isArray((itemsContainer as JsonObject).data)
    ? ((itemsContainer as JsonObject).data as JsonObject[])
    : [];
  return items.some((item) => {
    const price = item.price;
    return price && typeof price === "object"
      && optionalString((price as JsonObject).id) === configuredPriceId;
  });
}

function checkoutMappingIsConsistent(event: Stripe.Event, normalized: Record<string, unknown>): boolean {
  if (event.type !== "checkout.session.completed") return true;
  const session = event.data.object as unknown as JsonObject;
  return optionalString(session.client_reference_id) === normalized.p_user_id
    && objectId(session.customer) === normalized.p_stripe_customer_id
    && objectId(session.subscription) === normalized.p_stripe_subscription_id;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("invalid_signature", { status: 400 });

  let stripe: Stripe;
  let event: Stripe.Event;
  try {
    const stripeSecretKey = requiredEnvironment("STRIPE_SECRET_KEY");
    const webhookSecret = requiredEnvironment("STRIPE_WEBHOOK_SECRET");
    const rawBody = await request.text();
    stripe = new Stripe(stripeSecretKey, { httpClient: Stripe.createFetchHttpClient() });
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return new Response("invalid_signature", { status: 400 });
  }

  try {
    const supabaseUrl = requiredEnvironment("SUPABASE_URL");
    const supabaseSecret = optionalSecret("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseSecret) throw new Error("missing_supabase_secret");
    const configuredPriceId = requiredEnvironment("STRIPE_SUBSCRIPTION_PRICE_ID");
    const supabase = createClient(supabaseUrl, supabaseSecret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let processingResult: "processed" | "ignored" = "ignored";
    let subscriptionParameters: Record<string, unknown> = {};

    if (handledEvents.has(event.type)) {
      const subscription = await subscriptionForEvent(stripe, event);
      if (subscription && hasConfiguredPrice(subscription, configuredPriceId)) {
        const normalized = normalizedSubscription(subscription, configuredPriceId);
        if (!normalized || !checkoutMappingIsConsistent(event, normalized)) {
          throw new Error("invalid_stripe_mapping");
        }
        if (["invoice.payment_failed", "invoice.payment_action_required"].includes(event.type)) {
          normalized.p_status = "past_due";
        }
        processingResult = "processed";
        subscriptionParameters = normalized;
      }
    }

    const { error } = await supabase.rpc("process_stripe_subscription_event", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_event_created_at: new Date(event.created * 1000).toISOString(),
      p_processing_result: processingResult,
      ...subscriptionParameters,
    });

    if (error) throw new Error("stripe_event_sync_failed");
    return Response.json({ received: true });
  } catch {
    return new Response("webhook_processing_failed", { status: 503 });
  }
});
