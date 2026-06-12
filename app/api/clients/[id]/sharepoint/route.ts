import { NextRequest } from "next/server";
import { readJson, writeJson } from "@/lib/blob";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import { getToken, graph, graphJson, pollSPCopy, SP_HOST } from "@/lib/graphIram";
import type { Client } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BLOB_KEY = "clients.json";
const TEMPLATE_FOLDER_NAME = "Z-FOLDER STRUCTURE TEMPLATES";

/** Read clients, mutate the matching client, write back. Returns the updated client. */
async function mutateClient(
  id: string,
  mutator: (c: Client) => void
): Promise<Client | null> {
  const clients = await readJson<Client[]>(BLOB_KEY, []);
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  mutator(clients[idx]);
  await writeJson(BLOB_KEY, clients);
  return clients[idx];
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

    if (client.sharepointStatus === "done") {
      return Response.json(
        { error: "SharePoint folder already created for this client" },
        { status: 409, headers: noCacheHeaders() }
      );
    }

    try {
      const token = await getToken();

      // 1. Get root SP site
      const site = await graphJson<{ id: string }>(token, `/sites/${SP_HOST}`);
      const siteId = site.id;

      // 2. Find the "Clients" document library
      const drivesData = await graphJson<{
        value: Array<{ id: string; name: string }>;
      }>(token, `/sites/${siteId}/drives`);
      const clientsDrive = drivesData.value.find((d) => d.name === "Clients");
      if (!clientsDrive) {
        throw new Error("'Clients' document library not found on SharePoint site");
      }
      const driveId = clientsDrive.id;

      // 3. Get the CLIENTS parent folder
      const clientsFolder = await graphJson<{ id: string }>(
        token,
        `/drives/${driveId}/root:/CLIENTS`
      );
      const clientsFolderId = clientsFolder.id;

      // 4. Get the template folder
      const templateFolder = await graphJson<{ id: string }>(
        token,
        `/drives/${driveId}/root:/CLIENTS/${encodeURIComponent(TEMPLATE_FOLDER_NAME)}`
      );

      // 5. Copy template folder into CLIENTS with client name (uppercase)
      const clientFolderName = client.name.toUpperCase();
      const copyRes = await graph(
        token,
        `/drives/${driveId}/items/${templateFolder.id}/copy`,
        {
          method: "POST",
          body: JSON.stringify({
            parentReference: { driveId, id: clientsFolderId },
            name: clientFolderName,
          }),
        }
      );

      if (copyRes.status === 409) {
        // Folder already exists — treat as success
        await mutateClient(id, (c) => {
          c.sharepointStatus = "done";
          c.sharepointError = undefined;
        });

        await addLog({
          userId: session.userId,
          userName: session.name,
          action: "Created SharePoint folder",
          details: `${client.name} (already existed at CLIENTS/${clientFolderName})`,
          status: "success",
        });

        return Response.json(
          { ok: true, folder: `CLIENTS/${clientFolderName}`, note: "Folder already existed" },
          { headers: noCacheHeaders() }
        );
      }

      if (!copyRes.ok) {
        const t = await copyRes.text();
        throw new Error(`Copy failed: ${copyRes.status} ${t}`);
      }

      // 6. Poll monitor URL for completion
      const monitorUrl = copyRes.headers.get("Location");
      if (monitorUrl) await pollSPCopy(monitorUrl);

      // 7. Persist status
      await mutateClient(id, (c) => {
        c.sharepointStatus = "done";
        c.sharepointError = undefined;
      });

      await addLog({
        userId: session.userId,
        userName: session.name,
        action: "Created SharePoint folder",
        details: `${client.name} (CLIENTS/${clientFolderName})`,
        status: "success",
      });

      return Response.json(
        { ok: true, folder: `CLIENTS/${clientFolderName}` },
        { headers: noCacheHeaders() }
      );
    } catch (err) {
      console.error("SharePoint folder creation error:", err);
      const errMsg = (err as Error).message ?? String(err);

      await mutateClient(id, (c) => {
        c.sharepointStatus = "error";
        c.sharepointError = errMsg.slice(0, 300);
      });

      await addLog({
        userId: session.userId,
        userName: session.name,
        action: "SharePoint folder failed",
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
