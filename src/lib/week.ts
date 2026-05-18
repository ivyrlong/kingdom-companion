// Shared week / day range math.
//
// Meeting content is keyed to a Monday-anchored week; "today" content (Daily
// Text) to a calendar day. Boundaries are built with Date.UTC so they line up
// with the "timestamp without time zone" values Prisma stores in PostgreSQL.

export interface WeekRange {
  startOfWeek: Date;
  endOfWeek: Date;
  /** "This Week" for the current week, otherwise a "Apr 6 – Apr 12" range. */
  label: string;
}

export function getWeekRange(weekOffset = 0): WeekRange {
  const now = new Date();
  const localDay = now.getDay(); // 0=Sun … 6=Sat
  // On Sunday, treat it as the end of the current Mon–Sun week (go back 6 days)
  const mondayOffset = localDay === 0 ? -6 : 1 - localDay;
  const mondayDate = now.getDate() + mondayOffset + weekOffset * 7;

  const startOfWeek = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), mondayDate),
  );
  const endOfWeek = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), mondayDate + 6, 23, 59, 59, 999),
  );

  const label =
    weekOffset === 0
      ? "This Week"
      : startOfWeek.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }) +
        " – " +
        endOfWeek.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });

  return { startOfWeek, endOfWeek, label };
}

export function getTodayRange(): { todayStart: Date; todayEnd: Date } {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const todayEnd = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  );
  return { todayStart, todayEnd };
}
