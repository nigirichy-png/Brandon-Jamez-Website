type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function PageHero({ eyebrow, title, description, children }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(229,79,236,0.14),transparent_35%),radial-gradient(circle_at_12%_80%,rgba(94,232,237,0.08),transparent_32%)]" aria-hidden="true" />
      <div className="absolute right-[8%] top-1/2 hidden h-px w-48 rotate-[-32deg] bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent lg:block" aria-hidden="true" />
      <div className="page-shell relative py-16 sm:py-24 lg:py-28">
        <p className="eyebrow mb-4 text-cyan-300">{eyebrow}</p>
        <h1 className="font-display max-w-5xl text-[clamp(2.75rem,10vw,5.9rem)] font-bold leading-[0.98] tracking-[-0.055em] text-white">
          {title}
        </h1>
        <p className="mt-5 max-w-[var(--content-copy)] text-[clamp(1rem,2.4vw,1.18rem)] leading-8 text-zinc-300">{description}</p>
        {children ? <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">{children}</div> : null}
      </div>
    </section>
  );
}
