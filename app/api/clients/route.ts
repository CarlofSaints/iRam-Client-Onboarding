import { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";
import { readJson, writeJson } from "@/lib/blob";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import { sendCamNotificationEmail } from "@/lib/email";
import type { Client, Channel, Service, CAM } from "@/lib/types";

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
      channelCams,
      channelIds,
      channelServices,
      contactName,
      emails,
      startDate,
      commissionMechanism,
      commissionSellInPct,
      commissionSellOutPct,
    } = body as {
      name: string;
      logoBase64?: string;
      website?: string;
      channelCams: Record<string, string>;
      channelIds: string[];
      channelServices: Record<string, string[]>;
      contactName: string;
      emails: string[];
      startDate: string;
      commissionMechanism?: "sell_in" | "sell_out" | "combination";
      commissionSellInPct?: number;
      commissionSellOutPct?: number;
    };

    if (!name?.trim() || !contactName?.trim() || !startDate) {
      return Response.json(
        { error: "Name, contactName, and startDate are required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const clients = await readJson<Client[]>(BLOB_KEY, []);
    const client: Client = {
      id: uuid(),
      name: name.trim(),
      logoBase64: logoBase64 || undefined,
      website: website?.trim() || undefined,
      channelCams: channelCams || {},
      channelIds: channelIds || [],
      channelServices: channelServices || {},
      contactName: contactName.trim(),
      emails: emails || [],
      startDate,
      status: "intake",
      checklist: {},
      createdAt: new Date().toISOString(),
      commissionMechanism: commissionMechanism || undefined,
      commissionSellInPct:
        commissionSellInPct != null ? commissionSellInPct : undefined,
      commissionSellOutPct:
        commissionSellOutPct != null ? commissionSellOutPct : undefined,
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

    // Send per-CAM notification emails
    const camMap = client.channelCams || {};
    const uniqueCamIds = [...new Set(Object.values(camMap))];

    if (uniqueCamIds.length > 0) {
      try {
        const [allChannels, allServices, allCams] = await Promise.all([
          readJson<Channel[]>("channels.json", []),
          readJson<Service[]>("services.json", []),
          readJson<CAM[]>("cams.json", []),
        ]);

        const channelMap = new Map(allChannels.map((c) => [c.id, c.name]));
        const serviceMap = new Map(allServices.map((s) => [s.id, s.name]));

        // Group channels by CAM: camId → channelIds[]
        const camToChannels: Record<string, string[]> = {};
        for (const [channelId, camId] of Object.entries(camMap)) {
          if (!camToChannels[camId]) camToChannels[camId] = [];
          camToChannels[camId].push(channelId);
        }

        // Send one email per unique CAM with only their channels
        for (const camId of uniqueCamIds) {
          const cam = allCams.find((c) => c.id === camId);
          if (!cam?.email) continue;

          const camName = `${cam.name} ${cam.surname}`;
          const camChannelIds = camToChannels[camId] || [];
          const channelsWithServices = camChannelIds.map((chId) => {
            const svcIds = client.channelServices[chId] || [];
            return {
              name: channelMap.get(chId) ?? "Unknown Channel",
              services: svcIds.map((sId) => serviceMap.get(sId) ?? sId),
            };
          });

          try {
            await sendCamNotificationEmail({
              to: cam.email,
              camName,
              clientName: client.name,
              channels: channelsWithServices,
              contactName: client.contactName,
              contactEmail: client.emails[0] || "",
            });
          } catch (err) {
            console.error(
              `Failed to send CAM notification to ${cam.email}:`,
              err
            );
          }
        }
      } catch (err) {
        console.error("Failed to send CAM notification emails:", err);
      }
    }

    return Response.json(client, { status: 201, headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}
