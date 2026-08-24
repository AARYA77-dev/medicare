import { InvitationSchema } from "@/Schemas/InvitationSchema";
import { AccessSchema } from "@/Schemas/AccessSchema";
import dbConnect from "@/lib/dbConnect";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.NEXTAUTH_SECRET;

// GET — full sharing dashboard data for the logged-in user
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  await dbConnect();

  const email = (token.email as string).toLowerCase();

  // Invitations this user sent (all statuses)
  const sentInvitations = await InvitationSchema.find({ ownerId: token.id })
    .sort({ createdAt: -1 });

  // Accepted collaborators on this user's schedule
  const myCollaborators = await AccessSchema.find({ ownerId: token.id })
    .populate('collaboratorId', 'name email')
    .sort({ createdAt: -1 });

  // Schedules this user has been granted access to (they can view-as these)
  const myCollaborations = await AccessSchema.find({ collaboratorId: token.id })
    .populate('ownerId', 'name email')
    .sort({ createdAt: -1 });

  // Pending invitations this user received
  const pendingInvitations = await InvitationSchema.find({
    inviteeEmail: email,
    status: 'pending',
  })
    .populate('ownerId', 'name email')
    .sort({ createdAt: -1 });

  return NextResponse.json({
    success: true,
    result: {
      sentInvitations,
      myCollaborators,
      myCollaborations,
      pendingInvitations,
    },
  });
}
