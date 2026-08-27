import { NextRequest, NextResponse } from "next/server";
import { MedicineSchema } from "@/Schemas/MedicinsSchema";
import { PushSubscriptionSchema } from "@/Schemas/PushSubscriptionSchema";
import dbConnect from "@/lib/dbConnect";
import { sendPushNotification } from "@/lib/push";
import { Receiver } from "@upstash/qstash";
import { Types } from "mongoose";
import { AccessSchema } from "@/Schemas/AccessSchema";

export const dynamic = "force-dynamic";

async function isQStashRequest(request: NextRequest, body: string) {
  const signature = request.headers.get("upstash-signature");
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!signature || !currentSigningKey || !nextSigningKey) return false;

  try {
    return await new Receiver({ currentSigningKey, nextSigningKey }).verify({ signature, body });
  } catch {
    return false;
  }
}

function isValidObjectIdString(value: unknown): value is string {
  return typeof value === "string" && Types.ObjectId.isValid(value);
}

async function sendDueNotification(body: { type?: string; medicineId?: string; doseId?: string; subscriptionId?: string }) {
  if (body.type === "refresh" && body.medicineId && body.subscriptionId) {
    if (!isValidObjectIdString(body.medicineId) || !isValidObjectIdString(body.subscriptionId)) {
      return NextResponse.json({ message: "Invalid notification payload" }, { status: 400 });
    }
    await dbConnect();
    const subscription = await PushSubscriptionSchema.findById(body.subscriptionId);
    if (subscription) {
      const { scheduleMedicineForSubscription } = await import("@/lib/notificationScheduling");
      await scheduleMedicineForSubscription(body.medicineId, subscription);
    }
    return NextResponse.json({ success: true, refreshed: Boolean(subscription) });
  }
  if (!body.medicineId || !body.doseId || !body.subscriptionId) {
    return NextResponse.json({ message: "Invalid notification payload" }, { status: 400 });
  }
  if (!isValidObjectIdString(body.medicineId) || !isValidObjectIdString(body.doseId) || !isValidObjectIdString(body.subscriptionId)) {
    return NextResponse.json({ message: "Invalid notification payload" }, { status: 400 });
  }
  await dbConnect();
  const [medicine, subscription] = await Promise.all([
    MedicineSchema.findOne({ _id: body.medicineId, "schedule.doses._id": body.doseId }),
    PushSubscriptionSchema.findById(body.subscriptionId),
  ]);
  const isOwner = medicine && subscription && String(medicine.userId) === String(subscription.userId);
  const hasSharedAccess = medicine && subscription && await AccessSchema.exists({
    ownerId: medicine.userId,
    collaboratorId: subscription.userId,
  });
  if (!medicine || !subscription || (!isOwner && !hasSharedAccess)) {
    return NextResponse.json({ message: "Notification target not found" }, { status: 404 });
  }
  const dose = medicine.schedule.flatMap((entry: { doses: Array<{ _id?: unknown; time: string; dosage: string }> }) => entry.doses).find((item: { _id?: unknown }) => String(item._id) === body.doseId);
  if (!dose) return NextResponse.json({ message: "Dose not found" }, { status: 404 });
  try {
    await sendPushNotification(subscription.toObject(), { title: "Medication reminder", body: `${medicine.medicine_name} (${dose.dosage}) is due in 1 hour at ${dose.time}.`, url: "/" });
    await PushSubscriptionSchema.updateOne({ _id: subscription._id }, { $addToSet: { notifiedDoseKeys: `${medicine._id}:${dose._id}` } });
    return NextResponse.json({ success: true, sent: 1 });
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) await subscription.deleteOne();
    return NextResponse.json({ message: "Push delivery failed" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  if (!(await isQStashRequest(request, body))) {
    return NextResponse.json({ message: "Invalid QStash signature" }, { status: 401 });
  }
  try {
    return sendDueNotification(JSON.parse(body));
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }
}