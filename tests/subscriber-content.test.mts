import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { SubscriberPostDetail } from "../src/lib/subscriber-content/model.ts";
import { subscriberPostErrorMessage, slugifySubscriberPostTitle } from "../src/lib/subscriber-content/validation.ts";
import { findPublishedSubscriberPost, publishedSubscriberPosts } from "../src/lib/subscriber-content/visibility.ts";

const published: SubscriberPostDetail = { id: "published", title: "Published", slug: "published", excerpt: null, body: "Safe text", cover_image_url: null, media_url: null, media_type: null, status: "published", published_at: "2026-08-03T00:00:00Z" };
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
