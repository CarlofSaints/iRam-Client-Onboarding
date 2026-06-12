"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { authFetch } from "@/lib/useAuth";
import { ALL_PERMISSIONS } from "@/lib/roles";
import type { RolePermissions, PermissionKey } from "@/lib/types";

interface RoleInfo {
  slug: string;
  name: string;
  isSystem: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  admin: "Administration",
  view: "View & Access",
  data: "Data Management",
};

const CATEGORY_COLORS: Record<string, string> = {
  admin: "bg-purple-50 text-purple-700",
  view: "bg-blue-50 text-blue-700",
  data: "bg-teal-50 text-teal-700",
};

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [rolePerms, setRolePerms] = useState<RolePermissions[]>([]);
  const [original, setOriginal] = useState<RolePermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // New role modal state
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setError("");
      const [rolesRes, permsRes] = await Promise.all([
        authFetch("/api/roles"),
        authFetch("/api/role-permissions"),
      ]);

      if (!rolesRes.ok) throw new Error("Failed to load roles");
      if (!permsRes.ok) throw new Error("Failed to load permissions");

      const rolesData: RoleInfo[] = await rolesRes.json();
      const permsData: RolePermissions[] = await permsRes.json();

      setRoles(rolesData);
      setRolePerms(permsData);
      setOriginal(JSON.parse(JSON.stringify(permsData)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isDirty = useMemo(() => {
    return JSON.stringify(rolePerms) !== JSON.stringify(original);
  }, [rolePerms, original]);

  const hasPermission = (role: string, perm: PermissionKey): boolean => {
    const entry = rolePerms.find((rp) => rp.role === role);
    return entry ? entry.permissions.includes(perm) : false;
  };

  const togglePermission = (role: string, perm: PermissionKey) => {
    if (role === "super_admin") return; // locked
    setRolePerms((prev) => {
      // Find or create entry for this role
      const existing = prev.find((rp) => rp.role === role);
      if (existing) {
        return prev.map((rp) => {
          if (rp.role !== role) return rp;
          const has = rp.permissions.includes(perm);
          return {
            ...rp,
            permissions: has
              ? rp.permissions.filter((p) => p !== perm)
              : [...rp.permissions, perm],
          };
        });
      }
      // Create new entry for custom role
      return [...prev, { role, permissions: [perm] }];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/role-permissions", {
        method: "PUT",
        body: JSON.stringify(rolePerms),
      });
      if (!res.ok) throw new Error("Failed to save permissions");
      setOriginal(JSON.parse(JSON.stringify(rolePerms)));
      showMessage("Permissions saved successfully");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save permissions"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setRolePerms(JSON.parse(JSON.stringify(original)));
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    try {
      const res = await authFetch("/api/roles", {
        method: "POST",
        body: JSON.stringify({ name: newRoleName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create role");
      }
      setShowNewRoleModal(false);
      setNewRoleName("");
      showMessage("Role created successfully");
      // Refresh data
      setLoading(true);
      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create role"
      );
    } finally {
      setCreatingRole(false);
    }
  };

  const handleDeleteRole = async (slug: string, roleName: string) => {
    if (!confirm(`Delete custom role "${roleName}"? This cannot be undone.`))
      return;
    try {
      const res = await authFetch("/api/roles", {
        method: "DELETE",
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete role");
      }
      showMessage("Role deleted");
      setLoading(true);
      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete role"
      );
    }
  };

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, typeof ALL_PERMISSIONS> = {};
    for (const perm of ALL_PERMISSIONS) {
      if (!groups[perm.category]) groups[perm.category] = [];
      groups[perm.category].push(perm);
    }
    return groups;
  }, []);

  const categories = Object.keys(groupedPermissions);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3D6273]">
            Role Permissions
          </h1>
          <div className="h-1 w-16 bg-[#7CC042] rounded mt-2" />
        </div>
        <button
          onClick={() => setShowNewRoleModal(true)}
          className="bg-[#7CC042] hover:bg-[#5ea32e] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
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
          New Role
        </button>
      </div>

      {/* New Role Modal */}
      {showNewRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-[#3D6273] mb-4">
              Create Custom Role
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Role Name
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Regional Manager"
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7CC042]/30 focus:border-[#7CC042] outline-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateRole();
                    }
                  }}
                />
                {newRoleName.trim() && (
                  <p className="mt-1 text-xs text-gray-400">
                    Slug:{" "}
                    <code className="bg-gray-100 px-1 py-0.5 rounded">
                      {newRoleName
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]+/g, "_")
                        .replace(/^_|_$/g, "")}
                    </code>
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewRoleModal(false);
                  setNewRoleName("");
                }}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={creatingRole || !newRoleName.trim()}
                className="bg-[#7CC042] hover:bg-[#5ea32e] text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {creatingRole ? "Creating..." : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Dirty indicator + buttons */}
      {isDirty && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-sm text-amber-700 flex-1">
            You have unsaved changes.
          </span>
          <button
            onClick={handleDiscard}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#7CC042] hover:bg-[#5ea32e] text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Permission Matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3 w-1/3">
                    Permission
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role.slug}
                      className="text-center text-xs uppercase text-gray-500 font-medium px-4 py-3"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className={
                            role.slug === "super_admin" ? "text-gray-400" : ""
                          }
                        >
                          {role.name}
                        </span>
                        {!role.isSystem && (
                          <button
                            onClick={() =>
                              handleDeleteRole(role.slug, role.name)
                            }
                            className="ml-1 p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title={`Delete ${role.name}`}
                          >
                            <svg
                              width="12"
                              height="12"
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
                      {role.slug === "super_admin" && (
                        <div className="text-[10px] text-gray-400 font-normal normal-case mt-0.5">
                          (locked)
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <CategoryGroup
                    key={category}
                    category={category}
                    permissions={groupedPermissions[category]}
                    roles={roles}
                    hasPermission={hasPermission}
                    togglePermission={togglePermission}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryGroup({
  category,
  permissions,
  roles,
  hasPermission,
  togglePermission,
}: {
  category: string;
  permissions: typeof ALL_PERMISSIONS;
  roles: RoleInfo[];
  hasPermission: (role: string, perm: PermissionKey) => boolean;
  togglePermission: (role: string, perm: PermissionKey) => void;
}) {
  return (
    <>
      {/* Category header */}
      <tr>
        <td
          colSpan={roles.length + 1}
          className={`px-6 py-2 text-xs font-semibold uppercase tracking-wide ${
            CATEGORY_COLORS[category] || "bg-gray-50 text-gray-600"
          }`}
        >
          {CATEGORY_LABELS[category] || category}
        </td>
      </tr>
      {/* Permission rows */}
      {permissions.map((perm) => (
        <tr
          key={perm.key}
          className="border-b border-gray-50 hover:bg-gray-50/50"
        >
          <td className="px-6 py-3">
            <span className="text-sm text-gray-700">{perm.label}</span>
          </td>
          {roles.map((role) => {
            const checked = hasPermission(role.slug, perm.key);
            const isSuperAdmin = role.slug === "super_admin";
            return (
              <td key={role.slug} className="text-center px-4 py-3">
                <label className="inline-flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isSuperAdmin}
                    onChange={() => togglePermission(role.slug, perm.key)}
                    className={`h-4 w-4 rounded border-gray-300 focus:ring-[#7CC042] cursor-pointer ${
                      isSuperAdmin
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-[#7CC042]"
                    }`}
                  />
                </label>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
