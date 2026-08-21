import { OwnerProvider } from "@/lib/owner-store";
import OwnerBottomNav from "@/components/owner/OwnerBottomNav";
import OwnerAuthGate from "@/components/owner/OwnerAuthGate";

export default function OwnerShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OwnerProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-cream">
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          <OwnerAuthGate>{children}</OwnerAuthGate>
        </div>
        <OwnerBottomNav />
      </div>
    </OwnerProvider>
  );
}
