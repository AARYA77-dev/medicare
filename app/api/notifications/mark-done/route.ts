import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifyActionToken } from "@/lib/actionToken";
import { markDoseAsDone } from "@/lib/doseOperations";

const SECRET = process.env.NEXTAUTH_SECRET;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { doseId, actionToken } = body;

    if (!doseId || typeof doseId !== "string") {
      return NextResponse.json(
        { success: false, message: "A valid doseId is required." },
        { status: 400 }
      );
    }

    let userId: string | null = null;

    // 1. Authenticate via NextAuth session cookie if available
    const sessionToken = await getToken({ req: request, secret: SECRET });
    if (sessionToken?.id) {
      userId = String(sessionToken.id);
    }

    // 2. Fallback to cryptographically signed action token if cookies are absent in background
    if (!userId && actionToken && typeof actionToken === "string") {
      const verified = verifyActionToken(actionToken);
      if (verified && verified.doseId === doseId && verified.action === "mark-done") {
        userId = verified.userId;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Active session or valid action token required." },
        { status: 401 }
      );
    }

    const result = await markDoseAsDone(doseId, userId);
    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    console.error("Error in /api/notifications/mark-done:", error);
    return NextResponse.json(
      { success: false, message: "Failed to mark dose as done", error: String(error) },
      { status: 500 }
    );
  }
}
