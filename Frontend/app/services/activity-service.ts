import { apiGet } from "../lib/api-client";
import type { MediaItem } from "../types/media";

export type ActivityStatus = "pending" | "ongoing" | "selesai" | "approved";

export type Activity = {
  id: number;
  user_id: number;
  project_id: number | null;
  title: string;
  description: string | null;
  status: ActivityStatus;
  activity_date: string;
  created_at: string;
  updated_at: string;
  project?: {
    id: number;
    name: string;
    client_name: string;
  } | null;
  media: MediaItem[];
};

type ActivityCollectionResponse = {
  data: Activity[];
};

export async function getActivities(): Promise<Activity[]> {
  const response = await apiGet<ActivityCollectionResponse>("/api/activities");
  return response.data ?? [];
}

// Upload media sengaja tidak diekspos untuk UI Admin karena ActivityPolicy
// hanya mengizinkan karyawan pemilik Activity melakukan mutation tersebut.
