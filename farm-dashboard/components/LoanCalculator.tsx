"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import { HoverTip, InfoTip, StatTip } from "@/components/InfoTooltip";

type MonthRev = { month: number; revenue: number };

function ChartHeading({ title, tip }: { title: string; tip: ReactNode }) {
  return (
    <div className="mb-1 flex items-center gap-1.5">
      <p className="text-xs font-medium text-sage-600">{title}</p>
      <InfoTip title={title}>{tip}</InfoTip>
    </div>
  );
}

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
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const calc = useMemo(() => {
    const months = years * 12;
    const monthlyRate = rate / 100 / 12;
    const flatPayment =
      monthlyRate > 0
        ? (amount * monthlyRate * (1 + monthlyRate) ** months) /
          ((1 + monthlyRate) ** months - 1)
        : amount / months;

    const totalRev = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);
    const maxMonthRev = Math.max(...monthlyRevenue.map((m) => m.revenue));

    const schedule = monthlyRevenue.map((m) => {
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
          <span className="flex items-center gap-1.5">
            Loan amount ($)
            <InfoTip title="Loan amount">
              Principal you&apos;re borrowing (e.g. for sensors, automation, or operating
              credit. Drag the slider to see how payment size and break-even shift.
            </InfoTip>
          </span>
          <input
            type="range"
            min={10000}
            max={500000}
            step={5000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="range-input mt-1 w-full"
          />
          <span className="font-medium">${amount.toLocaleString()}</span>
        </label>

        <label className="text-sm">
          <span className="flex items-center gap-1.5">
            Interest rate (%)
            <InfoTip title="Interest rate">
              Annual percentage rate (APR). A higher rate raises both your monthly payment
              and total interest over the full term.
            </InfoTip>
          </span>
          <input
            type="range"
            min={2}
            max={12}
            step={0.25}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="range-input mt-1 w-full"
          />
          <span className="font-medium">{rate}%</span>
        </label>

        <label className="text-sm">
          <span className="flex items-center gap-1.5">
            Term (years)
            <InfoTip title="Loan term">
              How long you spread repayments over. Longer terms mean smaller monthly
              payments but more total interest paid by the end.
            </InfoTip>
          </span>
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

        <div className="text-sm">
          <span className="flex items-center gap-1.5">
            Repayment schedule
            <InfoTip title="Repayment schedule">
              Choose whether payments stay flat each month or flex with your harvest
              revenue. Hover each option for details.
            </InfoTip>
          </span>
          <div className="mt-1 flex gap-2">
            <HoverTip
              className="flex-1"
              title="Monthly"
              align="left"
              tip={
                <>
                  Fixed equal payment every month, no matter when revenue peaks. Simple to
                  budget, but can feel tight during low-cash months between harvests.
                </>
              }
            >
              <button
                type="button"
                onClick={() => setHarvestAligned(false)}
                className={`w-full rounded px-3 py-2 transition ${
                  !harvestAligned
                    ? "bg-sage-700 text-white"
                    : "bg-sage-100 text-sage-800 hover:bg-sage-200"
                }`}
              >
                Monthly
              </button>
            </HoverTip>
            <HoverTip
              className="flex-1"
              title="Match harvest cycle"
              align="right"
              tip={
                <>
                  Payments scale with your actual monthly revenue: heavier when harvest
                  cash comes in, lighter in quiet months. Total repaid stays the same;
                  only the timing follows your season.
                </>
              }
            >
              <button
                type="button"
                onClick={() => setHarvestAligned(true)}
                className={`w-full rounded px-3 py-2 transition ${
                  harvestAligned
                    ? "bg-sage-700 text-white"
                    : "bg-sage-100 text-sage-800 hover:bg-sage-200"
                }`}
              >
                Match harvest cycle
              </button>
            </HoverTip>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <StatTip
          value={`$${calc.flatPayment.toFixed(0)}/mo`}
          label="Payment"
          tip={
            harvestAligned
              ? "Average monthly payment. Individual months vary: higher when revenue peaks, lower in off-season."
              : "Fixed monthly payment based on your amount, rate, and term."
          }
        />
        <StatTip
          value={`$${calc.totalInterest.toFixed(0)}`}
          label="Total interest"
          tip="Extra cost above the principal if you pay on schedule for the full term. Does not include fees or insurance."
        />
        <StatTip
          value={`${calc.breakEvenSeasons} seasons`}
          label="Break-even"
          tip={`Seasons until your projected precision benefit (~$${precisionBenefitPerSeason.toLocaleString()}/season) covers the loan principal.`}
        />
      </div>

      <div className="mt-4">
        <ChartHeading
          title="Revenue vs repayment by month"
          tip="Green bars are your farm's monthly revenue; blue bars are loan repayments. In harvest-aligned mode, repayments rise and fall with revenue so cash flow stays easier to manage."
        />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={calc.schedule}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill={COLORS.healthy} />
            <Bar dataKey="payment" name="Repayment" fill="#2563EB" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4">
        <ChartHeading
          title="Loan balance vs precision benefit"
          tip="Red line shows remaining loan balance declining over time. Green line stacks your estimated precision-ag benefit season by season. Where they cross is roughly when the investment pays for itself."
        />
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={calc.balanceCurve}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="loanBalance" name="Loan balance" stroke={COLORS.critical} />
            <Line
              type="monotone"
              dataKey="cumulativeBenefit"
              name="Precision benefit"
              stroke={COLORS.healthy}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-sm text-sage-700">
        At your current precision benefit of ~${precisionBenefitPerSeason.toLocaleString()}
        /season, this loan pays for itself in about {calc.breakEvenSeasons} seasons.
      </p>

      <div className="mt-3 border-t border-sage-100 pt-3">
        <button
          type="button"
          onClick={() => setShowHowItWorks((o) => !o)}
          aria-expanded={showHowItWorks}
          className="flex items-center gap-1.5 text-xs font-medium text-sage-600 transition hover:text-sage-900"
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform ${showHowItWorks ? "rotate-90" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
          How this planner works
        </button>
        {showHowItWorks && (
          <div className="mt-2 space-y-2 text-xs leading-relaxed text-sage-600">
            <p>
              Payments are estimated from a standard amortizing loan formula using your
              inputs above. Harvest-aligned mode weights each month&apos;s payment by your
              farm&apos;s actual revenue curve. It doesn&apos;t change the total owed,
              only when you pay it.
            </p>
            <p>
              Break-even compares the loan principal to your projected precision-ag benefit
              from this season&apos;s data. This is a planning tool, not a loan offer. Real
              terms may include fees, prepayment rules, or collateral requirements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
