import Link from "next/link";

import { BrandMark } from "@/components/ui/brand-mark";
import { socialLinks } from "@/data/mock-data";

const footerLinks = [
  { href: "/videos", label: "Videos" },
  { href: "/events", label: "Events" },
  { href: "/guide", label: "Pattaya Guide" },
  { href: "/subscribe", label: "Subscribe" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[var(--page-deep)] pb-[env(safe-area-inset-bottom)]">
      <div className="page-shell py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_.7fr_.8fr]">
          <div>
            <BrandMark />
            <p className="mt-5 max-w-md text-sm leading-7 text-zinc-400">A development-stage creator and entertainment platform for Brandon Jamez. Content, destinations, and platform features remain safe placeholders.</p>
          </div>
          <nav aria-label="Footer navigation">
            <p className="eyebrow text-zinc-600">Explore</p>
            <div className="mt-4 grid gap-2">
              {footerLinks.map((link) => <Link key={link.href} href={link.href} className="w-fit rounded py-1 text-sm font-bold text-zinc-400 hover:text-white">{link.label}</Link>)}
            </div>
          </nav>
          <div>
            <p className="eyebrow text-zinc-600">Social placeholders</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {socialLinks.map((social) => <span key={social.id} title="Link not configured" className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-zinc-500">{social.label}</span>)}
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs leading-5 text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Brandon Jamez Website · Development preview</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/login" className="hover:text-zinc-300">Sign-in placeholder</Link><Link href="/verify-age" className="hover:text-zinc-300">Verification architecture</Link></div>
        </div>
      </div>
    </footer>
  );
}
