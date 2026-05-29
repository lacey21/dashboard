import Image from "next/image";

type UseCaseIconProps = {
  src: string;
  size?: number;
  /** `light` for dark backgrounds (sidebar); `dark` for light backgrounds (overview cards). */
  variant?: "light" | "dark";
};

export function UseCaseIcon({ src, size = 26, variant = "light" }: UseCaseIconProps) {
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 object-contain ${variant === "light" ? "mix-blend-lighten" : "invert"}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
