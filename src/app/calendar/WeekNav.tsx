import Link from "next/link";
import { addDays, toLocalDateString } from "./dateUtils";

interface Props {
  weekStart: Date;
  isCurrentWeek: boolean;
}

function fmtRange(start: Date): string {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const monthFmt: Intl.DateTimeFormatOptions = { month: "short" };
  const sameYear = start.getFullYear() === end.getFullYear();
  const startStr = start.toLocaleDateString("en-US", monthFmt) + ` ${start.getDate()}`;
  const endStr = sameMonth
    ? `${end.getDate()}`
    : end.toLocaleDateString("en-US", monthFmt) + ` ${end.getDate()}`;
  const yearStr = sameYear ? `, ${end.getFullYear()}` : `, ${start.getFullYear()}/${end.getFullYear()}`;
  return `${startStr} – ${endStr}${yearStr}`;
}

export function WeekNav({ weekStart, isCurrentWeek }: Props) {
  const prev = addDays(weekStart, -7);
  const next = addDays(weekStart, 7);

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <div className="text-sm text-muted mb-0.5">
          {isCurrentWeek ? "This week" : "Week of"}
        </div>
        <h2 className="text-xl font-semibold">{fmtRange(weekStart)}</h2>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/calendar?week=${toLocalDateString(prev)}`}
          className="px-3 py-2 rounded-lg border border-border hover:bg-surface text-sm font-medium"
          aria-label="Previous week"
        >
          ←
        </Link>
        {!isCurrentWeek && (
          <Link
            href="/calendar"
            className="px-3 py-2 rounded-lg border border-border hover:bg-surface text-sm font-medium"
          >
            Today
          </Link>
        )}
        <Link
          href={`/calendar?week=${toLocalDateString(next)}`}
          className="px-3 py-2 rounded-lg border border-border hover:bg-surface text-sm font-medium"
          aria-label="Next week"
        >
          →
        </Link>
      </div>
    </div>
  );
}
