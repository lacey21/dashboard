import AlertTriagePage from "@/components/AlertTriagePage";
import Link from "next/link";

export default function Page() {
  return (
    <>
      <nav className="border-b border-sage-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-2 text-sm">
          <Link href="/" className="text-sage-600 hover:text-sage-900">
            GreenLeaf CEA
          </Link>
          <span className="text-sage-300">/</span>
          <span className="font-medium text-sage-900">Alert Triage</span>
        </div>
      </nav>
      <AlertTriagePage />
    </>
  );
}
