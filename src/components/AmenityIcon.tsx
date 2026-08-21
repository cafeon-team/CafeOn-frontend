import { Wifi, Plug, ParkingSquare, PawPrint } from "lucide-react";

const config = {
  wifi: { icon: Wifi, label: "Wi-Fi" },
  outlet: { icon: Plug, label: "콘센트" },
  parking: { icon: ParkingSquare, label: "주차" },
  pet: { icon: PawPrint, label: "반려동물" },
} as const;

export default function AmenityIcon({ type }: { type: keyof typeof config }) {
  const { icon: Icon, label } = config[type];
  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-border bg-white py-4">
      <Icon size={22} className="text-ink" strokeWidth={1.8} />
      <span className="text-[12px] text-ink-secondary">{label}</span>
    </div>
  );
}
