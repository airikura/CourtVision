"use client";

import { useUploadStore } from "@/store/uploadSlice";
import { DropZone } from "@/components/upload/DropZone";
import { CompressionProgress } from "@/components/upload/CompressionProgress";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { NavBar } from "@/components/layout/NavBar";

function UploadContent() {
  const { error } = useUploadStore();

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      <NavBar />
      <main className="flex flex-col items-center justify-center flex-1 px-4 py-12">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="text-green-400">Court</span>Vision
            </h1>
            <p className="text-gray-400">
              AI-powered tennis analysis. Upload your footage to begin.
            </p>
          </div>

          <DropZone />
          <CompressionProgress />
          <UploadProgress />

          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-700 px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <p className="text-center text-xs text-gray-600">
            On the analysis page: J/K/L to scrub · F for footwork · S for serve
          </p>
        </div>
      </main>
    </div>
  );
}

export default function UploadPage() {
  return (
    <AuthGuard>
      <UploadContent />
    </AuthGuard>
  );
}
