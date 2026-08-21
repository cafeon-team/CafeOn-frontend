"use client";

import { Star } from "lucide-react";

export default function StarRating({
  rating,
  size = 16,
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
}) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1">
      {stars.map((n) => {
        const filled = n <= Math.round(rating);
        return (
          <button
            key={n}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(n)}
            className={interactive ? "cursor-pointer" : "cursor-default"}
          >
            <Star
              size={size}
              className={filled ? "fill-brand text-brand" : "text-border"}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
