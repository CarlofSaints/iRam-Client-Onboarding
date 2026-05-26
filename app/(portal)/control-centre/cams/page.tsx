"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/useAuth";
import type { CAM } from "@/lib/types";

interface CamForm {
  name: string;
  surname: string;
  email: string;
  cell: string;
}

const emptyCamForm: CamForm = { name: "", surname: "", email: "", cell: "" };

export default function CamsPage() {
  const [cams, setCams] = useState<CAM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Add form
  const [form, setForm] = useState<CamForm>(emptyCamForm);
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CamForm>(emptyCamForm);
  const [saving, setSaving] = useState(false);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }, []);

  const fetchCams = useCallback(async () => {
    try {
      setError("");
      const res = await authFetch("/api/cams");
      if (!res.ok) throw new Error("Failed to load CAMs");
      const data: CAM[] = await res.json();
      setCams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load CAMs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCams();
  }, [fetchCams]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.surname.trim() || !form.email.trim())
      return;
    setAdding(true);
    try {
      const res = await authFetch("/api/cams", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          surname: form.surname.trim(),
          email: form.email.trim(),
          cell: form.cell.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create CAM");
      }
      const created: CAM = await res.json();
      setCams((prev) => [...prev, created]);
      setForm(emptyCamForm);
      showMessage("CAM created successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create CAM");
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (cam: CAM) => {
    try {
      const res = await authFetch("/api/cams", {
        method: "PUT",
        body: JSON.stringify({ id: cam.id, active: !cam.active }),
      });
      if (!res.ok) throw new Error("Failed to update CAM");
      const updated: CAM = await res.json();
      setCams((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      showMessage(`CAM ${updated.active ? "activated" : "deactivated"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update CAM");
    }
  };

  const handleEditStart = (cam: CAM) => {
    setEditId(cam.id);
    setEditForm({
      name: cam.name,
      surname: cam.surname,
      email: cam.email,
      cell: cam.cell,
    });
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditForm(emptyCamForm);
  };

  const handleEditSave = async () => {
    if (!editId || !editForm.name.trim() || !editForm.surname.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/cams", {
        method: "PUT",
        body: JSON.stringify({
          id: editId,
          name: editForm.name.trim(),
          surname: editForm.surname.trim(),
          email: editForm.email.trim(),
          cell: editForm.cell.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to update CAM");
      const updated: CAM = await res.json();
      setCams((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditId(null);
      setEditForm(emptyCamForm);
      showMessage("CAM updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update CAM");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cam: CAM) => {
    if (!confirm(`Delete CAM "${cam.name} ${cam.surname}"?`)) return;
    try {
      const res = await authFetch("/api/cams", {
        method: "DELETE",
        body: JSON.stringify({ id: cam.id }),
      });
      if (!res.ok) throw new Error("Failed to delete CAM");
      setCams((prev) => prev.filter((c) => c.id !== cam.id));
      showMessage("CAM deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete CAM");
    }
  };

  const updateForm = (field: keyof CamForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditForm = (field: keyof CamForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const isAddValid =
    form.name.trim() && form.surname.trim() && form.email.trim();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3D6273]">CAMs</h1>
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
          Add New CAM
        </h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              placeholder="Name"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none"
            />
            <input
              type="text"
              value={form.surname}
              onChange={(e) => updateForm("surname", e.target.value)}
              placeholder="Surname"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none"
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
              placeholder="Email"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none"
            />
            <input
              type="tel"
              value={form.cell}
              onChange={(e) => updateForm("cell", e.target.value)}
              placeholder="Cell"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={adding || !isAddValid}
              className="bg-[#7CC042] hover:bg-[#5ea32e] text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? "Adding..." : "Add CAM"}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : cams.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No CAMs yet. Add one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                    Full Name
                  </th>
                  <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                    Cell
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
                {cams.map((cam) => (
                  <tr key={cam.id}>
                    <td className="px-6 py-4">
                      {editId === cam.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) =>
                              updateEditForm("name", e.target.value)
                            }
                            placeholder="Name"
                            className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none text-sm"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editForm.surname}
                            onChange={(e) =>
                              updateEditForm("surname", e.target.value)
                            }
                            placeholder="Surname"
                            className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none text-sm"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900 font-medium">
                          {cam.name} {cam.surname}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editId === cam.id ? (
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            updateEditForm("email", e.target.value)
                          }
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none text-sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-500">
                          {cam.email}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editId === cam.id ? (
                        <input
                          type="tel"
                          value={editForm.cell}
                          onChange={(e) =>
                            updateEditForm("cell", e.target.value)
                          }
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none text-sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-500">
                          {cam.cell || "--"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(cam)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          cam.active
                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {cam.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editId === cam.id ? (
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
                            onClick={() => handleEditStart(cam)}
                            className="text-sm text-[#3D6273] hover:text-[#2c4a56] font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(cam)}
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
          </div>
        )}
      </div>
    </div>
  );
}
