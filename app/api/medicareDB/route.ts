import { MedicineSchema } from "@/Schemas/MedicinsSchema";
import { AccessSchema } from "@/Schemas/AccessSchema";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";

const SECRET = process.env.NEXTAUTH_SECRET || "medicare_secret_key_1234567890";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  const url = new URL(request.url);
  const ownerId = url.searchParams.get('ownerId');

  await dbConnect();

  // Collaborator viewing another user's schedule
  if (ownerId && ownerId !== String(token.id)) {
    const access = await AccessSchema.findOne({
      ownerId,
      collaboratorId: token.id,
    });
    if (!access) {
      return NextResponse.json({ message: "Access denied.", success: false }, { status: 403 });
    }
    const data = await MedicineSchema.find({ userId: ownerId });
    return NextResponse.json({ result: data, success: true, role: access.role });
  }

  // Own schedule
  const data = await MedicineSchema.find({ userId: token.id });
  return NextResponse.json({ result: data, success: true });
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  const payload = await request.json();
  const { _ownerId, ...medicineData } = payload;

  await dbConnect();

  let effectiveUserId = String(token.id);

  // Co-Manager adding medicine to owner's schedule
  if (_ownerId && _ownerId !== String(token.id)) {
    const access = await AccessSchema.findOne({
      ownerId: _ownerId,
      collaboratorId: token.id,
      role: 'admin',
    });
    if (!access) {
      return NextResponse.json({ message: "Access denied. Co-Manager role required to add medicines.", success: false }, { status: 403 });
    }
    effectiveUserId = _ownerId;
  }

  const medicine = new MedicineSchema({ ...medicineData, userId: effectiveUserId });
  const result = await medicine.save();
  return NextResponse.json({ result, success: true });
}