import type { UserRole } from "@prisma/client";

export type Capability =
  | "admin.view" // read admin data (drafts, revisions)
  | "content.edit" // create/edit records, upload files, submit for review
  | "content.publish" // publish / unpublish / archive
  | "content.delete" // permanent deletion
  | "data.import"
  | "data.export"
  | "users.manage"
  | "settings.manage";

const MATRIX: Record<UserRole, Capability[]> = {
  ADMIN: [
    "admin.view", "content.edit", "content.publish", "content.delete",
    "data.import", "data.export", "users.manage", "settings.manage",
  ],
  REVIEWER: ["admin.view", "content.edit", "content.publish", "data.import", "data.export"],
  EDITOR: ["admin.view", "content.edit", "data.export"],
  VIEWER: ["admin.view"],
};

export function can(role: UserRole, capability: Capability): boolean {
  return MATRIX[role].includes(capability);
}
