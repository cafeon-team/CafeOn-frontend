"use client";

import { useState } from "react";
import Header from "@/components/Header";
import FilterChips, { FilterKey } from "@/components/FilterChips";
import CafeListCard from "@/components/CafeListCard";
import { useWishlist } from "@/lib/wishlist-store";

export default function WishlistPage() {
  const [filter, setFilter] = useState<FilterKey>("전체");
  const { cafes, toggleLike } = useWishlist();

  const filtered = cafes
    .filter((c) => c.liked)
    .filter((c) => filter === "전체" || c.status === filter);

  return (
    <div className="flex flex-col">
      <Header title="찜한 카페" />
      <FilterChips
        options={["전체", "여유", "주의", "혼잡"]}
        value={filter}
        onChange={setFilter}
      />
      <div className="flex flex-col gap-4 px-4 pb-6 pt-2">
        {filtered.length === 0 && (
          <p className="mt-16 text-center text-[14px] text-ink-muted">
            찜한 카페가 없어요.
          </p>
        )}
        {filtered.map((cafe) => (
          <CafeListCard key={cafe.id} cafe={cafe} onToggleLike={toggleLike} showUpdatedAt />
        ))}
      </div>
    </div>
  );
}
