import Link from "next/link";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "quiet";
  className?: string;
};

const variants = {
  primary:
    "bg-fuchsia-500 text-white shadow-[var(--shadow-accent)] hover:bg-fuchsia-400",
  secondary:
    "border border-white/15 bg-white/[0.045] text-white hover:border-cyan-300/45 hover:bg-white/[0.08]",
  quiet: "text-zinc-200 hover:bg-white/[0.08] hover:text-white",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-sm font-extrabold transition-[color,background-color,border-color,transform] duration-[var(--transition-fast)] ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
