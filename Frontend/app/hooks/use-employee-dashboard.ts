"use client";

import { useCallback, useEffect, useState } from "react";
import { getEmployeeDashboardSnapshot, type EmployeeDashboardSnapshot } from "../services/employee-dashboard-service";

export function useEmployeeDashboard() {
  const [data, setData] = useState<EmployeeDashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fatalError, setFatalError] = useState<unknown | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const refetch = useCallback(() => setRequestVersion((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true); setFatalError(null);
      try { const snapshot = await getEmployeeDashboardSnapshot(); if (active) setData(snapshot); }
      catch (error) { if (active) setFatalError(error); }
      finally { if (active) setIsLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [requestVersion]);

  return { data, isLoading, fatalError, refetch };
}
