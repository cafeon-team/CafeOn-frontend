"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export default function Header({
  title,
  right,
  onBack,
}: {
  title?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-border bg-white px-2">
      <button
        aria-label="뒤로가기"
        onClick={() => (onBack ? onBack() : router.back())}
        className="flex h-9 w-9 shrink-0 items-center justify-center text-ink"
      >
        <ChevronLeft size={24} strokeWidth={2} />
      </button>
      {title && (
        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[17px] font-bold text-ink">
          {title}
        </h1>
      )}
      <div className="ml-auto">{right}</div>
    </header>
  );
}
