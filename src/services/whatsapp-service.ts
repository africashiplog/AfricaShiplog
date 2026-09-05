import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto";

export class WhatsAppServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

const SETTINGS_ID = "singleton";

/** Safe-for-display settings — the access token is never returned in full, only masked. */
export async function getPublicSettings() {
  const settings = await prisma.whatsAppSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!settings) {
    return {
      businessAccountId: null,
      phoneNumberId: null,
      hasAccessToken: false,
      maskedAccessToken: null,
      webhookVerifyTokenSet: false,
      isConnected: false,
      lastTestedAt: null,
    };
  }
  let maskedAccessToken: string | null = null;
  if (settings.accessTokenEncrypted) {
    try {
      maskedAccessToken = maskSecret(decryptSecret(settings.accessTokenEncrypted));
    } catch {
      maskedAccessToken = "••••";
    }
  }
  return {
    businessAccountId: settings.businessAccountId,
    phoneNumberId: settings.phoneNumberId,
    hasAccessToken: !!settings.accessTokenEncrypted,
    maskedAccessToken,
    webhookVerifyTokenSet: !!settings.webhookVerifyToken,
    isConnected: settings.isConnected,
    lastTestedAt: settings.lastTestedAt,
  };
}

export interface UpdateWhatsAppSettingsInput {
  businessAccountId?: string | null;
  phoneNumberId?: string | null;
  accessToken?: string | null; // plaintext, only ever accepted, never returned
  webhookVerifyToken?: string | null;
}

export async function updateSettings(input: UpdateWhatsAppSettingsInput, actorId: string) {
  await prisma.whatsAppSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      businessAccountId: input.businessAccountId || null,
      phoneNumberId: input.phoneNumberId || null,
      accessTokenEncrypted: input.accessToken ? encryptSecret(input.accessToken) : null,
      webhookVerifyToken: input.webhookVerifyToken || null,
      isConnected: false,
      updatedById: actorId,
    },
    update: {
      ...(input.businessAccountId !== undefined ? { businessAccountId: input.businessAccountId || null } : {}),
      ...(input.phoneNumberId !== undefined ? { phoneNumberId: input.phoneNumberId || null } : {}),
      ...(input.accessToken ? { accessTokenEncrypted: encryptSecret(input.accessToken) } : {}),
      ...(input.webhookVerifyToken !== undefined ? { webhookVerifyToken: input.webhookVerifyToken || null } : {}),
      isConnected: false, // any settings change requires re-testing the connection
      updatedById: actorId,
    },
  });
  return getPublicSettings();
}

interface ResolvedCredentials {
  phoneNumberId: string;
  accessToken: string;
  apiBaseUrl: string;
}

/** Prefers DB-configured settings (set via the admin UI); falls back to env vars for container defaults. */
async function resolveCredentials(): Promise<ResolvedCredentials | null> {
  const settings = await prisma.whatsAppSettings.findUnique({ where: { id: SETTINGS_ID } });
  const apiBaseUrl = process.env.WHATSAPP_API_BASE_URL ?? "https://graph.facebook.com/v20.0";

  const phoneNumberId = settings?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  let accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
  if (settings?.accessTokenEncrypted) {
    try {
      accessToken = decryptSecret(settings.accessTokenEncrypted);
    } catch {
      accessToken = "";
    }
  }

  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken, apiBaseUrl };
}

export async function testConnection(actorId: string) {
  const creds = await resolveCredentials();
  if (!creds) {
    throw new WhatsAppServiceError(
      "لم يتم تكوين إعدادات واتساب بعد (معرّف رقم الهاتف والرمز مطلوبان)",
      400
    );
  }

  const res = await fetch(`${creds.apiBaseUrl}/${creds.phoneNumberId}?fields=display_phone_number,verified_name`, {
    headers: { Authorization: `Bearer ${creds.accessToken}` },
  });

  const isConnected = res.ok;
  await prisma.whatsAppSettings.update({
    where: { id: SETTINGS_ID },
    data: { isConnected, lastTestedAt: new Date(), updatedById: actorId },
  });

  if (!isConnected) {
    const body = await res.text().catch(() => "");
    throw new WhatsAppServiceError(`فشل الاتصال بواتساب (${res.status}): ${body.slice(0, 200)}`, 502);
  }

  return { isConnected: true };
}

function renderTemplate(body: string, variables: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);
}

/**
 * Sends a freeform text notification via the WhatsApp Business Cloud API.
 *
 * Production note: Meta only allows freeform text outside an existing
 * 24-hour customer-initiated conversation window if the message uses a
 * pre-approved WhatsApp Message Template (registered in Meta Business
 * Manager, not the same thing as our internal NotificationTemplate row).
 * This function sends as `type: "text"`, which works for customers who
 * messaged the business recently or in sandbox/test-number setups; wire in
 * an approved template name + components here once one exists for
 * production parcel-arrival notifications.
 */
async function sendWhatsAppText(phoneNumber: string, body: string): Promise<{ providerMessageId: string }> {
  const creds = await resolveCredentials();
  if (!creds) throw new WhatsAppServiceError("لم يتم تكوين واتساب — لا يمكن الإرسال الآن", 503);

  const res = await fetch(`${creds.apiBaseUrl}/${creds.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phoneNumber.replace(/[^\d+]/g, ""),
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new WhatsAppServiceError(`فشل إرسال رسالة واتساب (${res.status}): ${errBody.slice(0, 300)}`, 502);
  }

  const data = (await res.json()) as { messages?: { id: string }[] };
  return { providerMessageId: data.messages?.[0]?.id ?? "" };
}

async function dispatchMessage(messageId: string) {
  const message = await prisma.whatsAppMessage.findUniqueOrThrow({ where: { id: messageId } });
  try {
    const { providerMessageId } = await sendWhatsAppText(message.recipientPhone, message.renderedMessage);
    await prisma.whatsAppMessage.update({
      where: { id: messageId },
      data: { status: "SENT", providerMessageId, sentAt: new Date(), errorMessage: null },
    });
  } catch (e) {
    const isNotConfigured = e instanceof WhatsAppServiceError && e.status === 503;
    await prisma.whatsAppMessage.update({
      where: { id: messageId },
      data: {
        status: isNotConfigured ? "PENDING" : "FAILED",
        errorMessage: isNotConfigured
          ? "لم يتم تكوين واتساب بعد — الرسالة في قائمة الانتظار وستُرسل بعد التكوين"
          : e instanceof Error
            ? e.message
            : "خطأ غير معروف",
        retryCount: { increment: 1 },
      },
    });
  }
}

export async function sendParcelArrivedNotification(parcelId: string) {
  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    include: { destinationBranch: true },
  });
  if (!parcel) return;

  const template = await prisma.notificationTemplate.findUnique({ where: { code: "PARCEL_ARRIVED" } });
  if (!template || !template.isActive) return;

  const renderedMessage = renderTemplate(template.bodyAr, {
    recipientName: parcel.recipientName,
    trackingNumber: parcel.trackingNumber,
    branchName: parcel.destinationBranch.nameAr,
    amountDue: parcel.amountDueOnDelivery.toString(),
    branchAddress: parcel.destinationBranch.address ?? "",
    branchPhone: parcel.destinationBranch.phone ?? "",
  });

  const message = await prisma.whatsAppMessage.create({
    data: {
      parcelId: parcel.id,
      templateId: template.id,
      recipientPhone: parcel.recipientPhone,
      renderedMessage,
      status: "PENDING",
    },
  });

  await dispatchMessage(message.id);
}

export async function resendMessage(messageId: string) {
  const message = await prisma.whatsAppMessage.findUnique({ where: { id: messageId } });
  if (!message) throw new WhatsAppServiceError("الرسالة غير موجودة", 404);
  await dispatchMessage(messageId);
  return prisma.whatsAppMessage.findUniqueOrThrow({ where: { id: messageId } });
}

export function listMessages(filters: { parcelId?: string } = {}) {
  return prisma.whatsAppMessage.findMany({
    where: { ...(filters.parcelId ? { parcelId: filters.parcelId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export function listTemplates() {
  return prisma.notificationTemplate.findMany({ orderBy: { code: "asc" } });
}

export async function updateTemplate(id: string, bodyAr: string) {
  return prisma.notificationTemplate.update({ where: { id }, data: { bodyAr } });
}
