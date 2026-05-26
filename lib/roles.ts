import type { UserRole, PermissionKey, PermissionDef, RolePermissions } from "./types";

export const ALL_PERMISSIONS: PermissionDef[] = [
  // Admin
  { key: "manage_users", label: "Manage Users", category: "admin" },
  { key: "manage_roles", label: "Manage Roles", category: "admin" },
  { key: "manage_channels", label: "Manage Channels", category: "admin" },
  { key: "manage_services", label: "Manage Services", category: "admin" },
  { key: "manage_cams", label: "Manage CAMs", category: "admin" },
  { key: "manage_templates", label: "Manage Templates", category: "admin" },
  { key: "manage_checklist", label: "Manage Checklist", category: "admin" },
  // View
  { key: "view_dashboard", label: "View Dashboard", category: "view" },
  { key: "view_clients", label: "View Clients", category: "view" },
  { key: "create_clients", label: "Create Clients", category: "view" },
  { key: "edit_clients", label: "Edit Clients", category: "view" },
  { key: "view_activity_log", label: "View Activity Log", category: "view" },
  // Data
  { key: "export_data", label: "Export Data", category: "data" },
];

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: "super_admin",
    permissions: ALL_PERMISSIONS.map((p) => p.key),
  },
  {
    role: "admin",
    permissions: [
      "manage_users",
      "manage_roles",
      "manage_channels",
      "manage_services",
      "manage_cams",
      "manage_templates",
      "manage_checklist",
      "view_dashboard",
      "view_clients",
      "create_clients",
      "edit_clients",
      "view_activity_log",
      "export_data",
    ],
  },
  {
    role: "cam",
    permissions: [
      "view_dashboard",
      "view_clients",
      "create_clients",
      "edit_clients",
      "view_activity_log",
    ],
  },
  {
    role: "sales_person",
    permissions: ["view_dashboard", "view_clients"],
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  cam: "CAM",
  sales_person: "Sales Person",
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function isRoleAtLeast(role: UserRole, minRole: UserRole): boolean {
  const hierarchy: UserRole[] = [
    "super_admin",
    "admin",
    "cam",
    "sales_person",
  ];
  return hierarchy.indexOf(role) <= hierarchy.indexOf(minRole);
}

export function hasPermission(
  rolePerms: RolePermissions[],
  role: UserRole,
  perm: PermissionKey
): boolean {
  if (role === "super_admin") return true;
  const entry = rolePerms.find((rp) => rp.role === role);
  return entry ? entry.permissions.includes(perm) : false;
}
