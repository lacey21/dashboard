"use client";

type Props = {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  deltaPositive?: boolean;
  onClick?: () => void;
  href?: string;
  compact?: boolean;
};

function DeltaArrow({ delta, positive }: { delta: number; positive?: boolean }) {
  const improved = positive ?? delta >= 0;
  const color = improved ? "text-sage-700" : "text-red-700";
  const arrow = delta >= 0 ? "▲" : "▼";
  return (
    <span className={`text-sm font-medium ${color}`}>
      {arrow} {Math.abs(delta)}
    </span>
  );
}

export function KPICard({
  label,
  value,
  delta,
  deltaLabel,
  deltaPositive,
  onClick,
  compact = false,
}: Props) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-lg border border-sage-200 bg-sage-50/80 text-left ${
        compact ? "p-2.5 sm:p-3" : "bg-white p-5 shadow-sm"
      } ${onClick ? "cursor-pointer transition hover:border-sage-400 hover:bg-white hover:shadow" : ""}`}
    >
      <p className={compact ? "text-xs text-sage-700" : "text-sm text-sage-700"}>{label}</p>
      <p
        className={
          compact
            ? "mt-0.5 text-xl font-bold text-sage-900 sm:text-2xl"
            : "mt-1 text-3xl font-bold text-sage-900"
        }
      >
        {value}
      </p>
      {delta !== undefined && (
        <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "mt-1" : "mt-2"}`}>
          <DeltaArrow delta={delta} positive={deltaPositive} />
          {deltaLabel && (
            <span className={`text-sage-600 ${compact ? "text-[10px] sm:text-xs" : "text-xs"}`}>
              {deltaLabel}
            </span>
          )}
        </div>
      )}
    </Tag>
  );
}
