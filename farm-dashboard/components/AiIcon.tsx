/** Magnifying glass for Ask GreenLeaf AI — search your farm data. */
export function AiIcon({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="6.75" cy="6.75" r="4" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M9.9 9.9L13.25 13.25"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
