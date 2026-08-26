import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";
import { PushSubscriptionSchema } from "@/Schemas/PushSubscriptionSchema";
import { sendPushNotification } from "@/lib/push";

const SECRET = process.env.NEXTAUTH_SECRET;

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const subscriptions = await PushSubscriptionSchema.find({ userId: token.id });
  if (subscriptions.length === 0) {
    return NextResponse.json({ message: "No notification subscription found" }, { status: 404 });
  }

  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      await sendPushNotification(subscription.toObject(), {
        title: "Medicare test notification",
        body: "Desktop notifications are working.",
        url: "/",
      });
      sent += 1;
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) await subscription.deleteOne();
      const message = error instanceof Error ? error.message : "Push delivery failed";
      return NextResponse.json({ message }, { status: 502 });
    }
  }

  return NextResponse.json({ success: true, sent });
}