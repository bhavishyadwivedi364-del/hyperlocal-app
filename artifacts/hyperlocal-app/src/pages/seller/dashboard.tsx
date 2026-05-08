import { useGetSellerDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, IndianRupee, Package, AlertTriangle } from "lucide-react";

export function SellerDashboard() {
  const { data: dashboard, isLoading } = useGetSellerDashboard();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Orders",
      value: dashboard?.totalOrders ?? 0,
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Revenue",
      value: `₹${(dashboard?.totalRevenue ?? 0).toFixed(0)}`,
      icon: IndianRupee,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Total Products",
      value: dashboard?.totalProducts ?? 0,
      icon: Package,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Out of Stock",
      value: dashboard?.outOfStockProducts ?? 0,
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage your shop and track performance</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: dashboard?.pendingOrders ?? 0, color: "text-blue-600 bg-blue-50" },
          { label: "Dispatched", value: dashboard?.dispatchedOrders ?? 0, color: "text-orange-600 bg-orange-50" },
          { label: "Delivered", value: dashboard?.deliveredOrders ?? 0, color: "text-green-600 bg-green-50" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-xl font-bold ${item.color.split(" ")[0]}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {dashboard?.recentOrders && dashboard.recentOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Order #{order.id}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">₹{Number(order.totalAmount).toFixed(0)}</span>
                  <Badge variant="secondary" className="text-xs capitalize">{order.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
