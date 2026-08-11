"use client";
/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, useTransition, type CSSProperties, type ElementType, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { discardHomepageDraftAction, publishHomepageDraftAction, saveHomepageDraftAction, type SiteContentResult } from "@/app/actions/site-content";
import { sanitizeHomepageDocument } from "@/lib/site-content/homepage-document";

import { CmsVideoPreview } from "@/components/video/cms-video-preview";
import { VideoHoverPreview } from "@/components/video/video-hover-preview";
import { VideoPlatformBadge, VideoPlatformIcon } from "@/components/video/video-platform-identity";
import { requestBuilderAccess } from "@/components/site-builder/builder-access-client";
import type { CmsVideoPlatform } from "@/lib/cms/video-model";
import {
  createCanvasDragPayload, createDirectCanvasDragPayload, createInitialEditorState, createInitialSnapshot, editorBreakpoints, editorReducer, finalizeInlineText, hasPassedCanvasDragThreshold, homepageTargetById, homepageTargetRegistry,
  canPlaceLayoutNode, canRemoveLayoutContainer, isSafeColor, isSafeExternalUrl, isSafeInternalAssetPath, isSafeLinkUrl, layoutPlacementSource, layoutValueSource,
  nearestMovableLayoutParent, normalizeInlineText, resolveCanvasDropMove, resolveLayoutChildren, resolveLayoutPlacement, resolveLayoutValue, resolveResponsiveValue, resolveSafeMovableLayoutNode, responsiveValueSource, sanitizeNumber,
  type CanvasDragPayload, type CanvasDropIntent, type CanvasDropMove,
  type EditorAction, type EditorBreakpoint, type EditorSnapshot, type GlobalStyle, type HomepageBlockId, type HomepageEditorDefaults, type HomepageElementId,
  type HomepageTargetId, type ImagePlacement, type LayoutNode, type LayoutPreset, type LayoutResponsiveOverride,
  type ObjectFit, type ObjectPosition, type ResponsiveStyle, type SpacingPreset, type TargetContentOverride, type TargetOverride, type WidthPreset,
} from "./homepage-editor-model";
import publicStyles from "./public-home.module.css";
import styles from "./homepage-editor.module.css";

type EditorContextValue = {
  active: boolean;
  breakpoint: EditorBreakpoint;
  defaults: HomepageEditorDefaults;
  selectedId: string;
  mode: "content" | "design" | "layout";
  snapshot: ReturnType<typeof createInitialEditorState>["present"];
  dispatch: React.Dispatch<EditorAction>;
  hosts: ReadonlyMap<string, HTMLDivElement>;
  registerHost: (id: string, node: HTMLDivElement | null) => void;
  canvasDrag: CanvasDragVisualState | null;
  startCanvasDrag: (payload: CanvasDragPayload, point: CanvasPoint) => void;
  updateCanvasDrag: (point: CanvasPoint) => void;
  finishCanvasDrag: (point: CanvasPoint) => void;
  cancelCanvasDrag: () => void;
};

type CanvasPoint = { x: number; y: number };
type CanvasRect = { left: number; top: number; width: number; height: number };
type CanvasDropZone = CanvasDropMove & { key: string; rect: CanvasRect; visualRect: CanvasRect; destinationRect: CanvasRect | null; sameHost: boolean; sameLevel: boolean };
type CanvasDragVisualState = { payload: CanvasDragPayload; point: CanvasPoint; zones: CanvasDropZone[]; activeKey: string | null };
type CanvasContainerBoundary = { id: string; label: string; rect: CanvasRect };

type SaveStatus = { kind: "idle" | "pending" | "saved" | "published" | "discarded" } | { kind: "error"; message: string };

/** Deliberately generic: a failed write must not describe server or account state back to the browser. */
function saveErrorMessage(result: SiteContentResult): string {
  if (result.status !== "error") return "Something went wrong.";
  if (result.reason === "stale") return "This page changed elsewhere. Reload before saving again.";
  if (result.reason === "not_found") return "There is no saved draft to use.";
  if (result.reason === "forbidden") return "Your account is no longer allowed to edit this page.";
  if (result.reason === "invalid") return "Some changes could not be stored.";
  return "Saving is unavailable right now.";
}

function saveStatusLabel(status: SaveStatus): string {
  switch (status.kind) {
    case "pending": return "Saving…";
    case "saved": return "Draft saved";
    case "published": return "Published";
    case "discarded": return "Draft discarded";
    case "error": return status.message;
    default: return "";
  }
}

const EditorContext = createContext<EditorContextValue | null>(null);
const shadowValues = { none: "none", soft: "0 8px 24px rgba(0,0,0,.16)", medium: "0 16px 42px rgba(0,0,0,.26)", strong: "0 24px 64px rgba(0,0,0,.38)" } as const;

function layoutPath(snapshot: EditorContextValue["snapshot"], id: string, breakpoint: EditorBreakpoint): string[] {
  const path = [id];
  let parentId = resolveLayoutPlacement(snapshot.layout, id, breakpoint)?.parentId;
  while (parentId) { path.push(parentId); parentId = resolveLayoutPlacement(snapshot.layout, parentId, breakpoint)?.parentId; }
  return path;
}

function flattenedLayout(snapshot: EditorContextValue["snapshot"], breakpoint: EditorBreakpoint): string[] {
  const result: string[] = [];
  const visit = (id: string) => { result.push(id); resolveLayoutChildren(snapshot.layout, id, breakpoint).forEach(visit); };
  visit(snapshot.layout.rootId);
  return result;
}

function layoutHostOwner(snapshot: EditorContextValue["snapshot"], parentId: string, breakpoint: EditorBreakpoint): HomepageBlockId | null {
  const parent = snapshot.layout.nodes[parentId];
  if (parent?.type === "block") return parent.id as HomepageBlockId;
  if (parent?.type !== "column") return null;
  return (resolveLayoutChildren(snapshot.layout, parentId, breakpoint).find((id) => snapshot.layout.nodes[id]?.type === "block") as HomepageBlockId | undefined) ?? null;
}

function blockUsesLayoutHost(snapshot: EditorContextValue["snapshot"], blockId: HomepageBlockId, breakpoint: EditorBreakpoint): boolean {
  return homepageTargetRegistry.some((target) => {
    if (target.kind === "block" || layoutPlacementSource(snapshot.layout, target.id, breakpoint) === "public") return false;
    const effectiveParent = resolveLayoutPlacement(snapshot.layout, target.id, breakpoint)?.parentId;
    return target.parentId === blockId || Boolean(effectiveParent && layoutHostOwner(snapshot, effectiveParent, breakpoint) === blockId);
  });
}

function useEditorTarget(id: HomepageTargetId) {
  const editor = useContext(EditorContext);
  const target = editor?.snapshot.targets[id];
  const path = editor ? layoutPath(editor.snapshot, id, editor.breakpoint) : [];
  const layoutVisible = editor ? path.every((nodeId) => resolveLayoutValue(editor.snapshot.layout, nodeId, editor.breakpoint, "visible") !== false) : true;
  const responsive = editor ? Object.fromEntries([
    "visible", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginBottom", "maxWidth", "fontSize", "textAlign", "flexDirection", "gap", "objectPosition",
  ].map((key) => [key, resolveResponsiveValue(target, editor.breakpoint, key as keyof ResponsiveStyle)])) as ResponsiveStyle : {};
  const global = target?.global ?? {};
  const style: CSSProperties & Record<string, string | number | undefined> = {
    display: responsive.visible === false || !layoutVisible ? "none" : undefined,
    paddingTop: responsive.paddingTop, paddingRight: responsive.paddingRight, paddingBottom: responsive.paddingBottom, paddingLeft: responsive.paddingLeft,
    marginTop: responsive.marginTop, marginBottom: responsive.marginBottom, maxWidth: responsive.maxWidth,
    fontSize: responsive.fontSize, textAlign: responsive.textAlign, flexDirection: responsive.flexDirection, gap: responsive.gap,
    fontWeight: global.fontWeight, lineHeight: global.lineHeight, letterSpacing: global.letterSpacing, textTransform: global.textTransform,
    color: global.textColor, backgroundColor: global.backgroundColor, borderColor: global.borderColor, borderWidth: global.borderWidth,
    borderStyle: global.borderWidth === undefined ? undefined : "solid", borderRadius: global.borderRadius, boxShadow: global.shadow ? shadowValues[global.shadow] : undefined,
    overflow: global.overflow, width: global.width, minHeight: global.minHeight, alignItems: global.alignItems, justifyContent: global.justifyContent,
    objectFit: global.objectFit, objectPosition: responsive.objectPosition,
    "--public-muted": global.mutedColor,
    "--public-gold": global.accentColor,
  };
  if (global.maxTextWidth !== undefined) style.maxWidth = global.maxTextWidth;
  if (global.widthPreset) style.width = global.widthPreset === "full" ? "100%" : global.widthPreset === "two-thirds" ? "66.667%" : global.widthPreset === "half" ? "50%" : global.widthPreset === "third" ? "33.333%" : undefined;
  if (global.imageSizePreset) style.maxWidth = global.imageSizePreset === "full" ? "100%" : global.imageSizePreset === "large" ? 960 : global.imageSizePreset === "medium" ? 640 : 320;
  if (global.radiusPreset) style.borderRadius = global.radiusPreset === "rounded" ? 24 : global.radiusPreset === "slightly-rounded" ? 8 : 0;
  if (editor?.mode === "layout") style.order = flattenedLayout(editor.snapshot, editor.breakpoint).indexOf(id);
  return { editor, target, content: { ...editor?.defaults[id], ...target?.content }, global, responsive, style, selected: editor?.selectedId === id, path };
}

function clipRect(rect: DOMRect, canvas: DOMRect) {
  const left = Math.max(rect.left, canvas.left); const right = Math.min(rect.right, canvas.right);
  const top = Math.max(rect.top, canvas.top); const bottom = Math.min(rect.bottom, canvas.bottom);
  return right > left && bottom > top ? { left, top, right, bottom, width: right - left, height: bottom - top } : null;
}

function canvasRectContainsPoint(rect: CanvasRect, point: CanvasPoint): boolean {
  return point.x >= rect.left && point.x <= rect.left + rect.width && point.y >= rect.top && point.y <= rect.top + rect.height;
}

function canvasDropVisualRect(intent: CanvasDropIntent, targetRect: CanvasRect, destinationRect: CanvasRect | null): CanvasRect {
  if (intent === "inside") return targetRect;
  const hostRect = destinationRect ?? targetRect;
  if (intent === "before" || intent === "after") {
    const availableLeft = Math.max(targetRect.left, hostRect.left);
    const availableRight = Math.min(targetRect.left + targetRect.width, hostRect.left + hostRect.width);
    const width = Math.min(240, Math.max(2, availableRight - availableLeft));
    const center = Math.min(availableRight - width / 2, Math.max(availableLeft + width / 2, targetRect.left + targetRect.width / 2));
    const boundary = intent === "before" ? targetRect.top : targetRect.top + targetRect.height;
    return { left: center - width / 2, top: boundary - 1, width, height: 2 };
  }
  const availableTop = Math.max(targetRect.top, hostRect.top);
  const availableBottom = Math.min(targetRect.top + targetRect.height, hostRect.top + hostRect.height);
  const height = Math.min(160, Math.max(2, availableBottom - availableTop));
  const center = Math.min(availableBottom - height / 2, Math.max(availableTop + height / 2, targetRect.top + targetRect.height / 2));
  const boundary = intent === "left" ? targetRect.left : targetRect.left + targetRect.width;
  return { left: boundary - 1, top: center - height / 2, width: 2, height };
}

function collectCanvasNodeBounds(root: HTMLElement, tree: EditorContextValue["snapshot"]["layout"], breakpoint: EditorBreakpoint) {
  const canvasRect = root.getBoundingClientRect();
  const elements = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>("[data-canvas-node-id]").forEach((element) => {
    const id = element.dataset.canvasNodeId;
    const current = id ? elements.get(id) : undefined;
    const area = element.offsetWidth * element.offsetHeight;
    if (id && element.getClientRects().length && (!current || area > current.offsetWidth * current.offsetHeight)) elements.set(id, element);
  });
  const bounds = new Map<string, NonNullable<ReturnType<typeof clipRect>>>();
  for (const [id, element] of elements) {
    const clipped = clipRect(element.getBoundingClientRect(), canvasRect);
    if (clipped) bounds.set(id, clipped);
  }
  const resolveBounds = (id: string, visiting = new Set<string>()): NonNullable<ReturnType<typeof clipRect>> | null => {
    const direct = bounds.get(id); if (direct) return direct;
    if (visiting.has(id)) return null; visiting.add(id);
    const children = resolveLayoutChildren(tree, id, breakpoint).map((childId) => resolveBounds(childId, visiting)).filter((rect): rect is NonNullable<ReturnType<typeof clipRect>> => Boolean(rect));
    visiting.delete(id);
    if (!children.length) return null;
    const left = Math.min(...children.map((rect) => rect.left)); const right = Math.max(...children.map((rect) => rect.right));
    const top = Math.min(...children.map((rect) => rect.top)); const bottom = Math.max(...children.map((rect) => rect.bottom));
    const combined = { left, right, top, bottom, width: right - left, height: bottom - top };
    bounds.set(id, combined); return combined;
  };
  Object.keys(tree.nodes).forEach((id) => resolveBounds(id));
  return bounds;
}

function collectCanvasDropZones(root: HTMLElement, tree: EditorContextValue["snapshot"]["layout"], payload: CanvasDragPayload): CanvasDropZone[] {
  const bounds = collectCanvasNodeBounds(root, tree, payload.breakpoint);
  const zones: CanvasDropZone[] = [];
  const add = (targetId: string, intent: CanvasDropIntent, rect: CanvasRect) => {
    const move = resolveCanvasDropMove(tree, payload, targetId, intent);
    if (!move || rect.width < 8 || rect.height < 8) return;
    const key = `${targetId}:${intent}`;
    const targetRect = bounds.get(targetId) ?? rect;
    const destinationRect = bounds.get(move.parentId) ?? null;
    zones.push({ ...move, key, rect, visualRect: canvasDropVisualRect(intent, targetRect, destinationRect), destinationRect, sameHost: move.parentId === payload.parentId, sameLevel: tree.nodes[targetId]?.type === payload.nodeType });
  };
  for (const [targetId, clipped] of bounds) {
    if (targetId === payload.nodeId) continue;
    const placement = resolveLayoutPlacement(tree, targetId, payload.breakpoint);
    const parent = placement ? tree.nodes[placement.parentId] : undefined;
    const horizontal = parent?.type === "row" && resolveLayoutValue(tree, parent.id, payload.breakpoint, "direction") !== "column";
    const thickness = Math.min(32, Math.max(22, horizontal ? clipped.width * .16 : clipped.height * .2));
    if (horizontal) {
      add(targetId, "left", { left: clipped.left - thickness / 2, top: clipped.top, width: thickness, height: clipped.height });
      add(targetId, "right", { left: clipped.right - thickness / 2, top: clipped.top, width: thickness, height: clipped.height });
    } else {
      add(targetId, "before", { left: clipped.left, top: clipped.top - thickness / 2, width: clipped.width, height: thickness });
      add(targetId, "after", { left: clipped.left, top: clipped.bottom - thickness / 2, width: clipped.width, height: thickness });
    }
    const insideHeight = Math.min(48, Math.max(28, clipped.height * .28));
    const insideWidth = Math.min(clipped.width - 8, Math.max(88, clipped.width * .55));
    add(targetId, "inside", { left: clipped.left + (clipped.width - insideWidth) / 2, top: clipped.top + (clipped.height - insideHeight) / 2, width: insideWidth, height: insideHeight });
  }
  return zones;
}

function activeCanvasDropZone(zones: CanvasDropZone[], point: CanvasPoint): CanvasDropZone | null {
  const sourceHostRect = zones.find((zone) => zone.sameHost && zone.destinationRect)?.destinationRect ?? null;
  const pointerInSourceHost = Boolean(sourceHostRect && canvasRectContainsPoint(sourceHostRect, point));
  return zones.filter((zone) => canvasRectContainsPoint(zone.rect, point) && (
    zone.sameHost ? !sourceHostRect || pointerInSourceHost : !zone.destinationRect || canvasRectContainsPoint(zone.destinationRect, point)
  )).sort((left, right) => (
    (left.sameLevel ? 0 : 1) - (right.sameLevel ? 0 : 1)
    ||
    (pointerInSourceHost && left.sameHost ? 0 : 1) - (pointerInSourceHost && right.sameHost ? 0 : 1)
    || (left.intent === "inside" ? 1 : 0) - (right.intent === "inside" ? 1 : 0)
    || left.rect.width * left.rect.height - right.rect.width * right.rect.height
  ))[0] ?? null;
}

function selectionProps(id: HomepageTargetId, selected: boolean | undefined, editor: EditorContextValue | null | undefined) {
  if (!editor) return {};
  return {
    className: `${styles.editableElement} ${selected ? styles.selectedElement : ""} ${editor.canvasDrag?.payload.nodeId === id ? styles.draggedSource : ""}`,
    "data-editor-target": id,
    "data-canvas-node-id": id,
    onClickCapture: (event: React.MouseEvent) => { event.preventDefault(); event.stopPropagation(); editor.dispatch({ type: "select", id }); },
    onKeyDown: (event: React.KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); editor.dispatch({ type: "select", id }); } },
    tabIndex: 0,
    role: "button",
    "aria-pressed": Boolean(selected),
    "aria-label": `Edit ${homepageTargetById[id].label}`,
  };
}

export function HomepageLayoutItem({ id, children, className }: { id: HomepageElementId; children: ReactNode; className?: string }) {
  const editor = useContext(EditorContext);
  const placement = editor ? resolveLayoutPlacement(editor.snapshot.layout, id, editor.breakpoint) : null;
  const definition = homepageTargetById[id];
  const destinationBlock = editor && placement ? layoutHostOwner(editor.snapshot, placement.parentId, editor.breakpoint) : null;
  const sourceBlock = definition.parentId;
  const shouldPortal = Boolean(editor?.active && editor.mode === "layout" && sourceBlock && (
    blockUsesLayoutHost(editor.snapshot, sourceBlock, editor.breakpoint) || (destinationBlock && blockUsesLayoutHost(editor.snapshot, destinationBlock, editor.breakpoint))
  ));
  const host = placement ? editor?.hosts.get(placement.parentId) : null;
  if (!shouldPortal || !placement || !host) return children;
  const order = resolveLayoutChildren(editor!.snapshot.layout, placement.parentId, editor!.breakpoint).indexOf(id);
  return createPortal(<div className={`${styles.layoutItem} ${className ?? ""}`} data-layout-item={id} data-canvas-node-id={id} style={{ order }}>{children}</div>, host);
}

function LayoutHost({ id, className, order, children }: { id: string; className: string; order?: number; children?: ReactNode }) {
  const editor = useContext(EditorContext);
  const registerHost = editor?.registerHost;
  const hostRef = useCallback((node: HTMLDivElement | null) => { registerHost?.(id, node); }, [id, registerHost]);
  return <div ref={hostRef} className={className} data-layout-host={id} data-canvas-node-id={id} style={order === undefined ? undefined : { order }}>{children}</div>;
}

function GeneratedLayoutCanvas() {
  const editor = useContext(EditorContext);
  if (!editor || editor.mode !== "layout") return null;
  const tree = editor.snapshot.layout;
  const containers = Object.values(tree.nodes).filter((node) => node.generated && ["section", "row", "column"].includes(node.type));
  const emptyColumns = Object.values(tree.nodes).filter((node) => node.type === "column" && !resolveLayoutChildren(tree, node.id, editor.breakpoint).some((id) => tree.nodes[id]?.type === "block"));
  if (!containers.length && !emptyColumns.length) return null;
  const columnIds = new Set(emptyColumns.map((node) => node.id));
  return <aside className={styles.generatedCanvas} aria-label="Generated layout containers"><strong>Empty layout containers</strong>
    {containers.filter((node) => node.type !== "column").map((node) => <button key={node.id} type="button" className={styles.generatedContainer} aria-pressed={editor.selectedId === node.id} onClick={() => editor.dispatch({ type: "select", id: node.id })}><span>{node.label}</span><small>{resolveLayoutChildren(tree, node.id, editor.breakpoint).length ? node.type : `Empty ${node.type}`}</small></button>)}
    {[...columnIds].map((id) => {
      const node = tree.nodes[id]; const children = resolveLayoutChildren(tree, id, editor.breakpoint);
      return <LayoutHost key={id} id={id} className={styles.generatedColumn}><button type="button" aria-pressed={editor.selectedId === id} onClick={() => editor.dispatch({ type: "select", id })}>
        <span>{node.label}</span><small>{children.length ? `${children.length} item${children.length === 1 ? "" : "s"}` : "Drop compatible content here"}</small></button></LayoutHost>;
    })}
  </aside>;
}

function CanvasContainerSelectionLayer({ boundaries, selectedId, dispatch }: { boundaries: CanvasContainerBoundary[]; selectedId: string; dispatch: React.Dispatch<EditorAction> }) {
  return <div className={styles.containerSelectionLayer} aria-label="Layout container boundaries">{boundaries.map((boundary) => {
    const selected = boundary.id === selectedId;
    const select = (event: React.MouseEvent) => { event.preventDefault(); event.stopPropagation(); dispatch({ type: "select", id: boundary.id }); };
    return <div key={boundary.id} className={`${styles.containerSelectionBoundary} ${selected ? styles.selectedContainerBoundary : ""}`} data-container-boundary-id={boundary.id} style={{ left: boundary.rect.left, top: boundary.rect.top, width: boundary.rect.width, height: boundary.rect.height }}>
      <button type="button" className={`${styles.containerBoundaryEdge} ${styles.containerBoundaryTop}`} aria-label="Select outer area from top boundary" onClick={select} />
      <button type="button" className={`${styles.containerBoundaryEdge} ${styles.containerBoundaryRight}`} aria-label="Select outer area from right boundary" onClick={select} />
      <button type="button" className={`${styles.containerBoundaryEdge} ${styles.containerBoundaryBottom}`} aria-label="Select outer area from bottom boundary" onClick={select} />
      <button type="button" className={`${styles.containerBoundaryEdge} ${styles.containerBoundaryLeft}`} aria-label="Select outer area from left boundary" onClick={select} />
      {selected ? <span className={styles.selectedContainerLabel}>Selected area</span> : null}
    </div>;
  })}</div>;
}

export function HomepageEditableSection({ id, children }: { id: HomepageBlockId; children: ReactNode }) {
  const { editor, target, responsive, style, selected, path } = useEditorTarget(id);
  // Outside edit mode a block is deliberately not wrapped in an element. The
  // editor's wrapper carries its own sizing rules, so emitting it publicly would
  // shift the untouched layout. Hiding is the one block-level override that
  // applies without a wrapper, so it is the one honoured here; block padding and
  // background remain preview-only until the public page renders the layout tree.
  if (!editor?.active) return responsive.visible === false ? null : children;
  const definition = homepageTargetById[id];
  const legacyOrder = definition.group ? editor.snapshot.order[definition.group].indexOf(id) : 0;
  const layoutOrder = flattenedLayout(editor.snapshot, editor.breakpoint).indexOf(id);
  const visible = responsive.visible !== false && path.every((nodeId) => resolveLayoutValue(editor.snapshot.layout, nodeId, editor.breakpoint, "visible") !== false);
  const columnId = path.find((nodeId) => editor.snapshot.layout.nodes[nodeId]?.type === "column");
  const rowId = path.find((nodeId) => editor.snapshot.layout.nodes[nodeId]?.type === "row");
  const containerId = columnId ?? rowId;
  const containerStyle = containerId ? {
    backgroundColor: resolveLayoutValue(editor.snapshot.layout, containerId, editor.breakpoint, "background"),
    borderColor: resolveLayoutValue(editor.snapshot.layout, containerId, editor.breakpoint, "borderColor"),
    borderWidth: resolveLayoutValue(editor.snapshot.layout, containerId, editor.breakpoint, "borderWidth"),
    borderStyle: resolveLayoutValue(editor.snapshot.layout, containerId, editor.breakpoint, "borderWidth") === undefined ? undefined : "solid",
    minHeight: resolveLayoutValue(editor.snapshot.layout, containerId, editor.breakpoint, "minHeight"),
    padding: resolveLayoutValue(editor.snapshot.layout, containerId, editor.breakpoint, "padding"),
  } : {};
  const rowDirection = rowId ? resolveLayoutValue(editor.snapshot.layout, rowId, editor.breakpoint, "direction") : undefined;
  const rowPreset = rowId ? resolveLayoutValue(editor.snapshot.layout, rowId, editor.breakpoint, "preset") : undefined;
  const rowGapPreset = rowId ? resolveLayoutValue(editor.snapshot.layout, rowId, editor.breakpoint, "gapPreset") : undefined;
  const rowGap = rowId ? resolveLayoutValue(editor.snapshot.layout, rowId, editor.breakpoint, "gap") ?? (rowGapPreset === "compact" ? 8 : rowGapPreset === "spacious" ? 32 : rowGapPreset === "normal" ? 18 : undefined) : undefined;
  const rowAlign = rowId ? resolveLayoutValue(editor.snapshot.layout, rowId, editor.breakpoint, "alignItems") : undefined;
  const rowJustify = rowId ? resolveLayoutValue(editor.snapshot.layout, rowId, editor.breakpoint, "justifyContent") : undefined;
  const columnWidth = columnId ? resolveLayoutValue(editor.snapshot.layout, columnId, editor.breakpoint, "width") : undefined;
  const widthGridColumn = columnWidth === "full" || rowDirection === "column" || rowPreset === "one" ? "1 / -1" : columnWidth === "two-thirds" ? "span 2" : undefined;
  const blockStyle = { ...style, ...containerStyle, display: undefined, flexDirection: undefined, gap: undefined, alignItems: undefined, justifyContent: undefined, order: editor.mode === "layout" ? layoutOrder : legacyOrder, gridColumn: widthGridColumn, width: columnWidth === "half" ? "50%" : columnWidth === "third" ? "33.333%" : style.width, margin: rowGap === undefined ? undefined : `${rowGap / 2}px`, alignSelf: rowAlign, justifySelf: rowJustify === "space-between" ? "stretch" : rowJustify, "--editor-flex-direction": responsive.flexDirection, "--editor-layout-gap": responsive.gap === undefined ? undefined : `${responsive.gap}px`, "--editor-align-items": target?.global?.alignItems, "--editor-justify-content": target?.global?.justifyContent } as CSSProperties & Record<string, string | number | undefined>;
  const layoutHostActive = editor.mode === "layout" && blockUsesLayoutHost(editor.snapshot, id, editor.breakpoint);
  const blockPlacement = resolveLayoutPlacement(editor.snapshot.layout, id, editor.breakpoint);
  const draggedAsColumn = editor.canvasDrag ? resolveLayoutChildren(editor.snapshot.layout, editor.canvasDrag.payload.nodeId, editor.breakpoint).includes(id) : false;
  // Block selection is delegated to this wrapper rather than handled by the
  // overlay below, which no longer takes pointer events. A click is treated as
  // selecting the block only when it did not land on a nested editable node, so
  // inner elements keep their own click and double-click handling.
  const selectBlockFromEmptyArea = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-canvas-node-id]") !== event.currentTarget) return;
    editor.dispatch({ type: "select", id });
  };
  return <div className={`${styles.editableSection} ${styles[`${id}Block`]} ${selected ? styles.selectedSection : ""} ${editor.canvasDrag?.payload.nodeId === id || draggedAsColumn ? styles.draggedSource : ""} ${!visible ? styles.hiddenSection : ""}`} data-section-id={id} data-canvas-node-id={id} data-flex-direction={responsive.flexDirection} data-layout={target?.global?.layoutPreset} data-layout-row-preset={rowPreset} data-layout-row-direction={rowDirection} data-image-placement={target?.global?.imagePlacement} style={blockStyle} onClick={selectBlockFromEmptyArea}>
    {visible ? layoutHostActive && columnId ? <><LayoutHost id={columnId} className={styles.layoutColumnHost}><LayoutHost id={id} className={styles.layoutHost} order={blockPlacement?.index ?? 0} /></LayoutHost><div className={styles.layoutSource}>{children}</div></> : children : <div className={styles.hiddenPlaceholder}><span>Hidden block</span><strong>{definition.label}</strong><small>Select to restore visibility</small></div>}
    <button type="button" className={styles.selectionTarget} aria-label={`Edit ${definition.label} block`} aria-pressed={selected} onClick={() => editor.dispatch({ type: "select", id })} />
    <span className={styles.sectionTag} aria-hidden="true">{definition.label}</span>
  </div>;
}

function targetHasTextOverride(target: TargetOverride | undefined): boolean { return target?.content?.text !== undefined; }

function insertPlainTextAtSelection(text: string) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node); range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
}

function EditablePlainValue({ id, field = "text", value, multiline = false, children }: { id: HomepageElementId; field?: "text" | "description"; value: string; multiline?: boolean; children?: ReactNode }) {
  const editor = useContext(EditorContext);
  const [editing, setEditing] = useState(false);
  const startEditing = (event: React.MouseEvent) => { if (!editor?.active) return; event.preventDefault(); event.stopPropagation(); editor.dispatch({ type: "select", id }); setEditing(true); const element = event.currentTarget as HTMLElement; requestAnimationFrame(() => element.focus()); };
  const finish = (element: HTMLElement, commit: boolean) => {
    if (commit) {
      const normalized = finalizeInlineText(value, element.innerText || element.textContent || "", multiline, true);
      if (normalized) editor?.dispatch({ type: "content", id, key: field, value: normalized });
    }
    setEditing(false);
  };
  if (!editor?.active) return <>{children ?? value}</>;
  return <span data-editor-inline={field === "text" ? id : undefined} className={editing ? styles.inlineEditing : styles.inlineEditable}
    contentEditable={editing} suppressContentEditableWarning role={editing ? "textbox" : undefined} aria-multiline={editing ? multiline : undefined}
    tabIndex={editing ? 0 : undefined} onDoubleClick={startEditing}
    onFocus={(event) => { if (editing) { const selection = window.getSelection(); selection?.selectAllChildren(event.currentTarget); selection?.collapseToEnd(); } }}
    onBlur={(event) => { if (editing) finish(event.currentTarget, true); }}
    onPaste={(event) => { if (!editing) return; event.preventDefault(); insertPlainTextAtSelection(normalizeInlineText(event.clipboardData.getData("text/plain"), multiline)); }}
    onKeyDown={(event) => {
      if (!editing) return;
      if (event.key === "Escape") { event.preventDefault(); event.currentTarget.textContent = value; finish(event.currentTarget, false); }
      else if (event.key === "Enter" && !(multiline && event.shiftKey)) { event.preventDefault(); finish(event.currentTarget, true); }
      else if (event.key === "Enter" && multiline && event.shiftKey) { event.preventDefault(); insertPlainTextAtSelection("\n"); }
    }}>{editing ? value : children ?? value}</span>;
}

export function HomepageEditableText({ id, as = "span", className, defaultValue, defaultChildren }: { id: HomepageElementId; as?: ElementType; className?: string; defaultValue: string; defaultChildren?: ReactNode }) {
  const { editor, content, style, selected } = useEditorTarget(id);
  const Tag = as;
  const value = content.text ?? defaultValue;
  // Outside edit mode the provider still carries the published document, so the
  // stored text and style render for anonymous visitors. `defaultChildren` keeps
  // its shipped markup (line breaks, nested tags) until the text is overridden.
  if (!editor?.active) return <Tag className={className} style={style}>{content.text === undefined ? defaultChildren ?? defaultValue : value}</Tag>;
  const props = selectionProps(id, selected, editor) as React.HTMLAttributes<HTMLElement> & { className?: string };
  return <Tag {...props} className={`${className ?? ""} ${props.className}`} style={style}><EditablePlainValue id={id} value={value} multiline={Boolean(homepageTargetById[id].multiline)}>{targetHasTextOverride(editor.snapshot.targets[id]) ? value : defaultChildren ?? value}</EditablePlainValue></Tag>;
}

type LinkVariant = "plain" | "quick" | "rail";
export function HomepageEditableLink({ id, defaultText, defaultDescription = "", defaultUrl, className, external = false, variant = "plain", index, kicker, numberClass, platform }: { id: HomepageElementId; defaultText: string; defaultDescription?: string; defaultUrl: string; className?: string; external?: boolean; variant?: LinkVariant; index?: string; kicker?: string; numberClass?: string; platform?: CmsVideoPlatform }) {
  const { editor, content, global, style, selected } = useEditorTarget(id);
  const text = content.text ?? defaultText;
  const description = content.description ?? defaultDescription;
  const candidateUrl = content.url ?? defaultUrl;
  const safeUrl = isSafeLinkUrl(candidateUrl, !external) ? candidateUrl : defaultUrl;
  const props = (editor?.active ? selectionProps(id, selected, editor) : {}) as React.HTMLAttributes<HTMLElement> & { className?: string };
  const presetStyle: CSSProperties = global.buttonStylePreset === "primary" ? { backgroundColor: "var(--public-gold)", color: "var(--public-ink)" } : global.buttonStylePreset === "secondary" ? { backgroundColor: "transparent", color: "var(--public-paper)", borderColor: "var(--public-gold)", borderWidth: 1, borderStyle: "solid" } : global.buttonStylePreset === "text" ? { backgroundColor: "transparent", color: "var(--public-gold)", borderWidth: 0 } : {};
  const linkStyle = { ...style, ...presetStyle, backgroundColor: global.buttonBackground ?? presetStyle.backgroundColor ?? style.backgroundColor, color: global.buttonTextColor ?? presetStyle.color ?? style.color };
  const editableText = <EditablePlainValue id={id} value={text} multiline={Boolean(homepageTargetById[id].multiline)} />;
  const editableDescription = <EditablePlainValue id={id} field="description" value={description} multiline />;
  const body = variant === "quick" ? <><span>{index}</span><strong>{editableText}</strong><small>{editableDescription}</small></> : variant === "rail" ? <><span className={numberClass}>{index}</span><div><small>{description ? editableDescription : kicker}</small><strong>{editableText}</strong></div><b aria-hidden="true">↗</b></> : <>{platform ? <VideoPlatformIcon platform={platform} className="size-4" /> : null}{editableText}</>;
  const mergedClass = `${className ?? ""} ${props.className ?? ""}`;
  if (editor && !editor.active && resolveResponsiveValue(editor.snapshot.targets[id], editor.breakpoint, "visible") === false) return null;
  if (external) return <a {...props} href={safeUrl} target="_blank" rel="noopener noreferrer" className={mergedClass} style={linkStyle}>{body}</a>;
  return <Link {...props} href={safeUrl} className={mergedClass} style={linkStyle}>{body}</Link>;
}

export function HomepageEditableImage({ id, defaultSrc, defaultAlt, className, sizes, fill = true, priority = false }: { id: HomepageElementId; defaultSrc: string; defaultAlt: string; className?: string; sizes: string; fill?: boolean; priority?: boolean }) {
  const { editor, content, responsive, global, selected } = useEditorTarget(id);
  const candidate = content.imageSrc;
  // Absolute sources must be HTTPS; same-origin paths are accepted so an editor
  // can point at an asset already served by this site.
  const src = candidate && (isSafeExternalUrl(candidate, true) || isSafeInternalAssetPath(candidate)) ? candidate : defaultSrc;
  const visible = responsive.visible !== false;
  const mediaStyle = { objectFit: global.objectFit ?? "cover", objectPosition: responsive.objectPosition ?? "center" } as CSSProperties;
  if (!editor?.active) {
    if (!visible) return null;
    return src.startsWith("https://")
      ? <img src={src} alt={content.alt ?? defaultAlt} className={className} style={mediaStyle} />
      : <Image src={src} alt={content.alt ?? defaultAlt} fill={fill} priority={priority} sizes={sizes} className={className} style={mediaStyle} />;
  }
  return <span className={`${styles.imageEditor} ${selected ? styles.selectedElement : ""} ${editor.canvasDrag?.payload.nodeId === id ? styles.draggedSource : ""}`} data-canvas-node-id={id}>
    {visible ? src.startsWith("https://") ? <img src={src} alt={content.alt ?? defaultAlt} className={className} style={mediaStyle} /> : <Image src={src} alt={content.alt ?? defaultAlt} fill={fill} priority={priority} sizes={sizes} className={className} style={mediaStyle} /> : <span className={styles.hiddenElement}>Image hidden</span>}
    <button type="button" className={styles.elementSelectionTarget} aria-label={`Edit ${homepageTargetById[id].label}`} aria-pressed={selected} onClick={() => editor.dispatch({ type: "select", id })} />
  </span>;
}

export function HomepageEditableMedia({ id, title, platform, defaultUrl, sizes, className }: { id: HomepageElementId; title: string; platform: CmsVideoPlatform; defaultUrl: string; sizes: string; className?: string }) {
  const { editor, content, responsive, selected } = useEditorTarget(id);
  const candidate = content.url;
  const url = candidate && isSafeExternalUrl(candidate) ? candidate : defaultUrl;
  if (!editor?.active) {
    if (responsive.visible === false) return null;
    return <div className={className}><VideoHoverPreview title={title} platform={platform} videoUrl={url} sizes={sizes} /></div>;
  }
  return <div className={`${className ?? ""} ${styles.mediaEditor} ${selected ? styles.selectedElement : ""} ${editor.canvasDrag?.payload.nodeId === id ? styles.draggedSource : ""}`} data-canvas-node-id={id}>{responsive.visible === false ? <div className={styles.hiddenElement}>Video preview hidden</div> : <CmsVideoPreview title={title} platform={platform} videoUrl={url} sizes={sizes} editorial />}<button type="button" className={styles.elementSelectionTarget} aria-label="Edit latest video preview" aria-pressed={selected} onClick={() => editor.dispatch({ type: "select", id })} /></div>;
}

export function HomepageEditableProviderBadge({ id, platform, defaultLabel }: { id: HomepageElementId; platform: CmsVideoPlatform; defaultLabel: string }) {
  const { editor, content, selected } = useEditorTarget(id);
  if (!editor?.active) return <VideoPlatformBadge platform={platform} label={content.text ?? defaultLabel} />;
  return <span className={`${styles.badgeEditor} ${selected ? styles.selectedElement : ""} ${editor.canvasDrag?.payload.nodeId === id ? styles.draggedSource : ""}`} data-canvas-node-id={id}><VideoPlatformBadge platform={platform} label={content.text ?? defaultLabel} /><button type="button" className={styles.elementSelectionTarget} aria-label="Edit provider label" aria-pressed={selected} onClick={() => editor.dispatch({ type: "select", id })} /></span>;
}

function ResetButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) { return <button type="button" className={styles.resetButton} disabled={disabled} onClick={onClick} aria-label={`Reset ${label} to Public V3 default`}>Reset</button>; }

function TextControl({ label, value, defaultValue, multiline, onChange, onReset }: { label: string; value: string | undefined; defaultValue: string; multiline?: boolean; onChange: (value: string) => void; onReset: () => void }) {
  return <div className={styles.field}><div className={styles.fieldLabel}><label htmlFor={`field-${label}`}>{label}</label><ResetButton label={label} disabled={value === undefined} onClick={onReset} /></div>{multiline ? <textarea id={`field-${label}`} rows={3} value={value ?? defaultValue} onChange={(event) => onChange(event.target.value)} /> : <input id={`field-${label}`} value={value ?? defaultValue} onChange={(event) => onChange(event.target.value)} />}</div>;
}

function UrlControl({ label, value, defaultValue, allowInternal, httpsOnly, onCommit, onReset }: { label: string; value: string | undefined; defaultValue: string; allowInternal: boolean; httpsOnly?: boolean; onCommit: (value: string) => void; onReset: () => void }) {
  const [draft, setDraft] = useState(value ?? defaultValue);
  const valid = draft === defaultValue || (allowInternal ? isSafeLinkUrl(draft, true) : isSafeExternalUrl(draft, httpsOnly));
  return <div className={styles.field}><div className={styles.fieldLabel}><label htmlFor={`url-${label}`}>{label}</label><ResetButton label={label} disabled={value === undefined} onClick={() => { setDraft(defaultValue); onReset(); }} /></div><input id={`url-${label}`} type="url" value={draft} aria-invalid={!valid} onChange={(event) => { const next = event.target.value; setDraft(next); if (allowInternal ? isSafeLinkUrl(next, true) : isSafeExternalUrl(next, httpsOnly)) onCommit(next); }} /><small className={valid ? styles.fieldHint : styles.fieldError}>{valid ? httpsOnly ? "HTTPS URL" : "Safe URL" : "Enter a safe URL"}</small></div>;
}

function NumberControl({ label, value, source, min, max, step = 1, unit = "px", onChange, onReset }: { label: string; value: number | undefined; source?: string; min: number; max: number; step?: number; unit?: string; onChange: (value: number | undefined) => void; onReset: () => void }) {
  return <div className={styles.field}><div className={styles.fieldLabel}><label htmlFor={`number-${label}`}>{label}{source ? <small> · {source}</small> : null}</label><ResetButton label={label} disabled={value === undefined} onClick={onReset} /></div><div className={styles.numberControl}><input id={`number-${label}`} type="number" min={min} max={max} step={step} value={value ?? ""} placeholder="Public default" onChange={(event) => onChange(sanitizeNumber(event.target.value, min, max))} /><span aria-hidden="true">{unit}</span></div></div>;
}

function ColorControl({ label, value, onChange, onReset }: { label: string; value: string | undefined; onChange: (value: string) => void; onReset: () => void }) {
  return <div className={styles.colorField}><label>{label}</label><input type="color" value={value && isSafeColor(value) ? value : "#ffffff"} onChange={(event) => { if (isSafeColor(event.target.value)) onChange(event.target.value); }} /><code>{value ?? "Public default"}</code><ResetButton label={label} disabled={value === undefined} onClick={onReset} /></div>;
}

function SelectControl<T extends string>({ label, value, options, onChange, onReset }: { label: string; value: T | undefined; options: readonly T[]; onChange: (value: T | undefined) => void; onReset: () => void }) {
  return <div className={styles.field}><div className={styles.fieldLabel}><label>{label}</label><ResetButton label={label} disabled={value === undefined} onClick={onReset} /></div><select value={value ?? ""} onChange={(event) => onChange((event.target.value || undefined) as T | undefined)}><option value="">Public default</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
}

function ControlGroup({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) { return <details className={styles.controlGroup} open={open}><summary>{title}</summary><div className={styles.controlGroupBody}>{children}</div></details>; }

function LayoutTreeItem({ nodeId, state, dispatch, draggedId, setDraggedId, dropId, setDropId }: {
  nodeId: string; state: ReturnType<typeof createInitialEditorState>; dispatch: React.Dispatch<EditorAction>;
  draggedId: string | null; setDraggedId: (id: string | null) => void; dropId: string | null; setDropId: (id: string | null) => void;
}) {
  const tree = state.present.layout;
  const node = tree.nodes[nodeId];
  if (!node) return null;
  const children = resolveLayoutChildren(tree, nodeId, state.previewMode);
  const hidden = resolveLayoutValue(tree, nodeId, state.previewMode, "visible") === false;
  const placement = resolveLayoutPlacement(tree, node.id, state.previewMode);
  const parent = placement ? tree.nodes[placement.parentId] : null;
  const siblings = parent ? resolveLayoutChildren(tree, parent.id, state.previewMode) : [];
  const siblingIndex = siblings.indexOf(node.id);
  const parentPlacement = parent ? resolveLayoutPlacement(tree, parent.id, state.previewMode) : null;
  const parentSiblings = parentPlacement ? resolveLayoutChildren(tree, parentPlacement.parentId, state.previewMode) : [];
  const parentSiblingIndex = parent ? parentSiblings.indexOf(parent.id) : -1;
  const leftBlockHost = node.type === "block" && parentSiblingIndex > 0 ? tree.nodes[parentSiblings[parentSiblingIndex - 1]] : null;
  const rightBlockHost = node.type === "block" && parentSiblingIndex >= 0 && parentSiblingIndex < parentSiblings.length - 1 ? tree.nodes[parentSiblings[parentSiblingIndex + 1]] : null;
  const movableParent = node.movable ? null : nearestMovableLayoutParent(tree, node.id, state.previewMode);
  const resolveDrop = (sourceId: string, element: HTMLElement, clientX: number, clientY: number) => {
    const payload = createCanvasDragPayload(tree, sourceId, state.previewMode);
    if (!payload) return null;
    if (payload.nodeType === node.type) {
      const rect = element.getBoundingClientRect();
      const intent: CanvasDropIntent = node.type === "column" ? (clientX < rect.left + rect.width / 2 ? "left" : "right") : (clientY < rect.top + rect.height / 2 ? "before" : "after");
      const sameLevelMove = resolveCanvasDropMove(tree, payload, node.id, intent);
      if (sameLevelMove) return sameLevelMove;
    }
    return resolveCanvasDropMove(tree, payload, node.id, "inside");
  };
  const row = <div className={`${styles.treeRow} ${dropId?.startsWith(`${node.id}:`) ? styles.validDropTarget : ""}`} data-layout-tree-row data-drop-intent={dropId?.startsWith(`${node.id}:`) ? dropId.slice(node.id.length + 1) : undefined}
    onDragOver={(event) => { if (!draggedId) return; const move = resolveDrop(draggedId, event.currentTarget, event.clientX, event.clientY); if (move) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropId(`${node.id}:${move.intent}`); } }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && dropId?.startsWith(`${node.id}:`)) setDropId(null); }}
    onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData("text/plain") || draggedId; const move = id ? resolveDrop(id, event.currentTarget, event.clientX, event.clientY) : null; if (id && move) { dispatch({ type: "layout-move", id, parentId: move.parentId, index: move.index, breakpoint: state.previewMode }); dispatch({ type: "select", id }); } setDraggedId(null); setDropId(null); }}>
    <button type="button" className={styles.treeSelect} data-tree-select draggable={node.movable} aria-pressed={state.selectedId === node.id}
      onClick={() => dispatch({ type: "select", id: node.id })}
      onDragStart={(event) => { setDraggedId(node.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", node.id); }}
      onDragEnd={() => { setDraggedId(null); setDropId(null); }}
      onKeyDown={(event) => {
        const buttons = Array.from(event.currentTarget.closest("[role='tree']")?.querySelectorAll<HTMLButtonElement>("button[data-tree-select]") ?? []);
        const index = buttons.indexOf(event.currentTarget);
        if (event.key === "ArrowDown" && buttons[index + 1]) { event.preventDefault(); buttons[index + 1].focus(); }
        if (event.key === "ArrowUp" && buttons[index - 1]) { event.preventDefault(); buttons[index - 1].focus(); }
        if (event.key === "Home" && buttons[0]) { event.preventDefault(); buttons[0].focus(); }
        if (event.key === "End" && buttons.at(-1)) { event.preventDefault(); buttons.at(-1)?.focus(); }
      }}>
      <span>{node.label}</span><small>{node.movable ? node.type : "Moves with parent"}{hidden ? " · hidden" : ""}{children.length === 0 && node.type !== "element" ? " · empty" : ""}</small>
    </button>
    {node.movable && parent ? <div className={styles.treeActions}><button type="button" aria-label={`${node.type === "column" ? "Move left" : "Move up"}: ${node.label}`} disabled={siblingIndex <= 0} onClick={() => dispatch({ type: "layout-move", id: node.id, parentId: parent.id, index: siblingIndex - 1, breakpoint: state.previewMode })}>−</button><button type="button" aria-label={`${node.type === "column" ? "Move right" : "Move down"}: ${node.label}`} disabled={siblingIndex < 0 || siblingIndex >= siblings.length - 1} onClick={() => dispatch({ type: "layout-move", id: node.id, parentId: parent.id, index: siblingIndex + 1, breakpoint: state.previewMode })}>+</button>{node.type === "block" ? <><button type="button" aria-label={`Move left: ${node.label}`} disabled={!leftBlockHost || !canPlaceLayoutNode(tree, node.id, leftBlockHost.id, state.previewMode)} onClick={() => leftBlockHost && dispatch({ type: "layout-move", id: node.id, parentId: leftBlockHost.id, index: resolveLayoutChildren(tree, leftBlockHost.id, state.previewMode).length, breakpoint: state.previewMode })}>←</button><button type="button" aria-label={`Move right: ${node.label}`} disabled={!rightBlockHost || !canPlaceLayoutNode(tree, node.id, rightBlockHost.id, state.previewMode)} onClick={() => rightBlockHost && dispatch({ type: "layout-move", id: node.id, parentId: rightBlockHost.id, index: resolveLayoutChildren(tree, rightBlockHost.id, state.previewMode).length, breakpoint: state.previewMode })}>→</button></> : null}</div> : movableParent ? <button type="button" className={styles.treeParentAction} onClick={() => dispatch({ type: "select", id: movableParent.id })}>Select parent block</button> : null}
  </div>;
  if (!children.length) return <li role="treeitem" aria-selected={state.selectedId === node.id}>{row}</li>;
  return <li role="treeitem" aria-selected={state.selectedId === node.id}><details open={node.type === "page" || node.type === "section"}><summary><span className="sr-only">Toggle {node.label}</span></summary>{row}<ul role="group">{children.map((childId) => <LayoutTreeItem key={childId} nodeId={childId} state={state} dispatch={dispatch} draggedId={draggedId} setDraggedId={setDraggedId} dropId={dropId} setDropId={setDropId} />)}</ul></details></li>;
}

function OutlineDrawer({ state, dispatch, onClose }: { state: ReturnType<typeof createInitialEditorState>; dispatch: React.Dispatch<EditorAction>; onClose: () => void }) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  return <aside id="homepage-outline-drawer" className={styles.outlineDrawer} aria-label="Homepage outline"><div className={styles.panelHeading}><div><p>Page structure</p><h2>Outline</h2><small>Selection stays active</small></div><button type="button" aria-label="Close page outline" onClick={onClose}>Close</button></div><button type="button" className={styles.outlineScope} aria-pressed={state.selectedId === "public-header"} onClick={() => dispatch({ type: "select", id: "public-header" })}><span>Public Header</span><small>Shared site scope</small></button><ul className={styles.layoutTree} role="tree" aria-label="Homepage layout outline"><LayoutTreeItem nodeId={state.present.layout.rootId} state={state} dispatch={dispatch} draggedId={draggedId} setDraggedId={setDraggedId} dropId={dropId} setDropId={setDropId} /></ul></aside>;
}

function LayoutPanel({ state, dispatch, onClose }: { state: ReturnType<typeof createInitialEditorState>; dispatch: React.Dispatch<EditorAction>; onClose: () => void }) {
  const tree = state.present.layout;
  const node = tree.nodes[state.selectedId] ?? tree.nodes[tree.rootId];
  const selectedId = node.id;
  const placement = resolveLayoutPlacement(tree, selectedId, state.previewMode);
  const parent = placement ? tree.nodes[placement.parentId] : null;
  const siblings = parent ? resolveLayoutChildren(tree, parent.id, state.previewMode) : [];
  const siblingIndex = siblings.indexOf(selectedId);
  const compatibleParents = Object.values(tree.nodes).filter((candidate) => canPlaceLayoutNode(tree, selectedId, candidate.id, state.previewMode));
  const parentIndex = compatibleParents.findIndex((candidate) => candidate.id === parent?.id);
  const movableParent = node.movable ? null : nearestMovableLayoutParent(tree, selectedId, state.previewMode);
  const removal = canRemoveLayoutContainer(tree, selectedId);
  const current = node.responsive[state.previewMode] ?? {};
  const [rowPreset, setRowPreset] = useState<"one" | "two-equal" | "one-third-two-thirds" | "two-thirds-one-third" | "three-equal">("two-equal");
  const breadcrumb: LayoutNode[] = [];
  let cursor: LayoutNode | undefined = node;
  while (cursor) { breadcrumb.unshift(cursor); const ancestorId: string | undefined = resolveLayoutPlacement(tree, cursor.id, state.previewMode)?.parentId; cursor = ancestorId ? tree.nodes[ancestorId] : undefined; }
  const update = (key: keyof LayoutResponsiveOverride, value: LayoutResponsiveOverride[keyof LayoutResponsiveOverride] | undefined) => dispatch({ type: "layout-responsive", id: selectedId, breakpoint: state.previewMode, key, value });
  const moveTo = (parentId: string, index: number) => dispatch({ type: "layout-move", id: selectedId, parentId, index, breakpoint: state.previewMode });
  const canReorder = Boolean(node.movable && parent && siblingIndex >= 0);
  return <aside id="homepage-property-panel" className={styles.propertyPanel} aria-label="Homepage layout builder">
    <div className={styles.panelHeading}><div><p>Selected area</p><h2>Area settings</h2><small>{state.previewMode}</small></div><button type="button" aria-label="Close more settings" aria-expanded="true" onClick={onClose}>Close</button></div>
    <ControlGroup title="Advanced settings"><>
    <nav className={styles.breadcrumb} aria-label="Selected layout path">{breadcrumb.map((item, index) => <span key={item.id}>{index ? " / " : ""}<button type="button" onClick={() => dispatch({ type: "select", id: item.id })}>{item.label}</button></span>)}</nav>
    {node.type !== "row" && node.type !== "column" ? <ControlGroup title="Visibility"><label className={styles.visibilityControl}><span>Visible at {state.previewMode}<small>Source: {layoutValueSource(tree, selectedId, state.previewMode, "visible")}</small></span><input type="checkbox" checked={resolveLayoutValue(tree, selectedId, state.previewMode, "visible") ?? true} onChange={(event) => update("visible", event.target.checked)} /></label><ResetButton label={`${node.label} visibility`} disabled={current.visible === undefined} onClick={() => update("visible", undefined)} /></ControlGroup> : null}
    {node.id !== tree.rootId && node.movable ? <ControlGroup title="Move selected" open><div className={styles.movementGrid}>
      <button type="button" disabled={!canReorder || siblingIndex === 0} onClick={() => parent && moveTo(parent.id, siblingIndex - 1)}>Move up</button>
      <button type="button" disabled={!canReorder || siblingIndex === siblings.length - 1} onClick={() => parent && moveTo(parent.id, siblingIndex + 1)}>Move down</button>
      <button type="button" disabled={node.type !== "column" || siblingIndex === 0} onClick={() => parent && moveTo(parent.id, siblingIndex - 1)}>Move left</button>
      <button type="button" disabled={node.type !== "column" || siblingIndex === siblings.length - 1} onClick={() => parent && moveTo(parent.id, siblingIndex + 1)}>Move right</button>
      <button type="button" disabled={parentIndex <= 0} onClick={() => { const target = compatibleParents[parentIndex - 1]; if (target) moveTo(target.id, resolveLayoutChildren(tree, target.id, state.previewMode).length); }}>Previous container</button>
      <button type="button" disabled={parentIndex < 0 || parentIndex >= compatibleParents.length - 1} onClick={() => { const target = compatibleParents[parentIndex + 1]; if (target) moveTo(target.id, resolveLayoutChildren(tree, target.id, state.previewMode).length); }}>Next container</button>
    </div><small className={styles.fieldHint}>Position source: {layoutPlacementSource(tree, selectedId, state.previewMode)}</small></ControlGroup> : node.id !== tree.rootId ? <div className={styles.lockedNotice}><span>Locked · moves with its safe parent block.</span>{movableParent ? <button type="button" onClick={() => dispatch({ type: "select", id: movableParent.id })}>Select parent block</button> : null}</div> : null}
    {node.type === "page" ? <ControlGroup title="Add container" open><button type="button" className={styles.panelAction} onClick={() => dispatch({ type: "layout-add", nodeType: "section", parentId: node.id, breakpoint: state.previewMode })}>Add empty section</button></ControlGroup> : null}
    {node.type === "section" ? <ControlGroup title="Add row" open><SelectControl label="Row preset" value={rowPreset} options={["one", "two-equal", "one-third-two-thirds", "two-thirds-one-third", "three-equal"]} onChange={(value) => value && setRowPreset(value)} onReset={() => setRowPreset("two-equal")} /><button type="button" className={styles.panelAction} onClick={() => dispatch({ type: "layout-add-row-preset", parentId: node.id, preset: rowPreset, breakpoint: state.previewMode })}>Add row with preset</button></ControlGroup> : null}
    {node.type === "row" ? <ControlGroup title="Add column" open><button type="button" className={styles.panelAction} onClick={() => dispatch({ type: "layout-add", nodeType: "column", parentId: node.id, breakpoint: state.previewMode })}>Add empty column</button></ControlGroup> : null}
    {node.type === "row" ? <><ControlGroup title="Columns" open><SelectControl label="Preset" value={current.preset} options={["one", "two-equal", "one-third-two-thirds", "two-thirds-one-third", "three-equal"]} onChange={(value) => update("preset", value)} onReset={() => update("preset", undefined)} /></ControlGroup><ControlGroup title="Layout" open><SelectControl label="Horizontal alignment" value={current.justifyContent} options={["start", "center", "end", "space-between"]} onChange={(value) => update("justifyContent", value)} onReset={() => update("justifyContent", undefined)} /><SelectControl label="Vertical alignment" value={current.alignItems} options={["start", "center", "end", "stretch"]} onChange={(value) => update("alignItems", value)} onReset={() => update("alignItems", undefined)} /><SelectControl<SpacingPreset> label="Gap preset" value={current.gapPreset} options={["compact", "normal", "spacious"]} onChange={(value) => { update("gapPreset", value); update("gap", value === "compact" ? 8 : value === "spacious" ? 32 : value === "normal" ? 18 : undefined); }} onReset={() => { update("gapPreset", undefined); update("gap", undefined); }} /><label className={styles.visibilityControl}><span>Stack on Tablet</span><input type="checkbox" checked={resolveLayoutValue(tree, selectedId, "tablet", "direction") === "column"} onChange={(event) => dispatch({ type: "layout-responsive", id: selectedId, breakpoint: "tablet", key: "direction", value: event.target.checked ? "column" : undefined })} /></label><label className={styles.visibilityControl}><span>Stack on Mobile</span><input type="checkbox" checked={resolveLayoutValue(tree, selectedId, "mobile", "direction") === "column"} onChange={(event) => dispatch({ type: "layout-responsive", id: selectedId, breakpoint: "mobile", key: "direction", value: event.target.checked ? "column" : undefined })} /></label></ControlGroup></> : null}
    {node.type === "column" ? <><ControlGroup title="Width" open><SelectControl<WidthPreset> label="Column width" value={current.width} options={["auto", "third", "half", "two-thirds", "full"]} onChange={(value) => update("width", value)} onReset={() => update("width", undefined)} /></ControlGroup><ControlGroup title="Layout" open><SelectControl label="Alignment" value={current.alignItems} options={["start", "center", "end", "stretch"]} onChange={(value) => update("alignItems", value)} onReset={() => update("alignItems", undefined)} /><SelectControl<SpacingPreset> label="Gap" value={current.gapPreset} options={["compact", "normal", "spacious"]} onChange={(value) => update("gapPreset", value)} onReset={() => update("gapPreset", undefined)} /><SelectControl<SpacingPreset> label="Spacing" value={current.spacingPreset} options={["compact", "normal", "spacious"]} onChange={(value) => { update("spacingPreset", value); update("padding", value === "compact" ? 8 : value === "spacious" ? 32 : value === "normal" ? 18 : undefined); }} onReset={() => { update("spacingPreset", undefined); update("padding", undefined); }} /></ControlGroup></> : null}
    {node.type === "section" ? <><ControlGroup title="Layout" open><SelectControl label="Content width" value={current.contentWidth} options={["narrow", "standard", "wide", "full"]} onChange={(value) => update("contentWidth", value)} onReset={() => update("contentWidth", undefined)} /><SelectControl label="Alignment" value={current.alignItems} options={["start", "center", "end", "stretch"]} onChange={(value) => update("alignItems", value)} onReset={() => update("alignItems", undefined)} /></ControlGroup><ControlGroup title="Spacing"><SelectControl<SpacingPreset> label="Preset" value={current.spacingPreset} options={["compact", "normal", "spacious"]} onChange={(value) => update("spacingPreset", value)} onReset={() => update("spacingPreset", undefined)} /></ControlGroup><ControlGroup title="Appearance"><ColorControl label="Background" value={current.background} onChange={(value) => update("background", value)} onReset={() => update("background", undefined)} /></ControlGroup></> : null}
    <ControlGroup title="Exact layout controls" key={`layout-advanced-${selectedId}`}><>{node.type === "row" || node.type === "column" ? <ControlGroup title="Responsive layout">
      {node.type === "row" ? <SelectControl label={`Column preset · ${layoutValueSource(tree, selectedId, state.previewMode, "preset")}`} value={current.preset} options={["one", "two-equal", "one-third-two-thirds", "two-thirds-one-third", "three-equal"]} onChange={(value) => update("preset", value)} onReset={() => update("preset", undefined)} /> : null}
      <SelectControl label={`Direction · ${layoutValueSource(tree, selectedId, state.previewMode, "direction")}`} value={current.direction} options={["row", "column"]} onChange={(value) => update("direction", value)} onReset={() => update("direction", undefined)} />
      <SelectControl label={`Horizontal alignment · ${layoutValueSource(tree, selectedId, state.previewMode, "justifyContent")}`} value={current.justifyContent} options={["start", "center", "end", "space-between"]} onChange={(value) => update("justifyContent", value)} onReset={() => update("justifyContent", undefined)} />
      <SelectControl label={`Vertical alignment · ${layoutValueSource(tree, selectedId, state.previewMode, "alignItems")}`} value={current.alignItems} options={["start", "center", "end", "stretch"]} onChange={(value) => update("alignItems", value)} onReset={() => update("alignItems", undefined)} />
      <NumberControl label="Gap" value={current.gap} source={layoutValueSource(tree, selectedId, state.previewMode, "gap")} min={0} max={160} onChange={(value) => update("gap", value)} onReset={() => update("gap", undefined)} />
      <NumberControl label="Minimum height" value={current.minHeight} source={layoutValueSource(tree, selectedId, state.previewMode, "minHeight")} min={0} max={1200} onChange={(value) => update("minHeight", value)} onReset={() => update("minHeight", undefined)} />
      <NumberControl label="Padding" value={current.padding} source={layoutValueSource(tree, selectedId, state.previewMode, "padding")} min={0} max={240} onChange={(value) => update("padding", value)} onReset={() => update("padding", undefined)} />
      <label className={styles.visibilityControl}><span>Wrap children</span><input type="checkbox" checked={resolveLayoutValue(tree, selectedId, state.previewMode, "wrap") ?? false} onChange={(event) => update("wrap", event.target.checked)} /></label>
      <label className={styles.visibilityControl}><span>Visible at {state.previewMode}<small>Source: {layoutValueSource(tree, selectedId, state.previewMode, "visible")}</small></span><input type="checkbox" checked={resolveLayoutValue(tree, selectedId, state.previewMode, "visible") ?? true} onChange={(event) => update("visible", event.target.checked)} /></label>
      <ColorControl label="Background" value={current.background} onChange={(value) => update("background", value)} onReset={() => update("background", undefined)} />
      <ColorControl label="Border" value={current.borderColor} onChange={(value) => update("borderColor", value)} onReset={() => update("borderColor", undefined)} />
      <NumberControl label="Border width" value={current.borderWidth} min={0} max={16} onChange={(value) => update("borderWidth", value)} onReset={() => update("borderWidth", undefined)} />
    </ControlGroup> : null}
    <ControlGroup title="Layout resets"><button type="button" className={styles.panelAction} onClick={() => dispatch({ type: "layout-reset-selected", id: selectedId })}>Reset selected container</button><button type="button" className={styles.panelAction} onClick={() => dispatch({ type: "layout-reset-section", id: selectedId })}>Reset selected section layout</button><button type="button" className={styles.panelAction} onClick={() => dispatch({ type: "layout-reset-breakpoint", breakpoint: state.previewMode })}>Reset current breakpoint layout</button><button type="button" className={styles.panelAction} onClick={() => dispatch({ type: "layout-reset-all" })}>Reset full homepage layout</button></ControlGroup></></ControlGroup>
    {node.generated ? <ControlGroup title="Remove container"><button type="button" className={styles.dangerAction} disabled={!removal.allowed} aria-describedby="remove-layout-reason" onClick={() => dispatch({ type: "layout-remove", id: selectedId })}>Remove empty {node.type}</button><p id="remove-layout-reason" className={styles.panelNote}>{removal.reason}</p></ControlGroup> : null}
    </></ControlGroup>
  </aside>;
}

function ResponsiveVisibilityControls({ id, state, dispatch }: { id: HomepageTargetId; state: ReturnType<typeof createInitialEditorState>; dispatch: React.Dispatch<EditorAction> }) {
  const target = state.present.targets[id];
  return <div className={styles.deviceVisibility} aria-label="Device visibility">{editorBreakpoints.map((breakpoint) => {
    return <label key={breakpoint}><span>{breakpoint}</span><input type="checkbox" checked={resolveResponsiveValue(target, breakpoint, "visible") ?? true} onChange={(event) => dispatch({ type: "responsive", id, breakpoint, key: "visible", value: event.target.checked })} /></label>;
  })}</div>;
}

function SimpleTargetControls({ selectedId, state, dispatch, defaults }: { selectedId: HomepageTargetId; state: ReturnType<typeof createInitialEditorState>; dispatch: React.Dispatch<EditorAction>; defaults: HomepageEditorDefaults }) {
  const definition = homepageTargetById[selectedId];
  const target = state.present.targets[selectedId] ?? {};
  const content = target.content ?? {};
  const original = defaults[selectedId] ?? {};
  const global = target.global ?? {};
  const current = target.responsive?.[state.previewMode] ?? {};
  const updateContent = (key: keyof TargetContentOverride, value: string | undefined) => dispatch({ type: "content", id: selectedId, key, value });
  const updateGlobal = (key: keyof GlobalStyle, value: GlobalStyle[keyof GlobalStyle] | undefined) => dispatch({ type: "global", id: selectedId, key, value });
  const updateResponsive = (key: keyof ResponsiveStyle, value: ResponsiveStyle[keyof ResponsiveStyle] | undefined) => dispatch({ type: "responsive", id: selectedId, breakpoint: state.previewMode, key, value });
  const setSpacing = (preset: SpacingPreset | undefined) => dispatch({ type: "spacing-preset", id: selectedId, breakpoint: state.previewMode, preset });
  const isText = definition.kind === "text";
  const isAction = definition.kind === "link";
  const isImage = definition.kind === "image";
  const isMedia = definition.kind === "media";
  const isBlock = definition.kind === "block";
  return <div className={styles.simpleControls} data-context-kind={definition.kind}>
    {(isText || isAction) ? <ControlGroup title="Content" open><TextControl label={isAction ? "Label" : "Text"} value={content.text} defaultValue={original.text ?? ""} multiline={definition.multiline} onChange={(value) => updateContent("text", value)} onReset={() => updateContent("text", undefined)} />{original.description !== undefined ? <TextControl label="Description" value={content.description} defaultValue={original.description} multiline onChange={(value) => updateContent("description", value)} onReset={() => updateContent("description", undefined)} /> : null}</ControlGroup> : null}
    {(isAction || isMedia) ? <ControlGroup title={isMedia ? "Media" : "Link"} open><UrlControl key={`${selectedId}-${content.url ?? "default"}`} label={isMedia ? "Video URL" : "URL"} value={content.url} defaultValue={original.url ?? ""} allowInternal={Boolean(definition.internalLink)} onCommit={(value) => updateContent("url", value)} onReset={() => updateContent("url", undefined)} /></ControlGroup> : null}
    {isText ? <><ControlGroup title="Typography" open><NumberControl label="Font size" value={current.fontSize} min={8} max={160} onChange={(value) => updateResponsive("fontSize", value)} onReset={() => updateResponsive("fontSize", undefined)} /><SelectControl label="Font weight" value={global.fontWeight ? String(global.fontWeight) : undefined} options={["400", "500", "600", "700", "800", "900"]} onChange={(value) => updateGlobal("fontWeight", value ? Number(value) as GlobalStyle["fontWeight"] : undefined)} onReset={() => updateGlobal("fontWeight", undefined)} /><SelectControl label="Alignment" value={current.textAlign} options={["left", "center", "right"]} onChange={(value) => updateResponsive("textAlign", value)} onReset={() => updateResponsive("textAlign", undefined)} /><ColorControl label="Text color" value={global.textColor} onChange={(value) => updateGlobal("textColor", value)} onReset={() => updateGlobal("textColor", undefined)} /><NumberControl label="Maximum text width" value={global.maxTextWidth} min={120} max={1200} onChange={(value) => updateGlobal("maxTextWidth", value)} onReset={() => updateGlobal("maxTextWidth", undefined)} /></ControlGroup></> : null}
    {isAction ? <><ControlGroup title="Style" open><SelectControl label="Button style" value={global.buttonStylePreset} options={["primary", "secondary", "text"]} onChange={(value) => updateGlobal("buttonStylePreset", value)} onReset={() => updateGlobal("buttonStylePreset", undefined)} /><SelectControl label="Alignment" value={current.textAlign} options={["left", "center", "right"]} onChange={(value) => updateResponsive("textAlign", value)} onReset={() => updateResponsive("textAlign", undefined)} /><SelectControl<SpacingPreset> label="Size" value={global.spacingPreset} options={["compact", "normal", "spacious"]} onChange={setSpacing} onReset={() => setSpacing(undefined)} /></ControlGroup><ControlGroup title="Colors"><ColorControl label="Background" value={global.buttonBackground} onChange={(value) => updateGlobal("buttonBackground", value)} onReset={() => updateGlobal("buttonBackground", undefined)} /><ColorControl label="Text" value={global.buttonTextColor} onChange={(value) => updateGlobal("buttonTextColor", value)} onReset={() => updateGlobal("buttonTextColor", undefined)} /></ControlGroup></> : null}
    {isImage ? <><ControlGroup title="Image" open><UrlControl key={`${selectedId}-image-${content.imageSrc ?? "default"}`} label="Safe HTTPS preview URL" value={content.imageSrc} defaultValue={original.imageSrc ?? ""} allowInternal={false} httpsOnly onCommit={(value) => updateContent("imageSrc", value)} onReset={() => updateContent("imageSrc", undefined)} /><TextControl label="Alt text" value={content.alt} defaultValue={original.alt ?? ""} onChange={(value) => updateContent("alt", value)} onReset={() => updateContent("alt", undefined)} /></ControlGroup><ControlGroup title="Display" open><SelectControl<ObjectFit> label="Fit" value={global.objectFit} options={["cover", "contain"]} onChange={(value) => updateGlobal("objectFit", value)} onReset={() => updateGlobal("objectFit", undefined)} /><SelectControl<ObjectPosition> label="Position" value={current.objectPosition} options={["center", "top", "bottom", "left", "right", "left top", "right top", "left bottom", "right bottom"]} onChange={(value) => updateResponsive("objectPosition", value)} onReset={() => updateResponsive("objectPosition", undefined)} /><SelectControl label="Size" value={global.imageSizePreset} options={["small", "medium", "large", "full"]} onChange={(value) => updateGlobal("imageSizePreset", value)} onReset={() => updateGlobal("imageSizePreset", undefined)} /><SelectControl label="Corners" value={global.radiusPreset} options={["square", "slightly-rounded", "rounded"]} onChange={(value) => updateGlobal("radiusPreset", value)} onReset={() => updateGlobal("radiusPreset", undefined)} /></ControlGroup></> : null}
    {isBlock ? <><ControlGroup title="Layout" open><SelectControl<WidthPreset> label="Width" value={global.widthPreset} options={["auto", "third", "half", "two-thirds", "full"]} onChange={(value) => updateGlobal("widthPreset", value)} onReset={() => updateGlobal("widthPreset", undefined)} /><SelectControl label="Alignment" value={global.alignItems} options={["start", "center", "end", "stretch"]} onChange={(value) => updateGlobal("alignItems", value)} onReset={() => updateGlobal("alignItems", undefined)} /></ControlGroup><ControlGroup title="Appearance"><ColorControl label="Background" value={global.backgroundColor} onChange={(value) => updateGlobal("backgroundColor", value)} onReset={() => updateGlobal("backgroundColor", undefined)} /></ControlGroup></> : null}
    {(isText || isAction || isBlock) ? <ControlGroup title="Spacing"><SelectControl<SpacingPreset> label="Preset" value={global.spacingPreset} options={["compact", "normal", "spacious"]} onChange={setSpacing} onReset={() => setSpacing(undefined)} /><NumberControl label="Top spacing" value={current.paddingTop} min={0} max={160} onChange={(value) => updateResponsive("paddingTop", value)} onReset={() => updateResponsive("paddingTop", undefined)} /><NumberControl label="Bottom spacing" value={current.paddingBottom} min={0} max={160} onChange={(value) => updateResponsive("paddingBottom", value)} onReset={() => updateResponsive("paddingBottom", undefined)} /></ControlGroup> : null}
    <ControlGroup title="Visibility" open><ResponsiveVisibilityControls id={selectedId} state={state} dispatch={dispatch} /></ControlGroup>
  </div>;
}

function PropertyPanel({ state, dispatch, defaults, onClose }: { state: ReturnType<typeof createInitialEditorState>; dispatch: React.Dispatch<EditorAction>; defaults: HomepageEditorDefaults; onClose: () => void }) {
  const selectedId = (homepageTargetById[state.selectedId as HomepageTargetId] ? state.selectedId : "hero-introduction") as HomepageTargetId;
  const definition = homepageTargetById[selectedId];
  const target = state.present.targets[selectedId] ?? {};
  const global = target.global ?? {};
  const current = target.responsive?.[state.previewMode] ?? {};
  const updateGlobal = (key: keyof GlobalStyle, value: GlobalStyle[keyof GlobalStyle] | undefined) => dispatch({ type: "global", id: selectedId, key, value });
  const updateResponsive = (key: keyof ResponsiveStyle, value: ResponsiveStyle[keyof ResponsiveStyle] | undefined) => dispatch({ type: "responsive", id: selectedId, breakpoint: state.previewMode, key, value });
  const source = (key: keyof ResponsiveStyle) => responsiveValueSource(target, state.previewMode, key);
  const parent = definition.parentId ? homepageTargetById[definition.parentId] : null;
  const isText = definition.kind === "text" || definition.kind === "link";
  const isBlock = definition.kind === "block";
  const group = isBlock && definition.group ? state.present.order[definition.group] : null;
  const orderIndex = group ? group.indexOf(definition.id as HomepageBlockId) : -1;
  return <aside id="homepage-property-panel" className={styles.propertyPanel} aria-label="Selected editor properties">
    <div className={styles.panelHeading}><div><p>Selected item</p><h2>{definition.label}</h2><small>{state.previewMode}</small></div><button type="button" aria-label="Close more settings" aria-expanded="true" onClick={onClose}>Close</button></div>
    <SimpleTargetControls selectedId={selectedId} state={state} dispatch={dispatch} defaults={defaults} />
    <ControlGroup title="Advanced settings" key={`advanced-${selectedId}`}><>
    <ControlGroup title="Visibility"><label className={styles.visibilityControl}><span>Visible at {state.previewMode}<small>Source: {source("visible")}</small></span><input type="checkbox" checked={resolveResponsiveValue(target, state.previewMode, "visible") ?? true} onChange={(event) => updateResponsive("visible", event.target.checked)} /></label><ResetButton label={`${state.previewMode} visibility`} disabled={current.visible === undefined} onClick={() => updateResponsive("visible", undefined)} /></ControlGroup>
    <ControlGroup title="Spacing"><NumberControl label="Padding top" value={current.paddingTop} source={source("paddingTop")} min={0} max={320} onChange={(value) => updateResponsive("paddingTop", value)} onReset={() => updateResponsive("paddingTop", undefined)} /><NumberControl label="Padding right" value={current.paddingRight} source={source("paddingRight")} min={0} max={320} onChange={(value) => updateResponsive("paddingRight", value)} onReset={() => updateResponsive("paddingRight", undefined)} /><NumberControl label="Padding bottom" value={current.paddingBottom} source={source("paddingBottom")} min={0} max={320} onChange={(value) => updateResponsive("paddingBottom", value)} onReset={() => updateResponsive("paddingBottom", undefined)} /><NumberControl label="Padding left" value={current.paddingLeft} source={source("paddingLeft")} min={0} max={320} onChange={(value) => updateResponsive("paddingLeft", value)} onReset={() => updateResponsive("paddingLeft", undefined)} /><NumberControl label="Margin top" value={current.marginTop} source={source("marginTop")} min={-160} max={320} onChange={(value) => updateResponsive("marginTop", value)} onReset={() => updateResponsive("marginTop", undefined)} /><NumberControl label="Margin bottom" value={current.marginBottom} source={source("marginBottom")} min={-160} max={320} onChange={(value) => updateResponsive("marginBottom", value)} onReset={() => updateResponsive("marginBottom", undefined)} /></ControlGroup>
    <ControlGroup title="Size"><NumberControl label="Maximum width" value={current.maxWidth} source={source("maxWidth")} min={160} max={1600} onChange={(value) => updateResponsive("maxWidth", value)} onReset={() => updateResponsive("maxWidth", undefined)} /><NumberControl label="Width" value={global.width} min={40} max={1600} onChange={(value) => updateGlobal("width", value)} onReset={() => updateGlobal("width", undefined)} /><NumberControl label="Minimum height" value={global.minHeight} min={0} max={1200} onChange={(value) => updateGlobal("minHeight", value)} onReset={() => updateGlobal("minHeight", undefined)} /></ControlGroup>
    {isText ? <ControlGroup title="Typography"><NumberControl label="Font size" value={current.fontSize} source={source("fontSize")} min={8} max={160} onChange={(value) => updateResponsive("fontSize", value)} onReset={() => updateResponsive("fontSize", undefined)} /><SelectControl label="Font weight" value={global.fontWeight ? String(global.fontWeight) : undefined} options={["400", "500", "600", "700", "800", "900"]} onChange={(value) => updateGlobal("fontWeight", value ? Number(value) as GlobalStyle["fontWeight"] : undefined)} onReset={() => updateGlobal("fontWeight", undefined)} /><NumberControl label="Line height" value={global.lineHeight} min={0.7} max={3} step={0.05} unit="×" onChange={(value) => updateGlobal("lineHeight", value)} onReset={() => updateGlobal("lineHeight", undefined)} /><NumberControl label="Letter spacing" value={global.letterSpacing} min={-10} max={30} step={0.1} onChange={(value) => updateGlobal("letterSpacing", value)} onReset={() => updateGlobal("letterSpacing", undefined)} /><SelectControl label={`Text alignment · ${source("textAlign")}`} value={current.textAlign} options={["left", "center", "right"]} onChange={(value) => updateResponsive("textAlign", value)} onReset={() => updateResponsive("textAlign", undefined)} /><SelectControl label="Text transform" value={global.textTransform} options={["none", "uppercase", "lowercase", "capitalize"]} onChange={(value) => updateGlobal("textTransform", value)} onReset={() => updateGlobal("textTransform", undefined)} /><NumberControl label="Maximum text width" value={global.maxTextWidth} min={120} max={1200} onChange={(value) => updateGlobal("maxTextWidth", value)} onReset={() => updateGlobal("maxTextWidth", undefined)} /></ControlGroup> : null}
    <ControlGroup title="Colors"><ColorControl label="Text color" value={global.textColor} onChange={(value) => updateGlobal("textColor", value)} onReset={() => updateGlobal("textColor", undefined)} /><ColorControl label="Muted color" value={global.mutedColor} onChange={(value) => updateGlobal("mutedColor", value)} onReset={() => updateGlobal("mutedColor", undefined)} /><ColorControl label="Background" value={global.backgroundColor} onChange={(value) => updateGlobal("backgroundColor", value)} onReset={() => updateGlobal("backgroundColor", undefined)} /><ColorControl label="Accent" value={global.accentColor} onChange={(value) => updateGlobal("accentColor", value)} onReset={() => updateGlobal("accentColor", undefined)} />{definition.kind === "link" ? <><ColorControl label="Button background" value={global.buttonBackground} onChange={(value) => updateGlobal("buttonBackground", value)} onReset={() => updateGlobal("buttonBackground", undefined)} /><ColorControl label="Button text" value={global.buttonTextColor} onChange={(value) => updateGlobal("buttonTextColor", value)} onReset={() => updateGlobal("buttonTextColor", undefined)} /></> : null}</ControlGroup>
    <ControlGroup title="Border / Surface"><ColorControl label="Border color" value={global.borderColor} onChange={(value) => updateGlobal("borderColor", value)} onReset={() => updateGlobal("borderColor", undefined)} /><NumberControl label="Border width" value={global.borderWidth} min={0} max={16} onChange={(value) => updateGlobal("borderWidth", value)} onReset={() => updateGlobal("borderWidth", undefined)} /><NumberControl label="Border radius" value={global.borderRadius} min={0} max={120} onChange={(value) => updateGlobal("borderRadius", value)} onReset={() => updateGlobal("borderRadius", undefined)} /><SelectControl label="Shadow" value={global.shadow} options={["none", "soft", "medium", "strong"]} onChange={(value) => updateGlobal("shadow", value)} onReset={() => updateGlobal("shadow", undefined)} /><SelectControl label="Overflow" value={global.overflow} options={["visible", "hidden", "auto"]} onChange={(value) => updateGlobal("overflow", value)} onReset={() => updateGlobal("overflow", undefined)} /></ControlGroup>
    {isBlock ? <ControlGroup title="Layout"><SelectControl label={`Flex direction · ${source("flexDirection")}`} value={current.flexDirection} options={["row", "column", "row-reverse", "column-reverse"]} onChange={(value) => updateResponsive("flexDirection", value)} onReset={() => updateResponsive("flexDirection", undefined)} /><NumberControl label="Gap" value={current.gap} source={source("gap")} min={0} max={160} onChange={(value) => updateResponsive("gap", value)} onReset={() => updateResponsive("gap", undefined)} /><SelectControl label="Horizontal alignment" value={global.justifyContent} options={["start", "center", "end", "space-between"]} onChange={(value) => updateGlobal("justifyContent", value)} onReset={() => updateGlobal("justifyContent", undefined)} /><SelectControl label="Vertical alignment" value={global.alignItems} options={["start", "center", "end", "stretch"]} onChange={(value) => updateGlobal("alignItems", value)} onReset={() => updateGlobal("alignItems", undefined)} />{definition.id === "featured-content" ? <><SelectControl<LayoutPreset> label="Column proportions" value={global.layoutPreset} options={["public", "equal-columns", "guide-wide", "subscriber-wide", "stacked"]} onChange={(value) => updateGlobal("layoutPreset", value)} onReset={() => updateGlobal("layoutPreset", undefined)} /><SelectControl<ImagePlacement> label="Guide image placement" value={global.imagePlacement} options={["left", "right"]} onChange={(value) => updateGlobal("imagePlacement", value)} onReset={() => updateGlobal("imagePlacement", undefined)} /></> : null}</ControlGroup> : null}
    <ControlGroup title="Responsive"><p className={styles.panelNote}>Desktop is the base override. Tablet inherits Desktop; Mobile inherits Tablet, then Desktop.</p><button type="button" className={styles.panelAction} onClick={() => dispatch({ type: "reset-breakpoint", id: selectedId, breakpoint: state.previewMode })}>Reset current breakpoint</button><button type="button" className={styles.panelAction} onClick={() => dispatch({ type: "reset-all-breakpoints", id: selectedId })}>Reset all breakpoints</button></ControlGroup>
    {group ? <ControlGroup title="Block order"><div className={styles.orderControls}><button type="button" disabled={orderIndex <= 0} onClick={() => dispatch({ type: "move", id: definition.id as HomepageBlockId, direction: -1 })}>Move up</button><button type="button" disabled={orderIndex < 0 || orderIndex >= group.length - 1} onClick={() => dispatch({ type: "move", id: definition.id as HomepageBlockId, direction: 1 })}>Move down</button></div></ControlGroup> : null}
    </></ControlGroup>
    <div className={styles.resetActions}><button type="button" onClick={() => dispatch(definition.kind === "block" ? { type: "reset-block", id: definition.id as HomepageBlockId } : { type: "reset-target", id: selectedId })}>Reset selected {definition.kind === "block" ? "block" : "element"}</button>{parent ? <button type="button" onClick={() => dispatch({ type: "reset-block", id: parent.id as HomepageBlockId })}>Reset parent block</button> : null}</div>
  </aside>;
}

function resolveHeaderResponsive(state: ReturnType<typeof createInitialEditorState>, breakpoint: EditorBreakpoint, key: "visible" | "navigationLayout") {
  const values = state.present.header.responsive;
  if (breakpoint === "mobile") return values.mobile?.[key] ?? values.tablet?.[key] ?? values.desktop?.[key];
  if (breakpoint === "tablet") return values.tablet?.[key] ?? values.desktop?.[key];
  return values.desktop?.[key];
}

function HeaderPanel({ state, dispatch, onClose }: { state: ReturnType<typeof createInitialEditorState>; dispatch: React.Dispatch<EditorAction>; onClose: () => void }) {
  const header = state.present.header;
  const current = header.responsive[state.previewMode] ?? {};
  return <aside id="homepage-property-panel" className={styles.propertyPanel} aria-label="Public Header properties"><div className={styles.panelHeading}><div><p>Shared public scope</p><h2>Header</h2><small>{state.previewMode} · contextual</small></div><button type="button" onClick={onClose}>Close</button></div>
    <ControlGroup title="Header layout" open><SelectControl label="Layout" value={header.layout} options={["spread", "centered", "compact"]} onChange={(value) => dispatch({ type: "header-global", key: "layout", value })} onReset={() => dispatch({ type: "header-global", key: "layout", value: undefined })} /><NumberControl label="Header height" value={header.height} min={44} max={120} onChange={(value) => dispatch({ type: "header-global", key: "height", value })} onReset={() => dispatch({ type: "header-global", key: "height", value: undefined })} /><NumberControl label="Horizontal spacing" value={header.horizontalSpacing} min={8} max={96} onChange={(value) => dispatch({ type: "header-global", key: "horizontalSpacing", value })} onReset={() => dispatch({ type: "header-global", key: "horizontalSpacing", value: undefined })} /></ControlGroup>
    <ControlGroup title="Header elements" open><div className={styles.contextRows}><span>Logo / brand element</span><span>Navigation items</span><span>Account action</span></div></ControlGroup>
    <ControlGroup title="Colors" open><ColorControl label="Background" value={header.background} onChange={(value) => dispatch({ type: "header-global", key: "background", value })} onReset={() => dispatch({ type: "header-global", key: "background", value: undefined })} /><ColorControl label="Text" value={header.textColor} onChange={(value) => dispatch({ type: "header-global", key: "textColor", value })} onReset={() => dispatch({ type: "header-global", key: "textColor", value: undefined })} /><SelectControl label="Active-link styling" value={header.activeLinkStyle} options={["underline", "pill", "accent"]} onChange={(value) => dispatch({ type: "header-global", key: "activeLinkStyle", value })} onReset={() => dispatch({ type: "header-global", key: "activeLinkStyle", value: undefined })} /></ControlGroup>
    <ControlGroup title="Responsive" open><label className={styles.visibilityControl}><span>Visible at {state.previewMode}</span><input type="checkbox" checked={(resolveHeaderResponsive(state, state.previewMode, "visible") as boolean | undefined) ?? true} onChange={(event) => dispatch({ type: "header-responsive", breakpoint: state.previewMode, key: "visible", value: event.target.checked })} /></label><SelectControl label="Navigation layout" value={current.navigationLayout} options={["full", "compact", "hidden"]} onChange={(value) => dispatch({ type: "header-responsive", breakpoint: state.previewMode, key: "navigationLayout", value })} onReset={() => dispatch({ type: "header-responsive", breakpoint: state.previewMode, key: "navigationLayout", value: undefined })} /></ControlGroup>
    <div className={styles.resetActions}><button type="button" onClick={() => dispatch({ type: "reset-header" })}>Reset Header preview</button></div>
  </aside>;
}

function CanvasMoveHandle({ label, movable }: { label: string; movable: boolean }) {
  const editor = useContext(EditorContext);
  const potential = useRef<{ pointerId: number; start: CanvasPoint; payload: CanvasDragPayload; active: boolean } | null>(null);
  const disabled = !editor || editor.mode !== "layout" || !movable;
  const cancelPotential = () => { potential.current = null; editor?.cancelCanvasDrag(); };
  return <button type="button" className={styles.dragHandle} data-canvas-move-handle disabled={disabled}
    aria-label={disabled ? `${label} cannot be moved` : `Move ${label}`} title={disabled ? "Move unavailable" : `Press and drag to move ${label}`}
    onPointerDown={(event) => {
      if (disabled || event.button !== 0 || !event.isPrimary || document.activeElement?.matches("[contenteditable='true']")) return;
      const payload = createDirectCanvasDragPayload(editor.snapshot.layout, editor.selectedId, editor.breakpoint);
      if (!payload) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      potential.current = { pointerId: event.pointerId, start: { x: event.clientX, y: event.clientY }, payload, active: false };
    }}
    onPointerMove={(event) => {
      if (!editor) return;
      const pending = potential.current;
      if (!pending || pending.pointerId !== event.pointerId) return;
      const point = { x: event.clientX, y: event.clientY };
      if (!pending.active && hasPassedCanvasDragThreshold(pending.start.x, pending.start.y, point.x, point.y)) {
        pending.active = true;
        editor.startCanvasDrag(pending.payload, point);
      } else if (pending.active) editor.updateCanvasDrag(point);
    }}
    onPointerUp={(event) => {
      if (!editor) return;
      const pending = potential.current;
      if (!pending || pending.pointerId !== event.pointerId) return;
      potential.current = null;
      if (pending.active) editor.finishCanvasDrag({ x: event.clientX, y: event.clientY });
      else editor.cancelCanvasDrag();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={cancelPotential}
    onLostPointerCapture={() => { if (potential.current) cancelPotential(); }}>
    {disabled ? "Move unavailable" : "Move"}
  </button>;
}

function ContextToolbar({ state, dispatch, onMoreSettings }: { state: ReturnType<typeof createInitialEditorState>; dispatch: React.Dispatch<EditorAction>; onMoreSettings: () => void }) {
  const editor = useContext(EditorContext);
  const targetId = state.selectedId as HomepageTargetId;
  const definition = (homepageTargetById as Partial<Record<string, (typeof homepageTargetRegistry)[number]>>)[targetId];
  const node = state.present.layout.nodes[state.selectedId];
  const target = definition ? state.present.targets[targetId] ?? {} : undefined;
  const safeMovableNode = node ? resolveSafeMovableLayoutNode(state.present.layout, node.id, state.previewMode) : null;
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: 16, top: 112 });
  useEffect(() => {
    let frame = 0;
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[data-editor-target="${state.selectedId}"], [data-section-id="${state.selectedId}"], [data-layout-item="${state.selectedId}"], [data-container-boundary-id="${state.selectedId}"]`);
      if (!element) { setPosition({ left: 16, top: 112 }); return; }
      const rect = element.getBoundingClientRect();
      const toolbarWidth = Math.min(toolbarRef.current?.offsetWidth ?? 420, window.innerWidth - 16);
      const toolbarHeight = toolbarRef.current?.offsetHeight ?? 44;
      setPosition({ left: Math.max(8, Math.min(window.innerWidth - toolbarWidth - 8, rect.left)), top: Math.max(64, rect.top > toolbarHeight + 76 ? rect.top - toolbarHeight - 8 : Math.min(window.innerHeight - toolbarHeight - 8, rect.bottom + 8)) });
    }); };
    update(); window.addEventListener("resize", update); window.addEventListener("scroll", update, true);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [state.selectedId, state.previewMode, state.present]);
  if (!definition && !node) return null;
  const kind = definition?.kind ?? node.type;
  const current = target?.responsive?.[state.previewMode] ?? {};
  const global = target?.global ?? {};
  const reset = () => definition ? dispatch(definition.kind === "block" ? { type: "reset-block", id: definition.id as HomepageBlockId } : { type: "reset-target", id: targetId }) : dispatch({ type: "layout-reset-selected", id: state.selectedId });
  const editInline = () => document.querySelector<HTMLElement>(`[data-editor-inline="${state.selectedId}"]`)?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
  const openSettingsField = (selector: string) => { onMoreSettings(); requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector<HTMLInputElement>(selector)?.focus())); };
  const targetLabel = definition?.label ?? node.label;
  return <div ref={toolbarRef} className={styles.contextToolbar} role="toolbar" aria-label={`${targetLabel} quick controls`} style={position} data-context-kind={kind} data-dragging={Boolean(editor?.canvasDrag)}>
    {(kind === "text" || kind === "link") ? <button type="button" onClick={editInline}>{kind === "link" ? "Edit label" : "Edit text"}</button> : null}
    {kind === "text" ? <><select aria-label="Font size" value={current.fontSize ?? ""} onChange={(event) => dispatch({ type: "responsive", id: targetId, breakpoint: state.previewMode, key: "fontSize", value: event.target.value ? Number(event.target.value) : undefined })}><option value="">Size</option><option value="14">14</option><option value="18">18</option><option value="24">24</option><option value="36">36</option><option value="56">56</option></select><select aria-label="Font weight" value={global.fontWeight ?? ""} onChange={(event) => dispatch({ type: "global", id: targetId, key: "fontWeight", value: event.target.value ? Number(event.target.value) as GlobalStyle["fontWeight"] : undefined })}><option value="">Weight</option><option value="400">400</option><option value="600">600</option><option value="800">800</option></select></> : null}
    {(kind === "text" || kind === "link") ? <select aria-label="Alignment" value={current.textAlign ?? ""} onChange={(event) => dispatch({ type: "responsive", id: targetId, breakpoint: state.previewMode, key: "textAlign", value: (event.target.value || undefined) as ResponsiveStyle["textAlign"] })}><option value="">Align</option><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select> : null}
    {kind === "text" ? <input type="color" aria-label="Text color" value={global.textColor && isSafeColor(global.textColor) ? global.textColor : "#ffffff"} onChange={(event) => dispatch({ type: "global", id: targetId, key: "textColor", value: event.target.value })} /> : null}
    {kind === "link" ? <><button type="button" onClick={() => openSettingsField("#homepage-property-panel input[type='url']")}>Edit link</button><select aria-label="Button style" value={global.buttonStylePreset ?? ""} onChange={(event) => dispatch({ type: "global", id: targetId, key: "buttonStylePreset", value: (event.target.value || undefined) as GlobalStyle["buttonStylePreset"] })}><option value="">Style</option><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="text">Text link</option></select></> : null}
    {kind === "image" ? <><button type="button" onClick={() => openSettingsField("#homepage-property-panel input[type='url']")}>Change image</button><select aria-label="Image size" value={global.imageSizePreset ?? ""} onChange={(event) => dispatch({ type: "global", id: targetId, key: "imageSizePreset", value: (event.target.value || undefined) as GlobalStyle["imageSizePreset"] })}><option value="">Size</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="full">Full</option></select><select aria-label="Image fit" value={global.objectFit ?? ""} onChange={(event) => dispatch({ type: "global", id: targetId, key: "objectFit", value: (event.target.value || undefined) as ObjectFit | undefined })}><option value="">Fit</option><option value="cover">Cover</option><option value="contain">Contain</option></select><select aria-label="Image position" value={current.objectPosition ?? ""} onChange={(event) => dispatch({ type: "responsive", id: targetId, breakpoint: state.previewMode, key: "objectPosition", value: (event.target.value || undefined) as ObjectPosition | undefined })}><option value="">Position</option><option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select><select aria-label="Image corners" value={global.radiusPreset ?? ""} onChange={(event) => dispatch({ type: "global", id: targetId, key: "radiusPreset", value: (event.target.value || undefined) as GlobalStyle["radiusPreset"] })}><option value="">Corners</option><option value="square">Square</option><option value="slightly-rounded">Soft</option><option value="rounded">Rounded</option></select></> : null}
    {kind === "media" ? <button type="button" onClick={() => openSettingsField("#homepage-property-panel input[type='url']")}>Change media</button> : null}
    {kind === "block" ? <><select aria-label="Block width" value={global.widthPreset ?? ""} onChange={(event) => dispatch({ type: "global", id: targetId, key: "widthPreset", value: (event.target.value || undefined) as WidthPreset | undefined })}><option value="">Width</option><option value="auto">Auto</option><option value="half">Half</option><option value="full">Full</option></select><select aria-label="Block alignment" value={global.alignItems ?? ""} onChange={(event) => dispatch({ type: "global", id: targetId, key: "alignItems", value: (event.target.value || undefined) as GlobalStyle["alignItems"] })}><option value="">Align</option><option value="start">Left</option><option value="center">Center</option><option value="end">Right</option></select><input type="color" aria-label="Block background" value={global.backgroundColor && isSafeColor(global.backgroundColor) ? global.backgroundColor : "#111111"} onChange={(event) => dispatch({ type: "global", id: targetId, key: "backgroundColor", value: event.target.value })} /></> : null}
    {kind === "column" ? <><select aria-label="Column width" value={resolveLayoutValue(state.present.layout, state.selectedId, state.previewMode, "width") ?? ""} onChange={(event) => dispatch({ type: "layout-responsive", id: state.selectedId, breakpoint: state.previewMode, key: "width", value: (event.target.value || undefined) as WidthPreset | undefined })}><option value="">Width</option><option value="auto">Auto</option><option value="third">Third</option><option value="half">Half</option><option value="two-thirds">Two thirds</option><option value="full">Full</option></select><select aria-label="Column alignment" value={resolveLayoutValue(state.present.layout, state.selectedId, state.previewMode, "alignItems") ?? ""} onChange={(event) => dispatch({ type: "layout-responsive", id: state.selectedId, breakpoint: state.previewMode, key: "alignItems", value: (event.target.value || undefined) as LayoutResponsiveOverride["alignItems"] })}><option value="">Align</option><option value="start">Start</option><option value="center">Center</option><option value="end">End</option><option value="stretch">Stretch</option></select></> : null}
    <CanvasMoveHandle label={targetLabel} movable={Boolean(safeMovableNode)} />
    <button type="button" onClick={reset}>Reset {kind}</button>
  </div>;
}

export function HomepageEditor({ canEdit, defaults, published = null, children }: { canEdit?: boolean; defaults: HomepageEditorDefaults; published?: EditorSnapshot | null; children: ReactNode }) {
  const [authorized, setAuthorized] = useState(canEdit === true);
  const [active, setActive] = useState(false);
  const [state, dispatch] = useReducer(editorReducer, published ?? undefined, createInitialEditorState);
  const [version, setVersion] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" });
  const [pending, startPersist] = useTransition();
  const [panelOpen, setPanelOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [canvasDrag, setCanvasDrag] = useState<CanvasDragVisualState | null>(null);
  const canvasDragRef = useRef<CanvasDragVisualState | null>(null);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const [hosts, setHosts] = useState<ReadonlyMap<string, HTMLDivElement>>(() => new Map());
  const [containerBoundaries, setContainerBoundaries] = useState<CanvasContainerBoundary[]>([]);
  useEffect(() => {
    if (canEdit !== undefined) return;
    let current = true;
    void requestBuilderAccess().then((allowed) => { if (current) setAuthorized(allowed); });
    return () => { current = false; };
  }, [canEdit]);
  /**
   * Authorized browsers replace the published document with their own draft, so
   * the live page becomes the draft preview. The response is sanitized again
   * here because a stored document is untrusted input on the way out too.
   */
  useEffect(() => {
    if (!authorized) return;
    let current = true;
    void fetch("/api/staff/site-content/homepage", { cache: "no-store", credentials: "same-origin", headers: { accept: "application/json" } })
      .then((response) => response.ok ? response.json() as Promise<{ draft: unknown; version: number }> : null)
      .then((result) => {
        if (!current || !result?.draft || typeof result.version !== "number") return;
        dispatch({ type: "load", snapshot: sanitizeHomepageDocument(result.draft) });
        setVersion(result.version);
      })
      .catch(() => undefined);
    return () => { current = false; };
  }, [authorized]);
  const registerHost = useCallback((id: string, node: HTMLDivElement | null) => {
    setHosts((current) => {
      if (current.get(id) === node || (!node && !current.has(id))) return current;
      const next = new Map(current);
      if (node) next.set(id, node); else next.delete(id);
      return next;
    });
  }, []);
  const calculateCanvasDrag = useCallback((payload: CanvasDragPayload, point: CanvasPoint): CanvasDragVisualState => {
    const zones = previewFrameRef.current ? collectCanvasDropZones(previewFrameRef.current, state.present.layout, payload) : [];
    const activeZone = activeCanvasDropZone(zones, point);
    return { payload, point, zones, activeKey: activeZone?.key ?? null };
  }, [state.present.layout]);
  const startCanvasDrag = useCallback((payload: CanvasDragPayload, point: CanvasPoint) => {
    const next = calculateCanvasDrag(payload, point); canvasDragRef.current = next; setCanvasDrag(next);
  }, [calculateCanvasDrag]);
  const updateCanvasDrag = useCallback((point: CanvasPoint) => {
    const current = canvasDragRef.current; if (!current) return;
    const next = calculateCanvasDrag(current.payload, point); canvasDragRef.current = next; setCanvasDrag(next);
  }, [calculateCanvasDrag]);
  const cancelCanvasDrag = useCallback(() => { canvasDragRef.current = null; setCanvasDrag(null); }, []);
  const finishCanvasDrag = useCallback((point: CanvasPoint) => {
    const current = canvasDragRef.current; if (!current) return;
    const finalState = calculateCanvasDrag(current.payload, point);
    const move = finalState.zones.find((zone) => zone.key === finalState.activeKey);
    canvasDragRef.current = null; setCanvasDrag(null);
    if (!move) return;
    dispatch({ type: "layout-move", id: current.payload.nodeId, parentId: move.parentId, index: move.index, breakpoint: current.payload.breakpoint });
    dispatch({ type: "select", id: current.payload.nodeId });
  }, [calculateCanvasDrag]);
  const context = useMemo<EditorContextValue>(() => ({ active, breakpoint: state.previewMode, defaults, selectedId: state.selectedId, mode: state.mode, snapshot: state.present, dispatch, hosts, registerHost, canvasDrag, startCanvasDrag, updateCanvasDrag, finishCanvasDrag, cancelCanvasDrag }), [active, cancelCanvasDrag, canvasDrag, defaults, finishCanvasDrag, hosts, registerHost, startCanvasDrag, state, updateCanvasDrag]);
  /**
   * Read-only context for every render outside edit mode. Visitors resolve the
   * published document; an authorized editor resolves their own draft, so the
   * live page doubles as the draft preview. `content` mode is required: `layout`
   * mode injects CSS order values that only make sense inside the editor frame.
   */
  const passiveSnapshot = authorized ? state.present : published;
  const passiveContext = useMemo<EditorContextValue>(() => ({
    ...context, active: false, mode: "content", snapshot: passiveSnapshot ?? createInitialSnapshot(),
  }), [context, passiveSnapshot]);
  const persist = useCallback((run: () => Promise<SiteContentResult>, describe: (result: SiteContentResult) => SaveStatus) => {
    setSaveStatus({ kind: "pending" });
    startPersist(async () => { setSaveStatus(describe(await run())); });
  }, []);
  const saveDraft = useCallback(() => persist(() => saveHomepageDraftAction(state.present, version), (result) => {
    if (result.status !== "saved") return { kind: "error", message: saveErrorMessage(result) };
    setVersion(result.version);
    return { kind: "saved" };
  }), [persist, state.present, version]);
  const publishDraft = useCallback(() => persist(() => publishHomepageDraftAction(version), (result) =>
    result.status === "published" ? { kind: "published" } : { kind: "error", message: saveErrorMessage(result) }), [persist, version]);
  const discardDraft = useCallback(() => persist(discardHomepageDraftAction, (result) => {
    if (result.status !== "discarded") return { kind: "error", message: saveErrorMessage(result) };
    setVersion(0);
    // Return to what is actually live, not to the shipped defaults: discarding a
    // draft abandons unpublished edits, it does not unpublish anything.
    dispatch({ type: "load", snapshot: published ?? createInitialSnapshot() });
    return { kind: "discarded" };
  }), [persist, published]);
  const canvasDragging = Boolean(canvasDrag);
  useEffect(() => {
    if (!active || state.mode !== "layout" || !previewFrameRef.current) { setContainerBoundaries([]); return; }
    const root = previewFrameRef.current;
    let frame = 0;
    const refresh = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
      const bounds = collectCanvasNodeBounds(root, state.present.layout, state.previewMode);
      const next = Object.values(state.present.layout.nodes).filter((node) => ["section", "row", "column"].includes(node.type)).flatMap((node) => {
        const rect = bounds.get(node.id);
        return rect ? [{ id: node.id, label: node.label, rect }] : [];
      }).sort((left, right) => right.rect.width * right.rect.height - left.rect.width * left.rect.height);
      setContainerBoundaries(next);
    }); };
    const observer = new ResizeObserver(refresh);
    observer.observe(root);
    refresh(); window.addEventListener("resize", refresh); window.addEventListener("scroll", refresh, true);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", refresh); window.removeEventListener("scroll", refresh, true); };
  }, [active, hosts, panelOpen, state.mode, state.present.layout, state.previewMode]);
  useEffect(() => {
    if (!canvasDragging) return;
    let frame = requestAnimationFrame(() => { const current = canvasDragRef.current; if (current) updateCanvasDrag(current.point); });
    const refresh = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { const current = canvasDragRef.current; if (current) updateCanvasDrag(current.point); }); };
    window.addEventListener("resize", refresh); window.addEventListener("scroll", refresh, true);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", refresh); window.removeEventListener("scroll", refresh, true); };
  }, [canvasDragging, panelOpen, state.previewMode, updateCanvasDrag]);
  useEffect(() => { if (!active) return; document.documentElement.dataset.homepageEditorActive = "true"; return () => { delete document.documentElement.dataset.homepageEditorActive; }; }, [active]);
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const header = state.present.header;
    const visible = (resolveHeaderResponsive(state, state.previewMode, "visible") as boolean | undefined) ?? true;
    const navigationLayout = (resolveHeaderResponsive(state, state.previewMode, "navigationLayout") as string | undefined) ?? "full";
    const values: Record<string, string> = {
      "--editor-header-height": header.height === undefined ? "" : `${header.height}px`,
      "--editor-header-spacing": header.horizontalSpacing === undefined ? "" : `${header.horizontalSpacing}px`,
      "--editor-header-background": header.background ?? "",
      "--editor-header-color": header.textColor ?? "",
      "--editor-header-display": visible ? "" : "none",
    };
    for (const [key, value] of Object.entries(values)) if (value) root.style.setProperty(key, value); else root.style.removeProperty(key);
    root.dataset.editorHeaderLayout = header.layout ?? "public"; root.dataset.editorHeaderNavigation = navigationLayout; root.dataset.editorHeaderActiveStyle = header.activeLinkStyle ?? "public";
    return () => { for (const key of Object.keys(values)) root.style.removeProperty(key); delete root.dataset.editorHeaderLayout; delete root.dataset.editorHeaderNavigation; delete root.dataset.editorHeaderActiveStyle; };
  }, [active, state]);
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "z") { event.preventDefault(); dispatch({ type: event.shiftKey ? "redo" : "undo" }); }
      else if (event.key.toLowerCase() === "y") { event.preventDefault(); dispatch({ type: "redo" }); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);
  if (!authorized) return <EditorContext.Provider value={passiveContext}><main id="main-content" className={publicStyles.homepage}>{children}</main></EditorContext.Provider>;
  if (!active) return <EditorContext.Provider value={passiveContext}><main id="main-content" className={publicStyles.homepage}>{children}</main><button type="button" className={styles.launchButton} onClick={() => setActive(true)} aria-label="Open homepage editor">Edit page</button></EditorContext.Provider>;
  const previewClass = state.previewMode === "tablet" ? publicStyles.tabletPreview : state.previewMode === "mobile" ? publicStyles.mobilePreview : "";
  const frameClass = state.previewMode === "desktop" ? styles.desktopFrame : state.previewMode === "tablet" ? styles.tabletFrame : styles.mobileFrame;
  const visibleCanvasDropZone = canvasDrag?.activeKey ? canvasDrag.zones.find((zone) => zone.key === canvasDrag.activeKey) ?? null : null;
  const canvasDragLabel = canvasDrag ? state.present.layout.nodes[canvasDrag.payload.nodeId]?.label ?? canvasDrag.payload.nodeId : "";
  return <EditorContext.Provider value={context}><div className={`${styles.editorWorkspace} ${panelOpen ? styles.workspacePanelOpen : ""} ${styles.layoutMode} ${canvasDragging ? styles.canvasDragging : ""}`} data-preview-mode={state.previewMode} data-editor-mode="direct">
    <div className={styles.editorBar} role="toolbar" aria-label="Homepage editor controls"><div className={styles.editorBarInner}><strong>Homepage editor</strong><div className={styles.previewModes} aria-label="Preview breakpoint">{editorBreakpoints.map((breakpoint) => <button key={breakpoint} type="button" aria-pressed={state.previewMode === breakpoint} onClick={() => dispatch({ type: "preview", breakpoint })}>{breakpoint[0].toUpperCase() + breakpoint.slice(1)}</button>)}</div><div className={styles.barActions}><button type="button" aria-controls="homepage-outline-drawer" aria-expanded={outlineOpen} onClick={() => setOutlineOpen((open) => !open)}>Outline</button><button type="button" disabled={!state.past.length} onClick={() => dispatch({ type: "undo" })}>Undo</button><button type="button" disabled={!state.future.length} onClick={() => dispatch({ type: "redo" })}>Redo</button><button type="button" aria-controls="homepage-property-panel" aria-expanded={panelOpen} onClick={() => setPanelOpen((open) => !open)}>{panelOpen ? "Close settings" : "More settings"}</button><button type="button" onClick={() => dispatch({ type: "reset-page" })}>Reset preview</button><button type="button" onClick={() => setActive(false)}>Exit edit mode</button></div>
      <div className={styles.persistActions}><button type="button" disabled={pending} onClick={saveDraft}>Save draft</button><button type="button" disabled={pending || version < 1} onClick={publishDraft}>Publish</button><button type="button" disabled={pending || version < 1} onClick={discardDraft}>Discard draft</button><output className={saveStatus.kind === "error" ? styles.persistError : styles.persistStatus} aria-live="polite">{saveStatusLabel(saveStatus)}</output></div></div></div>
    <div className={styles.previewArea}><div className={`${styles.previewSizer} ${frameClass}`}><div ref={previewFrameRef} className={styles.previewFrame}>{outlineOpen ? <GeneratedLayoutCanvas /> : null}<main id="main-content" className={`${publicStyles.homepage} ${previewClass}`}>{children}</main></div></div></div>
    <CanvasContainerSelectionLayer boundaries={containerBoundaries} selectedId={state.selectedId} dispatch={dispatch} />
    {canvasDrag ? <div className={styles.canvasDropLayer} aria-hidden="true">{visibleCanvasDropZone ? <div className={styles.canvasDropZone} data-drop-intent={visibleCanvasDropZone.intent} style={{ left: visibleCanvasDropZone.visualRect.left, top: visibleCanvasDropZone.visualRect.top, width: visibleCanvasDropZone.visualRect.width, height: visibleCanvasDropZone.visualRect.height }} /> : null}<div className={styles.canvasDragGhost} style={{ left: canvasDrag.point.x + 14, top: canvasDrag.point.y + 14 }}>Moving {canvasDragLabel}</div></div> : null}
    <ContextToolbar state={state} dispatch={dispatch} onMoreSettings={() => setPanelOpen(true)} />
    {panelOpen ? state.selectedId === "public-header" ? <HeaderPanel state={state} dispatch={dispatch} onClose={() => setPanelOpen(false)} /> : homepageTargetById[state.selectedId as HomepageTargetId] ? <PropertyPanel state={state} dispatch={dispatch} defaults={defaults} onClose={() => setPanelOpen(false)} /> : <LayoutPanel state={state} dispatch={dispatch} onClose={() => setPanelOpen(false)} /> : null}
    {outlineOpen ? <OutlineDrawer state={state} dispatch={dispatch} onClose={() => setOutlineOpen(false)} /> : null}
  </div></EditorContext.Provider>;
}
