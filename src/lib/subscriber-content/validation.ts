import type { SubscriberMediaType, SubscriberPostStatus } from "./model";

export type SubscriberPostInput = {
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  mediaUrl: string | null;
  mediaType: SubscriberMediaType | null;
  status: SubscriberPostStatus;
};

type ValidationResult = { ok: true; value: SubscriberPostInput } | { ok: false; message: string };
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const controls = /[\p{Cc}\p{Cf}]/u;
const bodyControls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function slugifySubscriberPostTitle(title: string): string {
  return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100).replace(/-$/g, "");
}

function optional(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function validHttpsUrl(value: string | null): boolean {
  if (!value || value.length > 2048 || controls.test(value)) return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export function validateSubscriberPostInput(formData: FormData): ValidationResult {
  const title = optional(formData.get("title")) ?? "";
  const rawSlug = optional(formData.get("slug"));
  const slug = rawSlug ?? slugifySubscriberPostTitle(title);
  const excerpt = optional(formData.get("excerpt"));
  const body = optional(formData.get("body")) ?? "";
  const coverImageUrl = optional(formData.get("coverImageUrl"));
  const mediaUrl = optional(formData.get("mediaUrl"));
  const rawMediaType = optional(formData.get("mediaType"));
  const rawStatus = optional(formData.get("status"));

  if (!title || title.length > 160 || controls.test(title)) return { ok: false, message: "Enter a title between 1 and 160 characters." };
  if (!slug || slug.length > 100 || !slugPattern.test(slug)) return { ok: false, message: "Use a lowercase slug containing only letters, numbers, and single hyphens." };
  if (excerpt && (excerpt.length > 500 || controls.test(excerpt))) return { ok: false, message: "The excerpt must be 500 characters or fewer." };
  if (!body || body.length > 50_000 || bodyControls.test(body)) return { ok: false, message: "Enter plain-text body content between 1 and 50,000 characters." };
  if (coverImageUrl && !validHttpsUrl(coverImageUrl)) return { ok: false, message: "Enter a valid HTTPS cover image URL." };
  if ((mediaUrl && !rawMediaType) || (!mediaUrl && rawMediaType)) return { ok: false, message: "Provide both a media URL and media type, or leave both empty." };
  if (mediaUrl && !validHttpsUrl(mediaUrl)) return { ok: false, message: "Enter a valid HTTPS media URL." };
  if (rawMediaType && !(["image", "video", "embed"] as string[]).includes(rawMediaType)) return { ok: false, message: "Choose a valid media type." };
  if (rawStatus !== "draft" && rawStatus !== "published") return { ok: false, message: "Choose draft or published status." };

  return { ok: true, value: { title, slug, excerpt, body, coverImageUrl, mediaUrl, mediaType: rawMediaType as SubscriberMediaType | null, status: rawStatus } };
}

export function subscriberPostErrorMessage(message: string): string {
  if (message.includes("duplicate_subscriber_post_slug")) return "That slug is already in use. Choose a unique slug.";
  if (message.includes("stale_subscriber_post_version")) return "This post changed after the page loaded. Refresh before trying again.";
  if (message.includes("subscriber_post_not_found")) return "This post no longer exists. Refresh the page.";
  if (message.includes("active_admin_required") || message.includes("permission denied")) return "An active administrator account is required.";
  return "The subscriber content change could not be completed safely. Please try again.";
}
