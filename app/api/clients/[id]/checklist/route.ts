import { NextRequest } from "next/server";
import { readJson, writeJson } from "@/lib/blob";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import type { Client, ChecklistItemState } from "@/lib/types";

const BLOB_KEY = "clients.json";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(req, "edit_clients");
    const { id } = await params;
    const body = await req.json();
    const { itemId, completed, value, fileUrl } = body as {
      itemId: string;
      completed: boolean;
      value?: string;
      fileUrl?: string;
    };

    if (!itemId) {
      return Response.json(
        { error: "itemId is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const clients = await readJson<Client[]>(BLOB_KEY, []);
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) {
      return Response.json(
        { error: "Client not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    if (!clients[idx].checklist) clients[idx].checklist = {};

    const state: ChecklistItemState = {
      completed,
      completedAt: completed ? new Date().toISOString() : undefined,
      completedBy: completed ? session.name : undefined,
      value: value ?? clients[idx].checklist[itemId]?.value,
      fileUrl: fileUrl ?? clients[idx].checklist[itemId]?.fileUrl,
    };

    clients[idx].checklist[itemId] = state;
    await writeJson(BLOB_KEY, clients);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: completed ? "Completed checklist item" : "Unchecked checklist item",
      details: `${clients[idx].name}`,
      status: "success",
    });

    return Response.json(
      { checklist: clients[idx].checklist },
      { headers: noCacheHeaders() }
    );
  } catch (err) {
    return handleAuthError(err);
  }
}
