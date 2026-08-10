export type CmsEventInput = { title: string; description: string; location: string; startsAt: string };

const controls = /[\p{Cc}\p{Cf}]/u;
function value(formData: FormData, name: string): string {
  const candidate = formData.get(name);
  return typeof candidate === "string" ? candidate.trim() : "";
}
function validText(input: string, minimum: number, maximum: number): boolean {
  return input.length >= minimum && input.length <= maximum && !controls.test(input);
}

export function parseCmsEventInput(formData: FormData): { ok: true; value: CmsEventInput } | { ok: false; message: string } {
  const title = value(formData, "title");
  const description = value(formData, "description");
  const location = value(formData, "location");
  const startsAtValue = value(formData, "startsAt");
  const parsedStart = new Date(startsAtValue);
  if (!validText(title, 1, 160)) return { ok: false, message: "Enter a title between 1 and 160 characters." };
  if (description.length > 4000 || controls.test(description)) return { ok: false, message: "The description must be 4,000 characters or fewer." };
  if (!validText(location, 1, 240)) return { ok: false, message: "Enter a location between 1 and 240 characters." };
  if (!startsAtValue || !Number.isFinite(parsedStart.getTime()) || parsedStart.getUTCFullYear() < 2000 || parsedStart.getUTCFullYear() > 2100) return { ok: false, message: "Choose a valid event date and time." };
  return { ok: true, value: { title, description, location, startsAt: parsedStart.toISOString() } };
}

export function cmsEventErrorMessage(message: string): string {
  if (message.includes("stale_event_version")) return "This event changed after the page loaded. Refresh and review the latest version.";
  if (message.includes("event_not_found")) return "This event no longer exists. Refresh the page.";
  if (message.includes("archived_event_locked")) return "Restore this archived event to draft before changing publication.";
  if (message.includes("archived_event_required")) return "Only archived events can be permanently deleted.";
  if (message.includes("active_content_editor_required") || message.includes("permission denied")) return "An active content manager or administrator account is required.";
  return "The event change could not be completed safely. Please try again.";
}
