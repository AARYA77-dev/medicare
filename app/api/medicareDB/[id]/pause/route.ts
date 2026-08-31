import { MedicineSchema } from "@/Schemas/MedicinsSchema";
import { AccessSchema } from "@/Schemas/AccessSchema";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { Types } from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { cancelMedicineNotifications, scheduleMedicineNotifications } from "@/lib/notificationScheduling";

const SECRET = process.env.NEXTAUTH_SECRET;
type Context = { params: Promise<{ id: string }> };

function parseDate(value: string): Date | null {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function parseScheduleDate(value: string): Date | null {
  const parts = value.trim().split(/[\/\-.]/).map(Number);
  if (parts.length === 3) {
    const [first, second, third] = parts;
    const year = third > 1000 ? third : first;
    const month = third > 1000 ? second : first;
    const day = third > 1000 ? first : second;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function POST(request: NextRequest, context: Context) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    const { action, resumeDate } = await request.json();
    if (!Types.ObjectId.isValid(id) || !['pause', 'resume'].includes(action)) {
      return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
    }

    await dbConnect();
    const medicine = await MedicineSchema.findById(id);
    if (!medicine) return NextResponse.json({ success: false, message: "Medicine not found" }, { status: 404 });

    const ownerId = String(medicine.userId);
    const requesterId = String(token.id);
    const access = ownerId === requesterId
      ? true
      : await AccessSchema.exists({ ownerId, collaboratorId: requesterId, role: 'admin' });
    if (!access) return NextResponse.json({ success: false, message: "Co-Manager role required" }, { status: 403 });

    if (action === 'pause') {
      if (medicine.is_paused) return NextResponse.json({ success: false, message: "Medicine is already paused" }, { status: 400 });
      medicine.is_paused = true;
      medicine.paused_at = new Date();
      await medicine.save();
      await cancelMedicineNotifications(medicine.notificationMessageIds || []);
    } else {
      if (!medicine.is_paused) return NextResponse.json({ success: false, message: "Medicine is not paused" }, { status: 400 });
      const targetDate = typeof resumeDate === 'string' ? parseDate(resumeDate) : null;
      if (!targetDate) return NextResponse.json({ success: false, message: "A valid resume date is required" }, { status: 400 });
      const firstEntry = medicine.schedule[0];
      if (!firstEntry) return NextResponse.json({ success: false, message: "No remaining doses to resume" }, { status: 400 });

      const parsedFirstDate = parseScheduleDate(firstEntry.date);
      if (!parsedFirstDate) return NextResponse.json({ success: false, message: "Unable to read schedule date" }, { status: 400 });
      const shiftDays = Math.round((targetDate.getTime() - parsedFirstDate.getTime()) / 86400000);
      medicine.schedule = medicine.schedule.map((entry: { day: number; date: string; doses: unknown[] }) => ({
        ...entry,
        date: formatDate(addDays(parseScheduleDate(entry.date) || parsedFirstDate, shiftDays)),
      }));
      medicine.is_paused = false;
      medicine.paused_at = undefined;
      await medicine.save();
      await scheduleMedicineNotifications(String(medicine._id), medicine.notificationMessageIds || []);
    }

    return NextResponse.json({ success: true, result: medicine });
  } catch (error) {
    console.error("Error updating medicine pause status:", error);
    return NextResponse.json({ success: false, message: "Failed to update pause status" }, { status: 500 });
  }
}