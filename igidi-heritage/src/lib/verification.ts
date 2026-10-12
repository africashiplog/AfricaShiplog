import type { SourceType, VerificationStatus } from "@prisma/client";

export interface CitationLike {
  field: string;
  sourceId: string;
  source: { type: SourceType };
}

const ORAL_TYPES: SourceType[] = ["ORAL_INTERVIEW"];

/**
 * Documentation status of one claim (field).
 *
 * An explicit editor override always wins (e.g. DISPUTED cannot be inferred
 * automatically). Otherwise it is derived from the citations attached to that
 * field: none -> UNVERIFIED; only oral sources -> ORAL; 2+ distinct sources ->
 * MULTI_SOURCE; one written source -> DOCUMENTED.
 */
export function fieldStatus(
  field: string,
  citations: CitationLike[],
  overrides: unknown
): VerificationStatus {
  const o = (overrides && typeof overrides === "object" ? overrides : {}) as Record<string, unknown>;
  const override = o[field];
  if (typeof override === "string" && isVerificationStatus(override)) return override;

  const relevant = citations.filter((c) => c.field === field);
  if (relevant.length === 0) return "UNVERIFIED";
  const distinctSources = new Set(relevant.map((c) => c.sourceId));
  if (relevant.every((c) => ORAL_TYPES.includes(c.source.type))) return "ORAL";
  if (distinctSources.size >= 2) return "MULTI_SOURCE";
  return "DOCUMENTED";
}

/** Status for a whole linked record (burial, relation, location): the explicit value, upgraded by citations if still UNVERIFIED. */
export function linkStatus(
  explicit: VerificationStatus,
  citations: Array<{ sourceId: string; source: { type: SourceType } }>
): VerificationStatus {
  if (explicit !== "UNVERIFIED") return explicit;
  if (citations.length === 0) return "UNVERIFIED";
  if (citations.every((c) => ORAL_TYPES.includes(c.source.type))) return "ORAL";
  return new Set(citations.map((c) => c.sourceId)).size >= 2 ? "MULTI_SOURCE" : "DOCUMENTED";
}

export function isVerificationStatus(v: string): v is VerificationStatus {
  return ["DOCUMENTED", "MULTI_SOURCE", "ORAL", "DISPUTED", "UNVERIFIED"].includes(v);
}

/**
 * A coordinate may be shown as confirmed only when it is precise AND its
 * documentation status says it is supported (direct source / several sources).
 */
export function isLocationConfirmed(loc: {
  latitude: unknown;
  precision: string;
  verification: VerificationStatus;
}): boolean {
  return (
    loc.latitude !== null &&
    loc.precision === "EXACT" &&
    (loc.verification === "DOCUMENTED" || loc.verification === "MULTI_SOURCE")
  );
}
