"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getDashboardSnapshot,
  type DashboardSnapshot,
} from "../services/dashboard-service";

export function useDashboard() {
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fatalError, setFatalError] = useState<unknown | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const refetch = useCallback(() => setRequestVersion((version) => version + 1), []);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setFatalError(null);

      try {
        const snapshot = await getDashboardSnapshot();
        if (active) setData(snapshot);
      } catch (error) {
        // Guard ini hanya menangani kegagalan tak terduga di orchestration;
        // error request normal sudah ditampung per resource oleh service.
        if (active) {
          setData(null);
          setFatalError(error);
        }
      } finally {
        // Service mengubah kegagalan request menjadi resource-level error;
        // finally tetap menjaga loading selesai bila terjadi error tak terduga.
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [requestVersion]);

  return { data, isLoading, fatalError, refetch };
}
