import type {
  BurialRelation,
  LocationMethod,
  LocationPrecision,
  MediaKind,
  NameKind,
  NameLanguage,
  PersonRelationType,
  RecordStatus,
  RevisionAction,
  SourceType,
  UserRole,
  VerificationStatus,
} from "@prisma/client";

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  DOCUMENTED: "موثقة بمصدر مباشر",
  MULTI_SOURCE: "مدعومة بأكثر من مصدر",
  ORAL: "منقولة عن رواية شفوية",
  DISPUTED: "مختلف فيها بين المصادر",
  UNVERIFIED: "غير متحقق منها بعد",
};

export const VERIFICATION_ORDER: VerificationStatus[] = [
  "MULTI_SOURCE",
  "DOCUMENTED",
  "ORAL",
  "DISPUTED",
  "UNVERIFIED",
];

export const RECORD_STATUS_LABELS: Record<RecordStatus, string> = {
  DRAFT: "مسودة",
  IN_REVIEW: "قيد المراجعة",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "مدير النظام",
  REVIEWER: "مراجع",
  EDITOR: "محرر",
  VIEWER: "مطّلع",
};

export const NAME_LANGUAGE_LABELS: Record<NameLanguage, string> = {
  AR: "العربية",
  HASSANIYA: "الحسانية",
  BERBER: "الصنهاجية/الأمازيغية",
  FR: "الفرنسية",
  EN: "الإنجليزية",
  OTHER: "أخرى",
};

export const NAME_KIND_LABELS: Record<NameKind, string> = {
  CANONICAL_VARIANT: "صيغة أخرى للاسم",
  LOCAL: "اسم محلي",
  HISTORICAL: "اسم تاريخي",
  SPELLING_VARIANT: "تهجئة مختلفة",
  TRANSLATION: "ترجمة",
  TRANSLITERATION: "كتابة بالحروف اللاتينية",
  NICKNAME: "لقب أو كنية",
};

export const PRECISION_LABELS: Record<LocationPrecision, string> = {
  EXACT: "دقيق",
  APPROXIMATE: "تقريبي",
  AREA: "المنطقة العامة فقط",
  UNKNOWN: "غير معلوم",
};

export const METHOD_LABELS: Record<LocationMethod, string> = {
  FIELD_GPS: "رصد ميداني بجهاز GPS",
  SATELLITE: "صور الأقمار الصناعية",
  OLD_MAP: "خريطة قديمة",
  SOURCE_DESCRIPTION: "وصف في مصدر مكتوب",
  ORAL_DESCRIPTION: "وصف في رواية شفوية",
  ESTIMATE: "تقدير المحرر",
};

export const BURIAL_RELATION_LABELS: Record<BurialRelation, string> = {
  BURIED: "مدفون فيه",
  BURIED_PROBABLE: "يُرجَّح دفنه فيه",
  BURIED_DISPUTED: "مختلف في موضع دفنه",
  REINTERRED: "نُقل رفاته إليه",
  FOUNDER: "مؤسس المدفن / أول من دُفن فيه",
  ASSOCIATED: "مرتبط به دون ثبوت الدفن",
};

export const RELATION_TYPE_LABELS: Record<PersonRelationType, string> = {
  FATHER_OF: "أب",
  MOTHER_OF: "أم",
  SPOUSE_OF: "زوج/زوجة",
  SIBLING_OF: "أخ/أخت",
  OTHER_KIN: "قرابة أخرى",
  TEACHER_OF: "شيخ/أستاذ",
};

/** How the relation reads from the perspective of the `to` person. */
export const RELATION_INVERSE_LABELS: Record<PersonRelationType, string> = {
  FATHER_OF: "ابن/ابنة",
  MOTHER_OF: "ابن/ابنة",
  SPOUSE_OF: "زوج/زوجة",
  SIBLING_OF: "أخ/أخت",
  OTHER_KIN: "قرابة أخرى",
  TEACHER_OF: "تلميذ",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  BOOK: "كتاب",
  MANUSCRIPT: "مخطوط",
  ARTICLE: "مقال/بحث",
  THESIS: "رسالة جامعية",
  ARCHIVE_DOCUMENT: "وثيقة أرشيفية",
  MAP: "خريطة",
  ORAL_INTERVIEW: "مقابلة شفوية",
  FIELD_SURVEY: "مسح ميداني",
  WEBSITE: "موقع إلكتروني",
  OTHER: "أخرى",
};

export const MEDIA_KIND_LABELS: Record<MediaKind, string> = {
  PHOTO: "صورة",
  OLD_MAP: "خريطة قديمة",
  GEO_DOCUMENT: "وثيقة جغرافية",
  DOCUMENT: "وثيقة",
  MANUSCRIPT: "مخطوط",
  PAGE_SCAN: "صورة صفحة من مصدر",
  AUDIO: "تسجيل صوتي",
  OTHER: "أخرى",
};

export const REVISION_ACTION_LABELS: Record<RevisionAction, string> = {
  CREATE: "إنشاء",
  UPDATE: "تعديل",
  DELETE: "حذف",
  STATUS_CHANGE: "تغيير الحالة",
  RESTORE: "استرجاع نسخة",
  IMPORT: "استيراد",
};

/** Keys of the claims that can carry their own citations and documentation status. */
export const CEMETERY_FIELDS: Record<string, string> = {
  general: "عام",
  names: "الاسم والتسميات",
  nameMeaning: "معنى الاسم وأصله",
  founding: "تاريخ التأسيس",
  earliestMention: "أقدم ذكر موثق",
  history: "الوصف التاريخي",
  communityRelations: "العلاقة بالأسر والجماعات",
  location: "الموقع",
};

export const PERSON_FIELDS: Record<string, string> = {
  general: "عام",
  names: "الاسم والألقاب",
  nasab: "النسب",
  birth: "الميلاد",
  death: "الوفاة",
  biography: "السيرة",
  upbringing: "النشأة",
  travels: "الرحلات والتنقلات",
  teachers: "الشيوخ",
  students: "التلاميذ",
  sciences: "العلوم والأنشطة",
  works: "المؤلفات",
  positions: "المناصب والأدوار",
  legacy: "الأثر",
};

export const UNKNOWN = "غير معلوم";
export const NOT_DOCUMENTED = "لم يوثّق بعد";

export const ENTITY_LABELS: Record<string, string> = {
  Cemetery: "مدفن",
  CemeteryName: "اسم بديل لمدفن",
  Location: "موقع",
  Person: "شخص",
  PersonName: "اسم بديل لشخص",
  Burial: "علاقة دفن",
  PersonRelation: "علاقة نسب/علمية",
  Work: "مؤلَّف",
  HistoricalEvent: "حدث",
  OralAccount: "رواية شفوية",
  Source: "مصدر",
  Citation: "استشهاد",
  MediaFile: "ملف",
  Region: "منطقة",
  HistoricalPeriod: "فترة تاريخية",
  Family: "أسرة",
  User: "مستخدم",
  SiteSetting: "إعدادات",
  System: "النظام",
};
