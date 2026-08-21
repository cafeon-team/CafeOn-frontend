"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import ImageUploadField from "@/components/owner/ImageUploadField";
import Toast from "@/components/Toast";
import { useOwner, STORE_TAG_OPTIONS } from "@/lib/owner-store";
import { apiUploadImage, isApiConfigured } from "@/lib/api";

export default function OwnerProfilePage() {
  const { store, setStore, toggleStoreTag } = useOwner();
  const [form, setForm] = useState(store);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 매장 정보가 서버에서 비동기로 도착하면(이 페이지가 먼저 열려있던 경우 등)
  // 입력폼도 최신 값으로 맞춰줘요. 사장님이 이미 뭔가 입력 중이었다면 그 값을
  // 덮어쓰지 않도록, 아직 아무것도 입력하지 않은 "빈 폼"일 때만 동기화해요.
  useEffect(() => {
    setForm((prev) =>
      prev.name === "" && prev.address === "" && prev.phone === ""
        ? store
        : prev,
    );
  }, [store]);

  // 태그는 "저장하기" 버튼과 별개로, 누르는 즉시 서버에 반영돼요(전용 태그
  // API를 쓰기 때문이에요). 그래서 폼(form)이 아니라 store.tags를 그대로 봐요.
  const selectedTags = store.tags
    .map((t) => t.name)
    .filter((n): n is string => Boolean(n));
  const toggleTag = (tag: string) => toggleStoreTag(tag);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      // 새 사진을 골랐으면 손님 프로필과 동일하게 실제로 서버에 업로드해서
      // URL로 바꿔요. (예전엔 이 단계 없이 base64 미리보기 문자열을 그대로
      // imageUrl에 저장했는데, 그러면 화면엔 사진이 보여도 실제로 서버에
      // 업로드된 파일이 아니라서 다른 사람 화면(손님 지도 등)에는 절대 보이지
      // 않고, 이 기기를 벗어나면 사라지는 "가짜 저장"이었어요.)
      let imageUrl = form.imageUrl;
      if (imageFile && isApiConfigured()) {
        const uploaded = await apiUploadImage(imageFile, "owner");
        if (!uploaded) {
          setError(
            "사진 업로드에 실패했어요. 개발자도구 콘솔(F12)에서 [apiUploadImage] 로그를 확인해주세요.",
          );
          setSaving(false);
          return;
        }
        imageUrl = uploaded;
        setForm((prev) => ({ ...prev, imageUrl }));
      }

      const result = await setStore({ ...form, imageUrl });
      if (!result.ok) {
        setError(result.error ?? "저장에 실패했어요.");
        setSaving(false);
        return;
      }
      setImageFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col pb-8">
      <Header title="매장 프로필" />

      <div className="px-6 pt-5">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5">
          <ImageUploadField
            value={form.imageUrl}
            onChange={(v) => setForm({ ...form, imageUrl: v })}
            onFile={setImageFile}
            rounded="rounded-full"
          />
          <div>
            <p className="text-[18px] font-bold text-ink">{form.name}</p>
            {selectedTags.length > 0 && (
              <p className="mt-0.5 text-[13px] text-ink-muted">
                {selectedTags.join(" · ")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-white p-5 mx-6">
        <p className="text-[12.5px] text-ink-muted">매장 태그</p>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          우리 매장을 잘 나타내는 태그를 골라주세요 (여러 개 선택 가능)
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STORE_TAG_OPTIONS.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={
                  "rounded-full border px-3.5 py-2 text-[13.5px] font-bold transition-colors " +
                  (active
                    ? "border-trust bg-trust-tint text-trust"
                    : "border-border bg-white text-ink-secondary")
                }
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-border rounded-2xl border border-border bg-white px-5 mx-6">
        <ProfileField
          label="매장명"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
        />
        <ProfileField
          label="매장 설명"
          value={form.description}
          onChange={(v) => setForm({ ...form, description: v })}
          multiline
        />
        <ProfileField
          label="주소"
          value={form.address}
          onChange={(v) => setForm({ ...form, address: v })}
        />
        <ProfileField
          label="전화번호"
          value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })}
        />
        <ProfileField
          label="영업시간"
          // 서버에 아직 영업시간이 없으면 store.hours가 "-"로 채워져 있어요(요약
          // 표시용 기본값). 이 화면(입력칸)에서는 그 "-"가 그대로 보이면
          // 손님용 화면의 휴대폰 번호 칸처럼 "입력 형식 예시"가 옅은 색으로 보이는
          // 안내(placeholder)가 가려지니, 입력칸에서만 빈 값으로 보여줘요.
          value={form.hours === "-" ? "" : form.hours}
          onChange={(v) => setForm({ ...form, hours: v })}
          placeholder="매일 00:00-00:00"
        />
      </div>

      {error && <p className="mt-3 px-6 text-[13px] text-danger">{error}</p>}

      <div className="mt-6 px-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-trust text-[16px] font-bold text-white active:bg-trust-dark disabled:opacity-60"
        >
          {saving ? "저장 중..." : saved ? "저장 완료!" : "저장하기"}
        </button>
      </div>

      <Toast show={saved} message="수정되었습니다" />
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  /** 손님용 화면(휴대폰 번호 "010-0000-0000" 등)과 동일하게, 아직 값이 없을 때
   * 입력 형식 예시를 옅은 색으로 보여줘요. */
  placeholder?: string;
  /** 입력칸 아래에 작게 보여줄 안내 문구(예: 저장되는 형식 설명). */
  helperText?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // textarea 높이를 글자 수(줄 수)에 딱 맞게 자동으로 늘려줘요. rows 고정값을 쓰면
  // 한 줄짜리 짧은 글도 항상 2줄 높이만큼 빈 공간이 남아 밑줄이 어색하게 떨어져
  // 보였는데, 이 방식은 실제 내용 높이만큼만 차지해요.
  useEffect(() => {
    if (!multiline) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [multiline, value]);

  return (
    <div className="py-3.5">
      <p className="text-[12.5px] text-ink-muted">{label}</p>
      {multiline ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={1}
          className="mt-1 block w-full resize-none overflow-hidden bg-transparent text-[15px] font-medium leading-snug text-ink outline-none placeholder:text-ink-muted placeholder:font-normal"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full bg-transparent text-[15px] font-medium text-ink outline-none placeholder:text-ink-muted placeholder:font-normal"
        />
      )}
      {helperText && (
        <p className="mt-1 text-[11.5px] text-ink-muted">{helperText}</p>
      )}
    </div>
  );
}
