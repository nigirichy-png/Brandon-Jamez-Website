import Link from "next/link";

import { BrandMark } from "@/components/ui/brand-mark";
import { creatorLinks, creatorSocialLinks } from "@/data/public-links";

const footerLinks = [
  { href: "/", label: "Home", external: false },
  { href: "/videos", label: "Videos", external: false },
  { href: "/events", label: "Events", external: false },
  { href: creatorLinks.pattayaGuide, label: "Pattaya Guide", external: true },
  { href: "/account", label: "Account", external: false },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[var(--page-deep)] pb-[env(safe-area-inset-bottom)]">
      <div className="page-shell py-10 sm:py-12">
        <div className="grid gap-9 lg:grid-cols-[1.15fr_.8fr_1fr] lg:gap-12">
          <div>
            <BrandMark />
            <p className="mt-4 max-w-sm text-sm leading-7 text-zinc-400">Livestreams, nightlife, real moments and life in Pattaya.</p>
          </div>

          <nav aria-label="Footer navigation">
            <p className="eyebrow text-zinc-400">Explore</p>
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 sm:flex sm:flex-wrap lg:grid lg:grid-cols-2">
              {footerLinks.map((link) => link.external ? (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} (opens in a new tab)`} className="w-fit rounded py-1.5 text-sm font-bold text-zinc-300 hover:text-white">{link.label}</a>
              ) : (
                <Link key={link.label} href={link.href} className="w-fit rounded py-1.5 text-sm font-bold text-zinc-300 hover:text-white">{link.label}</Link>
              ))}
            </div>
          </nav>

          <nav aria-label="Brandon Jamez social profiles in footer">
            <p className="eyebrow text-zinc-400">Follow Brandon</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {creatorSocialLinks.map((social) => (
                <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.label} (opens in a new tab)`} className="inline-flex min-h-10 items-center rounded-full border border-white/10 px-3.5 py-2 text-xs font-bold text-zinc-300 transition-[border-color,color,background-color] hover:border-fuchsia-300/30 hover:bg-fuchsia-300/[0.06] hover:text-white">{social.label}<span className="ml-1.5 text-zinc-500" aria-hidden="true">↗</span></a>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-9 border-t border-white/10 pt-5 text-xs leading-5 text-zinc-500">
          <p>© 2026 Brandon Jamez</p>
        </div>
      </div>
    </footer>
  );
}
