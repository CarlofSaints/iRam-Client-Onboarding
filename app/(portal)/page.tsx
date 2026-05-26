"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, authFetch } from "@/lib/useAuth";
import type { Client, Channel, LogEntry } from "@/lib/types";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function statusColor(status?: string): string {
  switch (status) {
    case "success":
      return "bg-green-100 text-green-700";
    case "error":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [clientsRes, channelsRes, logsRes] = await Promise.all([
          authFetch("/api/clients"),
          authFetch("/api/channels"),
          authFetch("/api/logs"),
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
        if (logsRes.ok) {
          const data = await logsRes.json();
          setLogs(Array.isArray(data) ? data : data.logs ?? []);
        }
      } catch {
        // Silently handle fetch errors
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "active" || c.status === "live").length;
  const intakeClients = clients.filter((c) => c.status === "intake").length;
  const totalChannels = channels.filter((c) => c.active).length;

  const recentLogs = logs.slice(0, 10);

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
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3D6273]">
          Welcome, {user?.name ?? "User"}
        </h1>
        <div className="h-1 w-16 bg-[#7CC042] rounded mt-2" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Clients" value={totalClients} color="#3D6273" />
        <StatCard label="Active Clients" value={activeClients} color="#7CC042" />
        <StatCard label="Intake Clients" value={intakeClients} color="#F59E0B" />
        <StatCard label="Total Channels" value={totalChannels} color="#6366F1" />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/onboarding/new"
          className="inline-flex items-center gap-2 bg-[#7CC042] hover:bg-[#5ea32e] text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          New Client
        </Link>
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-[#3D6273] px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          View Clients
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-[#3D6273] mb-4">
          Recent Activity
        </h2>

        {recentLogs.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No activity recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"
              >
                <span className="text-xs text-gray-400 whitespace-nowrap mt-0.5 min-w-[60px]">
                  {relativeTime(log.timestamp)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">{log.userName}</span>{" "}
                    <span className="text-gray-500">{log.action}</span>
                  </p>
                  {log.details && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {log.details}
                    </p>
                  )}
                </div>
                {log.status && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor(
                      log.status
                    )}`}
                  >
                    {log.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {logs.length > 10 && (
          <div className="mt-4 text-center">
            <Link
              href="/activity-log"
              className="text-sm text-[#7CC042] hover:text-[#5ea32e] font-medium transition-colors"
            >
              View all activity
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
