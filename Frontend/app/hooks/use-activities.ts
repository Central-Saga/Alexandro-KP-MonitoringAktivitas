"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getActivities,
  type Activity,
} from "../services/activity-service";

export type UseActivitiesResult = {
  data: Activity[];
  isLoading: boolean;
  error: unknown | null;
  refetch: () => void;
};

export function useActivities(): UseActivitiesResult {
  const [data, setData] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const refetch = useCallback(() => {
    setRequestVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const activities = await getActivities();
        if (active) setData(activities);
      } catch (requestError: unknown) {
        if (active) setError(requestError);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [requestVersion]);

  return { data, isLoading, error, refetch };
}
