import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  addLayoutContainer,
  addLayoutRowPreset,
  canPlaceLayoutNode,
  canRemoveLayoutContainer,
  createCanvasDragPayload,
  createDirectCanvasDragPayload,
  createDefaultLayoutTree,
  createInitialEditorState,
  editorReducer,
  finalizeInlineText,
  hasPassedCanvasDragThreshold,
  isSafeColor,
  isSafeExternalUrl,
  isSafeLinkUrl,
  layoutPlacementSource,
  layoutValueSource,
  moveLayoutNode,
  nearestMovableLayoutParent,
  normalizeInlineText,
  propertyGroupsForTarget,
  removeLayoutContainer,
  resolveCanvasDropMove,
  resolveLayoutChildren,
  resolveLayoutPlacement,
  resolveLayoutValue,
  resolveResponsiveValue,
  resolveSafeMovableLayoutNode,
  responsiveValueSource,
  sanitizeNumber,
} from "../src/components/home/homepage-editor-model.ts";

test("simple and advanced property groups stay contextual", () => {
  assert.deepEqual(propertyGroupsForTarget("text"), ["Content", "Typography", "Spacing", "Visibility"]);
  assert.deepEqual(propertyGroupsForTarget("image"), ["Image", "Display", "Appearance", "Visibility"]);
  assert.deepEqual(propertyGroupsForTarget("row"), ["Columns", "Layout", "Appearance", "Move"]);
  assert.equal(propertyGroupsForTarget("text").includes("Borders and surface"), false);
  assert.equal(propertyGroupsForTarget("text", true).includes("Borders and surface"), true);
  assert.deepEqual(propertyGroupsForTarget("header"), ["Header layout", "Brand", "Navigation", "Account action", "Spacing", "Colors", "Responsive"]);
});

test("inline text normalization, commit, cancel, and history remain plain and deterministic", () => {
  assert.equal(normalizeInlineText("  Hello\r\n  world\u0000  ", false), "Hello world");
  assert.equal(normalizeInlineText("Line one\n\n\nLine two", true), "Line one\n\nLine two");
  assert.equal(finalizeInlineText("Original", "Changed", false, false), "Original");
  assert.equal(finalizeInlineText("Original", "  Changed  ", false, true), "Changed");
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "content", id: "hero-heading", key: "text", value: finalizeInlineText("Brandon", "Edited heading", false, true) });
  assert.equal(state.present.targets["hero-heading"]?.content?.text, "Edited heading");
  state = editorReducer(state, { type: "undo" });
  assert.equal(state.present.targets["hero-heading"], undefined);
  state = editorReducer(state, { type: "redo" });
  assert.equal(state.present.targets["hero-heading"]?.content?.text, "Edited heading");
});

test("simple responsive spacing presets inherit without overwriting narrower devices", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "spacing-preset", id: "hero-body", breakpoint: "desktop", preset: "spacious" });
  assert.equal(resolveResponsiveValue(state.present.targets["hero-body"], "mobile", "paddingTop"), 32);
  state = editorReducer(state, { type: "spacing-preset", id: "hero-body", breakpoint: "mobile", preset: "compact" });
  assert.equal(resolveResponsiveValue(state.present.targets["hero-body"], "desktop", "paddingTop"), 32);
  assert.equal(resolveResponsiveValue(state.present.targets["hero-body"], "mobile", "paddingTop"), 8);
});

test("Header contextual preview state is isolated, responsive, and undoable", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "select", id: "public-header" });
  state = editorReducer(state, { type: "header-global", key: "height", value: 64 });
  state = editorReducer(state, { type: "header-responsive", breakpoint: "mobile", key: "navigationLayout", value: "compact" });
  assert.equal(state.selectedId, "public-header");
  assert.equal(state.present.header.height, 64);
  assert.equal(state.present.header.responsive.mobile?.navigationLayout, "compact");
  state = editorReducer(state, { type: "undo" });
  assert.equal(state.present.header.responsive.mobile, undefined);
  assert.equal(JSON.parse(JSON.stringify(state.present)).header.height, 64);
});

test("immutable Public V3 layout models the approved homepage hierarchy", () => {
  const tree = createDefaultLayoutTree();
  assert.deepEqual(resolveLayoutChildren(tree, "homepage", "desktop"), ["hero-section", "feature-section"]);
  assert.deepEqual(resolveLayoutChildren(tree, "hero-section", "desktop"), ["hero-main-row", "hero-utility-row"]);
  assert.deepEqual(resolveLayoutChildren(tree, "hero-main-row", "desktop"), ["hero-introduction-column", "portrait-column", "latest-drop-column"]);
  assert.deepEqual(resolveLayoutChildren(tree, "hero-utility-row", "desktop"), ["live-status-column"]);
  assert.equal(tree.nodes["hero-section"].immutable, true);
  assert.equal(tree.nodes["portrait-image"].defaultPosition?.parentId, "portrait");
});

test("layout compatibility rejects invalid nesting, cycles, and unsafe column capabilities", () => {
  const tree = createDefaultLayoutTree();
  assert.equal(canPlaceLayoutNode(tree, "hero-heading", "hero-introduction-column", "desktop"), true);
  assert.equal(canPlaceLayoutNode(tree, "hero-heading", "feature-column", "desktop"), true);
  assert.equal(canPlaceLayoutNode(tree, "portrait-image", "latest-drop-column", "desktop"), false);
  assert.equal(canPlaceLayoutNode(tree, "portrait", "hero-utility-row", "desktop"), true);
  assert.equal(canPlaceLayoutNode(tree, "hero-heading", "portrait-column", "desktop"), false);
  assert.equal(canPlaceLayoutNode(tree, "hero-section", "hero-main-row", "desktop"), false);
  assert.equal(canPlaceLayoutNode(tree, "hero-main-row", "homepage", "desktop"), false);
});

test("moving a registered element preserves its stable ID without duplicate placement", () => {
  const tree = createDefaultLayoutTree();
  const moved = moveLayoutNode(tree, "hero-body", "feature-column", 1, "desktop");
  assert.equal(resolveLayoutPlacement(moved, "hero-body", "desktop")?.parentId, "feature-column");
  assert.equal(resolveLayoutChildren(moved, "hero-introduction", "desktop").includes("hero-body"), false);
  const occurrences = Object.keys(moved.nodes).filter((id) => id === "hero-body").length;
  assert.equal(occurrences, 1);
  assert.equal(moveLayoutNode(moved, "hero-section", "hero-main-row", 0, "desktop"), moved);
});

test("canvas move payload uses the current selected node, parent, type, and breakpoint", () => {
  const tree = createDefaultLayoutTree();
  assert.deepEqual(createCanvasDragPayload(tree, "hero-eyebrow", "tablet"), {
    nodeId: "hero-eyebrow", nodeType: "element", parentId: "hero-introduction", breakpoint: "tablet",
  });
  assert.equal(createCanvasDragPayload(tree, "hero-heading-accent", "desktop"), null);
  assert.equal(createCanvasDragPayload(tree, "missing-node", "desktop"), null);
});

test("direct Hero block drags promote exactly the three main areas to their complete columns", () => {
  const tree = createDefaultLayoutTree();
  assert.equal(createDirectCanvasDragPayload(tree, "hero-introduction", "desktop")?.nodeId, "hero-introduction-column");
  assert.equal(createDirectCanvasDragPayload(tree, "portrait", "desktop")?.nodeId, "portrait-column");
  assert.equal(createDirectCanvasDragPayload(tree, "latest-drop", "desktop")?.nodeId, "latest-drop-column");
  assert.equal(createDirectCanvasDragPayload(tree, "live-status", "desktop")?.nodeId, "live-status");
});

test("Portrait can be dragged directly right of Latest drop with selection and undo redo", () => {
  let state = createInitialEditorState();
  const payload = createDirectCanvasDragPayload(state.present.layout, "portrait", "desktop")!;
  const drop = resolveCanvasDropMove(state.present.layout, payload, "latest-drop-column", "right")!;
  state = editorReducer(state, { type: "layout-move", id: payload.nodeId, parentId: drop.parentId, index: drop.index, breakpoint: payload.breakpoint });
  state = editorReducer(state, { type: "select", id: payload.nodeId });
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-main-row", "desktop"), ["hero-introduction-column", "latest-drop-column", "portrait-column"]);
  assert.equal(state.selectedId, "portrait-column");
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "portrait-column", "desktop"), ["portrait"]);
  assert.equal(state.present.layout.placements.tablet?.["portrait-column"], undefined);
  assert.equal(state.present.layout.placements.mobile?.["portrait-column"], undefined);
  state = editorReducer(state, { type: "undo" });
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-main-row", "desktop"), ["hero-introduction-column", "portrait-column", "latest-drop-column"]);
  state = editorReducer(state, { type: "redo" });
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-main-row", "desktop"), ["hero-introduction-column", "latest-drop-column", "portrait-column"]);
});

test("Latest drop can be dragged directly before Hero introduction without duplicates or orphans", () => {
  let state = createInitialEditorState();
  const payload = createDirectCanvasDragPayload(state.present.layout, "latest-drop", "desktop")!;
  const drop = resolveCanvasDropMove(state.present.layout, payload, "hero-introduction-column", "left")!;
  state = editorReducer(state, { type: "layout-move", id: payload.nodeId, parentId: drop.parentId, index: drop.index, breakpoint: payload.breakpoint });
  state = editorReducer(state, { type: "select", id: payload.nodeId });
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-main-row", "desktop"), ["latest-drop-column", "hero-introduction-column", "portrait-column"]);
  assert.equal(state.selectedId, "latest-drop-column");
  for (const node of Object.values(state.present.layout.nodes)) {
    if (node.id === state.present.layout.rootId) continue;
    const parents = Object.keys(state.present.layout.nodes).filter((parentId) => resolveLayoutChildren(state.present.layout, parentId, "desktop").includes(node.id));
    assert.equal(parents.length, 1, `${node.id} must remain in exactly one parent`);
  }
});

test("canvas pointer threshold distinguishes a click from a drag", () => {
  assert.equal(hasPassedCanvasDragThreshold(10, 10, 13, 14), false);
  assert.equal(hasPassedCanvasDragThreshold(10, 10, 16, 10), true);
});

test("valid canvas drop commits one history snapshot and keeps selection on the moved node", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "select", id: "hero-heading" });
  const payload = createCanvasDragPayload(state.present.layout, state.selectedId, "desktop")!;
  const drop = resolveCanvasDropMove(state.present.layout, payload, "hero-body", "after")!;
  state = editorReducer(state, { type: "layout-move", id: payload.nodeId, parentId: drop.parentId, index: drop.index, breakpoint: payload.breakpoint });
  state = editorReducer(state, { type: "select", id: payload.nodeId });
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-introduction", "desktop").slice(0, 3), ["hero-eyebrow", "hero-body", "hero-heading"]);
  assert.equal(state.selectedId, "hero-heading");
  assert.equal(state.past.length, 1);
});

test("invalid and cancelled canvas drops commit no layout state", () => {
  const state = createInitialEditorState();
  const payload = createCanvasDragPayload(state.present.layout, "hero-eyebrow", "desktop")!;
  assert.equal(resolveCanvasDropMove(state.present.layout, payload, "portrait-column", "inside"), null);
  assert.equal(resolveCanvasDropMove(state.present.layout, payload, "hero-eyebrow", "after"), null);
  assert.equal(state.past.length, 0);
  assert.deepEqual(state.present.layout, createDefaultLayoutTree());
});

test("canvas cross-host drops update parent and order without duplicates or orphans", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "select", id: "hero-body" });
  const payload = createCanvasDragPayload(state.present.layout, state.selectedId, "desktop")!;
  const drop = resolveCanvasDropMove(state.present.layout, payload, "featured-content", "inside")!;
  state = editorReducer(state, { type: "layout-move", id: payload.nodeId, parentId: drop.parentId, index: drop.index, breakpoint: payload.breakpoint });
  assert.equal(resolveLayoutPlacement(state.present.layout, "hero-body", "desktop")?.parentId, "featured-content");
  assert.equal(resolveLayoutChildren(state.present.layout, "featured-content", "desktop").at(-1), "hero-body");
  const placements = Object.keys(state.present.layout.nodes).filter((parentId) => resolveLayoutChildren(state.present.layout, parentId, "desktop").includes("hero-body"));
  assert.deepEqual(placements, ["featured-content"]);
  for (const node of Object.values(state.present.layout.nodes)) {
    if (node.id === state.present.layout.rootId) continue;
    const parentId = resolveLayoutPlacement(state.present.layout, node.id, "desktop")?.parentId;
    assert.ok(parentId && state.present.layout.nodes[parentId], `${node.id} must retain a valid parent`);
  }
});

test("canvas drop intents cover hero copy, action, and latest-video sibling reordering", () => {
  const applyDrop = (state: ReturnType<typeof createInitialEditorState>, nodeId: string, targetId: string, intent: "before" | "after") => {
    const payload = createCanvasDragPayload(state.present.layout, nodeId, "desktop")!;
    const drop = resolveCanvasDropMove(state.present.layout, payload, targetId, intent)!;
    return editorReducer(state, { type: "layout-move", id: nodeId, parentId: drop.parentId, index: drop.index, breakpoint: "desktop" });
  };
  let state = createInitialEditorState();
  state = applyDrop(state, "hero-eyebrow", "hero-heading", "after");
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-introduction", "desktop").slice(0, 3), ["hero-heading", "hero-eyebrow", "hero-body"]);
  state = applyDrop(state, "hero-body", "hero-heading", "before");
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-introduction", "desktop").slice(0, 3), ["hero-body", "hero-heading", "hero-eyebrow"]);
  state = applyDrop(state, "hero-youtube", "hero-guide", "after");
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-introduction", "desktop").slice(-2), ["hero-guide", "hero-youtube"]);
  state = applyDrop(state, "latest-title", "latest-provider", "before");
  assert.ok(resolveLayoutChildren(state.present.layout, "latest-drop", "desktop").indexOf("latest-title") < resolveLayoutChildren(state.present.layout, "latest-drop", "desktop").indexOf("latest-provider"));
  const changed = state.present.layout;
  state = editorReducer(state, { type: "undo" });
  assert.ok(resolveLayoutChildren(state.present.layout, "latest-drop", "desktop").indexOf("latest-provider") < resolveLayoutChildren(state.present.layout, "latest-drop", "desktop").indexOf("latest-title"));
  state = editorReducer(state, { type: "redo" });
  assert.deepEqual(state.present.layout, changed);
});

test("hero heading movement changes effective rendered sibling order and can move back", () => {
  let state = createInitialEditorState();
  const original = resolveLayoutChildren(state.present.layout, "hero-introduction", "desktop");
  assert.deepEqual(original.slice(0, 3), ["hero-eyebrow", "hero-heading", "hero-body"]);
  state = editorReducer(state, { type: "layout-move", id: "hero-heading", parentId: "hero-introduction", index: 2, breakpoint: "desktop" });
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-introduction", "desktop").slice(0, 3), ["hero-eyebrow", "hero-body", "hero-heading"]);
  state = editorReducer(state, { type: "layout-move", id: "hero-heading", parentId: "hero-introduction", index: 1, breakpoint: "desktop" });
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-introduction", "desktop").slice(0, 3), original.slice(0, 3));
});

test("cross-container child moves and undo redo preserve parent, order, and uniqueness", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "layout-move", id: "hero-body", parentId: "featured-content", index: 1, breakpoint: "desktop" });
  assert.equal(resolveLayoutPlacement(state.present.layout, "hero-body", "desktop")?.parentId, "featured-content");
  assert.equal(resolveLayoutChildren(state.present.layout, "featured-content", "desktop")[1], "hero-body");
  state = editorReducer(state, { type: "undo" });
  assert.equal(resolveLayoutPlacement(state.present.layout, "hero-body", "desktop")?.parentId, "hero-introduction");
  state = editorReducer(state, { type: "redo" });
  assert.equal(resolveLayoutPlacement(state.present.layout, "hero-body", "desktop")?.parentId, "featured-content");
  const placed = Object.keys(state.present.layout.nodes).filter((parentId) => resolveLayoutChildren(state.present.layout, parentId, "desktop").includes("hero-body"));
  assert.deepEqual(placed, ["featured-content"]);
  for (const node of Object.values(state.present.layout.nodes)) {
    if (node.id === state.present.layout.rootId) continue;
    const parentId = resolveLayoutPlacement(state.present.layout, node.id, "desktop")?.parentId;
    assert.ok(parentId && state.present.layout.nodes[parentId], `${node.id} must retain a valid parent`);
  }
});

test("resetting a block restores its immutable child layout", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "layout-move", id: "hero-heading", parentId: "hero-introduction", index: 2, breakpoint: "desktop" });
  state = editorReducer(state, { type: "reset-block", id: "hero-introduction" });
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-introduction", "desktop").slice(0, 3), ["hero-eyebrow", "hero-heading", "hero-body"]);
});

test("rows and columns reorder deterministically at a selected breakpoint", () => {
  let tree = createDefaultLayoutTree();
  tree = moveLayoutNode(tree, "latest-drop-column", "hero-main-row", 0, "desktop");
  assert.deepEqual(resolveLayoutChildren(tree, "hero-main-row", "desktop"), ["latest-drop-column", "hero-introduction-column", "portrait-column"]);
  tree = moveLayoutNode(tree, "hero-utility-row", "hero-section", 0, "desktop");
  assert.deepEqual(resolveLayoutChildren(tree, "hero-section", "desktop"), ["hero-utility-row", "hero-main-row"]);
});

test("locked homepage children resolve to the nearest selectable movable parent", () => {
  const tree = createDefaultLayoutTree();
  assert.equal(nearestMovableLayoutParent(tree, "hero-heading-accent", "desktop")?.id, "hero-heading");
  assert.equal(nearestMovableLayoutParent(tree, "portrait-image", "desktop")?.id, "portrait");
  assert.equal(nearestMovableLayoutParent(tree, "latest-media", "desktop")?.id, "latest-drop");
  assert.equal(nearestMovableLayoutParent(tree, "guide-heading", "desktop")?.id, "featured-content");
});

test("direct editing resolves locked visible targets to their safe movable units", () => {
  const tree = createDefaultLayoutTree();
  assert.equal(resolveSafeMovableLayoutNode(tree, "portrait-image", "desktop")?.id, "portrait-column");
  assert.equal(resolveSafeMovableLayoutNode(tree, "portrait-badge", "desktop")?.id, "portrait-column");
  assert.equal(resolveSafeMovableLayoutNode(tree, "latest-media", "desktop")?.id, "latest-drop-column");
  assert.equal(resolveSafeMovableLayoutNode(tree, "hero-heading-accent", "desktop")?.id, "hero-heading");
  assert.equal(resolveSafeMovableLayoutNode(tree, "guide-heading", "desktop")?.id, "featured-content");
  assert.equal(resolveSafeMovableLayoutNode(tree, "hero-body", "desktop")?.id, "hero-body");
});

test("locked Portrait image and Latest media drags move their complete Hero columns", () => {
  let state = createInitialEditorState();
  const portraitPayload = createDirectCanvasDragPayload(state.present.layout, "portrait-image", "desktop")!;
  assert.equal(portraitPayload.nodeId, "portrait-column");
  const portraitDrop = resolveCanvasDropMove(state.present.layout, portraitPayload, "latest-drop-column", "right")!;
  state = editorReducer(state, { type: "layout-move", id: portraitPayload.nodeId, parentId: portraitDrop.parentId, index: portraitDrop.index, breakpoint: portraitPayload.breakpoint });
  state = editorReducer(state, { type: "select", id: portraitPayload.nodeId });
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-main-row", "desktop"), ["hero-introduction-column", "latest-drop-column", "portrait-column"]);
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "portrait-column", "desktop"), ["portrait"]);
  assert.equal(state.selectedId, "portrait-column");

  state = createInitialEditorState();
  const latestPayload = createDirectCanvasDragPayload(state.present.layout, "latest-media", "desktop")!;
  assert.equal(latestPayload.nodeId, "latest-drop-column");
  const latestDrop = resolveCanvasDropMove(state.present.layout, latestPayload, "hero-introduction-column", "left")!;
  state = editorReducer(state, { type: "layout-move", id: latestPayload.nodeId, parentId: latestDrop.parentId, index: latestDrop.index, breakpoint: latestPayload.breakpoint });
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-main-row", "desktop"), ["latest-drop-column", "hero-introduction-column", "portrait-column"]);
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "latest-drop-column", "desktop"), ["latest-drop"]);
});

test("whole blocks move intact with selection, one history entry, undo, and redo", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "content", id: "latest-title", key: "text", value: "Kept latest title" });
  const historyBeforeMove = state.past.length;
  state = editorReducer(state, { type: "layout-move", id: "latest-drop", parentId: "feature-column", index: 1, breakpoint: "desktop" });
  state = editorReducer(state, { type: "select", id: "latest-drop" });
  assert.equal(resolveLayoutPlacement(state.present.layout, "latest-drop", "desktop")?.parentId, "feature-column");
  assert.equal(state.present.targets["latest-title"]?.content?.text, "Kept latest title");
  assert.equal(state.selectedId, "latest-drop");
  assert.equal(state.past.length, historyBeforeMove + 1);
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "latest-drop", "desktop"), createDefaultLayoutTree().nodes["latest-drop"].children);
  const movedLayout = state.present.layout;
  state = editorReducer(state, { type: "undo" });
  assert.equal(resolveLayoutPlacement(state.present.layout, "latest-drop", "desktop")?.parentId, "latest-drop-column");
  assert.equal(state.present.targets["latest-title"]?.content?.text, "Kept latest title");
  state = editorReducer(state, { type: "redo" });
  assert.deepEqual(state.present.layout, movedLayout);
  for (const node of Object.values(state.present.layout.nodes)) {
    if (node.id === state.present.layout.rootId) continue;
    const parents = Object.keys(state.present.layout.nodes).filter((parentId) => resolveLayoutChildren(state.present.layout, parentId, "desktop").includes(node.id));
    assert.equal(parents.length, 1, `${node.id} must have exactly one parent`);
  }
});

test("hero columns, hero rows, and homepage sections reorder at their own structural level", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "layout-move", id: "portrait-column", parentId: "hero-main-row", index: 2, breakpoint: "desktop" });
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-main-row", "desktop"), ["hero-introduction-column", "latest-drop-column", "portrait-column"]);
  state = editorReducer(state, { type: "layout-move", id: "hero-utility-row", parentId: "hero-section", index: 0, breakpoint: "desktop" });
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "hero-section", "desktop"), ["hero-utility-row", "hero-main-row"]);
  state = editorReducer(state, { type: "layout-move", id: "feature-section", parentId: "homepage", index: 0, breakpoint: "desktop" });
  assert.deepEqual(resolveLayoutChildren(state.present.layout, "homepage", "desktop"), ["feature-section", "hero-section"]);
});

test("generated containers are stable and removable only while empty", () => {
  const base = createDefaultLayoutTree();
  const sectionResult = addLayoutContainer(base, "section", "homepage", "desktop");
  assert.equal(sectionResult.nodeId, "layout-section-1");
  assert.equal(canRemoveLayoutContainer(sectionResult.tree, sectionResult.nodeId!).allowed, true);
  assert.equal(removeLayoutContainer(sectionResult.tree, sectionResult.nodeId!).nodes[sectionResult.nodeId!], undefined);
  const rowResult = addLayoutRowPreset(sectionResult.tree, sectionResult.nodeId!, "three-equal", "desktop");
  assert.equal(resolveLayoutChildren(rowResult.tree, rowResult.nodeId!, "desktop").length, 3);
  const emptyColumn = resolveLayoutChildren(rowResult.tree, rowResult.nodeId!, "desktop")[0];
  assert.equal(canPlaceLayoutNode(rowResult.tree, "hero-body", emptyColumn, "desktop"), true);
  assert.equal(canRemoveLayoutContainer(rowResult.tree, rowResult.nodeId!).allowed, false);
  assert.equal(canRemoveLayoutContainer(base, "hero-section").allowed, false);
});

test("compatible children can move into generated hosts while locked or incompatible children are rejected", () => {
  const base = createDefaultLayoutTree();
  const section = addLayoutContainer(base, "section", "homepage", "desktop");
  const row = addLayoutRowPreset(section.tree, section.nodeId!, "one", "desktop");
  const columnId = resolveLayoutChildren(row.tree, row.nodeId!, "desktop")[0];
  const moved = moveLayoutNode(row.tree, "hero-body", columnId, 0, "desktop");
  assert.equal(resolveLayoutPlacement(moved, "hero-body", "desktop")?.parentId, columnId);
  assert.equal(resolveLayoutChildren(moved, columnId, "desktop").filter((id) => id === "hero-body").length, 1);
  assert.equal(canPlaceLayoutNode(row.tree, "portrait-image", columnId, "desktop"), false);
  assert.equal(canPlaceLayoutNode(row.tree, "hero-body", "portrait-column", "desktop"), false);
});

test("layout placement and values inherit desktop through tablet and mobile", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "layout-move", id: "portrait-column", parentId: "hero-main-row", index: 0, breakpoint: "tablet" });
  assert.equal(resolveLayoutChildren(state.present.layout, "hero-main-row", "mobile")[0], "portrait-column");
  assert.equal(layoutPlacementSource(state.present.layout, "portrait-column", "mobile"), "tablet");
  assert.equal(resolveLayoutChildren(state.present.layout, "hero-main-row", "desktop")[0], "hero-introduction-column");
  state = editorReducer(state, { type: "layout-responsive", id: "hero-main-row", breakpoint: "desktop", key: "direction", value: "row" });
  state = editorReducer(state, { type: "layout-responsive", id: "hero-main-row", breakpoint: "mobile", key: "direction", value: "column" });
  assert.equal(resolveLayoutValue(state.present.layout, "hero-main-row", "tablet", "direction"), "row");
  assert.equal(resolveLayoutValue(state.present.layout, "hero-main-row", "mobile", "direction"), "column");
  assert.equal(layoutValueSource(state.present.layout, "hero-main-row", "tablet", "direction"), "desktop");
});

test("layout operations participate in undo, redo, breakpoint reset, and full reset", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "layout-move", id: "portrait-column", parentId: "hero-main-row", index: 0, breakpoint: "mobile" });
  assert.equal(state.past.length, 1);
  state = editorReducer(state, { type: "undo" });
  assert.equal(resolveLayoutChildren(state.present.layout, "hero-main-row", "mobile")[0], "hero-introduction-column");
  state = editorReducer(state, { type: "redo" });
  assert.equal(resolveLayoutChildren(state.present.layout, "hero-main-row", "mobile")[0], "portrait-column");
  state = editorReducer(state, { type: "layout-reset-breakpoint", breakpoint: "mobile" });
  assert.equal(resolveLayoutChildren(state.present.layout, "hero-main-row", "mobile")[0], "hero-introduction-column");
  state = editorReducer(state, { type: "layout-add", nodeType: "section", parentId: "homepage", breakpoint: "desktop" });
  state = editorReducer(state, { type: "layout-reset-all" });
  assert.deepEqual(state.present.layout, createDefaultLayoutTree());
});

test("complete editor page definition is deterministic JSON-safe state", () => {
  const snapshot = createInitialEditorState().present;
  const roundTrip = JSON.parse(JSON.stringify(snapshot));
  assert.deepEqual(roundTrip, snapshot);
  assert.equal(roundTrip.schemaVersion, 1);
  assert.doesNotMatch(JSON.stringify(roundTrip), /function|\[object Object\]/);
});

test("numeric and URL validation reject unsafe editor values", () => {
  assert.equal(sanitizeNumber("-10", 0, 320), 0);
  assert.equal(sanitizeNumber("9999", 0, 320), 320);
  assert.equal(sanitizeNumber("not-a-number", 0, 320), undefined);
  assert.equal(isSafeExternalUrl("https://images.example/test.jpg", true), true);
  assert.equal(isSafeExternalUrl("http://images.example/test.jpg", true), false);
  assert.equal(isSafeLinkUrl("/subscriber", true), true);
  assert.equal(isSafeLinkUrl("javascript:alert(1)", false), false);
  assert.equal(isSafeColor("#12aBcF"), true);
  assert.equal(isSafeColor("red; background:url(x)"), false);
});

test("responsive overrides inherit from desktop through tablet and mobile", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "responsive", id: "hero-heading", breakpoint: "desktop", key: "fontSize", value: 64 });
  assert.equal(resolveResponsiveValue(state.present.targets["hero-heading"], "mobile", "fontSize"), 64);
  assert.equal(responsiveValueSource(state.present.targets["hero-heading"], "mobile", "fontSize"), "desktop");
  state = editorReducer(state, { type: "responsive", id: "hero-heading", breakpoint: "tablet", key: "fontSize", value: 48 });
  assert.equal(resolveResponsiveValue(state.present.targets["hero-heading"], "mobile", "fontSize"), 48);
  assert.equal(responsiveValueSource(state.present.targets["hero-heading"], "mobile", "fontSize"), "tablet");
});

test("block ordering is restricted to each registered parent group", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "move", id: "portrait", direction: -1 });
  assert.deepEqual(state.present.order.stage.slice(0, 2), ["portrait", "hero-introduction"]);
  const unchanged = editorReducer(state, { type: "move", id: "featured-content", direction: -1 });
  assert.deepEqual(unchanged.present.order.features, ["featured-content"]);
  assert.equal(state.present.order.features.includes("portrait"), false);
  state = editorReducer(state, { type: "reset-block", id: "portrait" });
  assert.deepEqual(state.present.order.stage.slice(0, 2), ["hero-introduction", "portrait"]);
});

test("reset and bounded undo redo restore deterministic snapshots", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "content", id: "hero-body", key: "text", value: "Temporary copy" });
  state = editorReducer(state, { type: "reset-page" });
  assert.deepEqual(state.present.targets, {});
  state = editorReducer(state, { type: "undo" });
  assert.equal(state.present.targets["hero-body"]?.content?.text, "Temporary copy");
  state = editorReducer(state, { type: "redo" });
  assert.deepEqual(state.present.targets, {});
});

test("selected target and preview mode are UI state, not persisted page overrides", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, { type: "select", id: "portrait-image" });
  state = editorReducer(state, { type: "preview", breakpoint: "mobile" });
  assert.equal(state.selectedId, "portrait-image");
  assert.equal(state.previewMode, "mobile");
  assert.deepEqual(state.present.targets, {});
});

test("homepage editor visibility uses a deferred canonical admin gate and has a clean public branch", async () => {
  const [pageSource, editorSource] = await Promise.all([
    readFile(new URL("../src/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/homepage-editor.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(pageSource, /resolveStaffAccessState|evaluateAdminAccess|force-dynamic/);
  assert.match(editorSource, /requestBuilderAccess/);
  // The public branch carries a read-only provider so published content resolves
  // for visitors. It stays read-only: inactive, and never in layout mode.
  assert.match(editorSource, /if \(!authorized\) return <EditorContext\.Provider value=\{passiveContext\}><main id="main-content"/);
  assert.match(editorSource, /\.\.\.context, active: false, mode: "content"/);
  assert.match(editorSource, /if \(!shouldPortal \|\| !placement \|\| !host\) return children/);
  assert.match(pageSource, /HomepageLayoutItem id="hero-heading"/);
  assert.doesNotMatch(editorSource, /localStorage|staffDemo|dangerouslySetInnerHTML/);
});

test("homepage editor exposes one direct workflow with settings closed by default", async () => {
  const editorSource = await readFile(new URL("../src/components/home/homepage-editor.tsx", import.meta.url), "utf8");
  const editorBar = editorSource.slice(editorSource.indexOf("<div className={styles.editorBar}"), editorSource.indexOf("<div className={styles.previewArea}"));
  const contextToolbar = editorSource.slice(editorSource.indexOf("function ContextToolbar"), editorSource.indexOf("export function HomepageEditor"));
  assert.doesNotMatch(editorBar, /editorModes|Editor mode|>Content<|>Design<|>Layout<|type: "mode"/);
  assert.match(editorSource, /const \[panelOpen, setPanelOpen\] = useState\(false\)/);
  assert.match(editorBar, /panelOpen \? "Close settings" : "More settings"/);
  assert.match(editorSource, /data-editor-mode="direct"/);
  assert.match(editorSource, /homepageTargetById\[state\.selectedId as HomepageTargetId\] \? <PropertyPanel/);
  assert.match(contextToolbar, /kind === "text"[\s\S]*Edit text[\s\S]*Font size[\s\S]*Font weight[\s\S]*Text color/);
  assert.match(contextToolbar, /kind === "link"[\s\S]*Edit link[\s\S]*Button style/);
  assert.match(contextToolbar, /kind === "image"[\s\S]*Image size[\s\S]*Image fit[\s\S]*Image position[\s\S]*Image corners/);
  assert.match(contextToolbar, /kind === "block"[\s\S]*Block width[\s\S]*Block alignment[\s\S]*Block background/);
  assert.equal(contextToolbar.match(/<CanvasMoveHandle/g)?.length, 1);
  assert.match(editorSource, /onClickCapture: \(event: React\.MouseEvent\) => \{ event\.preventDefault\(\); event\.stopPropagation\(\); editor\.dispatch\(\{ type: "select", id \}\); \}/);
  assert.match(editorSource, /document\.activeElement\?\.matches\("\[contenteditable='true'\]"\)/);
  assert.match(editorSource, /onClose=\{\(\) => setPanelOpen\(false\)\}/);
});

test("desktop preview edits the page at its real width while tablet and mobile stay device sized", async () => {
  const editorStyles = await readFile(new URL("../src/components/home/homepage-editor.module.css", import.meta.url), "utf8");
  // Desktop is "no constraint", not a device size. A fixed width here would show
  // a narrower page than the one being edited.
  assert.match(editorStyles, /\.desktopFrame \{ --editor-preview-width: 100%; \}/);
  assert.doesNotMatch(editorStyles, /\.desktopFrame \{ --editor-preview-width: [\d.]+rem; \}/);
  // Tablet and mobile keep real device widths, where a fixed frame is the point.
  assert.match(editorStyles, /\.tabletFrame \{ --editor-preview-width: 48rem; \}/);
  assert.match(editorStyles, /\.mobileFrame \{ --editor-preview-width: 24\.375rem; \}/);
  // Desktop also drops the inset and device chrome so it is a true 1:1.
  assert.match(editorStyles, /\[data-preview-mode="desktop"\] \.previewArea \{ padding: 0; \}/);
  assert.match(editorStyles, /\[data-preview-mode="desktop"\] \.previewFrame \{ box-shadow: none; \}/);
});

test("the block selection overlay never swallows clicks meant for inline editing", async () => {
  const [editorSource, editorStyles] = await Promise.all([
    readFile(new URL("../src/components/home/homepage-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/homepage-editor.module.css", import.meta.url), "utf8"),
  ]);
  // The overlay spans the whole block. Public wrappers such as .identityBlock
  // create their own stacking context, which traps a nested element's z-index
  // below it, so raising .editableElement is not enough: the overlay must take
  // no pointer events at all or double-click never reaches the editable span.
  const overlay = editorStyles.slice(editorStyles.indexOf(".selectionTarget {"));
  assert.match(overlay.slice(0, 200), /pointer-events:\s*none/);
  // It stays reachable by keyboard, so block selection is not mouse-only.
  assert.match(editorSource, /className=\{styles\.selectionTarget\} aria-label=\{`Edit \$\{definition\.label\} block`\}/);
  // Mouse selection of a block is delegated to the wrapper, and only fires when
  // the click did not land on a nested editable node.
  assert.match(editorSource, /onClick=\{selectBlockFromEmptyArea\}/);
  assert.match(editorSource, /\(event\.target as HTMLElement\)\.closest\("\[data-canvas-node-id\]"\) !== event\.currentTarget/);
});

test("canvas-first UI keeps one pointer move handle and drag UI out of the public branch", async () => {
  const editorSource = await readFile(new URL("../src/components/home/homepage-editor.tsx", import.meta.url), "utf8");
  const propertyPanel = editorSource.slice(editorSource.indexOf("function PropertyPanel"), editorSource.indexOf("function ContextToolbar"));
  assert.match(propertyPanel, /SimpleTargetControls/);
  assert.match(propertyPanel, /Advanced settings/);
  assert.doesNotMatch(propertyPanel, /Blocks and elements|sectionList/);
  assert.match(editorSource, /onPointerDown=.*setPointerCapture/s);
  assert.match(editorSource, /hasPassedCanvasDragThreshold/);
  assert.match(editorSource, /type: "layout-move".*type: "select"/s);
  assert.match(editorSource, /GeneratedLayoutCanvas/);
  assert.equal(editorSource.match(/data-canvas-move-handle/g)?.length, 1);
  assert.match(editorSource, /Moves with parent/);
  const contextToolbar = editorSource.slice(editorSource.indexOf("function CanvasMoveHandle"), editorSource.indexOf("export function HomepageEditor"));
  assert.doesNotMatch(contextToolbar, /draggable|onDragStart|dataTransfer/);
  assert.match(editorSource, /const \[outlineOpen, setOutlineOpen\] = useState\(false\)/);
  assert.match(editorSource, /aria-controls="homepage-outline-drawer" aria-expanded=\{outlineOpen\}/);
  assert.match(editorSource, /if \(!authorized\) return <EditorContext\.Provider value=\{passiveContext\}><main id="main-content"/);
  const publicBranch = editorSource.slice(editorSource.indexOf("if (!authorized)"), editorSource.indexOf("if (!active)"));
  assert.doesNotMatch(publicBranch, /ContextToolbar|GeneratedLayoutCanvas|OutlineDrawer|dragHandle|layoutHost|canvasDropLayer|data-canvas-move-handle/);
});

test("unified context toolbar stays compact while movement fallbacks remain accessible", async () => {
  const [editorSource, editorStyles] = await Promise.all([
    readFile(new URL("../src/components/home/homepage-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/homepage-editor.module.css", import.meta.url), "utf8"),
  ]);
  const toolbar = editorSource.slice(editorSource.indexOf("function ContextToolbar"), editorSource.indexOf("export function HomepageEditor"));
  const outline = editorSource.slice(editorSource.indexOf("function LayoutTreeItem"), editorSource.indexOf("function OutlineDrawer"));
  const layoutPanel = editorSource.slice(editorSource.indexOf("function LayoutPanel"), editorSource.indexOf("function PropertyPanel"));
  assert.match(toolbar, /aria-label="Block width"/);
  assert.match(toolbar, /aria-label="Block alignment"/);
  assert.match(toolbar, /aria-label="Column width"/);
  assert.match(toolbar, /aria-label="Column alignment"/);
  assert.equal(toolbar.match(/<CanvasMoveHandle/g)?.length, 1);
  assert.match(toolbar, /<button type="button" onClick=\{reset\}>Reset \{kind\}<\/button>/);
  assert.doesNotMatch(toolbar, />Move up<|>Move down<|>Move left<|>Move right<|Previous container|Next container|Select parent row|Select parent column|Select parent section/);
  assert.doesNotMatch(toolbar, /Moves with parent|Select parent block/);
  assert.match(toolbar, /resolveSafeMovableLayoutNode\(state\.present\.layout, node\.id, state\.previewMode\)/);
  assert.match(outline, /Move left|Move right|Move up|Move down/);
  assert.match(layoutPanel, /Move left|Move right|Move up|Move down|Previous container|Next container/);
  assert.match(editorStyles, /\.contextToolbar \{[^}]*flex-wrap: nowrap;[^}]*overflow: visible;/);
  assert.doesNotMatch(editorStyles, /\.contextToolbar \{[^}]*overflow-x: auto/);
});

test("direct Hero-column dragging remains editor-only and leaves the inactive Public V3 branch unchanged", async () => {
  const editorSource = await readFile(new URL("../src/components/home/homepage-editor.tsx", import.meta.url), "utf8");
  const publicBranch = editorSource.slice(editorSource.indexOf("if (!canEdit)"), editorSource.indexOf("if (!active)"));
  const moveHandle = editorSource.slice(editorSource.indexOf("function CanvasMoveHandle"), editorSource.indexOf("function ContextToolbar"));
  assert.match(moveHandle, /createDirectCanvasDragPayload\(editor\.snapshot\.layout, editor\.selectedId, editor\.breakpoint\)/);
  assert.doesNotMatch(publicBranch, /createDirectCanvasDragPayload|CanvasMoveHandle|canvasDropLayer/);
});

test("canvas drag overlay renders only the active zone without visible intent labels", async () => {
  const [editorSource, editorStyles] = await Promise.all([
    readFile(new URL("../src/components/home/homepage-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/homepage-editor.module.css", import.meta.url), "utf8"),
  ]);
  const overlay = editorSource.slice(editorSource.indexOf("{canvasDrag ? <div className={styles.canvasDropLayer}"), editorSource.indexOf("<ContextToolbar state={state}"));
  assert.match(editorSource, /const visibleCanvasDropZone = canvasDrag\?\.activeKey \? canvasDrag\.zones\.find\(\(zone\) => zone\.key === canvasDrag\.activeKey\) \?\? null : null/);
  assert.match(overlay, /visibleCanvasDropZone \? <div/);
  assert.doesNotMatch(overlay, /canvasDrag\.zones\.map/);
  assert.doesNotMatch(overlay, /zone\.intent|<span>\{[^}]*intent[^}]*\}<\/span>/);
  assert.match(editorStyles, /data-drop-intent="before"/);
  assert.match(editorStyles, /data-drop-intent="after"/);
  assert.match(editorStyles, /data-drop-intent="left"/);
  assert.match(editorStyles, /data-drop-intent="right"/);
  assert.match(editorStyles, /data-drop-intent="inside"/);
  assert.doesNotMatch(editorStyles, /\.canvasDropZone span|\.activeCanvasDropZone/);
});

test("canvas drag feedback keeps its label, marker, and structural suppression contextual", async () => {
  const [editorSource, editorStyles] = await Promise.all([
    readFile(new URL("../src/components/home/homepage-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/homepage-editor.module.css", import.meta.url), "utf8"),
  ]);
  const overlay = editorSource.slice(editorSource.indexOf("{canvasDrag ? <div className={styles.canvasDropLayer}"), editorSource.indexOf("<ContextToolbar state={state}"));
  assert.match(editorSource, /const canvasDragLabel = canvasDrag \? state\.present\.layout\.nodes\[canvasDrag\.payload\.nodeId\]\?\.label \?\? canvasDrag\.payload\.nodeId : ""/);
  assert.match(overlay, />Moving \{canvasDragLabel\}<\/div>/);
  assert.doesNotMatch(editorSource, /editor\?\.canvasDrag \? "Moving" : "Move"/);
  assert.doesNotMatch(overlay, /sectionTag|targetLabel|zone\.label/);
  assert.match(editorSource, /const width = Math\.min\(240, Math\.max\(2, availableRight - availableLeft\)\)/);
  assert.match(editorSource, /const height = Math\.min\(160, Math\.max\(2, availableBottom - availableTop\)\)/);
  assert.match(editorSource, /destinationRect: canvasDropVisualRect|visualRect: canvasDropVisualRect/);
  assert.match(editorSource, /pointerInSourceHost && left\.sameHost/);
  assert.match(editorStyles, /\.canvasDragging \.editableSection[\s\S]*outline-color: transparent !important/);
  assert.match(editorStyles, /\.canvasDragging \.sectionTag, \.canvasDragging \.containerSelectionLayer \{ display: none !important; \}/);
  assert.match(editorStyles, /\.contextToolbar\[data-dragging="true"\][^{]*\{[^}]*opacity: 0/);
});

test("container selection and outline movement expose one structural level at a time", async () => {
  const [editorSource, editorStyles] = await Promise.all([
    readFile(new URL("../src/components/home/homepage-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/homepage-editor.module.css", import.meta.url), "utf8"),
  ]);
  assert.match(editorSource, /function CanvasContainerSelectionLayer/);
  assert.match(editorSource, /data-container-boundary-id=\{boundary\.id\}/);
  assert.match(editorSource, />Select parent block<\/button>/);
  assert.match(editorSource, /payload\.nodeType === node\.type/);
  assert.match(editorSource, /sameLevel: tree\.nodes\[targetId\]\?\.type === payload\.nodeType/);
  assert.match(editorSource, /\(left\.sameLevel \? 0 : 1\) - \(right\.sameLevel \? 0 : 1\)/);
  assert.match(editorStyles, /\.layoutMode \.editableSection \{ outline-color: transparent; \}/);
  assert.match(editorStyles, /\.selectedContainerBoundary \{ outline-color:/);
  assert.doesNotMatch(editorSource, /className=\{styles\.containerBoundaries\}/);
});

test("mobile header navigation has a native hydration-independent toggle", async () => {
  const headerSource = await readFile(new URL("../src/components/layout/header-navigation.tsx", import.meta.url), "utf8");
  assert.match(headerSource, /id="mobile-navigation-toggle" type="checkbox"/);
  assert.match(headerSource, /htmlFor="mobile-navigation-toggle"/);
  assert.match(headerSource, /peer-checked:flex/);
  assert.match(headerSource, /id="mobile-navigation" role="dialog"/);
  assert.doesNotMatch(headerSource, /createPortal/);
});
