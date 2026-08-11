/**
 * Untrusted-document boundary for the persisted homepage live edit.
 *
 * Everything stored by the editor is replayed into public HTML, so a stored
 * document is treated exactly like request input: this module rebuilds a
 * known-good snapshot field by field and silently drops anything it does not
 * recognize. It never returns a partially trusted object, and it never throws
 * on malformed input — a broken document degrades to the published defaults
 * rather than taking the homepage down.
 *
 * Pure and dependency-free on purpose: the server actions, the storage layer
 * and the tests all run the identical code.
 */
import {
  canPlaceLayoutNode, createDefaultLayoutTree, createInitialSnapshot, editorBreakpoints, editorSchemaVersion, homepageBlockGroups,
  homepageTargetById, isSafeColor, isSafeExternalUrl, isSafeInternalAssetPath, isSafeLinkUrl, normalizeInlineText,
  type EditorBreakpoint, type EditorSnapshot, type GlobalStyle, type HeaderPreviewOverride, type HomepageBlockId,
  type HomepageTargetId, type LayoutNode, type LayoutResponsiveOverride, type LayoutTree, type ResponsiveStyle,
  type TargetContentOverride, type TargetOverride,
} from "../../components/home/homepage-editor-model.ts";

export const homepageRouteKey = "/";
export const homepageDocumentSchemaVersion = editorSchemaVersion;
/** Mirrors the 256 KB column constraint so oversized input fails before any database round trip. */
export const homepageDocumentMaxBytes = 262144;

type Dictionary = Record<string, unknown>;

const isDictionary = (value: unknown): value is Dictionary =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Bounded, finite numbers only. NaN, Infinity and numeric strings are rejected rather than coerced. */
function number(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100));
}

function integer(value: unknown, min: number, max: number): number | undefined {
  const parsed = number(value, min, max);
  return parsed === undefined ? undefined : Math.round(parsed);
}

function literal<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? value as T : undefined;
}

function boolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function color(value: unknown): string | undefined {
  return typeof value === "string" && isSafeColor(value) ? value : undefined;
}

/** Drops undefined values so a sanitized object never carries explicit holes into JSON. */
function compact<T extends object>(source: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) result[key as keyof T] = value as T[keyof T];
  }
  return result;
}

const textAligns = ["left", "center", "right"] as const;
const flexDirections = ["row", "column", "row-reverse", "column-reverse"] as const;
const objectPositions = ["center", "top", "bottom", "left", "right", "left top", "right top", "left bottom", "right bottom"] as const;
const textTransforms = ["none", "uppercase", "lowercase", "capitalize"] as const;
const shadows = ["none", "soft", "medium", "strong"] as const;
const overflows = ["visible", "hidden", "auto"] as const;
const alignments = ["start", "center", "end", "stretch"] as const;
const justifications = ["start", "center", "end", "space-between"] as const;
const objectFits = ["cover", "contain"] as const;
const layoutPresets = ["public", "equal-columns", "guide-wide", "subscriber-wide", "stacked"] as const;
const imagePlacements = ["left", "right"] as const;
const spacingPresets = ["compact", "normal", "spacious"] as const;
const widthPresets = ["auto", "third", "half", "two-thirds", "full"] as const;
const buttonStylePresets = ["primary", "secondary", "text"] as const;
const imageSizePresets = ["small", "medium", "large", "full"] as const;
const radiusPresets = ["square", "slightly-rounded", "rounded"] as const;
const fontWeights = [400, 500, 600, 700, 800, 900] as const;
const rowPresets = ["one", "two-equal", "one-third-two-thirds", "two-thirds-one-third", "three-equal"] as const;
const layoutDirections = ["row", "column"] as const;
const contentWidths = ["narrow", "standard", "wide", "full"] as const;
const headerLayouts = ["spread", "centered", "compact"] as const;
const headerActiveLinkStyles = ["underline", "pill", "accent"] as const;
const headerNavigationLayouts = ["full", "compact", "hidden"] as const;

function sanitizeContent(input: unknown, id: HomepageTargetId): TargetContentOverride | undefined {
  if (!isDictionary(input)) return undefined;
  const definition = homepageTargetById[id];
  const multiline = Boolean(definition?.multiline);
  const text = typeof input.text === "string" ? normalizeInlineText(input.text, multiline) : undefined;
  const description = typeof input.description === "string" ? normalizeInlineText(input.description, true) : undefined;
  // Accepted as either a same-origin path or an absolute http(s) URL. The link
  // component re-checks this at render time against its own internal/external
  // context, which stays the authoritative gate.
  const url = typeof input.url === "string" && isSafeLinkUrl(input.url, true) ? input.url : undefined;
  const imageSrc = typeof input.imageSrc === "string"
    && (isSafeExternalUrl(input.imageSrc, true) || isSafeInternalAssetPath(input.imageSrc))
    ? input.imageSrc : undefined;
  const alt = typeof input.alt === "string" ? normalizeInlineText(input.alt, false) : undefined;
  const result = compact({ text: text || undefined, description: description || undefined, url, imageSrc, alt });
  return Object.keys(result).length ? result : undefined;
}

function sanitizeResponsiveStyle(input: unknown): ResponsiveStyle | undefined {
  if (!isDictionary(input)) return undefined;
  const result = compact<ResponsiveStyle>({
    visible: boolean(input.visible),
    paddingTop: number(input.paddingTop, 0, 400), paddingRight: number(input.paddingRight, 0, 400),
    paddingBottom: number(input.paddingBottom, 0, 400), paddingLeft: number(input.paddingLeft, 0, 400),
    marginTop: number(input.marginTop, -400, 400), marginBottom: number(input.marginBottom, -400, 400),
    maxWidth: number(input.maxWidth, 0, 4000),
    fontSize: number(input.fontSize, 8, 240),
    textAlign: literal(input.textAlign, textAligns),
    flexDirection: literal(input.flexDirection, flexDirections),
    gap: number(input.gap, 0, 200),
    objectPosition: literal(input.objectPosition, objectPositions),
  });
  return Object.keys(result).length ? result : undefined;
}

function sanitizeGlobalStyle(input: unknown): GlobalStyle | undefined {
  if (!isDictionary(input)) return undefined;
  const fontWeight = typeof input.fontWeight === "number" && (fontWeights as readonly number[]).includes(input.fontWeight)
    ? input.fontWeight as GlobalStyle["fontWeight"] : undefined;
  const result = compact<GlobalStyle>({
    fontWeight,
    lineHeight: number(input.lineHeight, 0.5, 4),
    letterSpacing: number(input.letterSpacing, -10, 40),
    textTransform: literal(input.textTransform, textTransforms),
    maxTextWidth: number(input.maxTextWidth, 0, 4000),
    textColor: color(input.textColor), mutedColor: color(input.mutedColor), backgroundColor: color(input.backgroundColor),
    accentColor: color(input.accentColor), borderColor: color(input.borderColor),
    buttonBackground: color(input.buttonBackground), buttonTextColor: color(input.buttonTextColor),
    width: number(input.width, 0, 4000), minHeight: number(input.minHeight, 0, 4000),
    borderWidth: number(input.borderWidth, 0, 40), borderRadius: number(input.borderRadius, 0, 400),
    shadow: literal(input.shadow, shadows),
    overflow: literal(input.overflow, overflows),
    alignItems: literal(input.alignItems, alignments),
    justifyContent: literal(input.justifyContent, justifications),
    objectFit: literal(input.objectFit, objectFits),
    layoutPreset: literal(input.layoutPreset, layoutPresets),
    imagePlacement: literal(input.imagePlacement, imagePlacements),
    spacingPreset: literal(input.spacingPreset, spacingPresets),
    widthPreset: literal(input.widthPreset, widthPresets),
    buttonStylePreset: literal(input.buttonStylePreset, buttonStylePresets),
    imageSizePreset: literal(input.imageSizePreset, imageSizePresets),
    radiusPreset: literal(input.radiusPreset, radiusPresets),
  });
  return Object.keys(result).length ? result : undefined;
}

function sanitizeTargets(input: unknown): EditorSnapshot["targets"] {
  const targets: EditorSnapshot["targets"] = {};
  if (!isDictionary(input)) return targets;
  for (const [id, raw] of Object.entries(input)) {
    if (!Object.hasOwn(homepageTargetById, id) || !isDictionary(raw)) continue;
    const targetId = id as HomepageTargetId;
    const responsive: TargetOverride["responsive"] = {};
    if (isDictionary(raw.responsive)) {
      for (const breakpoint of editorBreakpoints) {
        const style = sanitizeResponsiveStyle(raw.responsive[breakpoint]);
        if (style) responsive[breakpoint] = style;
      }
    }
    const override = compact<TargetOverride>({
      content: sanitizeContent(raw.content, targetId),
      global: sanitizeGlobalStyle(raw.global),
      responsive: Object.keys(responsive).length ? responsive : undefined,
    });
    if (Object.keys(override).length) targets[targetId] = override;
  }
  return targets;
}

/** Keeps every known block exactly once: unknown ids are dropped and missing ids are appended in default order. */
function sanitizeOrder(input: unknown): EditorSnapshot["order"] {
  const order = {} as EditorSnapshot["order"];
  const source = isDictionary(input) ? input : {};
  for (const [group, ids] of Object.entries(homepageBlockGroups) as [keyof typeof homepageBlockGroups, readonly HomepageBlockId[]][]) {
    const raw = source[group];
    const candidate = Array.isArray(raw) ? raw.filter((id): id is HomepageBlockId => typeof id === "string" && (ids as readonly string[]).includes(id)) : [];
    const seen = new Set<HomepageBlockId>();
    const result: HomepageBlockId[] = [];
    for (const id of candidate) if (!seen.has(id)) { seen.add(id); result.push(id); }
    for (const id of ids) if (!seen.has(id)) result.push(id);
    order[group] = result;
  }
  return order;
}

function sanitizeLayoutResponsive(input: unknown): LayoutResponsiveOverride | undefined {
  if (!isDictionary(input)) return undefined;
  const result = compact<LayoutResponsiveOverride>({
    visible: boolean(input.visible),
    preset: literal(input.preset, rowPresets),
    direction: literal(input.direction, layoutDirections),
    justifyContent: literal(input.justifyContent, justifications),
    alignItems: literal(input.alignItems, alignments),
    gap: number(input.gap, 0, 200),
    wrap: boolean(input.wrap),
    minHeight: number(input.minHeight, 0, 4000),
    padding: number(input.padding, 0, 400),
    background: color(input.background),
    borderColor: color(input.borderColor),
    borderWidth: number(input.borderWidth, 0, 40),
    width: literal(input.width, widthPresets),
    contentWidth: literal(input.contentWidth, contentWidths),
    spacingPreset: literal(input.spacingPreset, spacingPresets),
    gapPreset: literal(input.gapPreset, spacingPresets),
  });
  return Object.keys(result).length ? result : undefined;
}

const generatedIdPattern = /^generated-[a-z0-9-]{1,40}$/;
const generatedTypes = ["section", "row", "column"] as const;

/**
 * Rebuilds the layout from the trusted default tree. Structural fields (type,
 * allowed children, immutability) are never taken from the document; only
 * per-breakpoint styling, placements and explicitly generated containers are.
 */
function sanitizeLayout(input: unknown): LayoutTree {
  const tree = createDefaultLayoutTree();
  if (!isDictionary(input)) return tree;

  if (isDictionary(input.nodes)) {
    for (const [id, raw] of Object.entries(input.nodes)) {
      if (!isDictionary(raw)) continue;
      const existing = tree.nodes[id];
      if (!existing && raw.generated === true && generatedIdPattern.test(id)) {
        const type = literal(raw.type, generatedTypes);
        if (!type) continue;
        const label = typeof raw.label === "string" ? normalizeInlineText(raw.label, false).slice(0, 80) : "";
        tree.nodes[id] = {
          id, label: label || "Layout container", type, parentId: null, children: [],
          allowedChildTypes: type === "section" ? ["row"] : type === "row" ? ["column", "block"] : ["block", "element"],
          immutable: false, generated: true, movable: true, defaultPosition: null, responsive: {},
        } satisfies LayoutNode;
      }
      const node = tree.nodes[id];
      if (!node || !isDictionary(raw.responsive)) continue;
      for (const breakpoint of editorBreakpoints) {
        const responsive = sanitizeLayoutResponsive(raw.responsive[breakpoint]);
        if (responsive) node.responsive[breakpoint] = responsive;
      }
    }
  }

  const rawPlacements: unknown = input.placements;
  if (isDictionary(rawPlacements)) {
    for (const breakpoint of editorBreakpoints) {
      const raw: unknown = rawPlacements[breakpoint];
      if (!isDictionary(raw)) continue;

      const candidates: [string, { parentId: string; index: number }][] = [];
      for (const [nodeId, entry] of Object.entries(raw)) {
        const placement: unknown = entry;
        if (!tree.nodes[nodeId] || nodeId === tree.rootId || !isDictionary(placement)) continue;
        const parentId = typeof placement.parentId === "string" ? placement.parentId : undefined;
        const index = integer(placement.index, 0, 1000);
        if (!parentId || !tree.nodes[parentId] || parentId === nodeId || index === undefined) continue;
        candidates.push([nodeId, { parentId, index }]);
      }

      /**
       * Each placement must satisfy the same rule the editor applies when it
       * permits a move: a movable node, an allowed child type, a compatible
       * column capability, and no ancestor cycle. Applying them one at a time
       * against the tree built so far is what makes the cycle check meaningful.
       *
       * The fixed-point loop matters: a saved document replays its placements in
       * storage order, not the order the editor made them, so a placement that
       * only becomes legal after another is applied would otherwise be dropped
       * and silently lose an editor's layout on reload.
       */
      const applied: Record<string, { parentId: string; index: number }> = {};
      tree.placements[breakpoint] = applied;
      for (let progress = true; progress && candidates.length;) {
        progress = false;
        for (let index = candidates.length - 1; index >= 0; index -= 1) {
          const [nodeId, placement] = candidates[index];
          if (!canPlaceLayoutNode(tree, nodeId, placement.parentId, breakpoint)) continue;
          applied[nodeId] = placement;
          candidates.splice(index, 1);
          progress = true;
        }
      }
      if (!Object.keys(applied).length) delete tree.placements[breakpoint];
    }
  }

  tree.nextGeneratedId = integer(input.nextGeneratedId, 1, 100000) ?? 1;
  return dropUnplacedGeneratedContainers(tree);
}

/** A generated container that no placement puts on the page can never be seen or removed, so it is not kept. */
function dropUnplacedGeneratedContainers(tree: LayoutTree): LayoutTree {
  for (const [id, node] of Object.entries(tree.nodes)) {
    if (!node.generated) continue;
    const placed = editorBreakpoints.some((breakpoint) => tree.placements[breakpoint]?.[id]);
    if (!placed) delete tree.nodes[id];
  }
  return tree;
}

function sanitizeHeader(input: unknown): HeaderPreviewOverride {
  const header: HeaderPreviewOverride = { responsive: {} };
  if (!isDictionary(input)) return header;
  Object.assign(header, compact({
    layout: literal(input.layout, headerLayouts),
    height: number(input.height, 0, 400),
    horizontalSpacing: number(input.horizontalSpacing, 0, 400),
    background: color(input.background),
    textColor: color(input.textColor),
    activeLinkStyle: literal(input.activeLinkStyle, headerActiveLinkStyles),
  }));
  if (isDictionary(input.responsive)) {
    for (const breakpoint of editorBreakpoints) {
      const raw = input.responsive[breakpoint];
      if (!isDictionary(raw)) continue;
      const entry = compact({
        visible: boolean(raw.visible),
        navigationLayout: literal(raw.navigationLayout, headerNavigationLayouts),
      });
      if (Object.keys(entry).length) header.responsive[breakpoint as EditorBreakpoint] = entry;
    }
  }
  return header;
}

/**
 * Rebuilds a trusted snapshot from arbitrary input. A document written by a
 * newer schema is not guessed at: it degrades to defaults so the public page
 * keeps rendering the shipped content instead of a half-understood mix.
 */
export function sanitizeHomepageDocument(input: unknown): EditorSnapshot {
  if (!isDictionary(input) || input.schemaVersion !== homepageDocumentSchemaVersion) return createInitialSnapshot();
  return {
    schemaVersion: homepageDocumentSchemaVersion,
    targets: sanitizeTargets(input.targets),
    order: sanitizeOrder(input.order),
    layout: sanitizeLayout(input.layout),
    header: sanitizeHeader(input.header),
  };
}

/** True when the snapshot carries no editorial change, so an empty draft is never stored or published. */
export function homepageDocumentIsDefault(snapshot: EditorSnapshot): boolean {
  return JSON.stringify(snapshot) === JSON.stringify(createInitialSnapshot());
}

export function homepageDocumentExceedsLimit(snapshot: EditorSnapshot): boolean {
  return Buffer.byteLength(JSON.stringify(snapshot), "utf8") > homepageDocumentMaxBytes;
}
