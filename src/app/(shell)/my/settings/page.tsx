"use client";

import { useState } from "react";
import Header from "@/components/Header";
import ListRow from "@/components/ListRow";
import ToggleSwitch from "@/components/ToggleSwitch";
import { useAuth } from "@/lib/auth-store";

export default function SettingsPage() {
  const { logout } = useAuth();
  const [notif, setNotif] = useState(true);
  const [push, setPush] = useState(true);
  const [eventNotif, setEventNotif] = useState(false);
  const [location, setLocation] = useState(true);

  return (
    <div className="flex flex-col">
      <Header title="설정" />

      <div className="flex flex-col px-6 pb-8">
        <h2 className="mt-6 text-[16px] font-bold text-ink">앱 설정</h2>
        <div className="mt-3 flex flex-col gap-3">
          <Row label="알림 설정">
            <ToggleSwitch checked={notif} onChange={setNotif} />
          </Row>
          <Row label="푸시 알림">
            <ToggleSwitch checked={push} onChange={setPush} />
          </Row>
          <Row label="이벤트/혜택 알림">
            <ToggleSwitch checked={eventNotif} onChange={setEventNotif} />
          </Row>
          <Row label="위치 권한">
            <ToggleSwitch checked={location} onChange={setLocation} />
          </Row>
          <Row label="언어">
            <span className="text-[14px] text-ink-muted">한국어</span>
          </Row>
        </div>

        <h2 className="mt-8 text-[16px] font-bold text-ink">계정</h2>
        <div className="mt-3">
          <ListRow href="/map" label="로그아웃" danger onClick={() => logout()} />
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
