import { NextRequest, NextResponse } from "next/server";
import { verifySSOToken } from "@/lib/sso";
import { getUsers, getUserByEmail } from "@/lib/userData";
import { writeJson } from "@/lib/blob";
import { encodeSession, sessionCookieOptions, noCacheHeaders } from "@/lib/auth";
import type { SessionPayload, User } from "@/lib/types";
import { v4 as uuid } from "uuid";

const MODULE_SLUG = "iram-client-onboarding";

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };
  if (!token) {
    return NextResponse.json(
      { error: "Missing token" },
      { status: 400, headers: noCacheHeaders() }
    );
  }

  const secret = process.env.IRAM_SSO_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SSO not configured" },
      { status: 500, headers: noCacheHeaders() }
    );
  }

  const payload = verifySSOToken(token, secret);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired SSO token" },
      { status: 401, headers: noCacheHeaders() }
    );
  }

  // Check module access
  if (!payload.modules.includes(MODULE_SLUG)) {
    return NextResponse.json(
      { error: "You do not have access to Client Onboarding" },
      { status: 403, headers: noCacheHeaders() }
    );
  }

  // Find existing user by email
  let user = await getUserByEmail(payload.email);

  if (!user) {
    // Create new user with default role
    const users = await getUsers();
    const newUser: User = {
      id: uuid(),
      name: payload.name,
      email: payload.email.toLowerCase(),
      password: "", // No password — SSO-only user
      role: "cam",
      forcePasswordChange: false,
      active: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    users.push(newUser);
    await writeJson("users.json", users);
    user = newUser;
  }

  // Build session
  const session: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    forcePasswordChange: user.forcePasswordChange,
  };

  const encoded = encodeSession(session);
  const cookieOpts = sessionCookieOptions();

  const res = NextResponse.json(
    { ok: true, user: session },
    { headers: noCacheHeaders() }
  );
  res.cookies.set(cookieOpts.name, encoded, cookieOpts);

  return res;
}
