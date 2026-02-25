"use client";

import { useEffect, useState } from "react";

interface TipData {
  tip_title: string;
  tip_text: string;
  tip_category: string;
}

const categoryConfig: Record<string, { icon: string; color: string }> = {
  sleep: { icon: "🌙", color: "#818cf8" },
  diet: { icon: "🥗", color: "#34d399" },
  exercise: { icon: "🏃", color: "#fb923c" },
  stress: { icon: "🧘", color: "#a78bfa" },
  general: { icon: "💡", color: "#fbbf24" },
};

export function DailyTipCard() {
  const [tip, setTip] = useState<TipData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/daily-tip")
      .then((r) => r.json())
      .then((data) => {
        setTip(data);
        setLoading(false);
      })
      .catch(() => {
        setTip({
          tip_title: "保持好心情",
          tip_text: "今天也要好好照顾自己哦",
          tip_category: "general",
        });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="tip-card" style={{ marginBottom: "0.75rem" }}>
        <div className="skeleton" style={{ height: "1rem", width: "40%", marginBottom: "0.5rem" }} />
        <div className="skeleton" style={{ height: "0.875rem", width: "80%" }} />
      </div>
    );
  }

  if (!tip) return null;

  const config = categoryConfig[tip.tip_category] || categoryConfig.general;

  return (
    <div
      className="tip-card"
      style={{
        marginBottom: "0.75rem",
        borderLeftColor: config.color,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "1.125rem" }}>{config.icon}</span>
        <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{tip.tip_title}</span>
      </div>
      <div style={{ fontSize: "0.825rem", color: "var(--muted)", lineHeight: 1.5, paddingLeft: "1.625rem" }}>
        {tip.tip_text}
      </div>
    </div>
  );
}
