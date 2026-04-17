/**
 * Settings page.
 *
 * v1 scope: view profile + reset data (dev utility).
 * Later: Strava connection management, preferences editing, export/delete.
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, athleteProfiles, type Preferences } from "@/db/schema";
import { ResetDataButton } from "./ResetDataButton";

const DAY_LABEL: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

export default async function SettingsPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (!userRow) redirect("/onboarding");

  const [profile] = await db
    .select()
    .from(athleteProfiles)
    .where(eq(athleteProfiles.userId, userRow.id))
    .limit(1);

  const prefs = (profile?.preferences ?? {}) as Preferences;
  const preferredDays = prefs.preferredDays ?? [];

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-8">Settings</h1>

      {/* Account */}
      <Section title="Account">
        <Row label="Email" value={userRow.email} />
      </Section>

      {/* Profile */}
      {profile ? (
        <Section title="Your profile">
          <Row label="Goal type" value={profile.goalType ?? "—"} />
          {profile.goalRaceDistance && (
            <Row label="Race distance" value={profile.goalRaceDistance.toUpperCase()} />
          )}
          {profile.goalRaceDate && <Row label="Race date" value={profile.goalRaceDate} />}
          <Row label="Archetype" value={profile.archetype ?? "—"} />
          <Row
            label="Training days"
            value={
              preferredDays.length
                ? preferredDays.map((d) => DAY_LABEL[d] ?? d).join(", ")
                : "—"
            }
          />
          {profile.goalDescription && (
            <Row label="Notes" value={profile.goalDescription} multiline />
          )}
        </Section>
      ) : (
        <Section title="Your profile">
          <p className="text-muted text-sm">You haven&apos;t completed onboarding yet.</p>
        </Section>
      )}

      {/* Danger zone */}
      <Section title="Danger zone">
        <p className="text-sm text-muted mb-4">
          Delete your profile, plans, and workouts. Your Clerk account and sign-in stay intact.
          Useful for testing the onboarding flow from scratch.
        </p>
        <ResetDataButton />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="bg-surface border border-border rounded-xl p-5 space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={multiline ? "" : "flex justify-between items-baseline gap-4"}>
      <div className="text-sm text-muted">{label}</div>
      <div className={`text-sm ${multiline ? "mt-1 whitespace-pre-wrap" : "font-medium text-right"}`}>
        {value}
      </div>
    </div>
  );
}
