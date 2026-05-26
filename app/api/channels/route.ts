import { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";
import { readJson, writeJson } from "@/lib/blob";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import type { Channel } from "@/lib/types";

const BLOB_KEY = "channels.json";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "manage_channels");
    const channels = await readJson<Channel[]>(BLOB_KEY, []);
    return Response.json(channels, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_channels");
    const body = await req.json();
    const { name } = body as { name: string };

    if (!name?.trim()) {
      return Response.json(
        { error: "Channel name is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const channels = await readJson<Channel[]>(BLOB_KEY, []);
    const channel: Channel = {
      id: uuid(),
      name: name.trim(),
      active: true,
      createdAt: new Date().toISOString(),
    };
    channels.push(channel);
    await writeJson(BLOB_KEY, channels);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Created channel",
      details: channel.name,
      status: "success",
    });

    return Response.json(channel, { status: 201, headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_channels");
    const body = await req.json();
    const { id, name, active } = body as {
      id: string;
      name?: string;
      active?: boolean;
    };

    if (!id) {
      return Response.json(
        { error: "Channel id is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const channels = await readJson<Channel[]>(BLOB_KEY, []);
    const idx = channels.findIndex((c) => c.id === id);
    if (idx === -1) {
      return Response.json(
        { error: "Channel not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    if (name !== undefined) channels[idx].name = name.trim();
    if (active !== undefined) channels[idx].active = active;
    await writeJson(BLOB_KEY, channels);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Updated channel",
      details: channels[idx].name,
      status: "success",
    });

    return Response.json(channels[idx], { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_channels");
    const body = await req.json();
    const { id } = body as { id: string };

    if (!id) {
      return Response.json(
        { error: "Channel id is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const channels = await readJson<Channel[]>(BLOB_KEY, []);
    const target = channels.find((c) => c.id === id);
    if (!target) {
      return Response.json(
        { error: "Channel not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    const filtered = channels.filter((c) => c.id !== id);
    await writeJson(BLOB_KEY, filtered);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Deleted channel",
      details: target.name,
      status: "success",
    });

    return Response.json({ success: true }, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}
