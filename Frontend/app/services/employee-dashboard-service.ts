import { getActivities, type Activity } from "./activity-service";
import { getProjects, type Project } from "./project-service";
import { getProjectTasks, type ProjectTask } from "./project-task-service";

export type DashboardResource<T> = { data: T | null; error: unknown | null };
export type EmployeeDashboardSnapshot = {
  totalActivities: DashboardResource<number>;
  todayActivities: DashboardResource<number>;
  awaitingReview: DashboardResource<number>;
  approvedActivities: DashboardResource<number>;
  projects: DashboardResource<Project[]>;
  activeTasks: DashboardResource<ProjectTask[]>;
  recentActivities: DashboardResource<Activity[]>;
};

export async function getEmployeeDashboardSnapshot(): Promise<EmployeeDashboardSnapshot> {
  const today = localDateKey(new Date());
  const results = await Promise.allSettled([
    getActivities({ page: 1, perPage: 1 }),
    getActivities({ dateFrom: today, dateTo: today, page: 1, perPage: 1 }),
    // Status selesai adalah aktivitas yang siap direview; pending masih
    // merupakan status kerja awal dan bukan antrean keputusan reviewer.
    getActivities({ status: "selesai", page: 1, perPage: 1 }),
    getActivities({ status: "approved", page: 1, perPage: 1 }),
    getProjects(),
    getActivities({ page: 1, perPage: 5 }),
    getProjectTasks({ status: "active", page: 1, perPage: 5 }),
  ]);

  return {
    totalActivities: metric(results[0]),
    todayActivities: metric(results[1]),
    awaitingReview: metric(results[2]),
    approvedActivities: metric(results[3]),
    projects: resource(results[4]),
    recentActivities: results[5].status === "fulfilled"
      ? { data: results[5].value.data, error: null }
      : { data: null, error: results[5].reason },
    activeTasks: results[6].status === "fulfilled"
      ? { data: results[6].value.data, error: null }
      : { data: null, error: results[6].reason },
  };
}

function metric(result: PromiseSettledResult<Awaited<ReturnType<typeof getActivities>>>): DashboardResource<number> {
  return result.status === "fulfilled"
    ? { data: result.value.meta.total, error: null }
    : { data: null, error: result.reason };
}

function resource<T>(result: PromiseSettledResult<T>): DashboardResource<T> {
  return result.status === "fulfilled"
    ? { data: result.value, error: null }
    : { data: null, error: result.reason };
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
