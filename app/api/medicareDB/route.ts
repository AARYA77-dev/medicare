import { MedicineSchema } from "@/Schemas/MedicinsSchema";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const MONGO_DB_URL = process.env.MONGO_URI;
const SECRET = process.env.NEXTAUTH_SECRET || "medicare_secret_key_1234567890";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  let data = [];
  try {
    await mongoose.connect(MONGO_DB_URL!);
    data = await MedicineSchema.find({ userId: token.id });
  } catch (err) {
    console.log("Error", err);
  }
  return NextResponse.json({ result: data, success: true });
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  const payload = await request.json();
  await mongoose.connect(MONGO_DB_URL!);
  const medicine = new MedicineSchema({ ...payload, userId: token.id });
  const result = await medicine.save();
  return NextResponse.json({ result, success: true });
}