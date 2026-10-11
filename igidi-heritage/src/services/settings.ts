import { prisma } from "@/lib/db";

export interface SiteSettings {
  /** Default map viewport only — not a claim about any site's location. */
  lat: number;
  lng: number;
  zoom: number;
  intro: string | null;
  methodology: string | null;
}

/**
 * Default viewport: south-western Mauritania (Trarza), where the Igidi area
 * lies, at a regional zoom. It only frames the map; administrators can change
 * it in Settings.
 */
const DEFAULTS: SiteSettings = { lat: 17.2, lng: -15.6, zoom: 7, intro: null, methodology: null };

export async function getSiteSettings(): Promise<SiteSettings> {
  const row = await prisma.siteSetting.findUnique({ where: { key: "site" } });
  const v = (row?.value ?? {}) as Partial<SiteSettings>;
  return { ...DEFAULTS, ...Object.fromEntries(Object.entries(v).filter(([, x]) => x != null)) } as SiteSettings;
}
