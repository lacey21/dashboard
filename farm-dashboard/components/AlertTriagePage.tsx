"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useData } from "@/hooks/useData";
import { PlotRow, type PlotRowData } from "@/components/PlotRow";
import { PlotDrawer } from "@/components/PlotDrawer";
import { COLORS } from "@/constants/colors";
import { STRESS_THRESHOLD } from "@/constants/thresholds";

type AlertData = {
  weeks: string[];
  defaultWeek: string;
  weeklyStats: Record<string, {
    highStressEvents: number;
    highStressDelta: number;
    responseRate: number;
    responseRateDelta: number;
    avgResponseDays: number;
    avgResponseDaysDelta: number;
  }>;
  plotRankings: Record<string, PlotRowData[]>;
  plotDetails: Record<string, unknown>;
  responseOverTime: { week: string; response_rate: number }[];
  alertTypeBreakdown: { alert_type: string; count: number; resolution_rate: number }[];
  healthTrend: { week: string; avg_stress: number }[];
  previouslyAtRisk: {
    label: string;
    lastWeekStress: number;
    thisWeekStress: number;
    actionTaken: boolean;
  }[];
};

function Delta({ value, invert }: { value: number; invert?: boolean }) {
  const good = invert ? value <= 0 : value >= 0;
  return (
    <span className={good ? "text-sage-700" : "text-red-700"}>
      {value >= 0 ? "▲" : "▼"} {Math.abs(value)}
    </span>
  );
}

export default function AlertTriagePage({ embedded = false }: { embedded?: boolean }) {
  const { data, loading } = useData<AlertData>("alert_triage.json");
  const [week, setWeek] = useState<string | null>(null);
  const [tab, setTab] = useState<"triage" | "summary">("triage");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const activeWeek = week ?? data?.defaultWeek ?? "";
  const stats = data?.weeklyStats[activeWeek];
  const plots = data?.plotRankings[activeWeek] ?? [];
  const detail = selectedKey ? data?.plotDetails[selectedKey] : null;

  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const atRiskSummary = useMemo(() => {
    if (!data?.previouslyAtRisk.length) return "";
    let improved = 0;
    let worse = 0;
    data.previouslyAtRisk.forEach((p) => {
      if (p.thisWeekStress < p.lastWeekStress) improved++;
      else if (p.thisWeekStress > p.lastWeekStress) worse++;
    });
    const same = data.previouslyAtRisk.length - improved - worse;
    return `Of the 5 plots flagged last week, ${improved} improved, ${same} stayed the same, ${worse} got worse.`;
  }, [data]);

  if (loading || !data) {
    return <p className={embedded ? "py-4 text-sage-700" : "p-8 text-sage-700"}>Loading alert triage…</p>;
  }

  const Wrapper = embedded ? "div" : "main";
  const wrapClass = embedded ? "" : "mx-auto max-w-7xl px-6 py-8";

  return (
    <Wrapper className={wrapClass}>
      <h2 className={embedded ? "text-xl font-bold text-sage-900" : "text-2xl font-bold text-sage-900"}>
        It&apos;s {dayName}. You have limited crew.
      </h2>
      <p className="mt-1 text-sage-700">Here&apos;s where to send them first.</p>

      <select
        className="mt-4 rounded border border-sage-300 bg-white px-3 py-2 text-sm text-sage-900"
        value={activeWeek}
        onChange={(e) => setWeek(e.target.value)}
      >
        {data.weeks.map((w) => (
          <option key={w} value={w}>
            Week {w}
          </option>
        ))}
      </select>

      {stats && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatBanner
            label="high-stress events this week"
            value={stats.highStressEvents}
            delta={stats.highStressDelta}
            invertDelta
          />
          <StatBanner
            label="of alerts responded to"
            value={`${stats.responseRate}%`}
            delta={stats.responseRateDelta}
          />
          <StatBanner
            label="avg response time (days)"
            value={stats.avgResponseDays}
            delta={stats.avgResponseDaysDelta}
            invertDelta
          />
        </div>
      )}

      <div className="mt-8 flex gap-2 border-b border-sage-200">
        {(["triage", "summary"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t ? "border-b-2 border-sage-700 text-sage-900" : "text-sage-600"
            }`}
          >
            {t === "triage" ? "Plot Triage" : "Alert Summary"}
          </button>
        ))}
      </div>

      {tab === "triage" ? (
        <div className="mt-4 rounded-lg border border-sage-200 bg-white shadow-sm">
          {plots.map((plot) => (
            <PlotRow
              key={plot.plot_id}
              plot={plot}
              onSelect={() => setSelectedKey(`${plot.plot_id}|${activeWeek}`)}
            />
          ))}
          <p className="border-t border-sage-100 p-4 text-sm text-sage-700">
            Start with Critical plots at the top — tap any row for the full week timeline and costs.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-10">
          <section>
            <h2 className="font-semibold text-sage-900">How has the team been responding?</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.responseOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="response_rate" stroke={COLORS.precision} name="% acted on" />
              </LineChart>
            </ResponsiveContainer>
          </section>

          <section>
            <h2 className="font-semibold text-sage-900">Alerts by type</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.alertTypeBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="alert_type" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Count">
                  {data.alertTypeBreakdown.map((entry) => (
                    <Cell
                      key={entry.alert_type}
                      fill={
                        entry.resolution_rate > 70
                          ? COLORS.healthy
                          : entry.resolution_rate < 40
                            ? COLORS.critical
                            : COLORS.warning
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section>
            <h2 className="font-semibold text-sage-900">Previously at-risk plots</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sage-100 text-left text-sage-600">
                  <th className="py-2">Plot</th>
                  <th>Last week</th>
                  <th>This week</th>
                  <th>Change</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.previouslyAtRisk.map((row) => {
                  const ch = row.thisWeekStress - row.lastWeekStress;
                  return (
                    <tr key={row.label} className="border-b">
                      <td className="py-2">{row.label}</td>
                      <td>{(row.lastWeekStress * 100).toFixed(0)}%</td>
                      <td>{(row.thisWeekStress * 100).toFixed(0)}%</td>
                      <td style={{ color: ch < 0 ? COLORS.healthy : ch > 0 ? COLORS.critical : undefined }}>
                        {ch < 0 ? "▼" : ch > 0 ? "▲" : "—"} {Math.abs(ch * 100).toFixed(0)}%
                      </td>
                      <td>{row.actionTaken ? "Yes" : "No"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-sm text-sage-700">{atRiskSummary}</p>
          </section>

          <section>
            <h2 className="font-semibold text-sage-900">Overall health trend</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.healthTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 1]} />
                <ReferenceLine y={STRESS_THRESHOLD} stroke={COLORS.warning} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="avg_stress" stroke={COLORS.critical} />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-2 text-sm text-sage-700">
              This shows whether the operation as a whole is getting healthier or more stressed over time.
            </p>
          </section>
        </div>
      )}

      <PlotDrawer
        detail={detail as Parameters<typeof PlotDrawer>[0]["detail"]}
        onClose={() => setSelectedKey(null)}
      />
    </Wrapper>
  );
}

function StatBanner({
  label,
  value,
  delta,
  invertDelta,
}: {
  label: string;
  value: string | number;
  delta: number;
  invertDelta?: boolean;
}) {
  return (
    <div className="rounded-lg border border-sage-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-bold">
        {value} <Delta value={delta} invert={invertDelta} />
      </p>
      <p className="text-sm text-sage-700">{label}</p>
    </div>
  );
}
