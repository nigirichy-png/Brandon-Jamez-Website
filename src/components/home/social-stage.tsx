import { socialLinks } from "@/data/mock-data";

const initials: Record<string, string> = {
  "social-youtube": "YT",
  "social-instagram": "IG",
  "social-tiktok": "TT",
  "social-x": "X",
};

export function SocialStage() {
  return (
    <div className="grid overflow-hidden rounded-[var(--radius-lg)] border border-white/10 sm:grid-cols-2 lg:grid-cols-4">
      {socialLinks.map((social, index) => (
        <article key={social.id} className="group relative min-h-44 overflow-hidden border-b border-white/10 bg-[var(--surface)] p-6 last:border-b-0 sm:border-r sm:[&:nth-child(2)]:border-r-0 sm:[&:nth-child(3)]:border-b-0 lg:min-h-56 lg:border-b-0 lg:[&:nth-child(2)]:border-r lg:[&:last-child]:border-r-0">
          <div className="absolute -right-6 -top-8 font-display text-8xl font-bold text-white/[0.025] transition-transform duration-500 group-hover:-translate-x-2" aria-hidden="true">{initials[social.id]}</div>
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between">
              <span className="font-display grid size-11 place-items-center rounded-full border border-white/15 text-sm font-bold text-white">{initials[social.id]}</span>
              <span className="text-xs font-bold text-zinc-600">0{index + 1}</span>
            </div>
            <div className="mt-auto pt-8">
              <h3 className="font-display text-2xl font-bold text-white">{social.label}</h3>
              <p className="mt-1 text-sm text-zinc-500">{social.handle}</p>
              <p className="eyebrow mt-4 text-fuchsia-300/70">Not configured</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
