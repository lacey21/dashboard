"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS } from "@/constants/colors";

type MonthRev = { month: number; revenue: number };

export function LoanCalculator({
  monthlyRevenue,
  precisionBenefitPerSeason,
}: {
  monthlyRevenue: MonthRev[];
  precisionBenefitPerSeason: number;
}) {
  const [amount, setAmount] = useState(100000);
  const [rate, setRate] = useState(5.5);
  const [years, setYears] = useState(3);
  const [harvestAligned, setHarvestAligned] = useState(true);

  const calc = useMemo(() => {
    const months = years * 12;
    const monthlyRate = rate / 100 / 12;
    const flatPayment =
      monthlyRate > 0
        ? (amount * monthlyRate * (1 + monthlyRate) ** months) /
          ((1 + monthlyRate) ** months - 1)
        : amount / months;

    const totalRev = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);
    const weights = monthlyRevenue.map((m) => m.revenue / totalRev);
    const maxMonthRev = Math.max(...monthlyRevenue.map((m) => m.revenue));

    const schedule = monthlyRevenue.map((m, i) => {
      const payment = harvestAligned
        ? flatPayment * (0.5 + (m.revenue / maxMonthRev) * 0.5) * 12 / months
        : flatPayment / (12 / monthlyRevenue.length);
      return {
        month: `M${m.month}`,
        revenue: Math.round(m.revenue),
        payment: Math.round(payment * (months / monthlyRevenue.length)),
      };
    });

    const totalInterest = flatPayment * months - amount;
    const breakEvenSeasons = Math.ceil(amount / Math.max(precisionBenefitPerSeason, 1));

    const balanceCurve = Array.from({ length: years + 1 }, (_, y) => ({
      year: `Y${y}`,
      loanBalance: Math.max(0, amount - (flatPayment * 12 * y - amount * 0.1 * y)),
      cumulativeBenefit: precisionBenefitPerSeason * y,
    }));

    return { flatPayment, totalInterest, breakEvenSeasons, schedule, balanceCurve };
  }, [amount, rate, years, harvestAligned, monthlyRevenue, precisionBenefitPerSeason]);

  return (
    <div>
      <p className="text-sm text-sage-700">
        Precision agriculture loans work best when repayments align with your harvest.
        Here&apos;s how a loan could fit your revenue cycle.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Loan amount ($)
          <input
            type="range"
            min={10000}
            max={500000}
            step={5000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-1 w-full"
          />
          <span className="font-medium">${amount.toLocaleString()}</span>
        </label>
        <label className="text-sm">
          Interest rate (%)
          <input
            type="range"
            min={2}
            max={12}
            step={0.25}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="mt-1 w-full"
          />
          <span className="font-medium">{rate}%</span>
        </label>
        <label className="text-sm">
          Term (years)
          <select
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="mt-1 w-full rounded border border-sage-300 bg-white px-2 py-1 text-sage-900"
          >
            {[1, 2, 3, 5].map((y) => (
              <option key={y} value={y}>
                {y} years
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2 text-sm">
          <button
            type="button"
            onClick={() => setHarvestAligned(false)}
            className={`rounded px-3 py-2 ${!harvestAligned ? "bg-sage-700 text-white" : "bg-sage-100 text-sage-800"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setHarvestAligned(true)}
            className={`rounded px-3 py-2 ${harvestAligned ? "bg-sage-700 text-white" : "bg-sage-100 text-sage-800"}`}
          >
            Match harvest cycle
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded border border-sage-100 bg-sage-50 p-3">
          <p className="font-bold">${calc.flatPayment.toFixed(0)}/mo</p>
          <p className="text-sage-600">Payment</p>
        </div>
        <div className="rounded border border-sage-100 bg-sage-50 p-3">
          <p className="font-bold">${calc.totalInterest.toFixed(0)}</p>
          <p className="text-sage-600">Total interest</p>
        </div>
        <div className="rounded border border-sage-100 bg-sage-50 p-3">
          <p className="font-bold">{calc.breakEvenSeasons} seasons</p>
          <p className="text-sage-600">Break-even</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220} className="mt-4">
        <BarChart data={calc.schedule}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="revenue" name="Revenue" fill={COLORS.healthy} />
          <Bar dataKey="payment" name="Repayment" fill={COLORS.precision} />
        </BarChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={180} className="mt-4">
        <LineChart data={calc.balanceCurve}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="loanBalance" name="Loan balance" stroke={COLORS.critical} />
          <Line type="monotone" dataKey="cumulativeBenefit" name="Precision benefit" stroke={COLORS.healthy} />
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-2 text-sm text-sage-700">
        At your current precision benefit of ~${precisionBenefitPerSeason.toLocaleString()}
        /season, this loan pays for itself in about {calc.breakEvenSeasons} seasons.
      </p>
    </div>
  );
}
