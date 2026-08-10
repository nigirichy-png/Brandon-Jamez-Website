import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const templates = new URL("../supabase/templates/", import.meta.url);

async function readTemplate(name: string) {
  return readFile(new URL(name, templates), "utf8");
}

test("confirmation email uses the server-side confirmation callback", async () => {
  const content = await readTemplate("confirmation.html");

  assert.match(content, /\/auth\/confirm\?token_hash=\{\{ \.TokenHash \}\}&amp;type=email/);
  assert.doesNotMatch(content, /\.ConfirmationURL/);
});

test("recovery email uses the recovery-only callback", async () => {
  const content = await readTemplate("recovery.html");

  assert.match(content, /\/auth\/recovery\?token_hash=\{\{ \.TokenHash \}\}&amp;type=recovery/);
  assert.doesNotMatch(content, /\/auth\/confirm/);
});

test("email-change email uses the allowlisted email-change token type", async () => {
  const content = await readTemplate("email-change.html");

  assert.match(content, /\/auth\/confirm\?token_hash=\{\{ \.TokenHash \}\}&amp;type=email_change/);
  assert.match(content, /\{\{ \.NewEmail \}\}/);
});

test("local Supabase config references every tracked auth template", async () => {
  const config = await readFile(new URL("../supabase/config.toml", import.meta.url), "utf8");

  for (const name of [
    "confirmation.html",
    "recovery.html",
    "email-change.html",
    "password-changed.html",
    "email-changed.html",
  ]) {
    assert.match(config, new RegExp(`content_path = "\\./supabase/templates/${name}"`));
  }
});

test("confirmation and recovery callbacks keep their token types separated", async () => {
  const [confirmation, recovery] = await Promise.all([
    readFile(new URL("../src/app/auth/confirm/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/auth/recovery/route.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(confirmation, /allowedTypes[^;]+"recovery"/s);
  assert.match(recovery, /rawType !== "recovery"/);
  assert.match(recovery, /type: "recovery"/);
});

test("server secrets can fall back to the legacy key without accepting placeholders", async () => {
  const [serverConfig, webhook] = await Promise.all([
    readFile(new URL("../src/lib/supabase/server-config.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/functions/stripe-webhook/index.ts", import.meta.url), "utf8"),
  ]);

  for (const source of [serverConfig, webhook]) {
    assert.match(source, /SUPABASE_SECRET_KEY/);
    assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(source, /placeholder/);
  }
  assert.doesNotMatch(serverConfig, /SUPABASE_SECRET_KEY\s*\?\?/);
  assert.doesNotMatch(webhook, /SUPABASE_SECRET_KEY"\)\s*\?\?/);
});
