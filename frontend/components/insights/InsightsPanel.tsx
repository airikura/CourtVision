"use client";

import { useEffect, useRef, useState, FormEvent, KeyboardEvent } from "react";
import { useInsightsStore } from "@/store/insightsSlice";
import { usePlayerStore } from "@/store/playerSlice";
import { InsightFilters } from "./InsightFilters";
import { InsightCard } from "./InsightCard";
import { StreamingIndicator } from "./StreamingIndicator";
import { chatWithAnalysis } from "@/lib/api";

interface InsightsPanelProps {
  seekTo: (t: number) => void;
  sessionId: string;
  onRetry: () => void;
}

type Tab = "insights" | "ask";
type ChatMsg = { role: "user" | "assistant"; content: string };

export function InsightsPanel({ seekTo, sessionId, onRetry }: InsightsPanelProps) {
  const { filteredInsights, insights, streamStatus } = useInsightsStore();
  const activeInsightId = usePlayerStore((s) => s.activeInsightId);
  const activeCardRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<Tab>("insights");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const displayed = filteredInsights();
  const analysisReady = streamStatus === "done";

  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeInsightId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const MAX_MESSAGES = 20;
  const atLimit = messages.length >= MAX_MESSAGES;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading || atLimit) return;

    const userMsg: ChatMsg = { role: "user", content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setIsLoading(true);
    setChatError(null);

    try {
      const reply = await chatWithAnalysis(sessionId, text, messages);
      setMessages([...nextHistory, { role: "assistant", content: reply }]);
    } catch {
      setChatError("Failed to get a response. Please try again.");
      setMessages(nextHistory); // keep user message
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-700 shrink-0">
        <button
          onClick={() => setTab("insights")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            tab === "insights"
              ? "text-white border-b-2 border-green-400 -mb-px"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Insights
          {insights.length > 0 && (
            <span className="ml-1.5 text-gray-500 font-normal text-xs">
              ({insights.length})
            </span>
          )}
        </button>
        <button
          onClick={() => analysisReady && setTab("ask")}
          disabled={!analysisReady}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            tab === "ask"
              ? "text-white border-b-2 border-green-400 -mb-px"
              : analysisReady
              ? "text-gray-400 hover:text-gray-200"
              : "text-gray-600 cursor-not-allowed"
          }`}
        >
          Ask
          {!analysisReady && (
            <span className="ml-1 text-gray-600 text-xs">(after analysis)</span>
          )}
        </button>
      </div>

      {/* Insights tab */}
      {tab === "insights" && (
        <>
          <div className="flex items-center justify-end px-3 py-1.5 shrink-0">
            {streamStatus === "done" && (
              <span className="text-xs text-green-400">Analysis complete</span>
            )}
            {streamStatus === "error" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Analysis failed</span>
                <button
                  onClick={onRetry}
                  className="text-xs text-green-400 hover:text-green-300 underline underline-offset-2"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
          <InsightFilters />
          <div className="px-2 pb-1 shrink-0">
            <StreamingIndicator />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 p-2">
            {displayed.length === 0 && streamStatus === "idle" && (
              <p className="text-gray-500 text-sm text-center py-8">
                Insights will appear here as the AI analyzes your footage.
              </p>
            )}
            {displayed.map((insight) => (
              <div
                key={insight.id}
                ref={activeInsightId === insight.id ? activeCardRef : undefined}
              >
                <InsightCard insight={insight} seekTo={seekTo} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Ask tab */}
      {tab === "ask" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Message history */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-6">
                Ask anything about your footage, technique, or findings.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-green-700 text-white"
                      : "bg-gray-800 text-gray-200 border border-gray-700"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            {chatError && (
              <p className="text-xs text-red-400 text-center">{chatError}</p>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-700 p-2 shrink-0">
            {atLimit ? (
              <p className="text-xs text-gray-500 text-center py-2">
                Message limit reached (20 messages). Start a new session to continue.
              </p>
            ) : (
              <>
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask about your technique…"
                    rows={2}
                    className="flex-1 resize-none rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="shrink-0 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Send
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1 px-1">
                  Enter to send · Shift+Enter for newline · {MAX_MESSAGES - messages.length} messages remaining
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
