"use client";

import { Search, X } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  placeholder = "카페명 · 지역 검색",
  autoFocus,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  return (
    <div className="flex h-14 items-center gap-2 rounded-full bg-white px-5 shadow-card">
      <button
        type="button"
        aria-label="검색"
        onClick={() => onSubmit?.()}
        className="shrink-0 text-ink-muted"
      >
        <Search size={19} />
      </button>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit?.();
        }}
        placeholder={placeholder}
        className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
      />
      {value && (
        <button
          aria-label="지우기"
          onClick={() => onChange("")}
          className="shrink-0 text-ink-muted"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
