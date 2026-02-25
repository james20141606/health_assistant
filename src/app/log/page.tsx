import { Suspense } from "react";
import LogForm from "./log-form";

export default function LogPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
          加载中...
        </div>
      }
    >
      <LogForm />
    </Suspense>
  );
}
