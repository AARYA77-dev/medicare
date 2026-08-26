import { NextRequest, NextResponse } from "next/server";
import { MedicineSchema } from "@/Schemas/MedicinsSchema";
import { PushSubscriptionSchema } from "@/Schemas/PushSubscriptionSchema";
import dbConnect from "@/lib/dbConnect";
import { sendPushNotification } from "@/lib/push";

export const dynamic = "force-dynamic";

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function dateMatches(scheduleDate: string, target: string) {
  const numbers = scheduleDate.match(/\d+/g) || [];
  if (numbers.length < 3) return scheduleDate === target;
  const [first, second, third] = numbers.map(Number);
  return [
    `${String(first).padStart(4, "0")}-${String(second).padStart(2, "0")}-${String(third).padStart(2, "0")}`,
    `${String(third).padStart(4, "0")}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`,
    `${String(third).padStart(4, "0")}-${String(first).padStart(2, "0")}-${String(second).padStart(2, "0")}`,
  ].includes(target);
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();
  const subscriptions = await PushSubscriptionSchema.find();
  let sent = 0;
  for (const subscription of subscriptions) {
    let subscriptionExpired = false;
    const target = localParts(new Date(Date.now() + 60 * 60 * 1000), subscription.timezone || "UTC");
    const targetDate = `${target.year}-${target.month}-${target.day}`;
    const targetTime = `${target.hour}:${target.minute}`;
    const medicines = await MedicineSchema.find({ userId: subscription.userId });
    for (const medicine of medicines) {
      for (const entry of medicine.schedule || []) {
        if (!dateMatches(entry.date, targetDate)) continue;
        for (const dose of entry.doses || []) {
          if (dose.time !== targetTime) continue;
          const doseKey = `${medicine._id}:${dose._id}:${targetDate}`;
          if (subscription.notifiedDoseKeys.includes(doseKey)) continue;
          try {
            await sendPushNotification(subscription.toObject(), { title: "Medication reminder", body: `${medicine.medicine_name} (${dose.dosage}) is due in 1 hour at ${dose.time}.`, url: "/" });
            subscription.notifiedDoseKeys.push(doseKey);
            sent += 1;
          } catch (error: unknown) {
            const statusCode = (error as { statusCode?: number })?.statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await subscription.deleteOne();
              subscriptionExpired = true;
            }
          }
        }
      }
    }
    if (!subscriptionExpired) await subscription.save();
  }
  return NextResponse.json({ success: true, sent });
}