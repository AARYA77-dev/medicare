import { MedicineSchema } from "@/Schemas/MedicinsSchema";
import { AccessSchema } from "@/Schemas/AccessSchema";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";
import { cancelMedicineNotifications, scheduleMedicineNotifications } from "@/lib/notificationScheduling";
import { decreaseQuantity, hasNoQuantity, hasNoQuantityForDose } from "@/lib/medicineQuantity";
import { markDoseAsDone } from "@/lib/doseOperations";

const SECRET = process.env.NEXTAUTH_SECRET;

type Context = {
  params: Promise<{ id: string }>;
};

/** Returns null if no access, or the role ('owner' | 'readonly' | 'collaborator' | 'admin') */
async function getEffectiveRole(
  requesterId: string,
  medicine: { userId: Types.ObjectId | string }
): Promise<string | null> {
  const ownerId = String(medicine.userId);
  if (ownerId === requesterId) return 'owner';

  const access = await AccessSchema.findOne({
    ownerId,
    collaboratorId: requesterId,
  });
  return access?.role || null;
}

export async function GET(request: NextRequest, context: Context) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  let data = null;
  try {
    const { id } = await context.params;
    await dbConnect();
    // Try own record first
    data = await MedicineSchema.findOne({ _id: id, userId: token.id });
    // If not found, check if it belongs to an owner who granted access
    if (!data) {
      const med = await MedicineSchema.findById(id);
      if (med) {
        const role = await getEffectiveRole(String(token.id), med);
        if (role) data = med;
      }
    }
  } catch (err) {
    console.log("Error", err);
  }
  return NextResponse.json({ result: data, success: true });
}

export async function DELETE(request: NextRequest, context: Context) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await dbConnect();

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid ID", success: false }, { status: 400 });
    }

    const objectId = new Types.ObjectId(id);

    // Check if it's a medicine document
    const med = await MedicineSchema.findById(objectId);
    if (med) {
      const role = await getEffectiveRole(String(token.id), med);
      if (!role || (role !== 'owner' && role !== 'admin')) {
        return NextResponse.json({ message: "Access denied. Co-Manager role required to delete.", success: false }, { status: 403 });
      }
      await cancelMedicineNotifications(med.notificationMessageIds || []);
      await med.deleteOne();
      return NextResponse.json({ message: "Medicine deleted successfully", success: true, result: med });
    }

    // Otherwise treat as dose ID — complete the dose
    const doseResult = await markDoseAsDone(objectId, String(token.id));
    return NextResponse.json(doseResult, { status: doseResult.status });
  } catch (err) {
    console.error("Error", err);
    return NextResponse.json({ message: "Failed to delete", error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: Context) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid Medicine ID" }, { status: 400 });
    }

    const body = await request.json();
    await dbConnect();

    // Find the medicine and verify access
    const med = await MedicineSchema.findById(id);
    if (!med) {
      return NextResponse.json({ success: false, message: "Medicine not found" }, { status: 404 });
    }

    const role = await getEffectiveRole(String(token.id), med);
    if (!role || (role !== 'owner' && role !== 'admin')) {
      return NextResponse.json({ message: "Access denied. Co-Manager role required to edit.", success: false }, { status: 403 });
    }

    const { _id: _ignoredId, ...cleanBody } = body;
    const quantityProvided = Object.prototype.hasOwnProperty.call(cleanBody, 'quantity');
    const shouldPause = quantityProvided && hasNoQuantity(cleanBody.quantity);
    const updateMedicine = await MedicineSchema.findByIdAndUpdate(
      id,
      { $set: { ...cleanBody, ...(shouldPause ? { is_paused: true, paused_at: new Date() } : {}) } },
      { new: true, runValidators: true }
    );
    if (shouldPause || updateMedicine?.is_paused) {
      await cancelMedicineNotifications(med.notificationMessageIds || []);
    } else {
      await scheduleMedicineNotifications(String(id), med.notificationMessageIds || []);
    }

    return NextResponse.json(
      { success: true, message: "Medicine updated successfully", result: updateMedicine },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'ValidationError') {
      return NextResponse.json({ success: false, message: (err as Error).message }, { status: 400 });
    }
    console.log("error", err);
    return NextResponse.json({ success: false, message: "Update failed", error: String(err) }, { status: 500 });
  }
}