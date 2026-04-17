/**
 * Onboarding page — server component.
 *
 * If the user already has an athlete_profiles row, we've already onboarded
 * them, so redirect to /calendar. Otherwise render the multi-step form.
 *
 * See architecture.md §5.1.
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, athleteProfiles } from "@/db/schema";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (userRow) {
    const [profile] = await db
      .select({ userId: athleteProfiles.userId })
      .from(athleteProfiles)
      .where(eq(athleteProfiles.userId, userRow.id))
      .limit(1);

    if (profile) {
      redirect("/calendar");
    }
  }
  // If the users row doesn't exist yet, the Clerk webhook hasn't fired.
  // Render onboarding anyway; the server action will handle the race.

  return (
    <div className="flex items-center justify-center py-12 px-6 min-h-[calc(100vh-57px)]">
      <OnboardingForm />
    </div>
  );
}
