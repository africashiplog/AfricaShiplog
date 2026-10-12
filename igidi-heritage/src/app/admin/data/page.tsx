import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { AdminPage, Panel } from "@/components/admin";
import { ImportForm } from "./import-form";

export const metadata = { title: "الاستيراد والتصدير" };

const TABLES: Array<[string, string]> = [
  ["cemeteries", "المدافن"], ["people", "الأشخاص"], ["burials", "علاقات الدفن"], ["relations", "الأنساب والعلاقات"],
  ["locations", "المواقع والإحداثيات"], ["sources", "المصادر"], ["citations", "الاستشهادات"], ["regions", "المناطق"], ["periods", "الفترات"], ["families", "الأسر"],
];

export default async function DataPage() {
  const user = await requirePageUser("data.export");
  return (
    <AdminPage title="الاستيراد والتصدير والنسخ الاحتياطي">
      <Panel title="نسخة احتياطية كاملة" description="ملف JSON يضم كل البيانات البحثية وسجل التعديلات (دون كلمات المرور). احفظه مع مجلد الملفات المرفوعة. للنسخ الاحتياطي الدوري للقاعدة انظر docs/BACKUP.md.">
        <a href="/api/admin/export?format=json" className="btn btn-primary">تنزيل النسخة الاحتياطية (JSON)</a>
      </Panel>
      <Panel title="تصدير الجداول بصيغة CSV" description="ملفات CSV بترميز UTF-8 تُفتح في Excel مع الحفاظ على النص العربي.">
        <div className="flex flex-wrap gap-2">
          {TABLES.map(([k, v]) => <a key={k} href={`/api/admin/export?format=csv&entity=${k}`} className="btn btn-ghost btn-sm">{v}</a>)}
        </div>
      </Panel>
      {can(user.role, "data.import") ? (
        <Panel title="استيراد مدافن أو أشخاص" description="تُستورد السجلات دائمًا كمسودات، ولا يُستبدل أي سجل موجود. الأعمدة: أسماء الحقول (كما في القالب) أو عناوينها العربية. المناطق والأسر والفترات يجب أن تكون معرّفة مسبقًا. الإحداثيات المستوردة تُسجَّل «غير متحقق منها» حتى تُراجع.">
          <ImportForm />
        </Panel>
      ) : null}
    </AdminPage>
  );
}
