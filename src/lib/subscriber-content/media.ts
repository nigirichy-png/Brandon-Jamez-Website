import "server-only";

import type { AdminSubscriberPost, SubscriberPostDetail, SubscriberPostSummary } from "./model";
import { preferredSubscriberImageSource, protectedSubscriberMediaSource, subscriberMediaRoute } from "./media-policy";

export type SubscriberPostSummaryWithImage = SubscriberPostSummary & { cover_image_src: string | null };
export type SubscriberPostDetailWithImages = SubscriberPostDetail & {
  cover_image_src: string | null;
  content_image_src: string | null;
  private_video_src: string | null;
  bunny_video_playback_src: string | null;
};
export type AdminSubscriberPostWithImages = AdminSubscriberPost & {
  cover_image_src: string | null;
  content_image_src: string | null;
  private_video_src: string | null;
  bunny_video_playback_src: string | null;
};
export type SubscriberPostPresentationModel = Pick<
  SubscriberPostDetail,
  "id" | "title" | "slug" | "excerpt" | "body" | "media_url" | "media_type" | "status" | "published_at"
> & {
  cover_image_src: string | null;
  content_image_src: string | null;
  private_video_src: string | null;
  bunny_video_playback_src: string | null;
};

export function resolveSubscriberPostSummariesMedia(posts: SubscriberPostSummary[], authorized: boolean): SubscriberPostSummaryWithImage[] {
  return posts.map((post) => ({
    ...post,
    cover_image_src: preferredSubscriberImageSource(
      subscriberMediaRoute({ available: post.has_cover_image, slug: post.slug, kind: "cover", authorized }),
      post.cover_image_url,
    ),
  }));
}

export function resolveSubscriberPostDetailMedia(post: SubscriberPostDetail, authorized: boolean): SubscriberPostDetailWithImages {
  const request = { slug: post.slug, authorized } as const;
  const cover = subscriberMediaRoute({ ...request, available: post.has_cover_image, kind: "cover" });
  const content = subscriberMediaRoute({ ...request, available: post.has_content_image, kind: "content" });
  const video = subscriberMediaRoute({ ...request, available: post.has_private_video, kind: "video" });
  return {
    ...post,
    cover_image_src: preferredSubscriberImageSource(cover, post.cover_image_url),
    content_image_src: preferredSubscriberImageSource(content, post.media_type === "image" ? post.media_url : null),
    private_video_src: video,
    bunny_video_playback_src: authorized && post.has_bunny_video ? `/api/subscriber/bunny/${post.slug}` : null,
  };
}

export function resolveAdminSubscriberPostsMedia(posts: AdminSubscriberPost[], authorized: boolean): AdminSubscriberPostWithImages[] {
  return posts.map((post) => {
    const request = { postId: post.id, slug: post.slug, authorized, adminPreview: true } as const;
    const cover = protectedSubscriberMediaSource({ ...request, path: post.cover_image_path, kind: "cover" });
    const content = protectedSubscriberMediaSource({ ...request, path: post.content_image_path, kind: "content" });
    const video = protectedSubscriberMediaSource({ ...request, path: post.video_path, kind: "video" });
    return {
      ...post,
      cover_image_src: preferredSubscriberImageSource(cover, post.cover_image_url),
      content_image_src: preferredSubscriberImageSource(content, post.media_type === "image" ? post.media_url : null),
      private_video_src: video,
      bunny_video_playback_src: authorized && post.bunny_video_id && post.bunny_video_status === "ready" ? `/api/subscriber/bunny/${post.slug}?preview=admin` : null,
    };
  });
}
