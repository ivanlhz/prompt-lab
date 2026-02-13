import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Experiment } from "../types";

export function useExperiments() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setExperiments(await api.listExperiments());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { experiments, loading, refresh };
}
