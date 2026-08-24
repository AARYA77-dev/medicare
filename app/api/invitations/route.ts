import { InvitationSchema } from "@/Schemas/InvitationSchema";
import { AccessSchema } from "@/Schemas/AccessSchema";
import { UserSchema } from "@/Schemas/UserSchema";
import dbConnect from "@/lib/dbConnect";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.NEXTAUTH_SECRET || "medicare_secret_key_1234567890";

// GET — list pending invitations received by the logged-in user
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  await dbConnect();

  const email = (token.email as string).toLowerCase();
  const invitations = await InvitationSchema.find({
    inviteeEmail: email,
    status: 'pending',
  })
    .populate('ownerId', 'name email')
    .sort({ createdAt: -1 });

  return NextResponse.json({ success: true, result: invitations });
}

// POST — owner sends a new invitation
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  const { inviteeEmail, role } = await request.json();

  if (!inviteeEmail || !role) {
    return NextResponse.json({ success: false, message: "Email and role are required" }, { status: 400 });
  }

  if (!['readonly', 'collaborator', 'admin'].includes(role)) {
    return NextResponse.json({ success: false, message: "Invalid role. Use readonly, collaborator, or admin." }, { status: 400 });
  }

  const normalizedEmail = inviteeEmail.toLowerCase().trim();

  if (normalizedEmail === (token.email as string).toLowerCase()) {
    return NextResponse.json({ success: false, message: "You cannot invite yourself" }, { status: 400 });
  }

  await dbConnect();

  // Check if invitee is a registered user
  const inviteeUser = await UserSchema.findOne({ email: normalizedEmail });

  if (!inviteeUser) {
    return NextResponse.json(
      { success: false, message: "No registered user found with that email address." },
      { status: 404 }
    );
  }

  // Check for existing pending invitation
  const existing = await InvitationSchema.findOne({
    ownerId: token.id,
    inviteeEmail: normalizedEmail,
    status: 'pending',
  });

  if (existing) {
    return NextResponse.json(
      { success: false, message: "A pending invitation already exists for this user." },
      { status: 400 }
    );
  }

  // Check for existing active access
  const existingAccess = await AccessSchema.findOne({
    ownerId: token.id,
    collaboratorId: inviteeUser._id,
  });

  if (existingAccess) {
    return NextResponse.json(
      { success: false, message: "This user already has access to your schedule." },
      { status: 400 }
    );
  }

  const invitation = await InvitationSchema.create({
    ownerId: token.id,
    inviteeEmail: normalizedEmail,
    inviteeId: inviteeUser._id,
    role,
    status: 'pending',
  });

  await invitation.populate('ownerId', 'name email');

  return NextResponse.json({ success: true, result: invitation }, { status: 201 });
}
