import { useListSellerOrders, useUpdateSellerOrderStatus } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const ORDER_STATUSES = ["placed", "confirmed", "preparing", "dispatched", "delivered", "cancelled"] as const;
type OrderStatus = typeof ORDER_STATUSES[number];

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  placed: "confirmed",
  confirmed: "preparing",
  preparing: "dispatched",
  dispatched: "delivered",
  delivered: null,
  cancelled: null,
};

const statusColors: Record<string, string> = {
  placed: "bg-blue-100 text-blue-700",
  confirmed: "bg-purple-100 text-purple-700",
  preparing: "bg-yellow-100 text-yellow-700",
  dispatched: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function SellerOrders() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const { data: orders, isLoading } = useListSellerOrders(
    { status: filter !== "all" ? filter : undefined },
    { query: { enabled: true } }
  );

  const { mutate: updateStatus } = useUpdateSellerOrderStatus({
    mutation: {
      onSuccess: () => toast({ title: "Order status updated" }),
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">{orders?.length ?? 0} orders</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-medium text-muted-foreground">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...orders].reverse().map((order) => {
            const next = nextStatus[order.status as OrderStatus];
            return (
              <Card key={(order as any).id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">Order #{(order as any).id}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date((order as any).createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusColors[(order as any).status] ?? ""}`}>
                      {(order as any).status}
                    </span>
                  </div>

                  <div className="space-y-1 mb-3">
                    {(order as any).items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.productName} × {item.quantity}</span>
                        <span className="font-medium">₹{item.subtotal.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <span className="font-bold">₹{Number((order as any).totalAmount).toFixed(0)}</span>
                      <span className="text-xs text-muted-foreground ml-2 capitalize">{(order as any).paymentMethod === "cod" ? "COD" : "Online"}</span>
                    </div>
                    {next && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus({ orderId: (order as any).id, data: { status: next } })}
                        className="capitalize"
                      >
                        Mark as {next}
                      </Button>
                    )}
                    {!next && (order as any).status !== "cancelled" && (
                      <Badge className="bg-green-100 text-green-700">Completed</Badge>
                    )}
                  </div>
                  {(order as any).deliveryAddress && (
                    <p className="text-xs text-muted-foreground mt-2 truncate">
                      Deliver to: {(order as any).deliveryAddress}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
