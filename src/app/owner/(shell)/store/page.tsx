"use client";

import { useMemo, useState } from "react";
import { Armchair, Delete, Minus, Plus } from "lucide-react";
import Header from "@/components/Header";
import { useOwner, type OwnerSeat } from "@/lib/owner-store";
import { congestionStyle, remainingMessage } from "@/lib/seat-congestion";

/** 좌석 라벨(문자열)을 숫자로 정렬하기 위한 비교 함수. 예전 데이터에 A1처럼
 * 숫자가 아닌 라벨이 남아있어도(마이그레이션 이전 매장) 에러 없이 뒤로 보내요. */
function sortByNumber(seats: OwnerSeat[]) {
  return [...seats].sort((a, b) => {
    const na = Number(a.label);
    const nb = Number(b.label);
    if (Number.isNaN(na) && Number.isNaN(nb)) return a.label.localeCompare(b.label);
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  });
}

export default function OwnerStorePage() {
  const { seats, congestion, setSeatStatus, addSeat, removeSeat } = useOwner();
  const [setupCount, setSetupCount] = useState("");
  const [numpad, setNumpad] = useState("");
  // 총 좌석 수를 가운데 숫자를 눌러서 직접 입력/수정할 때 쓰는 상태.
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState("");

  const sortedSeats = useMemo(() => sortByNumber(seats), [seats]);
  const total = seats.length;
  const occupied = seats.filter((s) => s.status !== "비어있음").length;
  const remaining = total - occupied;

  /** 목표 "잔여 좌석 수"에 맞춰 점유 좌석을 늘리거나 줄여요. 번호가 작은 좌석부터
   * 채우고, 뺄 때는 번호가 큰 좌석부터 비워요. */
  const applyRemainingTarget = (targetRemaining: number) => {
    const clamped = Math.max(0, Math.min(total, targetRemaining));
    const targetOccupied = total - clamped;
    let current = seats.filter((s) => s.status !== "비어있음").length;
    const empties = sortedSeats.filter((s) => s.status === "비어있음");
    const occupieds = [...sortedSeats].reverse().filter((s) => s.status !== "비어있음");

    while (current < targetOccupied && empties.length > 0) {
      const seat = empties.shift()!;
      setSeatStatus(seat.id, "사용중");
      current += 1;
    }
    while (current > targetOccupied && occupieds.length > 0) {
      const seat = occupieds.shift()!;
      setSeatStatus(seat.id, "비어있음");
      current -= 1;
    }
  };

  const handleSetup = () => {
    const n = Number(setupCount);
    if (!Number.isFinite(n) || n <= 0) return;
    for (let i = 1; i <= n; i++) addSeat(String(i));
    setSetupCount("");
  };

  /** 총 좌석 수를 원하는 값으로 직접 맞춰요(가운데 숫자를 눌러 입력하거나,
   * 예전 -/+ 스테퍼가 하던 "1석씩"도 이 함수의 특수한 경우예요).
   * ⚠️ 예전엔 -/+ 버튼이 addSeat/removeSeat을 한 번에 1석씩만 호출했는데,
   * 이제 여러 석을 한 번에 조정할 수 있어야 해서, 컴포넌트의 `seats` state가
   * 아직 갱신되지 않은(리렌더 전) 시점에도 정확히 동작하도록 새 좌석 번호와
   * 제거할 좌석 목록을 이 함수 안에서 한 번에 미리 계산해요(반복문 안에서
   * addSeat/removeSeat을 여러 번 부르면서 매번 최신 `seats`를 읽으려고 하면,
   * 리액트가 상태 갱신을 몰아서 처리하는 동안 계속 같은(오래된) `seats`를
   * 참조하게 돼 번호가 겹치는 등 오동작할 수 있어요). */
  const applyTotalTarget = (rawNewTotal: number) => {
    const newTotal = Math.max(0, Math.round(rawNewTotal));
    if (!Number.isFinite(newTotal) || newTotal === total) return;

    if (newTotal > total) {
      // 새 좌석은 항상 "비어있음" 상태로, 현재 가장 큰 번호 다음부터 순서대로 추가해요.
      const numericLabels = seats.map((s) => Number(s.label)).filter((n) => Number.isFinite(n));
      let nextLabel = Math.max(total, numericLabels.length > 0 ? Math.max(...numericLabels) : 0);
      const addCount = newTotal - total;
      for (let i = 0; i < addCount; i++) {
        nextLabel += 1;
        addSeat(String(nextLabel));
      }
      return;
    }

    // 줄일 때: 비어있는 좌석 중 번호가 큰 것부터 먼저 없애고, 그래도 목표에
    // 못 미치면(전부 사용 중이면) 사용 중인 좌석도 번호가 큰 것부터 없애요.
    const removeCount = total - newTotal;
    const emptyDesc = sortedSeats.filter((s) => s.status === "비어있음").slice().reverse();
    const occupiedDesc = [...sortedSeats].reverse().filter((s) => s.status !== "비어있음");
    const removalOrder = [...emptyDesc, ...occupiedDesc].slice(0, removeCount);
    removalOrder.forEach((seat) => removeSeat(seat.id));
  };

  const startEditTotal = () => {
    setTotalInput(String(total));
    setEditingTotal(true);
  };

  const commitEditTotal = () => {
    const n = Number(totalInput);
    if (Number.isFinite(n) && n >= 0) {
      applyTotalTarget(n);
    }
    setEditingTotal(false);
  };

  const numpadMaxLen = String(total).length;
  const handleDigit = (d: string) => {
    setNumpad((prev) => (prev.length >= numpadMaxLen ? prev : prev + d));
  };
  const handleNumpadApply = () => {
    if (numpad === "") return;
    applyRemainingTarget(Number(numpad));
    setNumpad("");
  };

  return (
    <div className="flex flex-col">
      <Header title="좌석 관리" />

      {total === 0 ? (
        <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <Armchair size={28} className="text-ink-muted" />
          <p className="text-[14.5px] text-ink-secondary">
            아직 등록된 좌석이 없어요.
            <br />
            매장의 총 좌석 수를 입력하면 번호대로 좌석이 만들어져요.
          </p>
          <div className="mt-2 flex w-full gap-2">
            <input
              type="number"
              min={1}
              value={setupCount}
              onChange={(e) => setSetupCount(e.target.value)}
              placeholder="예: 12"
              className="h-12 flex-1 rounded-xl border border-border bg-white px-4 text-[14.5px] text-ink outline-none focus:border-trust"
            />
            <button
              onClick={handleSetup}
              className="h-12 shrink-0 rounded-xl bg-trust px-5 text-[14.5px] font-bold text-white"
            >
              좌석 만들기
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 px-6 py-6">
          {/* 총 좌석 수 스테퍼 + 잔여 상황 메시지 */}
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <span
                className={
                  "rounded-lg px-3 py-1 text-[13px] font-bold " +
                  congestionStyle[congestion].bg +
                  " " +
                  congestionStyle[congestion].text
                }
              >
                {congestion}
              </span>
              <span className="text-[13px] text-ink-secondary">잔여 {remaining}석</span>
            </div>

            <div className="mt-4 flex items-center justify-center gap-6">
              {/* ⚠️ 예전엔 이 -/+ 버튼이 "총 좌석 수"를 늘리고 줄였어요. 그런데
                  바로 아래 숫자판("남은 좌석 수 바로 입력")은 반대로 "남은 좌석
                  수"를 조절하고 있어서, 같은 화면에 두 조작이 서로 다른 값을
                  건드리는 게 헷갈렸어요. 실제로 사장님이 급하게 자리를 채우거나
                  뺄 때 편한 쪽(버튼을 여러 번 누르기 vs 숫자를 바로 입력하기)을
                  자유롭게 고를 수 있어야 하는 거였지, 총 좌석 수 자체를 여기서
                  건드리려던 게 아니었어요. 이제 -/+ 버튼도 숫자판과 동일하게
                  "남은 좌석 수"를 1석씩 조절해요. */}
              <button
                aria-label="남은 좌석 수 줄이기"
                onClick={() => applyRemainingTarget(remaining - 1)}
                disabled={remaining <= 0}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-ink-secondary disabled:opacity-40"
              >
                <Minus size={18} />
              </button>

              {/* 총 좌석 수는 이제 이 -/+ 버튼이 아니라, 가운데 숫자를 직접 눌러서
                  바꿔요(탭하면 입력 칸으로 바뀌고, 새 값을 넣고 확인/엔터하면
                  적용돼요). */}
              {editingTotal ? (
                <div className="flex flex-col items-center gap-1.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    autoFocus
                    value={totalInput}
                    onChange={(e) => setTotalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEditTotal();
                      if (e.key === "Escape") setEditingTotal(false);
                    }}
                    onBlur={commitEditTotal}
                    className="h-9 w-20 rounded-lg border border-trust text-center text-[20px] font-extrabold text-ink outline-none"
                  />
                  <p className="text-[12px] text-ink-muted">총 좌석 수</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startEditTotal}
                  aria-label="총 좌석 수 변경하기"
                  className="flex flex-col items-center rounded-xl px-2 py-1 text-center"
                >
                  <p className="text-[24px] font-extrabold text-ink">{total}석</p>
                  <p className="text-[12px] text-ink-muted underline decoration-dotted underline-offset-2">
                    총 좌석 수 · 눌러서 변경
                  </p>
                </button>
              )}

              <button
                aria-label="남은 좌석 수 늘리기"
                onClick={() => applyRemainingTarget(remaining + 1)}
                disabled={remaining >= total}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-ink-secondary disabled:opacity-40"
              >
                <Plus size={18} />
              </button>
            </div>

            <p className="mt-4 text-center text-[13px] font-medium text-ink-secondary">
              {remainingMessage(remaining, total, congestion)}
            </p>
          </div>

          {/* 급할 때: 남은 좌석 수를 숫자판으로 바로 입력 */}
          <div>
            <h2 className="text-[14px] font-bold text-ink">남은 좌석 수 바로 입력</h2>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              예: 자리가 3개 남았으면 3만 누르고 적용하세요.
            </p>
            <div className="mt-3 flex h-12 items-center justify-center rounded-xl border border-border bg-white text-[18px] font-bold text-ink">
              {numpad || <span className="text-ink-muted">0</span>}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  onClick={() => handleDigit(d)}
                  className="h-12 rounded-xl bg-white text-[16px] font-bold text-ink border border-border"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => setNumpad((p) => p.slice(0, -1))}
                aria-label="지우기"
                className="flex h-12 items-center justify-center rounded-xl border border-border bg-white text-ink-secondary"
              >
                <Delete size={16} />
              </button>
              <button
                onClick={() => handleDigit("0")}
                className="h-12 rounded-xl border border-border bg-white text-[16px] font-bold text-ink"
              >
                0
              </button>
              <button
                onClick={handleNumpadApply}
                className="h-12 rounded-xl bg-trust text-[14.5px] font-bold text-white"
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
