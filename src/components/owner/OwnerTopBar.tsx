"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, Receipt, PackageX } from "lucide-react";
import { useOwner } from "@/lib/owner-store";

export default function OwnerTopBar() {
  const { orders, menu } = useOwner();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const pendingOrders = orders.filter((o) => o.status === "주문접수");
  const lowStockItems = menu.filter((m) => m.stock !== null && m.stock <= 3);
  const alertCount = pendingOrders.length + lowStockItems.length;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-6">
      <Link href="/owner" className="flex items-center">
        <Image
          src="/images/logo.png"
          alt="CafeOn"
          width={108}
          height={21}
          priority
          className="h-[21px] w-auto object-contain"
        />
      </Link>

      <div className="relative" ref={panelRef}>
        <button
          aria-label="알림"
          onClick={() => setOpen((v) => !v)}
          className="relative flex h-9 w-9 items-center justify-center text-ink"
        >
          <Bell size={22} strokeWidth={1.8} />
          {alertCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand" />
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-11 z-30 w-72 rounded-2xl border border-border bg-white p-2 shadow-sheet">
            <p className="px-3 py-2 text-[13px] font-bold text-ink">
              알림 {alertCount > 0 ? `${alertCount}건` : ""}
            </p>
            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {alertCount === 0 && (
                <p className="px-3 py-6 text-center text-[13px] text-ink-muted">
                  새로운 알림이 없어요.
                </p>
              )}

              {pendingOrders.map((o) => (
                <Link
                  key={o.id}
                  href="/owner/reserve"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 active:bg-cream"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-tint text-amber-dark">
                    <Receipt size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-ink">
                      {o.customerName} 고객님 새 주문
                    </span>
                    <span className="block text-[12px] text-ink-muted">
                      {o.items.map((it) => `${it.name} ${it.quantity}개`).join(", ")} · 접수 대기중
                    </span>
                  </span>
                </Link>
              ))}

              {lowStockItems.map((m) => (
                <Link
                  key={m.id}
                  href="/owner/menu"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 active:bg-cream"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <PackageX size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-ink">
                      {m.name} 재고 부족
                    </span>
                    <span className="block text-[12px] text-ink-muted">
                      남은 재고 {m.stock}개
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
