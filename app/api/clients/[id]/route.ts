import { NextRequest } from "next/server";
import { readJson, writeJson } from "@/lib/blob";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import type { Client } from "@/lib/types";

const BLOB_KEY = "clients.json";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(req, "view_clients");
    const { id } = await params;
    const clients = await readJson<Client[]>(BLOB_KEY, []);
    const client = clients.find((c) => c.id === id);
    if (!client) {
      return Response.json(
        { error: "Client not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }
    return Response.json(client, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(req, "edit_clients");
    const { id } = await params;
    const body = await req.json();

    const clients = await readJson<Client[]>(BLOB_KEY, []);
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) {
      return Response.json(
        { error: "Client not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    const { name, status, contactName, emails, website, camId, camEmail } =
      body as Partial<Client>;

    if (name !== undefined) clients[idx].name = name.trim();
    if (status !== undefined) clients[idx].status = status;
    if (contactName !== undefined) clients[idx].contactName = contactName.trim();
    if (emails !== undefined) clients[idx].emails = emails;
    if (website !== undefined) clients[idx].website = website?.trim() || undefined;
    if (camId !== undefined) clients[idx].camId = camId;
    if (camEmail !== undefined) clients[idx].camEmail = camEmail?.trim() || undefined;

    await writeJson(BLOB_KEY, clients);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Updated client",
      details: clients[idx].name,
      status: "success",
    });

    return Response.json(clients[idx], { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}
