"use client";

import { useRef } from "react";
import { Camera, X } from "lucide-react";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { resolveImageUrl } from "@/lib/api";

export default function ImageUploadField({
  value,
  onChange,
  onFile,
  rounded = "rounded-xl",
  size = "h-16 w-16",
  badgeSize = "h-6 w-6",
  badgeIconSize = 12,
  badgeOffset = "-bottom-1.5 -right-1.5",
  badgeColor = "bg-trust",
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  /** 선택한 원본 파일이 필요할 때(서버 업로드 등) 함께 받을 수 있어요. */
  onFile?: (file: File | null) => void;
  rounded?: string;
  size?: string;
  /** 카메라 배지 크기 (아바타가 클수록 크게 줘야 비율이 맞아요) */
  badgeSize?: string;
  badgeIconSize?: number;
  /** 배지를 원 안쪽으로 더 붙이고 싶으면 -bottom-0.5 -right-0.5 처럼 좁게 지정 */
  badgeOffset?: string;
  /** 카메라 배지 배경색. 사장님 화면은 trust(파랑), 손님 화면은 brand(주황)처럼 구분해서 써요 */
  badgeColor?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // 서버가 준 상대 경로("/storage/...")를 절대 URL로 바꿔서 보여줘요.
  // 새로 고른 파일의 미리보기(data URL)나 이미 완전한 URL은 그대로 통과돼요.
  const resolvedValue = resolveImageUrl(value);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    onFile?.(file);
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className={`relative ${size} shrink-0`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {resolvedValue ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedValue}
          alt="업로드된 이미지"
          className={`h-full w-full object-cover ${rounded}`}
        />
      ) : (
        <ImagePlaceholder className={`h-full w-full ${size}`} rounded={rounded} />
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="이미지 업로드"
        className={`absolute ${badgeOffset} flex ${badgeSize} items-center justify-center rounded-full border-2 border-white ${badgeColor} text-white shadow-sheet`}
      >
        <Camera size={badgeIconSize} strokeWidth={2.4} />
      </button>

      {value && (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            onFile?.(null);
          }}
          aria-label="이미지 삭제"
          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-ink-secondary text-white"
        >
          <X size={10} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
