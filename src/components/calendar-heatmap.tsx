"use client";

import { useState } from "react";
import { DailyLog } from "@/types/database";
import { useRouter } from "next/navigation";

type Metric = "reflux" | "stress" | "breathless" | "sleep";

const metricConfig: Record<Metric, { label: string; getVal: (l: DailyLog) => number; invert?: boolean }> = {
  reflux: { label: "胃酸", getVal: (l) => l.reflux },
  stress: { label: "压力", getVal: (l) => l.stress },
  breathless: { label: "胸闷", getVal: (l) => l.breathless },
  sleep: { label: "睡眠", getVal: (l) => l.sleep_hours || 0, invert: true },
};

function getHeatColor(value: number, max: number, invert: boolean): string {
  if (max === 0) return "var(--heatmap-0)";
  const ratio = value / max;
  const level = Math.min(5, Math.ceil(ratio * 5));

  if (invert) {
    // Sleep: higher is better (green)
    const greenLevels = [
      "var(--heatmap-0)",
      "var(--heatmap-green-1)",
      "var(--heatmap-green-2)",
      "var(--heatmap-green-3)",
      "var(--heatmap-green-4)",
      "var(--heatmap-green-5)",
    ];
    return greenLevels[level];
  }

  // Higher is worse (orange/red)
  const heatLevels = [
    "var(--heatmap-0)",
    "var(--heatmap-1)",
    "var(--heatmap-2)",
    "var(--heatmap-3)",
    "var(--heatmap-4)",
    "var(--heatmap-5)",
  ];
  return heatLevels[level];
}

interface CalendarHeatmapProps {
  logs: DailyLog[];
  month: string; // YYYY-MM
}

export function CalendarHeatmap({ logs, month }: CalendarHeatmapProps) {
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>("reflux");
  const [selectedDay, setSelectedDay] = useState<DailyLog | null>(null);

  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const firstDayOfWeek = new Date(year, mon - 1, 1).getDay(); // 0=Sun

  const config = metricConfig[metric];
  const maxVal = metric === "sleep" ? 12 : 10;

  // Build log lookup
  const logMap = new Map<string, DailyLog>();
  for (const log of logs) {
    logMap.set(log.date, log);
  }

  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

  const cells: (number | null)[] = [];
  // Pad leading empty cells
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  return (
    <div className="card" style={{ marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ fontSize: "0.8rem", fontWeight: 600, margin: 0 }}>
          日历热力图
        </h3>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {(Object.keys(metricConfig) as Metric[]).map((m) => (
            <button
              key={m}
              className={`btn btn-sm ${metric === m ? "btn-primary" : "btn-outline"}`}
              style={{ padding: "0.25rem 0.5rem", fontSize: "0.65rem" }}
              onClick={() => setMetric(m)}
            >
              {metricConfig[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* Weekday headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.25rem", marginBottom: "0.25rem" }}>
        {weekdays.map((wd) => (
          <div key={wd} style={{ textAlign: "center", fontSize: "0.6rem", color: "var(--muted)", fontWeight: 500 }}>
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.25rem" }}>
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }
          const dateStr = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const log = logMap.get(dateStr);
          const value = log ? config.getVal(log) : 0;
          const hasData = !!log;
          const color = hasData ? getHeatColor(value, maxVal, !!config.invert) : "var(--heatmap-0)";

          return (
            <div
              key={dateStr}
              className="heatmap-cell"
              style={{
                background: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.6rem",
                color: hasData ? "var(--fg)" : "var(--muted)",
                opacity: hasData ? 1 : 0.4,
                position: "relative",
              }}
              onClick={() => {
                if (log) setSelectedDay(selectedDay?.date === dateStr ? null : log);
              }}
              title={hasData ? `${config.label}: ${value}` : "无数据"}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", marginTop: "0.5rem", fontSize: "0.6rem", color: "var(--muted)" }}>
        <span>{config.invert ? "少" : "低"}</span>
        {[0, 1, 2, 3, 4, 5].map((level) => {
          const varPrefix = config.invert ? "--heatmap-green-" : "--heatmap-";
          const varName = level === 0 ? "--heatmap-0" : `${varPrefix}${level}`;
          return (
            <div
              key={level}
              style={{
                width: "0.875rem",
                height: "0.875rem",
                borderRadius: "0.15rem",
                background: `var(${varName})`,
              }}
            />
          );
        })}
        <span>{config.invert ? "多" : "高"}</span>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem",
            background: "var(--bg)",
            borderRadius: "0.75rem",
            fontSize: "0.75rem",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "0.375rem" }}>
            {selectedDay.date}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", color: "var(--muted)" }}>
            {selectedDay.sleep_hours != null && <span>睡眠 {selectedDay.sleep_hours}h</span>}
            <span>压力 {selectedDay.stress}</span>
            <span>胃酸 {selectedDay.reflux}</span>
            {selectedDay.breathless > 0 && <span>胸闷 {selectedDay.breathless}</span>}
          </div>
          <button
            className="btn btn-outline btn-sm"
            style={{ marginTop: "0.5rem" }}
            onClick={() => router.push(`/log?date=${selectedDay.date}`)}
          >
            编辑此日
          </button>
        </div>
      )}
    </div>
  );
}
