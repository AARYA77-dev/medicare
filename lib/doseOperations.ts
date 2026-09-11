import { Types } from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { MedicineSchema } from "@/Schemas/MedicinsSchema";
import { AccessSchema } from "@/Schemas/AccessSchema";
import { cancelMedicineNotifications, scheduleMedicineNotifications } from "@/lib/notificationScheduling";
import { decreaseQuantity, hasNoQuantity, hasNoQuantityForDose } from "@/lib/medicineQuantity";

export async function getEffectiveRole(
  requesterId: string,
  medicine: { userId: Types.ObjectId | string }
): Promise<string | null> {
  const ownerId = String(medicine.userId);
  if (ownerId === requesterId) return "owner";

  const access = await AccessSchema.findOne({
    ownerId,
    collaboratorId: requesterId,
  });
  return access?.role || null;
}

export interface MarkDoseResult {
  success: boolean;
  status: number;
  message: string;
  medicineName?: string;
  doseId?: string;
  medicineId?: string;
  result?: unknown;
  result2?: unknown;
  deletedMedicineResult?: unknown;
  updatedMedicine?: unknown;
}

/**
 * Completes/deletes a single dose from a medicine's schedule,
 * decrements inventory, auto-pauses if empty, updates database,
 * and reschedules notifications.
 */
export async function markDoseAsDone(
  doseId: string | Types.ObjectId,
  userId: string
): Promise<MarkDoseResult> {
  await dbConnect();

  const doseIdStr = String(doseId);
  if (!Types.ObjectId.isValid(doseIdStr)) {
    return { success: false, status: 400, message: "Invalid dose ID" };
  }

  const objectId = new Types.ObjectId(doseIdStr);

  const ownerMed = await MedicineSchema.findOne({ "schedule.doses._id": objectId });
  if (!ownerMed) {
    return { success: false, status: 404, message: "Dose not found or already completed." };
  }

  const role = await getEffectiveRole(userId, ownerMed);
  if (!role || !["owner", "admin", "collaborator"].includes(role)) {
    return { success: false, status: 403, message: "Access denied." };
  }

  if (ownerMed.is_paused) {
    return {
      success: false,
      status: 409,
      message: "Cannot mark a dose done while the medicine schedule is paused.",
    };
  }

  const dose = ownerMed.schedule
    .flatMap((entry: { doses: { _id?: unknown; dosage: string }[] }) => entry.doses)
    .find((item: { _id?: unknown }) => String(item._id) === String(objectId));

  if (dose && hasNoQuantityForDose(ownerMed.quantity, dose.dosage)) {
    return {
      success: false,
      status: 409,
      message: "Cannot mark this dose done because its dosage quantity is zero.",
    };
  }

  await cancelMedicineNotifications(ownerMed.notificationMessageIds || []);

  const nextQuantity = dose ? decreaseQuantity(ownerMed.quantity, dose.dosage) : ownerMed.quantity;
  const shouldPause = hasNoQuantity(nextQuantity);

  const result = await MedicineSchema.updateOne(
    { "schedule.doses._id": objectId },
    {
      $pull: { "schedule.$[].doses": { _id: objectId } },
      $set: {
        quantity: nextQuantity,
        ...(shouldPause ? { is_paused: true, paused_at: new Date() } : {}),
      },
    }
  );

  const result2 = await MedicineSchema.updateMany(
    { userId: ownerMed.userId },
    { $pull: { schedule: { doses: { $size: 0 } } } }
  );

  const deletedMedicineResult = await MedicineSchema.deleteMany({
    userId: ownerMed.userId,
    schedule: { $size: 0 },
  });

  if (shouldPause) {
    await cancelMedicineNotifications(ownerMed.notificationMessageIds || []);
  } else if (await MedicineSchema.exists({ _id: ownerMed._id })) {
    await scheduleMedicineNotifications(String(ownerMed._id));
  }

  const updatedMedicine = await MedicineSchema.findById(ownerMed._id);

  return {
    success: true,
    status: 200,
    message: "Dose marked as done successfully",
    medicineName: ownerMed.medicine_name,
    doseId: String(objectId),
    medicineId: String(ownerMed._id),
    result,
    result2,
    deletedMedicineResult,
    updatedMedicine: updatedMedicine || null,
  };
}
