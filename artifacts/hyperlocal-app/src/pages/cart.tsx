import { Link } from "wouter";
import { useGetCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Plus, Minus, Trash2, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CartPage() {
  const { toast } = useToast();
  const { data: cart, isLoading } = useGetCart();

  const { mutate: updateItem } = useUpdateCartItem({
    mutation: {
      onError: () => toast({ title: "Failed to update cart", variant: "destructive" }),
    },
  });

  const { mutate: removeItem } = useRemoveCartItem({
    mutation: {
      onError: () => toast({ title: "Failed to remove item", variant: "destructive" }),
    },
  });

  const { mutate: clearCart } = useClearCart({
    mutation: {
      onSuccess: () => toast({ title: "Cart cleared" }),
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  const items = cart?.items ?? [];
  const isEmpty = items.length === 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Your Cart</h1>
      </div>

      {isEmpty ? (
        <div className="text-center py-20">
          <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg font-semibold text-muted-foreground">Your cart is empty</p>
          <p className="text-sm text-muted-foreground mt-1">Add items from shops to get started</p>
          <Link href="/shops">
            <Button className="mt-6">Browse Shops</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 bg-card border rounded-xl">
                <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden shrink-0">
                  {item.productImageUrl ? (
                    <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground/30">
                      {item.productName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">{item.shopName}</p>
                  <p className="font-semibold text-sm mt-1">₹{item.subtotal.toFixed(2)}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-1 bg-muted rounded-full px-1">
                    <button
                      onClick={() => updateItem({ cartItemId: item.id, quantity: item.quantity - 1 })}
                      className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-background transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateItem({ cartItemId: item.id, quantity: item.quantity + 1 })}
                      className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-background transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border rounded-xl p-4 mb-6">
            <h2 className="font-semibold mb-3">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({cart?.totalItems} items)</span>
                <span>₹{cart?.totalAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t text-base">
                <span>Total</span>
                <span>₹{cart?.totalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/checkout">
              <Button className="w-full h-12 text-base font-semibold">
                Proceed to Checkout — ₹{cart?.totalAmount?.toFixed(2)}
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => clearCart()}
            >
              Clear Cart
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
