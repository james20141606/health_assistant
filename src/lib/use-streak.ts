"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-client";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  loggedToday: boolean;
}

interface Milestone {
  days: number;
  icon: string;
  label: string;
}

export const MILESTONES: Milestone[] = [
  { days: 7, icon: "🌱", label: "7天" },
  { days: 14, icon: "🌿", label: "14天" },
  { days: 30, icon: "🌳", label: "30天" },
  { days: 60, icon: "⭐", label: "60天" },
  { days: 100, icon: "💎", label: "100天" },
  { days: 365, icon: "👑", label: "365天" },
];

export function useStreak(): StreakData & { loading: boolean } {
  const supabase = createClient();
  const [data, setData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalDays: 0,
    loggedToday: false,
  });
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: rows } = await supabase
      .from("daily_logs")
      .select("date")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (!rows || rows.length === 0) {
      setLoading(false);
      return;
    }

    const dates = new Set(rows.map((r: { date: string }) => r.date));
    const totalDays = dates.size;
    const today = new Date().toISOString().slice(0, 10);
    const loggedToday = dates.has(today);

    // Calculate current streak
    let currentStreak = 0;
    const d = new Date();
    // Start from today or yesterday depending on if logged today
    if (!loggedToday) {
      d.setDate(d.getDate() - 1);
    }
    while (dates.has(d.toISOString().slice(0, 10))) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    }

    // Calculate longest streak
    const sorted = Array.from(dates).sort();
    let longestStreak = 0;
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1] + "T00:00:00");
      const curr = new Date(sorted[i] + "T00:00:00");
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) {
        streak++;
      } else {
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);

    setData({ currentStreak, longestStreak, totalDays, loggedToday });
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    compute();
  }, [compute]);

  return { ...data, loading };
}
