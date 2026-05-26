import { NextRequest } from "next/server";
import { readJson, writeJson } from "@/lib/blob";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import type { ChecklistItemDef } from "@/lib/types";

const BLOB_KEY = "checklist-defs.json";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(req, "manage_checklist");
    const { id } = await params;
    const body = await req.json();
    const { label, description, section, type, step, dynamic, optional, active } =
      body as Partial<ChecklistItemDef>;

    const items = await readJson<ChecklistItemDef[]>(BLOB_KEY, []);
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) {
      return Response.json(
        { error: "Checklist item not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    if (label !== undefined) items[idx].label = label.trim();
    if (description !== undefined)
      items[idx].description = description?.trim() || undefined;
    if (section !== undefined) items[idx].section = section.trim();
    if (type !== undefined) items[idx].type = type;
    if (step !== undefined) items[idx].step = step;
    if (dynamic !== undefined) items[idx].dynamic = dynamic;
    if (optional !== undefined) items[idx].optional = optional;
    if (active !== undefined) items[idx].active = active;
    await writeJson(BLOB_KEY, items);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Updated checklist item",
      details: items[idx].label,
      status: "success",
    });

    return Response.json(items[idx], { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(req, "manage_checklist");
    const { id } = await params;

    const items = await readJson<ChecklistItemDef[]>(BLOB_KEY, []);
    const target = items.find((i) => i.id === id);
    if (!target) {
      return Response.json(
        { error: "Checklist item not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    const filtered = items.filter((i) => i.id !== id);
    await writeJson(BLOB_KEY, filtered);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Deleted checklist item",
      details: target.label,
      status: "success",
    });

    return Response.json({ success: true }, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}
