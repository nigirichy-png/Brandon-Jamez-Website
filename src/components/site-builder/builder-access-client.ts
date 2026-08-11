const supabaseAuthCookiePattern = /^sb-.+-auth-token(?:\.\d+)?$/;

export type PublicShellAccess = {
  canEdit: boolean;
  authenticated: boolean;
  subscriberAccess: boolean;
};

const anonymousAccess: PublicShellAccess = { canEdit: false, authenticated: false, subscriberAccess: false };
let accessPromise: Promise<PublicShellAccess> | null = null;

function hasSupabaseAuthCookie(): boolean {
  return document.cookie
    .split(";")
    .map((cookie) => decodeURIComponent(cookie.split("=", 1)[0]?.trim() ?? ""))
    .some((name) => supabaseAuthCookiePattern.test(name));
}

/**
 * The public page never waits for this request. Only browsers with a Supabase
 * session cookie ask the server whether the editing controls may be shown.
 */
export function requestPublicShellAccess(): Promise<PublicShellAccess> {
  if (!hasSupabaseAuthCookie()) return Promise.resolve(anonymousAccess);
  if (accessPromise) return accessPromise;

  accessPromise = fetch("/api/staff/builder-access", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) return anonymousAccess;
      const result = await response.json() as Partial<PublicShellAccess>;
      return {
        canEdit: result.canEdit === true,
        authenticated: result.authenticated === true,
        subscriberAccess: result.subscriberAccess === true,
      };
    })
    .catch(() => anonymousAccess);

  return accessPromise;
}

export async function requestBuilderAccess(): Promise<boolean> {
  return (await requestPublicShellAccess()).canEdit;
}
