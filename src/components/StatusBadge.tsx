import type { SeatStatus } from "@/lib/data";

const styles: Record<SeatStatus, string> = {
  여유: "bg-sage-tint text-sage-dark",
  주의: "bg-amber-tint text-amber-dark",
  혼잡: "bg-brand-tint text-brand-dark",
};

const borderStyles: Record<SeatStatus, string> = {
  여유: "border border-sage",
  주의: "border border-amber",
  혼잡: "border border-brand-dark",
};

export default function StatusBadge({
  status,
  filled,
  total,
  bordered = false,
}: {
  status: SeatStatus;
  filled?: number;
  total?: number;
  bordered?: boolean;
}) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-3 py-1 text-[13px] font-bold " +
        styles[status] +
        (bordered ? " " + borderStyles[status] : "")
      }
    >
      {status}
      {typeof filled === "number" && typeof total === "number"
        ? ` ${filled}/${total}`
        : ""}
    </span>
  );
}
