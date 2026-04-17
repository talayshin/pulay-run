/**
 * Calendar page — week view.
 *
 * Redirects to /onboarding if no athlete_profiles row exists.
 * If no active plan, shows a "create sample plan" CTA (dev scaffolding).
 * If active plan, shows the selected week as a row-per-day layout.
 */

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { users, athleteProfiles, plans, workouts } from "@/db/schema";
import { CreateSamplePlanButton } from "./CreateSamplePlanButton";
import { WeekView } from "./WeekView";
import { WeekNav } from "./WeekNav";
import { addDays, mondayOf, parseLocalDate, toLocalDateString } from "./dateUtils";

function parseWeekParam(raw?: string): Date {
  const today = new Date();
  if (!raw) return mondayOf(today);
  try {
    return mondayOf(parseLocalDate(raw));
  } catch {
    return mondayOf(today);
  }
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; view?: string }>;
}) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");

  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (!userRow) redirect("/onboarding");

  const [profile] = await db
    .select()
    .from(athleteProfiles)
    .where(eq(athleteProfiles.userId, userRow.id))
    .limit(1);
  if (!profile) redirect("/onboarding");

  const params = await searchParams;
  const weekStart = parseWeekParam(params.week);
  const weekEnd = addDays(weekStart, 6);
  const thisWeek = mondayOf(new Date());
  const isCurrentWeek = toLocalDateString(weekStart) === toLocalDateString(thisWeek);

  const [activePlan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.userId, userRow.id), eq(plans.status, "active")))
    .limit(1);

  const weekWorkouts = activePlan
    ? await db
        .select({
          id: workouts.id,
          scheduledDate: workouts.scheduledDate,
          workoutType: workouts.workoutType,
          planned: workouts.planned,
          status: workouts.status,
        })
        .from(workouts)
        .where(
          and(
            eq(workouts.userId, userRow.id),
            gte(workouts.scheduledDate, toLocalDateString(weekStart)),
            lte(workouts.scheduledDate, toLocalDateString(weekEnd)),
          ),
        )
    : [];

  const goalLabel =
    profile.goalType === "race_goal"
      ? `Training for ${profile.goalRaceDistance?.toUpperCase() ?? "a race"}${
          profile.goalRaceDate ? ` on ${profile.goalRaceDate}` : ""
        }`
      : profile.goalType === "general_fitness"
      ? "Building general fitness"
      : "Staying healthy, keeping moving";

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted mb-1">Your goal</p>
          <h1 className="text-2xl font-semibold">{goalLabel}</h1>
        </div>
        {activePlan && (
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
            <Link
              href="/calendar"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                params.view !== "periodization"
                  ? "bg-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Week
            </Link>
            <Link
              href="/calendar?view=periodization"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                params.view === "periodization"
                  ? "bg-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Periodization
            </Link>
          </div>
        )}
      </div>

      {/* Main */}
      {!activePlan ? (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No plan yet</h2>
          <p className="text-muted mb-6 max-w-md mx-auto">
            Your AI coach will generate a personalized plan once plan generation ships. Until then, create a sample
            plan to explore the calendar.
          </p>
          <CreateSamplePlanButton />
        </div>
      ) : params.view === "periodization" ? (
        <PeriodizationView planId={activePlan.id} />
      ) : (
        <>
          <WeekNav weekStart={weekStart} isCurrentWeek={isCurrentWeek} />
          <WeekView weekStart={weekStart} workouts={weekWorkouts} />
        </>
      )}

      {/* Strava banner — shown when there's no connection (Phase 3 will wire real state) */}
      <div className="mt-10 bg-accent/5 border border-accent/20 rounded-2xl p-6">
        <h3 className="font-semibold mb-1">Connect Strava for more accurate coaching</h3>
        <p className="text-sm text-muted mb-4">
          Your coach can personalize workouts once it knows your current fitness, pace, and weekly volume. Connecting
          Strava fixes that.
        </p>
        <button
          disabled
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium opacity-50 cursor-not-allowed"
        >
          Connect Strava (coming soon)
        </button>
      </div>
    </div>
  );
}

async function PeriodizationView({ planId }: { planId: string }) {
  const { planBlocks } = await import("@/db/schema");
  const blocks = await db
    .select()
    .from(planBlocks)
    .where(eq(planBlocks.planId, planId))
    .orderBy(planBlocks.sortOrder);

  if (blocks.length === 0) {
    return <p className="text-muted">No blocks in this plan yet.</p>;
  }

  const first = parseLocalDate(blocks[0].startDate);
  const last = parseLocalDate(blocks[blocks.length - 1].endDate);
  const totalDays = Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const phaseColor: Record<string, string> = {
    base: "bg-success/30 border-success/40",
    build: "bg-accent/30 border-accent/40",
    peak: "bg-warning/30 border-warning/40",
    taper: "bg-muted/30 border-muted/40",
    recovery: "bg-success/20 border-success/30",
    maintenance: "bg-border border-border",
  };

  return (
    <div>
      <div className="mb-4 text-sm text-muted">
        {totalDays} days · {blocks.length} block{blocks.length === 1 ? "" : "s"}
      </div>
      <div className="relative bg-surface border border-border rounded-xl p-6">
        <div className="relative h-24 flex rounded-lg overflow-hidden">
          {blocks.map((b) => {
            const start = parseLocalDate(b.startDate);
            const end = parseLocalDate(b.endDate);
            const dayCount =
              Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const width = (dayCount / totalDays) * 100;
            return (
              <div
                key={b.id}
                style={{ width: `${width}%` }}
                className={`border flex flex-col justify-center px-3 ${
                  phaseColor[b.phase] ?? "bg-surface border-border"
                }`}
              >
                <div className="text-xs font-medium uppercase tracking-wide">{b.phase}</div>
                <div className="text-xs text-muted">{dayCount}d</div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-2">
          {blocks.map((b) => (
            <div key={b.id} className="text-sm flex gap-3">
              <div className="w-20 font-medium capitalize">{b.phase}</div>
              <div className="text-muted">{b.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
