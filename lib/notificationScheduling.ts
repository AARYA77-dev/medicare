import { Client } from "@upstash/qstash";
import { MedicineSchema } from "@/Schemas/MedicinsSchema";
import { PushSubscriptionSchema, IPushSubscription } from "@/Schemas/PushSubscriptionSchema";

const qstash = new Client({
  token: process.env.QSTASH_TOKEN || "",
  baseUrl: process.env.QSTASH_URL || "https://qstash.upstash.io",
});

type ScheduledMedicine = {
  _id: unknown;
  schedule?: Array<{
    date: string;
    doses: Array<{ _id?: unknown; time: string; dosage: string }>;
  }>;
};

function parseScheduleDate(value: string) {
  const numbers = value.match(/\d+/g)?.map(Number) || [];
  if (numbers.length < 3) return null;
  const [first, second, third] = numbers;
  if (first >= 1900) return { year: first, month: second, day: third };
  if (third >= 1900) {
    if (first > 12) return { year: third, month: second, day: first };
    return { year: third, month: first, day: second };
  }
  return null;
}

function localTimeToUtc(dateValue: string, time: string, timezone: string) {
  const date = parseScheduleDate(dateValue);
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!date || !match) return null;
  const localTimestamp = Date.UTC(date.year, date.month - 1, date.day, Number(match[1]), Number(match[2]));
  let utcTimestamp = localTimestamp;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(utcTimestamp));
    const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    const displayedTimestamp = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
    utcTimestamp += localTimestamp - displayedTimestamp;
  }
  return new Date(utcTimestamp);
}

function appUrl() {
  const url = process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (!url) throw new Error("APP_URL or NEXTAUTH_URL is required for QStash notifications");
  return `${url.replace(/\/$/, "")}/api/notifications/cron`;
}

async function cancelMessages(messageIds: string[] = []) {
  if (messageIds.length === 0) return;
  await qstash.messages.cancel(messageIds);
}

export async function scheduleMedicineNotifications(medicineId: string, existingMessageIds: string[] = []) {
  await cancelMessages(existingMessageIds);
  await dbSubscriptionsForMedicine(medicineId);
}

async function dbSubscriptionsForMedicine(medicineId: string) {
  const medicine = await MedicineSchema.findById(medicineId);
  if (!medicine) return;
  const subscriptions = await PushSubscriptionSchema.find({ userId: medicine.userId });
  const messageIds: string[] = [];
  for (const subscription of subscriptions) {
    messageIds.push(...await scheduleForSubscription(medicine, subscription));
  }
  await MedicineSchema.findByIdAndUpdate(medicineId, { notificationMessageIds: messageIds });
}

export async function scheduleMedicineForSubscription(medicineId: string, subscription: IPushSubscription) {
  const medicine = await MedicineSchema.findById(medicineId);
  if (!medicine) return;
  const messageIds = await scheduleForSubscription(medicine, subscription);
  if (messageIds.length > 0) {
    await MedicineSchema.findByIdAndUpdate(medicineId, { $push: { notificationMessageIds: { $each: messageIds } } });
  }
}

async function scheduleForSubscription(medicine: ScheduledMedicine, subscription: IPushSubscription) {
  const messageIds: string[] = [];
  for (const entry of medicine.schedule || []) {
    for (const dose of entry.doses || []) {
      const doseTime = localTimeToUtc(entry.date, dose.time, subscription.timezone || "UTC");
      if (!doseTime || doseTime.getTime() <= Date.now()) continue;
      const reminderTime = new Date(doseTime.getTime() - 60 * 60 * 1000);
      if (reminderTime.getTime() <= Date.now()) continue;
      const result = await qstash.publishJSON({
        url: appUrl(),
        body: { medicineId: String(medicine._id), doseId: String(dose._id), subscriptionId: String(subscription._id) },
        notBefore: Math.floor(reminderTime.getTime() / 1000),
        deduplicationId: `medicine-${medicine._id}-dose-${dose._id}-subscription-${subscription._id}`,
        label: `subscription:${subscription._id}`,
      });
      messageIds.push(result.messageId);
    }
  }
  return messageIds;
}

export async function cancelMedicineNotifications(messageIds: string[] = []) {
  await cancelMessages(messageIds);
}

export async function cancelSubscriptionNotifications(subscriptionId: string) {
  await qstash.messages.cancel({ filter: { label: `subscription:${subscriptionId}` } });
}