import { NextRequest } from "next/server";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { getLogs } from "@/lib/activityLog";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "view_activity_log");
    const logs = await getLogs();
    return Response.json(logs, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}
