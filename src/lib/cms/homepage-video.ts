import type { PublicCmsVideo } from "@/lib/cms/video-model";

function publishedTime(video: PublicCmsVideo): number {
  const parsed = video.published_at ? Date.parse(video.published_at) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function selectHomepageVideo(videos: readonly PublicCmsVideo[]): PublicCmsVideo | null {
  const featured = videos.find((video) => video.featured);
  if (featured) return featured;
  if (!videos.length) return null;

  return videos.reduce((newest, video) =>
    publishedTime(video) > publishedTime(newest) ? video : newest,
  );
}
