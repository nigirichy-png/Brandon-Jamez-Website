import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { moderationErrorMessage, parseModerationCaseInput, parseModerationStatus } from "../src/lib/moderation/validation.ts";

test("moderation case input is normalized and validated", () => {
  const form = new FormData();
  form.set("title", "  Context review  ");
  form.set("sourceType", " Internal submission ");
  form.set("category", " Safety ");
  form.set("severity", "high");
  form.set("summary", " Review the submitted context. ");
  form.set("evidenceReference", " REF-42 ");
  assert.deepEqual(parseModerationCaseInput(form), {
    ok: true,
    value: {
      title: "Context review",
      sourceType: "Internal submission",
      category: "Safety",
      severity: "high",
      summary: "Review the submitted context.",
      evidenceReference: "REF-42",
    },
  });
  form.set("severity", "critical");
  assert.equal(parseModerationCaseInput(form).ok, false);
});

test("moderation status changes accept only allowlisted states and bounded notes", () => {
  const form = new FormData();
  form.set("status", "escalated");
  form.set("note", " Administrator context required. ");
  assert.deepEqual(parseModerationStatus(form), { status: "escalated", note: "Administrator context required." });
  form.set("status", "deleted");
  assert.equal(parseModerationStatus(form), null);
  assert.match(moderationErrorMessage("stale_moderation_case_version"), /changed after the page loaded/i);
});

test("moderation migration provides role-checked CRUD, history and audit surfaces", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202608070011_moderation_workflow.sql", import.meta.url), "utf8");
  assert.match(migration, /create function private\.is_active_moderator\(\)[\s\S]*role in \('moderator'.*'admin'/);
  assert.match(migration, /create table public\.moderation_cases/);
  assert.match(migration, /create table public\.moderation_case_status_history/);
  for (const rpc of ["moderator_list_cases", "moderator_list_case_history", "moderator_create_case", "moderator_update_case", "moderator_set_case_assignment", "moderator_set_case_status", "moderator_delete_case"]) {
    assert.match(migration, new RegExp(`create function public\\.${rpc}\\(`));
  }
  assert.match(migration, /stale_moderation_case_version/);
  assert.match(migration, /moderation_case_already_assigned/);
  assert.match(migration, /archived_moderation_case_required/);
  assert.match(migration, /moderation\.case_status_changed/);
  assert.match(migration, /target_type in \('account', 'profile', 'cms_video', 'subscriber_post', 'moderation_case'\)/);
  assert.match(migration, /revoke all on table public\.moderation_cases from public, anon, authenticated, service_role/);
  assert.match(migration, /grant execute on function public\.moderator_list_cases\(\) to authenticated/);
});

test("moderator pages use the persistent source and never import mock review records", async () => {
  const [overview, review, actions] = await Promise.all([
    readFile(new URL("../src/app/mod/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/mod/review/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/mod/review/actions.ts", import.meta.url), "utf8"),
  ]);
  assert.match(overview, /listModerationCases/);
  assert.match(review, /listModerationCaseHistory/);
  assert.doesNotMatch(`${overview}\n${review}`, /moderationReviewItems|MockActionGroup/);
  assert.match(actions, /requireRealModerator\("\/mod\/review"\)/);
  assert.ok(actions.indexOf("await authorize()") < actions.indexOf('supabase.rpc("moderator_create_case"'));
});
