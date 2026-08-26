import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";
import { PushSubscriptionSchema } from "@/Schemas/PushSubscriptionSchema";

const SECRET = process.env.NEXTAUTH_SECRET;

export async function GET() {
  return NextResponse.json({ publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null });
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ message: "Invalid push subscription" }, { status: 400 });
  }
  await dbConnect();
  await PushSubscriptionSchema.findOneAndUpdate(
    { endpoint: body.endpoint },
    { userId: token.id, endpoint: body.endpoint, keys: body.keys, timezone: body.timezone || "UTC", notifiedDoseKeys: [] },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { endpoint } = await request.json();
  await dbConnect();
  await PushSubscriptionSchema.deleteOne({ userId: token.id, endpoint });
  return NextResponse.json({ success: true });
}