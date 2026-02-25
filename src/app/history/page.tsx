"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-client";
import { BottomNav } from "@/components/nav";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { DailyLog } from "@/types/database";
import { formatDate, triggerLabel } from "@/lib/helpers";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const supabase = createClient();
  const router = useRouter();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const startDate = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const endDate = new Date(y, m, 0).toISOString().slice(0, 10);

    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    setLogs((data as DailyLog[]) || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCSV() {
    if (logs.length === 0) return;
    const headers = [
      "date",
      "sleep_start",
      "sleep_end",
      "sleep_hours",
      "stress",
      "reflux",
      "breathless",
      "milk_tea",
      "coffee",
      "spicy",
      "late_meal",
      "alcohol",
      "omeprazole_mg",
      "famotidine_mg",
      "workout_type",
      "workout_minutes",
      "workout_rpe",
      "weight_kg",
      "notes",
    ];
    const rows = logs.map((l) => [
      l.date,
      l.sleep_start || "",
      l.sleep_end || "",
      l.sleep_hours ?? "",
      l.stress,
      l.reflux,
      l.breathless,
      l.triggers?.milk_tea ? 1 : 0,
      l.triggers?.coffee ? 1 : 0,
      l.triggers?.spicy ? 1 : 0,
      l.triggers?.late_meal ? 1 : 0,
      l.triggers?.alcohol ? 1 : 0,
      l.meds?.omeprazole_mg ?? 0,
      l.meds?.famotidine_mg ?? 0,
      l.workout?.type || "",
      l.workout?.minutes ?? 0,
      l.workout?.rpe ?? 0,
      l.weight_kg ?? "",
      l.notes || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `health_log_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    if (logs.length === 0) return;
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `health_log_${month}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteLog(id: string) {
    if (!confirm("确认删除？")) return;
    await supabase.from("daily_logs").delete().eq("id", id);
    setLogs(logs.filter((l) => l.id !== id));
  }

  const activeTriggers = (log: DailyLog) => {
    if (!log.triggers) return [];
    return Object.entries(log.triggers)
      .filter(([, v]) => v)
      .map(([k]) => triggerLabel(k));
  };

  return (
    <div className="page-enter" style={{ padding: "1rem", paddingBottom: "5rem", maxWidth: "500px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
        历史记录
      </h1>

      {/* Month picker + export */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <input
          type="month"
          className="input"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn btn-outline btn-sm" onClick={exportCSV}>
          CSV
        </button>
        <button className="btn btn-outline btn-sm" onClick={exportJSON}>
          JSON
        </button>
      </div>

      {/* Calendar Heatmap */}
      {!loading && logs.length > 0 && (
        <CalendarHeatmap logs={logs} month={month} />
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton" style={{ height: "3rem" }} />
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
          本月无记录
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {logs.map((log) => (
            <div key={log.id} className="card" style={{ padding: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.375rem" }}>
                    {formatDate(log.date)}
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "var(--muted)", flexWrap: "wrap" }}>
                    {log.sleep_hours != null && (
                      <span style={{ color: log.sleep_hours < 6 ? "var(--danger)" : undefined }}>
                        睡{log.sleep_hours}h
                      </span>
                    )}
                    <span style={{ color: log.stress >= 7 ? "var(--danger)" : undefined }}>
                      压力{log.stress}
                    </span>
                    <span style={{ color: log.reflux >= 7 ? "var(--danger)" : undefined }}>
                      胃酸{log.reflux}
                    </span>
                    {log.breathless > 0 && <span>胸闷{log.breathless}</span>}
                    {log.workout?.type && (
                      <span>
                        {log.workout.type} {log.workout.minutes}min
                      </span>
                    )}
                  </div>
                  {activeTriggers(log).length > 0 && (
                    <div style={{ fontSize: "0.7rem", color: "var(--warning)", marginTop: "0.25rem" }}>
                      {activeTriggers(log).join(" · ")}
                    </div>
                  )}
                  {log.notes && (
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.25rem", fontStyle: "italic" }}>
                      {log.notes}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.25rem", marginLeft: "0.5rem", flexShrink: 0 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => router.push(`/log?date=${log.date}`)}
                  >
                    编辑
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: "transparent", color: "var(--danger)", padding: "0.375rem" }}
                    onClick={() => deleteLog(log.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
          共 {logs.length} 条记录
        </span>
      </div>

      <BottomNav />
    </div>
  );
}
