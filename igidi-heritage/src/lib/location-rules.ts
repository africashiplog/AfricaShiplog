import type { LocationMethod, LocationPrecision, VerificationStatus } from "@prisma/client";

/** Validation rules that keep the map honest (exported for tests). */
export function validateLocationInput(input: {
  latitude: number | null;
  longitude: number | null;
  precision: LocationPrecision;
  radiusMeters: number | null;
  method: LocationMethod | null;
  sourceNote: string | null;
  verification: VerificationStatus;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if ((input.latitude == null) !== (input.longitude == null)) {
    errors.latitude = "أدخل خط العرض وخط الطول معًا، أو اتركهما فارغين";
  }
  const hasCoords = input.latitude != null && input.longitude != null;
  if (hasCoords && input.precision === "UNKNOWN") {
    errors.precision = "حدّد درجة دقة الإحداثيات المدخلة";
  }
  if (input.precision === "EXACT" && !hasCoords) errors.precision = "الموقع الدقيق يتطلب إحداثيات";
  if (input.precision === "APPROXIMATE" && hasCoords && !input.radiusMeters) {
    errors.radiusMeters = "حدّد نصف قطر عدم اليقين (بالمتر) للموقع التقريبي";
  }
  if (hasCoords && !input.method) errors.method = "حدّد طريقة تحديد الموقع";
  if (input.precision === "EXACT" && (input.verification === "DOCUMENTED" || input.verification === "MULTI_SOURCE") && !input.sourceNote) {
    errors.sourceNote = "لا يُعرض الموقع مؤكدًا دون ذكر مصدر تحديده";
  }
  return errors;
}

