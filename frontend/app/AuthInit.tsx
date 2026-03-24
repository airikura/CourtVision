"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authSlice";
import { getMe } from "@/lib/api";

/**
 * Runs once on app mount: reads token from localStorage, validates with backend,
 * and populates the auth store. AuthGuard waits for isLoading=false before rendering.
 */
export function AuthInit() {
  const { loadFromStorage, setAuth, logout } = useAuthStore();

  useEffect(() => {
    const token = loadFromStorage();
    if (!token) return;

    getMe(token)
      .then((user) => setAuth(user, token))
      .catch(() => logout());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
