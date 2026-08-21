"use client";

import Header from "@/components/Header";
import ListRow from "@/components/ListRow";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { useOwner } from "@/lib/owner-store";
import { resolveImageUrl } from "@/lib/api";

export default function OwnerMyPage() {
  const { store } = useOwner();
  const logoUrl = resolveImageUrl(store.imageUrl);
  // 매장 프로필 화면과 동일하게 store.tags에서 태그 이름만 뽑아요. 이렇게 하면
  // 사장님이 매장 프로필에서 고른 태그가 그대로 여기(MY)에도 보여요.
  const selectedTags = store.tags
    .map((t) => t.name)
    .filter((n): n is string => Boolean(n));

  return (
    <div className="flex flex-col">
      <Header title="MY" />

      <div className="px-6 pt-5">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={store.name}
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <ImagePlaceholder
              className="h-16 w-16 shrink-0"
              rounded="rounded-full"
            />
          )}
          <div>
            <p className="text-[18px] font-bold text-ink">{store.name}</p>
            {selectedTags.length > 0 && (
              <p className="mt-0.5 text-[13px] text-ink-muted">
                {selectedTags.join(" · ")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 px-6 pb-8">
        <ListRow href="/owner/my/profile" label="매장 프로필" />
        <ListRow href="/owner/my/reviews" label="리뷰 관리" />
        <ListRow href="/owner/my/settings" label="설정" />
        <ListRow href="/owner/my/support" label="고객센터" />
        <ListRow href="/owner/logout" label="로그아웃" color="trust" />
      </div>
    </div>
  );
}
