import { ImageIcon } from "lucide-react";

export default function ImagePlaceholder({
  className = "",
  rounded = "rounded-xl",
  iconSize = 22,
  src,
  alt = "",
}: {
  className?: string;
  rounded?: string;
  iconSize?: number;
  /** 실제로 보여줄 이미지 URL. 있으면 이 이미지를 렌더링하고, 없으면 기존
   * 회색 아이콘 플레이스홀더로 폴백해요. */
  src?: string | null;
  alt?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`bg-[#DDD9CC] object-cover ${rounded} ${className}`}
      />
    );
  }

  return (
    <div
      className={
        `flex items-center justify-center bg-[#DDD9CC] text-ink-muted/70 ${rounded} ` +
        className
      }
    >
      <ImageIcon size={iconSize} strokeWidth={1.5} />
    </div>
  );
}
