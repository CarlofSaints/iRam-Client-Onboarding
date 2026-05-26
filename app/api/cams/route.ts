import { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";
import { readJson, writeJson } from "@/lib/blob";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import type { CAM } from "@/lib/types";

const BLOB_KEY = "cams.json";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "manage_cams");
    const cams = await readJson<CAM[]>(BLOB_KEY, []);
    return Response.json(cams, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_cams");
    const body = await req.json();
    const { name, surname, email, cell } = body as {
      name: string;
      surname: string;
      email: string;
      cell: string;
    };

    if (!name?.trim() || !surname?.trim() || !email?.trim()) {
      return Response.json(
        { error: "Name, surname, and email are required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const cams = await readJson<CAM[]>(BLOB_KEY, []);
    const cam: CAM = {
      id: uuid(),
      name: name.trim(),
      surname: surname.trim(),
      email: email.trim().toLowerCase(),
      cell: cell?.trim() || "",
      active: true,
      createdAt: new Date().toISOString(),
    };
    cams.push(cam);
    await writeJson(BLOB_KEY, cams);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Created CAM",
      details: `${cam.name} ${cam.surname}`,
      status: "success",
    });

    return Response.json(cam, { status: 201, headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_cams");
    const body = await req.json();
    const { id, name, surname, email, cell, active } = body as {
      id: string;
      name?: string;
      surname?: string;
      email?: string;
      cell?: string;
      active?: boolean;
    };

    if (!id) {
      return Response.json(
        { error: "CAM id is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const cams = await readJson<CAM[]>(BLOB_KEY, []);
    const idx = cams.findIndex((c) => c.id === id);
    if (idx === -1) {
      return Response.json(
        { error: "CAM not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    if (name !== undefined) cams[idx].name = name.trim();
    if (surname !== undefined) cams[idx].surname = surname.trim();
    if (email !== undefined) cams[idx].email = email.trim().toLowerCase();
    if (cell !== undefined) cams[idx].cell = cell.trim();
    if (active !== undefined) cams[idx].active = active;
    await writeJson(BLOB_KEY, cams);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Updated CAM",
      details: `${cams[idx].name} ${cams[idx].surname}`,
      status: "success",
    });

    return Response.json(cams[idx], { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_cams");
    const body = await req.json();
    const { id } = body as { id: string };

    if (!id) {
      return Response.json(
        { error: "CAM id is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const cams = await readJson<CAM[]>(BLOB_KEY, []);
    const target = cams.find((c) => c.id === id);
    if (!target) {
      return Response.json(
        { error: "CAM not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    const filtered = cams.filter((c) => c.id !== id);
    await writeJson(BLOB_KEY, filtered);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Deleted CAM",
      details: `${target.name} ${target.surname}`,
      status: "success",
    });

    return Response.json({ success: true }, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}
