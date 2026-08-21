"use client";

import Header from "@/components/Header";
import ListRow from "@/components/ListRow";
import ToggleSwitch from "@/components/ToggleSwitch";
import { useOwner } from "@/lib/owner-store";

export default function OwnerSettingsPage() {
  const { settings, setSettings } = useOwner();

  return (
    <div className="flex flex-col">
      <Header title="설정" />

      <div className="flex flex-col px-6 pb-8">
        <h2 className="mt-6 text-[16px] font-bold text-ink">앱 설정</h2>
        <div className="mt-3 flex flex-col gap-3">
          <Row label="주문 알림">
            <ToggleSwitch
              color="trust"
              checked={settings.orderAlert}
              onChange={(v) => setSettings({ orderAlert: v })}
            />
          </Row>
          <Row label="리뷰 알림">
            <ToggleSwitch
              color="trust"
              checked={settings.reviewAlert}
              onChange={(v) => setSettings({ reviewAlert: v })}
            />
          </Row>
          <Row label="문의 알림">
            <ToggleSwitch
              color="trust"
              checked={settings.inquiryAlert}
              onChange={(v) => setSettings({ inquiryAlert: v })}
            />
          </Row>
          <Row label="이벤트/혜택 알림">
            <ToggleSwitch
              color="trust"
              checked={settings.marketingAlert}
              onChange={(v) => setSettings({ marketingAlert: v })}
            />
          </Row>
          <Row label="운영 알림">
            <ToggleSwitch
              color="trust"
              checked={settings.operationAlert}
              onChange={(v) => setSettings({ operationAlert: v })}
            />
          </Row>
          <Row label="언어">
            <span className="text-[14px] text-ink-muted">한국어</span>
          </Row>
        </div>

        <h2 className="mt-8 text-[16px] font-bold text-ink">계정</h2>
        <div className="mt-3">
          <ListRow href="/owner/logout" label="로그아웃" color="trust" />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-16 items-center justify-between rounded-2xl border border-border bg-white px-5">
      <span className="text-[15px] text-ink">{label}</span>
      {children}
    </div>
  );
}
