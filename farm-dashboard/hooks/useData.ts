"use client";

import { useEffect, useState } from "react";
import { useFarm } from "@/contexts/FarmContext";

export function useData<T = unknown>(filename: string) {
  const { farm } = useFarm();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/data/${farm}/${filename}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${filename}`);
        return res.json();
      })
      .then((json: T) => {
        setData(json);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filename, farm]);

  return { data, loading, error };
}
