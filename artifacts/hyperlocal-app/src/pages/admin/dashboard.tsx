import { useGetAdminDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Store, ShoppingBag, IndianRupee, TrendingUp, Clock } from "lucide-react";

export function AdminDashboard() {
  const { data: dashboard, isLoading } = useGetAdminDashboard();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Users", value: dashboard?.totalUsers ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Sellers", value: dashboard?.totalSellers ?? 0, icon: Store, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Pending Sellers", value: dashboard?.pendingSellers ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Total Orders", value: dashboard?.totalOrders ?? 0, icon: ShoppingBag, color: "text-green-600", bg: "bg-green-50" },
    { label: "Total Revenue", value: `₹${(dashboard?.totalRevenue ?? 0).toFixed(0)}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Today's Orders", value: dashboard?.todayOrders ?? 0, icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and statistics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
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

      {dashboard?.categoryBreakdown && dashboard.categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.categoryBreakdown.map((cat) => (
                <div key={cat.categoryName} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{cat.categoryName}</span>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{cat.shopCount} shops</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {dashboard?.recentFeedback && dashboard.recentFeedback.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentFeedback.slice(0, 5).map((fb) => (
                <div key={(fb as any).id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0 text-sm font-bold">
                    {((fb as any).userName ?? "A")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{(fb as any).userName ?? "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{(fb as any).comment ?? "—"}</p>
                  </div>
                  <div className="text-amber-500 text-xs font-semibold shrink-0">★ {(fb as any).rating}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
