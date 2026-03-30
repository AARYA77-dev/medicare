import { MedicineSchema } from "@/Schemas/MedicinsSchema";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

const MONGO_DB_URL = process.env.MONGO_URI;
export async function GET() {
  let data = []
  try {
    await mongoose.connect(MONGO_DB_URL!)
    data = await MedicineSchema.find()
  }
  catch (err) {
    console.log("Error",err)
  }
  return NextResponse.json({ result: data, success: true })
}

export async function POST(request:NextRequest){
  const payload=await request.json()
  await mongoose.connect(MONGO_DB_URL!)
  const medicine=new MedicineSchema(payload);
  const result= await medicine.save()
  return NextResponse.json({result,success:true})
}