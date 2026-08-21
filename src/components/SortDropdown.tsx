"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export default function SortDropdown<T extends string>({
  value,
  options,
  onChange,
  color = "brand",
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  color?: "brand" | "trust";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeColor = color === "trust" ? "text-trust" : "text-brand";

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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1 rounded-full border border-border bg-white pl-4 pr-3 text-[13px] font-bold text-ink-secondary"
      >
        {value}
        <ChevronDown
          size={14}
          className={"text-ink-muted transition-transform " + (open ? "rotate-180" : "")}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 min-w-[120px] overflow-hidden rounded-2xl border border-border bg-white py-1 shadow-sheet">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={
                "flex w-full items-center justify-between px-4 py-2.5 text-left text-[13.5px] font-medium " +
                (opt === value ? activeColor + " font-bold" : "text-ink")
              }
            >
              {opt}
              {opt === value && <Check size={14} className={activeColor} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
