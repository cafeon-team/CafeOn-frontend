import BottomNav from "@/components/BottomNav";
import AuthGate from "@/components/AuthGate";
import { ReviewsProvider } from "@/lib/reviews-store";
import { OrdersProvider } from "@/lib/orders-store";
import { BenefitsProvider } from "@/lib/benefits-store";
import { WishlistProvider } from "@/lib/wishlist-store";
import { StoresProvider } from "@/lib/stores-store";
import { CartProvider } from "@/lib/cart-store";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // StoresProvider가 카페(매장) 목록의 진짜 출처예요. WishlistProvider를 비롯한
    // 아래 화면들이 여기서 카페 데이터를 읽으므로 반드시 가장 바깥에 있어야 해요.
    <StoresProvider>
      <WishlistProvider>
        <ReviewsProvider>
          <OrdersProvider>
            <BenefitsProvider>
              <CartProvider>
                <div className="flex h-dvh flex-col overflow-hidden bg-cream">
                  <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
                    <AuthGate>{children}</AuthGate>
                  </div>
                  <BottomNav />
                </div>
              </CartProvider>
            </BenefitsProvider>
          </OrdersProvider>
        </ReviewsProvider>
      </WishlistProvider>
    </StoresProvider>
  );
}
