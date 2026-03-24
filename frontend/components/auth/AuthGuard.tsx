"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authSlice";
import { getMe } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading, setAuth, logout, loadFromStorage } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const storedToken = loadFromStorage();
    if (!storedToken) {
      router.replace("/login");
      return;
    }
    if (user) return; // already loaded

    getMe(storedToken)
      .then((u) => setAuth(u, storedToken))
      .catch(() => {
        logout();
        router.replace("/login");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Spinner className="h-8 w-8 text-indigo-400" />
      </div>
    );
  }

  return <>{children}</>;
}
