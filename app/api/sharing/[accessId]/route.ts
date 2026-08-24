import { AccessSchema } from "@/Schemas/AccessSchema";
import { InvitationSchema } from "@/Schemas/InvitationSchema";
import dbConnect from "@/lib/dbConnect";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.NEXTAUTH_SECRET || "medicare_secret_key_1234567890";
type Context = { params: Promise<{ accessId: string }> };

// DELETE — owner removes a collaborator's active access
export async function DELETE(request: NextRequest, context: Context) {
  const token = await getToken({ req: request, secret: SECRET });
  if (!token?.id) {
    return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
  }

  const { accessId } = await context.params;
  await dbConnect();

  const access = await AccessSchema.findById(accessId);
  if (!access) {
    return NextResponse.json({ success: false, message: "Access record not found." }, { status: 404 });
  }

  // Only the owner can revoke access
  if (String(access.ownerId) !== String(token.id)) {
    return NextResponse.json({ success: false, message: "Forbidden — only the owner can revoke access." }, { status: 403 });
  }

  await access.deleteOne();

  // Mark the linked invitation as declined so it won't create a new Access on re-accept
  if (access.invitationId) {
    await InvitationSchema.findByIdAndUpdate(access.invitationId, { status: 'declined' });
  }

  return NextResponse.json({ success: true, message: "Collaborator access revoked successfully." });
}
