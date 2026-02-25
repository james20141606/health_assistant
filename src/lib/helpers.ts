export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

export function calcSleepHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  // If start is after noon and end is before noon, assume crossing midnight
  if (startMin > endMin) {
    endMin += 24 * 60;
  }
  return Math.round(((endMin - startMin) / 60) * 10) / 10;
}

export function triggerLabel(key: string): string {
  const map: Record<string, string> = {
    milk_tea: "奶茶",
    coffee: "咖啡",
    spicy: "辣",
    late_meal: "夜宵",
    alcohol: "酒",
  };
  return map[key] || key;
}
