import { MedicineSchema } from "@/Schemas/MedicinsSchema";
import { AccessSchema } from "@/Schemas/AccessSchema";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";

const SECRET = process.env.NEXTAUTH_SECRET || "medicare_secret_key_1234567890";

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
      await med.deleteOne();
      return NextResponse.json({ message: "Medicine deleted successfully", success: true, result: med });
    }

    // Otherwise treat as dose ID — find the medicine that contains this dose
    const ownerMed = await MedicineSchema.findOne({ "schedule.doses._id": objectId });
    if (!ownerMed) {
      return NextResponse.json({ message: "Dose not found", success: false }, { status: 404 });
    }
    const role = await getEffectiveRole(String(token.id), ownerMed);
    if (!role || (role !== 'owner' && role !== 'admin')) {
      return NextResponse.json({ message: "Access denied.", success: false }, { status: 403 });
    }

    const result = await MedicineSchema.updateOne(
      { "schedule.doses._id": objectId },
      { $pull: { "schedule.$[].doses": { _id: objectId } } }
    );

    const result2 = await MedicineSchema.updateMany(
      { userId: ownerMed.userId },
      { $pull: { schedule: { doses: { $size: 0 } } } }
    );

    const deletedMedicineResult = await MedicineSchema.deleteMany({
      userId: ownerMed.userId,
      schedule: { $size: 0 },
    });

    return NextResponse.json({ message: "Dose deleted successfully", success: true, result, result2, deletedMedicineResult });
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

    const updateMedicine = await MedicineSchema.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    );

    return NextResponse.json(
      { success: true, message: "Medicine updated successfully", result: updateMedicine },
      { status: 200 }
    );
  } catch (err) {
    console.log("error", err);
    return NextResponse.json({ success: false, message: "Update failed", error: String(err) }, { status: 500 });
  }
}