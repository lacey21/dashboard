/** Simple leaf mark for GreenLeaf AI — not a sparkle / generic AI logo. */
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
      <path
        d="M8 13.25V8.75"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path
        d="M8 8.75C8 8.75 4.25 7.75 4.25 5.25C4.25 2.85 5.85 1.75 8 1.75C10.15 1.75 11.75 2.85 11.75 5.25C11.75 7.75 8 8.75 8 8.75Z"
        fill="currentColor"
      />
      <path
        d="M8 8.25V3"
        stroke="currentColor"
        strokeWidth="0.85"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}
