import { getActivities, type Activity } from "./activity-service";
import { getProjectAssignments, getProjects } from "./project-service";

export type DashboardResource<T> = { data: T | null; error: unknown | null };
export type ValidationQueueData = { activities: Activity[]; total: number };
export type EmployeeActivitySummary = {
  userId: number;
  name: string;
  division: string | null;
  total: number;
  approved: number;
  awaitingReview: number;
  rejected: number;
};
export type ProjectManagerDashboardSnapshot = {
  totalProjects: DashboardResource<number>;
  activeMembers: DashboardResource<number>;
  awaitingReview: DashboardResource<number>;
  todayActivities: DashboardResource<number>;
  validationQueue: DashboardResource<ValidationQueueData>;
  employeeSummaries: DashboardResource<EmployeeActivitySummary[]>;
  dailyActivities: DashboardResource<Activity[]>;
};

export async function getProjectManagerDashboardSnapshot(): Promise<ProjectManagerDashboardSnapshot> {
  const today = localDateKey(new Date());
  const results = await Promise.allSettled([
    getProjects(),
    getActivities({ status: "selesai", page: 1, perPage: 1 }),
    getActivities({ dateFrom: today, dateTo: today, page: 1, perPage: 1 }),
    getActivities({ status: "selesai", page: 1, perPage: 3 }),
    getActivities({ dateFrom: today, dateTo: today, page: 1, perPage: 10 }),
    getAllScopedActivities(),
  ]);

  const projects = results[0].status === "fulfilled" ? results[0].value : null;
  let activeMembers: DashboardResource<number> = {
    data: null,
    error: results[0].status === "rejected" ? results[0].reason : null,
  };

  if (projects) {
    const assignmentResults = await Promise.allSettled(
      projects.map((project) => getProjectAssignments(project.id)),
    );
    if (assignmentResults.every((result) => result.status === "fulfilled")) {
      const uniqueUsers = new Set<number>();
      assignmentResults.forEach((result) => {
        if (result.status === "fulfilled") {
          result.value.data.filter((assignment) => assignment.status === "aktif")
            .forEach((assignment) => uniqueUsers.add(assignment.user.id));
        }
      });
      activeMembers = { data: uniqueUsers.size, error: null };
    } else {
      activeMembers = { data: null, error: assignmentResults.find((result) => result.status === "rejected") };
    }
  }

  const awaitingReview = results[1].status === "fulfilled" ? results[1].value : null;
  const todayActivities = results[2].status === "fulfilled" ? results[2].value : null;
  const queue = results[3].status === "fulfilled" ? results[3].value : null;
  const daily = results[4].status === "fulfilled" ? results[4].value : null;
  const allActivities = results[5].status === "fulfilled" ? results[5].value : null;

  return {
    totalProjects: results[0].status === "fulfilled" ? { data: results[0].value.length, error: null } : { data: null, error: results[0].reason },
    activeMembers,
    awaitingReview: awaitingReview ? { data: awaitingReview.meta.total, error: null } : { data: null, error: results[1].status === "rejected" ? results[1].reason : null },
    todayActivities: todayActivities ? { data: todayActivities.meta.total, error: null } : { data: null, error: results[2].status === "rejected" ? results[2].reason : null },
    validationQueue: queue ? { data: { activities: queue.data, total: queue.meta.total }, error: null } : { data: null, error: results[3].status === "rejected" ? results[3].reason : null },
    employeeSummaries: allActivities ? { data: summarizeEmployees(allActivities), error: null } : { data: null, error: results[5].status === "rejected" ? results[5].reason : null },
    dailyActivities: daily ? { data: daily.data, error: null } : { data: null, error: results[4].status === "rejected" ? results[4].reason : null },
  };
}

async function getAllScopedActivities(): Promise<Activity[]> {
  const first = await getActivities({ page: 1, perPage: 100 });
  if (first.meta.last_page <= 1) return first.data;

  // Seluruh page dibaca agar ringkasan per karyawan tidak dihitung dari satu
  // potongan pagination dan disalahartikan sebagai statistik global.
  const remaining = await Promise.all(
    Array.from({ length: first.meta.last_page - 1 }, (_, index) =>
      getActivities({ page: index + 2, perPage: 100 })),
  );
  return [first.data, ...remaining.map((response) => response.data)].flat();
}

function summarizeEmployees(activities: Activity[]): EmployeeActivitySummary[] {
  const summaries = new Map<number, EmployeeActivitySummary>();
  activities.forEach((activity) => {
    const current = summaries.get(activity.user_id) ?? {
      userId: activity.user_id,
      name: activity.user.name,
      division: activity.user.division?.name ?? null,
      total: 0,
      approved: 0,
      awaitingReview: 0,
      rejected: 0,
    };
    current.total += 1;
    current.approved += activity.status === "approved" ? 1 : 0;
    current.awaitingReview += activity.status === "selesai" ? 1 : 0;
    current.rejected += activity.status === "rejected" ? 1 : 0;
    summaries.set(activity.user_id, current);
  });
  return [...summaries.values()].sort((left, right) => right.total - left.total || left.name.localeCompare(right.name, "id"));
}

function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
