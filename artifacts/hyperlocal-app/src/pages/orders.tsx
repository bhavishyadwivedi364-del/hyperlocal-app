import { Link } from "wouter";
import { useListOrders } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

const statusColors: Record<string, string> = {
  placed: "bg-blue-100 text-blue-700",
  confirmed: "bg-purple-100 text-purple-700",
  preparing: "bg-yellow-100 text-yellow-700",
  dispatched: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function OrdersPage() {
  const { data: orders, isLoading } = useListOrders({});

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">My Orders</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
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
          {[...orders].reverse().map((order) => (
            <Link key={order.id} href={`/order/${order.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{order.shopName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Order #{order.id} · {new Date(order.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusColors[order.status] ?? "bg-muted text-muted-foreground"}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {order.items.map((i) => i.productName).join(", ")}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">{order.items.length} item(s)</span>
                    <span className="font-bold">₹{Number(order.totalAmount).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
