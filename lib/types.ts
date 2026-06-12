/* ──────────────────────────────────────────────────────────────
   iRam Client Onboarding — Shared Types
   ────────────────────────────────────────────────────────────── */

// ── Roles ──

export type UserRole = "super_admin" | "admin" | "cam" | "sales_person" | (string & {});

export const SYSTEM_ROLES = ["super_admin", "admin", "cam", "sales_person"] as const;

export const ROLE_HIERARCHY: string[] = [
  "super_admin",
  "admin",
  "cam",
  "sales_person",
];

export interface CustomRole {
  slug: string;
  name: string;
  createdAt: string; // ISO
}

// ── Permissions ──

export type PermissionKey =
  | "manage_users"
  | "manage_roles"
  | "manage_channels"
  | "manage_services"
  | "manage_cams"
  | "manage_templates"
  | "manage_checklist"
  | "view_dashboard"
  | "view_clients"
  | "create_clients"
  | "edit_clients"
  | "view_activity_log"
  | "export_data";

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  category: "admin" | "view" | "data";
}

export interface RolePermissions {
  role: string;
  permissions: PermissionKey[];
}

// ── Users ──

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // bcrypt hash
  role: string;
  forcePasswordChange: boolean;
  active: boolean;
  createdAt: string; // ISO
  lastLoginAt?: string; // ISO
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  forcePasswordChange?: boolean;
}

// ── Password Reset ──

export interface PasswordResetToken {
  token: string;
  email: string;
  expiresAt: string; // ISO
  used: boolean;
}

// ── Channels ──

export interface Channel {
  id: string;
  name: string;
  active: boolean;
  createdAt: string; // ISO
}

// ── Services ──

export interface Service {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string; // ISO
}

// ── CAMs ──

export interface CAM {
  id: string;
  name: string;
  surname: string;
  email: string;
  cell: string;
  active: boolean;
  createdAt: string; // ISO
  userId?: string; // linked system user ID (auto-created)
}

// ── Legal Templates ──

export interface LegalTemplate {
  id: string;
  name: string;
  category: "NDA" | "Mandate" | "SLA" | "Contract" | "Other";
  description?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string; // ISO
}

// ── Checklist ──

export interface ChecklistItemDef {
  id: string;
  label: string;
  description?: string;
  section: string;
  type: "checkbox" | "upload" | "date" | "text";
  step?: number;
  dynamic?: boolean;
  optional?: boolean;
  active: boolean;
  createdAt: string; // ISO
}

export interface ChecklistItemState {
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  value?: string;
  fileUrl?: string;
}

// ── Clients ──

export interface Client {
  id: string;
  name: string;
  logoBase64?: string;
  website?: string;
  camId?: string; // Deprecated — kept for backward compat
  camEmail?: string; // Deprecated — kept for backward compat
  channelCams?: Record<string, string>; // channelId → camId (per-channel CAM)
  channelIds: string[];
  channelServices: Record<string, string[]>; // channelId → serviceId[]
  contactName: string;
  emails: string[];
  startDate: string;
  status: "intake" | "active" | "live";
  checklist: Record<string, ChecklistItemState>;
  createdAt: string; // ISO
  // Commission
  commissionMechanism?: "sell_in" | "sell_out" | "combination";
  commissionSellInPct?: number;
  commissionSellOutPct?: number;
  // Infrastructure provisioning status
  sharepointStatus?: "pending" | "done" | "error";
  sharepointError?: string;
  teamsStatus?: "pending" | "done" | "error";
  dropboxStatus?: "pending" | "done" | "error";
  dropboxError?: string;
}

// ── Activity Log ──

export interface LogEntry {
  id: string;
  timestamp: string; // ISO
  userId: string;
  userName: string;
  action: string;
  details?: string;
  status?: "success" | "error";
}
