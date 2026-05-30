"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ScopeLevel = "all" | "farm" | "greenhouse" | "plot";

export type FarmOption = {
  id: string;
  name: string;
  region: string;
  primaryCrop: string;
  climateZone?: string;
  productionSystem?: string;
  areaM2?: number;
  /** Where this scope sits in the farm → greenhouse → plot hierarchy. */
  level?: ScopeLevel;
  /** Short secondary line shown under the name in the nested selector. */
  sublabel?: string;
  /** Nested scopes (farms hold greenhouses, greenhouses hold plots). */
  children?: FarmOption[];
};

// The aggregate "all farms" view the dashboard opens on by default. Used as a
// fallback before /data/farms.json loads so the selector is never empty.
const ALL_FARMS: FarmOption = {
  id: "all",
  name: "All Farms",
  region: "Fleet-wide",
  primaryCrop: "Mixed crops",
  level: "all",
};

type FarmContextValue = {
  /** Selected scope id — "all", a farm ("F01"), greenhouse ("GH002") or plot ("P0004"). */
  farm: string;
  setFarm: (id: string) => void;
  /** Flat farm-level list (incl. the aggregate entry). Drives the sidebar stats. */
  farms: FarmOption[];
  /** Hierarchical farm → greenhouse → plot tree for the nested scope selector. */
  scopeTree: FarmOption[];
  /** The currently selected scope at any level, resolved from the tree/farms. */
  selected: FarmOption;
};

const FarmContext = createContext<FarmContextValue | null>(null);

/** Flatten the scope tree into an id → option map for O(1) `selected` lookup. */
function indexScopes(nodes: FarmOption[], into: Map<string, FarmOption>) {
  for (const node of nodes) {
    into.set(node.id, node);
    if (node.children) indexScopes(node.children, into);
  }
  return into;
}

export function FarmProvider({ children }: { children: ReactNode }) {
  const [farm, setFarm] = useState<string>("all");
  const [farms, setFarms] = useState<FarmOption[]>([ALL_FARMS]);
  const [scopeTree, setScopeTree] = useState<FarmOption[]>([ALL_FARMS]);

  useEffect(() => {
    fetch("/data/farms.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((list: FarmOption[] | null) => {
        if (Array.isArray(list) && list.length) setFarms(list);
      })
      .catch(() => {
        /* keep the fallback; the dashboard still works on the aggregate view */
      });
    fetch("/data/scopes.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((tree: FarmOption[] | null) => {
        if (Array.isArray(tree) && tree.length) setScopeTree(tree);
      })
      .catch(() => {
        /* fall back to farm-level only; the selector still lists every farm */
      });
  }, []);

  // Every scope keyed by id, so a selected greenhouse/plot resolves to a label
  // and region for the sidebar, chat and reports — not just the flat farm list.
  const scopeIndex = useMemo(() => {
    const map = indexScopes(scopeTree, new Map<string, FarmOption>());
    for (const f of farms) if (!map.has(f.id)) map.set(f.id, f);
    return map;
  }, [scopeTree, farms]);

  const selected = scopeIndex.get(farm) ?? farms[0] ?? ALL_FARMS;

  return (
    <FarmContext.Provider value={{ farm, setFarm, farms, scopeTree, selected }}>
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm(): FarmContextValue {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error("useFarm must be used within a FarmProvider");
  return ctx;
}
