"use client";

type Props = {
  label: string;
  value: string | number;
  onClick?: () => void;
};

export function StickyKpiChip({ label, value, onClick }: Props) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`inline-flex shrink-0 items-baseline gap-1 rounded px-1.5 py-0.5 transition-colors ${
        onClick ? "cursor-pointer hover:bg-white/20" : ""
      } bg-white/10`}
    >
      <span className="text-[9px] font-medium uppercase tracking-wide text-sage-100/80">
        {label}
      </span>
      <span className="text-xs font-semibold text-white">{value}</span>
    </Tag>
  );
}
