"use client";

import { useCallback, useEffect, useState } from "react";
import { getActivities, type Activity, type ActivityQuery } from "../services/activity-service";
import type { PaginationMeta } from "../services/user-service";

export function useActivities(params: ActivityQuery = { perPage: 100 }) {
  const { dateFrom, dateTo, divisionId, page, perPage, projectId, search, status, userId } = params;
  const [data, setData] = useState<Activity[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const refetch = useCallback(() => setRequestVersion((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true); setError(null);
      try {
        const response = await getActivities({ dateFrom, dateTo, divisionId, page, perPage, projectId, search, status, userId });
        if (active) { setData(response.data); setMeta(response.meta); }
      } catch (requestError) {
        if (active) { setError(requestError); setMeta(null); }
      } finally { if (active) setIsLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [dateFrom, dateTo, divisionId, page, perPage, projectId, requestVersion, search, status, userId]);

  return { data, meta, isLoading, error, refetch };
}
