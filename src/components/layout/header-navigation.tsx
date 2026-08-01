"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/ui/brand-mark";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/guide", label: "Pattaya Guide" },
  { href: "/videos", label: "Videos" },
  { href: "/events", label: "Events" },
];

export function HeaderNavigation({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const accountHref = authenticated ? "/account" : "/login";
  const accountLabel = authenticated ? "Account" : "Sign In";

  const closeMenu = (restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu(true);
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a, button"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(8,8,12,0.88)] pt-[env(safe-area-inset-top)] shadow-[0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-xl">
      <div className="page-shell flex min-h-16 items-center justify-between sm:min-h-18">
        <Link href="/" className="rounded-xl" aria-label="Brandon Jamez home">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`relative rounded-lg px-3.5 py-2.5 text-sm font-bold transition-colors ${isActive(item.href) ? "text-white after:absolute after:inset-x-3.5 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-cyan-300" : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"}`}
            >
              {item.label}
            </Link>
          ))}
          <span className="mx-2 h-6 w-px bg-white/15" aria-hidden="true" />
          <Link href={accountHref} aria-current={pathname === accountHref ? "page" : undefined} className="min-h-11 rounded-full border border-fuchsia-400/45 bg-fuchsia-400/[0.08] px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-fuchsia-400/15">
            {accountLabel}
          </Link>
        </nav>

        <button
          ref={triggerRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => menuOpen ? closeMenu() : setMenuOpen(true)}
          className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-white transition-colors hover:bg-white/[0.09] lg:hidden"
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          <span className="relative block h-4 w-5" aria-hidden="true">
            <span className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-transform ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition-transform ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </span>
        </button>
      </div>

      {menuOpen ? (
        <div className="absolute inset-x-0 top-full z-50 h-[calc(100dvh-4rem-env(safe-area-inset-top))] bg-black/75 sm:h-[calc(100dvh-4.5rem-env(safe-area-inset-top))] lg:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMenu(true); }}>
          <div ref={panelRef} id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Navigation menu" className="ml-auto flex h-full w-[min(88vw,25rem)] flex-col border-l border-white/10 bg-[#0d0d13] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl">
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              {navigation.map((item, index) => (
                <Link key={item.href} href={item.href} onClick={() => closeMenu()} aria-current={isActive(item.href) ? "page" : undefined} className={`flex min-h-14 items-center justify-between rounded-2xl px-4 text-base font-extrabold ${isActive(item.href) ? "bg-white/[0.08] text-white" : "text-zinc-300 hover:bg-white/[0.05] hover:text-white"}`}>
                  <span>{item.label}</span><span className="text-xs text-zinc-600">0{index + 1}</span>
                </Link>
              ))}
            </nav>
            <div className="mt-auto border-t border-white/10 pt-5">
              <p className="mb-4 px-2 text-sm leading-6 text-zinc-500">Secure account access and settings.</p>
              <Link href={accountHref} onClick={() => closeMenu()} className="flex min-h-14 items-center justify-center rounded-2xl bg-fuchsia-500 px-5 font-extrabold text-white shadow-[var(--shadow-accent)] hover:bg-fuchsia-400">
                {accountLabel}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
