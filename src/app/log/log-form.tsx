"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { BottomNav } from "@/components/nav";
import {
  DailyLog,
  Triggers,
  Meds,
  Workout,
  DEFAULT_TRIGGERS,
  DEFAULT_MEDS,
  DEFAULT_WORKOUT,
} from "@/types/database";
import {
  todayStr,
  yesterdayStr,
  calcSleepHours,
  triggerLabel,
} from "@/lib/helpers";

export default function LogForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || todayStr());
  const [sleepStart, setSleepStart] = useState("");
  const [sleepEnd, setSleepEnd] = useState("");
  const [sleepHours, setSleepHours] = useState<number>(0);
  const [stress, setStress] = useState(5);
  const [reflux, setReflux] = useState(0);
  const [breathless, setBreathless] = useState(0);
  const [triggers, setTriggers] = useState<Triggers>({ ...DEFAULT_TRIGGERS });
  const [meds, setMeds] = useState<Meds>({ ...DEFAULT_MEDS });
  const [workout, setWorkout] = useState<Workout>({ ...DEFAULT_WORKOUT });
  const [weightKg, setWeightKg] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");

  // Auto-calc sleep hours
  useEffect(() => {
    setSleepHours(calcSleepHours(sleepStart, sleepEnd));
  }, [sleepStart, sleepEnd]);

  const loadLog = useCallback(
    async (d: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserName(user.email || "");

      const { data } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", d)
        .maybeSingle();

      if (data) {
        fillForm(data as DailyLog);
        setExistingId(data.id);
      } else {
        resetForm();
        setExistingId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    loadLog(date);
  }, [date, loadLog]);

  function fillForm(log: DailyLog) {
    setSleepStart(log.sleep_start || "");
    setSleepEnd(log.sleep_end || "");
    setSleepHours(log.sleep_hours || 0);
    setStress(log.stress);
    setReflux(log.reflux);
    setBreathless(log.breathless);
    setTriggers(log.triggers || { ...DEFAULT_TRIGGERS });
    setMeds(log.meds || { ...DEFAULT_MEDS });
    setWorkout(log.workout || { ...DEFAULT_WORKOUT });
    setWeightKg(log.weight_kg ? String(log.weight_kg) : "");
    setNotes(log.notes || "");
  }

  function resetForm() {
    setSleepStart("");
    setSleepEnd("");
    setSleepHours(0);
    setStress(5);
    setReflux(0);
    setBreathless(0);
    setTriggers({ ...DEFAULT_TRIGGERS });
    setMeds({ ...DEFAULT_MEDS });
    setWorkout({ ...DEFAULT_WORKOUT });
    setWeightKg("");
    setNotes("");
  }

  async function copyYesterday() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", yesterdayStr())
      .maybeSingle();

    if (data) {
      fillForm(data as DailyLog);
    } else {
      alert("昨天没有记录");
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const record = {
      user_id: user.id,
      date,
      sleep_start: sleepStart || null,
      sleep_end: sleepEnd || null,
      sleep_hours: sleepHours || null,
      stress,
      reflux,
      breathless,
      triggers,
      meds,
      workout,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      notes,
    };

    if (existingId) {
      await supabase
        .from("daily_logs")
        .update({ ...record, updated_at: new Date().toISOString() })
        .eq("id", existingId);
    } else {
      const { data } = await supabase
        .from("daily_logs")
        .insert(record)
        .select("id")
        .single();
      if (data) setExistingId(data.id);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <div style={{ padding: "1rem", paddingBottom: "5rem", maxWidth: "500px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>每日打卡</h1>
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: 0 }}>{userName}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleLogout}>
          退出
        </button>
      </div>

      {/* Date + Copy Yesterday */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="date"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn btn-outline btn-sm" onClick={copyYesterday}>
          复制昨天
        </button>
      </div>

      {existingId && (
        <p style={{ fontSize: "0.75rem", color: "var(--success)", marginBottom: "0.75rem" }}>
          已有记录（编辑模式）
        </p>
      )}

      {/* Sleep */}
      <div className="card" style={{ marginBottom: "0.75rem" }}>
        <h2 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          睡眠
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
          <div>
            <label className="label">入睡</label>
            <input
              type="time"
              className="input"
              value={sleepStart}
              onChange={(e) => setSleepStart(e.target.value)}
            />
          </div>
          <div>
            <label className="label">起床</label>
            <input
              type="time"
              className="input"
              value={sleepEnd}
              onChange={(e) => setSleepEnd(e.target.value)}
            />
          </div>
          <div>
            <label className="label">时长</label>
            <div
              style={{
                padding: "0.625rem 0.75rem",
                background: "var(--card)",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: sleepHours < 6 ? "var(--danger)" : sleepHours < 7 ? "var(--warning)" : "var(--success)",
              }}
            >
              {sleepHours}h
            </div>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="card" style={{ marginBottom: "0.75rem" }}>
        <h2 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          今日状态
        </h2>
        {[
          { label: "压力", value: stress, set: setStress, color: stress >= 7 ? "var(--danger)" : "var(--fg)" },
          { label: "胃酸", value: reflux, set: setReflux, color: reflux >= 7 ? "var(--danger)" : "var(--fg)" },
          { label: "胸闷/气短", value: breathless, set: setBreathless, color: breathless >= 7 ? "var(--danger)" : "var(--fg)" },
        ].map(({ label, value, set, color }) => (
          <div key={label} style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <label className="label" style={{ marginBottom: 0 }}>{label}</label>
              <span style={{ fontSize: "1rem", fontWeight: 700, color }}>{value}</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={value}
              onChange={(e) => set(Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      {/* Triggers */}
      <div className="card" style={{ marginBottom: "0.75rem" }}>
        <h2 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          触发因素
        </h2>
        <div className="checkbox-group" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {(Object.keys(triggers) as (keyof Triggers)[]).map((key) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={triggers[key]}
                onChange={(e) =>
                  setTriggers({ ...triggers, [key]: e.target.checked })
                }
              />
              {triggerLabel(key)}
            </label>
          ))}
        </div>
      </div>

      {/* Meds */}
      <div className="card" style={{ marginBottom: "0.75rem" }}>
        <h2 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          用药
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <div>
            <label className="label">奥美拉唑 (mg)</label>
            <input
              type="number"
              className="input"
              min={0}
              step={10}
              value={meds.omeprazole_mg || ""}
              onChange={(e) =>
                setMeds({ ...meds, omeprazole_mg: Number(e.target.value) || 0 })
              }
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">法莫替丁 (mg)</label>
            <input
              type="number"
              className="input"
              min={0}
              step={10}
              value={meds.famotidine_mg || ""}
              onChange={(e) =>
                setMeds({ ...meds, famotidine_mg: Number(e.target.value) || 0 })
              }
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Workout */}
      <div className="card" style={{ marginBottom: "0.75rem" }}>
        <h2 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          运动
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
          <div>
            <label className="label">类型</label>
            <select
              className="input"
              value={workout.type}
              onChange={(e) => setWorkout({ ...workout, type: e.target.value })}
            >
              <option value="">无</option>
              <option value="strength">力量</option>
              <option value="cardio">有氧</option>
              <option value="yoga">瑜伽</option>
              <option value="walk">走路</option>
              <option value="run">跑步</option>
              <option value="swim">游泳</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div>
            <label className="label">分钟</label>
            <input
              type="number"
              className="input"
              min={0}
              value={workout.minutes || ""}
              onChange={(e) =>
                setWorkout({ ...workout, minutes: Number(e.target.value) || 0 })
              }
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">RPE (1-10)</label>
            <input
              type="number"
              className="input"
              min={0}
              max={10}
              value={workout.rpe || ""}
              onChange={(e) =>
                setWorkout({ ...workout, rpe: Number(e.target.value) || 0 })
              }
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Weight + Notes */}
      <div className="card" style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.5rem" }}>
          <div>
            <label className="label">体重 (kg)</label>
            <input
              type="number"
              className="input"
              step={0.1}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="可选"
            />
          </div>
          <div>
            <label className="label">备注</label>
            <input
              type="text"
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="可选"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        className="btn btn-primary"
        style={{ width: "100%", padding: "0.875rem", fontSize: "1rem" }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "保存中..." : saved ? "已保存 ✓" : existingId ? "更新记录" : "保存记录"}
      </button>

      <BottomNav />
    </div>
  );
}
