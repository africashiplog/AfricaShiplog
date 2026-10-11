import type { Metadata } from "next";
import { PageHeader, SectionTitle, VerificationBadge } from "@/components/ui";
import { VERIFICATION_LABELS, VERIFICATION_ORDER, PRECISION_LABELS, BURIAL_RELATION_LABELS } from "@/lib/labels";
import { getSiteSettings } from "@/services/settings";

export const metadata: Metadata = { title: "منهجية التوثيق" };

const VERIFICATION_TEXT: Record<string, string> = {
  DOCUMENTED: "ورد ما يدعم المعلومة في مصدر مكتوب واحد على الأقل، مع رقم الجزء والصفحة.",
  MULTI_SOURCE: "تتفق على المعلومة مصادر مستقلة متعددة (لا تُعد صفحتان من الكتاب نفسه مصدرين).",
  ORAL: "المعلومة منقولة عن رواية شفوية مسجلة، ولم يُعثر لها بعد على مصدر مكتوب.",
  DISPUTED: "تختلف المصادر أو الروايات في هذه المعلومة؛ تُعرض أوجه الاختلاف في الصفحة.",
  UNVERIFIED: "أُدخلت المعلومة ولم تُربط بعد بمصدر، وتنتظر المراجعة.",
};

export default async function MethodologyPage() {
  const settings = await getSiteSettings();
  return (
    <>
      <PageHeader title="منهجية التوثيق" subtitle="كيف تُجمع المعلومات وتوثَّق وتُعرض في هذه المنصة." />
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-10 leading-loose">
        {settings.methodology ? <div className="card prose-ar p-5">{settings.methodology}</div> : null}
        <section>
          <SectionTitle>القاعدة الأساسية</SectionTitle>
          <p>لا تُختلق في هذه المنصة معلومة تاريخية أو سيرة أو اسم مدفن أو إحداثيات. ما لم يتوفر بشأنه دليل يُعرض «غير معلوم» أو «لم يوثّق بعد». ويعتمد المشروع أساسًا على كتاب «الحضارة الإيگيدية في ظلال المدافن الشمشوية»، مع الاستفادة من مصادر أخرى تُسجَّل بياناتها كاملة في قسم المصادر.</p>
        </section>
        <section>
          <SectionTitle>حالات التوثيق</SectionTitle>
          <p className="mb-4">لكل معلومة (تاريخ وفاة، نسب، موضع دفن، علاقة أسرية، موقع جغرافي…) حالة توثيق تصف <strong>ما هو متاح من توثيق</strong>، وليست حكمًا نهائيًا على صحة الرواية:</p>
          <ul className="space-y-3">
            {VERIFICATION_ORDER.map((v) => (
              <li key={v} className="card flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:gap-4">
                <span className="min-w-56"><VerificationBadge status={v} /></span>
                <span className="text-sm">{VERIFICATION_TEXT[v] ?? VERIFICATION_LABELS[v]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">تُحسب الحالة تلقائيًا من الاستشهادات المرتبطة بكل معلومة، ويستطيع المحرر ضبطها يدويًا (مثل «مختلف فيها») عند الحاجة.</p>
        </section>
        <section>
          <SectionTitle>المواقع الجغرافية</SectionTitle>
          <p>لا تُعرض إحداثيات على أنها مؤكدة إلا إذا كانت دقيقة ومدعومة بمصدر يحدد طريقة تحديدها. لكل موقع درجة دقة:</p>
          <ul className="mt-2 list-disc ps-6">
            {Object.entries(PRECISION_LABELS).map(([k, v]) => <li key={k}>{v}</li>)}
          </ul>
          <p className="mt-2">تظهر المواقع التقريبية على الخريطة بعلامات متقطعة مع دائرة تمثل نطاق عدم اليقين، أما المدافن التي لم تُحدَّد مواقعها فتُدرج في قائمة مستقلة دون علامة على الخريطة.</p>
        </section>
        <section>
          <SectionTitle>الدفن والارتباط بالمدافن</SectionTitle>
          <p>لا يُعدّ الشخص مدفونًا في موضع لمجرد ورود اسمه في سياق مرتبط به. تُسجَّل طبيعة العلاقة بين الشخص والمدفن ودرجة ثبوتها ومصدرها:</p>
          <ul className="mt-2 list-disc ps-6">{Object.values(BURIAL_RELATION_LABELS).map((v) => <li key={v}>{v}</li>)}</ul>
        </section>
        <section>
          <SectionTitle>الأنساب</SectionTitle>
          <p>تُسجَّل علاقات القرابة صراحةً بين سجلات الأشخاص، ولكل علاقة مصدرها وحالة توثيقها. لا تُستنتج القرابة من تشابه الأسماء، ويُميَّز في شجرة الأنساب بين النسب الموثق والمنقول شفهيًا والمختلف فيه.</p>
        </section>
        <section>
          <SectionTitle>الأسماء والتهجئات</SectionTitle>
          <p>يُحفظ الاسم الأصلي بلغته وكتابته الأصلية، وتُسجَّل التهجئات والترجمات والأسماء البديلة دون فرض ترجمة غير موثقة. ويراعي البحث اختلافات الهمزات والألف المقصورة والتاء المربوطة والتشكيل والحرف الحساني «گ».</p>
        </section>
        <section>
          <SectionTitle>المراجعة والنشر وسجل التعديلات</SectionTitle>
          <p>يمر كل سجل بمراحل: مسودة ← قيد المراجعة ← منشور. ولا يظهر للعامة إلا المنشور. ويُحفظ كل تعديل في سجل التغييرات مع هوية المحرر وتاريخه ولقطة كاملة من البيانات، بحيث يمكن تتبع التصحيحات واسترجاع النسخ السابقة.</p>
        </section>
        <section>
          <SectionTitle>الخصوصية وحقوق النشر</SectionTitle>
          <p>لا تُنشر بيانات الأشخاص المعاصرين إلا بموافقة موثقة، ولا يُعلن اسم راوٍ دون موافقته. ولا تُعرض الصور والوثائق للعامة إلا بعد تحديد حقوق نشرها.</p>
        </section>
      </div>
    </>
  );
}
