"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { authFetch } from "@/lib/useAuth";
import type { LegalTemplate } from "@/lib/types";

type TemplateCategory = LegalTemplate["category"];

const CATEGORIES: TemplateCategory[] = [
  "NDA",
  "Mandate",
  "SLA",
  "Contract",
  "Other",
];

const CATEGORY_BADGE_COLORS: Record<TemplateCategory, string> = {
  NDA: "bg-blue-50 text-blue-700",
  Mandate: "bg-purple-50 text-purple-700",
  SLA: "bg-teal-50 text-teal-700",
  Contract: "bg-amber-50 text-amber-700",
  Other: "bg-gray-100 text-gray-600",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ".pdf,.docx";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<LegalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Upload form
  const [name, setName] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("NDA");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      setError("");
      const res = await authFetch("/api/templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const data: LegalTemplate[] = await res.json();
      setTemplates(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load templates"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > MAX_FILE_SIZE) {
      setError("File size exceeds 10MB limit");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFile(selected);
  };

  const resetForm = () => {
    setName("");
    setCategory("NDA");
    setDescription("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("category", category);
      formData.append("description", description.trim());
      formData.append("file", file);

      const res = await authFetch("/api/templates", {
        method: "POST",
        body: formData,
        rawBody: true,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload template");
      }
      const created: LegalTemplate = await res.json();
      setTemplates((prev) => [...prev, created]);
      resetForm();
      showMessage("Template uploaded successfully");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload template"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (template: LegalTemplate) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    try {
      const res = await authFetch("/api/templates", {
        method: "DELETE",
        body: JSON.stringify({ id: template.id }),
      });
      if (!res.ok) throw new Error("Failed to delete template");
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      showMessage("Template deleted");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete template"
      );
    }
  };

  const isUploadValid = name.trim() && file;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3D6273]">
          Legal Templates
        </h1>
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

      {/* Upload form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          Upload Template
        </h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none"
            />
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as TemplateCategory)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none resize-none"
          />
          <div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#7CC042]/10 file:text-[#5ea32e] hover:file:bg-[#7CC042]/20 cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">
              PDF or DOCX only, max 10MB
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading || !isUploadValid}
              className="bg-[#7CC042] hover:bg-[#5ea32e] text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? "Uploading..." : "Upload Template"}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No templates yet. Upload one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                    Category
                  </th>
                  <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                    Description
                  </th>
                  <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                    File
                  </th>
                  <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                    Size
                  </th>
                  <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                    Uploaded
                  </th>
                  <th className="text-right text-xs uppercase text-gray-500 font-medium px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 font-medium">
                        {template.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          CATEGORY_BADGE_COLORS[template.category]
                        }`}
                      >
                        {template.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 line-clamp-2">
                        {template.description || "--"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {template.fileName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {formatFileSize(template.fileSize)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {formatDate(template.uploadedAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <a
                        href={template.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#3D6273] hover:text-[#2c4a56] font-medium mr-3"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => handleDelete(template)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
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
