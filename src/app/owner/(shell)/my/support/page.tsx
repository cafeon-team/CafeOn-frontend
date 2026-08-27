"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import { useOwner } from "@/lib/owner-store";
import { useOwnerAuth } from "@/lib/owner-auth-store";
import { apiGetMe, isApiConfigured } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const faqs: { q: string; a: string }[] = [
  {
    q: "주문은 어떻게 관리하나요?",
    a: "주문 탭에서 들어온 주문을 확인하고, 접수 대기 목록에서 접수 또는 거절할 수 있어요. 접수 후에는 준비완료·픽업완료로 상태를 바꿀 수 있어요.",
  },
  {
    q: "리뷰는 어떻게 확인하나요?",
    a: "MY > 리뷰 관리에서 고객이 남긴 리뷰를 확인하고 답글을 남기거나 삭제할 수 있어요.",
  },
  {
    q: "메뉴는 어떻게 등록하나요?",
    a: "메뉴 탭에서 '메뉴 추가하기' 버튼을 눌러 이름, 가격, 카테고리, 재고, 사진을 등록할 수 있어요.",
  },
  {
    q: "좌석은 어떻게 관리하나요?",
    a: "매장 탭 > 좌석 현황에서 좌석을 선택한 뒤, 원하는 상태 버튼을 눌러 변경할 수 있어요.",
  },
  {
    q: "매출 정보는 어디서 확인하나요?",
    a: "홈 화면 상단의 오늘 매출 카드에서 실시간 매출과 전일 대비 증감을 확인할 수 있어요.",
  },
  {
    q: "운영 알림은 무엇인가요?",
    a: "예약 대기, 재고 부족 등 매장 운영에 필요한 알림을 홈 화면 알림에서 모아볼 수 있어요.",
  },
  {
    q: "기타 문의",
    a: "위 항목에서 원하는 답변을 찾지 못하셨다면, 아래 1:1 문의하기를 이용해 주세요.",
  },
];

export default function OwnerSupportPage() {
  const { inquiries, addInquiry } = useOwner();
  const { isOwnerLoggedIn } = useOwnerAuth();
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [showInquiryList, setShowInquiryList] = useState(false);
  const [draft, setDraft] = useState("");
  const [email, setEmail] = useState("");
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openInquiryForm = () => {
    setInquiryError(null);
    setShowInquiryForm(true);
    // 로그인한 사장님이면 계정 이메일을 기본값으로 채워주되, 답변을 다른
    // 메일로 받고 싶을 수도 있으니 직접 수정할 수 있게 열어둬요.
    if (!email && isOwnerLoggedIn && isApiConfigured()) {
      void apiGetMe("owner").then((me) => {
        if (me?.email) {
          setEmail((prev) => prev || me.email);
        }
      });
    }
  };

  const submitInquiry = async () => {
    const trimmedContent = draft.trim();
    const trimmedEmail = email.trim();

    if (!trimmedContent) {
      setInquiryError("문의 내용을 입력해주세요.");
      return;
    }
    if (!trimmedEmail || !EMAIL_RE.test(trimmedEmail)) {
      setInquiryError("답변 받으실 이메일 주소를 올바르게 입력해주세요.");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setInquiryError(null);
    const result = await addInquiry(trimmedContent, trimmedEmail);
    setSubmitting(false);
    if (!result.ok) {
      // 문의 자체는 문의 내역에 등록됐지만(owner-store.tsx의 addInquiry 참고),
      // 관리자 메일 전송에는 실패했다는 걸 그대로 알려줘요 — 조용히 실패해서
      // "분명 눌렀는데 관리자한테 안 갔다"처럼 보이지 않게 하기 위해서예요.
      setInquiryError(
        result.error ?? "문의 등록에 실패했어요. 잠시 후 다시 시도해주세요."
      );
      return;
    }
    setDraft("");
    setShowInquiryForm(false);
    setInquirySent(true);
    setTimeout(() => setInquirySent(false), 1800);
  };

  return (
    <div className="flex flex-col pb-8">
      <Header title="고객센터" />

      <div className="px-6 pt-6">
        <div className="rounded-2xl bg-trust-tint p-5">
          <h2 className="text-[19px] font-bold text-ink">무엇을 도와드릴까요?</h2>
          <p className="mt-1 text-[13.5px] text-ink-secondary">
            자주 묻는 질문과 문의를 확인하세요.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {faqs.map((item) => {
            const open = openQ === item.q;
            return (
              <div
                key={item.q}
                className="rounded-2xl border border-border bg-white"
              >
                <button
                  onClick={() => setOpenQ(open ? null : item.q)}
                  className="flex h-14 w-full items-center justify-between px-5 text-left"
                >
                  <span className="text-[14.5px] font-medium text-ink">
                    {item.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={
                      "shrink-0 text-ink-muted transition-transform " +
                      (open ? "rotate-180" : "")
                    }
                  />
                </button>
                {open && (
                  <p className="px-5 pb-4 text-[14px] leading-relaxed text-ink-secondary">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-left text-[12.5px] text-ink-muted">
          상담 가능 시간 09:00 ~ 18:00
        </p>

        <button
          onClick={openInquiryForm}
          className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-trust text-[16px] font-bold text-white active:bg-trust-dark"
        >
          1:1 문의하기
        </button>

        <button
          onClick={() => setShowInquiryList(true)}
          className="mt-3 flex h-14 w-full items-center justify-center rounded-2xl border border-trust text-[16px] font-bold text-trust"
        >
          문의 내역
        </button>
      </div>

      {showInquiryForm && (
        <Sheet
          onClose={() => {
            setShowInquiryForm(false);
            setInquiryError(null);
          }}
          title="1:1 문의하기"
        >
          <label className="mb-1.5 block text-[13px] font-medium text-ink-secondary">
            답변 받을 이메일
          </label>
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일을 입력해주세요."
            className="w-full rounded-xl border border-border bg-white p-3.5 text-[14.5px] outline-none focus:border-trust"
          />

          <label className="mb-1.5 mt-4 block text-[13px] font-medium text-ink-secondary">
            문의 내용
          </label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder="문의하실 내용을 입력해주세요."
            className="w-full rounded-xl border border-border bg-white p-3.5 text-[14.5px] outline-none focus:border-trust"
          />

          {inquiryError && (
            <p className="mt-2 text-[13px] leading-relaxed text-red-500">
              {inquiryError}
            </p>
          )}
          <button
            onClick={submitInquiry}
            disabled={submitting || !draft.trim() || !email.trim()}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-trust text-[14.5px] font-bold text-white active:bg-trust-dark disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "문의 등록하기"}
          </button>
        </Sheet>
      )}

      {showInquiryList && (
        <Sheet onClose={() => setShowInquiryList(false)} title="문의 내역">
          {inquiries.length === 0 ? (
            <p className="py-8 text-center text-[13.5px] text-ink-muted">
              아직 등록한 문의가 없어요.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="rounded-xl border border-border p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-ink-muted">
                      {inq.createdAt}
                    </span>
                    <span className="rounded-full bg-trust-tint px-2 py-0.5 text-[11px] font-bold text-trust">
                      {inq.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[14px] text-ink-secondary">
                    {inq.content}
                  </p>
                  <p className="mt-1 text-[12px] text-ink-muted">{inq.email}</p>
                </div>
              ))}
            </div>
          )}
        </Sheet>
      )}

      <Toast show={inquirySent} message="문의가 등록되었습니다" />
    </div>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40">
      <div className="max-h-[85dvh] w-full max-w-app overflow-y-auto rounded-t-3xl bg-white p-6 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-ink">{title}</h3>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 items-center justify-center text-ink-muted"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
