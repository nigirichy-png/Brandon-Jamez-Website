"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/ui/brand-mark";
import { PattayaTime } from "@/components/ui/pattaya-time";
import { requestPublicShellAccess } from "@/components/site-builder/builder-access-client";

import styles from "./header-navigation.module.css";

const navigation = [{ href: "/", label: "Home" }, { href: "/guide", label: "Guide" }, { href: "/videos", label: "Videos" }];

export function HeaderNavigation({ moderationHubPreview }: { moderationHubPreview: boolean }) {
  const pathname = usePathname();
  const [access, setAccess] = useState({ authenticated: false, subscriberAccess: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const accountHref = access.authenticated ? "/account" : "/login";
  const accountLabel = access.authenticated ? "Account" : "Sign in";
  const visibleNavigation = [...navigation, ...(moderationHubPreview ? [{ href: "/moderation-hub", label: "Mod Hub" }] : []), ...(access.subscriberAccess ? [{ href: "/subscriber", label: "Subscriber" }] : [])];
  useEffect(() => {
    let current = true;
    void requestPublicShellAccess().then((state) => {
      if (current) setAccess({ authenticated: state.authenticated, subscriberAccess: state.subscriberAccess });
    });
    return () => { current = false; };
  }, []);
  const closeMenu = (restoreFocus = false) => { setMenuOpen(false); if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus()); };
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") return closeMenu(true);
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a, button"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", handleKeyDown); };
  }, [menuOpen]);
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const isInternal = ["/admin", "/mod", "/content"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) || pathname === "/moderation-hub";
  if (isInternal) return null;
  return <>
    <input ref={triggerRef} id="mobile-navigation-toggle" type="checkbox" checked={menuOpen} onChange={(event) => setMenuOpen(event.target.checked)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} className="peer sr-only lg:hidden" />
    <header className={`${styles.header} sticky top-0 z-50 border-b pt-[env(safe-area-inset-top)] text-[var(--public-paper)]`}>
      <div className={`${styles.shell} mx-auto flex min-h-14 items-center gap-4`}>
        <Link href="/" aria-label="Brandon Jamez home" className={styles.brandLink}><BrandMark /></Link>
        <p className={`${styles.location} hidden items-center gap-2 border-l pl-4 text-[.58rem] font-extrabold uppercase tracking-[.12em] sm:flex`}><span className={`${styles.locationDot} size-1.5`} aria-hidden="true" /><PattayaTime /></p>
        <nav className="ml-auto hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">{visibleNavigation.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ""} relative flex min-h-10 items-center px-3 text-[.78rem] font-bold`}>{item.label}</Link>)}</nav>
        <Link href={accountHref} className={`${styles.accountLink} hidden min-h-9 items-center justify-center border px-4 text-[.78rem] font-extrabold lg:inline-flex`}>{accountLabel}</Link>
        <label htmlFor="mobile-navigation-toggle" className={`${styles.menuToggle} ml-auto grid min-h-11 min-w-11 cursor-pointer place-items-center lg:hidden`}>
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          <span className="relative block h-4 w-6" aria-hidden="true"><span className={`absolute left-0 top-0 h-px w-6 bg-current transition-transform ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} /><span className={`absolute left-0 top-[7px] h-px w-6 bg-current transition-opacity ${menuOpen ? "opacity-0" : ""}`} /><span className={`absolute left-0 top-[14px] h-px w-6 bg-current transition-transform ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} /></span>
        </label>
      </div>
    </header>
    <div className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-[60] hidden bg-black/70 peer-checked:flex lg:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMenu(true); }}>
      <div ref={panelRef} id="mobile-navigation" role="dialog" aria-modal={menuOpen ? "true" : undefined} aria-label="Navigation menu" className={`${styles.menuPanel} ml-auto flex h-full w-[min(92vw,23rem)] flex-col border-l p-5 shadow-2xl`}>
        <p className={`${styles.mobileKicker} flex items-center gap-2 text-[.62rem] font-bold uppercase tracking-[.14em]`}><span className={`${styles.locationDot} size-1.5`} aria-hidden="true" />Pattaya menu</p>
        <nav className="mt-4 flex flex-col" aria-label="Mobile navigation">{visibleNavigation.map((item) => <Link key={item.href} href={item.href} onClick={() => closeMenu()} aria-current={isActive(item.href) ? "page" : undefined} className={`flex min-h-13 items-center border-b border-[var(--public-rule)] text-base font-semibold ${isActive(item.href) ? styles.mobileActive : "text-[var(--public-paper)]"}`}>{item.label}</Link>)}</nav>
        <div className="mt-auto border-t border-[var(--public-rule)] pt-5"><Link href={accountHref} onClick={() => closeMenu()} className="public-action-secondary">{accountLabel}</Link></div>
      </div>
    </div>
  </>;
}
