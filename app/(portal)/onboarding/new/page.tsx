"use client";

import { useState, useEffect, FormEvent, useCallback, useRef } from "react";
import { useAuth, authFetch } from "@/lib/useAuth";
import Link from "next/link";
import type { Channel, Service, CAM, Client } from "@/lib/types";

interface FormData {
  name: string;
  logoBase64: string;
  website: string;
  camId: string;
  camEmail: string;
  contactName: string;
  emails: string[];
  startDate: string;
  channelIds: string[];
  channelServices: Record<string, string[]>;
  sharepoint: boolean;
  teams: boolean;
  dropbox: boolean;
}

const EMPTY_FORM: FormData = {
  name: "",
  logoBase64: "",
  website: "",
  camId: "",
  camEmail: "",
  contactName: "",
  emails: [""],
  startDate: new Date().toISOString().split("T")[0],
  channelIds: [],
  channelServices: {},
  sharepoint: true,
  teams: true,
  dropbox: true,
};

export default function NewClientPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [cams, setCams] = useState<CAM[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Client | null>(null);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(
    new Set()
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [channelsRes, servicesRes, camsRes] = await Promise.all([
          authFetch("/api/channels"),
          authFetch("/api/services"),
          authFetch("/api/cams"),
        ]);

        if (cancelled) return;

        if (channelsRes.ok) {
          const data = await channelsRes.json();
          setChannels(
            (Array.isArray(data) ? data : data.channels ?? []).filter(
              (c: Channel) => c.active
            )
          );
        }
        if (servicesRes.ok) {
          const data = await servicesRes.json();
          setServices(
            (Array.isArray(data) ? data : data.services ?? []).filter(
              (s: Service) => s.active
            )
          );
        }
        if (camsRes.ok) {
          const data = await camsRes.json();
          setCams(
            (Array.isArray(data) ? data : data.cams ?? []).filter(
              (c: CAM) => c.active
            )
          );
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

  // Helpers
  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  function handleCamChange(camId: string) {
    const cam = cams.find((c) => c.id === camId);
    setForm((prev) => ({
      ...prev,
      camId,
      camEmail: cam?.email ?? "",
    }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField("logoBase64", reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Emails
  function addEmail() {
    setForm((prev) => ({ ...prev, emails: [...prev.emails, ""] }));
  }

  function removeEmail(idx: number) {
    setForm((prev) => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== idx),
    }));
  }

  function updateEmail(idx: number, value: string) {
    setForm((prev) => ({
      ...prev,
      emails: prev.emails.map((e, i) => (i === idx ? value : e)),
    }));
  }

  // Channel selection
  function toggleChannel(channelId: string) {
    setForm((prev) => {
      const isSelected = prev.channelIds.includes(channelId);
      const newIds = isSelected
        ? prev.channelIds.filter((id) => id !== channelId)
        : [...prev.channelIds, channelId];

      const newChannelServices = { ...prev.channelServices };
      if (isSelected) {
        delete newChannelServices[channelId];
      } else if (!newChannelServices[channelId]) {
        newChannelServices[channelId] = [];
      }

      return {
        ...prev,
        channelIds: newIds,
        channelServices: newChannelServices,
      };
    });

    // Auto-expand when selecting
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (!form.channelIds.includes(channelId)) {
        next.add(channelId);
      } else {
        next.delete(channelId);
      }
      return next;
    });
  }

  function toggleService(channelId: string, serviceId: string) {
    setForm((prev) => {
      const current = prev.channelServices[channelId] ?? [];
      const isSelected = current.includes(serviceId);
      const newServices = isSelected
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId];

      return {
        ...prev,
        channelServices: {
          ...prev.channelServices,
          [channelId]: newServices,
        },
      };
    });
  }

  function toggleExpandChannel(channelId: string) {
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  }

  // Submit
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Client name is required.");
      return;
    }
    if (!form.contactName.trim()) {
      setError("Contact name is required.");
      return;
    }
    if (!form.camId) {
      setError("Please select a CAM.");
      return;
    }

    const validEmails = form.emails.filter((e) => e.trim());
    if (validEmails.length === 0) {
      setError("At least one email recipient is required.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await authFetch("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          logoBase64: form.logoBase64 || undefined,
          website: form.website.trim() || undefined,
          camId: form.camId,
          camEmail: form.camEmail.trim() || undefined,
          contactName: form.contactName.trim(),
          emails: validEmails,
          startDate: form.startDate,
          channelIds: form.channelIds,
          channelServices: form.channelServices,
          sharepoint: form.sharepoint,
          teams: form.teams,
          dropbox: form.dropbox,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create client.");
        setSubmitting(false);
        return;
      }

      setCreated(data.client ?? data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM, emails: [""] });
    setCreated(null);
    setExpandedChannels(new Set());
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Loading ──
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

  // ── Success Screen ──
  if (created) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center max-w-lg mx-auto">
          {/* Green checkmark animation */}
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-[#7CC042]/10 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7CC042"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[#3D6273] mb-2">
            Client Created Successfully
          </h2>
          <p className="text-gray-500 mb-8">{created.name}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={resetForm}
              className="bg-[#7CC042] hover:bg-[#5ea32e] text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Create Another
            </button>
            <Link
              href="/clients"
              className="border border-gray-200 bg-white hover:bg-gray-50 text-[#3D6273] px-6 py-2.5 rounded-lg font-medium transition-colors text-center"
            >
              View Clients
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#3D6273]">New Client</h1>
        <div className="h-1 w-16 bg-[#7CC042] rounded mt-2" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Client Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Client Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Name */}
            <div>
              <label
                htmlFor="clientName"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                id="clientName"
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. Henkel"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] text-sm"
              />
            </div>

            {/* Website */}
            <div>
              <label
                htmlFor="website"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Website
              </label>
              <input
                id="website"
                type="url"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] text-sm"
              />
            </div>

            {/* Logo Upload */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Logo (optional)
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer"
                />
                {form.logoBase64 && (
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.logoBase64}
                      alt="Logo preview"
                      className="h-10 w-10 rounded border border-gray-200 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        updateField("logoBase64", "");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CAM & Contact Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            CAM & Contact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CAM Dropdown */}
            <div>
              <label
                htmlFor="cam"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                CAM <span className="text-red-500">*</span>
              </label>
              <select
                id="cam"
                value={form.camId}
                onChange={(e) => handleCamChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] text-sm bg-white"
              >
                <option value="">Select a CAM...</option>
                {cams.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.name} {cam.surname}
                  </option>
                ))}
              </select>
            </div>

            {/* CAM Email (auto-filled, editable) */}
            <div>
              <label
                htmlFor="camEmail"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                CAM Email
              </label>
              <input
                id="camEmail"
                type="email"
                value={form.camEmail}
                onChange={(e) => updateField("camEmail", e.target.value)}
                placeholder="Auto-filled from CAM selection"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] text-sm"
              />
            </div>

            {/* Contact Name */}
            <div>
              <label
                htmlFor="contactName"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Contact Name <span className="text-red-500">*</span>
              </label>
              <input
                id="contactName"
                type="text"
                value={form.contactName}
                onChange={(e) => updateField("contactName", e.target.value)}
                placeholder="Primary contact"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] text-sm"
              />
            </div>

            {/* Start Date */}
            <div>
              <label
                htmlFor="startDate"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] text-sm"
              />
            </div>
          </div>

          {/* Email Recipients */}
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Email Recipients <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {form.emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(idx, e.target.value)}
                    placeholder="recipient@example.com"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] text-sm"
                  />
                  {form.emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(idx)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      aria-label="Remove email"
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
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addEmail}
              className="mt-2 inline-flex items-center gap-1 text-sm text-[#7CC042] hover:text-[#5ea32e] font-medium transition-colors"
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
              Add Recipient
            </button>
          </div>
        </div>

        {/* Channel Selection Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Channels & Services
          </h2>
          {channels.length === 0 ? (
            <p className="text-sm text-gray-500">
              No channels configured. Add channels in Control Centre first.
            </p>
          ) : (
            <div className="space-y-3">
              {channels.map((channel) => {
                const isSelected = form.channelIds.includes(channel.id);
                const isExpanded = expandedChannels.has(channel.id);
                const selectedServices =
                  form.channelServices[channel.id] ?? [];
                const serviceCount = selectedServices.length;

                return (
                  <div
                    key={channel.id}
                    className={`rounded-lg border transition-colors ${
                      isSelected
                        ? "border-[#7CC042]/40 bg-[#7CC042]/5"
                        : "border-gray-200"
                    }`}
                  >
                    {/* Channel header */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleChannel(channel.id)}
                        className="accent-[#7CC042] w-4 h-4 shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) toggleExpandChannel(channel.id);
                        }}
                        disabled={!isSelected}
                        className="flex-1 text-left flex items-center gap-2 min-w-0"
                      >
                        <span
                          className={`text-sm font-medium ${
                            isSelected ? "text-gray-800" : "text-gray-500"
                          }`}
                        >
                          {channel.name}
                        </span>
                        {isSelected && serviceCount > 0 && (
                          <span className="text-xs bg-[#7CC042]/20 text-[#5ea32e] px-2 py-0.5 rounded-full font-medium">
                            {serviceCount} service{serviceCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </button>
                      {isSelected && (
                        <button
                          type="button"
                          onClick={() => toggleExpandChannel(channel.id)}
                          className="shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label={isExpanded ? "Collapse" : "Expand"}
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
                            className={`transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Services list (collapsible) */}
                    {isSelected && isExpanded && services.length > 0 && (
                      <div className="px-4 pb-3 pt-1 border-t border-gray-100 ml-7">
                        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
                          Select services for {channel.name}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {services.map((service) => {
                            const isChecked =
                              selectedServices.includes(service.id);
                            return (
                              <label
                                key={service.id}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                                  isChecked
                                    ? "bg-[#7CC042]/10 text-gray-800"
                                    : "hover:bg-gray-50 text-gray-600"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    toggleService(channel.id, service.id)
                                  }
                                  className="accent-[#7CC042] w-3.5 h-3.5"
                                />
                                <span>{service.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Infrastructure Card (Phase 2 stubs) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">
            Infrastructure Provisioning
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Infrastructure will be provisioned in Phase 2
          </p>
          <div className="space-y-2.5 opacity-60">
            <label className="flex items-center gap-3 text-sm text-gray-500 cursor-not-allowed">
              <input
                type="checkbox"
                checked={form.sharepoint}
                disabled
                className="accent-[#7CC042] w-4 h-4"
              />
              SharePoint
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-500 cursor-not-allowed">
              <input
                type="checkbox"
                checked={form.teams}
                disabled
                className="accent-[#7CC042] w-4 h-4"
              />
              Teams
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-500 cursor-not-allowed">
              <input
                type="checkbox"
                checked={form.dropbox}
                disabled
                className="accent-[#7CC042] w-4 h-4"
              />
              Dropbox
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#7CC042] hover:bg-[#5ea32e] text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating Client..." : "Create Client"}
          </button>
          <Link
            href="/clients"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
