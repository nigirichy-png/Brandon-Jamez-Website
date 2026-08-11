import { NextResponse } from "next/server";

import { loadRealAccountState } from "@/lib/auth/access-state";
import { usesUnconfiguredDevelopmentEditor } from "@/lib/site-content/development-access";
import { loadHomepageEditorDocuments } from "@/lib/site-content/store";

export const dynamic = "force-dynamic";

/**
 * Draft read surface for the homepage editor.
 *
 * The homepage itself stays statically renderable, so an authorized browser
 * asks for its draft here instead. Identity and role are validated again on
 * this request, and the database RPC repeats the check, so being able to call
 * this route is never what grants access. Anonymous and non-admin callers get
 * an empty document rather than a 403 that would confirm the route's purpose.
 */
export async function GET() {
  const state = await loadRealAccountState();
  const canEdit = usesUnconfiguredDevelopmentEditor() || (Boolean(state.user)
    && !state.accountBlocked
    && !state.accessLoadFailed
    && state.roles.includes("admin"));

  if (!canEdit) {
    return NextResponse.json(
      { draft: null, version: 0 },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const documents = await loadHomepageEditorDocuments();

  return NextResponse.json(
    { draft: documents.draft?.snapshot ?? null, version: documents.draft?.version ?? 0 },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
