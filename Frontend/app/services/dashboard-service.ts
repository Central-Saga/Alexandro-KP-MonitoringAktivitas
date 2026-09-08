import { getActivities, type Activity } from "./activity-service";
import { getDivisions } from "./division-service";
import { getProjects, type Project } from "./project-service";
import { getUsers } from "./user-service";

export type DashboardResource<T> = {
  data: T | null;
  error: unknown | null;
};

export type WeeklyActivityData = {
  counts: number[];
  total: number;
};

export type DashboardSnapshot = {
  userTotal: DashboardResource<number>;
  divisionTotal: DashboardResource<number>;
  projects: DashboardResource<Project[]>;
  dailyActivityTotal: DashboardResource<number>;
  weeklyActivity: DashboardResource<WeeklyActivityData>;
  recentActivities: DashboardResource<Activity[]>;
};

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const now = new Date();
  const today = localDateKey(now);
  const [userTotal, divisionTotal, projects, dailyActivityTotal, weeklyActivity, recentActivities] =
    await Promise.allSettled([
      getUsers({ page: 1, perPage: 1 }).then((response) => response.meta.total),
      getDivisions({ page: 1, perPage: 1 }).then((response) => response.meta.total),
      getProjects(),
      getActivities({ page: 1, perPage: 1, dateFrom: today, dateTo: today }).then(
        (response) => response.meta.total,
      ),
      getWeeklyActivity(today, now),
      getActivities({ page: 1, perPage: 5 }).then((response) => response.data),
    ]);

  // Setiap hasil disimpan terpisah agar kegagalan satu endpoint tidak
  // menghilangkan data dashboard lain yang berhasil dimuat.
  return {
    userTotal: settledResource(userTotal),
    divisionTotal: settledResource(divisionTotal),
    projects: settledResource(projects),
    dailyActivityTotal: settledResource(dailyActivityTotal),
    weeklyActivity: settledResource(weeklyActivity),
    recentActivities: settledResource(recentActivities),
  };
}

async function getWeeklyActivity(today: string, now: Date): Promise<WeeklyActivityData> {
  const dates = currentWeekDates(now);
  const elapsedDates = dates.filter((date) => date <= today);
  const results = await Promise.allSettled(
    elapsedDates.map(async (date) => {
      const response = await getActivities({
        page: 1,
        perPage: 1,
        dateFrom: date,
        dateTo: date,
      });

      return [date, response.meta.total] as const;
    }),
  );

  const failed = results.find((result) => result.status === "rejected");
  if (failed?.status === "rejected") {
    // Total parsial tidak ditampilkan sebagai statistik mingguan karena
    // dapat disalahartikan sebagai jumlah lengkap.
    throw failed.reason;
  }

  const totals = new Map(
    results
      .filter((result): result is PromiseFulfilledResult<readonly [string, number]> => result.status === "fulfilled")
      .map((result) => result.value),
  );
  const counts = dates.map((date) => totals.get(date) ?? 0);

  return {
    counts,
    total: counts.reduce((sum, count) => sum + count, 0),
  };
}

function settledResource<T>(result: PromiseSettledResult<T>): DashboardResource<T> {
  return result.status === "fulfilled"
    ? { data: result.value, error: null }
    : { data: null, error: result.reason };
}

function currentWeekDates(now: Date): string[] {
  const weekday = now.getDay() || 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - weekday + 1);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return localDateKey(date);
  });
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
