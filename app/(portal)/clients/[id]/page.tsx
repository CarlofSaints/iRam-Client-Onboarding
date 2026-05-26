"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authFetch } from "@/lib/useAuth";
import type {
  Client,
  ChecklistItemDef,
  ChecklistItemState,
  Channel,
  Service,
  CAM,
} from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: Client["status"]) {
  const map: Record<Client["status"], { bg: string; text: string; label: string }> = {
    intake: { bg: "bg-amber-100", text: "text-amber-700", label: "Intake" },
    active: { bg: "bg-blue-100", text: "text-blue-700", label: "Active" },
    live: { bg: "bg-green-100", text: "text-green-700", label: "Live" },
  };
  const style = map[status] ?? { bg: "bg-gray-100", text: "text-gray-600", label: status };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [defs, setDefs] = useState<ChecklistItemDef[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [cams, setCams] = useState<CAM[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [clientRes, defsRes, chRes, svcRes, camRes] = await Promise.all([
        authFetch(`/api/clients/${id}`),
        authFetch("/api/checklist"),
        authFetch("/api/channels"),
        authFetch("/api/services"),
        authFetch("/api/cams"),
      ]);

      if (!clientRes.ok) {
        setError("Client not found");
        return;
      }

      setClient(await clientRes.json());
      if (defsRes.ok) setDefs(await defsRes.json());
      if (chRes.ok) setChannels(await chRes.json());
      if (svcRes.ok) setServices(await svcRes.json());
      if (camRes.ok) setCams(await camRes.json());
    } catch {
      setError("Failed to load client");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lookup maps
  const channelMap = useMemo(() => {
    const m = new Map<string, string>();
    channels.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [channels]);

  const serviceMap = useMemo(() => {
    const m = new Map<string, string>();
    services.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [services]);

  const camName = useMemo(() => {
    if (!client) return "";
    const cam = cams.find((c) => c.id === client.camId);
    return cam ? `${cam.name} ${cam.surname}` : "--";
  }, [cams, client]);

  // Active checklist defs grouped by section, ordered by step
  const sections = useMemo(() => {
    const activeDefs = defs.filter((d) => d.active);
    const grouped = new Map<string, ChecklistItemDef[]>();
    for (const def of activeDefs) {
      const section = def.section || "General";
      if (!grouped.has(section)) grouped.set(section, []);
      grouped.get(section)!.push(def);
    }
    // Sort items within each section by step
    for (const items of grouped.values()) {
      items.sort((a, b) => (a.step ?? 999) - (b.step ?? 999));
    }
    // Return as array of [sectionName, items[]]
    return Array.from(grouped.entries());
  }, [defs]);

  // Progress stats
  const progress = useMemo(() => {
    if (!client) return { total: 0, completed: 0, percent: 0 };
    const activeDefs = defs.filter((d) => d.active);
    const requiredDefs = activeDefs.filter((d) => !d.optional);
    const total = requiredDefs.length;
    const completed = requiredDefs.filter(
      (d) => client.checklist[d.id]?.completed
    ).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [client, defs]);

  async function toggleItem(itemId: string, completed: boolean) {
    if (!client) return;
    setSaving(itemId);
    try {
      const res = await authFetch(`/api/clients/${id}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, completed }),
      });
      if (res.ok) {
        const data = await res.json();
        setClient((prev) =>
          prev ? { ...prev, checklist: data.checklist } : prev
        );
      }
    } catch {
      // silently fail
    } finally {
      setSaving(null);
    }
  }

  async function updateItemValue(itemId: string, value: string) {
    if (!client) return;
    const current = client.checklist[itemId];
    try {
      const res = await authFetch(`/api/clients/${id}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          completed: current?.completed ?? false,
          value,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setClient((prev) =>
          prev ? { ...prev, checklist: data.checklist } : prev
        );
      }
    } catch {
      // silently fail
    }
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

  if (error || !client) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error || "Client not found"}
        </div>
        <Link href="/clients" className="mt-4 inline-block text-sm text-[#3D6273] hover:underline">
          &larr; Back to Clients
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Back link */}
      <Link href="/clients" className="text-sm text-[#3D6273] hover:underline">
        &larr; Back to Clients
      </Link>

      {/* Client header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-4">
          {client.logoBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={client.logoBase64}
              alt=""
              className="w-14 h-14 rounded-lg border border-gray-200 object-contain shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-[#3D6273]/10 flex items-center justify-center text-xl font-bold text-[#3D6273] shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-[#3D6273]">{client.name}</h1>
              {statusBadge(client.status)}
            </div>
            <div className="h-1 w-16 bg-[#7CC042] rounded mt-2 mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-gray-500">CAM:</span>{" "}
                <span className="text-gray-800 font-medium">{camName}</span>
              </div>
              <div>
                <span className="text-gray-500">Contact:</span>{" "}
                <span className="text-gray-800">{client.contactName}</span>
              </div>
              <div>
                <span className="text-gray-500">Start Date:</span>{" "}
                <span className="text-gray-800">{formatDate(client.startDate)}</span>
              </div>
              {client.emails.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-gray-500">Emails:</span>{" "}
                  <span className="text-gray-800">{client.emails.join(", ")}</span>
                </div>
              )}
              {client.website && (
                <div>
                  <span className="text-gray-500">Website:</span>{" "}
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#7CC042] hover:underline"
                  >
                    {client.website}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Channel + Services */}
        {client.channelIds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Channels & Services
            </p>
            <div className="flex flex-wrap gap-2">
              {client.channelIds.map((chId) => {
                const chName = channelMap.get(chId) ?? "Unknown";
                const svcIds = client.channelServices[chId] ?? [];
                const svcNames = svcIds.map((s) => serviceMap.get(s) ?? s);
                return (
                  <div
                    key={chId}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-[#3D6273]">{chName}</span>
                    {svcNames.length > 0 && (
                      <span className="text-gray-500 ml-1">
                        ({svcNames.join(", ")})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {sections.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">
              Onboarding Progress
            </p>
            <p className="text-sm text-gray-500">
              {progress.completed} / {progress.total} required items ({progress.percent}%)
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-500"
              style={{
                width: `${progress.percent}%`,
                backgroundColor:
                  progress.percent === 100
                    ? "#22c55e"
                    : progress.percent >= 50
                      ? "#7CC042"
                      : "#f59e0b",
              }}
            />
          </div>
        </div>
      )}

      {/* Checklist sections */}
      {sections.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <svg
            className="mx-auto mb-3 text-gray-300"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <p className="text-sm text-gray-500">
            No checklist items configured yet.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Add items in Control Centre &rarr; Checklist
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map(([sectionName, items]) => {
            const sectionCompleted = items.filter(
              (d) => client.checklist[d.id]?.completed
            ).length;
            return (
              <div
                key={sectionName}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Section header */}
                <div className="px-5 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#3D6273]">
                    {sectionName}
                  </h2>
                  <span className="text-xs text-gray-400">
                    {sectionCompleted} / {items.length}
                  </span>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-50">
                  {items.map((def) => {
                    const state: ChecklistItemState | undefined =
                      client.checklist[def.id];
                    const isCompleted = state?.completed ?? false;
                    const isSaving = saving === def.id;

                    return (
                      <div
                        key={def.id}
                        className={`px-5 py-3 flex items-start gap-3 transition-colors ${
                          isCompleted ? "bg-green-50/30" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleItem(def.id, !isCompleted)}
                          disabled={isSaving}
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                            isCompleted
                              ? "bg-[#7CC042] border-[#7CC042] text-white"
                              : "border-gray-300 hover:border-[#7CC042]"
                          } ${isSaving ? "opacity-50" : ""}`}
                        >
                          {isSaving ? (
                            <svg
                              className="animate-spin h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                          ) : isCompleted ? (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          ) : null}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isCompleted
                                  ? "text-gray-500 line-through"
                                  : "text-gray-800"
                              }`}
                            >
                              {def.label}
                            </span>
                            {def.optional && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 font-medium">
                                Optional
                              </span>
                            )}
                            {def.type !== "checkbox" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-medium uppercase">
                                {def.type}
                              </span>
                            )}
                          </div>
                          {def.description && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {def.description}
                            </p>
                          )}

                          {/* Text/Date input for non-checkbox types */}
                          {def.type === "text" && (
                            <input
                              type="text"
                              placeholder="Enter value..."
                              defaultValue={state?.value ?? ""}
                              onBlur={(e) => updateItemValue(def.id, e.target.value)}
                              className="mt-2 w-full max-w-md px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042]"
                            />
                          )}
                          {def.type === "date" && (
                            <input
                              type="date"
                              defaultValue={state?.value ?? ""}
                              onBlur={(e) => updateItemValue(def.id, e.target.value)}
                              className="mt-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042]"
                            />
                          )}
                          {def.type === "upload" && (
                            <div className="mt-2">
                              {state?.fileUrl ? (
                                <a
                                  href={state.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-[#7CC042] hover:underline"
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                  </svg>
                                  View uploaded file
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400 italic">
                                  File upload coming soon
                                </span>
                              )}
                            </div>
                          )}

                          {/* Completion info */}
                          {isCompleted && state?.completedAt && (
                            <p className="text-[11px] text-gray-400 mt-1">
                              Completed by {state.completedBy ?? "Unknown"} on{" "}
                              {formatDateTime(state.completedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Created date */}
      <p className="text-xs text-gray-400">
        Created {formatDateTime(client.createdAt)}
      </p>
    </div>
  );
}
