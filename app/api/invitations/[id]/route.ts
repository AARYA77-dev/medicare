import { InvitationSchema } from "@/Schemas/InvitationSchema";
import { AccessSchema } from "@/Schemas/AccessSchema";
import dbConnect from "@/lib/dbConnect";
import { getToken } from "next-auth/jwt";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { InvitationContext } from "@/Interfaces/interface";

const SECRET = process.env.NEXTAUTH_SECRET;

// PUT — invitee accepts or declines an invitation
export async function PUT(request: NextRequest, context: InvitationContext) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  const { id } = await context.params;
  const { action } = await request.json(); // 'accept' | 'decline'

  if (!['accept', 'decline'].includes(action)) {
    return NextResponse.json({ success: false, message: "Invalid action. Use 'accept' or 'decline'." }, { status: 400 });
  }

  await dbConnect();

  const invitation = await InvitationSchema.findById(id);
  if (!invitation) {
    return NextResponse.json({ success: false, message: "Invitation not found." }, { status: 404 });
  }

  // Only the invitee can accept/decline
  if (invitation.inviteeEmail !== (token.email as string).toLowerCase()) {
    return NextResponse.json({ success: false, message: "Forbidden — only the invitee can respond to this invitation." }, { status: 403 });
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json({ success: false, message: "This invitation has already been responded to." }, { status: 400 });
  }

  if (action === 'accept') {
    invitation.status = 'accepted';
    invitation.inviteeId = new Types.ObjectId(token.id as string);
    await invitation.save();

    // Create or update the Access record
    await AccessSchema.findOneAndUpdate(
      { ownerId: invitation.ownerId, collaboratorId: token.id },
      {
        ownerId: invitation.ownerId,
        collaboratorId: token.id,
        role: invitation.role,
        invitationId: invitation._id,
      },
      { upsert: true, new: true }
    );
  } else {
    invitation.status = 'declined';
    await invitation.save();
  }

  return NextResponse.json({ success: true, result: invitation });
}

// DELETE — owner revokes/cancels an invitation
export async function DELETE(request: NextRequest, context: InvitationContext) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  const { id } = await context.params;
  await dbConnect();

  const invitation = await InvitationSchema.findById(id);
  if (!invitation) {
    return NextResponse.json({ success: false, message: "Invitation not found." }, { status: 404 });
  }

  // Only the owner can revoke
  if (String(invitation.ownerId) !== String(token.id)) {
    return NextResponse.json({ success: false, message: "Forbidden — only the owner can revoke this invitation." }, { status: 403 });
  }

  await invitation.deleteOne();
  return NextResponse.json({ success: true, message: "Invitation revoked successfully." });
}
