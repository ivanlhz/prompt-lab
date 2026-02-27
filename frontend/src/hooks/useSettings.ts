import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { AppSettings } from "../types";

type Status = "idle" | "loading" | "saving" | "success" | "error";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [form, setForm] = useState<Partial<AppSettings>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const data = await api.getSettings();
      setSettings(data);
      setForm({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setStatus("idle");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setStatus("idle");
      setError(null);
    },
    [],
  );

  const getValue = useCallback(
    <K extends keyof AppSettings>(key: K): string => {
      if (key in form) return String(form[key]);
      if (settings) return String(settings[key]);
      return "";
    },
    [form, settings],
  );

  const isDirty = Object.keys(form).length > 0;

  const save = useCallback(async () => {
    if (!isDirty) return;
    setStatus("saving");
    setError(null);
    try {
      const data = await api.updateSettings(form);
      setSettings(data);
      setForm({});
      setStatus("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
      setStatus("error");
    }
  }, [form, isDirty]);

  const reset = useCallback(() => {
    setForm({});
    setStatus("idle");
    setError(null);
  }, []);

  return { settings, status, error, isDirty, setField, getValue, save, reset };
}
