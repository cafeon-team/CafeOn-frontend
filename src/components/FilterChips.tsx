"use client";

import type { SeatStatus } from "@/lib/data";

export type FilterKey = "전체" | SeatStatus;

const activeStyles: Record<FilterKey, string> = {
  전체: "bg-brand text-white border-brand",
  여유: "bg-sage-tint text-sage-dark border-sage",
  주의: "bg-amber-tint text-amber-dark border-amber",
  혼잡: "bg-brand-tint text-brand-dark border-brand-dark",
};

const idleStyles: Record<FilterKey, string> = {
  전체: "bg-white text-ink-secondary border-border",
  여유: "bg-white text-sage-dark border-sage",
  주의: "bg-white text-amber-dark border-amber",
  혼잡: "bg-white text-brand-dark border-brand-dark",
};

export default function FilterChips({
  options,
  value,
  onChange,
  counts,
}: {
  options: FilterKey[];
  value: FilterKey;
  onChange: (v: FilterKey) => void;
  counts?: Partial<Record<FilterKey, number>>;
}) {
  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 pb-3 pt-4">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={
              "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13.5px] font-bold transition-colors " +
              (active ? activeStyles[opt] : idleStyles[opt])
            }
          >
            {opt}
            {counts?.[opt] !== undefined ? ` ${counts[opt]}` : ""}
          </button>
        );
      })}
    </div>
  );
}
