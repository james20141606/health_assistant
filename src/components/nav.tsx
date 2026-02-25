"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/log", label: "打卡", icon: "✏️" },
  { href: "/history", label: "历史", icon: "📋" },
  { href: "/insights", label: "分析", icon: "📊" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--card)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-around",
        padding: "0.5rem 0 env(safe-area-inset-bottom, 0.5rem)",
        zIndex: 50,
      }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.125rem",
              padding: "0.25rem 1rem",
              fontSize: "0.7rem",
              fontWeight: active ? 700 : 400,
              color: active ? "var(--primary)" : "var(--muted)",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
