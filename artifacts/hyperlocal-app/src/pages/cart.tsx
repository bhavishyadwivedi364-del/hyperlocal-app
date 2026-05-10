import { Link, useLocation } from "wouter";
import { useGetCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Plus, Minus, Trash2, Store, ChevronRight, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";

export function CartPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: cart, isLoading } = useGetCart();

  const { mutate: updateItem } = useUpdateCartItem({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/cart"] }),
      onError: () => toast({ title: "Failed to update cart", variant: "destructive" }),
    },
  });

  const { mutate: removeItem, isPending: removing } = useRemoveCartItem({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/cart"] }),
      onError: () => toast({ title: "Failed to remove item", variant: "destructive" }),
    },
  });

  const { mutate: clearCart } = useClearCart({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
        toast({ title: "Cart cleared" });
      },
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  const items = cart?.items ?? [];
  const isEmpty = items.length === 0;
  const deliveryCharge = 0; // Free delivery
  const gstAmount = cart?.totalAmount ? cart.totalAmount * 0.05 : 0;

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b">
        <h1 className="text-lg font-bold">{t("cart")}</h1>
        {!isEmpty && (
          <p className="text-xs text-muted-foreground mt-0.5">{cart?.totalItems} items from {new Set(items.map((i) => i.shopName)).size} shop</p>
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-4">
            <ShoppingCart className="h-10 w-10 text-primary/40" />
          </div>
          <h2 className="text-lg font-semibold">{t("cart_empty")}</h2>
          <p className="text-sm text-muted-foreground mt-1 text-center">Add items from shops to get started</p>
          <Link href="/shops">
            <Button className="mt-6 px-8">{t("browseShops")}</Button>
          </Link>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {/* Group by shop */}
          {(() => {
            const shopGroups: Record<string, typeof items> = {};
            items.forEach((item) => {
              const key = item.shopName ?? "Unknown";
              if (!shopGroups[key]) shopGroups[key] = [];
              shopGroups[key].push(item);
            });

            return Object.entries(shopGroups).map(([shopName, shopItems]) => (
              <div key={shopName} className="bg-white rounded-2xl overflow-hidden border border-border shadow-sm">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-gray-50">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{shopName}</span>
                </div>

                {shopItems.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 border-b last:border-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                      {item.productImageUrl ? (
                        <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-300">
                          {item.productName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{item.productName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">₹{item.price} each</p>
                      <p className="font-bold text-sm text-primary mt-1">₹{item.subtotal.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        onClick={() => removeItem({ cartItemId: item.id })}
                        disabled={removing}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-center bg-primary/10 rounded-full overflow-hidden">
                        <button
                          onClick={() => {
                            if (item.quantity === 1) {
                              removeItem({ cartItemId: item.id });
                            } else {
                              updateItem({ cartItemId: item.id, data: { quantity: item.quantity - 1 } });
                            }
                          }}
                          className="w-7 h-7 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-sm font-bold text-primary w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateItem({ cartItemId: item.id, data: { quantity: item.quantity + 1 } })}
                          className="w-7 h-7 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ));
          })()}

          {/* Promo Code Placeholder */}
          <div className="bg-white rounded-xl border p-3 flex items-center gap-3">
            <Tag className="h-4 w-4 text-primary" />
            <input
              className="flex-1 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Enter promo code"
            />
            <Button variant="outline" size="sm" className="h-7 text-xs">Apply</Button>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl border p-4">
            <h2 className="font-semibold text-sm mb-3">{t("orderSummary")}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("subtotal")} ({cart?.totalItems} items)</span>
                <span>₹{cart?.totalAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("delivery")}</span>
                <span className="text-green-600 font-medium">{t("free")}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-base">
                <span>{t("total")}</span>
                <span className="text-primary">₹{cart?.totalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Savings badge */}
          <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-green-600 text-lg">🎉</span>
            <p className="text-xs text-green-700 font-medium">You get FREE delivery on this order!</p>
          </div>

          {/* CTA */}
          <div className="space-y-2 pt-1">
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={() => setLocation("/checkout")}
            >
              {t("proceedToCheckout")} — ₹{cart?.totalAmount?.toFixed(2)}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => clearCart()}
              size="sm"
            >
              Clear Cart
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
