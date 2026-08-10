import {
  isSafeSubscriberMediaPath,
  SUBSCRIBER_IMAGE_MIME_TYPES,
  SUBSCRIBER_SIGNED_URL_LIFETIME_SECONDS,
  SUBSCRIBER_VIDEO_MIME_TYPES,
  type SubscriberMediaKind,
} from "./media-policy.ts";

export type SubscriberMediaPost = {
  id: string;
  cover_image_path: string | null;
  content_image_path: string | null;
  video_path: string | null;
};

export type SubscriberMediaGatewayDependencies = {
  authorizePost: (slug: string, adminPreview: boolean, kind: SubscriberMediaKind) => Promise<SubscriberMediaPost | null>;
  createSignedUrl: (path: string, expiresIn: number) => Promise<string | null>;
  fetchUpstream: typeof fetch;
};

type ParsedRange =
  | { kind: "bounded"; start: bigint; end: bigint }
  | { kind: "open"; start: bigint }
  | { kind: "suffix"; length: bigint };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const rangePattern = /^bytes=(\d*)-(\d*)$/;
const contentRangePattern = /^bytes (\d+)-(\d+)\/(\d+)$/;
const unsatisfiedContentRangePattern = /^bytes \*\/(\d+)$/;
const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Vary": "Cookie, Range",
};

function unavailable(status = 404, additionalHeaders?: HeadersInit): Response {
  const headers = new Headers(privateHeaders);
  if (additionalHeaders) new Headers(additionalHeaders).forEach((value, name) => headers.set(name, value));
  return new Response(null, { status, headers });
}

function parseRange(value: string | null): { value: string | null; range: ParsedRange | null } | null {
  if (!value) return { value: null, range: null };
  if (value.length > 100) return null;
  const match = rangePattern.exec(value);
  if (!match || (!match[1] && !match[2])) return null;

  try {
    if (!match[1]) {
      const length = BigInt(match[2]);
      return length > BigInt(0) ? { value, range: { kind: "suffix", length } } : null;
    }
    const start = BigInt(match[1]);
    if (!match[2]) return { value, range: { kind: "open", start } };
    const end = BigInt(match[2]);
    return end >= start ? { value, range: { kind: "bounded", start, end } } : null;
  } catch {
    return null;
  }
}

function validSatisfiedContentRange(value: string | null, requested: ParsedRange): { value: string; length: bigint } | null {
  if (!value) return null;
  const match = contentRangePattern.exec(value);
  if (!match) return null;
  const start = BigInt(match[1]);
  const end = BigInt(match[2]);
  const total = BigInt(match[3]);
  if (total < BigInt(1) || start > end || end >= total) return null;

  const expected = requested.kind === "suffix"
    ? { start: total > requested.length ? total - requested.length : BigInt(0), end: total - BigInt(1) }
    : { start: requested.start, end: requested.kind === "open" || requested.end >= total ? total - BigInt(1) : requested.end };
  if (start !== expected.start || end !== expected.end) return null;
  return { value, length: end - start + BigInt(1) };
}

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Rejected upstream responses are never exposed; cancellation is best effort.
  }
}

function mediaPath(post: SubscriberMediaPost, kind: SubscriberMediaKind): string | null {
  if (kind === "cover") return post.cover_image_path;
  if (kind === "content") return post.content_image_path;
  return post.video_path;
}

export async function serveSubscriberMedia(
  request: Request,
  route: { slug: string; kind: string; headOnly?: boolean },
  dependencies: SubscriberMediaGatewayDependencies,
): Promise<Response> {
  if (!slugPattern.test(route.slug) || route.slug.length > 100 || !["cover", "content", "video"].includes(route.kind)) return unavailable();
  const kind = route.kind as SubscriberMediaKind;
  const previewValue = new URL(request.url).searchParams.get("preview");
  if (previewValue && previewValue !== "admin") return unavailable();

  const parsedRange = parseRange(request.headers.get("range"));
  if (!parsedRange) return unavailable(416);

  try {
    const post = await dependencies.authorizePost(route.slug, previewValue === "admin", kind);
    if (!post) return unavailable();
    const path = mediaPath(post, kind);
    if (!path || !isSafeSubscriberMediaPath(path, post.id, kind)) return unavailable();

    const signedUrl = await dependencies.createSignedUrl(path, SUBSCRIBER_SIGNED_URL_LIFETIME_SECONDS);
    if (!signedUrl) return unavailable();

    const upstream = await dependencies.fetchUpstream(signedUrl, {
      method: route.headOnly ? "HEAD" : "GET",
      cache: "no-store",
      headers: parsedRange.value ? { Range: parsedRange.value } : undefined,
      redirect: "follow",
    });

    if (upstream.status === 416 && parsedRange.range) {
      await cancelBody(upstream);
      const contentRange = upstream.headers.get("content-range");
      if (!contentRange || !unsatisfiedContentRangePattern.test(contentRange)) return unavailable(416);
      return unavailable(416, { "Accept-Ranges": "bytes", "Content-Range": contentRange });
    }

    const expectedStatus = parsedRange.range ? 206 : 200;
    if (upstream.status !== expectedStatus) {
      await cancelBody(upstream);
      return unavailable(502);
    }

    const contentType = upstream.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase() ?? "";
    const allowedTypes = kind === "video" ? SUBSCRIBER_VIDEO_MIME_TYPES : SUBSCRIBER_IMAGE_MIME_TYPES;
    if (!(allowedTypes as readonly string[]).includes(contentType)) {
      await cancelBody(upstream);
      return unavailable(502);
    }

    let contentRange: string | null = null;
    let expectedLength: bigint | null = null;
    if (parsedRange.range) {
      const validated = validSatisfiedContentRange(upstream.headers.get("content-range"), parsedRange.range);
      if (!validated) {
        await cancelBody(upstream);
        return unavailable(502);
      }
      contentRange = validated.value;
      expectedLength = validated.length;
      const upstreamLength = upstream.headers.get("content-length");
      if (upstreamLength && (!/^\d+$/.test(upstreamLength) || BigInt(upstreamLength) !== expectedLength)) {
        await cancelBody(upstream);
        return unavailable(502);
      }
    }

    const headers = new Headers(privateHeaders);
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", "inline");
    headers.set("Accept-Ranges", "bytes");
    if (contentRange) headers.set("Content-Range", contentRange);
    if (expectedLength !== null) headers.set("Content-Length", expectedLength.toString());
    else {
      const contentLength = upstream.headers.get("content-length");
      if (contentLength && /^\d+$/.test(contentLength)) headers.set("Content-Length", contentLength);
    }
    for (const name of ["etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(route.headOnly ? null : upstream.body, { status: expectedStatus, headers });
  } catch {
    return unavailable();
  }
}
