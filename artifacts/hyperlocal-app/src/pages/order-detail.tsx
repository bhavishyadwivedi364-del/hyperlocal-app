import { useParams, Link } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, CheckCircle, Clock, Package, Truck, Home } from "lucide-react";

const steps = [
  { key: "placed", label: "Order Placed", icon: Package },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "preparing", label: "Preparing", icon: Clock },
  { key: "dispatched", label: "On the Way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

const statusIndex: Record<string, number> = {
  placed: 0, confirmed: 1, preparing: 2, dispatched: 3, delivered: 4, cancelled: -1,
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id, 10);

  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId } });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Order not found</p>
        <Link href="/orders"><Button className="mt-4" variant="outline">Back to Orders</Button></Link>
      </div>
    );
  }

  const currentStep = order.status === "cancelled" ? -1 : (statusIndex[order.status] ?? 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/orders" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Order #{order.id}</h1>
      </div>

      {order.status !== "cancelled" ? (
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <h2 className="font-semibold mb-4 text-sm">Order Status</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
            <div className="space-y-4">
              {steps.map((step, idx) => {
                const isCompleted = idx <= currentStep;
                const isCurrent = idx === currentStep;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-center gap-3 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 transition-colors ${
                      isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                      {isCurrent && order.estimatedDelivery && (
                        <p className="text-xs text-muted-foreground">{order.estimatedDelivery}</p>
                      )}
                    </div>
                    {isCurrent && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6 text-center">
          <p className="text-destructive font-semibold">Order Cancelled</p>
        </div>
      )}

      <div className="bg-card border rounded-2xl p-5 mb-6">
        <h2 className="font-semibold mb-3">Items from {order.shopName}</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden shrink-0">
                {item.productImageUrl ? (
                  <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground/30">
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
          <div className="flex justify-between font-bold pt-3 border-t">
            <span>Total</span>
            <span>₹{Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-5 mb-6">
        <h2 className="font-semibold mb-3">Delivery Details</h2>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-muted-foreground w-28 shrink-0">Address</span>
            <span>{order.deliveryAddress || "—"}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-28 shrink-0">Payment</span>
            <span className="capitalize">{order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-28 shrink-0">Ordered</span>
            <span>{new Date(order.createdAt).toLocaleString("en-IN")}</span>
          </div>
          {order.deliveryNotes && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-28 shrink-0">Notes</span>
              <span>{order.deliveryNotes}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
