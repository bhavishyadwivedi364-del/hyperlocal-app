import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, CheckCircle, Clock, Package, Truck, Home, Wifi } from "lucide-react";
import { useOrderWs } from "@/hooks/use-order-ws";

const steps = [
  { key: "placed",     label: "Order Placed",  icon: Package },
  { key: "confirmed",  label: "Confirmed",      icon: CheckCircle },
  { key: "preparing",  label: "Preparing",      icon: Clock },
  { key: "dispatched", label: "On the Way",     icon: Truck },
  { key: "delivered",  label: "Delivered",      icon: Home },
];

const statusIndex: Record<string, number> = {
  placed: 0, confirmed: 1, preparing: 2, dispatched: 3, delivered: 4, cancelled: -1,
};

const statusLabels: Record<string, string> = {
  placed: "Order placed — waiting for shop to confirm",
  confirmed: "Shop confirmed your order",
  preparing: "Shop is preparing your order",
  dispatched: "Your order is on the way",
  delivered: "Delivered — enjoy your order!",
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id, 10);
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useGetOrder(orderId, {
    query: { enabled: !!orderId },
  });

  // Live status tracked separately so WS updates render immediately
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  useOrderWs(
    (update) => {
      setLiveStatus(update.status);
      setJustUpdated(true);
      setWsConnected(true);
      // Also invalidate so the cache is fresh if user navigates away and back
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setTimeout(() => setJustUpdated(false), 3000);
    },
    orderId,
  );

  // Once we get the initial order, seed liveStatus
  useEffect(() => {
    if (order && liveStatus === null) setLiveStatus(order.status);
  }, [order, liveStatus]);

  const displayStatus = liveStatus ?? order?.status ?? "placed";
  const currentStep = displayStatus === "cancelled" ? -1 : (statusIndex[displayStatus] ?? 0);
  const isLive = displayStatus !== "delivered" && displayStatus !== "cancelled";

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-muted-foreground">Order not found</p>
        <Link href="/orders">
          <Button className="mt-4" variant="outline">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/orders" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1">Order #{order.id}</h1>
        {isLive && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <Wifi className="h-3 w-3" />
            LIVE
          </div>
        )}
      </div>

      {/* Flash banner on live update */}
      {justUpdated && (
        <div className="mb-4 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 text-sm font-medium text-primary animate-pulse">
          Status updated: {statusLabels[displayStatus] ?? displayStatus}
        </div>
      )}

      {/* Status tracker */}
      {displayStatus !== "cancelled" ? (
        <div className="bg-card border rounded-2xl p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Order Status</h2>
            <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">
              {displayStatus}
            </span>
          </div>

          {/* Horizontal progress bar */}
          <div className="relative mb-6">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="relative">
            <div className="absolute left-4 top-4 bottom-4 w-px bg-muted" />
            <div className="space-y-4">
              {steps.map((step, idx) => {
                const isCompleted = idx <= currentStep;
                const isCurrent = idx === currentStep;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-start gap-3 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 transition-all duration-500 ${
                      isCompleted
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                        : "bg-muted text-muted-foreground"
                    } ${isCurrent ? "ring-2 ring-primary/30 ring-offset-1" : ""}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="pt-1 flex-1">
                      <p className={`text-sm font-medium transition-colors ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {statusLabels[step.key]}
                        </p>
                      )}
                    </div>
                    {isCurrent && (
                      <div className="pt-2.5">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {order.estimatedDelivery && displayStatus !== "delivered" && (
            <div className="mt-4 pt-3 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated delivery</span>
              <span className="text-xs font-semibold">{order.estimatedDelivery}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-4 text-center">
          <p className="text-destructive font-semibold">Order Cancelled</p>
        </div>
      )}

      {/* Items */}
      <div className="bg-card border rounded-2xl p-5 mb-4 shadow-sm">
        <h2 className="font-semibold mb-3">Items from {order.shopName}</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-xl overflow-hidden shrink-0">
                {item.productImageUrl ? (
                  <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base font-bold text-muted-foreground/40">
                    {item.productName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{item.productName}</p>
                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <span className="font-semibold text-sm shrink-0">₹{item.subtotal.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold pt-3 border-t text-sm">
            <span>Total</span>
            <span>₹{Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Delivery details */}
      <div className="bg-card border rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Delivery Details</h2>
        <div className="space-y-2 text-sm">
          <DetailRow label="Address" value={order.deliveryAddress || "—"} />
          <DetailRow
            label="Payment"
            value={order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}
          />
          <DetailRow
            label="Ordered"
            value={new Date(order.createdAt).toLocaleString("en-IN")}
          />
          {order.deliveryNotes && (
            <DetailRow label="Notes" value={order.deliveryNotes} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="flex-1">{value}</span>
    </div>
  );
}
