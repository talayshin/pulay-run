"use client";

import { useState, useTransition } from "react";
import { saveOnboarding, type OnboardingInput } from "./actions";

type GoalType = "race_goal" | "general_fitness" | "health_maintenance";
type RaceDistance = "5k" | "10k" | "half" | "full" | "ultra" | "other";
type DayAbbr = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface FormState {
  goalType: GoalType | null;
  goalRaceDistance: RaceDistance | null;
  goalRaceDate: string;
  trainingDays: DayAbbr[];
  notes: string;
}

const DAYS: { key: DayAbbr; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const RACE_DISTANCES: { value: RaceDistance; label: string }[] = [
  { value: "5k", label: "5K" },
  { value: "10k", label: "10K" },
  { value: "half", label: "Half marathon" },
  { value: "full", label: "Marathon" },
  { value: "ultra", label: "Ultra" },
  { value: "other", label: "Other" },
];

const TOTAL_STEPS = 3;

export function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>({
    goalType: null,
    goalRaceDistance: null,
    goalRaceDate: "",
    trainingDays: [],
    notes: "",
  });

  const canAdvance = (() => {
    if (step === 1) {
      if (!state.goalType) return false;
      if (state.goalType === "race_goal") {
        return !!state.goalRaceDistance;
      }
      return true;
    }
    if (step === 2) return state.trainingDays.length > 0;
    return true;
  })();

  function handleSubmit() {
    if (!state.goalType) return;
    const input: OnboardingInput = {
      goalType: state.goalType,
      trainingDays: state.trainingDays,
      ...(state.goalRaceDistance ? { goalRaceDistance: state.goalRaceDistance } : {}),
      ...(state.goalRaceDate ? { goalRaceDate: state.goalRaceDate } : {}),
      ...(state.notes.trim() ? { notes: state.notes.trim() } : {}),
    };
    startTransition(async () => {
      await saveOnboarding(input);
    });
  }

  return (
    <div className="w-full max-w-xl bg-surface rounded-2xl border border-border p-8 shadow-sm">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i + 1 === step
                ? "bg-accent w-8"
                : i + 1 < step
                ? "bg-accent/50 w-4"
                : "bg-border w-4"
            }`}
          />
        ))}
      </div>

      {/* Step 1 — Goal type */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-semibold mb-2">What&apos;s your main goal?</h2>
          <p className="text-muted mb-6">Pick the one that fits best right now. You can change this later.</p>

          <div className="space-y-3">
            {[
              { value: "race_goal" as const, emoji: "🏁", title: "Train for a race", desc: "Building toward a specific distance on a specific date." },
              { value: "general_fitness" as const, emoji: "💪", title: "Build general fitness", desc: "Stay fit, improve endurance, no specific race." },
              { value: "health_maintenance" as const, emoji: "🌱", title: "Stay healthy and keep moving", desc: "Consistent easy running, longevity focus." },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setState((s) => ({ ...s, goalType: opt.value }))}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  state.goalType === opt.value
                    ? "border-accent bg-accent/5"
                    : "border-border bg-surface hover:border-muted"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <div className="font-medium">{opt.title}</div>
                    <div className="text-sm text-muted">{opt.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {state.goalType === "race_goal" && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Race distance</label>
                <div className="flex flex-wrap gap-2">
                  {RACE_DISTANCES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setState((s) => ({ ...s, goalRaceDistance: d.value }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        state.goalRaceDistance === d.value
                          ? "border-accent bg-accent text-white"
                          : "border-border bg-surface hover:border-muted"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Race date <span className="text-muted font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={state.goalRaceDate}
                  onChange={(e) => setState((s) => ({ ...s, goalRaceDate: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-border bg-surface focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Training days */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-semibold mb-2">Which days work for you?</h2>
          <p className="text-muted mb-6">Pick the days you&apos;re typically available to train. Your coach will plan runs around this.</p>

          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((d) => {
              const selected = state.trainingDays.includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      trainingDays: selected
                        ? s.trainingDays.filter((x) => x !== d.key)
                        : [...s.trainingDays, d.key],
                    }))
                  }
                  className={`py-3 rounded-lg text-sm font-medium border transition-all ${
                    selected
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-surface hover:border-muted"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          <p className="text-sm text-muted mt-4">
            {state.trainingDays.length === 0
              ? "Pick at least one day."
              : `${state.trainingDays.length} day${state.trainingDays.length === 1 ? "" : "s"} selected.`}
          </p>
        </div>
      )}

      {/* Step 3 — Free-text */}
      {step === 3 && (
        <div>
          <h2 className="text-2xl font-semibold mb-2">Anything else?</h2>
          <p className="text-muted mb-6">
            Injuries, life context, preferences — anything your coach should know. Optional.
          </p>

          <textarea
            value={state.notes}
            onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
            placeholder="e.g. Coming back from a knee injury, can&apos;t run on hills. Prefer morning runs."
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:border-accent resize-none"
          />

          <div className="mt-6 p-4 rounded-xl bg-background border border-border">
            <p className="text-sm font-medium mb-1">Next up: connect Strava</p>
            <p className="text-sm text-muted">
              Connecting Strava lets your coach see your past runs and prescribe more accurate workouts. You&apos;ll be
              able to connect (or skip) on the next screen.
            </p>
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || isPending}
          className="text-sm font-medium text-muted hover:text-foreground disabled:opacity-0 transition-colors"
        >
          ← Back
        </button>

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance || isPending}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Saving..." : "Finish"}
          </button>
        )}
      </div>
    </div>
  );
}
