"use server";

/**
 * Calendar-related server actions.
 *
 * `createSamplePlan`: generate a 4-week placeholder plan so the calendar has
 * data to render before real plan generation (Phase 4) lands. This is
 * explicitly development scaffolding — delete or hide once Phase 4 ships.
 */

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users,
  athleteProfiles,
  plans,
  planBlocks,
  workouts,
  type PlannedWorkout,
  type Preferences,
} from "@/db/schema";

import { addDays, mondayOf, toLocalDateString } from "./dateUtils";

type DayAbbr = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const DAY_INDEX: Record<DayAbbr, number> = {
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
};

interface WorkoutSeed {
  type: "easy_run" | "tempo" | "intervals" | "long_run" | "recovery_run" | "rest" | "strength" | "cross_training";
  planned: PlannedWorkout;
}

function workoutForDay(
  dayIndex: number,
  weekIndex: number,
  trainingDays: Set<number>,
  phase: "base" | "build",
): WorkoutSeed {
  if (!trainingDays.has(dayIndex)) {
    return { type: "rest", planned: { description: "Rest day" } };
  }

  // Saturday (6) is the long run day when it's in training days
  if (dayIndex === 6) {
    const km = phase === "base" ? 8 + weekIndex : 12 + weekIndex * 2;
    return {
      type: "long_run",
      planned: {
        distanceM: km * 1000,
        targetPacePerKm: "easy",
        description: `Long run — ${km}km conversational pace`,
      },
    };
  }

  // Tuesday & Thursday are quality days in build phase
  if ((dayIndex === 2 || dayIndex === 4) && phase === "build") {
    return dayIndex === 2
      ? {
          type: "tempo",
          planned: {
            distanceM: 8000,
            durationS: 40 * 60,
            targetPacePerKm: "threshold",
            structure: "15 min warmup · 20 min tempo · 15 min cooldown",
            description: "Tempo run at comfortably hard effort",
          },
        }
      : {
          type: "intervals",
          planned: {
            durationS: 50 * 60,
            structure: "10 min warmup · 6×400m @ 5k pace w/ 90s rest · 15 min cooldown",
            description: "Intervals — sharpening VO2 work",
          },
        };
  }

  // All other training days are easy
  const km = 5 + (weekIndex % 2);
  return {
    type: "easy_run",
    planned: {
      distanceM: km * 1000,
      targetPacePerKm: "easy",
      description: `Easy run — ${km}km at conversational effort`,
    },
  };
}

export async function createSamplePlan() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Not authenticated");

  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (!userRow) throw new Error("User row not found");

  const [profile] = await db
    .select()
    .from(athleteProfiles)
    .where(eq(athleteProfiles.userId, userRow.id))
    .limit(1);
  if (!profile) throw new Error("Complete onboarding first");

  const prefs = (profile.preferences ?? {}) as Preferences;
  const preferredDays = (prefs.preferredDays ?? ["tue", "thu", "sat"]) as DayAbbr[];
  const trainingDayIndexes = new Set(preferredDays.map((d) => DAY_INDEX[d]));

  const start = mondayOf(new Date());
  const end = addDays(start, 4 * 7 - 1); // 4 weeks

  // Archive any existing active plans for this user so the calendar shows only one
  await db
    .update(plans)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(plans.userId, userRow.id), eq(plans.status, "active")));

  // Create the plan
  const [plan] = await db
    .insert(plans)
    .values({
      userId: userRow.id,
      status: "active",
      startDate: toLocalDateString(start),
      endDate: toLocalDateString(end),
      goalDescription: profile.goalDescription ?? null,
    })
    .returning();

  // Two blocks: base (weeks 1-2), build (weeks 3-4)
  const [baseBlock] = await db
    .insert(planBlocks)
    .values({
      planId: plan.id,
      phase: "base",
      startDate: toLocalDateString(start),
      endDate: toLocalDateString(addDays(start, 13)),
      description: "Base — building aerobic volume at easy effort",
      sortOrder: 0,
    })
    .returning();

  const [buildBlock] = await db
    .insert(planBlocks)
    .values({
      planId: plan.id,
      phase: "build",
      startDate: toLocalDateString(addDays(start, 14)),
      endDate: toLocalDateString(end),
      description: "Build — introducing tempo and interval work",
      sortOrder: 1,
    })
    .returning();

  // Workouts — one per day across 4 weeks
  const workoutRows: (typeof workouts.$inferInsert)[] = [];
  for (let w = 0; w < 4; w++) {
    const phase: "base" | "build" = w < 2 ? "base" : "build";
    const block = w < 2 ? baseBlock : buildBlock;
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const dayIndex = date.getDay();
      const seed = workoutForDay(dayIndex, w, trainingDayIndexes, phase);
      workoutRows.push({
        userId: userRow.id,
        planId: plan.id,
        blockId: block.id,
        scheduledDate: toLocalDateString(date),
        workoutType: seed.type,
        planned: seed.planned,
        status: "planned",
        sortOrder: 0,
      });
    }
  }
  await db.insert(workouts).values(workoutRows);

  revalidatePath("/calendar");
}
