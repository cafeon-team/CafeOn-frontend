"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import { useAuth } from "@/lib/auth-store";

const faqs: { q: string; a: string }[] = [
  {
    q: "주문은 어떻게 하나요?",
    a: "카페 상세 화면에서 메뉴를 담고 '주문하기'를 누른 뒤 결제하면 주문이 완료돼요.",
  },
  {
    q: "주문 취소는 어떻게 하나요?",
    a: "주문내역 탭에서 취소하고 싶은 주문을 선택해 취소할 수 있어요(매장이 접수하기 전까지만 가능해요).",
  },
  {
    q: "포인트는 어떻게 적립되나요?",
    a: "주문 후 결제 금액에 따라 포인트가 자동으로 적립돼요.",
  },
  {
    q: "쿠폰은 어디서 확인하나요?",
    a: "혜택 탭에서 보유 중인 쿠폰과 사용 기한을 확인할 수 있어요.",
  },
  {
    q: "기타 문의",
    a: "위 항목에서 원하는 답변을 찾지 못하셨다면, 아래 1:1 문의하기를 이용해 주세요.",
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Inquiry = {
  id: string;
  content: string;
  email: string;
  createdAt: string;
  status: "접수됨";
};

export default function SupportPage() {
  const { isLoggedIn, profile } = useAuth();

  const [openQ, setOpenQ] = useState<string | null>(null);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [showInquiryList, setShowInquiryList] = useState(false);
  const [draft, setDraft] = useState("");
  const [email, setEmail] = useState("");
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openInquiryForm = () => {
    setInquiryError(null);
    // 로그인한 손님이면 회원 이메일을 기본값으로 채워주되, 직접 다른 메일로
    // 받고 싶을 수도 있으니 자유롭게 수정할 수 있게 해요.
    setEmail((prev) => prev || (isLoggedIn ? profile.email : "") || "");
    setShowInquiryForm(true);
  };

  const submitInquiry = async () => {
    if (submitting) return;

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

    setSubmitting(true);
    setInquiryError(null);

    try {
      const res = await fetch("/api/customer/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmedContent,
          customerEmail: trimmedEmail,
          customerName: isLoggedIn ? profile.name : null,
          phone: isLoggedIn ? profile.phone : null,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok || !data?.ok) {
        // 메일 전송에는 실패했다는 걸 그대로 알려줘요 — 조용히 실패해서
        // "분명 눌렀는데 관리자한테 안 갔다"처럼 보이지 않게 하기 위해서예요.
        setInquiryError(
          data?.error ?? "문의 등록에 실패했어요. 잠시 후 다시 시도해주세요."
        );
        return;
      }

      setInquiries((prev) => [
        {
          id: `q${prev.length + 1}`,
          content: trimmedContent,
          email: trimmedEmail,
          createdAt: "방금 전",
          status: "접수됨",
        },
        ...prev,
      ]);
      setDraft("");
      setShowInquiryForm(false);
      setInquirySent(true);
      setTimeout(() => setInquirySent(false), 1800);
    } catch {
      setInquiryError(
        "문의 등록에 실패했어요. 네트워크 연결을 확인한 뒤 다시 시도해주세요."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <Header title="고객센터" />

      <div className="flex flex-col px-6 pb-8">
        <div className="mt-6 rounded-2xl bg-brand-tint p-5">
          <h2 className="text-[18px] font-bold text-ink">무엇을 도와드릴까요?</h2>
          <p className="mt-1 text-[13.5px] text-ink-secondary">
            자주 묻는 질문과 문의를 확인하세요.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {faqs.map((item) => {
            const open = openQ === item.q;
            return (
              <div
                key={item.q}
                className="rounded-2xl border border-border bg-white"
              >
                <button
                  onClick={() => setOpenQ(open ? null : item.q)}
                  className="flex h-16 w-full items-center justify-between px-5 text-left"
                >
                  <span className="text-[15px] text-ink">{item.q}</span>
                  <ChevronDown
                    size={17}
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

        <p className="mt-4 text-[13px] text-ink-muted">
          상담 가능 시간 09:00 ~ 18:00
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={openInquiryForm}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-brand text-[16px] font-bold text-white active:opacity-90"
          >
            1:1 문의하기
          </button>
          <button
            onClick={() => setShowInquiryList(true)}
            className="flex h-14 w-full items-center justify-center rounded-2xl border border-brand text-[16px] font-bold text-brand"
          >
            문의 내역
          </button>
        </div>
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
            className="w-full rounded-xl border border-border bg-white p-3.5 text-[14.5px] outline-none focus:border-brand"
          />

          <label className="mb-1.5 mt-4 block text-[13px] font-medium text-ink-secondary">
            문의 내용
          </label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder="문의하실 내용을 입력해주세요."
            className="w-full rounded-xl border border-border bg-white p-3.5 text-[14.5px] outline-none focus:border-brand"
          />

          {inquiryError && (
            <p className="mt-2 text-[13px] leading-relaxed text-red-500">
              {inquiryError}
            </p>
          )}

          <button
            onClick={submitInquiry}
            disabled={submitting || !draft.trim() || !email.trim()}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-brand text-[14.5px] font-bold text-white active:opacity-90 disabled:opacity-50"
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
                <div key={inq.id} className="rounded-xl border border-border p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-ink-muted">
                      {inq.createdAt}
                    </span>
                    <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-bold text-brand-dark">
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
