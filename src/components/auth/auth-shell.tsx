import Link from "next/link";

export function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main id="main-content" className="platform-page platform-auth flex flex-1 items-center"><div className="platform-shell platform-auth-grid"><header><div className="platform-member-label"><span>{eyebrow}</span><b>18+</b></div><h1 className="platform-title">{title}</h1><p className="platform-copy">{description}</p><div className="platform-auth-benefits"><span>Raw video</span><span>Private images</span><span>Special events</span></div><div className="platform-auth-note"><span aria-hidden="true">✓</span><p>Secure account access for membership, age verification and billing.</p></div></header><div className="platform-auth-form">{children}<Link href="/" className="platform-text-link mt-5">← Return home</Link></div></div></main>;
}
