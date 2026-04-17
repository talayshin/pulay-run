"use server";

/**
 * Settings server actions.
 *
 * `resetMyData` — wipe the current user's application data (profile, plans,
 * plan_blocks, workouts) without deleting the Clerk account or the `users`
 * row. Useful for re-testing the onboarding flow during development.
 *
 * `users.id` stays constant; all dependent rows cascade on delete via
 * foreign-key constraints, so this is a single query.
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, athleteProfiles } from "@/db/schema";

export async function resetMyData() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Not authenticated");

  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (!userRow) throw new Error("User row not found");

  // Deleting the athlete_profiles row does not cascade to plans/workouts
  // (they're tied to user_id, not profile). Plans cascade to blocks + workouts,
  // so we only need to delete plans and the profile explicitly.
  const { plans } = await import("@/db/schema");
  await db.delete(plans).where(eq(plans.userId, userRow.id));
  await db.delete(athleteProfiles).where(eq(athleteProfiles.userId, userRow.id));

  redirect("/onboarding");
}
