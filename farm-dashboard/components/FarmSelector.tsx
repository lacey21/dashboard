"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFarm, type FarmOption } from "@/contexts/FarmContext";

function triggerLabel(scope: FarmOption) {
  return scope.id === "all" ? "🌐 All Farms" : scope.name;
}

/** Root → node id path (inclusive), so opening the menu can reveal the current
 * selection by expanding all of its ancestors. */
function findPath(nodes: FarmOption[], id: string, trail: string[] = []): string[] | null {
  for (const node of nodes) {
    const next = [...trail, node.id];
    if (node.id === id) return next;
    if (node.children) {
      const hit = findPath(node.children, id, next);
      if (hit) return hit;
    }
  }
  return null;
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={className} fill="currentColor">
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
      />
    </svg>
  );
}

function ScopeRow({
  node,
  depth,
  selectedId,
  expanded,
  onToggle,
  onSelect,
}: {
  node: FarmOption;
  depth: number;
  selectedId: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const hasChildren = !!node.children?.length;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <li role="presentation">
      <div className="flex items-stretch">
        {hasChildren ? (
          <button
            type="button"
            aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
            aria-expanded={isOpen}
            onClick={() => onToggle(node.id)}
            className="flex w-6 shrink-0 items-center justify-center text-sage-300 transition hover:text-white"
            style={{ marginLeft: depth * 12 }}
          >
            <Chevron className={`h-3 w-3 transition-transform ${isOpen ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span className="w-6 shrink-0" style={{ marginLeft: depth * 12 }} aria-hidden />
        )}
        <button
          type="button"
          role="option"
          aria-selected={isSelected}
          onClick={() => onSelect(node.id)}
          className={`min-w-0 flex-1 truncate rounded-sm py-1.5 pl-1 pr-2.5 text-left text-sm transition ${
            isSelected
              ? "bg-sage-600 font-semibold text-white"
              : "text-sage-100 hover:bg-sage-600/60 hover:text-white"
          }`}
        >
          <span className="block truncate">{node.id === "all" ? "🌐 All Farms" : node.name}</span>
          {node.sublabel && (
            <span className="block truncate text-[11px] font-normal leading-tight text-sage-300">
              {node.sublabel}
            </span>
          )}
        </button>
      </div>
      {hasChildren && isOpen && (
        <ul role="group" className="border-l border-sage-600/50">
          {node.children!.map((child) => (
            <ScopeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Global, dashboard-wide scope selector. Switching it re-fetches every page's
 * data for the chosen scope — the fleet aggregate, a farm, a greenhouse within a
 * farm, or a single plot. Greenhouses and plots nest under their parent so the
 * menu stays short until you drill in.
 */
export function FarmSelector() {
  const { farm, setFarm, scopeTree, selected } = useFarm();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Opening the menu reveals the current selection by expanding the path down to
  // it (e.g. selecting a plot expands its farm and greenhouse). Done in the open
  // handlers rather than an effect so it stays a plain event-driven update.
  const selectionPath = useMemo(
    () => findPath(scopeTree, farm) ?? [],
    [scopeTree, farm],
  );
  function openMenu() {
    setExpanded(new Set(selectionPath));
    setOpen(true);
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function select(id: string) {
    setFarm(id);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className="relative z-10 w-full"
      onMouseEnter={openMenu}
      onMouseLeave={() => setOpen(false)}
      onFocus={openMenu}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select scope to view"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="relative z-0 flex w-full items-center justify-between gap-2 rounded-md border border-sage-500 bg-sage-600 py-1.5 pl-2 pr-2.5 text-sm font-semibold text-white shadow-sm outline-none focus:ring-2 focus:ring-sage-300"
      >
        <span className="min-w-0 truncate">{triggerLabel(selected)}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={`h-3.5 w-3.5 shrink-0 text-sage-100 transition-transform ${open ? "rotate-180" : ""}`}
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-20 w-full pb-1">
          <ul
            role="listbox"
            aria-label="Scope options"
            className="max-h-[70vh] overflow-y-auto rounded-sm border border-sage-500 bg-sage-700 py-1 shadow-xl"
          >
            {scopeTree.map((node) => (
              <ScopeRow
                key={node.id}
                node={node}
                depth={0}
                selectedId={farm}
                expanded={expanded}
                onToggle={toggle}
                onSelect={select}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
