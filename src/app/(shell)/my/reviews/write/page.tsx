"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import Header from "@/components/Header";
import Button from "@/components/Button";
import StarRating from "@/components/StarRating";
import Toast from "@/components/Toast";
import { useReviews } from "@/lib/reviews-store";
import { useStores } from "@/lib/stores-store";
import { apiUploadImage, resolveImageUrl } from "@/lib/api";

/** 첨부 사진 한 장의 상태.
 * - 새로 고른 파일: file이 있고 url은 아직 없음(제출 시 업로드해서 채움).
 * - 리뷰 수정 화면에서 불러온 기존 사진: url만 있고 file은 없음(이미 서버에 있는
 *   사진이라 다시 업로드하지 않아요). */
type PhotoItem = {
  key: string;
  preview: string;
  file?: File;
  url?: string;
};

function ReviewWriteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { getReview, addReview, updateReview } = useReviews();
  const { getCafe } = useStores();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reviewId = params.get("reviewId");
  const existingReview = reviewId ? getReview(reviewId) : undefined;
  const isEdit = Boolean(existingReview);

  const cafeId = existingReview?.cafeId ?? params.get("cafeId") ?? "";
  const cafe = getCafe(cafeId);
  const cafeName = existingReview?.cafeName ?? cafe?.name ?? "카페";

  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [content, setContent] = useState(existingReview?.content ?? "");
  // ⚠️ 예전엔 파일을 골라도 FileReader로 만든 미리보기(base64 dataURL)만 이
  // 화면 상태에 남고, 등록 버튼을 눌러도 그 사진을 실제로 어디에도 업로드하지
  // 않았어요(addReview/updateReview에 photos를 아예 넘기지 않았어요). 그래서
  // "사진" 탭에는 아무것도 안 보였어요. 이제 파일도 함께 들고 있다가, 제출할 때
  // POST /api/uploads/images로 실제 업로드해서 그 URL을 리뷰에 저장해요.
  const [photos, setPhotos] = useState<PhotoItem[]>(
    () =>
      existingReview?.images?.map((url, i) => ({
        key: `existing-${i}`,
        preview: resolveImageUrl(url) ?? url,
        url,
      })) ?? []
  );
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 4 - photos.length;
    Array.from(files)
      .slice(0, remaining)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            setPhotos((prev) => [
              ...prev,
              { key: `${file.name}-${Date.now()}-${Math.random()}`, preview: reader.result as string, file },
            ]);
          }
        };
        reader.readAsDataURL(file);
      });
  };

  const handleSubmit = async () => {
    setError(null);
    setUploading(true);
    try {
      // 아직 업로드 안 한(=새로 고른) 사진들만 실제로 서버에 업로드해요. 이미
      // url이 있는 사진(수정 화면에서 불러온 기존 사진)은 다시 업로드하지 않아요.
      const uploaded = await Promise.all(
        photos.map(async (p) => {
          if (p.url) return p.url;
          if (!p.file) return null;
          const url = await apiUploadImage(p.file, "customer");
          return url;
        })
      );
      const images = uploaded.filter((u): u is string => Boolean(u));

      if (existingReview) {
        updateReview(existingReview.id, { rating, content, images });
      } else {
        addReview({ cafeId, cafeName, rating, content, images });
      }
      setSaved(true);
      setTimeout(() => router.push("/my/reviews"), 900);
    } catch {
      setError("사진 업로드 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <Header title={isEdit ? "리뷰 수정" : "리뷰 작성"} />

      <div className="px-6 pt-6">
        <h2 className="text-[20px] font-bold text-ink">{cafeName}</h2>
        <p className="mt-1 text-[13.5px] text-ink-muted">
          {isEdit ? "리뷰 내용을 수정해주세요" : "방문 후기를 남겨주세요"}
        </p>

        <p className="mt-7 text-[15px] font-bold text-ink">별점</p>
        <div className="mt-2">
          <StarRating rating={rating} size={30} interactive onChange={setRating} />
        </div>

        <p className="mt-7 text-[15px] font-bold text-ink">리뷰 내용</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="카페에 대한 솔직한 후기를 남겨주세요."
          rows={6}
          className="mt-2 w-full resize-none rounded-2xl border border-border bg-white px-5 py-4 text-[15px] text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
        />

        <p className="mt-7 text-[15px] font-bold text-ink">사진 추가 (선택)</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="mt-2 flex flex-wrap gap-3">
          {photos.map((p, i) => (
            <div
              key={p.key}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt={`첨부 사진 ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="사진 삭제"
                onClick={() => setPhotos((prev) => prev.filter((item) => item.key !== p.key))}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-white"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {photos.length < 4 && (
            <button
              type="button"
              aria-label="사진 추가"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border bg-white"
            >
              <Plus size={22} className="text-ink-muted" />
            </button>
          )}
        </div>

        {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

        <div className="mb-8 mt-10">
          <Button onClick={handleSubmit} disabled={!content.trim() || uploading}>
            {uploading ? "저장 중..." : isEdit ? "리뷰 수정하기" : "리뷰 등록하기"}
          </Button>
        </div>
      </div>

      <Toast show={saved} message={isEdit ? "리뷰가 수정되었습니다" : "리뷰가 등록되었습니다"} />
    </div>
  );
}

export default function ReviewWritePage() {
  return (
    <Suspense fallback={null}>
      <ReviewWriteContent />
    </Suspense>
  );
}
