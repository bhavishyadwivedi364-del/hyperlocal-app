import { useState } from "react";
import { useListAdminOrders } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Download, Search } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const { data: orders, isLoading } = useListAdminOrders(
    { status: filter !== "all" ? filter : undefined, limit: 200 },
    { query: { enabled: true } }
  );

  const filtered = (orders as any[] ?? []).filter((o) => {
    if (!search) return true;
    return [o.shopName, String(o.id), o.deliveryAddress, o.customerPhone]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });

  const totalRevenue = filtered
    .filter((o) => o.status === "delivered")
    .reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">All Orders</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            {filtered.length} orders · ₹{totalRevenue.toFixed(0)} revenue
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open("/api/admin/export/orders", "_blank")}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {["placed", "confirmed", "preparing", "dispatched", "delivered", "cancelled"].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-2xl">
          <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No orders found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order: any) => (
            <Card key={order.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="font-semibold text-sm">Order #{order.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.shopName} · {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize ${statusColors[order.status] ?? ""}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-xs text-muted-foreground space-x-2">
                    <span>{order.items?.length ?? 0} item(s)</span>
                    <span className="font-medium text-foreground capitalize">{order.paymentMethod}</span>
                    {order.customerPhone && <span>{order.customerPhone}</span>}
                  </div>
                  <span className="font-bold text-primary">₹{Number(order.totalAmount).toFixed(0)}</span>
                </div>
                {order.deliveryAddress && (
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">→ {order.deliveryAddress}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
