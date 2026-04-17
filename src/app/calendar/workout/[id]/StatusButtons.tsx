"use client";

import { useTransition } from "react";
import { updateWorkoutStatus } from "../../actions";

interface Props {
  workoutId: string;
  currentStatus: string;
}

export function StatusButtons({ workoutId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();

  const update = (status: "planned" | "completed" | "skipped") =>
    startTransition(() => updateWorkoutStatus(workoutId, status));

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => update("completed")}
        disabled={isPending || currentStatus === "completed"}
        className="px-4 py-2 rounded-lg bg-success text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-95 transition"
      >
        ✓ Mark completed
      </button>
      <button
        type="button"
        onClick={() => update("skipped")}
        disabled={isPending || currentStatus === "skipped"}
        className="px-4 py-2 rounded-lg bg-warning text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-95 transition"
      >
        ✗ Mark skipped
      </button>
      {currentStatus !== "planned" && (
        <button
          type="button"
          onClick={() => update("planned")}
          disabled={isPending}
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-40 hover:bg-surface transition"
        >
          Reset to planned
        </button>
      )}
    </div>
  );
}
