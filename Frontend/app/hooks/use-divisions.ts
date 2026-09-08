"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getDivisions,
  type Division,
  type DivisionQuery,
} from "../services/division-service";
import type { PaginationMeta } from "../services/user-service";

export function useDivisions(params: DivisionQuery) {
  const { page, perPage, search, status } = params;
  const [data, setData] = useState<Division[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const refetch = useCallback(() => setRequestVersion((value) => value + 1), []);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getDivisions({ page, perPage, search, status });
        if (active) {
          setData(response.data);
          setMeta(response.meta);
        }
      } catch (requestError: unknown) {
        if (active) {
          setError(requestError);
          setMeta(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [page, perPage, search, status, requestVersion]);

  return { data, meta, isLoading, error, refetch };
}
