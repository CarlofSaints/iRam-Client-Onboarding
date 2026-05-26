"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/useAuth";
import type { Client, Channel, CAM } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(status: Client["status"]) {
  const map: Record<
    Client["status"],
    { bg: string; text: string; label: string }
  > = {
    intake: { bg: "bg-amber-100", text: "text-amber-700", label: "Intake" },
    active: { bg: "bg-blue-100", text: "text-blue-700", label: "Active" },
    live: { bg: "bg-green-100", text: "text-green-700", label: "Live" },
  };
  const style = map[status] ?? {
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: status,
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [cams, setCams] = useState<CAM[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [clientsRes, channelsRes, camsRes] = await Promise.all([
          authFetch("/api/clients"),
          authFetch("/api/channels"),
          authFetch("/api/cams"),
        ]);

        if (cancelled) return;

        if (clientsRes.ok) {
          const data = await clientsRes.json();
          setClients(Array.isArray(data) ? data : data.clients ?? []);
        }
        if (channelsRes.ok) {
          const data = await channelsRes.json();
          setChannels(Array.isArray(data) ? data : data.channels ?? []);
        }
        if (camsRes.ok) {
          const data = await camsRes.json();
          setCams(Array.isArray(data) ? data : data.cams ?? []);
        }
      } catch {
        // Silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build lookup maps
  const channelMap = useMemo(() => {
    const map = new Map<string, string>();
    channels.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [channels]);

  const camMap = useMemo(() => {
    const map = new Map<string, string>();
    cams.forEach((c) => map.set(c.id, `${c.name} ${c.surname}`));
    return map;
  }, [cams]);

  function getChannelNames(channelIds: string[]): string {
    if (!channelIds || channelIds.length === 0) return "--";
    return channelIds
      .map((id) => channelMap.get(id) ?? "Unknown")
      .join(", ");
  }

  function getCamName(camId: string): string {
    return camMap.get(camId) ?? "--";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <svg
          className="animate-spin h-8 w-8 text-[#7CC042]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#3D6273]">Clients</h1>
          <div className="h-1 w-16 bg-[#7CC042] rounded mt-2" />
        </div>
        <Link
          href="/onboarding/new"
          className="inline-flex items-center gap-2 bg-[#7CC042] hover:bg-[#5ea32e] text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Client
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {clients.length === 0 ? (
          <div className="py-16 text-center">
            <svg
              className="mx-auto mb-4 text-gray-300"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <p className="text-sm text-gray-500 mb-4">
              No clients yet. Create your first client.
            </p>
            <Link
              href="/onboarding/new"
              className="inline-flex items-center gap-2 bg-[#7CC042] hover:bg-[#5ea32e] text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Client
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Client Name
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    CAM
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Channels
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/clients/${client.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {client.logoBase64 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={client.logoBase64}
                            alt=""
                            className="w-7 h-7 rounded border border-gray-200 object-contain shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded bg-[#3D6273]/10 flex items-center justify-center text-xs font-bold text-[#3D6273] shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-gray-800">
                          {client.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {getCamName(client.camId)}
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(client.status)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                      {getChannelNames(client.channelIds)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(client.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Count */}
      {clients.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          {clients.length} client{clients.length !== 1 ? "s" : ""} total
        </p>
      )}
    </div>
  );
}
