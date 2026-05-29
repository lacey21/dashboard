"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type FarmOption = {
  id: string;
  name: string;
  region: string;
  primaryCrop: string;
};

// The aggregate "all farms" view the dashboard opens on by default. Used as a
// fallback before /data/farms.json loads so the selector is never empty.
const ALL_FARMS: FarmOption = {
  id: "all",
  name: "All Farms",
  region: "Fleet-wide",
  primaryCrop: "Mixed crops",
};

type FarmContextValue = {
  /** Selected scope id — "all" (aggregate) or a farm id like "F01". */
  farm: string;
  setFarm: (id: string) => void;
  /** Selector options; always starts with the aggregate "All Farms" entry. */
  farms: FarmOption[];
  /** The currently selected option, resolved from `farms`. */
  selected: FarmOption;
};

const FarmContext = createContext<FarmContextValue | null>(null);

export function FarmProvider({ children }: { children: ReactNode }) {
  const [farm, setFarm] = useState<string>("all");
  const [farms, setFarms] = useState<FarmOption[]>([ALL_FARMS]);

  useEffect(() => {
    fetch("/data/farms.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((list: FarmOption[] | null) => {
        if (Array.isArray(list) && list.length) setFarms(list);
      })
      .catch(() => {
        /* keep the fallback; the dashboard still works on the aggregate view */
      });
  }, []);

  const selected = farms.find((f) => f.id === farm) ?? farms[0];

  return (
    <FarmContext.Provider value={{ farm, setFarm, farms, selected }}>
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm(): FarmContextValue {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error("useFarm must be used within a FarmProvider");
  return ctx;
}
