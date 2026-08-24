import { MedicineSchema } from "@/Schemas/MedicinsSchema";
import mongoose, { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const MONGO_DB_URL = process.env.MONGO_URI;
const SECRET = process.env.NEXTAUTH_SECRET || "medicare_secret_key_1234567890";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  let data = null;
  try {
    const { id } = await context.params;
    await mongoose.connect(MONGO_DB_URL!);
    data = await MedicineSchema.findOne({ _id: id, userId: token.id });
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
    await mongoose.connect(MONGO_DB_URL!);

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid ID", success: false },
        { status: 400 }
      );
    }

    const objectId = new Types.ObjectId(id);

    // Check if it's a medicine ID directly — only if it belongs to the requesting user
    const deletedMedicine = await MedicineSchema.findOneAndDelete({
      _id: objectId,
      userId: token.id,
    });
    if (deletedMedicine) {
      return NextResponse.json({
        message: "Medicine deleted successfully",
        success: true,
        result: deletedMedicine,
      });
    }

    // Otherwise, treat as dose ID — only affect medicines owned by this user
    const result = await MedicineSchema.updateOne(
      { userId: token.id, "schedule.doses._id": objectId },
      { $pull: { "schedule.$[].doses": { _id: objectId } } }
    );

    const result2 = await MedicineSchema.updateMany(
      { userId: token.id },
      { $pull: { schedule: { doses: { $size: 0 } } } }
    );

    const deletedMedicineResult = await MedicineSchema.deleteMany({
      userId: token.id,
      schedule: { $size: 0 },
    });

    return NextResponse.json({
      message: "Dose deleted successfully",
      success: true,
      result,
      result2,
      deletedMedicineResult,
    });
  } catch (err) {
    console.error("Error", err);
    return NextResponse.json(
      { message: "Failed to delete", error: String(err) },
      { status: 500 }
    );
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
    await mongoose.connect(MONGO_DB_URL!);

    // Only update if the medicine belongs to the requesting user
    const updateMedicine = await MedicineSchema.findOneAndUpdate(
      { _id: id, userId: token.id },
      { $set: body },
      { new: true }
    );

    if (!updateMedicine) {
      return NextResponse.json(
        { success: false, message: "Medicine not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Medicine updated successfully",
        result: updateMedicine,
      },
      { status: 200 }
    );
  } catch (err) {
    console.log("error", err);
    return NextResponse.json(
      { success: false, message: "Update failed", error: String(err) },
      { status: 500 }
    );
  }
}