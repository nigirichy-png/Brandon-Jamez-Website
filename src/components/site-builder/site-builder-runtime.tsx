"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { requestBuilderAccess } from "./builder-access-client";
import { publicV3SiteDefinition, siteBuilderBreakpoints, type SiteBuilderBreakpoint } from "./site-builder-model";
import styles from "./site-builder-runtime.module.css";

function routeKey(pathname: string): string { return /^\/subscriber\/[^/]+$/.test(pathname) ? "/subscriber/[slug]" : pathname; }
function isOperationalRoute(pathname: string): boolean { return /^\/(admin|cms|mod)(\/|$)/.test(pathname) || pathname === "/moderation-hub"; }

export function SiteBuilderRegion({ id, label, kind = "presentation", children, as: Tag = "div", className }: { id: string; label: string; kind?: "presentation" | "functional" | "dynamic"; children: ReactNode; as?: "div" | "section" | "header" | "footer" | "main"; className?: string }) {
  return <Tag className={className} data-site-builder-node={id} data-site-builder-label={label} data-site-builder-kind={kind}>{children}</Tag>;
}

export function SiteBuilderRuntime({ canEdit, children }: { canEdit?: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(canEdit === true);
  const [active, setActive] = useState(false); const [breakpoint, setBreakpoint] = useState<SiteBuilderBreakpoint>("desktop");
  const [selected, setSelected] = useState<HTMLElement | null>(null); const [outline, setOutline] = useState(false); const [panel, setPanel] = useState(false);
  const [revision, setRevision] = useState(0); const [future, setFuture] = useState(0); const [rect, setRect] = useState<DOMRect | null>(null);
  const key = routeKey(pathname); const definition = publicV3SiteDefinition.pages[key];
  const excluded = isOperationalRoute(pathname); const homepageUsesMigratedAdapter = pathname === "/";
  const registered = useMemo(() => definition ? Object.values(definition.nodes).filter((node) => node.id !== definition.rootId) : [], [definition]);
  useEffect(() => {
    if (canEdit !== undefined || excluded || homepageUsesMigratedAdapter || !definition) return;
    let current = true;
    void requestBuilderAccess().then((allowed) => { if (current) setAuthorized(allowed); });
    return () => { current = false; };
  }, [canEdit, definition, excluded, homepageUsesMigratedAdapter]);
  useEffect(() => {
    if (!active) return;
    document.documentElement.dataset.siteBuilderActive = "true"; document.documentElement.dataset.siteBuilderBreakpoint = breakpoint;
    const click = (event: MouseEvent) => { const target = event.target as HTMLElement; if (target.closest("[data-site-builder-ui]")) return; const candidate = target.closest<HTMLElement>("[data-site-builder-node],h1,h2,h3,p,label,a,img,video,nav,article,section,main,header,footer"); if (!candidate) return; if (target.matches("input,textarea,select,button") && !target.closest("[data-site-builder-explicit-handle]")) return; event.preventDefault(); if (!candidate.dataset.siteBuilderLabel) candidate.dataset.siteBuilderLabel = candidate.getAttribute("aria-label") || candidate.textContent?.trim().slice(0, 48) || candidate.tagName.toLowerCase(); setSelected(candidate); setRect(candidate.getBoundingClientRect()); };
    const refresh = () => selected && setRect(selected.getBoundingClientRect());
    document.addEventListener("click", click, true); window.addEventListener("resize", refresh); window.addEventListener("scroll", refresh, true);
    return () => { delete document.documentElement.dataset.siteBuilderActive; delete document.documentElement.dataset.siteBuilderBreakpoint; document.removeEventListener("click", click, true); window.removeEventListener("resize", refresh); window.removeEventListener("scroll", refresh, true); };
  }, [active, breakpoint, selected]);
  if (!authorized || excluded || homepageUsesMigratedAdapter) return children;
  if (!active) return <>{children}<button data-site-builder-ui type="button" className={styles.launch} onClick={() => setActive(true)}>Edit page</button></>;
  const selectById = (id: string) => { const explicit = document.querySelector<HTMLElement>(`[data-site-builder-node="${CSS.escape(id)}"]`); const index = registered.findIndex((node) => node.id === id); const element = explicit ?? (id === "global-header" ? document.querySelector<HTMLElement>("body > header") : id === "global-footer" ? document.querySelector<HTMLElement>("body > footer") : document.querySelectorAll<HTMLElement>("main > section, main > header, main > article")[Math.max(0,index)]); if (element) { if (!element.dataset.siteBuilderLabel) element.dataset.siteBuilderLabel = registered[index]?.label ?? (id === "global-header" ? "Public Header" : "Public Footer"); setSelected(element); setRect(element.getBoundingClientRect()); element.scrollIntoView({ block: "center" }); } };
  return <>
    {children}
    <div data-site-builder-ui className={styles.bar} role="toolbar" aria-label="Site builder controls"><strong>{key || "Current page"}</strong>{siteBuilderBreakpoints.map((entry) => <button key={entry} type="button" aria-pressed={breakpoint === entry} onClick={() => setBreakpoint(entry)}>{entry[0].toUpperCase() + entry.slice(1)}</button>)}<button type="button" aria-expanded={outline} onClick={() => setOutline(!outline)}>Outline</button><button type="button" disabled={!revision} onClick={() => { setRevision((value) => Math.max(0,value - 1)); setFuture((value) => value + 1); }}>Undo</button><button type="button" disabled={!future} onClick={() => { setFuture((value) => Math.max(0,value - 1)); setRevision((value) => value + 1); }}>Redo</button><button type="button" onClick={() => { setRevision(0); setFuture(0); setSelected(null); }}>Reset preview</button><button type="button" aria-expanded={panel} onClick={() => setPanel(!panel)}>More settings</button><button type="button" onClick={() => { setActive(false); setSelected(null); }}>Exit editor</button></div>
    {outline ? <aside data-site-builder-ui className={styles.outline} aria-label="Site outline"><h2>Outline</h2><button type="button" onClick={() => selectById("global-header")}>Header</button>{registered.map((node) => <button key={node.id} type="button" aria-pressed={selected?.dataset.siteBuilderNode === node.id} onClick={() => selectById(node.id)}>{node.label}</button>)}<button type="button" onClick={() => selectById("global-footer")}>Footer</button><details><summary>Keyboard movement</summary><p>Use the selected item’s Move handle, then arrow keys in a future persisted draft.</p></details></aside> : null}
    {panel ? <aside data-site-builder-ui className={styles.panel} aria-label="Builder settings"><h2>{selected?.dataset.siteBuilderLabel ?? "Page settings"}</h2><p>Presentation settings for {breakpoint}. Protected values and actions stay bound to their server component.</p><label>Font size <input type="range" min="8" max="240" defaultValue="16" /></label><details><summary>Advanced settings</summary><p>Line height, letter spacing and responsive source.</p></details></aside> : null}
    {selected && rect ? <><div data-site-builder-ui className={styles.selection} style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} /><div data-site-builder-ui className={styles.toolbar} role="toolbar" aria-label={`${selected.dataset.siteBuilderLabel} quick controls`} style={{ left: Math.max(8,Math.min(rect.left,window.innerWidth - 280)), top: Math.max(52,rect.top - 42) }}><button type="button">Edit</button><button type="button" data-site-builder-explicit-handle aria-label={`Move ${selected.dataset.siteBuilderLabel}`}>Move</button><button type="button" onClick={() => { setRevision((value) => value + 1); setFuture(0); }}>Reset</button></div></> : null}
  </>;
}
