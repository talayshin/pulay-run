/**
 * Calendar page — placeholder for v1.
 *
 * Redirects to /onboarding if the user has no athlete_profiles row
 * (onboarding not yet completed).
 *
 * The real calendar UI ships in Phase 2 of the roadmap.
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, athleteProfiles } from "@/db/schema";

export default async function CalendarPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (!userRow) {
    // Webhook hasn't fired yet — send to onboarding which will handle the race.
    redirect("/onboarding");
  }

  const [profile] = await db
    .select()
    .from(athleteProfiles)
    .where(eq(athleteProfiles.userId, userRow.id))
    .limit(1);

  if (!profile) {
    redirect("/onboarding");
  }

  const goalLabel =
    profile.goalType === "race_goal"
      ? `Training for ${profile.goalRaceDistance?.toUpperCase() ?? "a race"}${
          profile.goalRaceDate ? ` on ${profile.goalRaceDate}` : ""
        }`
      : profile.goalType === "general_fitness"
      ? "Building general fitness"
      : "Staying healthy, keeping moving";

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-sm text-muted mb-1">Your goal</p>
        <h1 className="text-2xl font-semibold">{goalLabel}</h1>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-8 mb-6">
        <h2 className="text-xl font-semibold mb-2">Your calendar lives here</h2>
        <p className="text-muted mb-4">
          We&apos;re still building this out. Soon you&apos;ll see your week, planned workouts, and how each run fits into
          your training block.
        </p>
        <p className="text-sm text-muted">
          Coming in Phase 2: week view, periodization view, workout details.
        </p>
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6">
        <h3 className="font-semibold mb-1">Connect Strava for more accurate coaching</h3>
        <p className="text-sm text-muted mb-4">
          Your coach can only personalize workouts once it knows your current fitness, pace, and weekly volume.
          Connecting Strava fixes that.
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
