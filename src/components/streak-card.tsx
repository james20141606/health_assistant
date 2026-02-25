"use client";

import { useStreak, MILESTONES } from "@/lib/use-streak";

export function StreakCard() {
  const { currentStreak, longestStreak, totalDays, loggedToday, loading } = useStreak();

  if (loading) {
    return (
      <div className="card" style={{ marginBottom: "0.75rem" }}>
        <div className="skeleton" style={{ height: "4rem" }} />
      </div>
    );
  }

  // Find next milestone
  const nextMilestone = MILESTONES.find((m) => m.days > currentStreak);
  const progressPercent = nextMilestone
    ? Math.round((currentStreak / nextMilestone.days) * 100)
    : 100;

  return (
    <div className="card" style={{ marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "2rem" }}>🔥</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.375rem" }}>
            <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>
              {currentStreak}
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--muted)" }}>
              天连续打卡
            </span>
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.125rem" }}>
            最长 {longestStreak} 天 · 累计 {totalDays} 天
            {loggedToday && (
              <span style={{ color: "var(--success)", marginLeft: "0.5rem" }}>
                今日已打卡 ✓
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress to next milestone */}
      {nextMilestone && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
            <span>距离 {nextMilestone.icon} {nextMilestone.label} 目标</span>
            <span>{nextMilestone.days - currentStreak} 天</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* Badges */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {MILESTONES.map((m) => {
          const unlocked = currentStreak >= m.days || totalDays >= m.days;
          return (
            <div
              key={m.days}
              className={`badge ${unlocked ? "badge-unlocked" : "badge-locked"}`}
              title={`${m.label}${unlocked ? " (已解锁)" : ""}`}
            >
              {m.icon}
            </div>
          );
        })}
      </div>
    </div>
  );
}
