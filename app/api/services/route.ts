import { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";
import { readJson, writeJson } from "@/lib/blob";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import type { Service } from "@/lib/types";

const BLOB_KEY = "services.json";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "manage_services");
    const services = await readJson<Service[]>(BLOB_KEY, []);
    return Response.json(services, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_services");
    const body = await req.json();
    const { name, description } = body as {
      name: string;
      description?: string;
    };

    if (!name?.trim()) {
      return Response.json(
        { error: "Service name is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const services = await readJson<Service[]>(BLOB_KEY, []);
    const service: Service = {
      id: uuid(),
      name: name.trim(),
      description: description?.trim() || undefined,
      active: true,
      createdAt: new Date().toISOString(),
    };
    services.push(service);
    await writeJson(BLOB_KEY, services);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Created service",
      details: service.name,
      status: "success",
    });

    return Response.json(service, { status: 201, headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_services");
    const body = await req.json();
    const { id, name, description, active } = body as {
      id: string;
      name?: string;
      description?: string;
      active?: boolean;
    };

    if (!id) {
      return Response.json(
        { error: "Service id is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const services = await readJson<Service[]>(BLOB_KEY, []);
    const idx = services.findIndex((s) => s.id === id);
    if (idx === -1) {
      return Response.json(
        { error: "Service not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    if (name !== undefined) services[idx].name = name.trim();
    if (description !== undefined)
      services[idx].description = description.trim() || undefined;
    if (active !== undefined) services[idx].active = active;
    await writeJson(BLOB_KEY, services);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Updated service",
      details: services[idx].name,
      status: "success",
    });

    return Response.json(services[idx], { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_services");
    const body = await req.json();
    const { id } = body as { id: string };

    if (!id) {
      return Response.json(
        { error: "Service id is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const services = await readJson<Service[]>(BLOB_KEY, []);
    const target = services.find((s) => s.id === id);

    // Idempotent delete — if not found, treat as already deleted
    if (target) {
      const filtered = services.filter((s) => s.id !== id);
      await writeJson(BLOB_KEY, filtered);

      await addLog({
        userId: session.userId,
        userName: session.name,
        action: "Deleted service",
        details: target.name,
        status: "success",
      });
    }

    return Response.json({ success: true }, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}
