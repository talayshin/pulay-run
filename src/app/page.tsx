import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, athleteProfiles } from "@/db/schema";

export default async function Home() {
  const { userId: clerkUserId } = await auth();

  if (clerkUserId) {
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
      redirect(profile ? "/calendar" : "/onboarding");
    }
    redirect("/onboarding");
  }

  return (
    <div className="flex flex-1 items-center justify-center py-20 px-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-semibold mb-3">PulayRun</h1>
        <p className="text-muted text-lg mb-8">
          Your AI-powered running coach.
        </p>
        <p className="text-sm text-muted">
          Sign in or sign up from the top right to get started.
        </p>
      </div>
    </div>
  );
}
