# Homepage live edit

Persisted inline editing for the homepage. An administrator edits the real page
in place, saves a private draft, and publishes it when it is ready. Visitors see
the published document; nobody else sees the draft.

The editor UI itself already existed. What this adds is persistence: storage,
authorization, sanitization, and the render path that lets stored content reach
an anonymous visitor.

## Draft and published

Each route has at most two rows in `public.site_page_content`: one `draft` and
one `published`.

| Action | Effect |
| --- | --- |
| Save draft | Replaces the draft. Public pages are unchanged. |
| Publish | Copies the draft into the published row. Visitors see it on the next render. |
| Discard draft | Removes the draft only. Published content is deliberately untouched, so a mistaken discard cannot take the live page down. |

Editors resolve their own draft on the live homepage, so the page doubles as the
draft preview. Everyone else resolves the published document.

## Security boundaries

A stored document is replayed into public HTML, so it is treated as untrusted
input at every hop — including on the way back out of storage.

- **Authorization is repeated, never inherited.** The Server Actions revalidate
  the Supabase user and the `admin` role; the database RPCs repeat the check
  through `private.is_active_admin()` under RLS. Being able to reach a route or
  see a button is never what grants access.
- **The client snapshot is never trusted.** `sanitizeHomepageDocument()` rebuilds
  a known-good snapshot field by field and drops everything it does not
  recognize: unknown target ids, unknown style keys, out-of-range numbers, unsafe
  URLs, non-`#rrggbb` colours, and any layout placement the editor's own
  `canPlaceLayoutNode()` rule would reject.
- **Layout structure comes from code, not from the document.** Node types,
  allowed children and immutability are always taken from
  `createDefaultLayoutTree()`. Only per-breakpoint styling, placements and
  explicitly generated containers are read from storage.
- **Text stays text.** Content is normalized to plain characters and bounded;
  there is no HTML path and no `dangerouslySetInnerHTML`.
- **A broken document degrades, it does not break the page.** Unreadable or
  newer-schema documents fall back to the content shipped in the route
  component, and every storage read fails closed.

## Rendering

`HomepageEditor` renders a read-only context provider for every visitor, seeded
with the published document and fixed to `active: false` and `mode: "content"`.
Without that provider the editable components resolve nothing and fall back to
their `defaultValue` props, which is what they did before this feature existed.

The homepage stays statically renderable. Only the published document is read
during the page render, through the anonymous key and a cached RPC. Authorized
browsers fetch their draft separately from `/api/staff/site-content/homepage`,
which is `no-store` and role-checked.

### What persists to the public page

Element content and styling persist in full: text, link text and targets, image
source and alt text, media URLs, provider labels, typography, spacing, colours,
alignment, sizing, and element and block visibility.

Two things remain preview-only for now, because both require the public page to
render the layout tree rather than the hand-written JSX in `src/app/page.tsx`:

- drag-and-drop layout moves
- block-level container styling such as block padding and background

Hiding a block is honoured publicly; its other block-level styles are not. The
editor's block wrapper carries its own sizing rules, so emitting it publicly
would shift the layout of pages nobody has edited.

## Development without Supabase

With no Supabase configuration and a non-production build, the editor is fully
drivable offline: documents are stored in the Git-ignored `.local/site-content.json`
and the admin gate is short-circuited by `usesUnconfiguredDevelopmentEditor()`.

Both conditions are required and neither is under browser control, so the path
is inert in any deployed build and in any configured environment — the same
condition selects the local file store, so development access can only ever edit
development content. This follows the existing `?demo=` and `?staffDemo=`
convention. It is deliberately not wired into `/api/staff/builder-access`, which
remains the canonical role gate for every other page.

## Migration

`supabase/migrations/202608110002_site_content_live_edit.sql` is a **local draft
and is not applied remotely.** Until it is reviewed and deployed, a configured
environment has no `site_page_content` table, every read fails closed to the
shipped defaults, and saving reports that storage is unavailable.

It adds the table with RLS, a published-only public RPC, admin RPCs for
save/publish/discard with optimistic version checks, and audit events
(`site.page_draft_saved`, `site.page_published`, `site.page_draft_discarded`).

Concurrency is enforced in the database, not only in the client: callers send the
version they last read, and a mismatch raises `stale_site_page_version` rather
than overwriting another editor's work.

After applying it, regenerate the CLI types so the hand-added entries in
`src/lib/supabase/database.types.ts` are replaced by generated ones.
