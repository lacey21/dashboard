import StressSimulatorPage from "@/components/StressSimulatorPage";
import Link from "next/link";

export const metadata = {
  title: "Stress Simulator — GreenLeaf CEA",
};

export default function Page() {
  return (
    <>
      <nav className="border-b border-sage-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2 text-sm">
          <Link href="/" className="text-sage-600 hover:text-sage-900">
            GreenLeaf CEA
          </Link>
          <span className="text-sage-300">/</span>
          <Link href="/alert-triage" className="text-sage-600 hover:text-sage-900">
            Alert Triage
          </Link>
          <span className="text-sage-300">/</span>
          <span className="font-medium text-sage-900">Stress Simulator</span>
        </div>
      </nav>
      <StressSimulatorPage />
    </>
  );
}
