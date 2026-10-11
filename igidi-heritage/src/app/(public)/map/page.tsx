import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/services/settings";
import { PublicMap } from "@/components/map/public-map";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "الخريطة التفاعلية" };

export default async function MapPage(props: PageProps<"/map">) {
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const [settings, regions, periods] = await Promise.all([
    getSiteSettings(),
    prisma.region.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.historicalPeriod.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader title="خريطة مدافن إيگيدي وضواحيها" subtitle="ابحث وصفِّ بحسب المنطقة والفترة التاريخية ودقة الموقع وحالة توثيقه." />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <PublicMap
          center={[settings.lat, settings.lng]}
          zoom={settings.zoom}
          regions={regions}
          periods={periods}
          initial={{ q: one("q"), region: one("region"), period: one("period"), precision: one("precision"), verification: one("verification") }}
        />
      </div>
    </>
  );
}
