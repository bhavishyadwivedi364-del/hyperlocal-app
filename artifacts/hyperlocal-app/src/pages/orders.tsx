import { Link } from "wouter";
import { useListOrders } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Package, ChevronRight, Wifi } from "lucide-react";
import { useOrderWs } from "@/hooks/use-order-ws";
import { useState } from "react";

const statusColors: Record<string, string> = {
  placed:     "bg-blue-100 text-blue-700",
  confirmed:  "bg-purple-100 text-purple-700",
  preparing:  "bg-yellow-100 text-yellow-700",
  dispatched: "bg-orange-100 text-orange-700",
  delivered:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-700",
};

const statusEmoji: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  dispatched: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function OrdersPage() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useListOrders({});

  // Track which orderIds got live updates this session for the badge
  const [updatedOrderIds, setUpdatedOrderIds] = useState<Set<number>>(new Set());

  useOrderWs((update) => {
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    setUpdatedOrderIds((prev) => new Set([...prev, update.orderId]));
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">My Orders</h1>
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          <Wifi className="h-3 w-3" />
          <span>Live updates on</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="text-center py-20">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg font-semibold text-muted-foreground">No orders yet</p>
          <p className="text-sm text-muted-foreground mt-1">Your orders will appear here</p>
          <Link href="/shops">
            <Badge className="mt-4 cursor-pointer">Start Shopping</Badge>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {[...orders].reverse().map((order) => {
            const hasLiveUpdate = updatedOrderIds.has(order.id);
            const isActive = order.status !== "delivered" && order.status !== "cancelled";
            return (
              <Link key={order.id} href={`/order/${order.id}`}>
                <Card className={`hover:shadow-md transition-all cursor-pointer ${hasLiveUpdate ? "ring-2 ring-primary/30 shadow-md" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm truncate">{order.shopName}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isActive && hasLiveUpdate && (
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColors[order.status] ?? "bg-muted text-muted-foreground"}`}>
                              {statusEmoji[order.status] ?? order.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {order.items.map((i) => i.productName).join(", ")}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            #{order.id} · {new Date(order.createdAt).toLocaleDateString("en-IN")}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-sm">₹{Number(order.totalAmount).toFixed(2)}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
