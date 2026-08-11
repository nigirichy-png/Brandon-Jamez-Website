import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { SubscriberPostDetail } from "../src/lib/subscriber-content/model.ts";
import { getYouTubeHoverPreviewUrl } from "../src/lib/cms/video-links.ts";
import { evaluateMemberAccessPolicy } from "../src/lib/entitlements/member-access-policy.ts";
import type { MemberAccessState } from "../src/lib/entitlements/types.ts";
import { serveSubscriberMedia, type SubscriberMediaGatewayDependencies, type SubscriberMediaPost } from "../src/lib/subscriber-content/media-gateway.ts";
import { normalizeSubscriberExternalMedia, subscriberPostErrorMessage, slugifySubscriberPostTitle } from "../src/lib/subscriber-content/validation.ts";
import { findPublishedSubscriberPost, publishedSubscriberPosts } from "../src/lib/subscriber-content/visibility.ts";
import {
  buildSubscriberVideoPath,
  isSafeSubscriberMediaPath,
  preferredSubscriberImageSource,
  protectedSubscriberMediaSource,
  subscriberMediaRoute,
  subscriberDetailImageSource,
  SUBSCRIBER_IMAGE_MAX_BYTES,
  SUBSCRIBER_SIGNED_URL_LIFETIME_SECONDS,
  SUBSCRIBER_VIDEO_MAX_BYTES,
  validateSubscriberImageFile,
  validateSubscriberImageMetadata,
  validateSubscriberVideoFile,
  validateSubscriberVideoMetadata,
} from "../src/lib/subscriber-content/media-policy.ts";

const published: SubscriberPostDetail = { id: "published", title: "Published", slug: "published", excerpt: null, body: "Safe text", cover_image_url: null, has_cover_image: false, has_content_image: false, has_private_video: false, has_bunny_video: false, media_url: null, media_type: null, status: "published", published_at: "2026-08-03T00:00:00Z" };
const draft: SubscriberPostDetail = { ...published, id: "draft", title: "Draft", slug: "draft", status: "draft", published_at: null };
const mediaPostId = "123e4567-e89b-42d3-a456-426614174000";
const mediaObjectId = "8f14e45f-ea8d-4a78-a652-53f2897ea2e0";
const privateVideoPath = `posts/${mediaPostId}/video/${mediaObjectId}.mp4`;
const mediaPost: SubscriberMediaPost = { id: mediaPostId, cover_image_path: null, content_image_path: null, video_path: privateVideoPath };

function memberState(overrides: Partial<MemberAccessState> = {}): MemberAccessState {
  return {
    scenarioId: null,
    label: "Gateway test",
    displayName: "Member",
    authenticated: true,
    ageVerified: false,
    subscriptionActive: true,
    accountBlocked: false,
    roles: ["subscriber"],
    verificationStatus: "not_started",
    subscriptionStatus: "active",
    subscriptionSummary: "Active paid subscription",
    developmentPreview: false,
    ...overrides,
  };
}

function gatewayDependencies(overrides: Partial<SubscriberMediaGatewayDependencies> = {}): SubscriberMediaGatewayDependencies {
  return {
    authorizePost: async () => mediaPost,
    createSignedUrl: async () => "https://storage.example/private-object?token=server-only",
    fetchUpstream: async () => new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "Content-Type": "video/mp4", "Content-Length": "3" },
    }),
    ...overrides,
  };
}

function mediaRequest(range?: string, adminPreview = false): Request {
  return new Request(`https://site.example/subscriber/media/members-only/video${adminPreview ? "?preview=admin" : ""}`, {
    headers: range ? { Range: range } : undefined,
  });
}

test("draft posts never appear in the subscriber listing", () => {
  assert.deepEqual(publishedSubscriberPosts([draft, published]), [published]);
});

test("published posts are returned", () => {
  assert.equal(publishedSubscriberPosts([published])[0]?.slug, "published");
});

test("draft detail routes resolve as not found", () => {
  assert.equal(findPublishedSubscriberPost([draft], "draft"), null);
});

test("subscriber pages invoke the canonical guard before content data access", async () => {
  for (const path of ["src/app/subscriber/page.tsx", "src/app/subscriber/[slug]/page.tsx"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    const guard = source.indexOf("await requireSubscriberAccess()");
    const query = Math.min(...[source.indexOf("await listPublishedSubscriberPosts()"), source.indexOf("await getPublishedSubscriberPost(slug)")].filter((index) => index >= 0));
    assert.ok(guard >= 0 && guard < query, `${path} must guard before querying content`);
  }
});

test("subscriber content management requires the canonical active-admin checks", async () => {
  const [actions, migration] = await Promise.all([
    readFile(new URL("../src/app/admin/subscriber-content/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202608010008_subscriber_content.sql", import.meta.url), "utf8"),
  ]);
  assert.match(actions, /requireRealAdmin\("\/admin\/subscriber-content"\)/);
  assert.match(migration, /if not private\.is_active_admin\(\) then/);
});

test("slug generation is normalized and duplicate slugs have a clear error", () => {
  assert.equal(slugifySubscriberPostTitle("  A Safe Update!  "), "a-safe-update");
  assert.equal(subscriberPostErrorMessage("duplicate_subscriber_post_slug"), "That slug is already in use. Choose a unique slug.");
});

test("subscriber image validation rejects unsupported and oversized files", () => {
  assert.equal(validateSubscriberImageMetadata({ type: "image/svg+xml", size: 100 }), "Choose a JPEG, PNG, WebP, GIF, or AVIF image.");
  assert.equal(validateSubscriberImageMetadata({ type: "image/jpeg", size: SUBSCRIBER_IMAGE_MAX_BYTES + 1 }), "The image must be 10 MB or smaller.");
});

test("subscriber image validation rejects spoofed image content", async () => {
  const file = new File(["not a jpeg"], "image.jpg", { type: "image/jpeg" });
  assert.equal(await validateSubscriberImageFile(file), "The file content does not match its selected image type.");
});

test("subscriber image paths reject traversal and cross-post paths", () => {
  const postId = "123e4567-e89b-42d3-a456-426614174000";
  const objectId = "8f14e45f-ea8d-4a78-a652-53f2897ea2e0";
  assert.equal(isSafeSubscriberMediaPath(`posts/${postId}/cover/${objectId}.jpg`, postId, "cover"), true);
  assert.equal(isSafeSubscriberMediaPath(`posts/${postId}/../${objectId}.jpg`, postId, "cover"), false);
  assert.equal(isSafeSubscriberMediaPath(`posts/223e4567-e89b-42d3-a456-426614174000/cover/${objectId}.jpg`, postId, "cover"), false);
});

test("private video validation rejects unsupported, oversized, and spoofed files", async () => {
  assert.equal(validateSubscriberVideoMetadata({ type: "video/quicktime", size: 100 }), "Choose an MP4 or WebM video.");
  assert.equal(validateSubscriberVideoMetadata({ type: "video/mp4", size: SUBSCRIBER_VIDEO_MAX_BYTES + 1 }), "The video must be 10 MB or smaller.");
  assert.equal(await validateSubscriberVideoFile(new File(["not an mp4"], "clip.mp4", { type: "video/mp4" })), "The file content does not match its selected video type.");
});

test("private video paths are post-bound and traversal-safe", () => {
  const postId = "123e4567-e89b-42d3-a456-426614174000";
  const objectId = "8f14e45f-ea8d-4a78-a652-53f2897ea2e0";
  const path = buildSubscriberVideoPath(postId, "video/mp4", objectId);
  assert.equal(path, `posts/${postId}/video/${objectId}.mp4`);
  assert.equal(isSafeSubscriberMediaPath(path, postId, "video"), true);
  assert.equal(isSafeSubscriberMediaPath(path, postId, "cover"), false);
  assert.equal(isSafeSubscriberMediaPath(`posts/${postId}/video/../${objectId}.mp4`, postId, "video"), false);
});

test("protected media sources fail closed and expose only same-origin gateway paths", () => {
  const postId = "123e4567-e89b-42d3-a456-426614174000";
  const objectId = "8f14e45f-ea8d-4a78-a652-53f2897ea2e0";
  const path = `posts/${postId}/video/${objectId}.webm`;
  const input = { path, postId, slug: "members-only", kind: "video" as const };

  assert.equal(protectedSubscriberMediaSource({ ...input, authorized: false }), null);
  assert.equal(protectedSubscriberMediaSource({ ...input, authorized: true }), "/subscriber/media/members-only/video");
  assert.equal(protectedSubscriberMediaSource({ ...input, authorized: true, adminPreview: true }), "/subscriber/media/members-only/video?preview=admin");
  assert.equal(protectedSubscriberMediaSource({ ...input, path: "posts/other/video/file.mp4", authorized: true }), null);
  assert.equal(subscriberMediaRoute({ available: true, slug: "members-only", kind: "video", authorized: true }), "/subscriber/media/members-only/video");
  assert.equal(subscriberMediaRoute({ available: false, slug: "members-only", kind: "video", authorized: true }), null);
});

test("subscriber DTOs expose media availability but no internal storage paths", () => {
  const detail: SubscriberPostDetail = {
    ...published,
    has_cover_image: true,
    has_content_image: true,
    has_private_video: true,
    has_bunny_video: true,
  };
  assert.deepEqual(
    Object.keys(detail).filter((key) => key.endsWith("_path")),
    [],
  );
  assert.equal(JSON.stringify(detail).includes("subscriber-media"), false);
  assert.equal(JSON.stringify(detail).includes("posts/"), false);
});

test("subscriber post RPCs return safe public shapes while path lookup remains server-only", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202608060010_private_subscriber_video.sql", import.meta.url), "utf8");
  const listStart = migration.indexOf("create function public.list_published_subscriber_posts()");
  const detailStart = migration.indexOf("create function public.get_published_subscriber_post(p_slug text)");
  const resolverStart = migration.indexOf("create function public.resolve_subscriber_media_path(");
  const grantsStart = migration.indexOf("revoke all on function public.list_published_subscriber_posts()", resolverStart);
  const listRpc = migration.slice(listStart, detailStart);
  const detailRpc = migration.slice(detailStart, resolverStart);
  const resolverRpc = migration.slice(resolverStart, grantsStart);
  const grants = migration.slice(grantsStart);

  for (const rpc of [listRpc, detailRpc]) {
    assert.doesNotMatch(rpc, /\b(?:cover_image_path|content_image_path|video_path)\s+text\b/);
    assert.doesNotMatch(rpc, /select[\s\S]*posts\.(?:cover_image_path|content_image_path|video_path)(?:\s*,|\s+from)/);
  }
  assert.match(listRpc, /has_cover_image boolean/);
  assert.match(detailRpc, /has_cover_image boolean[\s\S]*has_content_image boolean[\s\S]*has_private_video boolean/);
  assert.match(resolverRpc, /security definer[\s\S]*set search_path = ''/);
  assert.match(resolverRpc, /auth\.role\(\)\) <> 'service_role'/);
  assert.match(resolverRpc, /posts\.id = p_post_id[\s\S]*posts\.slug = p_slug/);
  assert.match(resolverRpc, /p_allow_draft or posts\.status = 'published'/);
  assert.match(resolverRpc, /private\.is_valid_subscriber_media_path/);
  assert.match(grants, /revoke all on function public\.resolve_subscriber_media_path[\s\S]*from public, anon, authenticated, service_role/);
  assert.match(grants, /grant execute on function public\.resolve_subscriber_media_path[\s\S]*to service_role/);
  assert.doesNotMatch(grants, /grant execute on function public\.resolve_subscriber_media_path[\s\S]*to (?:anon|authenticated)/);
});

test("normal subscribers receive no direct private Storage read policy", async () => {
  const [contentMigration, storageMigration] = await Promise.all([
    readFile(new URL("../supabase/migrations/202608010008_subscriber_content.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202608010009_subscriber_media_storage.sql", import.meta.url), "utf8"),
  ]);
  assert.match(contentMigration, /revoke all on table public\.subscriber_posts from anon, authenticated/);
  assert.doesNotMatch(storageMigration, /create policy "[^"]*"[\s\S]{0,120}on storage\.objects[\s\S]{0,80}for select/);
  assert.match(storageMigration, /subscriber_media_admin_insert/);
  assert.match(storageMigration, /subscriber_media_admin_update/);
  assert.match(storageMigration, /subscriber_media_admin_delete/);
});

test("slug and kind manipulation stops before post lookup or signing", async (context) => {
  for (const route of [
    { slug: "../members-only", kind: "video" },
    { slug: "members-only", kind: "../video" },
    { slug: "members-only", kind: "thumbnail" },
  ]) {
    await context.test(`${route.slug}/${route.kind}`, async () => {
      let called = false;
      const response = await serveSubscriberMedia(mediaRequest(), route, gatewayDependencies({
        authorizePost: async () => { called = true; return mediaPost; },
        createSignedUrl: async () => { called = true; return "https://storage.example/should-not-run"; },
      }));
      assert.equal(response.status, 404);
      assert.equal(called, false);
    });
  }
});

test("media mutations authorize before storage access", async () => {
  const source = await readFile(new URL("../src/app/admin/subscriber-content/actions.ts", import.meta.url), "utf8");
  for (const actionName of ["uploadSubscriberPostImageAction", "removeSubscriberPostImageAction", "uploadSubscriberPostVideoAction", "removeSubscriberPostVideoAction"]) {
    const start = source.indexOf(`export async function ${actionName}`);
    const end = source.indexOf("\nexport async function ", start + 1);
    const action = source.slice(start, end < 0 ? undefined : end);
    assert.ok(action.indexOf("await authorize()") >= 0 && action.indexOf("await authorize()") < action.indexOf(".storage.from"));
  }
});

test("private media authorizes before signing and keeps the signed URL server-only", async () => {
  const calls: string[] = [];
  const signedUrl = "https://storage.example/private-object?token=server-only";
  const response = await serveSubscriberMedia(mediaRequest(), { slug: "members-only", kind: "video" }, gatewayDependencies({
    authorizePost: async () => { calls.push("authorize"); return mediaPost; },
    createSignedUrl: async (path, expiresIn) => {
      calls.push("sign");
      assert.equal(path, privateVideoPath);
      assert.equal(expiresIn, SUBSCRIBER_SIGNED_URL_LIFETIME_SECONDS);
      return signedUrl;
    },
    fetchUpstream: async (input, init) => {
      calls.push("fetch");
      assert.equal(input, signedUrl);
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.redirect, "follow");
      return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "Content-Type": "video/mp4", "Content-Length": "3" } });
    },
  }));

  assert.deepEqual(calls, ["authorize", "sign", "fetch"]);
  assert.equal(response.status, 200);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]));
  assert.equal(response.headers.get("location"), null);
  assert.ok([...response.headers.values()].every((value) => !value.includes("server-only")));
  assert.match(response.headers.get("cache-control") ?? "", /private/);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.doesNotMatch(response.headers.get("cache-control") ?? "", /public/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex, nofollow/);
  assert.equal(response.headers.get("content-disposition"), "inline");
  assert.equal(response.headers.get("content-type"), "video/mp4");
  assert.equal(response.headers.get("content-length"), "3");
  assert.equal(response.headers.get("accept-ranges"), "bytes");
});

test("private media returns validated partial responses for open, bounded, and suffix ranges", async (context) => {
  const cases = [
    { range: "bytes=0-", contentRange: "bytes 0-999/1000", length: 1000 },
    { range: "bytes=100-999", contentRange: "bytes 100-999/1000", length: 900 },
    { range: "bytes=-500", contentRange: "bytes 500-999/1000", length: 500 },
  ];

  for (const item of cases) {
    await context.test(item.range, async () => {
      const response = await serveSubscriberMedia(mediaRequest(item.range), { slug: "members-only", kind: "video" }, gatewayDependencies({
        fetchUpstream: async (_input, init) => {
          assert.equal(new Headers(init?.headers).get("range"), item.range);
          return new Response(new Uint8Array(item.length), {
            status: 206,
            headers: { "Content-Type": "video/mp4", "Content-Range": item.contentRange, "Content-Length": String(item.length), "Accept-Ranges": "bytes" },
          });
        },
      }));
      assert.equal(response.status, 206);
      assert.equal(response.headers.get("content-range"), item.contentRange);
      assert.equal(response.headers.get("content-length"), String(item.length));
      assert.equal(response.headers.get("accept-ranges"), "bytes");
      assert.equal((await response.arrayBuffer()).byteLength, item.length);
    });
  }
});

test("invalid and multiple ranges return 416 before authorization or storage", async (context) => {
  for (const range of ["bytes=100-99", "bytes=-0", "bytes=0-1,4-5", "bytes=-", "items=0-1"]) {
    await context.test(range, async () => {
      let dependencyCalled = false;
      const response = await serveSubscriberMedia(mediaRequest(range), { slug: "members-only", kind: "video" }, gatewayDependencies({
        authorizePost: async () => { dependencyCalled = true; return mediaPost; },
      }));
      assert.equal(response.status, 416);
      assert.equal(dependencyCalled, false);
    });
  }
});

test("an unsatisfied upstream range returns 416 with a safe Content-Range", async () => {
  const response = await serveSubscriberMedia(mediaRequest("bytes=2000-"), { slug: "members-only", kind: "video" }, gatewayDependencies({
    fetchUpstream: async () => new Response(null, { status: 416, headers: { "Content-Range": "bytes */1000" } }),
  }));
  assert.equal(response.status, 416);
  assert.equal(response.headers.get("content-range"), "bytes */1000");
  assert.equal(response.headers.get("accept-ranges"), "bytes");
});

test("a range ignored by storage fails closed and cancels the full upstream body", async () => {
  let canceled = false;
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array([1, 2, 3])); },
    cancel() { canceled = true; },
  });
  const response = await serveSubscriberMedia(mediaRequest("bytes=0-"), { slug: "members-only", kind: "video" }, gatewayDependencies({
    fetchUpstream: async () => new Response(body, { status: 200, headers: { "Content-Type": "video/mp4" } }),
  }));
  assert.equal(response.status, 502);
  assert.equal(canceled, true);
});

test("anonymous, unsubscribed, and blocked media requests fail before signing", async (context) => {
  const cases: Array<[string, MemberAccessState]> = [
    ["anonymous", memberState({ authenticated: false, subscriptionActive: false })],
    ["without subscription", memberState({ subscriptionActive: false, subscriptionStatus: "inactive" })],
    ["blocked", memberState({ accountBlocked: true })],
  ];
  for (const [label, state] of cases) {
    await context.test(label, async () => {
      let signed = false;
      const response = await serveSubscriberMedia(mediaRequest(), { slug: "members-only", kind: "video" }, gatewayDependencies({
        authorizePost: async () => evaluateMemberAccessPolicy(state).allowed ? mediaPost : null,
        createSignedUrl: async () => { signed = true; return "https://storage.example/should-not-run"; },
      }));
      assert.equal(response.status, 404);
      assert.equal(signed, false);
    });
  }
});

test("active subscriber bytes and admin draft preview use the same protected gateway", async () => {
  const subscriber = await serveSubscriberMedia(mediaRequest(), { slug: "members-only", kind: "video" }, gatewayDependencies({
    authorizePost: async () => evaluateMemberAccessPolicy(memberState()).allowed ? mediaPost : null,
  }));
  assert.equal(subscriber.status, 200);
  assert.deepEqual(new Uint8Array(await subscriber.arrayBuffer()), new Uint8Array([1, 2, 3]));

  let adminPreview = false;
  const admin = await serveSubscriberMedia(mediaRequest(undefined, true), { slug: "draft-post", kind: "video" }, gatewayDependencies({
    authorizePost: async (_slug, preview) => { adminPreview = preview; return preview ? mediaPost : null; },
  }));
  assert.equal(adminPreview, true);
  assert.equal(admin.status, 200);
});

test("foreign paths and authorization or storage failures fail closed", async (context) => {
  const foreignPost = { ...mediaPost, video_path: `posts/223e4567-e89b-42d3-a456-426614174000/video/${mediaObjectId}.mp4` };
  const cases: Array<[string, Partial<SubscriberMediaGatewayDependencies>]> = [
    ["foreign path", { authorizePost: async () => foreignPost }],
    ["authorization error", { authorizePost: async () => { throw new Error("database unavailable"); } }],
    ["signing error", { createSignedUrl: async () => null }],
    ["storage error", { fetchUpstream: async () => { throw new Error("storage unavailable"); } }],
  ];
  for (const [label, overrides] of cases) {
    await context.test(label, async () => {
      const response = await serveSubscriberMedia(mediaRequest(), { slug: "members-only", kind: "video" }, gatewayDependencies(overrides));
      assert.equal(response.status, 404);
      assert.equal(await response.text(), "");
    });
  }
});

test("the Next route wires real authorization and server-only signing into the tested gateway", async () => {
  const [route, resolver, nextConfig] = await Promise.all([
    readFile(new URL("../src/app/subscriber/media/[slug]/[kind]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/subscriber-content/media.ts", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /serveSubscriberMedia\(request/);
  assert.match(route, /evaluateMemberAccess\(state\)\.allowed/);
  assert.match(route, /state\.roles\.includes\("admin"\)/);
  assert.match(route, /getPublishedSubscriberPost\(slug\)/);
  assert.match(route, /listAdminSubscriberPosts\(\)/);
  assert.match(route, /resolve_subscriber_media_path/);
  assert.match(route, /p_post_id: id/);
  assert.match(route, /p_slug: slug/);
  assert.match(route, /p_kind: kind/);
  assert.match(route, /p_allow_draft: allowDraft/);
  assert.match(route, /createSignedUrl\(path, expiresIn\)/);
  assert.doesNotMatch(resolver, /createSignedUrl|signedUrl/);
  assert.match(nextConfig, /source:\s*"\/subscriber\/:path\*"/);
  assert.match(nextConfig, /Cache-Control.*private, no-store/);
});

test("a missing private image safely renders no image without a fallback", () => {
  assert.equal(preferredSubscriberImageSource(null, null), null);
});

test("subscriber detail prefers one content image with a cover fallback", () => {
  assert.equal(subscriberDetailImageSource("content-signed-url", "cover-signed-url"), "content-signed-url");
  assert.equal(subscriberDetailImageSource(null, "cover-signed-url"), "cover-signed-url");
  assert.equal(subscriberDetailImageSource(null, null), null);
});

test("supported YouTube URLs normalize to the privacy-enhanced but external embed origin", () => {
  assert.deepEqual(normalizeSubscriberExternalMedia("embed", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"), { kind: "embed", provider: "YouTube", protection: "external", url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
});

test("public YouTube cards build a short muted hover preview without affecting other providers", () => {
  const preview = getYouTubeHoverPreviewUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.ok(preview);
  const url = new URL(preview);
  assert.equal(url.origin, "https://www.youtube-nocookie.com");
  assert.equal(url.searchParams.get("autoplay"), "1");
  assert.equal(url.searchParams.get("mute"), "1");
  assert.equal(url.searchParams.get("controls"), "0");
  assert.equal(url.searchParams.get("disablekb"), "1");
  assert.equal(url.searchParams.get("enablejsapi"), "1");
  assert.equal(url.searchParams.get("fs"), "0");
  assert.equal(url.searchParams.get("start"), "12");
  assert.equal(url.searchParams.get("end"), "24");
  assert.equal(getYouTubeHoverPreviewUrl("https://rumble.com/example"), null);
});

test("public video collection uses a scalable card grid and interaction-gated previews", async () => {
  const [collection, hoverPreview, css] = await Promise.all([
    readFile(new URL("../src/components/video/public-video-collection.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/video/video-hover-preview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(collection, /videos\.map/);
  assert.match(collection, /platform-video-grid/);
  assert.match(collection, /Videos &amp; Livestreams/);
  assert.match(collection, /Clips &amp; Shorts/);
  assert.match(collection, /shorts\?\|clips\?/);
  assert.match(collection, /video\.category/);
  assert.match(css, /platform-video-group-nav/);
  assert.match(css, /platform-video-group-empty/);
  assert.doesNotMatch(collection, /platform-featured-video|platform-video-row/);
  assert.match(hoverPreview, /^"use client"/);
  assert.match(hoverPreview, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(hoverPreview, /prefers-reduced-motion: reduce/);
  assert.match(hoverPreview, /onMouseMove=\{queuePreview\}/);
  assert.match(hoverPreview, /window\.setTimeout[\s\S]*400/);
  assert.match(hoverPreview, /active && previewUrl/);
  assert.match(hoverPreview, /playerState === 1/);
  assert.match(hoverPreview, /playing \? " is-ready"/);
  assert.doesNotMatch(hoverPreview, /Hover to preview|Preview playing|preview-hint/);
  assert.match(css, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
});

test("supported Vimeo URLs normalize to the trusted player origin", () => {
  assert.deepEqual(normalizeSubscriberExternalMedia("embed", "https://vimeo.com/76979871"), { kind: "embed", provider: "Vimeo", protection: "external", url: "https://player.vimeo.com/video/76979871" });
});

test("direct HTTPS video is accepted only as explicitly external media", () => {
  assert.deepEqual(normalizeSubscriberExternalMedia("video", "https://cdn.example.com/video.mp4"), { kind: "video", protection: "external", url: "https://cdn.example.com/video.mp4" });
});

test("arbitrary embed providers and non-HTTPS direct videos are rejected", () => {
  assert.equal(normalizeSubscriberExternalMedia("embed", "https://example.com/embed/video"), null);
  assert.equal(normalizeSubscriberExternalMedia("video", "http://cdn.example.com/video.mp4"), null);
});

test("draft preview is admin-only while subscriber draft visibility remains closed", async () => {
  assert.equal(findPublishedSubscriberPost([draft], "draft"), null);
  const source = await readFile(new URL("../src/app/admin/subscriber-content/[id]/preview/page.tsx", import.meta.url), "utf8");
  const guard = source.indexOf("await requireRealAdmin(");
  const query = source.indexOf("await getAdminSubscriberPost(id)");
  assert.ok(guard >= 0 && guard < query);
  assert.match(source, /if \(!authorization\.allowed\) notFound\(\)/);
});

test("text edits do not submit or clear private image paths", async () => {
  const source = await readFile(new URL("../src/app/admin/subscriber-content/actions.ts", import.meta.url), "utf8");
  const start = source.indexOf("export async function updateSubscriberPostAction");
  const end = source.indexOf("\nexport async function ", start + 1);
  const updateAction = source.slice(start, end);
  assert.doesNotMatch(updateAction, /p_(cover|content)_image_path/);
  assert.doesNotMatch(updateAction, /admin_set_subscriber_post_image_path/);
});
