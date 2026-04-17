"use client";

import { useTransition } from "react";
import { createSamplePlan } from "./actions";

export function CreateSamplePlanButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => createSamplePlan())}
      disabled={isPending}
      className="px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50 transition-colors"
    >
      {isPending ? "Creating..." : "Create sample plan"}
    </button>
  );
}
