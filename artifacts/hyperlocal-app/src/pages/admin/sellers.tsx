import { useState } from "react";
import { useListAdminSellers, useApproveSeller } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Store, Search, Download, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  suspended: "bg-red-100 text-red-700",
};

export function AdminSellers() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: sellers, isLoading, refetch } = useListAdminSellers(
    { status: filter !== "all" ? filter : undefined },
    { query: { enabled: true } }
  );

  const { mutate: approveSeller } = useApproveSeller({
    mutation: {
      onSuccess: () => { toast({ title: "Seller status updated" }); refetch(); },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    },
  });

  const filtered = (sellers as any[] ?? []).filter((s) => {
    if (!search) return true;
    return [s.name, s.city, s.phone, s.categoryName].filter(Boolean).join(" ")
      .toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Sellers</h1>
          <p className="text-muted-foreground text-xs mt-0.5">{filtered.length} shops</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open("/api/admin/export/products", "_blank")}>
          <Download className="h-3.5 w-3.5" /> Products CSV
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shops..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1">
          {["all", "pending", "active", "suspended"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-2 py-1.5 text-[11px] rounded-lg font-medium capitalize border transition-colors ${filter === s ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-muted-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-2xl">
          <Store className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No sellers found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((seller: any) => (
            <Card key={seller.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                    {seller.imageUrl ? (
                      <img src={seller.imageUrl} alt={seller.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-gray-400">{seller.name?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{seller.name}</p>
                        <p className="text-xs text-muted-foreground">{seller.categoryName}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize shrink-0 ${statusColors[seller.status] ?? ""}`}>
                        {seller.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {seller.city && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />{seller.city}
                        </span>
                      )}
                      {(seller.phone || seller.ownerPhone) && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Phone className="h-3 w-3" />{seller.phone || seller.ownerPhone}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Registered {new Date(seller.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  {seller.status !== "active" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs flex-1"
                      onClick={() => approveSeller({ shopId: seller.id, data: { status: "active" } })}
                    >
                      {t("approveSeller")}
                    </Button>
                  )}
                  {seller.status === "active" && (
                    <Button
                      size="sm" variant="destructive" className="h-8 text-xs flex-1"
                      onClick={() => approveSeller({ shopId: seller.id, data: { status: "suspended" } })}
                    >
                      {t("suspendSeller")}
                    </Button>
                  )}
                  {seller.status === "suspended" && (
                    <Button
                      size="sm" variant="outline" className="h-8 text-xs flex-1"
                      onClick={() => approveSeller({ shopId: seller.id, data: { status: "active" } })}
                    >
                      Reactivate
                    </Button>
                  )}
                  {seller.status === "pending" && (
                    <Button
                      size="sm" variant="destructive" className="h-8 text-xs"
                      onClick={() => approveSeller({ shopId: seller.id, data: { status: "suspended" } })}
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
