import { describe, it, expect } from "vitest";
import { userHasPermission, userCanAccessBranch, type CurrentUser } from "./current-user";

function makeUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "u1",
    email: "a@b.com",
    fullName: "A",
    fullNameAr: null,
    branchId: "branch-1",
    isActive: true,
    mustChangePassword: false,
    roleCodes: [],
    permissions: new Set(),
    ...overrides,
  };
}

describe("userHasPermission", () => {
  it("grants everything to SUPER_ADMIN regardless of explicit permissions", () => {
    const user = makeUser({ roleCodes: ["SUPER_ADMIN"] });
    expect(userHasPermission(user, "settings.manage")).toBe(true);
  });

  it("denies a permission the user's roles were not granted", () => {
    const user = makeUser({ roleCodes: ["TICKET_AGENT"], permissions: new Set(["tickets.view"]) });
    expect(userHasPermission(user, "branches.manage")).toBe(false);
  });

  it("grants a permission explicitly present in the set", () => {
    const user = makeUser({ permissions: new Set(["tickets.create"]) });
    expect(userHasPermission(user, "tickets.create")).toBe(true);
  });
});

describe("userCanAccessBranch", () => {
  it("allows global-access users (branchId null) to access any branch", () => {
    const user = makeUser({ branchId: null });
    expect(userCanAccessBranch(user, "branch-anything")).toBe(true);
  });

  it("allows a branch-scoped user to access only their own branch", () => {
    const user = makeUser({ branchId: "branch-1" });
    expect(userCanAccessBranch(user, "branch-1")).toBe(true);
    expect(userCanAccessBranch(user, "branch-2")).toBe(false);
  });

  it("denies a branch-scoped user access when no branch is specified", () => {
    const user = makeUser({ branchId: "branch-1" });
    expect(userCanAccessBranch(user, null)).toBe(false);
  });
});
