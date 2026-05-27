"use client";

import { useState } from "react";
import { useData } from "@/hooks/useData";
import { GeminiInsight } from "@/components/GeminiInsight";
import { RiskCard } from "@/components/RiskCard";
import { SustainabilityRadar } from "@/charts/RadarChart";
import { scoreColor } from "@/constants/colors";

type SustainData = {
  overallScore: number;
  subscores: Record<string, number>;
  weakestCategory: string;
  strongestCategory: string;
  weakestScore: number;
  strongestScore: number;
  farm: { farmName: string; region: string; climateZone: string; primaryCrop: string };
  benchmarks: { energyPerKg: number; waterPerKg: number };
  risks: { id: string; icon: string; title: string; level: "critical" | "warning" | "healthy"; oneliner: string }[];
  controlBaseline: Record<string, number>;
};

const CATEGORY_LABELS: Record<string, string> = {
  energyIntensity: "Energy intensity",
  waterEfficiency: "Water efficiency",
  chemicalLoad: "Chemical load",
};

export default function SustainabilityPage({ embedded = false }: { embedded?: boolean }) {
  const { data, loading } = useData<SustainData>("sustainability.json");
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (loading || !data) {
    return (
      <p className={embedded ? "py-4 text-sage-700" : "p-8 text-sage-700"}>
        Loading sustainability scorecard…
      </p>
    );
  }

  const scoreLabel =
    data.overallScore >= 75 ? "Strong" : data.overallScore >= 50 ? "Developing" : "At Risk";

  const farmPrompt = `You are an agricultural sustainability advisor. In 3-4 sentences, give this BC greenhouse farm
personalized recommendations for improving their sustainability score. Be specific and practical.

Farm: ${data.farm.farmName}, ${data.farm.region}, ${data.farm.climateZone}
Primary crop: ${data.farm.primaryCrop}
Overall sustainability score: ${data.overallScore}/100
Weakest sub-score: ${data.weakestCategory} (${data.weakestScore}/100)
Strongest sub-score: ${data.strongestCategory} (${data.strongestScore}/100)`;

  const dynamicSentence = `Your biggest opportunity is improving ${data.weakestCategory.toLowerCase()} (${data.weakestScore}/100). Your strongest area is ${data.strongestCategory.toLowerCase()} (${data.strongestScore}/100).`;

  const Wrapper = embedded ? "div" : "main";
  const wrapClass = embedded ? "" : "mx-auto max-w-7xl px-6 py-8";

  return (
    <Wrapper className={wrapClass}>
      <h2 className={embedded ? "text-xl font-bold text-sage-900" : "text-2xl font-bold text-sage-900"}>
        Beyond this season&apos;s profit
      </h2>
      <p className="mt-1 text-sage-700">Here&apos;s how resilient and future-proof this operation is.</p>

      <div className="mt-10 text-center">
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="mx-auto block"
        >
          <p
            className="text-6xl font-bold"
            style={{ color: scoreColor(data.overallScore) }}
          >
            {data.overallScore}
          </p>
          <p className="text-lg text-sage-700">Overall Sustainability Score · {scoreLabel}</p>
        </button>
        <p className="mx-auto mt-3 max-w-xl text-sm text-sage-700">{dynamicSentence}</p>
        <GeminiInsight prompt={farmPrompt} autoRun label="farm recommendations" />
        <button
          type="button"
          className="mt-4 text-sm text-sage-700 underline"
          onClick={() => setShowBreakdown(!showBreakdown)}
        >
          {showBreakdown ? "Hide breakdown" : "See breakdown"}
        </button>
      </div>

      {showBreakdown && (
        <>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {(["energyIntensity", "waterEfficiency", "chemicalLoad"] as const).map((key) => (
              <CategoryCard
                key={key}
                title={CATEGORY_LABELS[key]}
                score={data.subscores[key]}
                caption={
                  key === "energyIntensity"
                    ? "How efficiently this farm converts energy spending into crop output"
                    : key === "waterEfficiency"
                      ? "How well irrigation is matched to crop needs"
                      : "How much chemical input this operation relies on"
                }
                farm={data.farm}
                riskName={CATEGORY_LABELS[key]}
              />
            ))}
          </div>

          <div className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between rounded border border-sage-100 bg-white px-4 py-3">
              <span>Stress management</span>
              <span className="font-bold">{data.subscores.stressManagement}/100</span>
            </div>
            <div className="flex justify-between rounded border border-sage-100 bg-white px-4 py-3">
              <span>Precision adoption</span>
              <span className="font-bold">{data.subscores.precisionAdoption}/100</span>
            </div>
          </div>

          <section className="mt-10">
            <h2 className="mb-4 font-semibold text-sage-900">All dimensions vs control</h2>
            <SustainabilityRadar subscores={data.subscores} controlBaseline={data.controlBaseline} />
          </section>
        </>
      )}

      <section className="mt-12">
        <h2 className="mb-4 font-semibold text-sage-900">Risk watchlist</h2>
        <p className="mb-6 text-sm text-sage-700">
          Tap any card for three AI-generated actions tailored to your sensor and scouting data.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.risks.map((risk) => (
            <RiskCard
              key={risk.id}
              icon={risk.icon}
              title={risk.title}
              level={risk.level}
              oneliner={risk.oneliner}
              geminiPrompt={`You are an agricultural sustainability advisor for a BC greenhouse farm.
Give exactly 3 specific, actionable recommendations to reduce ${risk.title} risk.
Be practical and specific to their situation. Plain English, no jargon.
Each recommendation is 1-2 sentences.

Farm: ${data.farm.farmName}, ${data.farm.region}, ${data.farm.climateZone}
Primary crop: ${data.farm.primaryCrop}
Risk level: ${risk.level}
Key signals: ${risk.oneliner}`}
            />
          ))}
        </div>
      </section>
    </Wrapper>
  );
}

function CategoryCard({
  title,
  score,
  caption,
  farm,
  riskName,
}: {
  title: string;
  score: number;
  caption: string;
  farm: SustainData["farm"];
  riskName: string;
}) {
  const prompt = `You are an agricultural sustainability advisor. Give 2 specific recommendations to improve ${riskName} for ${farm.farmName} (${farm.climateZone}), primary crop ${farm.primaryCrop}. Score: ${score}/100. Plain English.`;

  return (
    <div className="rounded-lg border border-sage-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-sage-700">{title}</p>
      <p className="text-3xl font-bold" style={{ color: scoreColor(score) }}>
        {score}
      </p>
      <p className="mt-2 text-xs text-sage-700">{caption}</p>
      <GeminiInsight prompt={prompt} label={`${title} tips`} />
    </div>
  );
}
