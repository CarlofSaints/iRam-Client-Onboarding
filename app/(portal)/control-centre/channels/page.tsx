"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/useAuth";
import type { Channel } from "@/lib/types";

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Add form
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      setError("");
      const res = await authFetch("/api/channels");
      if (!res.ok) throw new Error("Failed to load channels");
      const data: Channel[] = await res.json();
      setChannels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await authFetch("/api/channels", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create channel");
      }
      const created: Channel = await res.json();
      setChannels((prev) => [...prev, created]);
      setNewName("");
      showMessage("Channel created successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (channel: Channel) => {
    try {
      const res = await authFetch("/api/channels", {
        method: "PUT",
        body: JSON.stringify({ id: channel.id, active: !channel.active }),
      });
      if (!res.ok) throw new Error("Failed to update channel");
      const updated: Channel = await res.json();
      setChannels((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      showMessage(`Channel ${updated.active ? "activated" : "deactivated"}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update channel"
      );
    }
  };

  const handleEditStart = (channel: Channel) => {
    setEditId(channel.id);
    setEditName(channel.name);
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditName("");
  };

  const handleEditSave = async () => {
    if (!editId || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/channels", {
        method: "PUT",
        body: JSON.stringify({ id: editId, name: editName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update channel");
      const updated: Channel = await res.json();
      setChannels((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setEditId(null);
      setEditName("");
      showMessage("Channel updated successfully");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update channel"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (channel: Channel) => {
    if (!confirm(`Delete channel "${channel.name}"?`)) return;
    try {
      const res = await authFetch("/api/channels", {
        method: "DELETE",
        body: JSON.stringify({ id: channel.id }),
      });
      if (!res.ok) throw new Error("Failed to delete channel");
      setChannels((prev) => prev.filter((c) => c.id !== channel.id));
      showMessage("Channel deleted");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete channel"
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3D6273]">Channels</h1>
        <div className="h-1 w-16 bg-[#7CC042] rounded mt-2" />
      </div>

      {/* Success message */}
      {message && (
        <div className="mb-4 px-4 py-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm">
          {message}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          Add New Channel
        </h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Channel name"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="bg-[#7CC042] hover:bg-[#5ea32e] text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {adding ? "Adding..." : "Add Channel"}
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : channels.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No channels yet. Add one above.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                  Name
                </th>
                <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                  Status
                </th>
                <th className="text-right text-xs uppercase text-gray-500 font-medium px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {channels.map((channel) => (
                <tr key={channel.id}>
                  <td className="px-6 py-4">
                    {editId === channel.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditSave();
                            if (e.key === "Escape") handleEditCancel();
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleEditSave}
                          disabled={saving}
                          className="text-sm text-[#7CC042] hover:text-[#5ea32e] font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-900 font-medium">
                        {channel.name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(channel)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        channel.active
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {channel.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEditStart(channel)}
                      className="text-sm text-[#3D6273] hover:text-[#2c4a56] font-medium mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(channel)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
