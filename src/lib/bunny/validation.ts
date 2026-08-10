export const BUNNY_MAX_UPLOAD_BYTES = 30 * 1024 * 1024 * 1024;
export const BUNNY_VIDEO_MIME_TYPES = new Set([
  "video/mp4", "video/webm", "video/quicktime", "video/x-matroska",
  "video/x-msvideo", "video/mpeg", "video/mp2t",
]);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validBunnyUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function validBunnyVersion(value: unknown): value is string {
  return typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value));
}

export function validBunnyUploadInput(input: unknown): input is {
  title: string; description: string; fileName: string; fileSize: number; mimeType: string;
} {
  if (!input || typeof input !== "object") return false;
  const value = input as Record<string, unknown>;
  return typeof value.title === "string" && value.title.trim().length >= 1 && value.title.trim().length <= 160 && !/[\p{Cc}\p{Cf}]/u.test(value.title)
    && typeof value.description === "string" && value.description.trim().length <= 500 && !/[\p{Cc}\p{Cf}]/u.test(value.description)
    && typeof value.fileName === "string" && value.fileName.trim().length >= 1 && value.fileName.trim().length <= 255 && !/[\p{Cc}]/u.test(value.fileName)
    && typeof value.fileSize === "number" && Number.isSafeInteger(value.fileSize) && value.fileSize >= 1 && value.fileSize <= BUNNY_MAX_UPLOAD_BYTES
    && typeof value.mimeType === "string" && BUNNY_VIDEO_MIME_TYPES.has(value.mimeType);
}

export function requestIsSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
