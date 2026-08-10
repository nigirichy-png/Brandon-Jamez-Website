export type BunnyVideoStatus = "pending" | "uploading" | "processing" | "ready" | "failed";

export type BunnyUploadCredentials = {
  endpoint: string;
  videoId: string;
  libraryId: string;
  authorizationExpire: number;
  authorizationSignature: string;
};

export type BunnyWebhookPayload = {
  VideoLibraryId: number;
  VideoGuid: string;
  Status: number;
};

export function mapBunnyProviderStatus(status: number): BunnyVideoStatus | null {
  if (status === 0) return "pending";
  if (status === 6) return "uploading";
  if ([1, 2, 7].includes(status)) return "processing";
  if ([3, 4].includes(status)) return "ready";
  if ([5, 8].includes(status)) return "failed";
  return null;
}
