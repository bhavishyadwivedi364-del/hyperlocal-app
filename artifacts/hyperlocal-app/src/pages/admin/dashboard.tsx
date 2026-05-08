import { useGetAdminDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, Store, ShoppingBag, IndianRupee, TrendingUp, Clock, Download, AlertCircle } from "lucide-react";

function StatCard({ label, value, icon: Icon, color, bg }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-2`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard() {
  const { data: dashboard, isLoading } = useGetAdminDashboard();

  const handleExport = (type: "orders" | "users" | "products") => {
    window.open(`/api/admin/export/${type}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Users", value: dashboard?.totalUsers ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Sellers", value: dashboard?.totalSellers ?? 0, icon: Store, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Pending Approval", value: dashboard?.pendingSellers ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Total Orders", value: dashboard?.totalOrders ?? 0, icon: ShoppingBag, color: "text-green-600", bg: "bg-green-50" },
    { label: "Total Revenue", value: `₹${(dashboard?.totalRevenue ?? 0).toFixed(0)}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Today's Orders", value: dashboard?.todayOrders ?? 0, icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  // Simple bar chart
  const revenueData = (dashboard as any)?.revenueByDay ?? [];
  const maxRev = Math.max(...revenueData.map((d: any) => d.revenue), 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Platform overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      {/* Revenue Chart */}
      {revenueData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-20">
              {revenueData.map((d: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/80 rounded-sm transition-all"
                    style={{ height: `${Math.max((d.revenue / maxRev) * 64, d.revenue > 0 ? 4 : 0)}px` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{d.date}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <span>Today: <strong className="text-foreground">₹{(dashboard as any)?.todayRevenue?.toFixed(0)}</strong></span>
              <span>Month: <strong className="text-foreground">₹{(dashboard as any)?.monthRevenue?.toFixed(0)}</strong></span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      {dashboard?.categoryBreakdown && dashboard.categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.categoryBreakdown.map((cat) => (
                <div key={cat.categoryName} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{cat.categoryName}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{(cat as any).shopCount} shops</span>
                    <span>{(cat as any).orderCount} orders</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Sellers Alert */}
      {(dashboard?.pendingSellers ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 flex-1">
            <strong>{dashboard?.pendingSellers}</strong> seller(s) waiting for approval
          </p>
        </div>
      )}

      {/* Export Buttons */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => handleExport("orders")}>
            <Download className="h-3.5 w-3.5" /> Export Orders (CSV)
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => handleExport("users")}>
            <Download className="h-3.5 w-3.5" /> Export Users (CSV)
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => handleExport("products")}>
            <Download className="h-3.5 w-3.5" /> Export Products (CSV)
          </Button>
        </CardContent>
      </Card>

      {/* Recent Feedback */}
      {dashboard?.recentFeedback && dashboard.recentFeedback.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentFeedback.slice(0, 5).map((fb: any) => (
                <div key={fb.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0 text-sm font-bold">
                    {(fb.userName ?? "A")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{fb.userName ?? "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{fb.comment ?? "—"}</p>
                  </div>
                  <div className="text-amber-500 text-xs font-semibold shrink-0">★ {fb.rating}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
