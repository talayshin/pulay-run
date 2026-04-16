/**
 * PulayRun database schema — Drizzle ORM definitions.
 *
 * Maps to architecture.md §4.
 * Every table uses UUID primary keys and timestamptz for timestamps.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  date,
  timestamp,
  jsonb,
  bigint,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────

export const goalTypeEnum = pgEnum("goal_type", [
  "race_goal",
  "general_fitness",
  "health_maintenance",
]);

export const goalRaceDistanceEnum = pgEnum("goal_race_distance", [
  "5k",
  "10k",
  "half",
  "full",
  "ultra",
  "other",
]);

export const archetypeEnum = pgEnum("archetype", [
  "beginner",
  "general_fitness",
  "masters",
  "competitive",
  "recreational",
]);

export const archetypeSourceEnum = pgEnum("archetype_source", [
  "onboarding",
  "strava_refined",
  "manual_override",
]);

export const planStatusEnum = pgEnum("plan_status", [
  "draft",
  "active",
  "completed",
  "archived",
]);

export const planPhaseEnum = pgEnum("plan_phase", [
  "base",
  "build",
  "peak",
  "taper",
  "recovery",
  "maintenance",
]);

export const workoutTypeEnum = pgEnum("workout_type", [
  "easy_run",
  "tempo",
  "intervals",
  "long_run",
  "recovery_run",
  "race",
  "strength",
  "cross_training",
  "rest",
]);

export const workoutStatusEnum = pgEnum("workout_status", [
  "planned",
  "completed",
  "skipped",
  "modified",
  "deleted",
]);

export const chatRoleEnum = pgEnum("chat_role", [
  "user",
  "assistant",
  "tool",
]);

// ─── Users & Profile ────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const athleteProfiles = pgTable("athlete_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  age: integer("age"),
  sex: text("sex"),
  heightCm: numeric("height_cm"),
  weightKg: numeric("weight_kg"),
  runningYears: integer("running_years"),
  goalType: goalTypeEnum("goal_type"),
  goalRaceDistance: goalRaceDistanceEnum("goal_race_distance"),
  goalRaceDate: date("goal_race_date"),
  goalDescription: text("goal_description"),
  archetype: archetypeEnum("archetype"),
  archetypeSource: archetypeSourceEnum("archetype_source"),
  archetypeConfidence: numeric("archetype_confidence"),
  preferences: jsonb("preferences").$type<Preferences>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Strava Connection ──────────────────────────────────

export const stravaConnections = pgTable("strava_connections", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  stravaAthleteId: bigint("strava_athlete_id", { mode: "number" })
    .notNull()
    .unique(),
  accessTokenEnc: text("access_token_enc").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
  scope: text("scope"),
  connectedAt: timestamp("connected_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
});

// ─── Plans & Workouts ───────────────────────────────────

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: planStatusEnum("status").notNull().default("draft"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  goalDescription: text("goal_description"),
  generatorContext: jsonb("generator_context"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const planBlocks = pgTable("plan_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  phase: planPhaseEnum("phase").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
    blockId: uuid("block_id").references(() => planBlocks.id, {
      onDelete: "set null",
    }),
    scheduledDate: date("scheduled_date").notNull(),
    workoutType: workoutTypeEnum("workout_type").notNull(),
    planned: jsonb("planned").$type<PlannedWorkout>(),
    status: workoutStatusEnum("status").notNull().default("planned"),
    linkedActivityId: uuid("linked_activity_id"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("workouts_user_date_idx").on(table.userId, table.scheduledDate),
  ]
);

// ─── Activities & Athlete State ─────────────────────────

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stravaActivityId: bigint("strava_activity_id", { mode: "number" })
      .notNull()
      .unique(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    activityType: text("activity_type").notNull(),
    distanceM: numeric("distance_m"),
    movingTimeS: integer("moving_time_s"),
    elapsedTimeS: integer("elapsed_time_s"),
    totalElevationGainM: numeric("total_elevation_gain_m"),
    averageHeartrate: numeric("average_heartrate"),
    maxHeartrate: numeric("max_heartrate"),
    averageSpeedMps: numeric("average_speed_mps"),
    maxSpeedMps: numeric("max_speed_mps"),
    perceivedExertion: integer("perceived_exertion"),
    rawPayload: jsonb("raw_payload"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activities_user_start_idx").on(table.userId, table.startTime),
    uniqueIndex("activities_strava_id_idx").on(table.stravaActivityId),
  ]
);

export const athleteStates = pgTable("athlete_states", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  estimatedEasyPacePerKmS: integer("estimated_easy_pace_per_km_s"),
  estimatedThresholdPacePerKmS: integer("estimated_threshold_pace_per_km_s"),
  currentWeeklyVolumeKm: numeric("current_weekly_volume_km"),
  volumeTrend7dPct: numeric("volume_trend_7d_pct"),
  recentMissedWorkouts: integer("recent_missed_workouts").notNull().default(0),
  lastComputedAt: timestamp("last_computed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Chat ───────────────────────────────────────────────

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: chatRoleEnum("role").notNull(),
    content: text("content").notNull(),
    toolCalls: jsonb("tool_calls"),
    toolResults: jsonb("tool_results"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("chat_messages_session_idx").on(table.sessionId)]
);

// ─── Knowledge Base ─────────────────────────────────────
// Note: knowledge_chunks.embedding uses pgvector which requires
// the pgvector extension and a vector column type.
// Drizzle doesn't have native pgvector support yet, so the
// vector column will be added via a raw SQL migration.

export const knowledgeBooks = pgTable("knowledge_books", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  author: text("author"),
  sourceFilename: text("source_filename").notNull(),
  archetypeTags: text("archetype_tags").array(),
  goalTags: text("goal_tags").array(),
  notes: text("notes"),
  ingestedAt: timestamp("ingested_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => knowledgeBooks.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    tokenCount: integer("token_count").notNull(),
    // embedding column added via raw SQL migration (pgvector)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("knowledge_chunks_book_idx").on(table.bookId)]
);

// ─── TypeScript types for JSONB columns ─────────────────

export type Preferences = {
  preferredDays?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[];
  avoidDays?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[];
  preferredTimeOfDay?:
    | "early_morning"
    | "morning"
    | "midday"
    | "afternoon"
    | "evening";
  dislikedWorkoutTypes?: (
    | "tempo"
    | "intervals"
    | "long_run"
    | "hills"
    | "strength"
    | "cross_training"
  )[];
  restDayPreference?: (
    | "mon"
    | "tue"
    | "wed"
    | "thu"
    | "fri"
    | "sat"
    | "sun"
  )[];
  availableMinutesPerDay?: { weekday?: number; weekend?: number };
  notes?: string;
};

export type PlannedWorkout = {
  distanceM?: number;
  durationS?: number;
  targetPacePerKm?: string;
  targetHrZone?: number;
  structure?: string;
  description?: string;
};
