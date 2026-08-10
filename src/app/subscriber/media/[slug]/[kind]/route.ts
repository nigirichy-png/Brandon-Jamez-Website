import type { NextRequest } from "next/server";

import { loadRealAccountState, resolveMemberAccessState } from "@/lib/auth/access-state";
import { evaluateMemberAccess } from "@/lib/entitlements/evaluate-member-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPublishedSubscriberPost, listAdminSubscriberPosts } from "@/lib/subscriber-content/data";
import { serveSubscriberMedia } from "@/lib/subscriber-content/media-gateway";
import { SUBSCRIBER_MEDIA_BUCKET } from "@/lib/subscriber-content/media-policy";
import type { SubscriberMediaKind } from "@/lib/subscriber-content/media-policy";
import type { AdminSubscriberPost } from "@/lib/subscriber-content/model";

export const dynamic = "force-dynamic";

async function resolveServerMediaPost(id: string, slug: string, kind: SubscriberMediaKind, allowDraft: boolean) {
  const admin = createAdminSupabaseClient();
  const { data: path, error } = await admin.rpc("resolve_subscriber_media_path", {
    p_post_id: id,
    p_slug: slug,
    p_kind: kind,
    p_allow_draft: allowDraft,
  });
  if (error || !path) return null;
  return {
    id,
    cover_image_path: kind === "cover" ? path : null,
    content_image_path: kind === "content" ? path : null,
    video_path: kind === "video" ? path : null,
  };
}

async function authorizedPost(slug: string, adminPreview: boolean, kind: SubscriberMediaKind) {
  if (adminPreview) {
    const state = await loadRealAccountState();
    if (!state.user || state.accessLoadFailed || state.accountBlocked || !state.roles.includes("admin")) return null;
    const post: AdminSubscriberPost | undefined = (await listAdminSubscriberPosts()).find((item) => item.slug === slug);
    return post ? resolveServerMediaPost(post.id, post.slug, kind, true) : null;
  }

  const state = await resolveMemberAccessState(undefined);
  if (!evaluateMemberAccess(state).allowed) return null;
  const post = await getPublishedSubscriberPost(slug);
  return post ? resolveServerMediaPost(post.id, post.slug, kind, false) : null;
}

async function serveMedia(request: NextRequest, context: { params: Promise<{ slug: string; kind: string }> }, headOnly: boolean): Promise<Response> {
  const { slug, kind } = await context.params;
  return serveSubscriberMedia(request, { slug, kind, headOnly }, {
    authorizePost: authorizedPost,
    createSignedUrl: async (path, expiresIn) => {
      const admin = createAdminSupabaseClient();
      const signed = await admin.storage.from(SUBSCRIBER_MEDIA_BUCKET).createSignedUrl(path, expiresIn);
      return signed.error ? null : signed.data.signedUrl;
    },
    fetchUpstream: fetch,
  });
}

export function GET(request: NextRequest, context: { params: Promise<{ slug: string; kind: string }> }) {
  return serveMedia(request, context, false);
}

export function HEAD(request: NextRequest, context: { params: Promise<{ slug: string; kind: string }> }) {
  return serveMedia(request, context, true);
}
