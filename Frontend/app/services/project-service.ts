import { apiGet } from "../lib/api-client";

export type Project = {
  id: number;
  project_manager_id: number;
  name: string;
  client_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type ProjectCollectionResponse = {
  data: Project[];
};

export async function getProjects(): Promise<Project[]> {
  const response = await apiGet<ProjectCollectionResponse>("/api/projects");
  return response.data ?? [];
}
