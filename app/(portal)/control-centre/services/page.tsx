"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/useAuth";
import type { Service } from "@/lib/types";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Add form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      setError("");
      const res = await authFetch("/api/services");
      if (!res.ok) throw new Error("Failed to load services");
      const data: Service[] = await res.json();
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await authFetch("/api/services", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create service");
      }
      const created: Service = await res.json();
      setServices((prev) => [...prev, created]);
      setNewName("");
      setNewDesc("");
      showMessage("Service created successfully");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create service"
      );
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const res = await authFetch("/api/services", {
        method: "PUT",
        body: JSON.stringify({ id: service.id, active: !service.active }),
      });
      if (!res.ok) throw new Error("Failed to update service");
      const updated: Service = await res.json();
      setServices((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      showMessage(`Service ${updated.active ? "activated" : "deactivated"}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update service"
      );
    }
  };

  const handleEditStart = (service: Service) => {
    setEditId(service.id);
    setEditName(service.name);
    setEditDesc(service.description || "");
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditName("");
    setEditDesc("");
  };

  const handleEditSave = async () => {
    if (!editId || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/services", {
        method: "PUT",
        body: JSON.stringify({
          id: editId,
          name: editName.trim(),
          description: editDesc.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update service");
      const updated: Service = await res.json();
      setServices((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setEditId(null);
      setEditName("");
      setEditDesc("");
      showMessage("Service updated successfully");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update service"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Delete service "${service.name}"?`)) return;
    try {
      const res = await authFetch("/api/services", {
        method: "DELETE",
        body: JSON.stringify({ id: service.id }),
      });
      if (!res.ok) throw new Error("Failed to delete service");
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      showMessage("Service deleted");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete service"
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3D6273]">Services</h1>
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
          Add New Service
        </h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Service name"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none"
            />
          </div>
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="bg-[#7CC042] hover:bg-[#5ea32e] text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? "Adding..." : "Add Service"}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No services yet. Add one above.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                  Name
                </th>
                <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                  Description
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
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="px-6 py-4">
                    {editId === service.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none text-sm"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm text-gray-900 font-medium">
                        {service.name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editId === service.id ? (
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description"
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none text-sm"
                      />
                    ) : (
                      <span className="text-sm text-gray-500">
                        {service.description || "--"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(service)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        service.active
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {service.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editId === service.id ? (
                      <span className="inline-flex gap-2">
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
                      </span>
                    ) : (
                      <span className="inline-flex gap-3">
                        <button
                          onClick={() => handleEditStart(service)}
                          className="text-sm text-[#3D6273] hover:text-[#2c4a56] font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(service)}
                          className="text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </span>
                    )}
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
