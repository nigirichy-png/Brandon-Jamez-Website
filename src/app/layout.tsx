import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SiteBuilderRuntime } from "@/components/site-builder/site-builder-runtime";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { evaluateAdminAccess } from "@/lib/staff/evaluate-staff-access";

import "./globals.css";

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Space_Grotesk({
  variable: "--font-display-face",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Brandon Jamez Website",
    template: "%s | Brandon Jamez",
  },
  description: "The development-stage home of Brandon Jamez: public videos, live updates, events, and Pattaya stories.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const staffState = await resolveStaffAccessState(undefined);
  const canEditSite = !staffState.developmentPreview && evaluateAdminAccess(staffState).allowed;
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <SiteBuilderRuntime canEdit={canEditSite}>
          <Header />
          {children}
          <Footer />
        </SiteBuilderRuntime>
      </body>
    </html>
  );
}
