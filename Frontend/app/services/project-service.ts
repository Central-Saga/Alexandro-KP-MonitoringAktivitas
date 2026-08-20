import { apiGet, apiPost, apiPut } from "../lib/api-client";

export type ProjectManagerSummary = {
  id: number;
  name: string;
  role: "project_manager";
  is_active: boolean;
};

export type ProjectAssignment = {
  id: number;
  project_id: number;
  user_id: number;
  project_role: string;
  start_date: string;
  status: "aktif" | "nonaktif";
  user: {
    id: number;
    name: string;
    role: "karyawan";
    is_active: boolean;
    division: { id: number; name: string } | null;
  };
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: number;
  project_manager_id: number;
  name: string;
  client_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  project_manager: ProjectManagerSummary;
  active_assignments_count: number;
  assignments?: ProjectAssignment[];
  created_at: string;
  updated_at: string;
};

export type ProjectPayload = {
  project_manager_id: number;
  name: string;
  client_name: string;
  start_date: string;
  end_date: string | null;
  status?: string;
};

export type ProjectAssignmentPayload = {
  user_id: number;
  project_role: string;
  start_date: string;
  status?: ProjectAssignment["status"];
};

type ProjectCollectionResponse = { data: Project[] };
type ProjectResponse = { data: Project };
type ProjectMutationResponse = { message: string; data: Project };
type AssignmentCollectionResponse = { data: ProjectAssignment[] };
type AssignmentMutationResponse = { message: string; data: ProjectAssignment };
export type ProjectAssignmentCandidate = {
  id: number;
  name: string;
  email: string;
  division: { id: number; name: string } | null;
};
type AssignmentCandidateResponse = { data: ProjectAssignmentCandidate[] };

export async function getProjects(): Promise<Project[]> {
  const response = await apiGet<ProjectCollectionResponse>("/api/projects");
  return response.data ?? [];
}

export function getProject(id: number): Promise<ProjectResponse> {
  return apiGet<ProjectResponse>(`/api/projects/${id}`);
}

export function createProject(payload: ProjectPayload): Promise<ProjectMutationResponse> {
  return apiPost<ProjectMutationResponse>("/api/projects", payload);
}

export function updateProject(id: number, payload: Partial<ProjectPayload>): Promise<ProjectMutationResponse> {
  return apiPut<ProjectMutationResponse>(`/api/projects/${id}`, payload);
}

export function getProjectAssignments(projectId: number): Promise<AssignmentCollectionResponse> {
  return apiGet<AssignmentCollectionResponse>(`/api/projects/${projectId}/assignments`);
}

export function getProjectAssignmentCandidates(projectId: number): Promise<AssignmentCandidateResponse> {
  return apiGet<AssignmentCandidateResponse>(`/api/projects/${projectId}/assignment-candidates`);
}

export function createProjectAssignment(projectId: number, payload: ProjectAssignmentPayload): Promise<AssignmentMutationResponse> {
  return apiPost<AssignmentMutationResponse>(`/api/projects/${projectId}/assignments`, payload);
}

export function updateProjectAssignment(
  projectId: number,
  assignmentId: number,
  payload: Partial<Pick<ProjectAssignment, "project_role" | "start_date" | "status">>,
): Promise<AssignmentMutationResponse> {
  return apiPut<AssignmentMutationResponse>(`/api/projects/${projectId}/assignments/${assignmentId}`, payload);
}
