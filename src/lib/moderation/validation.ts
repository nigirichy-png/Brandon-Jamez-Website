import { moderationSeverities, moderationStatuses, type ModerationSeverity, type ModerationStatus } from "./model.ts";

export type ModerationCaseInput = {
  title: string;
  sourceType: string;
  category: string;
  severity: ModerationSeverity;
  summary: string;
  evidenceReference: string | null;
};

const controls = /[\p{Cc}\p{Cf}]/u;

function field(formData: FormData, name: string): string {
  const candidate = formData.get(name);
  return typeof candidate === "string" ? candidate.trim() : "";
}

function validPlainText(value: string, minimum: number, maximum: number): boolean {
  return value.length >= minimum && value.length <= maximum && !controls.test(value);
}

export function parseModerationCaseInput(formData: FormData):
  | { ok: true; value: ModerationCaseInput }
  | { ok: false; message: string } {
  const title = field(formData, "title");
  const sourceType = field(formData, "sourceType");
  const category = field(formData, "category");
  const severityValue = field(formData, "severity");
  const summary = field(formData, "summary");
  const evidenceValue = field(formData, "evidenceReference");

  if (!validPlainText(title, 1, 160)) return { ok: false, message: "Enter a title between 1 and 160 characters." };
  if (!validPlainText(sourceType, 1, 80)) return { ok: false, message: "Enter a source between 1 and 80 characters." };
  if (!validPlainText(category, 1, 80)) return { ok: false, message: "Enter a category between 1 and 80 characters." };
  if (!moderationSeverities.includes(severityValue as ModerationSeverity)) return { ok: false, message: "Choose a valid severity." };
  if (!validPlainText(summary, 1, 4000)) return { ok: false, message: "Enter a summary between 1 and 4,000 characters." };
  if (evidenceValue && !validPlainText(evidenceValue, 1, 500)) return { ok: false, message: "The evidence reference must be 500 characters or fewer." };

  return {
    ok: true,
    value: {
      title,
      sourceType,
      category,
      severity: severityValue as ModerationSeverity,
      summary,
      evidenceReference: evidenceValue || null,
    },
  };
}

export function parseModerationStatus(formData: FormData): { status: ModerationStatus; note: string | null } | null {
  const statusValue = field(formData, "status");
  const noteValue = field(formData, "note");
  if (!moderationStatuses.includes(statusValue as ModerationStatus)) return null;
  if (noteValue && !validPlainText(noteValue, 1, 500)) return null;
  return { status: statusValue as ModerationStatus, note: noteValue || null };
}

export function moderationErrorMessage(message: string): string {
  if (message.includes("stale_moderation_case_version")) return "This case changed after the page loaded. Refresh and review the latest version.";
  if (message.includes("moderation_case_not_found")) return "This case no longer exists. Refresh the page.";
  if (message.includes("moderation_case_already_assigned")) return "This case is already assigned to another staff member.";
  if (message.includes("moderation_case_assignment_owner_required")) return "Only the current assignee or an administrator can release this case.";
  if (message.includes("archived_moderation_case_required")) return "Only archived cases can be permanently deleted.";
  if (message.includes("active_admin_required")) return "An active administrator account is required for this action.";
  if (message.includes("active_moderator_required") || message.includes("permission denied")) return "An active moderator or administrator account is required.";
  return "The moderation change could not be completed safely. Please try again.";
}
