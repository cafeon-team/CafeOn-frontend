"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import FilterChips, { FilterKey } from "@/components/FilterChips";
import CafeListCard from "@/components/CafeListCard";
import { useWishlist } from "@/lib/wishlist-store";

function SearchContent() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState<FilterKey>("전체");
  const { cafes, toggleLike } = useWishlist();

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cafes;
    return cafes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
    );
  }, [cafes, query]);

  const counts = useMemo(
    () => ({
      전체: searched.length,
      여유: searched.filter((c) => c.status === "여유").length,
      주의: searched.filter((c) => c.status === "주의").length,
      혼잡: searched.filter((c) => c.status === "혼잡").length,
    }),
    [searched]
  );

  const filtered = searched.filter(
    (c) => filter === "전체" || c.status === filter
  );

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-cream">
        <div className="px-4 pt-5">
          <SearchBar value={query} onChange={setQuery} autoFocus />
        </div>
        <FilterChips
          options={["전체", "여유", "주의", "혼잡"]}
          value={filter}
          onChange={setFilter}
          counts={{
            전체: counts.전체,
            여유: counts.여유,
            주의: counts.주의,
            혼잡: counts.혼잡,
          }}
        />
      </div>

      <div className="flex flex-col gap-4 px-4 pb-6">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-ink-secondary">
            검색 결과가 없어요
          </p>
        ) : (
          filtered.map((cafe) => (
            <CafeListCard key={cafe.id} cafe={cafe} onToggleLike={toggleLike} />
          ))
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}
