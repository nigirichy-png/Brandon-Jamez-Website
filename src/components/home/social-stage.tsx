import { creatorSocialLinks } from "@/data/public-links";

export function SocialStage() {
  return (
    <section className="page-shell pb-7 pt-4 sm:pb-9 sm:pt-5" aria-labelledby="social-links-title">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <p id="social-links-title" className="eyebrow shrink-0 text-zinc-400">Follow Brandon</p>
        <nav aria-label="Brandon Jamez social profiles" className="flex flex-wrap gap-2">
          {creatorSocialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${social.label} (opens in a new tab)`}
              className="inline-flex min-h-11 items-center rounded-full border border-white/12 bg-white/[0.035] px-4 py-2 text-sm font-bold text-zinc-200 transition-[background-color,border-color,color] duration-[var(--transition-fast)] hover:border-fuchsia-300/35 hover:bg-fuchsia-300/[0.08] hover:text-white"
            >
              {social.label}<span className="ml-2 text-xs text-zinc-500" aria-hidden="true">↗</span>
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
