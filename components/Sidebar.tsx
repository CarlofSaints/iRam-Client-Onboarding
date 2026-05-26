"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ROLE_LABELS } from "@/lib/roles";

interface SidebarProps {
  user: { name: string; role: string } | null;
  onLogout: () => void;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  route: string;
  icon: () => React.JSX.Element;
}

interface NavGroup {
  label: string;
  icon: () => React.JSX.Element;
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const NAV_ENTRIES: NavEntry[] = [
  { label: "Dashboard", route: "/", icon: DashboardIcon },
  { label: "New Client", route: "/onboarding/new", icon: PlusCircleIcon },
  { label: "Clients", route: "/clients", icon: UsersIcon },
  {
    label: "Control Centre",
    icon: SettingsIcon,
    children: [
      { label: "Channels", route: "/control-centre/channels", icon: ChannelIcon },
      { label: "Services", route: "/control-centre/services", icon: ServiceIcon },
      { label: "CAMs", route: "/control-centre/cams", icon: CamIcon },
      { label: "Users", route: "/control-centre/users", icon: UserCogIcon },
      { label: "Roles & Perms", route: "/control-centre/roles", icon: ShieldIcon },
      { label: "Legal Templates", route: "/control-centre/templates", icon: FileTextIcon },
      { label: "Checklist", route: "/control-centre/checklist", icon: ChecklistIcon },
    ],
  },
  { label: "Activity Log", route: "/activity-log", icon: ClockIcon },
  { label: "Account", route: "/account", icon: AccountIcon },
];

export default function Sidebar({ user, onLogout, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Check if any Control Centre child route is active
  const controlCentreGroup = NAV_ENTRIES.find(
    (e) => isGroup(e) && e.label === "Control Centre"
  ) as NavGroup | undefined;
  const isControlCentreChildActive = controlCentreGroup
    ? controlCentreGroup.children.some((child) => pathname === child.route)
    : false;

  const [controlCentreOpen, setControlCentreOpen] = useState(isControlCentreChildActive);

  // Auto-expand when a child route becomes active
  if (isControlCentreChildActive && !controlCentreOpen) {
    setControlCentreOpen(true);
  }

  const roleLabel = user?.role
    ? (ROLE_LABELS as Record<string, string>)[user.role] ?? user.role
    : "";

  return (
    <>
      {/* Mobile overlay handled by AppShell */}

      <aside className="flex flex-col h-full w-64 bg-white border-r border-gray-200">
        {/* Header: Logo + Title + mobile close */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
          <Image
            src="/iram-logo.png"
            alt="iRam"
            width={32}
            height={32}
            className="shrink-0"
          />
          <h1 className="text-sm font-bold text-[#3D6273] truncate flex-1">
            iRam Onboarding
          </h1>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <svg
                width="20"
                height="20"
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV_ENTRIES.map((entry) => {
            if (isGroup(entry)) {
              // Collapsible group
              return (
                <div key={entry.label}>
                  <button
                    onClick={() => setControlCentreOpen((prev) => !prev)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
                      isControlCentreChildActive
                        ? "text-[#7CC042] font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="shrink-0">{entry.icon()}</span>
                    <span className="flex-1 text-left truncate">{entry.label}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`shrink-0 transition-transform duration-200 ${
                        controlCentreOpen ? "rotate-90" : ""
                      }`}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>

                  {controlCentreOpen && (
                    <div className="ml-4 pl-3 border-l border-gray-200">
                      {entry.children.map((child) => {
                        const isActive = pathname === child.route;
                        return (
                          <Link
                            key={child.route}
                            href={child.route}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                              isActive
                                ? "bg-[#7CC042]/10 text-[#7CC042] font-semibold border-l-3 border-[#7CC042] -ml-[13px] pl-[22px]"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <span className="shrink-0">{child.icon()}</span>
                            <span className="truncate">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Regular nav item
            const isActive = pathname === entry.route;
            return (
              <Link
                key={entry.route}
                href={entry.route}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
                  isActive
                    ? "bg-[#7CC042]/10 text-[#7CC042] font-semibold border-l-3 border-[#7CC042]"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="shrink-0">{entry.icon()}</span>
                <span className="truncate">{entry.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-gray-200 px-4 py-3">
          {user && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-800 truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{roleLabel}</p>
              <button
                onClick={onLogout}
                className="mt-2 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 hover:underline transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          )}
          <p className="text-[10px] text-gray-400 text-center">
            Powered by{" "}
            <span className="font-semibold" style={{ color: "#3D6273" }}>
              OuterJoin
            </span>
          </p>
        </div>
      </aside>
    </>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function ChannelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ServiceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function CamIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function UserCogIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
