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

const LEVEL_ICON_COLOR = {
  critical: COLORS.critical,
  warning: COLORS.warning,
  healthy: COLORS.healthy,
};

function RiskIcon({ name, color }: { name: string; color: string }) {
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "thermometer":
      return (
        <svg {...props}>
          {/* bulb */}
          <circle cx="12" cy="18" r="3" />
          {/* stem */}
          <path d="M12 4v10" strokeWidth={2.2} />
          <rect x="9.5" y="2" width="5" height="12" rx="2.5" />
          {/* fill line inside stem */}
          <path d="M12 10v6" stroke={color} strokeWidth={1.4} />
        </svg>
      );

    case "bug":
      return (
        <svg {...props}>
          {/* body */}
          <ellipse cx="12" cy="13" rx="4" ry="5" />
          {/* head */}
          <circle cx="12" cy="7" r="2" />
          {/* antennae */}
          <path d="M10 6 L8 4M14 6 L16 4" />
          {/* legs */}
          <path d="M8 11 L5 10M8 13 L5 13M8 15 L5 16" />
          <path d="M16 11 L19 10M16 13 L19 13M16 15 L19 16" />
        </svg>
      );

    case "shield-alert":
      return (
        <svg {...props}>
          <path d="M12 2 L20 6 L20 12 C20 16.4 16.4 20.4 12 22 C7.6 20.4 4 16.4 4 12 L4 6 Z" />
          <path d="M12 9 L12 13" strokeWidth={2} />
          <circle cx="12" cy="16" r="0.5" fill={color} strokeWidth={1} />
        </svg>
      );

    case "droplet":
      return (
        <svg {...props}>
          <path d="M12 2 C12 2 5 10 5 15 a7 7 0 0 0 14 0 C19 10 12 2 12 2 Z" />
          {/* shine */}
          <path d="M9 14 C9 12.3 10.3 11 12 10.5" strokeWidth={1.2} strokeOpacity={0.5} />
        </svg>
      );

    case "trending-up":
      return (
        <svg {...props}>
          <polyline points="3 17 9 11 13 15 21 7" />
          <polyline points="15 7 21 7 21 13" />
        </svg>
      );

    default:
      // fallback: render the string as-is (handles legacy emoji in existing JSON)
      return <span className="text-lg leading-none">{name}</span>;
  }
}

export function RiskCard({ icon, title, level, oneliner }: Props) {
  const iconColor = LEVEL_ICON_COLOR[level];
  return (
    <div
      className="rounded-lg border border-sage-200 bg-white p-4 shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: LEVEL_BORDER[level] }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          <RiskIcon name={icon} color={iconColor} />
        </span>
        <div>
          <h3 className="font-semibold text-sage-900">{title}</h3>
          <p className="mt-1 text-sm text-sage-700">{oneliner}</p>
        </div>
      </div>
    </div>
  );
}
