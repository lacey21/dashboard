type UseCaseIconProps = {
  src: string;
  size?: number;
  /** `light` for dark backgrounds (sidebar); `dark` for light backgrounds (overview cards). */
  variant?: "light" | "dark";
};

/** Static public icons — plain img avoids Next.js image optimizer cache on file swaps. */
export function UseCaseIcon({ src, size = 26, variant = "light" }: UseCaseIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 object-contain ${variant === "light" ? "brightness-0 invert" : "brightness-0"}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
