import Link from "next/link";

export function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main id="main-content" className="platform-page platform-auth flex flex-1 items-center py-8 sm:py-12"><div className="platform-shell platform-auth-grid"><header><p className="platform-kicker">{eyebrow}</p><h1 className="platform-title">{title}</h1><p className="platform-copy">{description}</p><div className="platform-auth-note"><span>BJ</span><p>One account for subscriber access, security and billing.</p></div></header><div className="platform-auth-form">{children}<Link href="/" className="platform-text-link mt-5">← Return home</Link></div></div></main>;
}
