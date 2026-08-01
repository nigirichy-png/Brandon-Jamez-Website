type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow mb-3 text-cyan-300">
        {eyebrow}
      </p>
      <h2 className="font-display text-[clamp(2rem,6vw,3.5rem)] font-bold leading-[1.03] tracking-[-0.045em] text-white">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 max-w-[var(--content-copy)] text-[clamp(1rem,2vw,1.08rem)] leading-7 text-zinc-400">{description}</p>
      ) : null}
    </div>
  );
}
