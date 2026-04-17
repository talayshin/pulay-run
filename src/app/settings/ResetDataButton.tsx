"use client";

import { useState, useTransition } from "react";
import { resetMyData } from "./actions";

export function ResetDataButton() {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="px-4 py-2 rounded-lg border border-warning text-warning text-sm font-medium hover:bg-warning/10 transition"
      >
        Reset my data
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-foreground">Delete profile + plans + workouts?</span>
      <button
        type="button"
        onClick={() => startTransition(() => resetMyData())}
        disabled={isPending}
        className="px-4 py-2 rounded-lg bg-warning text-white text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Resetting..." : "Yes, reset"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-surface transition"
      >
        Cancel
      </button>
    </div>
  );
}
