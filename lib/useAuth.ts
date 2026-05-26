"use client";

import { useState, useEffect, useCallback } from "react";
import type { SessionPayload, UserRole } from "./types";

interface AuthState {
  user: SessionPayload | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem("iram-onboarding-session");
    if (stored) {
      try {
        const user = JSON.parse(stored) as SessionPayload;
        setState({ user, loading: false });
      } catch {
        localStorage.removeItem("iram-onboarding-session");
        setState({ user: null, loading: false });
      }
    } else {
      setState({ user: null, loading: false });
    }
  }, []);

  const login = useCallback((user: SessionPayload) => {
    localStorage.setItem("iram-onboarding-session", JSON.stringify(user));
    setState({ user, loading: false });
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem("iram-onboarding-session");
    setState({ user: null, loading: false });
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      /* ignore */
    }
  }, []);

  const hasRole = useCallback(
    (minRole: UserRole): boolean => {
      if (!state.user) return false;
      const hierarchy: UserRole[] = [
        "super_admin",
        "admin",
        "cam",
        "sales_person",
      ];
      return hierarchy.indexOf(state.user.role) <= hierarchy.indexOf(minRole);
    },
    [state.user]
  );

  return {
    user: state.user,
    loading: state.loading,
    login,
    logout,
    hasRole,
    isAuthenticated: !!state.user,
  };
}

export async function authFetch(
  url: string,
  options: RequestInit & { rawBody?: boolean } = {}
): Promise<Response> {
  const { rawBody, ...fetchOptions } = options;
  const headers: Record<string, string> = {};
  if (!rawBody) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(url, {
    ...fetchOptions,
    credentials: "include",
    headers: {
      ...headers,
      ...(fetchOptions.headers as Record<string, string>),
    },
  });
}
