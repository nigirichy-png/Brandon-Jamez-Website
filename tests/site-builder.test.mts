import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  isSafeBuilderColor,
  isSafeBuilderUrl,
  moveSiteBuilderNode,
  normalizeBuilderText,
  publicV3SiteDefinition,
  resolveSafeBuilderUnit,
  resolveSiteBuilderStyle,
  sanitizeFontSize,
  serializeSiteDefinition,
  validatePageDefinition,
  type PageDefinition,
} from "../src/components/site-builder/site-builder-model.ts";

test("site definition is schema-versioned, deterministic, serializable, and covers every requested route", () => {
  assert.equal(publicV3SiteDefinition.schemaVersion, 1);
  for (const route of ["/", "/guide", "/videos", "/subscriber", "/subscriber/[slug]", "/account", "/account/security", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-age", "/auth/complete", "/auth/error", "/auth/recovery/complete"]) {
    assert.ok(publicV3SiteDefinition.pages[route], route);
    assert.deepEqual(validatePageDefinition(publicV3SiteDefinition.pages[route]), []);
  }
  const serialized = serializeSiteDefinition(publicV3SiteDefinition);
  assert.equal(serializeSiteDefinition(JSON.parse(serialized)), serialized);
  assert.equal(serialized.includes("[object Function]"), false);
});

test("protected dynamic content remains a locked, real-source-bound functional unit", () => {
  const account = publicV3SiteDefinition.pages["/account"];
  const identity = account.nodes["account-identity"];
  assert.equal(identity.lockedBehavior, "functional");
  assert.equal(identity.sourceBinding, "real-account-state");
  assert.equal(resolveSafeBuilderUnit(account, identity.id)?.id, identity.id);
});

test("responsive styles inherit desktop to tablet to mobile without overwriting desktop", () => {
  const definition = structuredClone(publicV3SiteDefinition.pages["/guide"]) as PageDefinition;
  const id = "guide-intro";
  definition.nodes[id].responsiveStyle.desktop = { fontSize: 72, direction: "row" };
  definition.nodes[id].responsiveStyle.mobile = { fontSize: 28 };
  assert.deepEqual(resolveSiteBuilderStyle(definition, id, "tablet"), { fontSize: 72, direction: "row" });
  assert.deepEqual(resolveSiteBuilderStyle(definition, id, "mobile"), { fontSize: 28, direction: "row" });
  assert.equal(resolveSiteBuilderStyle(definition, id, "desktop").fontSize, 72);
});

test("font sizes use the expanded safe range and unsafe content is rejected or normalized", () => {
  assert.equal(sanitizeFontSize(7), 8); assert.equal(sanitizeFontSize(240.5), 240); assert.equal(sanitizeFontSize(18.5), 18.5); assert.equal(sanitizeFontSize(Number.NaN), undefined);
  assert.equal(normalizeBuilderText("Hello\n<script>", false), "Hello <script>");
  assert.equal(isSafeBuilderUrl("/account"), true); assert.equal(isSafeBuilderUrl("javascript:alert(1)"), false); assert.equal(isSafeBuilderUrl("http://example.com/a", false, true), false);
  assert.equal(isSafeBuilderColor("#d8b35a"), true); assert.equal(isSafeBuilderColor("url(javascript:1)"), false);
});

test("moves support same-container, cross-section, automatic rows, and generated-container cleanup without corruption", () => {
  const definition: PageDefinition = {
    routeKey: "/test", rootId: "page", responsiveOverrides: {}, nodes: {
      page: { id:"page",label:"Page",type:"page",semanticRole:"presentation",content:{},style:{},responsiveStyle:{},children:["a","b"],parentId:null,lockedBehavior:"immutable-container",allowedChildren:["section"] },
      a: { id:"a",label:"A",type:"section",semanticRole:"presentation",content:{},style:{},responsiveStyle:{},children:["one","two"],parentId:"page",lockedBehavior:"none",allowedChildren:["text","row"] },
      b: { id:"b",label:"B",type:"section",semanticRole:"presentation",content:{},style:{},responsiveStyle:{},children:["three"],parentId:"page",lockedBehavior:"none",allowedChildren:["text","row"] },
      one: { id:"one",label:"One",type:"text",semanticRole:"presentation",content:{text:"One"},style:{},responsiveStyle:{},children:[],parentId:"a",lockedBehavior:"none",allowedChildren:[] },
      two: { id:"two",label:"Two",type:"text",semanticRole:"presentation",content:{text:"Two"},style:{},responsiveStyle:{},children:[],parentId:"a",lockedBehavior:"none",allowedChildren:[] },
      three: { id:"three",label:"Three",type:"text",semanticRole:"presentation",content:{text:"Three"},style:{},responsiveStyle:{},children:[],parentId:"b",lockedBehavior:"none",allowedChildren:[] },
    },
  };
  const same = moveSiteBuilderNode(definition,"two","one","before","desktop"); assert.deepEqual(same.nodes.a.children,["two","one"]);
  const cross = moveSiteBuilderNode(same,"two","three","after","mobile"); assert.deepEqual(cross.nodes.b.children,["three","two"]); assert.equal(cross.nodes.two.parentId,"b");
  assert.deepEqual(validatePageDefinition(cross), []); assert.equal(definition.nodes.two.parentId,"a");
  const cycle = moveSiteBuilderNode(cross,"b","two","inside","desktop"); assert.equal(cycle, cross);
});

test("shared runtime defers real admin gating without blocking public rendering", async () => {
  const [layout, runtime, accessClient, accessRoute, home, auth] = await Promise.all([
    readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/site-builder/site-builder-runtime.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/site-builder/builder-access-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/staff/builder-access/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/homepage-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/auth/auth-shell.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(layout, /resolveStaffAccessState|evaluateAdminAccess/); assert.match(layout, /<SiteBuilderRuntime>/);
  assert.match(accessClient, /requestBuilderAccess/); assert.match(accessClient, /sb-.+auth-token/); assert.match(accessClient, /cache: "no-store"/);
  assert.match(accessRoute, /loadRealAccountState/); assert.match(accessRoute, /roles\.includes\("admin"\)/); assert.match(accessRoute, /private, no-store/);
  assert.match(runtime, /siteBuilderBreakpoints/);
  for (const label of ["Outline","Undo","Redo","Reset preview","More settings","Exit editor"]) assert.match(runtime, new RegExp(label));
  assert.doesNotMatch(runtime, />Content</); assert.doesNotMatch(runtime, />Design</); assert.doesNotMatch(runtime, />Layout</);
  assert.equal((runtime.match(/data-site-builder-explicit-handle/g) ?? []).length, 2);
  assert.match(runtime, /\^\\\/\(admin\|cms\|mod\)/);
  assert.match(home, /data-editor-mode="direct"/); assert.doesNotMatch(home, />Content</); assert.match(auth, /existing secure account flow|children/);
});
