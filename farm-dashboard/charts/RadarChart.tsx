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
  stressManagement: "Stress",
  precisionAdoption: "Precision",
};

export function SustainabilityRadar({
  subscores,
  controlBaseline,
}: {
  subscores: Subscores;
  controlBaseline: Subscores;
}) {
  const data = Object.keys(subscores).map((key) => ({
    subject: LABELS[key] ?? key,
    farm: subscores[key],
    control: controlBaseline[key] ?? 0,
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
