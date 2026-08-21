"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * 폼에서 쓰는 라벨 + 전체 너비 드롭다운 필드.
 * 브라우저 기본 <select>는 옵션 목록 디자인을 커스텀할 수 없어서,
 * 카드형 리스트(SortDropdown과 동일한 톤)로 직접 그려요.
 */
export default function FieldSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  color = "brand",
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  color?: "brand" | "trust";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeColor = color === "trust" ? "text-trust" : "text-brand";
  const ringColor = color === "trust" ? "focus:ring-trust/30" : "focus:ring-brand/30";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <label className="text-[14px] text-ink-secondary">{label}</label>
      <div className="relative mt-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={
            "flex h-14 w-full items-center justify-between rounded-2xl border bg-white px-5 text-[16px] text-ink focus:outline-none focus:ring-2 " +
            ringColor +
            (open ? " border-brand/40" : " border-border")
          }
        >
          {value}
          <ChevronDown
            size={18}
            className={"text-ink-muted transition-transform " + (open ? "rotate-180" : "")}
          />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-64 overflow-y-auto rounded-2xl border border-border bg-white py-2 shadow-sheet">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={
                  "flex w-full items-center justify-between px-5 py-3 text-left text-[15px] " +
                  (opt === value ? activeColor + " font-bold" : "text-ink font-medium")
                }
              >
                {opt}
                {opt === value && <Check size={16} className={activeColor} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
