import { NextRequest } from "next/server";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import { getUserById } from "@/lib/userData";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_users");
    const body = await req.json();
    const { userId, password } = body as { userId: string; password: string };

    if (!userId || !password) {
      return Response.json(
        { error: "userId and password are required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return Response.json(
        { error: "User not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    await sendWelcomeEmail({
      to: user.email,
      name: user.name,
      email: user.email,
      password,
      forcePasswordChange: user.forcePasswordChange,
    });

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Sent welcome email",
      details: `${user.name} (${user.email})`,
      status: "success",
    });

    return Response.json({ success: true }, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}
