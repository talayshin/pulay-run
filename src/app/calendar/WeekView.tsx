import Link from "next/link";
import type { PlannedWorkout } from "@/db/schema";
import { WORKOUT_TYPE_LABEL, WORKOUT_TYPE_EMOJI, STATUS_LABEL } from "./workoutLabels";

interface WorkoutRow {
  id: string;
  scheduledDate: string;
  workoutType: string;
  planned: PlannedWorkout | null;
  status: string;
}

interface Props {
  weekStart: Date;
  workouts: WorkoutRow[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function sameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function WeekView({ weekStart, workouts }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byDate = new Map<string, WorkoutRow>();
  for (const w of workouts) byDate.set(w.scheduledDate, w);

  return (
    <div className="space-y-2">
      {DAY_NAMES.map((dayName, idx) => {
        const date = addDays(weekStart, idx);
        const workout = byDate.get(fmtDate(date));
        const isToday = sameDate(date, today);
        return (
          <DayRow
            key={fmtDate(date)}
            dayName={dayName}
            date={date}
            isToday={isToday}
            workout={workout}
          />
        );
      })}
    </div>
  );
}

function DayRow({
  dayName,
  date,
  isToday,
  workout,
}: {
  dayName: string;
  date: Date;
  isToday: boolean;
  workout?: WorkoutRow;
}) {
  const emoji = workout ? WORKOUT_TYPE_EMOJI[workout.workoutType] ?? "•" : "";
  const isRest = !workout || workout.workoutType === "rest";
  const description = workout?.planned?.description ?? "";

  const content = (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
        isToday
          ? "border-accent bg-accent/5"
          : "border-border bg-surface hover:bg-background"
      } ${workout ? "cursor-pointer" : ""}`}
    >
      {/* Date column */}
      <div className="w-20 shrink-0">
        <div className={`text-xs font-medium uppercase tracking-wide ${isToday ? "text-accent" : "text-muted"}`}>
          {dayName}
        </div>
        <div className="text-2xl font-semibold">{date.getDate()}</div>
        {isToday && <div className="text-xs text-accent font-medium">Today</div>}
      </div>

      {/* Workout column */}
      <div className="flex-1 min-w-0">
        {isRest ? (
          <div className="text-muted text-sm">🌙 Rest day</div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{emoji}</span>
              <span className="font-medium">
                {WORKOUT_TYPE_LABEL[workout!.workoutType] ?? workout!.workoutType}
              </span>
              {workout!.status !== "planned" && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-md ${
                    workout!.status === "completed"
                      ? "bg-success/20 text-success"
                      : "bg-warning/20 text-warning"
                  }`}
                >
                  {STATUS_LABEL[workout!.status] ?? workout!.status}
                </span>
              )}
            </div>
            {description && <div className="text-sm text-muted truncate">{description}</div>}
          </>
        )}
      </div>
    </div>
  );

  return workout && !isRest ? (
    <Link href={`/calendar/workout/${workout.id}`} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
