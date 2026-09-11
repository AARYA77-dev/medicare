import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "medicare-secret-action-token-key";

export interface ActionTokenPayload {
  doseId: string;
  medicineId: string;
  userId: string;
  action: "mark-done";
  exp?: number;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 token for push notification actions.
 * Defaults to 48 hours expiration.
 */
export function createActionToken(payload: Omit<ActionTokenPayload, "exp">, expiresInSeconds = 86400 * 2): string {
  const data: ActionTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const encodedData = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(encodedData).digest("base64url");
  return `${encodedData}.${signature}`;
}

/**
 * Verifies the HMAC-SHA256 signature and expiration of an action token.
 * Returns the decoded payload if valid, or null if tampered or expired.
 */
export function verifyActionToken(token: string): (ActionTokenPayload & { exp: number }) | null {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encodedData, signature] = parts;
    if (!encodedData || !signature) return null;

    const expectedSignature = crypto.createHmac("sha256", SECRET).update(encodedData).digest("base64url");
    const signatureBuffer = Buffer.from(signature, "utf-8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");

    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    const data: ActionTokenPayload = JSON.parse(Buffer.from(encodedData, "base64url").toString("utf-8"));
    if (typeof data.exp !== "number" || Date.now() / 1000 > data.exp) {
      return null;
    }
    return data as ActionTokenPayload & { exp: number };
  } catch {
    return null;
  }
}
