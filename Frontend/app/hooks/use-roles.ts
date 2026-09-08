"use client";

import { useCallback, useEffect, useState } from "react";
import { getRoles, type Role } from "../services/role-service";

export function useRoles() {
  const [data, setData] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const refetch = useCallback(() => {
    setRequestVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    // Flag ini mencegah response yang terlambat memperbarui state
    // setelah halaman Role sudah dilepas dari DOM.
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const roles = await getRoles();
        if (active) setData(roles);
      } catch (requestError: unknown) {
        // Error dipertahankan sebagai unknown agar komponen dapat
        // membedakan ApiError dan network error sesuai kebutuhan UI.
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
