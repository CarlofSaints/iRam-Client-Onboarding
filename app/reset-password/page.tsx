"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!token) {
      setError("Invalid reset link. No token provided.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Reset failed");
        setLoading(false);
        return;
      }

      // Redirect to login with success message
      router.push("/login?reset=success");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="rounded-t-xl bg-[var(--color-primary)] px-8 py-6 text-center">
        <h1 className="text-xl font-bold text-white">Reset Password</h1>
        <p className="mt-1 text-sm text-white/80">
          iRam Client Onboarding
        </p>
      </div>

      {/* Card */}
      <div className="rounded-b-xl border border-t-0 border-[var(--color-border)] bg-white px-8 py-8">
        <p className="mb-5 text-sm text-[var(--color-text-muted)]">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block text-sm font-medium text-[var(--color-text)]"
            >
              New Password
            </label>
            <PasswordInput
              id="new-password"
              name="new-password"
              value={password}
              onChange={setPassword}
              placeholder="Enter new password"
              required
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-sm font-medium text-[var(--color-text)]"
            >
              Confirm Password
            </label>
            <PasswordInput
              id="confirm-password"
              name="confirm-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            Back to login
          </a>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
        Powered by OuterJoin
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50">
      <Suspense
        fallback={
          <div className="text-sm text-[var(--color-text-muted)]">
            Loading...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
