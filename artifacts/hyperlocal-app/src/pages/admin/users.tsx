import { useState } from "react";
import { useListAdminUsers } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, Search, Download, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const roleColors: Record<string, string> = {
  customer: "bg-blue-100 text-blue-700",
  seller: "bg-green-100 text-green-700",
  admin: "bg-red-100 text-red-700",
};

export function AdminUsers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const { data: users, isLoading } = useListAdminUsers({ limit: 200 });

  const filtered = (users as any[] ?? []).filter((u) => {
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchSearch = !search || [u.name, u.phone, u.email, u.city]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const handleRoleChange = async (replitId: string, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${replitId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "User role updated" });
      window.location.reload();
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Users</h1>
          <p className="text-muted-foreground text-xs mt-0.5">{filtered.length} of {users?.length ?? 0} users</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open("/api/admin/export/users", "_blank")}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1">
          {["all", "customer", "seller", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium capitalize border transition-colors ${roleFilter === r ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-muted-foreground"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-2xl">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user: any) => (
            <Card key={user.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                    {(user.name ?? "U")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{user.name || "Unnamed User"}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${roleColors[user.role] ?? ""}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {user.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />{user.phone}
                        </span>
                      )}
                      {user.city && (
                        <span className="text-xs text-muted-foreground">{user.city}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Joined {new Date(user.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.replitId, e.target.value)}
                      className="text-xs border rounded-lg px-2 py-1 bg-white text-foreground"
                    >
                      <option value="customer">Customer</option>
                      <option value="seller">Seller</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
