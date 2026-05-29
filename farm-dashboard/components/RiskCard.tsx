"use client";

import { COLORS } from "@/constants/colors";

type Props = {
  icon: string;
  title: string;
  level: "critical" | "warning" | "healthy";
  oneliner: string;
};

const LEVEL_BORDER = {
  critical: COLORS.critical,
  warning: COLORS.warning,
  healthy: COLORS.healthy,
};

export function RiskCard({ icon, title, level, oneliner }: Props) {
  return (
    <div
      className="rounded-lg border border-sage-200 bg-white p-4 shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: LEVEL_BORDER[level] }}
    >
      <div className="flex items-start gap-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-sage-900">{title}</h3>
          <p className="mt-1 text-sm text-sage-700">{oneliner}</p>
        </div>
      </div>
    </div>
  );
}
