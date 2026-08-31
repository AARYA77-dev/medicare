import { MedicineSchema } from "@/Schemas/MedicinsSchema";
import { AccessSchema } from "@/Schemas/AccessSchema";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";
import { ScheduleDose, ScheduleEntryData } from "@/Interfaces/interface";
import { scheduleMedicineNotifications } from "@/lib/notificationScheduling";
import { hasNoQuantityForDose } from "@/lib/medicineQuantity";

const SECRET = process.env.NEXTAUTH_SECRET;

function parseSafeDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const str = String(dateStr).trim();

  // 1. ISO format (YYYY-MM-DD)
  if (/^\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2}/.test(str)) {
    const parts = str.split('T')[0].split(/[\-\/]/).map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Delimited: DD/MM/YYYY or MM/DD/YYYY
  const parts = str.split(/[\/\-\.]/).map((p) => p.trim());
  if (parts.length === 3) {
    const [p1, p2] = parts.map(Number);
    let p3 = Number(parts[2]);
    if (p3 < 100) p3 += 2000;

    if (p3 >= 1900 && p3 <= 2100) {
      if (p1 > 12 && p2 <= 12) {
        const d = new Date(p3, p2 - 1, p1);
        if (!isNaN(d.getTime())) return d;
      }
      if (p2 > 12 && p1 <= 12) {
        const d = new Date(p3, p1 - 1, p2);
        if (!isNaN(d.getTime())) return d;
      }
      const d = new Date(p3, p2 - 1, p1);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const fallback = new Date(str);
  return !isNaN(fallback.getTime()) ? fallback : new Date();
}

function formatDateToMatch(date: Date, sampleDateStr?: string): string {
  if (sampleDateStr && sampleDateStr.includes('/')) {
    const parts = sampleDateStr.split('/');
    if (parts.length === 3) {
      // Preserve DD/MM/YYYY format
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
  }
  return date.toLocaleDateString();
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { medicineId, doseId, action } = body;

    if (!medicineId || !doseId || !action) {
      return NextResponse.json(
        { success: false, message: "medicineId, doseId, and action are required." },
        { status: 400 }
      );
    }

    if (!['skip_and_continue', 'carry_forward_shift', 'quantity_unavailable'].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid action. Must be 'skip_and_continue' or 'carry_forward_shift'." },
        { status: 400 }
      );
    }

    await dbConnect();

    // Allow owner OR collaborator/admin to resolve missed doses
    const medicine = await MedicineSchema.findById(medicineId);
    if (!medicine) {
      return NextResponse.json(
        { success: false, message: "Medicine not found." },
        { status: 404 }
      );
    }

    const ownerId = String(medicine.userId);
    const requesterId = String(token.id);
    if (ownerId !== requesterId) {
      const access = await AccessSchema.findOne({
        ownerId,
        collaboratorId: requesterId,
        role: { $in: ['collaborator', 'admin'] },
      });
      if (!access) {
        return NextResponse.json(
          { success: false, message: "Access denied. Care Partner or Co-Manager role required." },
          { status: 403 }
        );
      }
    }

    if (medicine.is_paused) {
      return NextResponse.json(
        { success: false, message: "Cannot manage a missed dose while the medicine schedule is paused." },
        { status: 409 }
      );
    }
    // Locate the dose and its schedule entry
    let foundEntryIndex = -1;
    let foundDoseIndex = -1;
    let missedDose: { time: string; dosage: string } | null = null;

    for (let i = 0; i < medicine.schedule.length; i++) {
      const entry = medicine.schedule[i];
      const dIdx = entry.doses.findIndex(
        (d: ScheduleDose) => String(d._id) === String(doseId)
      );
      if (dIdx !== -1) {
        foundEntryIndex = i;
        foundDoseIndex = dIdx;
        missedDose = {
          time: entry.doses[dIdx].time,
          dosage: entry.doses[dIdx].dosage,
        };
        break;
      }
    }

    if (!missedDose) {
      return NextResponse.json(
        { success: false, message: "Dose not found in medicine schedule." },
        { status: 404 }
      );
    }

    if (action === 'quantity_unavailable' && !hasNoQuantityForDose(medicine.quantity, missedDose.dosage)) {
      return NextResponse.json(
        { success: false, message: "This dosage still has quantity available." },
        { status: 409 }
      );
    }

    const currentSchedule = JSON.parse(JSON.stringify(medicine.schedule)) as ScheduleEntryData[];

    if (action === 'quantity_unavailable') {
      currentSchedule[foundEntryIndex].doses.splice(foundDoseIndex, 1);
      medicine.schedule = currentSchedule.filter((sch) => sch.doses && sch.doses.length > 0);
    } else if (action === 'skip_and_continue') {
      // 1. Remove the missed dose from today's schedule entry
      currentSchedule[foundEntryIndex].doses.splice(foundDoseIndex, 1);

      // If entry has no more doses, remove entry
      let filteredSchedule = currentSchedule.filter(
        (sch) => sch.doses && sch.doses.length > 0
      );

      if (filteredSchedule.length === 0) {
        // If this was the only dose left, create tomorrow's entry
        const todayDate = parseSafeDate(medicine.schedule[foundEntryIndex].date);
        const nextDate = addDays(todayDate, 1);
        filteredSchedule.push({
          day: 1,
          date: formatDateToMatch(nextDate, medicine.schedule[foundEntryIndex].date),
          doses: [missedDose],
        });
      } else {
        // Append the missed dose to a new day at the end
        const lastEntry = filteredSchedule[filteredSchedule.length - 1];
        const lastDate = parseSafeDate(lastEntry.date);
        const extendedDate = addDays(lastDate, 1);

        filteredSchedule.push({
          day: filteredSchedule.length + 1,
          date: formatDateToMatch(extendedDate, lastEntry.date),
          doses: [
            {
              time: missedDose.time || "08:00",
              dosage: missedDose.dosage,
            },
          ],
        });
      }

      // Re-number days sequentially
      filteredSchedule = filteredSchedule.map((sch, idx: number) => ({
        ...sch,
        day: idx + 1,
      }));

      medicine.schedule = filteredSchedule;
    } else if (action === 'carry_forward_shift') {
      // 2. Carry Forward / Shift Sequence
      // Flatten all doses starting from the missed dose
      const allDosesInOrder: { time: string; dosage: string }[] = [];

      currentSchedule.forEach((sch) => {
        sch.doses.forEach((d) => {
          allDosesInOrder.push({
            time: d.time,
            dosage: d.dosage,
          });
        });
      });

      // Today's date has passed. Shift all remaining schedule entry dates by +1 day.
      // If we remove today's entry (or the first entry), we create dates starting from tomorrow
      const startDate = parseSafeDate(currentSchedule[0]?.date || new Date().toISOString());

      // Determine doses per day structure
      // For each day from tomorrow onwards, we assign the doses in sequence
      const updatedSchedule: typeof currentSchedule = [];
      let dosePointer = 0;

      // Calculate how many days we need to distribute all remaining doses
      // We look at original schedule's daily dose counts
      const dailyDoseCounts: number[] = currentSchedule.map(
        (s) => s.doses.length
      );

      // Shift dates by +1 day
      for (let i = 0; i < currentSchedule.length; i++) {
        const currentDate = addDays(startDate, i + 1); // Starts tomorrow (+1 day)
        const count = dailyDoseCounts[i] || 1;
        const dayDoses = allDosesInOrder.slice(dosePointer, dosePointer + count);
        dosePointer += count;

        if (dayDoses.length > 0) {
          updatedSchedule.push({
            day: i + 1,
            date: formatDateToMatch(currentDate, currentSchedule[0]?.date),
            doses: dayDoses,
          });
        }
      }

      // If any doses remain (e.g. if the last day needs an extra slot), add extended day
      if (dosePointer < allDosesInOrder.length) {
        const remainingDoses = allDosesInOrder.slice(dosePointer);
        const lastEntryDate = updatedSchedule.length > 0
          ? parseSafeDate(updatedSchedule[updatedSchedule.length - 1].date)
          : startDate;
        const extendedDate = addDays(lastEntryDate, 1);

        updatedSchedule.push({
          day: updatedSchedule.length + 1,
          date: formatDateToMatch(extendedDate, currentSchedule[0]?.date),
          doses: remainingDoses,
        });
      }

      // Re-number days sequentially
      const finalSchedule = updatedSchedule.map((sch, idx: number) => ({
        ...sch,
        day: idx + 1,
      }));

      medicine.schedule = finalSchedule;
    }

    medicine.missed_doses = (medicine.missed_doses || 0) + 1;

    await medicine.save();
    await scheduleMedicineNotifications(String(medicine._id), medicine.notificationMessageIds || []);

    return NextResponse.json({
      success: true,
      message:
        action === 'quantity_unavailable'
          ? "The dose was recorded as missed because its quantity was zero."
          : action === 'skip_and_continue'
          ? "Today's missed dose was skipped, and it will be added to the end of the schedule."
          : "Today's missed dose was moved to tomorrow, and the rest of the schedule was shifted forward by one day.",
      result: medicine,
    });
  } catch (err: unknown) {
    console.error("Error resolving missed dose:", err);
    return NextResponse.json(
      { success: false, message: "Failed to resolve missed dose", error: String(err) },
      { status: 500 }
    );
  }
}
