export const siteBuilderSchemaVersion = 1;

export const siteBuilderBreakpoints = ["desktop", "tablet", "mobile"] as const;
export type SiteBuilderBreakpoint = (typeof siteBuilderBreakpoints)[number];
export type SiteBuilderNodeType =
  | "page" | "section" | "container" | "row" | "column" | "stack" | "grid"
  | "heading" | "text" | "label" | "button" | "link" | "image" | "video"
  | "navigation" | "status" | "divider" | "spacer" | "dynamic-content-slot";
export type SiteBuilderDropIntent = "before" | "after" | "left" | "right" | "inside";
export type SiteBuilderSemanticRole = "presentation" | "navigation" | "action" | "media" | "functional" | "dynamic";

export type SiteBuilderStyle = {
  visible?: boolean;
  order?: number;
  width?: number;
  maxWidth?: number;
  fontSize?: number;
  fontWeight?: 400 | 500 | 600 | 700 | 800 | 900;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: "left" | "center" | "right";
  direction?: "row" | "column";
  gridColumns?: number;
  gap?: number;
  padding?: number;
  background?: string;
  color?: string;
  imagePosition?: "center" | "top" | "bottom" | "left" | "right";
};

export type SiteBuilderContent = {
  text?: string;
  description?: string;
  url?: string;
  imageSrc?: string;
  alt?: string;
};

export type SiteBuilderNode = {
  id: string;
  type: SiteBuilderNodeType;
  semanticRole: SiteBuilderSemanticRole;
  label: string;
  content: SiteBuilderContent;
  style: SiteBuilderStyle;
  responsiveStyle: Partial<Record<SiteBuilderBreakpoint, SiteBuilderStyle>>;
  children: string[];
  parentId: string | null;
  lockedBehavior: "none" | "safe-unit" | "functional" | "immutable-container";
  allowedChildren: SiteBuilderNodeType[];
  sourceBinding?: string;
  generated?: boolean;
};

export type PageDefinition = {
  routeKey: string;
  rootId: string;
  nodes: Record<string, SiteBuilderNode>;
  responsiveOverrides: Partial<Record<SiteBuilderBreakpoint, Record<string, SiteBuilderStyle>>>;
};

export type SiteDefinition = {
  schemaVersion: number;
  globalTheme: { bodyFont: "Manrope"; displayFont: "Space Grotesk"; accent: string; background: string };
  header: PageDefinition;
  footer: PageDefinition;
  pages: Record<string, PageDefinition>;
};

const containers: SiteBuilderNodeType[] = ["page", "section", "container", "row", "column", "stack", "grid", "navigation"];
const content: SiteBuilderNodeType[] = ["heading", "text", "label", "button", "link", "image", "video", "status", "divider", "spacer", "dynamic-content-slot"];
const allowed = (type: SiteBuilderNodeType): SiteBuilderNodeType[] => type === "page" ? ["section", "container"] : containers.includes(type) ? [...containers.filter((entry) => entry !== "page"), ...content] : [];

function node(id: string, label: string, type: SiteBuilderNodeType, parentId: string | null, children: string[] = [], options: Partial<SiteBuilderNode> = {}): SiteBuilderNode {
  return { id, label, type, parentId, children, semanticRole: "presentation", content: {}, style: {}, responsiveStyle: {}, lockedBehavior: "none", allowedChildren: allowed(type), ...options };
}

function page(routeKey: string, groups: readonly { id: string; label: string; role?: SiteBuilderSemanticRole; binding?: string }[]): PageDefinition {
  const prefix = routeKey === "/" ? "home" : routeKey.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "page";
  const rootId = `${prefix}-page`;
  const nodes: Record<string, SiteBuilderNode> = { [rootId]: node(rootId, `${routeKey} page`, "page", null, groups.map((group) => `${prefix}-${group.id}`), { lockedBehavior: "immutable-container" }) };
  for (const group of groups) {
    const id = `${prefix}-${group.id}`;
    nodes[id] = node(id, group.label, group.binding ? "dynamic-content-slot" : "section", rootId, [], {
      semanticRole: group.role ?? (group.binding ? "dynamic" : "presentation"),
      lockedBehavior: group.binding ? "functional" : "safe-unit",
      sourceBinding: group.binding,
    });
  }
  return { routeKey, rootId, nodes, responsiveOverrides: {} };
}

const header = page("global:header", [
  { id: "brand", label: "Brand" }, { id: "navigation", label: "Primary navigation", role: "navigation" },
  { id: "account", label: "Account action", role: "functional", binding: "existing-auth-navigation" },
]);
const footer = page("global:footer", [
  { id: "brand", label: "Footer brand" }, { id: "navigation", label: "Footer navigation", role: "navigation" }, { id: "social", label: "Social links", role: "navigation" },
]);

export const publicV3SiteDefinition: Readonly<SiteDefinition> = Object.freeze<SiteDefinition>({
  schemaVersion: siteBuilderSchemaVersion,
  globalTheme: { bodyFont: "Manrope", displayFont: "Space Grotesk", accent: "#d8b35a", background: "#101010" },
  header,
  footer,
  pages: {
    "/": page("/", [{ id: "hero", label: "Hero" }, { id: "start", label: "Start here" }, { id: "features", label: "Features" }]),
    "/guide": page("/guide", [{ id: "intro", label: "Guide introduction" }, { id: "categories", label: "Guide categories" }, { id: "native-slot", label: "Native guide", binding: "future-native-guide" }]),
    "/videos": page("/videos", [{ id: "intro", label: "Videos introduction" }, { id: "collection", label: "Video collection", binding: "published-cms-videos" }]),
    "/subscriber": page("/subscriber", [{ id: "intro", label: "Subscriber introduction" }, { id: "posts", label: "Subscriber post list", binding: "authorized-subscriber-posts" }]),
    "/subscriber/[slug]": page("/subscriber/[slug]", [{ id: "article", label: "Subscriber article", binding: "authorized-subscriber-post" }]),
    "/account": page("/account", [{ id: "identity", label: "Account identity", binding: "real-account-state" }, { id: "subscription", label: "Subscription presentation", binding: "real-subscription-state" }, { id: "actions", label: "Account actions", binding: "existing-account-actions" }]),
    "/account/security": page("/account/security", [{ id: "intro", label: "Security introduction" }, { id: "forms", label: "Security forms", binding: "existing-security-actions" }]),
    "/login": page("/login", [{ id: "intro", label: "Authentication introduction" }, { id: "form", label: "Authentication form", binding: "existing-auth-action" }]),
    "/signup": page("/signup", [{ id: "intro", label: "Sign-up introduction" }, { id: "form", label: "Sign-up form", binding: "existing-auth-action" }]),
    "/forgot-password": page("/forgot-password", [{ id: "intro", label: "Password recovery introduction" }, { id: "form", label: "Password recovery form", binding: "existing-auth-action" }]),
    "/reset-password": page("/reset-password", [{ id: "intro", label: "Reset-password introduction" }, { id: "form", label: "Reset-password form", binding: "existing-auth-action" }]),
    "/verify-age": page("/verify-age", [{ id: "intro", label: "Age verification introduction" }, { id: "form", label: "Age verification form", binding: "existing-age-action" }]),
    "/auth/complete": page("/auth/complete", [{ id: "status", label: "Authentication status", binding: "existing-auth-state" }]),
    "/auth/error": page("/auth/error", [{ id: "status", label: "Authentication error", binding: "existing-auth-state" }]),
    "/auth/recovery/complete": page("/auth/recovery/complete", [{ id: "status", label: "Recovery status", binding: "existing-auth-state" }]),
  },
});

const chain = (breakpoint: SiteBuilderBreakpoint): SiteBuilderBreakpoint[] => breakpoint === "mobile" ? ["mobile", "tablet", "desktop"] : breakpoint === "tablet" ? ["tablet", "desktop"] : ["desktop"];
export function resolveSiteBuilderStyle(pageDefinition: PageDefinition, nodeId: string, breakpoint: SiteBuilderBreakpoint): SiteBuilderStyle {
  const result = { ...(pageDefinition.nodes[nodeId]?.style ?? {}) };
  for (const candidate of chain(breakpoint).reverse()) Object.assign(result, pageDefinition.nodes[nodeId]?.responsiveStyle[candidate], pageDefinition.responsiveOverrides[candidate]?.[nodeId]);
  return result;
}

export function sanitizeSiteBuilderNumber(value: unknown, min: number, max: number): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : undefined;
}
export const sanitizeFontSize = (value: unknown): number | undefined => sanitizeSiteBuilderNumber(value, 8, 240);
export function isSafeBuilderUrl(value: string, internal = true, httpsOnly = false): boolean {
  if (internal && /^\/(?!\/)[a-zA-Z0-9/_?=&.%#-]*$/.test(value)) return true;
  try { const url = new URL(value); return httpsOnly ? url.protocol === "https:" : url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
}
export function isSafeBuilderColor(value: string): boolean { return /^#[0-9a-f]{3,8}$/i.test(value) || /^(rgb|hsl)a?\([\d.% ,]+\)$/i.test(value); }
export function normalizeBuilderText(value: string, multiline = false): string {
  const plain = value.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return (multiline ? plain.replace(/\n{3,}/g, "\n\n") : plain.replace(/\s*\n\s*/g, " ")).trim().slice(0, multiline ? 5000 : 500);
}

export function validatePageDefinition(definition: PageDefinition): string[] {
  const errors: string[] = [];
  const ids = Object.keys(definition.nodes);
  if (!definition.nodes[definition.rootId]) errors.push("missing root");
  for (const current of Object.values(definition.nodes)) {
    if (current.id !== definition.rootId && (!current.parentId || !definition.nodes[current.parentId])) errors.push(`orphan:${current.id}`);
    if (new Set(current.children).size !== current.children.length) errors.push(`duplicate-child:${current.id}`);
    for (const childId of current.children) if (definition.nodes[childId]?.parentId !== current.id) errors.push(`parent-mismatch:${childId}`);
  }
  const visited = new Set<string>(); const active = new Set<string>();
  const visit = (id: string) => { if (active.has(id)) { errors.push(`cycle:${id}`); return; } if (visited.has(id)) return; active.add(id); for (const child of definition.nodes[id]?.children ?? []) visit(child); active.delete(id); visited.add(id); };
  visit(definition.rootId);
  for (const id of ids) if (!visited.has(id)) errors.push(`unreachable:${id}`);
  return [...new Set(errors)];
}

export function resolveSafeBuilderUnit(definition: PageDefinition, nodeId: string): SiteBuilderNode | null {
  let current = definition.nodes[nodeId];
  while (current && current.lockedBehavior === "functional" && current.children.length && current.parentId) current = definition.nodes[current.parentId];
  return current && current.id !== definition.rootId ? current : null;
}

export function moveSiteBuilderNode(definition: PageDefinition, nodeId: string, targetId: string, intent: SiteBuilderDropIntent, breakpoint: SiteBuilderBreakpoint): PageDefinition {
  const source = resolveSafeBuilderUnit(definition, nodeId); const target = definition.nodes[targetId];
  if (!source || !target || source.id === target.id) return definition;
  let cursor: SiteBuilderNode | undefined = target; while (cursor) { if (cursor.id === source.id) return definition; cursor = cursor.parentId ? definition.nodes[cursor.parentId] : undefined; }
  const next = structuredClone(definition) as PageDefinition;
  const oldParent = next.nodes[source.parentId ?? ""]; if (!oldParent) return definition;
  let parent = intent === "inside" ? next.nodes[target.id] : next.nodes[target.parentId ?? ""];
  if (!parent || !parent.allowedChildren.includes(source.type)) {
    if (intent === "left" || intent === "right") {
      const targetParent = next.nodes[target.parentId ?? ""]; if (!targetParent) return definition;
      const generatedId = `${definition.routeKey.replace(/\W/g, "") || "page"}-generated-${Object.keys(next.nodes).length + 1}`;
      next.nodes[generatedId] = node(generatedId, "Automatic layout", "row", targetParent.id, [target.id], { generated: true });
      targetParent.children.splice(targetParent.children.indexOf(target.id), 1, generatedId); next.nodes[target.id].parentId = generatedId; parent = next.nodes[generatedId];
    } else return definition;
  }
  oldParent.children = oldParent.children.filter((id) => id !== source.id);
  const targetIndex = parent.children.indexOf(target.id); const index = intent === "inside" ? parent.children.length : Math.max(0, targetIndex + (intent === "after" || intent === "right" ? 1 : 0));
  parent.children.splice(index, 0, source.id); next.nodes[source.id].parentId = parent.id;
  next.responsiveOverrides[breakpoint] = { ...(next.responsiveOverrides[breakpoint] ?? {}), [source.id]: { ...(next.responsiveOverrides[breakpoint]?.[source.id] ?? {}), order: index } };
  if (oldParent.generated && oldParent.children.length === 0) { const grand = next.nodes[oldParent.parentId ?? ""]; if (grand) grand.children = grand.children.filter((id) => id !== oldParent.id); delete next.nodes[oldParent.id]; }
  return validatePageDefinition(next).length ? definition : next;
}

export function serializeSiteDefinition(definition: SiteDefinition): string { return JSON.stringify(definition); }
