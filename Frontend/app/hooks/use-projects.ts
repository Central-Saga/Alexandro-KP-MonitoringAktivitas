"use client";

import { useCallback, useEffect, useState } from "react";
import { getProjects, type Project } from "../services/project-service";

export type UseProjectsResult = {
  data: Project[];
  isLoading: boolean;
  error: unknown | null;
  refetch: () => void;
};

export function useProjects(): UseProjectsResult {
  const [data, setData] = useState<Project[]>([]);
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
        const projects = await getProjects();
        if (active) setData(projects);
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
