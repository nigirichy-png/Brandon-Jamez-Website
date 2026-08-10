import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubscriberPostPresentation } from "@/components/subscriber/subscriber-post-presentation";
import { requireSubscriberAccess } from "@/lib/entitlements/require-subscriber-access";
import { getPublishedSubscriberPost } from "@/lib/subscriber-content/data";
import { resolveSubscriberPostDetailMedia } from "@/lib/subscriber-content/media";

export const metadata: Metadata = { title: "Subscriber Post" };
export const dynamic = "force-dynamic";
const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function SubscriberPostPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSubscriberAccess();
  const { slug } = await params;
  if (!validSlug.test(slug) || slug.length > 100) notFound();
  const rawPost = await getPublishedSubscriberPost(slug);
  if (!rawPost) notFound();
  const post = resolveSubscriberPostDetailMedia(rawPost, true);
  return <main id="main-content" className="flex-1"><SubscriberPostPresentation post={post} backHref="/subscriber" backLabel="Subscriber area" /></main>;
}
