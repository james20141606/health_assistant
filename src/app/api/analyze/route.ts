import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";
import { DailyLog, Triggers } from "@/types/database";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

function computeAggregates(logs: DailyLog[], days: number) {
  const recent = logs.slice(-days);
  if (recent.length === 0)
    return { days: 0, avgSleep: 0, avgStress: 0, avgReflux: 0, avgBreathless: 0, totalWorkout: 0, triggerCounts: {}, medDays: 0, latestSleep: "", shortSleepDays: 0, highRefluxDays: 0, peakReflux: 0 };

  const avgSleep =
    Math.round(
      (recent.reduce((s, l) => s + (l.sleep_hours || 0), 0) / recent.length) * 10
    ) / 10;
  const avgStress =
    Math.round(
      (recent.reduce((s, l) => s + l.stress, 0) / recent.length) * 10
    ) / 10;
  const avgReflux =
    Math.round(
      (recent.reduce((s, l) => s + l.reflux, 0) / recent.length) * 10
    ) / 10;
  const avgBreathless =
    Math.round(
      (recent.reduce((s, l) => s + l.breathless, 0) / recent.length) * 10
    ) / 10;
  const totalWorkout = recent.reduce(
    (s, l) => s + (l.workout?.minutes || 0),
    0
  );
  const shortSleepDays = recent.filter(
    (l) => (l.sleep_hours || 0) < 6
  ).length;
  const highRefluxDays = recent.filter((l) => l.reflux >= 7).length;
  const peakReflux = Math.max(...recent.map((l) => l.reflux));

  const triggerKeys: (keyof Triggers)[] = [
    "milk_tea",
    "coffee",
    "spicy",
    "late_meal",
    "alcohol",
  ];
  const triggerCounts: Record<string, number> = {};
  for (const key of triggerKeys) {
    triggerCounts[key] = recent.filter((l) => l.triggers?.[key]).length;
  }

  const medDays = recent.filter(
    (l) =>
      (l.meds?.omeprazole_mg || 0) > 0 || (l.meds?.famotidine_mg || 0) > 0
  ).length;

  const latestSleepLog = [...recent]
    .reverse()
    .find((l) => l.sleep_start);
  const latestSleep = latestSleepLog?.sleep_start || "";

  return {
    days: recent.length,
    avgSleep,
    avgStress,
    avgReflux,
    avgBreathless,
    totalWorkout,
    triggerCounts,
    medDays,
    latestSleep,
    shortSleepDays,
    highRefluxDays,
    peakReflux,
  };
}

export async function POST() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // Get last 30 days of logs
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const { data: logs } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate.toISOString().slice(0, 10))
      .order("date", { ascending: true });

    if (!logs || logs.length === 0) {
      return NextResponse.json(
        { error: "没有足够的数据进行分析，请先记录几天" },
        { status: 400 }
      );
    }

    const week = computeAggregates(logs as DailyLog[], 7);
    const month = computeAggregates(logs as DailyLog[], 30);

    // Find trigger correlations
    const triggerKeys: (keyof Triggers)[] = [
      "milk_tea",
      "coffee",
      "spicy",
      "late_meal",
      "alcohol",
    ];
    const triggerCorrelations: Record<string, { with: number; without: number }> = {};
    for (const key of triggerKeys) {
      const withT = (logs as DailyLog[]).filter((l) => l.triggers?.[key]);
      const withoutT = (logs as DailyLog[]).filter((l) => !l.triggers?.[key]);
      triggerCorrelations[key] = {
        with:
          withT.length > 0
            ? Math.round(
                (withT.reduce((s, l) => s + l.reflux, 0) / withT.length) * 10
              ) / 10
            : 0,
        without:
          withoutT.length > 0
            ? Math.round(
                (withoutT.reduce((s, l) => s + l.reflux, 0) / withoutT.length) *
                  10
              ) / 10
            : 0,
      };
    }

    const inputSummary = {
      totalDays: logs.length,
      week,
      month,
      triggerCorrelations,
      latestLog: logs[logs.length - 1],
    };

    const systemPrompt = `你是一个个人健康管理助手。基于用户的健康日志数据，提供个性化的生活建议。

重要规则：
- 你不是医生，所有建议仅供生活管理参考
- 不做医疗诊断，不建议用药方案变更
- 发现异常模式时建议"咨询医生"
- 建议要具体、可执行、简短
- 用中文回答

你必须严格按照以下 JSON 格式回复，不要添加任何其他文字：

{
  "today_focus": "今天最需要关注的1-2个要点（一句话）",
  "micro_actions": ["具体小动作1", "具体小动作2", "具体小动作3"],
  "risk_flags": ["需要注意的信号（如有）"],
  "experiment": "建议一个7天小实验"
}`;

    const userPrompt = `以下是我最近的健康数据摘要：

**近7天**
- 数据天数：${week.days}
- 平均睡眠：${week.avgSleep}h（<6h天数：${week.shortSleepDays}）
- 最晚入睡：${week.latestSleep || "未记录"}
- 平均压力：${week.avgStress}/10
- 平均胃酸：${week.avgReflux}/10（≥7天数：${week.highRefluxDays}，峰值：${week.peakReflux}）
- 平均胸闷：${week.avgBreathless}/10
- 总运动：${week.totalWorkout}分钟
- 用药天数：${week.medDays}/${week.days}

**近30天**
- 数据天数：${month.days}
- 平均睡眠：${month.avgSleep}h
- 平均胃酸：${month.avgReflux}/10
- 总运动：${month.totalWorkout}分钟

**触发因素与胃酸关联**
${Object.entries(triggerCorrelations)
  .map(
    ([k, v]) =>
      `- ${k}: 有触发时胃酸${v.with}, 无触发时${v.without} (差值${(v.with - v.without).toFixed(1)})`
  )
  .join("\n")}

请根据以上数据给出结构化建议。`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Try to parse structured output
    let outputStructured = null;
    try {
      outputStructured = JSON.parse(responseText);
    } catch {
      // If can't parse, store as raw text
    }

    // Store insight
    const today = new Date().toISOString().slice(0, 10);
    const { data: insight } = await supabase
      .from("ai_insights")
      .upsert(
        {
          user_id: user.id,
          date: today,
          input_summary: inputSummary,
          output_text: responseText,
          output_structured: outputStructured,
          tags: outputStructured
            ? ["sleep", "food", "exercise", "med"]
            : ["raw"],
        },
        { onConflict: "user_id,date" }
      )
      .select()
      .single();

    return NextResponse.json({ insight, structured: outputStructured });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "分析失败，请稍后重试" },
      { status: 500 }
    );
  }
}
