import { DoseHistorySchema } from "@/Schemas/DoseHistorySchema";
import { AccessSchema } from "@/Schemas/AccessSchema";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";

const SECRET = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  const url = new URL(request.url);
  const ownerId = url.searchParams.get("ownerId");

  await dbConnect();

  try {
    // Collaborator viewing another user's history
    if (ownerId && ownerId !== String(token.id)) {
      if (!Types.ObjectId.isValid(ownerId)) {
        return NextResponse.json({ message: "Invalid owner ID", success: false }, { status: 400 });
      }
      const access = await AccessSchema.findOne({
        ownerId,
        collaboratorId: token.id,
      });
      if (!access) {
        return NextResponse.json({ message: "Access denied.", success: false }, { status: 403 });
      }
      const data = await DoseHistorySchema.find({ userId: ownerId }).sort({ takenAt: -1, createdAt: -1 });
      return NextResponse.json({ result: data, success: true, role: access.role });
    }

    // Own history
    const data = await DoseHistorySchema.find({ userId: token.id }).sort({ takenAt: -1, createdAt: -1 });
    return NextResponse.json({ result: data, success: true });
  } catch (err) {
    console.error("Error fetching dose history:", err);
    return NextResponse.json({ message: "Failed to fetch dose history", success: false }, { status: 500 });
  }
}
