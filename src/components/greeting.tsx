"use client";

import { useEffect, useState } from "react";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "夜深了";
  if (h < 12) return "早上好";
  if (h < 18) return "下午好";
  return "晚上好";
}

function getEmoji(): string {
  const h = new Date().getHours();
  if (h < 6) return "🌙";
  if (h < 12) return "🌅";
  if (h < 18) return "☀️";
  return "🌆";
}

export function Greeting({ email }: { email: string }) {
  const [greeting, setGreeting] = useState("你好");
  const [emoji, setEmoji] = useState("👋");

  useEffect(() => {
    setGreeting(getGreeting());
    setEmoji(getEmoji());
  }, []);

  const name = email ? email.split("@")[0] : "";

  return (
    <div style={{ marginBottom: "1rem" }}>
      <div className="greeting">
        {emoji} {greeting}
        {name && <span style={{ color: "var(--primary)" }}>，{name}</span>}
      </div>
      <div className="greeting-sub">记录今天的健康状态吧</div>
    </div>
  );
}
