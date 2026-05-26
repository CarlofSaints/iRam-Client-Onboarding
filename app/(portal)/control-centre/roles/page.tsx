"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { authFetch } from "@/lib/useAuth";
import { ALL_PERMISSIONS, ROLE_LABELS } from "@/lib/roles";
import type { RolePermissions, UserRole, PermissionKey } from "@/lib/types";

const ROLES: UserRole[] = ["super_admin", "admin", "cam", "sales_person"];

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
  const [rolePerms, setRolePerms] = useState<RolePermissions[]>([]);
  const [original, setOriginal] = useState<RolePermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }, []);

  const fetchPerms = useCallback(async () => {
    try {
      setError("");
      const res = await authFetch("/api/role-permissions");
      if (!res.ok) throw new Error("Failed to load permissions");
      const data: RolePermissions[] = await res.json();
      setRolePerms(data);
      setOriginal(JSON.parse(JSON.stringify(data)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load permissions"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerms();
  }, [fetchPerms]);

  const isDirty = useMemo(() => {
    return JSON.stringify(rolePerms) !== JSON.stringify(original);
  }, [rolePerms, original]);

  const hasPermission = (role: UserRole, perm: PermissionKey): boolean => {
    const entry = rolePerms.find((rp) => rp.role === role);
    return entry ? entry.permissions.includes(perm) : false;
  };

  const togglePermission = (role: UserRole, perm: PermissionKey) => {
    if (role === "super_admin") return; // locked
    setRolePerms((prev) =>
      prev.map((rp) => {
        if (rp.role !== role) return rp;
        const has = rp.permissions.includes(perm);
        return {
          ...rp,
          permissions: has
            ? rp.permissions.filter((p) => p !== perm)
            : [...rp.permissions, perm],
        };
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/role-permissions", {
        method: "PUT",
        body: JSON.stringify(rolePerms),
      });
      if (!res.ok) throw new Error("Failed to save permissions");
      const saved: RolePermissions[] = await res.json();
      setRolePerms(saved);
      setOriginal(JSON.parse(JSON.stringify(saved)));
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3D6273]">
          Role Permissions
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
                  {ROLES.map((role) => (
                    <th
                      key={role}
                      className="text-center text-xs uppercase text-gray-500 font-medium px-4 py-3"
                    >
                      <span
                        className={
                          role === "super_admin" ? "text-gray-400" : ""
                        }
                      >
                        {ROLE_LABELS[role]}
                      </span>
                      {role === "super_admin" && (
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
                    roles={ROLES}
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
  roles: UserRole[];
  hasPermission: (role: UserRole, perm: PermissionKey) => boolean;
  togglePermission: (role: UserRole, perm: PermissionKey) => void;
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
            const checked = hasPermission(role, perm.key);
            const isSuperAdmin = role === "super_admin";
            return (
              <td key={role} className="text-center px-4 py-3">
                <label className="inline-flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isSuperAdmin}
                    onChange={() => togglePermission(role, perm.key)}
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
