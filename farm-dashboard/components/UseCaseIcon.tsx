import Image from "next/image";

export function UseCaseIcon({ src, size = 26 }: { src: string; size?: number }) {
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain mix-blend-lighten"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
