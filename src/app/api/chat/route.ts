import { createServerSupabase } from "@/lib/supabase-server";
import OpenAI from "openai";
import { DailyLog, Triggers } from "@/types/database";
import { PATIENT_PROFILE, HEALTH_RULES } from "@/lib/medical-profile";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

async function compressMemory(messages: ChatMsg[]): Promise<string> {
  const conversation = messages
    .map((m) => `${m.role === "user" ? "用户" : "助手"}: ${m.content}`)
    .join("\n");

  const res = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 300,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "你是一个对话摘要助手。请将以下健康对话压缩为简洁的要点摘要（中文），保留关键健康信息、用户关心的问题、给出的建议。不超过200字。",
      },
      { role: "user", content: conversation },
    ],
  });
  return res.choices[0]?.message?.content || "";
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

    const body = await req.json();

    // Handle different actions
    if (body.action === "load") {
      // Load today's messages + memory summary
      const today = new Date().toISOString().slice(0, 10);

      const { data: todayMsgs } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("user_id", user.id)
        .eq("session_date", today)
        .order("created_at", { ascending: true });

      const { data: memory } = await supabase
        .from("chat_summaries")
        .select("summary_text, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          messages: todayMsgs || [],
          memory: memory?.summary_text || null,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (body.action === "history") {
      // Load chat history dates
      const { data: dates } = await supabase
        .from("chat_messages")
        .select("session_date")
        .eq("user_id", user.id)
        .order("session_date", { ascending: false });

      // Deduplicate dates
      const uniqueDates = [...new Set((dates || []).map((d: { session_date: string }) => d.session_date))];

      return new Response(JSON.stringify({ dates: uniqueDates }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (body.action === "load_date") {
      // Load messages for a specific date
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("user_id", user.id)
        .eq("session_date", body.date)
        .order("created_at", { ascending: true });

      return new Response(JSON.stringify({ messages: msgs || [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Default: send message
    const { message, history } = body as {
      message: string;
      history: ChatMsg[];
    };

    const today = new Date().toISOString().slice(0, 10);

    // Save user message
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      session_date: today,
      role: "user",
      content: message,
    });

    // Check if we need to compress older messages
    const { count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("session_date", today);

    let memoryContext = "";

    // Load existing memory summary
    const { data: existingMemory } = await supabase
      .from("chat_summaries")
      .select("summary_text")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingMemory?.summary_text) {
      memoryContext = existingMemory.summary_text;
    }

    // If today's messages exceed 30, compress older ones into memory
    if ((count || 0) > 30) {
      // Get all today's messages for compression
      const { data: allToday } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .eq("session_date", today)
        .order("created_at", { ascending: true });

      if (allToday && allToday.length > 20) {
        const toCompress = allToday.slice(0, -10) as ChatMsg[];
        const summary = await compressMemory(toCompress);

        const fullSummary = memoryContext
          ? `${memoryContext}\n\n---\n${today}对话摘要：${summary}`
          : `${today}对话摘要：${summary}`;

        await supabase.from("chat_summaries").upsert(
          {
            user_id: user.id,
            summary_text: fullSummary,
            messages_count: allToday.length,
          },
          { onConflict: "user_id" }
        );

        memoryContext = fullSummary;
      }
    }

    // Get recent 7 days of logs
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const { data: logs } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate.toISOString().slice(0, 10))
      .order("date", { ascending: true });

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
          const c = typedLogs.filter((l) => l.triggers?.[k]).length;
          return c > 0 ? `${k}(${c}天)` : null;
        })
        .filter(Boolean);

      const latest = typedLogs[typedLogs.length - 1];
      dataSummary = `近${typedLogs.length}天: 睡眠${avgSleep}h, 压力${avgStress}/10, 胃酸${avgReflux}/10, 胸闷${avgBreathless}/10, 运动${totalWorkout}min, 触发:${triggerDays.length > 0 ? triggerDays.join("/") : "无"}, 最新(${latest.date}): 睡${latest.sleep_hours || "?"}h 压${latest.stress} 酸${latest.reflux}`;
    }

    const { data: insightData } = await supabase
      .from("ai_insights")
      .select("output_text")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const insightContext = insightData?.output_text
      ? `\n最近AI分析：${insightData.output_text.slice(0, 500)}`
      : "";

    const memorySection = memoryContext
      ? `\n\n## 历史对话记忆\n${memoryContext}`
      : "";

    const systemPrompt = `你是徐鹏（陈旭鹏）的专属健康管理助手。

${PATIENT_PROFILE}

${HEALTH_RULES}

## 当前数据
${dataSummary}${insightContext}${memorySection}

## 对话风格
- 像了解他多年的老朋友兼健康顾问
- 简洁，一般3-5句话
- 结合实际数据和病史回答
- 用中文`;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of (history || []).slice(-20)) {
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

    let fullResponse = "";
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            fullResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();

        // Save assistant response after stream completes
        await supabase.from("chat_messages").insert({
          user_id: user.id,
          session_date: today,
          role: "assistant",
          content: fullResponse,
        });
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
