import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useGetCart, usePlaceOrder, useGetUserProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Banknote, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: cart } = useGetCart();
  const { data: profile } = useGetUserProfile();
  const [address, setAddress] = useState(profile?.address ?? "");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");

  const { mutate: placeOrder, isPending } = usePlaceOrder({
    mutation: {
      onSuccess: (order) => {
        toast({ title: "Order placed successfully!" });
        setLocation(`/order/${order.id}`);
      },
      onError: () => toast({ title: "Failed to place order", variant: "destructive" }),
    },
  });

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Your cart is empty</p>
        <Link href="/shops"><Button className="mt-4">Browse Shops</Button></Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/cart" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Checkout</h1>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="font-semibold mb-3">Order Items ({items.length})</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b last:border-0">
                <span className="flex-1 line-clamp-1">{item.productName} × {item.quantity}</span>
                <span className="font-medium shrink-0 ml-2">₹{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 text-base">
              <span>Total</span>
              <span>₹{cart?.totalAmount?.toFixed(2)}</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-3">Delivery Address</h2>
          <div className="space-y-3">
            <div>
              <Label>Full Address</Label>
              <Textarea
                placeholder="House/Flat number, Street, Area..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1.5 resize-none"
                rows={3}
              />
            </div>
            <div>
              <Label>Delivery Notes (optional)</Label>
              <Input
                placeholder="Any special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-3">Payment Method</h2>
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "cod" | "online")}>
            <div className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="cod" id="cod" />
              <Label htmlFor="cod" className="flex items-center gap-2 cursor-pointer font-medium">
                <Banknote className="h-5 w-5 text-green-600" />
                Cash on Delivery
              </Label>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors mt-2">
              <RadioGroupItem value="online" id="online" />
              <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer font-medium">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Online Payment
                <span className="text-xs text-muted-foreground font-normal">(coming soon)</span>
              </Label>
            </div>
          </RadioGroup>
        </section>

        <Button
          className="w-full h-12 text-base font-semibold"
          disabled={!address.trim() || isPending}
          onClick={() =>
            placeOrder({
              paymentMethod,
              deliveryAddress: address.trim(),
              deliveryNotes: notes.trim() || undefined,
            })
          }
        >
          {isPending ? "Placing Order..." : `Place Order — ₹${cart?.totalAmount?.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
}
