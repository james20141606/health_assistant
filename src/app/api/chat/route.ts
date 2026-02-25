import { createServerSupabase } from "@/lib/supabase-server";
import OpenAI from "openai";
import { DailyLog, Triggers } from "@/types/database";
import { PATIENT_PROFILE, HEALTH_RULES } from "@/lib/medical-profile";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "未登录" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { message, history } = (await req.json()) as {
      message: string;
      history: ChatMessage[];
    };

    // Get recent 7 days of logs for context
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const { data: logs } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate.toISOString().slice(0, 10))
      .order("date", { ascending: true });

    // Build data summary
    let dataSummary = "暂无近期打卡数据。";
    if (logs && logs.length > 0) {
      const typedLogs = logs as DailyLog[];
      const avgSleep =
        Math.round(
          (typedLogs.reduce((s, l) => s + (l.sleep_hours || 0), 0) / typedLogs.length) * 10
        ) / 10;
      const avgStress =
        Math.round((typedLogs.reduce((s, l) => s + l.stress, 0) / typedLogs.length) * 10) / 10;
      const avgReflux =
        Math.round((typedLogs.reduce((s, l) => s + l.reflux, 0) / typedLogs.length) * 10) / 10;
      const avgBreathless =
        Math.round((typedLogs.reduce((s, l) => s + l.breathless, 0) / typedLogs.length) * 10) / 10;
      const totalWorkout = typedLogs.reduce((s, l) => s + (l.workout?.minutes || 0), 0);

      const triggerKeys: (keyof Triggers)[] = ["milk_tea", "coffee", "spicy", "late_meal", "alcohol"];
      const triggerDays = triggerKeys
        .map((k) => {
          const count = typedLogs.filter((l) => l.triggers?.[k]).length;
          return count > 0 ? `${k}(${count}天)` : null;
        })
        .filter(Boolean);

      const latest = typedLogs[typedLogs.length - 1];

      dataSummary = `近${typedLogs.length}天数据摘要：
- 平均睡眠 ${avgSleep}h，压力 ${avgStress}/10，胃酸 ${avgReflux}/10，胸闷 ${avgBreathless}/10
- 总运动 ${totalWorkout} 分钟
- 触发因素：${triggerDays.length > 0 ? triggerDays.join("、") : "无"}
- 最新一天(${latest.date})：睡眠${latest.sleep_hours || "?"}h，压力${latest.stress}，胃酸${latest.reflux}，胸闷${latest.breathless}`;
    }

    // Get latest AI insight if available
    const { data: insightData } = await supabase
      .from("ai_insights")
      .select("output_text")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const insightContext = insightData?.output_text
      ? `\n\n最近一次 AI 分析结果：\n${insightData.output_text}`
      : "";

    const systemPrompt = `你是徐鹏（陈旭鹏）的专属健康管理助手。你非常了解他的完整病史和身体状况。用户可以跟你自由对话，问任何健康相关问题。

${PATIENT_PROFILE}

${HEALTH_RULES}

## 当前健康数据
${dataSummary}${insightContext}

## 对话风格
- 像一个了解他多年的老朋友兼健康顾问在聊天
- 回答简洁，不要太长（一般3-5句话）
- 结合他的实际数据和病史回答
- 可以主动关联他的数据模式（比如"你最近胃酸偏高，是不是压力又大了？"）
- 用中文回答`;

    // Build messages array
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (keep last 20 messages to stay within context)
    const recentHistory = history.slice(-20);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: message });

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 512,
      messages,
      temperature: 0.7,
      stream: true,
    });

    // Return streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: `聊天失败: ${msg}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
