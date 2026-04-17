/**
 * Display labels + colors for workout types and statuses.
 * Shared across week view and workout detail view.
 */

export const WORKOUT_TYPE_LABEL: Record<string, string> = {
  easy_run: "Easy run",
  tempo: "Tempo",
  intervals: "Intervals",
  long_run: "Long run",
  recovery_run: "Recovery run",
  race: "Race",
  strength: "Strength",
  cross_training: "Cross-training",
  rest: "Rest",
};

export const WORKOUT_TYPE_EMOJI: Record<string, string> = {
  easy_run: "🏃",
  tempo: "🔥",
  intervals: "⚡",
  long_run: "🛤️",
  recovery_run: "💤",
  race: "🏁",
  strength: "💪",
  cross_training: "🚴",
  rest: "🌙",
};

export const STATUS_LABEL: Record<string, string> = {
  planned: "Planned",
  completed: "Completed",
  skipped: "Skipped",
  modified: "Modified",
  deleted: "Deleted",
};
