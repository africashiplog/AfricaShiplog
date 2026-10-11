/**
 * Declarative description of the sectioned admin forms for cemeteries and
 * people. The same spec drives rendering (admin form sections), parsing
 * (server actions update only the fields of the submitted section), CSV/XLSX
 * import columns and the revision diff labels.
 */
export type FieldKind = "text" | "textarea" | "hijri" | "gregorian" | "region" | "family" | "periods" | "gender" | "checkbox";

export interface FieldSpec {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  help?: string;
  placeholder?: string;
  /** The citation/documentation key this field belongs to (see labels.ts). */
  claim?: string;
  wide?: boolean;
}

export interface SectionSpec {
  key: string;
  title: string;
  description?: string;
  fields: FieldSpec[];
}

export const YEAR_RANGES = {
  hijri: { min: 1, max: 1600 },
  gregorian: { min: 600, max: 2100 },
} as const;

export const CEMETERY_SECTIONS: SectionSpec[] = [
  {
    key: "identity",
    title: "الهوية والتسمية",
    description: "احتفظ بالاسم الأصلي بكتابته الأصلية. أضف الأسماء البديلة والترجمات من قسم «الأسماء البديلة» أدناه.",
    fields: [
      { name: "canonicalName", label: "الاسم المعتمد للمدفن", kind: "text", required: true, claim: "names" },
      { name: "localName", label: "الاسم المحلي أو التاريخي (بكتابته الأصلية)", kind: "text", claim: "names" },
      { name: "nameMeaning", label: "معنى الاسم", kind: "textarea", claim: "nameMeaning", help: "لا تُدخل معنى إلا بدليل موثوق، واربطه بمصدره." },
      { name: "nameOrigin", label: "الأصل اللغوي للاسم", kind: "textarea", claim: "nameMeaning" },
      { name: "regionId", label: "المنطقة", kind: "region" },
      { name: "locality", label: "القرية أو الموضع الجغرافي", kind: "text" },
      { name: "adminArea", label: "المنطقة الإدارية", kind: "text" },
      { name: "summary", label: "وصف موجز (يظهر في بطاقة الخريطة)", kind: "textarea", wide: true },
    ],
  },
  {
    key: "history",
    title: "التاريخ",
    description: "ميّز بين تاريخ التأسيس وأقدم ذكر تاريخي وتواريخ دفن الأشخاص (تُسجَّل في قسم المدفونين).",
    fields: [
      { name: "foundingDateText", label: "تاريخ التأسيس (كما ورد في المصدر)", kind: "text", claim: "founding", placeholder: "مثال: أواخر القرن ... الهجري" },
      { name: "foundingYearHijri", label: "سنة التأسيس (هجري)", kind: "hijri", claim: "founding" },
      { name: "foundingYearGregorian", label: "سنة التأسيس (ميلادي)", kind: "gregorian", claim: "founding" },
      { name: "earliestMentionText", label: "أقدم ذكر موثق لوجود المدفن", kind: "text", claim: "earliestMention" },
      { name: "earliestMentionYearHijri", label: "سنة أقدم ذكر (هجري)", kind: "hijri", claim: "earliestMention" },
      { name: "earliestMentionYearGregorian", label: "سنة أقدم ذكر (ميلادي)", kind: "gregorian", claim: "earliestMention" },
      { name: "earliestMentionSourceNote", label: "أين ورد أقدم ذكر؟", kind: "textarea", claim: "earliestMention" },
      { name: "periodIds", label: "الفترات التاريخية المرتبطة", kind: "periods" },
    ],
  },
  {
    key: "narrative",
    title: "الوصف والروايات",
    fields: [
      { name: "history", label: "الوصف التاريخي الشامل", kind: "textarea", claim: "history", wide: true },
      { name: "communityRelations", label: "علاقته بالأسر والعلماء والجماعات المحلية", kind: "textarea", claim: "communityRelations", wide: true },
      { name: "narrativeDifferences", label: "الاختلافات بين الروايات والمراجع", kind: "textarea", wide: true },
      { name: "geographicDescription", label: "الوصف الجغرافي للمكان", kind: "textarea", claim: "location", wide: true },
      { name: "fieldNotes", label: "ملاحظات الباحث الميداني", kind: "textarea", wide: true },
    ],
  },
];

export const PERSON_SECTIONS: SectionSpec[] = [
  {
    key: "identity",
    title: "الاسم والنسب",
    description: "أدخل الاسم كما ورد في المصدر. أضف التهجئات والألقاب الأخرى من قسم «الأسماء البديلة».",
    fields: [
      { name: "fullName", label: "الاسم الكامل", kind: "text", claim: "names", help: "يلزم إدخال الاسم الكامل أو الاسم الشائع على الأقل." },
      { name: "commonName", label: "الاسم الشائع", kind: "text", claim: "names" },
      { name: "titles", label: "الألقاب", kind: "text", claim: "names" },
      { name: "nasab", label: "النسب المختصر", kind: "textarea", claim: "nasab", help: "النسب كما ورد في المصدر. علاقات القرابة التفصيلية تُضاف في قسم «الأنساب والعلاقات»." },
      { name: "familyId", label: "الأسرة / القبيلة", kind: "family" },
      { name: "gender", label: "الجنس", kind: "gender" },
      { name: "periodIds", label: "الفترات التاريخية", kind: "periods" },
      { name: "summary", label: "تعريف موجز", kind: "textarea", wide: true },
    ],
  },
  {
    key: "dates",
    title: "الميلاد والوفاة",
    description: "اترك الحقل فارغًا إذا لم يُعرف — سيظهر «غير معلوم».",
    fields: [
      { name: "birthDateText", label: "تاريخ الميلاد (كما ورد)", kind: "text", claim: "birth" },
      { name: "birthYearHijri", label: "سنة الميلاد (هجري)", kind: "hijri", claim: "birth" },
      { name: "birthYearGregorian", label: "سنة الميلاد (ميلادي)", kind: "gregorian", claim: "birth" },
      { name: "birthPlace", label: "مكان الميلاد", kind: "text", claim: "birth" },
      { name: "deathDateText", label: "تاريخ الوفاة (كما ورد)", kind: "text", claim: "death" },
      { name: "deathYearHijri", label: "سنة الوفاة (هجري)", kind: "hijri", claim: "death" },
      { name: "deathYearGregorian", label: "سنة الوفاة (ميلادي)", kind: "gregorian", claim: "death" },
      { name: "deathPlace", label: "مكان الوفاة", kind: "text", claim: "death" },
    ],
  },
  {
    key: "biography",
    title: "السيرة",
    fields: [
      { name: "biography", label: "السيرة الذاتية المفصلة", kind: "textarea", claim: "biography", wide: true },
      { name: "upbringing", label: "النشأة والبيئة التاريخية", kind: "textarea", claim: "upbringing", wide: true },
      { name: "travels", label: "الرحلات والإقامة والتنقلات", kind: "textarea", claim: "travels", wide: true },
      { name: "teachersText", label: "الشيوخ والأساتذة (نص حر لمن ليس لهم سجل)", kind: "textarea", claim: "teachers" },
      { name: "studentsText", label: "التلاميذ والطلاب (نص حر)", kind: "textarea", claim: "students" },
      { name: "sciences", label: "العلوم والتخصصات والأنشطة", kind: "textarea", claim: "sciences" },
      { name: "positions", label: "المناصب والأدوار الاجتماعية والتاريخية", kind: "textarea", claim: "positions" },
      { name: "legacy", label: "الأثر العلمي أو الاجتماعي والتاريخي", kind: "textarea", claim: "legacy", wide: true },
    ],
  },
  {
    key: "notes",
    title: "ملاحظات وخصوصية",
    fields: [
      { name: "researcherNotes", label: "ملاحظات الباحث", kind: "textarea", wide: true },
      { name: "corrections", label: "التصحيحات اللاحقة", kind: "textarea", wide: true },
      { name: "isContemporary", label: "شخص معاصر (على قيد الحياة أو حديث الوفاة)", kind: "checkbox", help: "لا يمكن نشر سجل شخص معاصر دون توثيق موافقة مناسبة." },
      { name: "publicationConsent", label: "توثيق موافقة النشر (من وافق، ومتى، وكيف)", kind: "textarea" },
    ],
  },
];

export function sectionByKey(sections: SectionSpec[], key: string): SectionSpec | undefined {
  return sections.find((s) => s.key === key);
}

export const ALL_CEMETERY_FIELDS = CEMETERY_SECTIONS.flatMap((s) => s.fields);
export const ALL_PERSON_FIELDS = PERSON_SECTIONS.flatMap((s) => s.fields);
