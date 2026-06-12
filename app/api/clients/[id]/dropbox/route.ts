import { NextRequest } from "next/server";
import { readJson, writeJson } from "@/lib/blob";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import {
  getDropboxToken,
  getRootNamespaceId,
  dropboxJson,
  DROPBOX_BASE_PATH,
  DROPBOX_TEMPLATE_FOLDER,
} from "@/lib/dropboxApi";
import type { Client } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BLOB_KEY = "clients.json";

type DropboxEntry = {
  ".tag": "file" | "folder";
  name: string;
  path_lower: string;
  path_display: string;
  id: string;
};

type ListFolderResult = {
  entries: DropboxEntry[];
  cursor: string;
  has_more: boolean;
};

type FolderMetadata = {
  metadata: { id: string; path_display: string };
};

/** Read clients, mutate the matching client, write back. */
async function mutateClient(id: string, mutator: (c: Client) => void): Promise<void> {
  const clients = await readJson<Client[]>(BLOB_KEY, []);
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return;
  mutator(clients[idx]);
  await writeJson(BLOB_KEY, clients);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(req, "edit_clients");
    const { id } = await params;

    const clients = await readJson<Client[]>(BLOB_KEY, []);
    const client = clients.find((c) => c.id === id);
    if (!client) {
      return Response.json(
        { error: "Client not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    if (client.dropboxStatus === "done") {
      return Response.json(
        { error: "Dropbox folder already created for this client" },
        { status: 409, headers: noCacheHeaders() }
      );
    }

    try {
      const token = await getDropboxToken();
      const rootNs = await getRootNamespaceId(token);
      const clientFolderPath = `${DROPBOX_BASE_PATH}/${client.name}`;

      // 1. Create client folder
      try {
        await dropboxJson<FolderMetadata>(
          token,
          "files/create_folder_v2",
          { path: clientFolderPath, autorename: false },
          rootNs
        );
      } catch (err) {
        const msg = (err as Error).message ?? "";
        // Folder already exists — that's OK, continue
        if (
          msg.includes("409") ||
          msg.includes("conflict") ||
          msg.includes("path/conflict")
        ) {
          // already exists, proceed
        } else {
          throw err;
        }
      }

      // 2. List template files in 0_MasterTemplates
      const templates = await dropboxJson<ListFolderResult>(
        token,
        "files/list_folder",
        { path: DROPBOX_TEMPLATE_FOLDER },
        rootNs
      );

      const fileEntries = templates.entries.filter((e) => e[".tag"] === "file");

      // 3. Copy each file, replacing "CLIENT" in filename with client name
      let copiedCount = 0;
      for (const file of fileEntries) {
        const newName = file.name.replace(/CLIENT/g, client.name);
        const toPath = `${clientFolderPath}/${newName}`;
        try {
          await dropboxJson(
            token,
            "files/copy_v2",
            {
              from_path: file.path_display || file.path_lower,
              to_path: toPath,
              autorename: false,
            },
            rootNs
          );
          copiedCount++;
        } catch (copyErr) {
          const copyMsg = (copyErr as Error).message ?? "";
          // File already exists — skip, don't fail
          if (
            copyMsg.includes("409") ||
            copyMsg.includes("conflict") ||
            copyMsg.includes("to/conflict")
          ) {
            copiedCount++;
            continue;
          }
          throw copyErr;
        }
      }

      // 4. Persist status
      await mutateClient(id, (c) => {
        c.dropboxStatus = "done";
        c.dropboxError = undefined;
      });

      await addLog({
        userId: session.userId,
        userName: session.name,
        action: "Created Dropbox folder",
        details: `${client.name} (${copiedCount} template file(s) copied)`,
        status: "success",
      });

      return Response.json(
        { ok: true, folder: clientFolderPath, filesCopied: copiedCount },
        { headers: noCacheHeaders() }
      );
    } catch (err) {
      console.error("Dropbox folder creation error:", err);
      const errMsg = (err as Error).message ?? String(err);

      await mutateClient(id, (c) => {
        c.dropboxStatus = "error";
        c.dropboxError = errMsg.slice(0, 300);
      });

      await addLog({
        userId: session.userId,
        userName: session.name,
        action: "Dropbox folder failed",
        details: `${client.name}: ${errMsg.slice(0, 200)}`,
        status: "error",
      });

      return Response.json(
        { error: errMsg },
        { status: 500, headers: noCacheHeaders() }
      );
    }
  } catch (err) {
    return handleAuthError(err);
  }
}
