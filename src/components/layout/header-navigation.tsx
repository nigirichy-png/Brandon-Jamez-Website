"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/ui/brand-mark";

const navigation = [{ href: "/", label: "Home" }, { href: "/guide", label: "Guide" }, { href: "/videos", label: "Videos" }];

export function HeaderNavigation({ authenticated, subscriberAccess }: { authenticated: boolean; subscriberAccess: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const accountHref = authenticated ? "/account" : "/login";
  const accountLabel = authenticated ? "Account" : "Sign in";
  const visibleNavigation = subscriberAccess ? [...navigation, { href: "/subscriber", label: "Subscriber" }] : navigation;
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
  return <header className="sticky top-0 z-50 border-b border-[var(--public-rule)] bg-[rgba(9,10,10,.96)] pt-[env(safe-area-inset-top)] text-[var(--public-paper)] backdrop-blur-md"><div className="platform-shell flex min-h-14 items-center gap-4"><Link href="/" aria-label="Brandon Jamez home"><BrandMark /></Link><p className="hidden items-center gap-2 border-l border-[var(--public-rule)] pl-4 text-[.58rem] font-extrabold uppercase tracking-[.12em] text-[var(--public-muted)] sm:flex"><span className="size-1.5 bg-[var(--public-night)]" aria-hidden="true" />Pattaya / ICT</p><nav className="ml-auto hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">{visibleNavigation.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={`relative flex min-h-10 items-center px-3 text-[.78rem] font-bold ${isActive(item.href) ? "text-[var(--public-paper)] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-[var(--public-gold)]" : "text-[var(--public-muted)] hover:text-[var(--public-paper)]"}`}>{item.label}</Link>)}</nav><Link href={accountHref} className="hidden min-h-9 items-center justify-center border border-[var(--public-rule)] px-4 text-[.78rem] font-extrabold hover:border-[var(--public-gold)] lg:inline-flex">{accountLabel}</Link><button ref={triggerRef} type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} onClick={() => menuOpen ? closeMenu() : setMenuOpen(true)} className="ml-auto grid min-h-11 min-w-11 place-items-center lg:hidden"><span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span><span className="relative block h-4 w-6" aria-hidden="true"><span className={`absolute left-0 top-0 h-px w-6 bg-current transition-transform ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} /><span className={`absolute left-0 top-[7px] h-px w-6 bg-current transition-opacity ${menuOpen ? "opacity-0" : ""}`} /><span className={`absolute left-0 top-[14px] h-px w-6 bg-current transition-transform ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} /></span></button></div>{menuOpen ? <div className="absolute inset-x-0 top-full h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] bg-black/70 lg:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMenu(true); }}><div ref={panelRef} id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Navigation menu" className="ml-auto flex h-full w-[min(92vw,23rem)] flex-col border-l border-[var(--public-rule)] bg-[var(--public-ink)] p-5"><p className="flex items-center gap-2 text-[.62rem] font-bold uppercase tracking-[.14em] text-[var(--public-gold)]"><span className="size-1.5 bg-[var(--public-night)]" aria-hidden="true" />Pattaya menu</p><nav className="mt-4 flex flex-col" aria-label="Mobile navigation">{visibleNavigation.map((item) => <Link key={item.href} href={item.href} onClick={() => closeMenu()} aria-current={isActive(item.href) ? "page" : undefined} className={`flex min-h-13 items-center border-b border-[var(--public-rule)] text-base font-semibold ${isActive(item.href) ? "text-[var(--public-gold)]" : "text-[var(--public-paper)]"}`}>{item.label}</Link>)}</nav><div className="mt-auto border-t border-[var(--public-rule)] pt-5"><Link href={accountHref} onClick={() => closeMenu()} className="public-action-secondary">{accountLabel}</Link></div></div></div> : null}</header>;
}
