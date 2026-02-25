"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyDates, setHistoryDates] = useState<string[]>([]);
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load today's messages on mount
  const loadToday = useCallback(async () => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages?.length > 0) {
          setMessages(
            data.messages.map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
        }
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadHistoryDates() {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "history" }),
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryDates(data.dates || []);
      }
    } catch {
      // ignore
    }
  }

  async function loadDate(date: string) {
    setViewingDate(date);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load_date", date }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(
          (data.messages || []).map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
      }
    } catch {
      // ignore
    }
  }

  function backToToday() {
    setViewingDate(null);
    setShowHistory(false);
    setMessages([]);
    setLoading(true);
    loadToday();
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming || viewingDate) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages([
          ...newMessages,
          { role: "assistant", content: `错误: ${err.error || "请求失败"}` },
        ]);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: "assistant", content: fullText }]);
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "网络错误，请重试" },
      ]);
    }

    setStreaming(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="card" style={{ marginBottom: "0.75rem", padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "0.75rem 1rem 0.5rem", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "0.8rem", fontWeight: 600, margin: 0 }}>
            {viewingDate ? `${viewingDate} 对话记录` : "健康助手对话"}
          </h3>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            {viewingDate ? (
              <button
                className="btn btn-primary btn-sm"
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.6rem" }}
                onClick={backToToday}
              >
                返回今天
              </button>
            ) : (
              <>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ padding: "0.2rem 0.5rem", fontSize: "0.6rem" }}
                  onClick={() => {
                    setShowHistory(!showHistory);
                    if (!showHistory) loadHistoryDates();
                  }}
                >
                  {showHistory ? "关闭" : "历史"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* History date list */}
        {showHistory && !viewingDate && (
          <div style={{ marginTop: "0.5rem", maxHeight: "8rem", overflowY: "auto" }}>
            {historyDates.length === 0 ? (
              <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: "0.25rem 0" }}>
                暂无历史记录
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {historyDates.map((d) => (
                  <button
                    key={d}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: "0.65rem", padding: "0.2rem 0.5rem" }}
                    onClick={() => {
                      setShowHistory(false);
                      loadDate(d);
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages area */}
      <div
        style={{
          maxHeight: "24rem",
          overflowY: "auto",
          padding: "0.75rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.625rem",
        }}
      >
        {loading ? (
          <div style={{ padding: "1rem 0" }}>
            <div className="skeleton" style={{ height: "2rem", marginBottom: "0.5rem" }} />
            <div className="skeleton" style={{ height: "2rem", width: "70%" }} />
          </div>
        ) : messages.length === 0 && !viewingDate ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>💬</div>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0 }}>
              问我任何健康问题，对话会自动保存
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.375rem",
                justifyContent: "center",
                marginTop: "0.75rem",
              }}
            >
              {["我最近胃酸怎么样？", "帮我分析睡眠趋势", "伏诺拉生能长期吃吗？"].map((q) => (
                <button
                  key={q}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: "0.65rem", padding: "0.25rem 0.5rem" }}
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : messages.length === 0 && viewingDate ? (
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", padding: "1rem 0" }}>
            该日无对话记录
          </p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "0.5rem 0.75rem",
                  borderRadius:
                    msg.role === "user"
                      ? "0.875rem 0.875rem 0.25rem 0.875rem"
                      : "0.875rem 0.875rem 0.875rem 0.25rem",
                  background: msg.role === "user" ? "var(--primary)" : "var(--bg)",
                  color: msg.role === "user" ? "var(--primary-fg)" : "var(--fg)",
                  fontSize: "0.8rem",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content || (streaming && i === messages.length - 1 ? "..." : "")}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input - only show for today */}
      {!viewingDate && (
        <div
          style={{
            padding: "0.625rem 0.75rem",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: "0.5rem",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题..."
            disabled={streaming}
            style={{ flex: 1, borderRadius: "1.5rem", padding: "0.5rem 0.875rem" }}
          />
          <button
            className="btn btn-primary"
            onClick={send}
            disabled={streaming || !input.trim()}
            style={{
              borderRadius: "50%",
              width: "2.25rem",
              height: "2.25rem",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
