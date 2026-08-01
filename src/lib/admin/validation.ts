export const assignableRoles = ["subscriber", "moderator", "content_manager", "admin"] as const;
export type AssignableRole = (typeof assignableRoles)[number];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

export function isAssignableRole(value: string): value is AssignableRole {
  return assignableRoles.some((role) => role === value);
}

export function parsePage(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !/^\d{1,4}$/.test(candidate)) return 1;
  const page = Number(candidate);
  return Number.isSafeInteger(page) && page >= 1 && page <= 1000 ? page : 1;
}
