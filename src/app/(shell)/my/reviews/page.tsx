"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import StarRating from "@/components/StarRating";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { useReviews } from "@/lib/reviews-store";
import { resolveImageUrl } from "@/lib/api";

export default function MyReviewsPage() {
  const { reviews, removeReview } = useReviews();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="flex flex-col">
      <Header title="리뷰 관리" />

      <div className="flex flex-col gap-4 px-6 pt-6 pb-8">
        {reviews.length === 0 && (
          <p className="mt-16 text-center text-[14px] text-ink-muted">
            작성한 리뷰가 없어요.
          </p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-white p-5">
            <Link href={`/cafe/${r.cafeId}`} className="flex items-center justify-between">
              <p className="text-[16px] font-bold text-ink">{r.cafeName}</p>
              <ChevronRight size={17} className="text-ink-muted" />
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <StarRating rating={r.rating} />
              <span className="text-[12.5px] text-ink-muted">{r.date}</span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-[14px] leading-relaxed text-ink-secondary">
                {r.content}
              </p>
              <div className="flex shrink-0 gap-3 text-[12.5px] text-ink-muted">
                <Link href={`/my/reviews/write?reviewId=${r.id}`}>수정</Link>
                <button onClick={() => setConfirmDeleteId(r.id)}>삭제</button>
              </div>
            </div>
            {/* 리뷰 작성/수정 화면에서 첨부한 사진을 여기서도 보여줘요. 카페 상세
                화면의 리뷰 탭과 같은 방식(ImagePlaceholder + resolveImageUrl)으로
                썸네일을 그려요. */}
            {(r.images?.length ?? 0) > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {r.images!.map((src, i) => (
                  <ImagePlaceholder
                    key={`${src}-${i}`}
                    className="h-16 w-16 shrink-0"
                    iconSize={14}
                    src={resolveImageUrl(src)}
                    alt={`리뷰 사진 ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[320px] rounded-2xl bg-white p-6">
            <p className="text-[16px] font-bold text-ink">리뷰를 삭제할까요?</p>
            <p className="mt-1.5 text-[13.5px] text-ink-secondary">
              삭제한 리뷰는 다시 되돌릴 수 없어요.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="h-11 flex-1 rounded-xl border border-border text-[14px] font-bold text-ink-secondary"
              >
                취소
              </button>
              <button
                onClick={() => {
                  removeReview(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="h-11 flex-1 rounded-xl bg-brand text-[14px] font-bold text-white"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
