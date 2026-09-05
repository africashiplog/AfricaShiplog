import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { getPublicSettings, listTemplates, listMessages } from "@/services/whatsapp-service";
import WhatsAppSettingsManager from "./whatsapp-settings-manager";

export const metadata = { title: "إعدادات واتساب | أفريكا شيبلوغ" };

export default async function WhatsAppSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "whatsapp.manage")) redirect("/dashboard");

  const [settings, templates, messages] = await Promise.all([getPublicSettings(), listTemplates(), listMessages()]);

  return (
    <WhatsAppSettingsManager
      initialSettings={JSON.parse(JSON.stringify(settings))}
      initialTemplates={templates.map((t) => ({ id: t.id, code: t.code, name: t.name, bodyAr: t.bodyAr }))}
      initialMessages={JSON.parse(JSON.stringify(messages))}
    />
  );
}
