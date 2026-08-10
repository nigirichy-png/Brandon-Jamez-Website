import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path: string) {
  return readFile(new URL(path, root), "utf8");
}

test("footer permanently exposes legal and support routes", async () => {
  const footer = await source("src/components/layout/footer.tsx");

  for (const href of ["/support", "/privacy", "/terms", "/legal-notice"]) {
    assert.match(footer, new RegExp(`href: "${href}"`));
  }
});

test("legal pages fail visibly when required operator data is incomplete", async () => {
  const [config, shell] = await Promise.all([
    source("src/lib/site/legal-config.ts"),
    source("src/components/legal/legal-page.tsx"),
  ]);

  for (const variable of ["LEGAL_OPERATOR_NAME", "LEGAL_ENTITY_TYPE", "LEGAL_STREET_ADDRESS", "LEGAL_POSTAL_LOCALITY", "LEGAL_COUNTRY", "LEGAL_PHONE", "SUPPORT_EMAIL"]) {
    assert.match(config, new RegExp(`process\\.env\\.${variable}`));
  }
  assert.match(shell, /This page must be completed and professionally reviewed before public launch/);
});

test("privacy inventory covers current client storage and external providers", async () => {
  const privacy = await source("src/app/privacy/page.tsx");

  for (const fact of ["Supabase", "Vercel", "Mapbox", "bj-password-recovery", "favourite", "YouTube", "Vimeo", "Stripe", "Resend"]) {
    assert.match(privacy, new RegExp(fact));
  }
  assert.match(privacy, /Thailand Personal Data Protection Act/);
  assert.match(privacy, /General Data Protection Regulation/);
});

test("pre-launch terms do not claim that paid membership is active", async () => {
  const terms = await source("src/app/terms/page.tsx");

  assert.match(terms, /no paid membership contract can currently be concluded/);
  for (const topic of ["price", "billing interval", "cancellation", "billing period", "withdrawal", "mandatory protections"]) {
    assert.match(terms, new RegExp(topic, "i"));
  }
});
