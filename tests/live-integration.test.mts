import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

test("live playback never introduces a website video proxy", async () => {
  const player = await read("src/components/live/live-player.tsx");
  const page = await read("src/app/live/page.tsx");
  assert.match(player, /youtube-nocookie\.com\/embed/);
  assert.match(player, /external streaming provider adapter/);
  assert.doesNotMatch(`${player}\n${page}`, /supabase\.storage|\/api\/.*(?:hls|video|stream)/i);
});

test("migration enforces roles, privacy, realtime, rate limits and audit", async () => {
  const migration = await read("supabase/migrations/202608070013_live_stream_and_chat.sql");
  assert.match(migration, /private\.is_active_admin\(\)/);
  assert.match(migration, /private\.is_active_moderator\(\)/);
  assert.match(migration, /alter publication supabase_realtime add table public\.live_chat_messages/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /interval '2 seconds'/);
  assert.match(migration, /20/);
  assert.match(migration, /private\.live_chat_authors/);
  assert.doesNotMatch(migration.match(/create table public\.live_chat_messages[\s\S]*?\);/)?.[0] ?? "", /user_id/);
  assert.match(migration, /staff_account_protected/);
  assert.match(migration, /record_youtube_moderation_action/);
});

test("moderators cannot invoke stream configuration actions", async () => {
  const actions = await read("src/app/mod/live/actions.ts");
  const migration = await read("supabase/migrations/202608070013_live_stream_and_chat.sql");
  assert.match(actions, /authorize\(true\)/);
  assert.match(migration, /create function public\.admin_configure_live_session[\s\S]*?private\.is_active_admin\(\)/);
  assert.match(migration, /create function public\.admin_set_live_status[\s\S]*?private\.is_active_admin\(\)/);
});

test("YouTube moderation stays server-side and is audited", async () => {
  const service = await read("services/youtube-live/server.mjs");
  const gateway = await read("src/lib/youtube-live/gateway.ts");
  const route = await read("src/app/api/mod/live/youtube/route.ts");
  assert.match(service, /createLiveChatStreamManager/);
  assert.match(service, /createYouTubeLiveChatStreamTransport/);
  assert.match(service, /state\.eligibleMessages\.has/);
  assert.match(service, /state\.eligibleUsers\.has/);
  assert.match(gateway, /createHmac/);
  assert.match(route, /active_moderator_required/);
  assert.match(route, /record_youtube_moderation_action/);
  assert.match(route, /input\.action === "send" && !access\.admin/);
});

test("moderation live page exposes the transferred Hub workspace without weakening roles", async () => {
  const page = await read("src/app/mod/live/page.tsx");
  const panel = await read("src/components/live/youtube-moderation-panel.tsx");
  const styles = await read("src/components/live/youtube-moderation-panel.module.css");
  const shell = await read("src/components/live/moderation-hub-shell.tsx");
  assert.match(page, /YouTubeModerationPanel/);
  assert.match(page, /canSend=\{isAdmin\}/);
  assert.match(page, /canModerate/);
  assert.match(panel, /Stream monitor/);
  assert.match(panel, /Recent Actions/);
  assert.match(panel, /Search YouTube chat/);
  assert.match(panel, /"delete" \| "timeout" \| "hide" \| "send"/);
  assert.match(panel, /canSend \?/);
  assert.match(panel, /youtube-nocookie\.com\/embed/);
  assert.match(styles, /grid-template-columns: minmax\(30rem, 1\.58fr\) minmax\(23rem, 1fr\)/);
  assert.match(shell, /Brandon Moderation Hub/);
  assert.match(shell, /Recorder: Independent/);
});

test("Website Hub includes the original production moderation controls", async () => {
  const panel = await read("src/components/live/youtube-moderation-panel.tsx");
  const overlays = await read("src/components/live/youtube-hub-overlays.tsx");
  const page = await read("src/app/mod/live/page.tsx");
  for (const feature of ["Load stream", "Go Live", "YouTube Studio", "ModeratorActivity", "Jump to latest", "Recent Actions", "Mention", "UserDetailsPanel", "Pause chat", "Mobile Hub view"]) assert.match(panel.toLowerCase(), new RegExp(feature.toLowerCase()));
  assert.match(panel, /Ban user/);
  for (const seconds of [10, 30, 60, 300, 600, 1800]) assert.match(panel, new RegExp(`\\[${seconds},`));
  assert.match(overlays, /Moderator note/);
  assert.match(overlays, /Recent messages/);
  assert.match(overlays, /Prior moderation/);
  assert.match(overlays, /Open YouTube channel/);
  assert.match(page, /canSelectStream/);
  assert.doesNotMatch(panel, /\/api\/mod\/live\/session/);
});

test("tested Moderation Hub live-edge player is reused without behavior changes", async () => {
  const original = await readFile(new URL("src/utils/youtubeLivePlayer.js", "file:///C:/Projekte/Brandon-Moderation-Hub/"), "utf8");
  const website = await read("src/lib/youtube-live/vendor/youtubeLivePlayer.js");
  assert.equal(website.replaceAll("\r\n", "\n").trimEnd(), original.replaceAll("\r\n", "\n").trimEnd());
});

test("public Hub preview is anonymous-read-only, staff-aware and launch-switchable", async () => {
  const page = await read("src/app/moderation-hub/page.tsx");
  const route = await read("src/app/api/live/youtube/route.ts");
  const switcher = await read("src/lib/live/moderation-hub-preview.ts");
  assert.match(page, /canModerate=\{staffAccess\}/);
  assert.match(page, /canSend=\{isAdmin\}/);
  assert.match(page, /endpoint=\{staffAccess \? "\/api\/mod\/live\/youtube" : "\/api\/live\/youtube"\}/);
  assert.match(page, /canSelectStream=\{staffAccess\}/);
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function POST/);
  assert.doesNotMatch(route, /export async function DELETE/);
  assert.match(route, /session\.youtubeVideoId !== videoId/);
  assert.match(switcher, /MODERATION_HUB_PUBLIC_PREVIEW_ENABLED === "true"/);
});

test("tested Moderation Hub core is reused without business-logic changes", async () => {
  const copies = [
    ["server/services/liveChatStreamManager.js", "services/youtube-live/vendor/liveChatStreamManager.mjs"],
    ["server/services/liveChatModerationState.js", "services/youtube-live/vendor/liveChatModerationState.mjs"],
    ["server/services/youtubeLiveChatStream.js", "services/youtube-live/vendor/youtubeLiveChatStream.mjs"],
    ["server/services/youtubeReadRateLimitGuard.js", "services/youtube-live/vendor/youtubeReadRateLimitGuard.mjs"],
    ["server/services/youtubeReadRateLimitStore.js", "services/youtube-live/vendor/youtubeReadRateLimitStore.mjs"],
    ["server/services/youtube.js", "services/youtube-live/vendor/youtube.mjs"],
    ["server/services/tokenStore.js", "services/youtube-live/vendor/tokenStore.mjs"],
  ];
  for (const [hubPath, websitePath] of copies) {
    const original = await readFile(new URL(hubPath, "file:///C:/Projekte/Brandon-Moderation-Hub/"), "utf8");
    const expected = original.replaceAll(".js'", ".mjs'").replaceAll(".js\"", ".mjs\"").replaceAll("../logger.mjs", "./logger.mjs").replaceAll("../errors.mjs", "./errors.mjs").replaceAll("\r\n", "\n");
    assert.equal((await read(websitePath)).replaceAll("\r\n", "\n").trimEnd(), expected.trimEnd());
  }
});
