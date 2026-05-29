import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  /** Wrap in a link to the overview page. */
  link?: boolean;
  /** Slightly smaller text for the mobile top bar. */
  compact?: boolean;
  className?: string;
};

export function BrandMark({ link = true, compact = false, className = "" }: BrandMarkProps) {
  const content = (
    <span className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <Image
        src="/images/logo.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 object-contain mix-blend-lighten"
        aria-hidden
        priority
      />
      <span
        className={`min-w-0 truncate font-bold tracking-tight ${compact ? "text-sm" : "text-base"}`}
      >
        <span className="text-sage-50">GreenLeaf</span>
        <span className="text-sage-300"> CEA</span>
      </span>
    </span>
  );

  if (link) {
    return (
      <Link href="/" className="block transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
