import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateSubscriberPostForm, SubscriberPostRecord } from "@/components/admin/subscriber-post-forms";
import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { evaluateAdminAccess } from "@/lib/staff/evaluate-staff-access";
import { listAdminSubscriberPosts } from "@/lib/subscriber-content/data";
import { resolveAdminSubscriberPostsMedia } from "@/lib/subscriber-content/media";

export const metadata: Metadata = { title: "Subscriber Content Management" };

export default async function AdminSubscriberContentPage() {
  const state = await resolveStaffAccessState(undefined);
  if (!state.authenticated) redirect("/login?next=/admin/subscriber-content");
  const decision = evaluateAdminAccess(state);
  const posts = decision.allowed ? await resolveAdminSubscriberPostsMedia(await listAdminSubscriberPosts()) : [];
  return <InternalShell state={state} decision={decision} currentPath="/admin/subscriber-content" eyebrow="Administration · subscriber content" title="Manage subscriber posts." description="Create neutral plain-text posts and deliberately publish them to entitled subscribers.">
    {!decision.allowed ? <StaffAccessGate decision={decision} area="admin" /> : <div className="space-y-8"><CreateSubscriberPostForm /><section className="grid gap-5" aria-label="Subscriber posts">{posts.length ? posts.map((post) => <SubscriberPostRecord key={post.id} post={post} />) : <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-400">No subscriber posts yet.</p>}</section></div>}
  </InternalShell>;
}
