/**
 * Workout detail view.
 *
 * Server component: fetch the workout by id, verify ownership, render details.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, workouts, planBlocks } from "@/db/schema";
import { WORKOUT_TYPE_LABEL, WORKOUT_TYPE_EMOJI, STATUS_LABEL } from "../../workoutLabels";
import { mondayOf, parseLocalDate, toLocalDateString } from "../../dateUtils";
import { StatusButtons } from "./StatusButtons";

function fmtDateLong(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDuration(seconds?: number): string | null {
  if (!seconds) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function fmtDistance(meters?: number): string | null {
  if (!meters) return null;
  const km = meters / 1000;
  return km % 1 === 0 ? `${km} km` : `${km.toFixed(1)} km`;
}

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");

  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (!userRow) redirect("/onboarding");

  const { id } = await params;
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, userRow.id)))
    .limit(1);

  if (!workout) notFound();

  const block = workout.blockId
    ? (
        await db
          .select()
          .from(planBlocks)
          .where(eq(planBlocks.id, workout.blockId))
          .limit(1)
      )[0]
    : null;

  const planned = workout.planned ?? {};
  const duration = fmtDuration(planned.durationS);
  const distance = fmtDistance(planned.distanceM);
  const emoji = WORKOUT_TYPE_EMOJI[workout.workoutType] ?? "•";
  const label = WORKOUT_TYPE_LABEL[workout.workoutType] ?? workout.workoutType;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link
        href={`/calendar?week=${toLocalDateString(mondayOf(parseLocalDate(workout.scheduledDate)))}`}
        className="text-sm text-muted hover:text-foreground mb-6 inline-block"
      >
        ← Back to calendar
      </Link>

      <div className="bg-surface border border-border rounded-2xl p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="text-4xl">{emoji}</div>
          <div className="flex-1">
            <p className="text-sm text-muted">{fmtDateLong(workout.scheduledDate)}</p>
            <h1 className="text-2xl font-semibold">{label}</h1>
            {block && (
              <p className="text-sm text-muted mt-1">
                <span className="capitalize">{block.phase}</span> block
              </p>
            )}
          </div>
          <StatusBadge status={workout.status} />
        </div>

        {/* Planned stats */}
        {(distance || duration || planned.targetPacePerKm || planned.targetHrZone) && (
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-border">
            {distance && <Stat label="Distance" value={distance} />}
            {duration && <Stat label="Duration" value={duration} />}
            {planned.targetPacePerKm && <Stat label="Pace" value={planned.targetPacePerKm} />}
            {planned.targetHrZone && <Stat label="HR Zone" value={`Z${planned.targetHrZone}`} />}
          </div>
        )}

        {planned.structure && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted mb-2">Structure</h3>
            <p className="text-sm">{planned.structure}</p>
          </div>
        )}

        {planned.description && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted mb-2">Notes from your coach</h3>
            <p className="text-sm leading-relaxed">{planned.description}</p>
          </div>
        )}

        {workout.notes && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted mb-2">Your notes</h3>
            <p className="text-sm leading-relaxed">{workout.notes}</p>
          </div>
        )}

        {workout.workoutType !== "rest" && (
          <div className="pt-6 border-t border-border">
            <h3 className="text-sm font-medium text-muted mb-3">Log this workout</h3>
            <StatusButtons workoutId={workout.id} currentStatus={workout.status} />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted mb-1">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "completed"
      ? "bg-success/20 text-success"
      : status === "skipped"
      ? "bg-warning/20 text-warning"
      : status === "modified"
      ? "bg-accent/20 text-accent"
      : "bg-border text-muted";
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${color}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

