import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";
import { PushSubscriptionSchema } from "@/Schemas/PushSubscriptionSchema";
import { MedicineSchema } from "@/Schemas/MedicinsSchema";
import {
  cancelSubscriptionNotifications,
  scheduleMedicineForSubscription,
} from "@/lib/notificationScheduling";

const SECRET = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null });
  }

  await dbConnect();
  const subscriptionCount = await PushSubscriptionSchema.countDocuments({ userId: token.id });
  return NextResponse.json({
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
    subscribed: subscriptionCount > 0,
  });
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ message: "Invalid push subscription" }, { status: 400 });
  }
  await dbConnect();
  const subscription = await PushSubscriptionSchema.findOneAndUpdate(
    { endpoint: body.endpoint },
    { userId: token.id, endpoint: body.endpoint, keys: body.keys, timezone: body.timezone || "UTC", notifiedDoseKeys: [] },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ) as unknown as import("@/Schemas/PushSubscriptionSchema").IPushSubscription | null;
  const medicines = await MedicineSchema.find({ userId: token.id });
  if (subscription) {
    await Promise.all(medicines.map((medicine) => scheduleMedicineForSubscription(String(medicine._id), subscription)));
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { endpoint } = await request.json();
  await dbConnect();
  const subscription = await PushSubscriptionSchema.findOne({ userId: token.id, endpoint });
  if (subscription) {
    await subscription.deleteOne();
    try {
      await cancelSubscriptionNotifications(String(subscription._id));
    } catch (error) {
      console.error("Failed to cancel pending QStash notifications", error);
    }
  }
  return NextResponse.json({ success: true });
}