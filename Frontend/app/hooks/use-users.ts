"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getUsers,
  type ManagedUser,
  type PaginationMeta,
  type UserQuery,
} from "../services/user-service";

export function useUsers(params: UserQuery) {
  const { page, perPage, role, search, status } = params;
  const [data, setData] = useState<ManagedUser[]>([]);
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
        const response = await getUsers({ page, perPage, role, search, status });
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
  }, [page, perPage, role, search, status, requestVersion]);

  return { data, meta, isLoading, error, refetch };
}
