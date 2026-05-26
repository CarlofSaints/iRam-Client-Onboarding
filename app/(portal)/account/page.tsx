"use client";

import { useState, useRef, FormEvent } from "react";
import { useAuth, authFetch } from "@/lib/useAuth";
import PasswordInput from "@/components/PasswordInput";
import { getRoleLabel } from "@/lib/roles";

export default function AccountPage() {
  const { user, login } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const redirecting = useRef(false);

  const isForced = !!user?.forcePasswordChange;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      // Capture forced state before login() flips it
      const wasForced = isForced;

      const res = await authFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to change password.");
        setSaving(false);
        return;
      }

      // Update session in localStorage to clear forcePasswordChange
      if (user) {
        login({
          ...user,
          forcePasswordChange: false,
        });
      }

      setSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // If this was a forced password change, redirect after a brief delay
      if (wasForced && !redirecting.current) {
        redirecting.current = true;
        setTimeout(() => {
          // Full page reload so AppShell re-reads updated localStorage
          window.location.href = "/";
        }, 2000);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#3D6273]">Account</h1>
        <div className="h-1 w-16 bg-[#7CC042] rounded mt-2" />
      </div>

      {/* Forced password change alert */}
      {isForced && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <svg
            className="shrink-0 mt-0.5 text-amber-600"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              You must change your password before continuing
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Please set a new password below to access the rest of the portal.
            </p>
          </div>
        </div>
      )}

      {/* User info card */}
      {user && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-0.5">Name</p>
              <p className="font-medium text-gray-800">{user.name}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Email</p>
              <p className="font-medium text-gray-800">{user.email}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Role</p>
              <p className="font-medium text-gray-800">
                {getRoleLabel(user.role)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Change password form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Change Password
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
              {redirecting.current && (
                <span className="block mt-1 text-xs text-green-600">
                  Redirecting to dashboard...
                </span>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="currentPassword"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Current Password
            </label>
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter current password"
              required
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              New Password
            </label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="At least 6 characters"
              required
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Confirm New Password
            </label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-[#7CC042] hover:bg-[#5ea32e] text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
