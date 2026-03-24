"use client";

import { useState } from "react";
import { useInsightsStore } from "@/store/insightsSlice";
import { generatePracticePlan } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface PracticePlanModalProps {
  sessionId: string;
  onClose: () => void;
}

export function PracticePlanModal({ sessionId, onClose }: PracticePlanModalProps) {
  const insights = useInsightsStore((s) => s.insights);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const md = await generatePracticePlan(sessionId);
      setMarkdown(md);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "practice-plan.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Practice Plan</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {!markdown && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">
                Generate a practice checklist from all {insights.length}{" "}
                insights in this session.
              </p>
              <Button onClick={generate}>Generate Practice Plan</Button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-8 h-8 text-green-400" />
            </div>
          )}

          {markdown && (
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-200 leading-relaxed">
              {markdown}
            </pre>
          )}
        </div>

        {/* Footer */}
        {markdown && (
          <div className="flex gap-3 px-5 py-4 border-t border-gray-700">
            <Button onClick={copyToClipboard} variant="secondary">
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
            <Button onClick={download} variant="secondary">
              Download .md
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
