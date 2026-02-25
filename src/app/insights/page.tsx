"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-client";
import { BottomNav } from "@/components/nav";
import { DailyLog, AiInsight, Triggers } from "@/types/database";
import { triggerLabel } from "@/lib/helpers";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

type Range = 7 | 30;

export default function InsightsPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [range, setRange] = useState<Range>(7);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [prevLogs, setPrevLogs] = useState<DailyLog[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);

    const { data: logsData } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate.toISOString().slice(0, 10))
      .order("date", { ascending: true });

    setLogs((logsData as DailyLog[]) || []);

    // Load previous period for comparison
    const prevStart = new Date();
    prevStart.setDate(prevStart.getDate() - range * 2);
    const prevEnd = new Date();
    prevEnd.setDate(prevEnd.getDate() - range);

    const { data: prevData } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", prevStart.toISOString().slice(0, 10))
      .lt("date", prevEnd.toISOString().slice(0, 10))
      .order("date", { ascending: true });

    setPrevLogs((prevData as DailyLog[]) || []);

    // Load latest insight
    const { data: insightData } = await supabase
      .from("ai_insights")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    setInsight((insightData as AiInsight) || null);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setInsight(data.insight);
      } else {
        const err = await res.json();
        alert(err.error || "分析失败");
      }
    } catch {
      alert("网络错误");
    }
    setAnalyzing(false);
  }

  // Chart data
  const chartData = logs.map((l) => ({
    date: l.date.slice(5), // MM-DD
    sleep: l.sleep_hours || 0,
    stress: l.stress,
    reflux: l.reflux,
    workout: l.workout?.minutes || 0,
  }));

  // Trigger stats
  const triggerKeys: (keyof Triggers)[] = [
    "milk_tea",
    "coffee",
    "spicy",
    "late_meal",
    "alcohol",
  ];
  const triggerStats = triggerKeys.map((key) => {
    const withTrigger = logs.filter((l) => l.triggers?.[key]);
    const withoutTrigger = logs.filter((l) => !l.triggers?.[key]);
    const avgWith =
      withTrigger.length > 0
        ? withTrigger.reduce((s, l) => s + l.reflux, 0) / withTrigger.length
        : 0;
    const avgWithout =
      withoutTrigger.length > 0
        ? withoutTrigger.reduce((s, l) => s + l.reflux, 0) / withoutTrigger.length
        : 0;
    return {
      name: triggerLabel(key),
      count: withTrigger.length,
      avgReflux: Math.round(avgWith * 10) / 10,
      avgRefluxWithout: Math.round(avgWithout * 10) / 10,
    };
  });

  // Summary stats with comparison
  function avg(arr: DailyLog[], fn: (l: DailyLog) => number): number {
    if (arr.length === 0) return 0;
    return Math.round((arr.reduce((s, l) => s + fn(l), 0) / arr.length) * 10) / 10;
  }

  const avgSleep = avg(logs, (l) => l.sleep_hours || 0);
  const avgStress = avg(logs, (l) => l.stress);
  const avgReflux = avg(logs, (l) => l.reflux);
  const totalWorkout = logs.reduce((s, l) => s + (l.workout?.minutes || 0), 0);

  const prevAvgSleep = avg(prevLogs, (l) => l.sleep_hours || 0);
  const prevAvgStress = avg(prevLogs, (l) => l.stress);
  const prevAvgReflux = avg(prevLogs, (l) => l.reflux);
  const prevTotalWorkout = prevLogs.reduce((s, l) => s + (l.workout?.minutes || 0), 0);

  function trendArrow(current: number, prev: number, lowerIsBetter: boolean): string {
    if (prev === 0) return "";
    const diff = current - prev;
    if (Math.abs(diff) < 0.3) return "";
    const isUp = diff > 0;
    const isGood = lowerIsBetter ? !isUp : isUp;
    return isGood ? " ↑" : " ↓";
  }

  function trendColor(current: number, prev: number, lowerIsBetter: boolean): string {
    if (prev === 0) return "var(--muted)";
    const diff = current - prev;
    if (Math.abs(diff) < 0.3) return "var(--muted)";
    const isUp = diff > 0;
    const isGood = lowerIsBetter ? !isUp : isUp;
    return isGood ? "var(--success)" : "var(--danger)";
  }

  const parsed = insight?.output_structured;

  return (
    <div className="page-enter" style={{ padding: "1rem", paddingBottom: "5rem", maxWidth: "500px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
        数据分析
      </h1>

      {/* Range toggle */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {([7, 30] as Range[]).map((r) => (
          <button
            key={r}
            className={`btn btn-sm ${range === r ? "btn-primary" : "btn-outline"}`}
            onClick={() => setRange(r)}
          >
            {r}天
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton" style={{ height: "4rem" }} />
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>
          暂无数据，先去打卡吧
        </p>
      ) : (
        <>
          {/* Summary with trends */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            {[
              {
                label: "睡眠",
                value: `${avgSleep}h`,
                color: avgSleep < 7 ? "var(--warning)" : "var(--success)",
                trend: trendArrow(avgSleep, prevAvgSleep, false),
                trendColor: trendColor(avgSleep, prevAvgSleep, false),
              },
              {
                label: "压力",
                value: String(avgStress),
                color: avgStress >= 7 ? "var(--danger)" : "var(--fg)",
                trend: trendArrow(avgStress, prevAvgStress, true),
                trendColor: trendColor(avgStress, prevAvgStress, true),
              },
              {
                label: "胃酸",
                value: String(avgReflux),
                color: avgReflux >= 5 ? "var(--danger)" : "var(--fg)",
                trend: trendArrow(avgReflux, prevAvgReflux, true),
                trendColor: trendColor(avgReflux, prevAvgReflux, true),
              },
              {
                label: "运动",
                value: `${totalWorkout}m`,
                color: "var(--fg)",
                trend: trendArrow(totalWorkout, prevTotalWorkout, false),
                trendColor: trendColor(totalWorkout, prevTotalWorkout, false),
              },
            ].map(({ label, value, color, trend, trendColor: tc }) => (
              <div key={label} className="stat-card">
                <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                  {label}
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color }}>{value}</div>
                {trend && (
                  <div style={{ fontSize: "0.65rem", fontWeight: 600, color: tc, marginTop: "0.125rem" }}>
                    {trend}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Trend charts */}
          <div className="card" style={{ marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              趋势：睡眠 / 压力 / 胃酸
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis domain={[0, 10]} fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="sleep" stroke="#34d399" strokeWidth={2} name="睡眠(h)" dot={false} />
                <Line type="monotone" dataKey="stress" stroke="#fbbf24" strokeWidth={2} name="压力" dot={false} />
                <Line type="monotone" dataKey="reflux" stroke="#ff6b6b" strokeWidth={2} name="胃酸" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Workout chart */}
          <div className="card" style={{ marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              运动 (分钟)
            </h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="workout" fill="#ff8a65" name="运动(min)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Trigger stats */}
          <div className="card" style={{ marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              触发因素 vs 胃酸
            </h3>
            <div style={{ fontSize: "0.75rem" }}>
              {triggerStats.map((t) => (
                <div
                  key={t.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.375rem 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span>
                    {t.name}{" "}
                    <span style={{ color: "var(--muted)" }}>({t.count}次)</span>
                  </span>
                  <span>
                    {t.count > 0 ? (
                      <>
                        <span
                          style={{
                            color:
                              t.avgReflux > t.avgRefluxWithout
                                ? "var(--danger)"
                                : "var(--success)",
                            fontWeight: 600,
                          }}
                        >
                          {t.avgReflux}
                        </span>
                        <span style={{ color: "var(--muted)" }}>
                          {" "}
                          vs {t.avgRefluxWithout}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="card" style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "0.8rem", fontWeight: 600, margin: 0 }}>
                AI 分析建议
              </h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={runAnalysis}
                disabled={analyzing}
              >
                {analyzing ? "分析中..." : "生成分析"}
              </button>
            </div>

            {parsed ? (
              <div style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong>今日重点：</strong>
                  <p style={{ margin: "0.25rem 0" }}>{parsed.today_focus}</p>
                </div>
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong>小动作：</strong>
                  <ul style={{ margin: "0.25rem 0", paddingLeft: "1.25rem" }}>
                    {parsed.micro_actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
                {parsed.risk_flags.length > 0 && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <strong style={{ color: "var(--danger)" }}>注意信号：</strong>
                    <ul style={{ margin: "0.25rem 0", paddingLeft: "1.25rem" }}>
                      {parsed.risk_flags.map((f, i) => (
                        <li key={i} style={{ color: "var(--danger)" }}>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {parsed.weekly_pattern && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <strong>本周趋势：</strong>
                    <p style={{ margin: "0.25rem 0" }}>{parsed.weekly_pattern}</p>
                  </div>
                )}
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>7天实验：</strong>
                  <p style={{ margin: "0.25rem 0" }}>{parsed.experiment}</p>
                </div>
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--muted)",
                    fontStyle: "italic",
                    marginTop: "0.75rem",
                  }}
                >
                  建议仅供生活管理，不替代医疗诊断。
                </p>
              </div>
            ) : insight?.output_text ? (
              <div style={{ fontSize: "0.8rem", whiteSpace: "pre-wrap" }}>
                {insight.output_text}
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--muted)",
                    fontStyle: "italic",
                    marginTop: "0.75rem",
                  }}
                >
                  建议仅供生活管理，不替代医疗诊断。
                </p>
              </div>
            ) : (
              <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                点击"生成分析"获取 AI 建议
              </p>
            )}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
