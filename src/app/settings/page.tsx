"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import { useTheme } from "@/components/theme-provider";
import { BottomNav } from "@/components/nav";

type ThemeOption = "light" | "dark" | "system";

const themeOptions: { value: ThemeOption; label: string; icon: string }[] = [
  { value: "light", label: "浅色", icon: "☀️" },
  { value: "dark", label: "深色", icon: "🌙" },
  { value: "system", label: "跟随系统", icon: "💻" },
];

export default function SettingsPage() {
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setEmail(user.email || "");
    });
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <div className="page-enter" style={{ padding: "1rem", paddingBottom: "5rem", maxWidth: "500px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem", letterSpacing: "-0.02em" }}>
        设置
      </h1>

      {/* Profile card */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
          账户信息
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "1.25rem",
              fontWeight: 700,
            }}
          >
            {email ? email[0].toUpperCase() : "?"}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
              {email ? email.split("@")[0] : "未登录"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{email}</div>
          </div>
        </div>
      </div>

      {/* Theme selection */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
          外观主题
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {themeOptions.map((opt) => (
            <div
              key={opt.value}
              className={`setting-option ${theme === opt.value ? "active" : ""}`}
              onClick={() => setTheme(opt.value)}
            >
              <span style={{ fontSize: "1.25rem" }}>{opt.icon}</span>
              <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>{opt.label}</span>
              {theme === opt.value && (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginLeft: "auto" }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
          关于
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
          Health Tracker v2.0
          <br />
          个人健康日志 & AI 分析助手
        </div>
      </div>

      {/* Logout */}
      <button
        className="btn btn-danger"
        style={{ width: "100%", padding: "0.875rem", fontSize: "0.95rem", borderRadius: "0.875rem" }}
        onClick={handleLogout}
      >
        退出登录
      </button>

      <BottomNav />
    </div>
  );
}
