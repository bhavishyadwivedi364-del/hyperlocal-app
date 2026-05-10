import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useGetCart, usePlaceOrder, useGetUserProfile, useUpdateUserProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Banknote, CreditCard, Smartphone, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";

type PayMethod = "cod" | "online" | "upi";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: cart, isLoading: cartLoading } = useGetCart();
  const { data: profile } = useGetUserProfile();
  const { mutate: updateProfile } = useUpdateUserProfile();

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("cod");
  const [razorpayLoading, setRazorpayLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setAddress(profile.address ?? "");
      setCity(profile.city ?? "");
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const { mutate: placeOrder, isPending } = usePlaceOrder({
    mutation: {
      onSuccess: (order) => {
        queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
        if (address.trim()) {
          updateProfile({ data: { address: address.trim(), city: city.trim() || undefined } });
        }
        toast({ title: "Order placed successfully!" });
        setLocation(`/order/${order.id}`);
      },
      onError: (err: any) => {
        toast({ title: err?.message || "Failed to place order", variant: "destructive" });
      },
    },
  });

  // Compute these early so callbacks can reference them
  const total = cart?.totalAmount ?? 0;
  const canPlaceOrder = address.trim().length > 0;

  const handlePlaceNonRazorpayOrder = useCallback(() => {
    placeOrder({
      data: {
        paymentMethod: paymentMethod === "upi" ? "online" : paymentMethod,
        deliveryAddress: `${name ? name + ", " : ""}${address.trim()}${city ? ", " + city : ""}`,
        deliveryNotes: notes.trim() || undefined,
      },
    });
  }, [paymentMethod, name, address, city, notes, placeOrder]);

  const handleRazorpay = useCallback(async () => {
    if (!canPlaceOrder) return;
    setRazorpayLoading(true);
    try {
      const deliveryAddr = `${name ? name + ", " : ""}${address.trim()}${city ? ", " + city : ""}`;

      // Step 1: Create Razorpay order on backend
      const createRes = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });
      const createData = await createRes.json();

      if (!createRes.ok) {
        if (createData.code === "RAZORPAY_NOT_CONFIGURED") {
          // Fallback: place as COD with online label
          toast({
            title: "Razorpay not configured",
            description: "Placing order with payment pending. Please set up Razorpay keys.",
          });
          placeOrder({
            data: {
              paymentMethod: "online",
              deliveryAddress: deliveryAddr,
              deliveryNotes: notes.trim() || undefined,
            },
          });
          return;
        }
        throw new Error(createData.error || "Failed to initiate payment");
      }

      // Step 2: Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load payment gateway. Please check your connection.");

      // Step 3: Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: createData.keyId,
          amount: createData.amount,
          currency: createData.currency,
          name: "NearKart",
          description: "Order Payment",
          order_id: createData.orderId,
          prefill: {
            name: name || undefined,
            contact: phone || undefined,
          },
          theme: { color: "#f97316" },
          handler: async (response: any) => {
            try {
              // Step 4: Verify payment and place order
              const verifyRes = await fetch("/api/payments/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  deliveryAddress: deliveryAddr,
                  deliveryNotes: notes.trim() || undefined,
                  customerName: name || undefined,
                  customerPhone: phone || undefined,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed");

              queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
              if (address.trim()) updateProfile({ data: { address: address.trim(), city: city.trim() || undefined } });
              toast({ title: "Payment successful!", description: "Your order has been placed." });
              setLocation(`/order/${verifyData.orderId}`);
              resolve();
            } catch (err: any) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("cancelled")),
          },
        });
        rzp.open();
      });
    } catch (err: any) {
      if (err.message !== "cancelled") {
        toast({ title: err.message || "Payment failed", variant: "destructive" });
      }
    } finally {
      setRazorpayLoading(false);
    }
  }, [canPlaceOrder, name, address, city, notes, phone, total, placeOrder, queryClient, updateProfile, setLocation, toast]);

  if (cartLoading) {
    return <div className="p-4 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  const items = cart?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <p className="text-muted-foreground">{t("cart_empty")}</p>
        <Link href="/shops"><Button className="mt-4">{t("browseShops")}</Button></Link>
      </div>
    );
  }

  const paymentOptions: { id: PayMethod; label: string; desc: string; icon: any; color: string }[] = [
    { id: "cod", label: t("cashOnDelivery"), desc: "Pay when your order arrives", icon: Banknote, color: "text-green-600" },
    { id: "upi", label: t("upiPayment"), desc: "GPay, PhonePe, Paytm UPI", icon: Smartphone, color: "text-blue-600" },
    { id: "online", label: "Pay via Razorpay", desc: "Cards, Net Banking, Wallets", icon: CreditCard, color: "text-purple-600" },
  ];

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="bg-white px-4 py-3 border-b flex items-center gap-3">
        <Link href="/cart" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Checkout</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Order Items Summary */}
        <div className="bg-white rounded-2xl border p-4">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            Order Items <span className="text-muted-foreground font-normal">({items.length})</span>
          </h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="flex-1 text-foreground line-clamp-1">
                  {item.productName} <span className="text-muted-foreground">× {item.quantity}</span>
                </span>
                <span className="font-medium shrink-0 ml-3">₹{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t flex justify-between">
              <span className="text-muted-foreground text-sm">Delivery</span>
              <span className="text-green-600 text-sm font-medium">{t("free")}</span>
            </div>
            <div className="flex justify-between font-bold text-base">
              <span>{t("total")}</span>
              <span className="text-primary">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-2xl border p-4">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {t("deliveryAddress")}
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t("name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="mt-1 h-10" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("phone")}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="mt-1 h-10" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Address *</Label>
              <Textarea
                placeholder="House/Flat no., Street, Area..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 resize-none"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("city")}</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="mt-1 h-10" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Delivery Instructions (optional)</Label>
              <Input
                placeholder="Any special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 h-10"
              />
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl border p-4">
          <h2 className="font-semibold text-sm mb-3">{t("paymentMethod")}</h2>
          <div className="space-y-2">
            {paymentOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = paymentMethod === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isSelected ? "text-primary" : opt.color}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* GST Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
          GST is included in the product price. Invoice will be shared after delivery.
        </div>

        {/* Place Order Button */}
        {paymentMethod === "online" ? (
          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={!canPlaceOrder || razorpayLoading}
            onClick={handleRazorpay}
          >
            {razorpayLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting to Razorpay...</>
            ) : (
              `Pay ₹${total.toFixed(2)} via Razorpay`
            )}
          </Button>
        ) : (
          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={!canPlaceOrder || isPending}
            onClick={handlePlaceNonRazorpayOrder}
          >
            {isPending ? "Placing Order..." : `${t("placeOrder")} — ₹${total.toFixed(2)}`}
          </Button>
        )}
        {!canPlaceOrder && (
          <p className="text-xs text-center text-muted-foreground">Please enter a delivery address to continue</p>
        )}
      </div>
    </div>
  );
}
