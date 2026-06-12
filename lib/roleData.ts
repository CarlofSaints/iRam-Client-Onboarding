import type { RolePermissions, CustomRole } from "./types";
import { SYSTEM_ROLES } from "./types";
import { readJson, writeJson } from "./blob";
import { DEFAULT_ROLE_PERMISSIONS } from "./roles";
import { getUsers } from "./userData";

const KEY = "role-permissions.json";
const CUSTOM_ROLES_KEY = "custom-roles.json";

export async function getRolePermissions(): Promise<RolePermissions[]> {
  return readJson<RolePermissions[]>(KEY, DEFAULT_ROLE_PERMISSIONS);
}

export async function saveRolePermissions(
  rolePerms: RolePermissions[]
): Promise<void> {
  const superAdminEntry = rolePerms.find((rp) => rp.role === "super_admin");
  if (superAdminEntry) {
    const { ALL_PERMISSIONS } = await import("./roles");
    superAdminEntry.permissions = ALL_PERMISSIONS.map((p) => p.key);
  }
  await writeJson(KEY, rolePerms);
}

// ── Custom Roles ──

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function getCustomRoles(): Promise<CustomRole[]> {
  return readJson<CustomRole[]>(CUSTOM_ROLES_KEY, []);
}

export async function addCustomRole(name: string): Promise<CustomRole> {
  const slug = slugify(name);
  if (!slug) throw new Error("Invalid role name");

  // Prevent duplicates with system roles
  if ((SYSTEM_ROLES as readonly string[]).includes(slug)) {
    throw new Error(`"${name}" conflicts with a system role`);
  }

  const roles = await getCustomRoles();
  if (roles.some((r) => r.slug === slug)) {
    throw new Error(`Role "${name}" already exists`);
  }

  const role: CustomRole = {
    slug,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  roles.push(role);
  await writeJson(CUSTOM_ROLES_KEY, roles);
  return role;
}

export async function deleteCustomRole(slug: string): Promise<void> {
  // Check no users are assigned to this role
  const users = await getUsers();
  const assigned = users.filter((u) => u.role === slug);
  if (assigned.length > 0) {
    throw new Error(
      `Cannot delete role — ${assigned.length} user(s) assigned`
    );
  }

  const roles = await getCustomRoles();
  const filtered = roles.filter((r) => r.slug !== slug);
  await writeJson(CUSTOM_ROLES_KEY, filtered);

  // Also remove from role-permissions
  const perms = await getRolePermissions();
  const filteredPerms = perms.filter((rp) => rp.role !== slug);
  await writeJson(KEY, filteredPerms);
}

export async function getAllRoles(): Promise<
  { slug: string; name: string; isSystem: boolean }[]
> {
  const { getRoleLabel } = await import("./roles");
  const systemRoles = SYSTEM_ROLES.map((slug) => ({
    slug,
    name: getRoleLabel(slug),
    isSystem: true,
  }));
  const custom = await getCustomRoles();
  const customRoles = custom.map((r) => ({
    slug: r.slug,
    name: r.name,
    isSystem: false,
  }));
  return [...systemRoles, ...customRoles];
}
