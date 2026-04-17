"use server";

/**
 * Server action: save onboarding answers.
 *
 * Creates the athlete_profiles row for the current user. Called from
 * OnboardingForm on the final step. Redirects to /calendar on success.
 *
 * See architecture.md §5.1 step 4.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, athleteProfiles, type Preferences } from "@/db/schema";

type GoalType = "race_goal" | "general_fitness" | "health_maintenance";
type RaceDistance = "5k" | "10k" | "half" | "full" | "ultra" | "other";
type DayAbbr = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type Archetype = "competitive" | "recreational" | "general_fitness" | "masters" | "beginner";

export interface OnboardingInput {
  goalType: GoalType;
  goalRaceDistance?: RaceDistance;
  goalRaceDate?: string; // YYYY-MM-DD
  trainingDays: DayAbbr[];
  notes?: string;
}

function deriveArchetype(goalType: GoalType): Archetype {
  // Simple initial rule — refined from Strava history once connected (see §5.1 step 7).
  switch (goalType) {
    case "race_goal":
      return "competitive";
    case "general_fitness":
      return "general_fitness";
    case "health_maintenance":
      return "masters";
  }
}

export async function saveOnboarding(input: OnboardingInput) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    throw new Error("Not authenticated");
  }

  // Find the users row created by the Clerk webhook.
  // In the rare case the webhook hasn't fired yet (fast signup → submit),
  // create the row here as a fallback. Both paths use clerk_user_id as the
  // unique key, so concurrent writes from both sides are safe.
  let [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (!userRow) {
    const clerkUser = await currentUser();
    const email =
      clerkUser?.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress ??
      clerkUser?.emailAddresses[0]?.emailAddress ??
      "";
    await db
      .insert(users)
      .values({ clerkUserId, email })
      .onConflictDoNothing({ target: users.clerkUserId });
    [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);
    if (!userRow) {
      throw new Error("Failed to create user row");
    }
  }

  // notes live in athlete_profiles.goal_description (see architecture.md §4.1).
  // preferences.notes is reserved for coach-facing preference tweaks made in chat.
  const preferences: Preferences = {
    preferredDays: input.trainingDays,
  };

  await db
    .insert(athleteProfiles)
    .values({
      userId: userRow.id,
      goalType: input.goalType,
      goalRaceDistance: input.goalRaceDistance ?? null,
      goalRaceDate: input.goalRaceDate ?? null,
      goalDescription: input.notes ?? null,
      archetype: deriveArchetype(input.goalType),
      archetypeSource: "onboarding",
      preferences,
    })
    .onConflictDoUpdate({
      target: athleteProfiles.userId,
      set: {
        goalType: input.goalType,
        goalRaceDistance: input.goalRaceDistance ?? null,
        goalRaceDate: input.goalRaceDate ?? null,
        goalDescription: input.notes ?? null,
        archetype: deriveArchetype(input.goalType),
        archetypeSource: "onboarding",
        preferences,
        updatedAt: new Date(),
      },
    });

  redirect("/calendar");
}
