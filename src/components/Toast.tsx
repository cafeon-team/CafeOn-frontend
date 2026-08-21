"use client";

import { Check } from "lucide-react";

/**
 * 저장/수정 등이 완료되었을 때 화면 하단에 잠깐 띄우는 확인 토스트.
 * 사용 예:
 *   const [toast, setToast] = useState(false);
 *   const save = () => { ...; setToast(true); setTimeout(() => setToast(false), 1800); };
 *   <Toast show={toast} message="수정되었습니다" />
 */
export default function Toast({
  show,
  message,
}: {
  show: boolean;
  message: string;
}) {
  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6">
      <div className="flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[14px] font-bold text-white shadow-sheet">
        <Check size={16} strokeWidth={2.6} />
        {message}
      </div>
    </div>
  );
}
