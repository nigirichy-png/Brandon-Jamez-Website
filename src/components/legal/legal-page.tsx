import Link from "next/link";
import type { ReactNode } from "react";

type LegalPageProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  incomplete?: boolean;
}>;

const legalLinks = [
  { href: "/legal-notice", label: "Legal notice" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/support", label: "Support" },
];

export function LegalPage({ eyebrow, title, description, children, incomplete = false }: LegalPageProps) {
  return <main id="main-content" className="platform-page platform-legal-page flex-1">
    <header className="platform-shell platform-page-header py-12 sm:py-16">
      <p className="platform-kicker">{eyebrow}</p>
      <h1 className="platform-title">{title}</h1>
      <p className="platform-copy">{description}</p>
      {incomplete ? <div className="platform-legal-warning" role="status"><strong>Pre-launch information</strong><span>Required operator or contact details are not configured yet. This page must be completed and professionally reviewed before public launch.</span></div> : null}
    </header>
    <div className="platform-shell platform-legal-layout py-10 sm:py-14">
      <nav aria-label="Legal and support pages" className="platform-legal-nav">{legalLinks.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
      <article className="platform-legal-content">{children}</article>
    </div>
  </main>;
}

export function LegalSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return <section><h2>{title}</h2>{children}</section>;
}
