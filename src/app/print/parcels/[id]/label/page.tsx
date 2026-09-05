import { redirect, notFound } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { getParcel } from "@/services/parcel-service";
import PrintButton from "@/components/print-button";

export const metadata = { title: "ملصق الطرد | أفريكا شيبلوغ" };

export default async function ParcelLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "parcels.view")) redirect("/dashboard");

  const { id } = await params;
  const parcel = await getParcel(id);
  if (!parcel) notFound();

  return (
    <div dir="rtl" className="mx-auto max-w-md p-6 print:p-0">
      <div className="rounded-xl border-2 border-slate-800 p-5 print:rounded-none print:border">
        <div className="mb-3 flex items-center justify-between border-b border-slate-300 pb-3">
          <span className="text-lg font-bold">أفريكا شيبلوغ</span>
          <span className="ltr-nums text-xs text-slate-500">{parcel.originBranch.nameAr}</span>
        </div>

        <div className="mb-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/parcels/${parcel.id}/barcode`} alt="barcode" className="mx-auto h-16" />
          <p className="ltr-nums mt-1 text-sm font-bold tracking-wider">{parcel.trackingNumber}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400">المرسل</p>
            <p className="font-medium">{parcel.senderName}</p>
            <p className="ltr-nums text-xs">{parcel.senderPhone}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">المستلم</p>
            <p className="font-medium">{parcel.recipientName}</p>
            <p className="ltr-nums text-xs">{parcel.recipientPhone}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400">من</p>
            <p>{parcel.originBranch.nameAr}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">إلى</p>
            <p>{parcel.destinationBranch.nameAr}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">عدد القطع</p>
            <p className="ltr-nums">{parcel.piecesCount}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">المستحق عند التسليم</p>
            <p className="ltr-nums">{parcel.amountDueOnDelivery.toString()}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center border-t border-slate-200 pt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/parcels/${parcel.id}/qrcode`} alt="QR" className="h-24 w-24" />
        </div>
      </div>

      <PrintButton />
    </div>
  );
}
