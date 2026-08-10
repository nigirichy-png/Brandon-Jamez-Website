import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubscriberPostPresentation } from "@/components/subscriber/subscriber-post-presentation";
import { requireRealAdmin } from "@/lib/admin/data";
import { isUuid } from "@/lib/admin/validation";
import { getAdminSubscriberPost } from "@/lib/subscriber-content/data";
import { resolveAdminSubscriberPostsMedia } from "@/lib/subscriber-content/media";

export const metadata: Metadata = { title: "Admin Subscriber Post Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSubscriberPostPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const authorization = await requireRealAdmin(`/admin/subscriber-content/${id}/preview`);
  if (!authorization.allowed) notFound();
  const rawPost = await getAdminSubscriberPost(id);
  if (!rawPost) notFound();
  const [post] = resolveAdminSubscriberPostsMedia([rawPost], authorization.allowed);
  if (!post) notFound();
  return <main id="main-content" className="flex-1 bg-[#090b10]"><SubscriberPostPresentation post={post} backHref="/admin/subscriber-content" backLabel="Subscriber content admin" preview /></main>;
}
