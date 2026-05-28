"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadar,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { COLORS } from "@/constants/colors";

type Subscores = Record<string, number>;

const LABELS: Record<string, string> = {
  energyIntensity: "Energy",
  waterEfficiency: "Water",
  chemicalLoad: "Chemicals",
  carbonEmissions: "Carbon",
  naturalDisasterRisk: "Disaster Risk",
  roi: "ROI",
};

export function SustainabilityRadar({
  subscores,
  controlBaseline,
  roi,
}: {
  subscores: Subscores;
  controlBaseline: Subscores;
  roi?: number;
}) {
  // Normalize ROI (0-100%) to a 0-100 score
  const roiScore = Math.min(100, (roi ?? 0) / 1.0);
  
  // Build data array with ROI if available
  const farmData: Record<string, number> = { ...subscores };
  const controlData: Record<string, number> = { ...controlBaseline };
  
  if (roi !== undefined && roi > 0) {
    farmData.roi = roiScore;
    controlData.roi = 50; // Use 50 as baseline for ROI comparison
  }
  
  const data = Object.keys(farmData).map((key) => ({
    subject: LABELS[key] ?? key,
    farm: farmData[key],
    control: controlData[key] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsRadar data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar name="Your farm" dataKey="farm" stroke={COLORS.healthy} fill={COLORS.healthy} fillOpacity={0.4} />
        <Radar name="Control baseline" dataKey="control" stroke={COLORS.routine} fill={COLORS.routine} fillOpacity={0.2} />
        <Legend />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
