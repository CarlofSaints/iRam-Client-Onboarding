import { NextRequest } from "next/server";
import { requireRole, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import { getAllRoles, addCustomRole, deleteCustomRole } from "@/lib/roleData";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, "admin");
    const roles = await getAllRoles();
    return Response.json(roles, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireRole(req, "super_admin");
    const body = await req.json();
    const { name } = body as { name: string };

    if (!name?.trim()) {
      return Response.json(
        { error: "Role name is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const role = await addCustomRole(name);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Created custom role",
      details: `${role.name} (${role.slug})`,
      status: "success",
    });

    return Response.json(role, { status: 201, headers: noCacheHeaders() });
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      return Response.json(
        { error: err.message },
        { status: 409, headers: noCacheHeaders() }
      );
    }
    if (err instanceof Error && err.message.includes("conflicts")) {
      return Response.json(
        { error: err.message },
        { status: 409, headers: noCacheHeaders() }
      );
    }
    return handleAuthError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = requireRole(req, "super_admin");
    const body = await req.json();
    const { slug } = body as { slug: string };

    if (!slug) {
      return Response.json(
        { error: "Role slug is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    await deleteCustomRole(slug);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Deleted custom role",
      details: slug,
      status: "success",
    });

    return Response.json({ success: true }, { headers: noCacheHeaders() });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Cannot delete")) {
      return Response.json(
        { error: err.message },
        { status: 409, headers: noCacheHeaders() }
      );
    }
    return handleAuthError(err);
  }
}
