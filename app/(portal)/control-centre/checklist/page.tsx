"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { authFetch } from "@/lib/useAuth";
import type { ChecklistItemDef } from "@/lib/types";

type ChecklistType = ChecklistItemDef["type"];

const TYPES: ChecklistType[] = ["checkbox", "upload", "date", "text"];

const TYPE_BADGE_COLORS: Record<ChecklistType, string> = {
  checkbox: "bg-green-50 text-green-700",
  upload: "bg-blue-50 text-blue-700",
  date: "bg-amber-50 text-amber-700",
  text: "bg-gray-100 text-gray-600",
};

interface ItemForm {
  label: string;
  description: string;
  section: string;
  type: ChecklistType;
  step: string;
  dynamic: boolean;
  optional: boolean;
}

const emptyForm: ItemForm = {
  label: "",
  description: "",
  section: "",
  type: "checkbox",
  step: "",
  dynamic: false,
  optional: false,
};

export default function ChecklistPage() {
  const [items, setItems] = useState<ChecklistItemDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Add form
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [adding, setAdding] = useState(false);
  const [sectionInput, setSectionInput] = useState<"select" | "new">("select");

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setError("");
      const res = await authFetch("/api/checklist");
      if (!res.ok) throw new Error("Failed to load checklist");
      const data: ChecklistItemDef[] = await res.json();
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load checklist"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Existing sections for dropdown
  const existingSections = useMemo(() => {
    const sections = new Set(items.map((i) => i.section));
    return Array.from(sections).sort();
  }, [items]);

  // Group items by section
  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItemDef[]> = {};
    for (const item of items) {
      if (!groups[item.section]) groups[item.section] = [];
      groups[item.section].push(item);
    }
    // Sort items within each group by step number
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => (a.step ?? 999) - (b.step ?? 999));
    }
    return groups;
  }, [items]);

  const sectionNames = Object.keys(groupedItems).sort();

  const updateForm = (field: keyof ItemForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditForm = (field: keyof ItemForm, value: string | boolean) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.section.trim()) return;
    setAdding(true);
    try {
      const res = await authFetch("/api/checklist", {
        method: "POST",
        body: JSON.stringify({
          label: form.label.trim(),
          description: form.description.trim() || undefined,
          section: form.section.trim(),
          type: form.type,
          step: form.step ? Number(form.step) : undefined,
          dynamic: form.dynamic,
          optional: form.optional,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create checklist item");
      }
      const created: ChecklistItemDef = await res.json();
      setItems((prev) => [...prev, created]);
      setForm(emptyForm);
      setSectionInput("select");
      showMessage("Checklist item created");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create checklist item"
      );
    } finally {
      setAdding(false);
    }
  };

  const handleEditStart = (item: ChecklistItemDef) => {
    setEditId(item.id);
    setEditForm({
      label: item.label,
      description: item.description || "",
      section: item.section,
      type: item.type,
      step: item.step !== undefined ? String(item.step) : "",
      dynamic: item.dynamic ?? false,
      optional: item.optional ?? false,
    });
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditForm(emptyForm);
  };

  const handleEditSave = async () => {
    if (!editId || !editForm.label.trim() || !editForm.section.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/checklist/${editId}`, {
        method: "PUT",
        body: JSON.stringify({
          label: editForm.label.trim(),
          description: editForm.description.trim() || undefined,
          section: editForm.section.trim(),
          type: editForm.type,
          step: editForm.step ? Number(editForm.step) : undefined,
          dynamic: editForm.dynamic,
          optional: editForm.optional,
        }),
      });
      if (!res.ok) throw new Error("Failed to update checklist item");
      const updated: ChecklistItemDef = await res.json();
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setEditId(null);
      setEditForm(emptyForm);
      showMessage("Checklist item updated");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update checklist item"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: ChecklistItemDef) => {
    try {
      const res = await authFetch(`/api/checklist/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: !item.active }),
      });
      if (!res.ok) throw new Error("Failed to update checklist item");
      const updated: ChecklistItemDef = await res.json();
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      showMessage(
        `Item ${updated.active ? "activated" : "deactivated"}`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update checklist item"
      );
    }
  };

  const handleDelete = async (item: ChecklistItemDef) => {
    if (!confirm(`Delete checklist item "${item.label}"?`)) return;
    try {
      const res = await authFetch(`/api/checklist/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete checklist item");
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (editId === item.id) {
        setEditId(null);
        setEditForm(emptyForm);
      }
      showMessage("Checklist item deleted");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete checklist item"
      );
    }
  };

  const isAddValid = form.label.trim() && form.section.trim();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3D6273]">Checklist</h1>
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
          Add Checklist Item
        </h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={form.label}
              onChange={(e) => updateForm("label", e.target.value)}
              placeholder="Label"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none"
            />
            {/* Section: dropdown of existing or new text input */}
            <div className="flex gap-2">
              {sectionInput === "select" && existingSections.length > 0 ? (
                <>
                  <select
                    value={form.section}
                    onChange={(e) => updateForm("section", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none bg-white"
                  >
                    <option value="">Select section</option>
                    {existingSections.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setSectionInput("new");
                      updateForm("section", "");
                    }}
                    className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
                  >
                    New
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={form.section}
                    onChange={(e) => updateForm("section", e.target.value)}
                    placeholder="New section name"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none"
                  />
                  {existingSections.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSectionInput("select");
                        updateForm("section", "");
                      }}
                      className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
                    >
                      Existing
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <textarea
            value={form.description}
            onChange={(e) => updateForm("description", e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none resize-none"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={form.type}
              onChange={(e) =>
                updateForm("type", e.target.value as ChecklistType)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none bg-white"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={form.step}
              onChange={(e) => updateForm("step", e.target.value)}
              placeholder="Step number"
              min={1}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none"
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.dynamic}
                  onChange={(e) => updateForm("dynamic", e.target.checked)}
                  className="rounded border-gray-300 text-[#7CC042] focus:ring-[#7CC042]"
                />
                Dynamic
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.optional}
                  onChange={(e) => updateForm("optional", e.target.checked)}
                  className="rounded border-gray-300 text-[#7CC042] focus:ring-[#7CC042]"
                />
                Optional
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={adding || !isAddValid}
              className="bg-[#7CC042] hover:bg-[#5ea32e] text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>

      {/* Items grouped by section */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
            Loading...
          </div>
        ) : sectionNames.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
            No checklist items yet. Add one above.
          </div>
        ) : (
          sectionNames.map((section) => (
            <div
              key={section}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Section header */}
              <div className="px-6 py-3 bg-[#3D6273]/5 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-[#3D6273] uppercase tracking-wide">
                  {section}
                </h3>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-50">
                {groupedItems[section].map((item) => (
                  <div key={item.id} className="px-6 py-4">
                    {editId === item.id ? (
                      /* Edit form */
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editForm.label}
                            onChange={(e) =>
                              updateEditForm("label", e.target.value)
                            }
                            placeholder="Label"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none text-sm"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editForm.section}
                            onChange={(e) =>
                              updateEditForm("section", e.target.value)
                            }
                            placeholder="Section"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none text-sm"
                          />
                        </div>
                        <textarea
                          value={editForm.description}
                          onChange={(e) =>
                            updateEditForm("description", e.target.value)
                          }
                          placeholder="Description"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none resize-none text-sm"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <select
                            value={editForm.type}
                            onChange={(e) =>
                              updateEditForm(
                                "type",
                                e.target.value as ChecklistType
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none bg-white text-sm"
                          >
                            {TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={editForm.step}
                            onChange={(e) =>
                              updateEditForm("step", e.target.value)
                            }
                            placeholder="Step"
                            min={1}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none text-sm"
                          />
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editForm.dynamic}
                                onChange={(e) =>
                                  updateEditForm("dynamic", e.target.checked)
                                }
                                className="rounded border-gray-300 text-[#7CC042] focus:ring-[#7CC042]"
                              />
                              Dynamic
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editForm.optional}
                                onChange={(e) =>
                                  updateEditForm("optional", e.target.checked)
                                }
                                className="rounded border-gray-300 text-[#7CC042] focus:ring-[#7CC042]"
                              />
                              Optional
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleEditSave}
                            disabled={saving}
                            className="bg-[#7CC042] hover:bg-[#5ea32e] text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display mode */
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleEditStart(item)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-sm font-medium ${
                                item.active
                                  ? "text-gray-900"
                                  : "text-gray-400 line-through"
                              }`}
                            >
                              {item.label}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                TYPE_BADGE_COLORS[item.type]
                              }`}
                            >
                              {item.type}
                            </span>
                            {item.step !== undefined && (
                              <span className="text-xs text-gray-400">
                                Step {item.step}
                              </span>
                            )}
                            {item.dynamic && (
                              <span className="px-1.5 py-0.5 rounded text-xs bg-purple-50 text-purple-600">
                                Dynamic
                              </span>
                            )}
                            {item.optional && (
                              <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                                Optional
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-500">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleActive(item)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                              item.active
                                ? "bg-green-50 text-green-700 hover:bg-green-100"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {item.active ? "Active" : "Inactive"}
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
