import { useState } from "react";
import { useListAdminOrders } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag } from "lucide-react";

const statusColors: Record<string, string> = {
  placed: "bg-blue-100 text-blue-700",
  confirmed: "bg-purple-100 text-purple-700",
  preparing: "bg-yellow-100 text-yellow-700",
  dispatched: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function AdminOrders() {
  const [filter, setFilter] = useState("all");
  const { data: orders, isLoading } = useListAdminOrders(
    { status: filter !== "all" ? filter : undefined, limit: 100 },
    { query: { enabled: true } }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">{orders?.length ?? 0} orders</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {["placed", "confirmed", "preparing", "dispatched", "delivered", "cancelled"].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-medium text-muted-foreground">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...orders].reverse().map((order) => (
            <Card key={(order as any).id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">Order #{(order as any).id}</p>
                    <p className="text-xs text-muted-foreground">
                      {(order as any).shopName} · {new Date((order as any).createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusColors[(order as any).status] ?? ""}`}>
                    {(order as any).status}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-muted-foreground">{(order as any).items?.length} item(s) · {(order as any).paymentMethod?.toUpperCase()}</span>
                  <span className="font-bold">₹{Number((order as any).totalAmount).toFixed(0)}</span>
                </div>
                {(order as any).deliveryAddress && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">→ {(order as any).deliveryAddress}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
