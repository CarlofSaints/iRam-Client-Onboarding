import { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";
import { readJson, writeJson } from "@/lib/blob";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import type { ChecklistItemDef } from "@/lib/types";

const BLOB_KEY = "checklist-defs.json";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "manage_checklist");
    const items = await readJson<ChecklistItemDef[]>(BLOB_KEY, []);
    return Response.json(items, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_checklist");
    const body = await req.json();
    const { label, description, section, type, step, dynamic, optional } =
      body as {
        label: string;
        description?: string;
        section: string;
        type: ChecklistItemDef["type"];
        step?: number;
        dynamic?: boolean;
        optional?: boolean;
      };

    if (!label?.trim() || !section?.trim() || !type) {
      return Response.json(
        { error: "Label, section, and type are required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const items = await readJson<ChecklistItemDef[]>(BLOB_KEY, []);
    const item: ChecklistItemDef = {
      id: uuid(),
      label: label.trim(),
      description: description?.trim() || undefined,
      section: section.trim(),
      type,
      step: step ?? undefined,
      dynamic: dynamic ?? undefined,
      optional: optional ?? undefined,
      active: true,
      createdAt: new Date().toISOString(),
    };
    items.push(item);
    await writeJson(BLOB_KEY, items);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Created checklist item",
      details: item.label,
      status: "success",
    });

    return Response.json(item, { status: 201, headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}
