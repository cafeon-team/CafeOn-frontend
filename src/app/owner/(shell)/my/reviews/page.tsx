"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import Header from "@/components/Header";
import SortDropdown from "@/components/SortDropdown";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { useOwner } from "@/lib/owner-store";
import { resolveImageUrl } from "@/lib/api";

const SORT_OPTIONS = ["최신순", "오래된순"] as const;

export default function OwnerReviewsPage() {
  const { reviews, replyToReview, deleteReviewReply } = useOwner();
  const [tab, setTab] = useState<"전체 리뷰" | "답변 완료">("전체 리뷰");
  const [sort, setSort] = useState<"최신순" | "오래된순">("최신순");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmDeleteReplyId, setConfirmDeleteReplyId] = useState<string | null>(null);

  const startReply = (id: string, current: string | null) => {
    setEditingId(id);
    setDraft(current ?? "");
  };

  const submit = () => {
    if (!editingId) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    replyToReview(editingId, trimmed);
    setEditingId(null);
    setDraft("");
  };

  const visibleReviews = useMemo(() => {
    const base = reviews.filter((rv) =>
      tab === "답변 완료" ? Boolean(rv.reply) : true
    );
    const sorted = [...base].sort((a, b) =>
      sort === "최신순" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    );
    return sorted;
  }, [reviews, tab, sort]);

  return (
    <div className="flex flex-col">
      <Header title="리뷰 관리" />

      <div className="flex border-b border-border px-6">
        {(["전체 리뷰", "답변 완료"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "flex-1 border-b-2 py-3 text-[15px] font-bold " +
              (tab === t ? "border-trust text-trust" : "border-transparent text-ink-muted")
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-6 pt-5">
        <p className="text-[16px] font-bold text-ink">
          전체 <span className="text-trust">{visibleReviews.length}</span>
        </p>
        <SortDropdown
          value={sort}
          options={SORT_OPTIONS}
          onChange={setSort}
          color="trust"
        />
      </div>

      <div className="flex flex-col gap-4 px-6 py-5">
        {visibleReviews.length === 0 && (
          <p className="mt-16 text-center text-[14px] text-ink-muted">
            {tab === "답변 완료" ? "답변을 남긴 리뷰가 없어요." : "등록된 리뷰가 없어요."}
          </p>
        )}

        {visibleReviews.map((rv) => (
          <div
            key={rv.id}
            className="rounded-2xl border border-border bg-white p-5"
          >
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < Math.round(rv.rating)
                        ? "fill-brand text-brand"
                        : "fill-border text-border"
                    }
                  />
                ))}
              </div>
              <span className="text-[15px] font-bold text-ink">
                {rv.rating.toFixed(1)}
              </span>
              <span className="text-[12.5px] text-ink-muted">{rv.date}</span>
            </div>
            <p className="mt-1.5 text-[15px] font-bold text-ink">
              {rv.customerName}
            </p>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-secondary">
              {rv.content}
            </p>

            {rv.images.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {rv.images.map((src, i) => (
                  <ImagePlaceholder
                    key={`${src}-${i}`}
                    className="h-16 w-16 shrink-0"
                    iconSize={14}
                    src={resolveImageUrl(src)}
                    alt={`${rv.customerName} 리뷰 사진 ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {rv.reply && editingId !== rv.id && (
              <div className="mt-3 rounded-xl bg-trust-tint/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-bold text-trust">
                    사장님 답글
                  </p>
                  <div className="flex items-center gap-3 text-[12px] font-bold text-ink-muted">
                    <button onClick={() => startReply(rv.id, rv.reply)}>수정</button>
                    <button onClick={() => setConfirmDeleteReplyId(rv.id)}>삭제</button>
                  </div>
                </div>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-secondary">
                  {rv.reply}
                </p>
              </div>
            )}

            {editingId === rv.id ? (
              <div className="mt-3 flex flex-col gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="답글을 남겨보세요"
                  className="w-full rounded-xl border border-border bg-white p-3 text-[14px] outline-none focus:border-trust"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setDraft("");
                    }}
                    className="h-9 rounded-lg px-3 text-[13px] font-bold text-ink-muted"
                  >
                    취소
                  </button>
                  <button
                    onClick={submit}
                    disabled={!draft.trim()}
                    className="h-9 rounded-lg bg-trust px-4 text-[13px] font-bold text-white disabled:opacity-50"
                  >
                    등록
                  </button>
                </div>
              </div>
            ) : (
              !rv.reply && (
                <div className="mt-3 flex justify-start">
                  <button
                    onClick={() => startReply(rv.id, rv.reply)}
                    className="rounded-full border border-trust px-4 py-1.5 text-[13px] font-bold text-trust"
                  >
                    답변하기
                  </button>
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {confirmDeleteReplyId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[320px] rounded-2xl bg-white p-6">
            <p className="text-[16px] font-bold text-ink">답글을 삭제할까요?</p>
            <p className="mt-1.5 text-[13.5px] text-ink-secondary">
              삭제한 답글은 다시 되돌릴 수 없어요. (리뷰 자체는 지워지지 않아요)
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmDeleteReplyId(null)}
                className="h-11 flex-1 rounded-xl border border-border text-[14px] font-bold text-ink-secondary"
              >
                취소
              </button>
              <button
                onClick={() => {
                  deleteReviewReply(confirmDeleteReplyId);
                  setConfirmDeleteReplyId(null);
                }}
                className="h-11 flex-1 rounded-xl bg-trust text-[14px] font-bold text-white"
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

