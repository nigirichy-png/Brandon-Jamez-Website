export const SUBSCRIBER_MEDIA_BUCKET = "subscriber-media";
export const SUBSCRIBER_SIGNED_URL_LIFETIME_SECONDS = 60;
export const SUBSCRIBER_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const SUBSCRIBER_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
export const SUBSCRIBER_VIDEO_MAX_BYTES = 10 * 1024 * 1024;
export const SUBSCRIBER_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;
export type SubscriberImageKind = "cover" | "content";
export type SubscriberMediaKind = SubscriberImageKind | "video";
export type SubscriberImageMimeType = (typeof SUBSCRIBER_IMAGE_MIME_TYPES)[number];
export type SubscriberVideoMimeType = (typeof SUBSCRIBER_VIDEO_MIME_TYPES)[number];

const uuidPattern = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const pathPattern = new RegExp(`^posts/(${uuidPattern})/(cover|content|video)/(${uuidPattern})\\.(jpg|png|webp|gif|avif|mp4|webm)$`);
const imageExtensions: Record<SubscriberImageMimeType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
const videoExtensions: Record<SubscriberVideoMimeType, string> = { "video/mp4": "mp4", "video/webm": "webm" };

export function validateSubscriberImageMetadata(file: { type: string; size: number }): string | null {
  if (!(SUBSCRIBER_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) return "Choose a JPEG, PNG, WebP, GIF, or AVIF image.";
  if (file.size < 1) return "Choose a non-empty image file.";
  if (file.size > SUBSCRIBER_IMAGE_MAX_BYTES) return "The image must be 10 MB or smaller.";
  return null;
}

export async function validateSubscriberImageFile(file: File): Promise<string | null> {
  const metadataError = validateSubscriberImageMetadata(file);
  if (metadataError) return metadataError;
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  const valid = file.type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : file.type === "image/png" ? bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index])
      : file.type === "image/webp" ? ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"
        : file.type === "image/gif" ? ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a"
          : file.type === "image/avif" ? ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))
            : false;
  return valid ? null : "The file content does not match its selected image type.";
}

export function validateSubscriberVideoMetadata(file: { type: string; size: number }): string | null {
  if (!(SUBSCRIBER_VIDEO_MIME_TYPES as readonly string[]).includes(file.type)) return "Choose an MP4 or WebM video.";
  if (file.size < 1) return "Choose a non-empty video file.";
  if (file.size > SUBSCRIBER_VIDEO_MAX_BYTES) return "The video must be 10 MB or smaller.";
  return null;
}

export async function validateSubscriberVideoFile(file: File): Promise<string | null> {
  const metadataError = validateSubscriberVideoMetadata(file);
  if (metadataError) return metadataError;
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  const valid = file.type === "video/mp4"
    ? ascii(4, 8) === "ftyp"
    : bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  return valid ? null : "The file content does not match its selected video type.";
}

export function isSafeSubscriberMediaPath(path: string, postId?: string, kind?: SubscriberMediaKind): boolean {
  if (path.includes("..") || path.includes("\\") || /[\s\p{Cc}\p{Cf}]/u.test(path)) return false;
  const match = pathPattern.exec(path);
  if (!match || (postId && match[1] !== postId) || (kind && match[2] !== kind)) return false;
  const extension = match[4];
  return match[2] === "video" ? extension === "mp4" || extension === "webm" : ["jpg", "png", "webp", "gif", "avif"].includes(extension);
}

export function buildSubscriberMediaPath(postId: string, kind: SubscriberImageKind, mimeType: SubscriberImageMimeType, objectId: string): string {
  const path = `posts/${postId}/${kind}/${objectId}.${imageExtensions[mimeType]}`;
  if (!isSafeSubscriberMediaPath(path, postId, kind)) throw new Error("invalid_subscriber_image_path");
  return path;
}

export function buildSubscriberVideoPath(postId: string, mimeType: SubscriberVideoMimeType, objectId: string): string {
  const path = `posts/${postId}/video/${objectId}.${videoExtensions[mimeType]}`;
  if (!isSafeSubscriberMediaPath(path, postId, "video")) throw new Error("invalid_subscriber_video_path");
  return path;
}

export function protectedSubscriberMediaSource(input: {
  path: string | null;
  postId: string;
  slug: string;
  kind: SubscriberMediaKind;
  authorized: boolean;
  adminPreview?: boolean;
}): string | null {
  if (!input.authorized || !input.path || !isSafeSubscriberMediaPath(input.path, input.postId, input.kind)) return null;
  const base = `/subscriber/media/${encodeURIComponent(input.slug)}/${input.kind}`;
  return input.adminPreview ? `${base}?preview=admin` : base;
}

export function subscriberMediaRoute(input: {
  available: boolean;
  slug: string;
  kind: SubscriberMediaKind;
  authorized: boolean;
  adminPreview?: boolean;
}): string | null {
  if (!input.authorized || !input.available) return null;
  const base = `/subscriber/media/${encodeURIComponent(input.slug)}/${input.kind}`;
  return input.adminPreview ? `${base}?preview=admin` : base;
}

export function preferredSubscriberImageSource(signedUrl: string | null, externalFallback: string | null): string | null {
  return signedUrl ?? externalFallback;
}

export function subscriberDetailImageSource(contentImage: string | null, coverImage: string | null): string | null {
  return contentImage ?? coverImage;
}
