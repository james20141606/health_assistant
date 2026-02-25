import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import OpenAI from "openai";
import { PATIENT_PROFILE, HEALTH_RULES } from "@/lib/medical-profile";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

interface DailyTipRow {
  id: string;
  tip_text: string;
  tip_title: string;
  tip_category: string;
}

interface LogRow {
  date: string;
  sleep_hours: number | null;
  stress: number;
  reflux: number;
  breathless: number;
  triggers: Record<string, boolean> | null;
  workout: { type: string; minutes: number } | null;
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Check cache first
    const { data: existing } = await supabase
      .from("daily_tips")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      const tip = existing as DailyTipRow;
      return NextResponse.json({
        tip_title: tip.tip_title,
        tip_text: tip.tip_text,
        tip_category: tip.tip_category,
      });
    }

    // Get recent 7 days of logs for context
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const { data: logs } = await supabase
      .from("daily_logs")
      .select("date, sleep_hours, stress, reflux, breathless, triggers, workout")
      .eq("user_id", user.id)
      .gte("date", startDate.toISOString().slice(0, 10))
      .order("date", { ascending: true });

    // Build summary
    let summary = "暂无近期数据";
    if (logs && logs.length > 0) {
      const typedLogs = logs as LogRow[];
      const avgSleep =
        Math.round(
          (typedLogs.reduce((s, l) => s + (l.sleep_hours || 0), 0) / typedLogs.length) * 10
        ) / 10;
      const avgStress =
        Math.round((typedLogs.reduce((s, l) => s + l.stress, 0) / typedLogs.length) * 10) / 10;
      const avgReflux =
        Math.round((typedLogs.reduce((s, l) => s + l.reflux, 0) / typedLogs.length) * 10) / 10;

      const triggers = typedLogs.filter((l) => l.triggers && Object.values(l.triggers).some(Boolean));
      const workoutDays = typedLogs.filter((l) => l.workout?.minutes && l.workout.minutes > 0);

      summary = `近${typedLogs.length}天: 平均睡眠${avgSleep}h, 压力${avgStress}/10, 胃酸${avgReflux}/10, 触发因素${triggers.length}天, 运动${workoutDays.length}天`;
    }

    const systemPrompt = `你是徐鹏的专属健康管理助手。

${PATIENT_PROFILE}

${HEALTH_RULES}

你需要根据他的近期数据生成一条每日健康小贴士。必须严格按以下 JSON 格式回复，不要添加任何其他文字：

{
  "tip_title": "标题（不超过8个字）",
  "tip_text": "具体建议（不超过50个字，要可执行）",
  "tip_category": "sleep 或 diet 或 exercise 或 stress 或 general 之一"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 256,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `今天是${today}。${summary}。请给一条贴士。` },
      ],
      temperature: 0.8,
    });

    const responseText = completion.choices[0]?.message?.content || "";
    let tipData = { tip_title: "保持好心情", tip_text: "今天也要好好照顾自己哦", tip_category: "general" };
    try {
      tipData = JSON.parse(responseText);
    } catch {
      // Use default
    }

    // Cache in DB
    await supabase.from("daily_tips").insert({
      user_id: user.id,
      date: today,
      tip_title: tipData.tip_title,
      tip_text: tipData.tip_text,
      tip_category: tipData.tip_category,
    });

    return NextResponse.json(tipData);
  } catch (error) {
    console.error("Daily tip error:", error);
    return NextResponse.json(
      { tip_title: "保持好心情", tip_text: "今天也要好好照顾自己哦", tip_category: "general" },
      { status: 200 }
    );
  }
}
