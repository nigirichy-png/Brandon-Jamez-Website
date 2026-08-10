import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { cmsEventErrorMessage, parseCmsEventInput } from "../src/lib/events/validation.ts";

test("event input is normalized and bounded", () => {
  const form = new FormData();
  form.set("title", "  Pattaya meetup  ");
  form.set("description", "  Subscriber Q&A  ");
  form.set("location", "  Central Pattaya  ");
  form.set("startsAt", "2026-09-10T18:30");
  const result = parseCmsEventInput(form);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.title, "Pattaya meetup");
    assert.equal(result.value.description, "Subscriber Q&A");
    assert.equal(result.value.location, "Central Pattaya");
    assert.equal(Number.isFinite(Date.parse(result.value.startsAt)), true);
  }
  form.set("startsAt", "not-a-date");
  assert.equal(parseCmsEventInput(form).ok, false);
  assert.match(cmsEventErrorMessage("stale_event_version"), /changed after the page loaded/i);
});

test("migration enforces viewer and editor roles separately", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202608070012_content_operations_and_events.sql", import.meta.url), "utf8");
  const viewer = migration.match(/create function private\.is_active_content_viewer\(\)[\s\S]*?\$\$;/)?.[0] ?? "";
  const editor = migration.match(/create function private\.is_active_content_editor\(\)[\s\S]*?\$\$;/)?.[0] ?? "";
  assert.match(viewer, /'moderator'::public\.app_role/);
  assert.match(viewer, /'content_manager'::public\.app_role/);
  assert.match(viewer, /'admin'::public\.app_role/);
  assert.doesNotMatch(viewer, /'subscriber'::public\.app_role/);
  assert.match(editor, /'content_manager'::public\.app_role/);
  assert.match(editor, /'admin'::public\.app_role/);
  assert.doesNotMatch(editor, /'moderator'::public\.app_role|'subscriber'::public\.app_role/);
  assert.match(migration, /cms_videos_select_active_content_viewer[\s\S]*is_active_content_viewer/);
  assert.match(migration, /cms_events_select_active_content_viewer[\s\S]*is_active_content_viewer/);
  assert.match(migration, /revoke all on table public\.cms_events from public, anon, authenticated, service_role/);
});

test("every content mutation RPC repeats editor authorization, versions, and audit", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202608070012_content_operations_and_events.sql", import.meta.url), "utf8");
  const mutations = [
    "content_create_cms_video", "content_update_cms_video", "content_set_cms_video_publication",
    "content_set_cms_video_featured", "content_reorder_cms_video", "content_delete_cms_video",
    "content_create_cms_event", "content_update_cms_event", "content_set_cms_event_publication",
    "content_set_cms_event_archived", "content_delete_cms_event",
  ];
  for (const rpc of mutations) {
    const start = migration.indexOf(`create function public.${rpc}(`);
    assert.ok(start >= 0, `${rpc} must exist`);
    const next = migration.indexOf("create function ", start + 20);
    const body = migration.slice(start, next >= 0 ? next : undefined);
    assert.match(body, /private\.is_active_content_editor\(\)/, `${rpc} must enforce the editor role`);
  }
  assert.match(migration, /stale_video_version/);
  assert.match(migration, /stale_event_version/);
  for (const action of ["cms.video_created", "cms.video_deleted", "cms.event_created", "cms.event_deleted"]) {
    assert.match(migration, new RegExp(action.replace(".", "\\.")));
  }
});

test("real content pages use Supabase and moderators receive read-only records", async () => {
  const paths = ["src/app/content/page.tsx", "src/app/content/videos/page.tsx", "src/app/content/events/page.tsx"];
  const pages = await Promise.all(paths.map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")));
  assert.match(pages[0], /listStaffCmsVideos/);
  assert.match(pages[0], /listStaffCmsEvents/);
  assert.match(pages[1], /readOnly=\{!canEdit\}/);
  assert.match(pages[2], /readOnly=\{!canEdit\}/);
  assert.doesNotMatch(pages.join("\n"), /videoContentRecords|eventManagementRecords|MockActionGroup/);
});

test("server actions authorize before invoking mutation RPCs", async () => {
  const [videoActions, eventActions, access] = await Promise.all([
    readFile(new URL("../src/app/admin/content/videos/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/content/events/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/content/access.ts", import.meta.url), "utf8"),
  ]);
  assert.match(access, /state\.roles\.includes\("content_manager"\) \|\| state\.roles\.includes\("admin"\)/);
  assert.doesNotMatch(access, /roles\.includes\("moderator"\)/);
  assert.match(videoActions, /requireRealContentEditor/);
  assert.match(eventActions, /requireRealContentEditor/);
  assert.ok(videoActions.indexOf("await authorize()") < videoActions.indexOf('supabase.rpc("content_create_cms_video"'));
  assert.ok(eventActions.indexOf("await authorize()") < eventActions.indexOf('supabase.rpc("content_create_cms_event"'));
});

test("public events use only the published event RPC", async () => {
  const [page, data] = await Promise.all([
    readFile(new URL("../src/app/events/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/events/data.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /listPublishedCmsEvents/);
  assert.match(data, /list_published_cms_events/);
  assert.doesNotMatch(`${page}\n${data}`, /eventManagementRecords|upcomingEvents/);
});
