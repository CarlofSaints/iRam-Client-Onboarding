import { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";
import { readJson, writeJson } from "@/lib/blob";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import type { Client } from "@/lib/types";

const BLOB_KEY = "clients.json";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "view_clients");
    const clients = await readJson<Client[]>(BLOB_KEY, []);
    return Response.json(clients, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "create_clients");
    const body = await req.json();
    const {
      name,
      logoBase64,
      website,
      camId,
      camEmail,
      channelIds,
      channelServices,
      contactName,
      emails,
      startDate,
    } = body as {
      name: string;
      logoBase64?: string;
      website?: string;
      camId: string;
      camEmail?: string;
      channelIds: string[];
      channelServices: Record<string, string[]>;
      contactName: string;
      emails: string[];
      startDate: string;
    };

    if (!name?.trim() || !camId || !contactName?.trim() || !startDate) {
      return Response.json(
        { error: "Name, camId, contactName, and startDate are required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const clients = await readJson<Client[]>(BLOB_KEY, []);
    const client: Client = {
      id: uuid(),
      name: name.trim(),
      logoBase64: logoBase64 || undefined,
      website: website?.trim() || undefined,
      camId,
      camEmail: camEmail?.trim().toLowerCase() || undefined,
      channelIds: channelIds || [],
      channelServices: channelServices || {},
      contactName: contactName.trim(),
      emails: emails || [],
      startDate,
      status: "intake",
      checklist: {},
      createdAt: new Date().toISOString(),
    };
    clients.push(client);
    await writeJson(BLOB_KEY, clients);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Created client",
      details: client.name,
      status: "success",
    });

    return Response.json(client, { status: 201, headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}
