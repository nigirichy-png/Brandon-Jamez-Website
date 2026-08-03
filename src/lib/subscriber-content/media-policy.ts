export const SUBSCRIBER_MEDIA_BUCKET = "subscriber-media";
export const SUBSCRIBER_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const SUBSCRIBER_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
export type SubscriberImageKind = "cover" | "content";
export type SubscriberImageMimeType = (typeof SUBSCRIBER_IMAGE_MIME_TYPES)[number];

const uuidPattern = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const pathPattern = new RegExp(`^posts/(${uuidPattern})/(cover|content)/(${uuidPattern})\\.(jpg|png|webp|gif|avif)$`);
const extensions: Record<SubscriberImageMimeType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

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

export function isSafeSubscriberMediaPath(path: string, postId?: string, kind?: SubscriberImageKind): boolean {
  if (path.includes("..") || path.includes("\\") || /[\s\p{Cc}\p{Cf}]/u.test(path)) return false;
  const match = pathPattern.exec(path);
  return Boolean(match && (!postId || match[1] === postId) && (!kind || match[2] === kind));
}

export function buildSubscriberMediaPath(postId: string, kind: SubscriberImageKind, mimeType: SubscriberImageMimeType, objectId: string): string {
  const path = `posts/${postId}/${kind}/${objectId}.${extensions[mimeType]}`;
  if (!isSafeSubscriberMediaPath(path, postId, kind)) throw new Error("invalid_subscriber_image_path");
  return path;
}

export function preferredSubscriberImageSource(signedUrl: string | null, externalFallback: string | null): string | null {
  return signedUrl ?? externalFallback;
}

export function subscriberDetailImageSource(contentImage: string | null, coverImage: string | null): string | null {
  return contentImage ?? coverImage;
}
