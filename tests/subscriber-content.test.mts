import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { SubscriberPostDetail } from "../src/lib/subscriber-content/model.ts";
import { getYouTubeHoverPreviewUrl } from "../src/lib/cms/video-links.ts";
import { normalizeSubscriberExternalMedia, subscriberPostErrorMessage, slugifySubscriberPostTitle } from "../src/lib/subscriber-content/validation.ts";
import { findPublishedSubscriberPost, publishedSubscriberPosts } from "../src/lib/subscriber-content/visibility.ts";
import { isSafeSubscriberMediaPath, preferredSubscriberImageSource, subscriberDetailImageSource, SUBSCRIBER_IMAGE_MAX_BYTES, validateSubscriberImageFile, validateSubscriberImageMetadata } from "../src/lib/subscriber-content/media-policy.ts";

const published: SubscriberPostDetail = { id: "published", title: "Published", slug: "published", excerpt: null, body: "Safe text", cover_image_url: null, cover_image_path: null, content_image_path: null, media_url: null, media_type: null, status: "published", published_at: "2026-08-03T00:00:00Z" };
const draft: SubscriberPostDetail = { ...published, id: "draft", title: "Draft", slug: "draft", status: "draft", published_at: null };

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

test("media mutations authorize before storage access", async () => {
  const source = await readFile(new URL("../src/app/admin/subscriber-content/actions.ts", import.meta.url), "utf8");
  for (const actionName of ["uploadSubscriberPostImageAction", "removeSubscriberPostImageAction"]) {
    const start = source.indexOf(`export async function ${actionName}`);
    const end = source.indexOf("\nexport async function ", start + 1);
    const action = source.slice(start, end < 0 ? undefined : end);
    assert.ok(action.indexOf("await authorize()") >= 0 && action.indexOf("await authorize()") < action.indexOf(".storage.from"));
  }
});

test("subscriber image signing remains after the canonical page guard", async () => {
  for (const path of ["src/app/subscriber/page.tsx", "src/app/subscriber/[slug]/page.tsx"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.ok(source.indexOf("await requireSubscriberAccess()") < source.indexOf("await resolveSubscriberPost"));
  }
});

test("a missing private image safely renders no image without a fallback", () => {
  assert.equal(preferredSubscriberImageSource(null, null), null);
});

test("subscriber detail prefers one content image with a cover fallback", () => {
  assert.equal(subscriberDetailImageSource("content-signed-url", "cover-signed-url"), "content-signed-url");
  assert.equal(subscriberDetailImageSource(null, "cover-signed-url"), "cover-signed-url");
  assert.equal(subscriberDetailImageSource(null, null), null);
});

test("supported YouTube URLs normalize to the privacy-enhanced embed origin", () => {
  assert.deepEqual(normalizeSubscriberExternalMedia("embed", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"), { kind: "embed", provider: "YouTube", url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
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
  assert.doesNotMatch(collection, /platform-featured-video|platform-video-row/);
  assert.match(hoverPreview, /^"use client"/);
  assert.match(hoverPreview, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(hoverPreview, /prefers-reduced-motion: reduce/);
  assert.match(hoverPreview, /onMouseEnter=\{startPreview\}/);
  assert.match(hoverPreview, /active && previewUrl/);
  assert.doesNotMatch(hoverPreview, /Hover to preview|Preview playing|preview-hint/);
  assert.match(css, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
});

test("supported Vimeo URLs normalize to the trusted player origin", () => {
  assert.deepEqual(normalizeSubscriberExternalMedia("embed", "https://vimeo.com/76979871"), { kind: "embed", provider: "Vimeo", url: "https://player.vimeo.com/video/76979871" });
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
