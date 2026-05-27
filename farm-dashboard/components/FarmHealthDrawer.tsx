"use client";

import { useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS } from "@/constants/colors";

type DrawerData = {
  highStressDaysPct: number;
  meanResponseDays: number;
  delayDistribution: { same_day: number; one_day: number; two_plus: number };
  responseRate: number;
  controlResponseRate: number;
  precisionVsOutcome: { week: string; daily_precision_cost: number; avg_delta: number }[];
};

export function FarmHealthDrawer({
  data,
  onClose,
}: {
  data: DrawerData;
  onClose: () => void;
}) {
  const delayData = [
    { name: "Same day", count: data.delayDistribution.same_day },
    { name: "1 day", count: data.delayDistribution.one_day },
    { name: "2+ days", count: data.delayDistribution.two_plus },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="farm-health-title"
    >
      <button
        type="button"
        className="modal-backdrop absolute inset-0 bg-sage-900/40 backdrop-blur-[2px]"
        aria-label="Close farm health breakdown"
        onClick={onClose}
      />

      <div className="modal-panel relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-sage-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-sage-100 px-5 py-4 sm:px-6">
          <h2 id="farm-health-title" className="text-xl font-bold text-sage-900">
            Farm health breakdown
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-sage-700 transition hover:bg-sage-100"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-6">
            <div>
              <p className="text-3xl font-bold text-sage-900">{data.highStressDaysPct}%</p>
              <p className="text-sm text-sage-700">
                of days plants were in high stress this season (above 0.6 threshold)
              </p>
            </div>

            <div>
              <p className="text-3xl font-bold text-sage-900">{data.meanResponseDays} days</p>
              <p className="text-sm text-sage-700">average response time to alerts</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={delayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d4dfd1" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.precision} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <p className="text-3xl font-bold text-sage-900">{data.responseRate}%</p>
              <p className="text-sm text-sage-700">
                alert response rate · Control plots: {data.controlResponseRate}%
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-sage-800">
                Precision spend vs stress outcome
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d4dfd1" />
                  <XAxis dataKey="daily_precision_cost" name="Precision $" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="avg_delta" name="Stress change" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Scatter data={data.precisionVsOutcome} fill={COLORS.precision} />
                </ScatterChart>
              </ResponsiveContainer>
              <p className="mt-2 text-sm text-sage-700">
                This shows where precision technology earned its cost — and where it didn&apos;t.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
