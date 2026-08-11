import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createBunnyHlsTokenUrl, createBunnyTusSignature, verifyBunnyWebhookSignature } from "../src/lib/bunny/signing.ts";
import { BUNNY_MAX_UPLOAD_BYTES, validBunnyUploadInput } from "../src/lib/bunny/validation.ts";

const videoId = "657bb740-a71b-4529-a012-528021c31a92";

test("Bunny TUS signature is video-scoped and deterministic", () => {
  const expected = createHash("sha256").update(`123secret1700000000${videoId}`).digest("hex");
  assert.equal(createBunnyTusSignature("123", "secret", 1_700_000_000, videoId), expected);
});

test("Bunny webhook verification uses the exact raw body", () => {
  const body = `{"VideoLibraryId":123,"VideoGuid":"${videoId}","Status":4}`;
  const signature = createHmac("sha256", "read-only-key").update(body).digest("hex");
  assert.equal(verifyBunnyWebhookSignature(body, signature, "read-only-key"), true);
  assert.equal(verifyBunnyWebhookSignature(`${body}\n`, signature, "read-only-key"), false);
});

test("Bunny HLS token covers the whole video directory", () => {
  const url = createBunnyHlsTokenUrl("example.b-cdn.net", "token-key", videoId, 1_700_000_000);
  assert.match(url, /^https:\/\/example\.b-cdn\.net\/bcdn_token=HS256-[A-Za-z0-9_-]+&token_path=%2F/);
  assert.match(url, new RegExp(`&expires=1700000000/${videoId}/playlist\\.m3u8$`));
  assert.equal(url.includes("token-key"), false);
});

test("large upload validation accepts multi-GB video metadata but rejects oversized or unsafe input", () => {
  const base = { title: "Private video", description: "Standalone member video", fileName: "video.mp4", fileSize: 5 * 1024 ** 3, mimeType: "video/mp4" };
  assert.equal(validBunnyUploadInput(base), true);
  assert.equal(validBunnyUploadInput({ ...base, fileSize: BUNNY_MAX_UPLOAD_BYTES + 1 }), false);
  assert.equal(validBunnyUploadInput({ ...base, title: "bad\nvalue" }), false);
});

test("standalone subscriber videos are detached from posts and keep provider references server-only", async () => {
  const [migration, auditTargetMigration, auditReferenceMigration, subscriberPage, subscriberVideoPage, subscriberVideoCard, adminPage, globalStyles] = await Promise.all([
    readFile(new URL("../supabase/migrations/202608070015_standalone_subscriber_videos.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202608070016_subscriber_video_audit_target.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202608070017_subscriber_video_audit_reference.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/app/subscriber/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/subscriber/videos/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/subscriber/subscriber-video-card.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/admin/subscriber-content/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /update private\.subscriber_bunny_videos set post_id = null/);
  assert.match(migration, /list_published_subscriber_bunny_videos/);
  assert.match(migration, /resolve_subscriber_bunny_video\(p_video_id uuid, p_slug text/);
  assert.match(auditTargetMigration, /'subscriber_video'/);
  assert.match(auditReferenceMigration, /target_type in \([^)]*'subscriber_video'/);
  assert.match(subscriberPage, /Member videos/);
  assert.match(subscriberPage, /Subscriber-only videos/);
  assert.doesNotMatch(subscriberPage, /Private Storage files require/);
  assert.match(subscriberPage, /SubscriberVideoCard/);
  assert.match(subscriberVideoPage, /BunnyHlsPlayer/);
  assert.match(subscriberVideoPage, /Subscriber-only content/);
  assert.match(subscriberVideoPage, /platform-subscriber-content-notice/);
  assert.match(subscriberVideoCard, /onMouseEnter/);
  assert.match(subscriberVideoCard, /muted loop playsInline/);
  assert.match(subscriberVideoCard, /startLevel: 0/);
  assert.match(subscriberVideoCard, /\?asset=poster/);
  assert.match(adminPage, /BunnyVideoManager videos=/);
  assert.match(globalStyles, /@media \(max-width: 480px\)/);
  assert.match(globalStyles, /\.platform-subscriber-video-player/);
});

test("Bunny integration keeps video bytes off the application and enforces role boundaries", async () => {
  const [migration, uploadRoute, playbackRoute, webhookRoute, uploader, player, env] = await Promise.all([
    readFile(new URL("../supabase/migrations/202608070014_bunny_stream_vod.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/admin/bunny/videos/upload/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/subscriber/bunny/[slug]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/webhooks/bunny/stream/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/admin/bunny-video-manager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/video/bunny-hls-player.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);
  assert.match(uploadRoute, /roles\.includes\("admin"\)/);
  assert.doesNotMatch(uploadRoute, /request\.formData\(|\.arrayBuffer\(\)/);
  assert.match(uploader, /video\.bunnycdn\.com\/tusupload|credentials\.endpoint/);
  assert.match(uploader, /50 \* 1024 \* 1024/);
  assert.match(player, /import\("hls\.js"\)/);
  assert.match(player, /Video quality/);
  assert.match(playbackRoute, /createSignedBunnyHlsPlayback/);
  assert.match(playbackRoute, /NextResponse\.redirect\(await createSignedBunnyPoster/);
  assert.ok(player.indexOf("Hls.isSupported()") < player.indexOf('video.canPlayType("application/vnd.apple.mpegurl")'));
  assert.match(playbackRoute, /evaluateMemberAccess/);
  assert.match(playbackRoute, /resolve_subscriber_bunny_video/);
  assert.match(webhookRoute, /verifyBunnyWebhook/);
  assert.match(migration, /auth\.role\(\).*service_role/s);
  assert.match(migration, /has_bunny_video boolean/);
  assert.match(migration, /revoke all on table private\.subscriber_bunny_videos/);
  assert.doesNotMatch(env, /NEXT_PUBLIC_BUNNY/);
});

test("public Bunny uploads stay editor-only while published playback exposes no provider identifier", async () => {
  const [migration, uploadRoute, mutationRoute, playbackRoute, manager, videoPage, webhook] = await Promise.all([
    readFile(new URL("../supabase/migrations/202608110001_public_bunny_videos.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/content/bunny/videos/upload/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/content/bunny/videos/[videoId]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/videos/bunny/[videoId]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/content/public-bunny-video-manager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/videos/watch/[videoId]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/webhooks/bunny/stream/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /create table private\.public_bunny_videos/);
  assert.match(migration, /private\.is_active_content_editor\(\)/);
  assert.match(migration, /list_published_public_bunny_videos/);
  assert.match(migration, /resolve_public_bunny_video/);
  assert.match(migration, /revoke all on table private\.public_bunny_videos/);
  assert.doesNotMatch(migration.match(/create function public\.list_published_public_bunny_videos[\s\S]*?\$\$;/)?.[0] ?? "", /provider_video_id/);
  assert.match(uploadRoute, /content_manager/);
  assert.doesNotMatch(uploadRoute, /request\.formData\(|\.arrayBuffer\(\)/);
  assert.match(mutationRoute, /deleteBunnyVideo/);
  assert.match(playbackRoute, /resolve_public_bunny_video/);
  assert.match(playbackRoute, /createSignedBunnyHlsPlayback/);
  assert.match(manager, /Upload a public video to Bunny/);
  assert.match(manager, /tus\.Upload/);
  assert.match(videoPage, /No subscription or member account is required/);
  assert.match(webhook, /service_update_public_bunny_video_status/);
});
