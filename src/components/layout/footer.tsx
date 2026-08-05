"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/ui/brand-mark";
import { creatorLinks, creatorSocialLinks } from "@/data/public-links";

const links = [{ href: "/", label: "Home", external: false }, { href: creatorLinks.pattayaGuide, label: "Pattaya Guide", external: true }, { href: "/videos", label: "Videos", external: false }, { href: "/account", label: "Account", external: false }] as const;

export function Footer() {
  const pathname = usePathname();
  if (pathname === "/guide") return null;
  return <footer className="border-t border-[var(--public-rule)] bg-[var(--public-ink)] text-[var(--public-paper)]"><div className="platform-shell grid gap-6 py-8 sm:grid-cols-[1fr_auto] sm:items-end"><div><div className="flex flex-wrap items-center gap-3"><BrandMark /><span className="text-xs font-bold uppercase tracking-[.14em] text-[var(--public-muted)]">Pattaya / ICT</span></div><p className="mt-3 max-w-md text-sm leading-6 text-[var(--public-muted)]">Livestreams, local perspective and real moments from Pattaya.</p></div><nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold" aria-label="Footer navigation">{links.map((link) => link.external ? <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} (opens in a new tab)`} className="hover:text-[var(--public-gold)]">{link.label}</a> : <Link key={link.href} href={link.href} className="hover:text-[var(--public-gold)]">{link.label}</Link>)}</nav><div className="border-t border-[var(--public-rule)] pt-4 sm:col-span-2 sm:flex sm:items-center sm:justify-between"><div className="flex flex-wrap gap-x-5 gap-y-2">{creatorSocialLinks.map((social) => <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.label} (opens in a new tab)`} className="text-[.62rem] font-bold uppercase tracking-[.12em] text-[var(--public-muted)] hover:text-[var(--public-gold)]">{social.label} ↗</a>)}</div><p className="mt-4 text-[.62rem] uppercase tracking-[.12em] text-[var(--public-muted)] sm:mt-0">© 2026 Brandon Jamez</p></div></div></footer>;
}
