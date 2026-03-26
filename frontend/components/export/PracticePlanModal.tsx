"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useInsightsStore } from "@/store/insightsSlice";
import { generatePracticePlan } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface PracticePlanModalProps {
  sessionId: string;
  onClose: () => void;
}

type Tab = "drill" | "cues" | "drills";

const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-white mt-4 mb-3">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-green-400 mt-5 mb-2 uppercase tracking-wide">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-gray-300 mt-3 mb-1">{children}</h3>
  ),
  ul: ({ children }) => <ul className="space-y-2 mb-3">{children}</ul>,
  ol: ({ children }) => <ol className="space-y-2 mb-3 list-decimal list-inside">{children}</ol>,
  li: ({ children }) => {
    const text =
      typeof children === "string"
        ? children
        : Array.isArray(children)
        ? children.join("")
        : "";
    const match = text.match(/^\[(High|Medium|Low)\]\s*/i);
    const severityColors: Record<string, string> = {
      High: "bg-red-500/20 text-red-400 border border-red-500/40",
      Medium: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",
      Low: "bg-blue-500/20 text-blue-400 border border-blue-500/40",
    };
    const severity = match?.[1];
    const rest = severity ? text.slice(match![0].length) : text;
    return (
      <li className="flex items-start gap-2 text-sm text-gray-200 leading-relaxed">
        {severity ? (
          <span className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${severityColors[severity]}`}>
            {severity}
          </span>
        ) : (
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
        )}
        <span>{rest || children}</span>
      </li>
    );
  },
  p: ({ children }) => (
    <p className="text-sm text-gray-300 mb-2 leading-relaxed">{children}</p>
  ),
  hr: () => <hr className="border-gray-700 my-4" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
};

export function PracticePlanModal({ sessionId, onClose }: PracticePlanModalProps) {
  const insights = useInsightsStore((s) => s.insights);
  const [plan, setPlan] = useState<{ markdown: string; cues_markdown: string; drills_markdown: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>("drill");

  const generate = async () => {
    setLoading(true);
    try {
      const result = await generatePracticePlan(sessionId);
      setPlan(result);
    } finally {
      setLoading(false);
    }
  };

  const activeContent =
    tab === "drill" ? plan?.markdown :
    tab === "cues" ? plan?.cues_markdown :
    plan?.drills_markdown;

  const copyToClipboard = async () => {
    if (!activeContent) return;
    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    if (!activeContent) return;
    const blob = new Blob([activeContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tab === "drill" ? "issues.md" : tab === "cues" ? "match-cues.md" : "drills.md";
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

        {/* Tabs — only shown once content is loaded */}
        {plan && (
          <div className="flex border-b border-gray-700 px-5">
            <button
              onClick={() => setTab("drill")}
              className={`py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                tab === "drill"
                  ? "border-green-400 text-green-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              Drill Plan
            </button>
            <button
              onClick={() => setTab("cues")}
              className={`py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                tab === "cues"
                  ? "border-green-400 text-green-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              Match Cues
            </button>
            <button
              onClick={() => setTab("drills")}
              className={`py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                tab === "drills"
                  ? "border-green-400 text-green-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              Drills
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {!plan && !loading && (
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

          {plan && tab === "cues" && (
            <p className="text-xs text-gray-500 mb-4">
              Short reminders to keep in mind between points — not technical drills.
            </p>
          )}
          {plan && tab === "drills" && (
            <p className="text-xs text-gray-500 mb-4">
              Targeted exercises to work on in your next training session, on and off the court.
            </p>
          )}

          {activeContent && (
            <ReactMarkdown components={mdComponents}>{activeContent}</ReactMarkdown>
          )}
        </div>

        {/* Footer */}
        {plan && (
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
