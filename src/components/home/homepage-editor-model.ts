export const editorBreakpoints = ["desktop", "tablet", "mobile"] as const;
export type EditorBreakpoint = (typeof editorBreakpoints)[number];

export const homepageBlockGroups = {
  stage: ["hero-introduction", "portrait", "latest-drop", "live-status"],
  features: ["featured-content"],
} as const;

export type HomepageBlockId = (typeof homepageBlockGroups)[keyof typeof homepageBlockGroups][number];
export type HomepageElementId =
  | "hero-eyebrow" | "hero-heading" | "hero-heading-accent" | "hero-body" | "hero-youtube" | "hero-guide"
  | "portrait-image" | "portrait-badge"
  | "latest-label" | "latest-date" | "latest-media" | "latest-provider" | "latest-title" | "latest-intro" | "latest-watch" | "latest-all"
  | "status-label" | "status-time" | "status-link"
  | "guide-image" | "guide-kicker" | "guide-heading" | "guide-body" | "guide-link"
  | "subscriber-kicker" | "subscriber-heading" | "subscriber-body" | "subscriber-link";
export type HomepageTargetId = HomepageBlockId | HomepageElementId;
export type TargetKind = "block" | "text" | "link" | "image" | "media";
export type EditorMode = "content" | "design" | "layout";
export type LayoutNodeType = "page" | "section" | "row" | "column" | "block" | "element";
export type LayoutCapability = "general" | "content" | "media" | "action" | "utility";
export type LayoutRowPreset = "one" | "two-equal" | "one-third-two-thirds" | "two-thirds-one-third" | "three-equal";
export type LayoutDirection = "row" | "column";
export type LayoutResponsiveOverride = {
  visible?: boolean;
  preset?: LayoutRowPreset;
  direction?: LayoutDirection;
  justifyContent?: "start" | "center" | "end" | "space-between";
  alignItems?: "start" | "center" | "end" | "stretch";
  gap?: number;
  wrap?: boolean;
  minHeight?: number;
  padding?: number;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  width?: WidthPreset;
  contentWidth?: "narrow" | "standard" | "wide" | "full";
  spacingPreset?: SpacingPreset;
  gapPreset?: SpacingPreset;
};
export type LayoutPlacement = { parentId: string; index: number };
export type CanvasDropIntent = "before" | "after" | "inside" | "left" | "right";
export type CanvasDragPayload = {
  nodeId: string;
  nodeType: LayoutNodeType;
  parentId: string;
  breakpoint: EditorBreakpoint;
};
export type CanvasDropMove = LayoutPlacement & { intent: CanvasDropIntent; targetId: string };
export type LayoutNode = {
  id: string;
  label: string;
  type: LayoutNodeType;
  parentId: string | null;
  children: string[];
  allowedChildTypes: LayoutNodeType[];
  capability?: LayoutCapability;
  immutable: boolean;
  generated: boolean;
  movable: boolean;
  defaultPosition: LayoutPlacement | null;
  responsive: Partial<Record<EditorBreakpoint, LayoutResponsiveOverride>>;
};
export type LayoutTree = {
  rootId: "homepage";
  nodes: Record<string, LayoutNode>;
  placements: Partial<Record<EditorBreakpoint, Record<string, LayoutPlacement>>>;
  nextGeneratedId: number;
};
export type LayoutValueSource = "public" | EditorBreakpoint;
export const editorSchemaVersion = 1;

export type TargetDefinition = {
  id: HomepageTargetId;
  label: string;
  kind: TargetKind;
  parentId?: HomepageBlockId;
  group?: keyof typeof homepageBlockGroups;
  multiline?: boolean;
  internalLink?: boolean;
};

const blockDefinitions: TargetDefinition[] = [
  { id: "hero-introduction", label: "Hero introduction", kind: "block", group: "stage" },
  { id: "portrait", label: "Portrait", kind: "block", group: "stage" },
  { id: "latest-drop", label: "Latest drop", kind: "block", group: "stage" },
  { id: "live-status", label: "Live status", kind: "block", group: "stage" },
  { id: "featured-content", label: "Guide and subscriber features", kind: "block", group: "features" },
];

const element = (id: HomepageElementId, label: string, kind: TargetKind, parentId: HomepageBlockId, options: Partial<TargetDefinition> = {}): TargetDefinition => ({ id, label, kind, parentId, ...options });
const elementDefinitions: TargetDefinition[] = [
  element("hero-eyebrow", "Eyebrow", "text", "hero-introduction"), element("hero-heading", "Heading", "text", "hero-introduction"), element("hero-heading-accent", "Heading accent", "text", "hero-introduction"), element("hero-body", "Body text", "text", "hero-introduction", { multiline: true }), element("hero-youtube", "YouTube button", "link", "hero-introduction"), element("hero-guide", "Explore button", "link", "hero-introduction"),
  element("portrait-image", "Portrait image", "image", "portrait"), element("portrait-badge", "Portrait badge", "text", "portrait"),
  element("latest-label", "Latest label", "text", "latest-drop"), element("latest-date", "Latest date", "text", "latest-drop"), element("latest-media", "Latest video", "media", "latest-drop"), element("latest-provider", "Provider label", "text", "latest-drop"), element("latest-title", "Video title", "text", "latest-drop", { multiline: true }), element("latest-intro", "Videos introduction", "text", "latest-drop", { multiline: true }), element("latest-watch", "Watch link", "link", "latest-drop", { internalLink: true }), element("latest-all", "All videos link", "link", "latest-drop", { internalLink: true }),
  element("status-label", "Status label", "text", "live-status"), element("status-time", "Status time", "text", "live-status"), element("status-link", "Channel link", "link", "live-status"),
  element("guide-image", "Guide image", "image", "featured-content"), element("guide-kicker", "Guide label", "text", "featured-content"), element("guide-heading", "Guide heading", "text", "featured-content"), element("guide-body", "Guide body", "text", "featured-content", { multiline: true }), element("guide-link", "Guide link", "link", "featured-content", { internalLink: true }),
  element("subscriber-kicker", "Subscriber label", "text", "featured-content"), element("subscriber-heading", "Subscriber heading", "text", "featured-content", { multiline: true }), element("subscriber-body", "Subscriber body", "text", "featured-content", { multiline: true }), element("subscriber-link", "Subscriber button", "link", "featured-content", { internalLink: true }),
];

export const homepageTargetRegistry = [...blockDefinitions, ...elementDefinitions] as readonly TargetDefinition[];
export const homepageTargetById = Object.fromEntries(homepageTargetRegistry.map((target) => [target.id, target])) as Record<HomepageTargetId, TargetDefinition>;

export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";
export type TextAlign = "left" | "center" | "right";
export type FlexDirection = "row" | "column" | "row-reverse" | "column-reverse";
export type ObjectFit = "cover" | "contain";
export type ObjectPosition = "center" | "top" | "bottom" | "left" | "right" | "left top" | "right top" | "left bottom" | "right bottom";
export type ShadowPreset = "none" | "soft" | "medium" | "strong";
export type OverflowPreset = "visible" | "hidden" | "auto";
export type LayoutPreset = "public" | "equal-columns" | "guide-wide" | "subscriber-wide" | "stacked";
export type ImagePlacement = "left" | "right";
export type SpacingPreset = "compact" | "normal" | "spacious";
export type WidthPreset = "auto" | "third" | "half" | "two-thirds" | "full";
export type ButtonStylePreset = "primary" | "secondary" | "text";
export type ImageSizePreset = "small" | "medium" | "large" | "full";
export type RadiusPreset = "square" | "slightly-rounded" | "rounded";
export type ContextualTargetType = TargetKind | LayoutNodeType | "header";

export type ResponsiveStyle = {
  visible?: boolean;
  paddingTop?: number; paddingRight?: number; paddingBottom?: number; paddingLeft?: number;
  marginTop?: number; marginBottom?: number;
  maxWidth?: number;
  fontSize?: number;
  textAlign?: TextAlign;
  flexDirection?: FlexDirection;
  gap?: number;
  objectPosition?: ObjectPosition;
};

export type GlobalStyle = {
  fontWeight?: 400 | 500 | 600 | 700 | 800 | 900;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: TextTransform;
  maxTextWidth?: number;
  textColor?: string;
  mutedColor?: string;
  backgroundColor?: string;
  accentColor?: string;
  borderColor?: string;
  buttonBackground?: string;
  buttonTextColor?: string;
  width?: number;
  minHeight?: number;
  borderWidth?: number;
  borderRadius?: number;
  shadow?: ShadowPreset;
  overflow?: OverflowPreset;
  alignItems?: "start" | "center" | "end" | "stretch";
  justifyContent?: "start" | "center" | "end" | "space-between";
  objectFit?: ObjectFit;
  layoutPreset?: LayoutPreset;
  imagePlacement?: ImagePlacement;
  spacingPreset?: SpacingPreset;
  widthPreset?: WidthPreset;
  buttonStylePreset?: ButtonStylePreset;
  imageSizePreset?: ImageSizePreset;
  radiusPreset?: RadiusPreset;
};

export const simplePropertyGroups: Readonly<Record<ContextualTargetType, readonly string[]>> = {
  text: ["Content", "Typography", "Spacing", "Visibility"],
  link: ["Content", "Link", "Style", "Colors", "Layout", "Visibility"],
  image: ["Image", "Display", "Appearance", "Visibility"],
  media: ["Media", "Display", "Visibility"],
  block: ["Layout", "Spacing", "Appearance", "Visibility", "Move"],
  page: ["Layout", "Visibility"],
  section: ["Layout", "Spacing", "Appearance", "Visibility", "Move"],
  row: ["Columns", "Layout", "Appearance", "Move"],
  column: ["Width", "Layout", "Spacing", "Move"],
  element: ["Content", "Visibility", "Move"],
  header: ["Header layout", "Brand", "Navigation", "Account action", "Spacing", "Colors", "Responsive"],
};

export const advancedPropertyGroups = ["Exact spacing", "Detailed typography", "Borders and surface", "Responsive overrides", "Reset overrides"] as const;

export function propertyGroupsForTarget(type: ContextualTargetType, advanced = false): readonly string[] {
  return advanced ? advancedPropertyGroups : simplePropertyGroups[type];
}

export function normalizeInlineText(value: string, multiline: boolean): string {
  const plain = value.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return (multiline ? plain.replace(/\n{3,}/g, "\n\n") : plain.replace(/\s*\n\s*/g, " ")).trim().slice(0, multiline ? 5000 : 500);
}

export function finalizeInlineText(original: string, draft: string, multiline: boolean, commit: boolean): string {
  if (!commit) return original;
  return normalizeInlineText(draft, multiline) || original;
}

export function spacingPresetValues(preset: SpacingPreset): Pick<ResponsiveStyle, "paddingTop" | "paddingBottom"> {
  const value = preset === "compact" ? 8 : preset === "spacious" ? 32 : 18;
  return { paddingTop: value, paddingBottom: value };
}

export type TargetContentOverride = { text?: string; description?: string; url?: string; imageSrc?: string; alt?: string };
export type HomepageEditorDefaults = Partial<Record<HomepageTargetId, TargetContentOverride>>;
export type TargetOverride = { content?: TargetContentOverride; global?: GlobalStyle; responsive?: Partial<Record<EditorBreakpoint, ResponsiveStyle>> };
export type HeaderPreviewOverride = {
  layout?: "spread" | "centered" | "compact";
  height?: number;
  horizontalSpacing?: number;
  background?: string;
  textColor?: string;
  activeLinkStyle?: "underline" | "pill" | "accent";
  responsive: Partial<Record<EditorBreakpoint, { visible?: boolean; navigationLayout?: "full" | "compact" | "hidden" }>>;
};

const allowedChildren: Record<LayoutNodeType, LayoutNodeType[]> = {
  page: ["section"], section: ["row"], row: ["column", "block"], column: ["block", "element"], block: ["element"], element: [],
};

const layoutNode = (id: string, label: string, type: LayoutNodeType, parentId: string | null, children: string[], options: Partial<Pick<LayoutNode, "capability" | "immutable" | "generated" | "movable">> = {}): LayoutNode => {
  const node: LayoutNode = {
    id, label, type, parentId, children, allowedChildTypes: allowedChildren[type],
    immutable: options.immutable ?? true, generated: options.generated ?? false,
    movable: options.movable ?? type !== "page",
    defaultPosition: parentId ? { parentId, index: 0 } : null, responsive: {},
  };
  if (options.capability) node.capability = options.capability;
  return node;
};

export function createDefaultLayoutTree(): LayoutTree {
  const nodes: Record<string, LayoutNode> = {};
  const add = (node: LayoutNode) => { nodes[node.id] = node; };
  add(layoutNode("homepage", "Homepage", "page", null, ["hero-section", "feature-section"]));
  add(layoutNode("hero-section", "Hero section", "section", "homepage", ["hero-main-row", "hero-utility-row"]));
  add(layoutNode("hero-main-row", "Hero main row", "row", "hero-section", ["hero-introduction-column", "portrait-column", "latest-drop-column"]));
  add(layoutNode("hero-introduction-column", "Hero introduction column", "column", "hero-main-row", ["hero-introduction"], { capability: "content" }));
  add(layoutNode("portrait-column", "Portrait column", "column", "hero-main-row", ["portrait"], { capability: "media" }));
  add(layoutNode("latest-drop-column", "Latest drop column", "column", "hero-main-row", ["latest-drop"], { capability: "general" }));
  add(layoutNode("hero-utility-row", "Hero utility row", "row", "hero-section", ["live-status-column"]));
  add(layoutNode("live-status-column", "Live status area", "column", "hero-utility-row", ["live-status"], { capability: "utility" }));
  add(layoutNode("feature-section", "Guide / subscriber feature section", "section", "homepage", ["feature-row"]));
  add(layoutNode("feature-row", "Guide / subscriber row", "row", "feature-section", ["feature-column"]));
  add(layoutNode("feature-column", "Guide / subscriber features", "column", "feature-row", ["featured-content"], { capability: "general" }));
  for (const block of blockDefinitions) {
    const children = elementDefinitions.filter((entry) => entry.parentId === block.id).map((entry) => entry.id);
    const existing = nodes[block.id];
    const parentId = existing?.parentId ?? Object.values(nodes).find((node) => node.type === "column" && node.children.includes(block.id))?.id ?? null;
    add(layoutNode(block.id, block.label, "block", parentId, children));
  }
  const embeddedOrLayoutDependent = new Set<HomepageElementId>([
    "hero-heading-accent", "portrait-image", "portrait-badge", "latest-media", "guide-image", "guide-kicker", "guide-heading", "guide-body", "guide-link",
    "subscriber-kicker", "subscriber-heading", "subscriber-body", "subscriber-link",
  ]);
  for (const entry of elementDefinitions) add(layoutNode(entry.id, entry.label, "element", entry.parentId ?? null, [], { movable: !embeddedOrLayoutDependent.has(entry.id as HomepageElementId) }));
  nodes["hero-introduction"].children = nodes["hero-introduction"].children.filter((id) => id !== "hero-heading-accent");
  nodes["hero-heading"].children = ["hero-heading-accent"];
  nodes["hero-heading"].allowedChildTypes = ["element"];
  for (const node of Object.values(nodes)) {
    node.children.forEach((childId, index) => {
      if (nodes[childId]) {
        nodes[childId].parentId = node.id;
        nodes[childId].defaultPosition = { parentId: node.id, index };
      }
    });
  }
  return { rootId: "homepage", nodes, placements: {}, nextGeneratedId: 1 };
}

const breakpointChain = (breakpoint: EditorBreakpoint): EditorBreakpoint[] => breakpoint === "mobile" ? ["mobile", "tablet", "desktop"] : breakpoint === "tablet" ? ["tablet", "desktop"] : ["desktop"];

export function resolveLayoutPlacement(tree: LayoutTree, nodeId: string, breakpoint: EditorBreakpoint): LayoutPlacement | null {
  const node = tree.nodes[nodeId];
  if (!node || nodeId === tree.rootId) return null;
  for (const candidate of breakpointChain(breakpoint)) {
    const placement = tree.placements[candidate]?.[nodeId];
    if (placement) return placement;
  }
  return node.defaultPosition;
}

export function layoutPlacementSource(tree: LayoutTree, nodeId: string, breakpoint: EditorBreakpoint): LayoutValueSource {
  for (const candidate of breakpointChain(breakpoint)) if (tree.placements[candidate]?.[nodeId]) return candidate;
  return "public";
}

export function resolveLayoutChildren(tree: LayoutTree, parentId: string, breakpoint: EditorBreakpoint): string[] {
  return Object.values(tree.nodes)
    .filter((node) => resolveLayoutPlacement(tree, node.id, breakpoint)?.parentId === parentId)
    .sort((a, b) => {
      const left = resolveLayoutPlacement(tree, a.id, breakpoint)?.index ?? 0;
      const right = resolveLayoutPlacement(tree, b.id, breakpoint)?.index ?? 0;
      return left - right || a.id.localeCompare(b.id);
    }).map((node) => node.id);
}

export function resolveLayoutValue<K extends keyof LayoutResponsiveOverride>(tree: LayoutTree, nodeId: string, breakpoint: EditorBreakpoint, key: K): LayoutResponsiveOverride[K] | undefined {
  for (const candidate of breakpointChain(breakpoint)) {
    const value = tree.nodes[nodeId]?.responsive[candidate]?.[key];
    if (value !== undefined) return value;
  }
  return undefined;
}

export function layoutValueSource<K extends keyof LayoutResponsiveOverride>(tree: LayoutTree, nodeId: string, breakpoint: EditorBreakpoint, key: K): LayoutValueSource {
  for (const candidate of breakpointChain(breakpoint)) if (tree.nodes[nodeId]?.responsive[candidate]?.[key] !== undefined) return candidate;
  return "public";
}

function nodeCapability(node: LayoutNode): LayoutCapability {
  if (node.type === "block") return node.id === "live-status" ? "utility" : "general";
  const target = homepageTargetById[node.id as HomepageTargetId];
  if (target?.kind === "image" || target?.kind === "media") return "media";
  if (target?.kind === "link") return "action";
  return "content";
}

export function canPlaceLayoutNode(tree: LayoutTree, nodeId: string, parentId: string, breakpoint: EditorBreakpoint): boolean {
  const node = tree.nodes[nodeId];
  const parent = tree.nodes[parentId];
  if (!node || !parent || !node.movable || node.id === tree.rootId || node.id === parent.id || !parent.allowedChildTypes.includes(node.type)) return false;
  if (node.type === "block") {
    const currentParentId = resolveLayoutPlacement(tree, node.id, breakpoint)?.parentId;
    const currentParent = currentParentId ? tree.nodes[currentParentId] : undefined;
    if (currentParent?.type === "column") {
      const currentChildren = resolveLayoutChildren(tree, currentParent.id, breakpoint);
      const remainingBlocks = currentChildren.filter((id) => id !== node.id && tree.nodes[id]?.type === "block");
      const directElements = currentChildren.filter((id) => tree.nodes[id]?.type === "element");
      if (!remainingBlocks.length && directElements.length) return false;
    }
  }
  let ancestor: string | null = parentId;
  while (ancestor) {
    if (ancestor === nodeId) return false;
    ancestor = resolveLayoutPlacement(tree, ancestor, breakpoint)?.parentId ?? null;
  }
  if (parent.type === "column" && parent.capability && parent.capability !== "general") {
    const capability = nodeCapability(node);
    if (capability !== parent.capability && !(parent.capability === "content" && capability === "action")) return false;
  }
  return true;
}

export function createCanvasDragPayload(tree: LayoutTree, selectedId: string, breakpoint: EditorBreakpoint): CanvasDragPayload | null {
  const node = tree.nodes[selectedId];
  const placement = resolveLayoutPlacement(tree, selectedId, breakpoint);
  if (!node?.movable || !placement) return null;
  return { nodeId: selectedId, nodeType: node.type, parentId: placement.parentId, breakpoint };
}

const directHeroColumnByBlock: Partial<Record<HomepageBlockId, string>> = {
  "hero-introduction": "hero-introduction-column",
  portrait: "portrait-column",
  "latest-drop": "latest-drop-column",
};

export function createDirectCanvasDragPayload(tree: LayoutTree, selectedId: string, breakpoint: EditorBreakpoint): CanvasDragPayload | null {
  const node = resolveSafeMovableLayoutNode(tree, selectedId, breakpoint);
  return node ? createCanvasDragPayload(tree, node.id, breakpoint) : null;
}

export function nearestMovableLayoutParent(tree: LayoutTree, nodeId: string, breakpoint: EditorBreakpoint): LayoutNode | null {
  let parentId = resolveLayoutPlacement(tree, nodeId, breakpoint)?.parentId ?? null;
  while (parentId) {
    const parent = tree.nodes[parentId];
    if (!parent) return null;
    if (parent.movable && resolveLayoutPlacement(tree, parent.id, breakpoint)) return parent;
    parentId = resolveLayoutPlacement(tree, parent.id, breakpoint)?.parentId ?? null;
  }
  return null;
}

export function resolveSafeMovableLayoutNode(tree: LayoutTree, selectedId: string, breakpoint: EditorBreakpoint): LayoutNode | null {
  const selected = tree.nodes[selectedId];
  if (!selected) return null;
  const safeNode = selected.movable ? selected : nearestMovableLayoutParent(tree, selectedId, breakpoint);
  if (!safeNode) return null;
  const columnId = directHeroColumnByBlock[safeNode.id as HomepageBlockId];
  const blockPlacement = resolveLayoutPlacement(tree, safeNode.id, breakpoint);
  const columnPlacement = columnId ? resolveLayoutPlacement(tree, columnId, breakpoint) : null;
  if (columnId && blockPlacement?.parentId === columnId && columnPlacement?.parentId === "hero-main-row") return tree.nodes[columnId] ?? safeNode;
  return safeNode;
}

export function hasPassedCanvasDragThreshold(startX: number, startY: number, currentX: number, currentY: number, threshold = 6): boolean {
  return Math.hypot(currentX - startX, currentY - startY) >= threshold;
}

export function resolveCanvasDropMove(tree: LayoutTree, payload: CanvasDragPayload, targetId: string, intent: CanvasDropIntent): CanvasDropMove | null {
  if (!tree.nodes[payload.nodeId] || !tree.nodes[targetId] || targetId === payload.nodeId) return null;
  const breakpoint = payload.breakpoint;
  if (intent === "inside") {
    if (!canPlaceLayoutNode(tree, payload.nodeId, targetId, breakpoint)) return null;
    const index = resolveLayoutChildren(tree, targetId, breakpoint).filter((id) => id !== payload.nodeId).length;
    return { targetId, intent, parentId: targetId, index };
  }
  const targetPlacement = resolveLayoutPlacement(tree, targetId, breakpoint);
  if (!targetPlacement || !canPlaceLayoutNode(tree, payload.nodeId, targetPlacement.parentId, breakpoint)) return null;
  const siblings = resolveLayoutChildren(tree, targetPlacement.parentId, breakpoint).filter((id) => id !== payload.nodeId);
  const targetIndex = siblings.indexOf(targetId);
  if (targetIndex < 0) return null;
  const after = intent === "after" || intent === "right";
  return { targetId, intent, parentId: targetPlacement.parentId, index: targetIndex + (after ? 1 : 0) };
}

export function moveLayoutNode(tree: LayoutTree, nodeId: string, parentId: string, index: number, breakpoint: EditorBreakpoint): LayoutTree {
  if (!canPlaceLayoutNode(tree, nodeId, parentId, breakpoint)) return tree;
  const current = resolveLayoutPlacement(tree, nodeId, breakpoint);
  const siblings = resolveLayoutChildren(tree, parentId, breakpoint).filter((id) => id !== nodeId);
  const safeIndex = Math.max(0, Math.min(index, siblings.length));
  if (current?.parentId === parentId && resolveLayoutChildren(tree, parentId, breakpoint).indexOf(nodeId) === safeIndex) return tree;
  const next = structuredClone(tree);
  const placements = { ...(next.placements[breakpoint] ?? {}) };
  const reordered = [...siblings];
  reordered.splice(safeIndex, 0, nodeId);
  reordered.forEach((id, childIndex) => { placements[id] = { parentId, index: childIndex }; });
  if (current && current.parentId !== parentId) {
    resolveLayoutChildren(tree, current.parentId, breakpoint).filter((id) => id !== nodeId).forEach((id, childIndex) => { placements[id] = { parentId: current.parentId, index: childIndex }; });
  }
  next.placements[breakpoint] = placements;
  return next;
}

export function addLayoutContainer(tree: LayoutTree, type: "section" | "row" | "column", parentId: string, breakpoint: EditorBreakpoint): { tree: LayoutTree; nodeId?: string } {
  const parent = tree.nodes[parentId];
  if (!parent || !parent.allowedChildTypes.includes(type)) return { tree };
  const next = structuredClone(tree);
  const number = next.nextGeneratedId++;
  const nodeId = `layout-${type}-${number}`;
  next.nodes[nodeId] = layoutNode(nodeId, `New ${type} ${number}`, type, parentId, [], { capability: type === "column" ? "general" : undefined, immutable: false, generated: true });
  next.nodes[nodeId].defaultPosition = { parentId, index: resolveLayoutChildren(tree, parentId, breakpoint).length };
  return { tree: next, nodeId };
}

export function addLayoutRowPreset(tree: LayoutTree, parentId: string, preset: LayoutRowPreset, breakpoint: EditorBreakpoint): { tree: LayoutTree; nodeId?: string } {
  const rowResult = addLayoutContainer(tree, "row", parentId, breakpoint);
  if (!rowResult.nodeId) return rowResult;
  let next = rowResult.tree;
  const count = preset === "one" ? 1 : preset === "three-equal" ? 3 : 2;
  for (let index = 0; index < count; index += 1) next = addLayoutContainer(next, "column", rowResult.nodeId, breakpoint).tree;
  next.nodes[rowResult.nodeId].responsive[breakpoint] = { preset };
  return { tree: next, nodeId: rowResult.nodeId };
}

export function canRemoveLayoutContainer(tree: LayoutTree, nodeId: string): { allowed: boolean; reason: string } {
  const node = tree.nodes[nodeId];
  if (!node || !["section", "row", "column"].includes(node.type)) return { allowed: false, reason: "Only layout containers can be removed." };
  if (node.immutable || !node.generated) return { allowed: false, reason: "Public V3 default containers are immutable; hide them instead." };
  const hasChildren = editorBreakpoints.some((breakpoint) => resolveLayoutChildren(tree, nodeId, breakpoint).length > 0);
  return hasChildren ? { allowed: false, reason: "Move every child out before removing this container." } : { allowed: true, reason: "Empty generated container." };
}

export function removeLayoutContainer(tree: LayoutTree, nodeId: string): LayoutTree {
  if (!canRemoveLayoutContainer(tree, nodeId).allowed) return tree;
  const next = structuredClone(tree);
  delete next.nodes[nodeId];
  for (const breakpoint of editorBreakpoints) {
    const placements = { ...(next.placements[breakpoint] ?? {}) };
    delete placements[nodeId];
    next.placements[breakpoint] = placements;
  }
  return next;
}

export type EditorSnapshot = { schemaVersion: number; targets: Partial<Record<HomepageTargetId, TargetOverride>>; order: Record<keyof typeof homepageBlockGroups, HomepageBlockId[]>; layout: LayoutTree; header: HeaderPreviewOverride };
export type EditorState = { past: EditorSnapshot[]; present: EditorSnapshot; future: EditorSnapshot[]; selectedId: string; previewMode: EditorBreakpoint; mode: EditorMode };

export const createInitialSnapshot = (): EditorSnapshot => ({
  schemaVersion: editorSchemaVersion,
  targets: {},
  order: Object.fromEntries(Object.entries(homepageBlockGroups).map(([group, ids]) => [group, [...ids]])) as EditorSnapshot["order"],
  layout: createDefaultLayoutTree(),
  header: { responsive: {} },
});

/** `snapshot` seeds the editor from a stored draft. It must already be sanitized; callers never pass raw storage input. */
export const createInitialEditorState = (snapshot?: EditorSnapshot): EditorState => ({ past: [], present: snapshot ?? createInitialSnapshot(), future: [], selectedId: "hero-introduction", previewMode: "desktop", mode: "layout" });

const clone = <T>(value: T): T => structuredClone(value);
const snapshotsEqual = (a: EditorSnapshot, b: EditorSnapshot) => JSON.stringify(a) === JSON.stringify(b);
const commit = (state: EditorState, next: EditorSnapshot): EditorState => snapshotsEqual(state.present, next) ? state : { ...state, past: [...state.past.slice(-49), clone(state.present)], present: next, future: [] };

export type EditorAction =
  | { type: "select"; id: string }
  | { type: "mode"; mode: EditorMode }
  | { type: "preview"; breakpoint: EditorBreakpoint }
  | { type: "content"; id: HomepageTargetId; key: keyof TargetContentOverride; value: string | undefined }
  | { type: "global"; id: HomepageTargetId; key: keyof GlobalStyle; value: GlobalStyle[keyof GlobalStyle] | undefined }
  | { type: "global-patch"; id: HomepageTargetId; values: Partial<GlobalStyle> }
  | { type: "responsive"; id: HomepageTargetId; breakpoint: EditorBreakpoint; key: keyof ResponsiveStyle; value: ResponsiveStyle[keyof ResponsiveStyle] | undefined }
  | { type: "responsive-patch"; id: HomepageTargetId; breakpoint: EditorBreakpoint; values: Partial<ResponsiveStyle> }
  | { type: "spacing-preset"; id: HomepageTargetId; breakpoint: EditorBreakpoint; preset: SpacingPreset | undefined }
  | { type: "move"; id: HomepageBlockId; direction: -1 | 1 }
  | { type: "reset-target"; id: HomepageTargetId }
  | { type: "reset-block"; id: HomepageBlockId }
  | { type: "reset-breakpoint"; id: HomepageTargetId; breakpoint: EditorBreakpoint }
  | { type: "reset-all-breakpoints"; id: HomepageTargetId }
  | { type: "layout-move"; id: string; parentId: string; index: number; breakpoint: EditorBreakpoint }
  | { type: "layout-add"; nodeType: "section" | "row" | "column"; parentId: string; breakpoint: EditorBreakpoint }
  | { type: "layout-add-row-preset"; parentId: string; preset: LayoutRowPreset; breakpoint: EditorBreakpoint }
  | { type: "layout-remove"; id: string }
  | { type: "layout-responsive"; id: string; breakpoint: EditorBreakpoint; key: keyof LayoutResponsiveOverride; value: LayoutResponsiveOverride[keyof LayoutResponsiveOverride] | undefined }
  | { type: "layout-reset-selected"; id: string }
  | { type: "layout-reset-section"; id: string }
  | { type: "layout-reset-breakpoint"; breakpoint: EditorBreakpoint }
  | { type: "layout-reset-all" }
  | { type: "header-global"; key: Exclude<keyof HeaderPreviewOverride, "responsive">; value: HeaderPreviewOverride[Exclude<keyof HeaderPreviewOverride, "responsive">] | undefined }
  | { type: "header-responsive"; breakpoint: EditorBreakpoint; key: "visible" | "navigationLayout"; value: boolean | "full" | "compact" | "hidden" | undefined }
  | { type: "reset-header" }
  | { type: "reset-page" }
  | { type: "load"; snapshot: EditorSnapshot }
  | { type: "undo" } | { type: "redo" };

function cleanTarget(target: TargetOverride): TargetOverride | undefined {
  const content = target.content && Object.keys(target.content).length ? target.content : undefined;
  const global = target.global && Object.keys(target.global).length ? target.global : undefined;
  const responsiveEntries = Object.entries(target.responsive ?? {}).filter(([, value]) => value && Object.keys(value).length);
  const responsive = responsiveEntries.length ? Object.fromEntries(responsiveEntries) : undefined;
  return content || global || responsive ? { content, global, responsive } : undefined;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === "select") return { ...state, selectedId: action.id };
  // Replaces the document wholesale when a stored draft arrives. History is
  // cleared on purpose: undoing past a loaded draft would silently resurrect
  // content the editor never saw.
  if (action.type === "load") return { ...state, past: [], present: clone(action.snapshot), future: [] };
  if (action.type === "mode") return { ...state, mode: action.mode };
  if (action.type === "preview") return { ...state, previewMode: action.breakpoint };
  if (action.type === "undo") {
    if (!state.past.length) return state;
    return { ...state, past: state.past.slice(0, -1), present: clone(state.past[state.past.length - 1]), future: [clone(state.present), ...state.future].slice(0, 50) };
  }
  if (action.type === "redo") {
    if (!state.future.length) return state;
    return { ...state, past: [...state.past.slice(-49), clone(state.present)], present: clone(state.future[0]), future: state.future.slice(1) };
  }
  if (action.type === "reset-page") return commit(state, createInitialSnapshot());

  const next = clone(state.present);
  if (action.type === "header-global") {
    if (action.value === undefined) delete next.header[action.key] as never;
    else (next.header as Record<string, unknown>)[action.key] = action.value;
    return commit(state, next);
  }
  if (action.type === "header-responsive") {
    const responsive = { ...(next.header.responsive[action.breakpoint] ?? {}) };
    if (action.value === undefined) delete responsive[action.key] as never;
    else (responsive as Record<string, unknown>)[action.key] = action.value;
    next.header.responsive = { ...next.header.responsive };
    if (Object.keys(responsive).length) next.header.responsive[action.breakpoint] = responsive;
    else delete next.header.responsive[action.breakpoint];
    return commit(state, next);
  }
  if (action.type === "reset-header") { next.header = { responsive: {} }; return commit(state, next); }
  if (action.type === "layout-move") {
    const layout = moveLayoutNode(next.layout, action.id, action.parentId, action.index, action.breakpoint);
    if (layout === next.layout) return state;
    next.layout = layout;
    return commit(state, next);
  }
  if (action.type === "layout-add") {
    const result = addLayoutContainer(next.layout, action.nodeType, action.parentId, action.breakpoint);
    if (!result.nodeId) return state;
    next.layout = result.tree;
    return { ...commit(state, next), selectedId: result.nodeId };
  }
  if (action.type === "layout-add-row-preset") {
    const result = addLayoutRowPreset(next.layout, action.parentId, action.preset, action.breakpoint);
    if (!result.nodeId) return state;
    next.layout = result.tree;
    return { ...commit(state, next), selectedId: result.nodeId };
  }
  if (action.type === "layout-remove") {
    const parentId = resolveLayoutPlacement(next.layout, action.id, state.previewMode)?.parentId ?? next.layout.rootId;
    const layout = removeLayoutContainer(next.layout, action.id);
    if (layout === next.layout) return state;
    next.layout = layout;
    return { ...commit(state, next), selectedId: parentId };
  }
  if (action.type === "layout-responsive") {
    const node = next.layout.nodes[action.id];
    if (!node) return state;
    const override = { ...(node.responsive[action.breakpoint] ?? {}) };
    if (action.value === undefined) delete override[action.key] as never;
    else (override as Record<string, unknown>)[action.key] = action.value;
    node.responsive = { ...node.responsive };
    if (Object.keys(override).length) node.responsive[action.breakpoint] = override;
    else delete node.responsive[action.breakpoint];
    return commit(state, next);
  }
  if (action.type === "layout-reset-selected") {
    const defaults = createDefaultLayoutTree();
    const defaultNode = defaults.nodes[action.id];
    const node = next.layout.nodes[action.id];
    if (!node) return state;
    if (defaultNode) {
      next.layout.nodes[action.id] = clone(defaultNode);
      for (const breakpoint of editorBreakpoints) {
        const placements = { ...(next.layout.placements[breakpoint] ?? {}) };
        delete placements[action.id];
        next.layout.placements[breakpoint] = placements;
      }
    } else {
      node.responsive = {};
      for (const breakpoint of editorBreakpoints) {
        const placements = { ...(next.layout.placements[breakpoint] ?? {}) };
        delete placements[action.id];
        next.layout.placements[breakpoint] = placements;
      }
    }
    return commit(state, next);
  }
  if (action.type === "layout-reset-section") {
    let sectionId: string | null = action.id;
    while (sectionId && next.layout.nodes[sectionId]?.type !== "section") sectionId = resolveLayoutPlacement(next.layout, sectionId, state.previewMode)?.parentId ?? null;
    if (!sectionId) return state;
    const belongsToSection = (id: string) => {
      let current: string | null = id;
      while (current) { if (current === sectionId) return true; current = resolveLayoutPlacement(next.layout, current, state.previewMode)?.parentId ?? null; }
      return false;
    };
    const defaults = createDefaultLayoutTree();
    for (const [id, node] of Object.entries(next.layout.nodes)) if (belongsToSection(id)) node.responsive = clone(defaults.nodes[id]?.responsive ?? {});
    for (const breakpoint of editorBreakpoints) {
      const placements = { ...(next.layout.placements[breakpoint] ?? {}) };
      for (const id of Object.keys(placements)) if (belongsToSection(id)) delete placements[id];
      next.layout.placements[breakpoint] = placements;
    }
    return commit(state, next);
  }
  if (action.type === "layout-reset-breakpoint") {
    delete next.layout.placements[action.breakpoint];
    for (const node of Object.values(next.layout.nodes)) {
      node.responsive = { ...node.responsive };
      delete node.responsive[action.breakpoint];
    }
    return commit(state, next);
  }
  if (action.type === "layout-reset-all") {
    next.layout = createDefaultLayoutTree();
    return commit(state, next);
  }
  if (action.type === "move") {
    const group = homepageTargetById[action.id].group;
    if (!group) return state;
    const order = next.order[group];
    const from = order.indexOf(action.id);
    const to = from + action.direction;
    if (from < 0 || to < 0 || to >= order.length) return state;
    [order[from], order[to]] = [order[to], order[from]];
    return commit(state, next);
  }
  if (action.type === "spacing-preset") {
    const target = clone(next.targets[action.id] ?? {});
    target.global = { ...target.global };
    if (action.preset) target.global.spacingPreset = action.preset; else delete target.global.spacingPreset;
    target.responsive = { ...target.responsive, [action.breakpoint]: { ...target.responsive?.[action.breakpoint] } };
    if (action.preset) Object.assign(target.responsive[action.breakpoint]!, spacingPresetValues(action.preset));
    else { delete target.responsive[action.breakpoint]!.paddingTop; delete target.responsive[action.breakpoint]!.paddingBottom; }
    const cleaned = cleanTarget(target);
    if (cleaned) next.targets[action.id] = cleaned; else delete next.targets[action.id];
    return commit(state, next);
  }
  if (action.type === "reset-target") {
    delete next.targets[action.id];
    return commit(state, next);
  }
  if (action.type === "reset-block") {
    delete next.targets[action.id];
    for (const target of homepageTargetRegistry) if (target.parentId === action.id) delete next.targets[target.id];
    const layoutChildrenToReset = homepageTargetRegistry.filter((target) => target.kind !== "block" && (
      target.parentId === action.id || editorBreakpoints.some((breakpoint) => resolveLayoutPlacement(next.layout, target.id, breakpoint)?.parentId === action.id)
    )).map((target) => target.id);
    for (const childId of layoutChildrenToReset) {
      next.layout.nodes[childId].responsive = {};
      for (const breakpoint of editorBreakpoints) {
        const placements = { ...(next.layout.placements[breakpoint] ?? {}) };
        delete placements[childId];
        next.layout.placements[breakpoint] = placements;
      }
    }
    const group = homepageTargetById[action.id].group;
    if (group) {
      const original = [...homepageBlockGroups[group]] as HomepageBlockId[];
      next.order[group] = next.order[group].filter((id) => id !== action.id);
      next.order[group].splice(original.indexOf(action.id), 0, action.id);
    }
    return commit(state, next);
  }
  const target = clone(next.targets[action.id] ?? {});
  if (action.type === "content") {
    target.content = { ...target.content };
    if (action.value === undefined) delete target.content[action.key]; else target.content[action.key] = action.value;
  }
  if (action.type === "global") {
    target.global = { ...target.global };
    if (action.value === undefined) delete target.global[action.key] as never; else (target.global as Record<string, unknown>)[action.key] = action.value;
  }
  if (action.type === "global-patch") target.global = { ...target.global, ...action.values };
  if (action.type === "responsive") {
    target.responsive = { ...target.responsive, [action.breakpoint]: { ...target.responsive?.[action.breakpoint] } };
    const values = target.responsive[action.breakpoint]!;
    if (action.value === undefined) delete values[action.key] as never; else (values as Record<string, unknown>)[action.key] = action.value;
  }
  if (action.type === "responsive-patch") target.responsive = { ...target.responsive, [action.breakpoint]: { ...target.responsive?.[action.breakpoint], ...action.values } };
  if (action.type === "reset-breakpoint") {
    target.responsive = { ...target.responsive };
    delete target.responsive[action.breakpoint];
  }
  if (action.type === "reset-all-breakpoints") target.responsive = undefined;
  const cleaned = cleanTarget(target);
  if (cleaned) next.targets[action.id] = cleaned; else delete next.targets[action.id];
  return commit(state, next);
}

export function resolveResponsiveValue<K extends keyof ResponsiveStyle>(target: TargetOverride | undefined, breakpoint: EditorBreakpoint, key: K): ResponsiveStyle[K] | undefined {
  const values = target?.responsive;
  if (breakpoint === "mobile") return values?.mobile?.[key] ?? values?.tablet?.[key] ?? values?.desktop?.[key];
  if (breakpoint === "tablet") return values?.tablet?.[key] ?? values?.desktop?.[key];
  return values?.desktop?.[key];
}

export function responsiveValueSource<K extends keyof ResponsiveStyle>(target: TargetOverride | undefined, breakpoint: EditorBreakpoint, key: K): "public" | EditorBreakpoint {
  const values = target?.responsive;
  if (values?.[breakpoint]?.[key] !== undefined) return breakpoint;
  if (breakpoint === "mobile" && values?.tablet?.[key] !== undefined) return "tablet";
  if (breakpoint !== "desktop" && values?.desktop?.[key] !== undefined) return "desktop";
  return "public";
}

export function sanitizeNumber(value: string, min: number, max: number): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, Math.round(parsed * 100) / 100));
}

export function isSafeExternalUrl(value: string, httpsOnly = false): boolean {
  try {
    const url = new URL(value);
    return httpsOnly ? url.protocol === "https:" : url.protocol === "https:" || url.protocol === "http:";
  } catch { return false; }
}

export function isSafeLinkUrl(value: string, allowInternal: boolean): boolean {
  if (allowInternal && /^\/[a-z0-9/_-]*(?:\?[a-z0-9_=&%-]*)?$/i.test(value)) return !value.startsWith("//");
  return isSafeExternalUrl(value);
}

export function isSafeColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

/**
 * Same-origin asset path. A protocol-relative "//host" value would load a
 * third-party origin, so it is rejected even though it starts with a slash.
 */
export function isSafeInternalAssetPath(value: string): boolean {
  return /^\/[a-zA-Z0-9/_.-]*$/.test(value) && !value.startsWith("//") && !value.includes("..");
}
