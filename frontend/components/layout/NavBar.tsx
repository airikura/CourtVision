"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authSlice";

export function NavBar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="border-b border-gray-800 bg-gray-950 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/library" className="text-white font-semibold tracking-tight hover:text-gray-300">
          CourtVision
        </Link>
        <nav className="flex items-center gap-4 text-sm text-gray-400">
          <Link href="/library" className="hover:text-white transition-colors">
            Library
          </Link>
          <Link href="/upload" className="hover:text-white transition-colors">
            Upload
          </Link>
        </nav>
      </div>

      {user && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-400">{user.display_name}</span>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
