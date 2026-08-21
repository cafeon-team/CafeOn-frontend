"use client";

import Header from "@/components/Header";
import ListRow from "@/components/ListRow";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { useAuth } from "@/lib/auth-store";
import { resolveImageUrl } from "@/lib/api";

export default function MyPage() {
  const { profile, profileLoading, logout } = useAuth();
  const displayName = profile.name.trim() ? `${profile.name}님` : "회원님";
  const avatarUrl = resolveImageUrl(profile.profileImageUrl);

  return (
    <div className="flex flex-col">
      <Header title="MY" />

      <div className="px-6 pt-5">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="프로필 사진"
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <ImagePlaceholder className="h-16 w-16 shrink-0" rounded="rounded-full" />
          )}
          <div>
            <p className="text-[18px] font-bold text-ink">
              {profileLoading ? "불러오는 중..." : displayName}
            </p>
            {profile.email && (
              <p className="mt-0.5 text-[13px] text-ink-muted">{profile.email}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 px-6 pb-8">
        <ListRow href="/my/profile" label="프로필 관리" />
        <ListRow href="/my/reviews" label="리뷰 관리" />
        <ListRow href="/my/settings" label="설정" />
        <ListRow href="/my/support" label="고객센터" />
        <ListRow href="/map" label="로그아웃" danger onClick={() => logout()} />
      </div>
    </div>
  );
}
