import { NextRequest } from "next/server";
import { requireRole, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import { getRolePermissions, saveRolePermissions } from "@/lib/roleData";
import type { RolePermissions } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, "super_admin");
    const rolePerms = await getRolePermissions();
    return Response.json(rolePerms, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = requireRole(req, "super_admin");
    const body = await req.json();
    const rolePerms = body as RolePermissions[];

    if (!Array.isArray(rolePerms)) {
      return Response.json(
        { error: "Expected an array of role permissions" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    await saveRolePermissions(rolePerms);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Updated role permissions",
      status: "success",
    });

    return Response.json({ success: true }, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}
