import { NextRequest } from "next/server";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import {
  getUsers,
  createUser,
  updateUser,
  setUserPassword,
  deleteUser,
} from "@/lib/userData";
import { sendWelcomeEmail } from "@/lib/email";
import type { User, UserRole } from "@/lib/types";

function stripPassword(user: User): Omit<User, "password"> {
  const { password: _, ...safe } = user;
  return safe;
}

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "manage_users");
    const users = await getUsers();
    return Response.json(users.map(stripPassword), {
      headers: noCacheHeaders(),
    });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_users");
    const body = await req.json();
    const { name, email, password, role, forcePasswordChange, sendWelcome } =
      body as {
        name: string;
        email: string;
        password: string;
        role: UserRole;
        forcePasswordChange: boolean;
        sendWelcome?: boolean;
      };

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return Response.json(
        { error: "Name, email, password, and role are required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const user = await createUser({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      forcePasswordChange: forcePasswordChange ?? true,
    });

    if (sendWelcome) {
      try {
        await sendWelcomeEmail({
          to: user.email,
          name: user.name,
          email: user.email,
          password,
          forcePasswordChange: user.forcePasswordChange,
        });
      } catch {
        // Email failure should not block user creation
      }
    }

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Created user",
      details: `${user.name} (${user.email}) as ${user.role}`,
      status: "success",
    });

    return Response.json(stripPassword(user), {
      status: 201,
      headers: noCacheHeaders(),
    });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_users");
    const body = await req.json();
    const { id, name, email, role, active, forcePasswordChange, newPassword } =
      body as {
        id: string;
        name?: string;
        email?: string;
        role?: UserRole;
        active?: boolean;
        forcePasswordChange?: boolean;
        newPassword?: string;
      };

    if (!id) {
      return Response.json(
        { error: "User id is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const updates: Parameters<typeof updateUser>[1] = {};
    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;
    if (forcePasswordChange !== undefined)
      updates.forcePasswordChange = forcePasswordChange;

    const user = await updateUser(id, updates);

    if (newPassword) {
      await setUserPassword(id, newPassword);
    }

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Updated user",
      details: `${user.name} (${user.email})`,
      status: "success",
    });

    return Response.json(stripPassword(user), { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_users");
    const body = await req.json();
    const { id } = body as { id: string };

    if (!id) {
      return Response.json(
        { error: "User id is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const users = await getUsers();
    const target = users.find((u) => u.id === id);
    if (!target) {
      return Response.json(
        { error: "User not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    await deleteUser(id);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Deleted user",
      details: `${target.name} (${target.email})`,
      status: "success",
    });

    return Response.json({ success: true }, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}
