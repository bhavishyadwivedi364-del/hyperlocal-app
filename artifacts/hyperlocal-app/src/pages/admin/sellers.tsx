import { useState } from "react";
import { useListAdminSellers, useApproveSeller } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AdminSellers() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const { data: sellers, isLoading } = useListAdminSellers(
    { status: filter !== "all" ? filter : undefined },
    { query: { enabled: true } }
  );

  const { mutate: approveSeller } = useApproveSeller({
    mutation: {
      onSuccess: () => toast({ title: "Seller status updated" }),
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    },
  });

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    suspended: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sellers</h1>
          <p className="text-muted-foreground text-sm mt-1">{sellers?.length ?? 0} sellers</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : !sellers || sellers.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          <Store className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-medium text-muted-foreground">No sellers found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sellers.map((seller) => (
            <Card key={(seller as any).id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted rounded-xl overflow-hidden flex items-center justify-center">
                      {(seller as any).imageUrl ? (
                        <img src={(seller as any).imageUrl} alt={(seller as any).name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">{(seller as any).name?.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{(seller as any).name}</p>
                      <p className="text-xs text-muted-foreground">{(seller as any).categoryName}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusColors[(seller as any).status] ?? ""}`}>
                    {(seller as any).status}
                  </span>
                </div>

                {(seller as any).address && (
                  <p className="text-xs text-muted-foreground mb-3">{(seller as any).address}, {(seller as any).city}</p>
                )}
                <p className="text-xs text-muted-foreground mb-3">
                  Registered: {new Date((seller as any).createdAt).toLocaleDateString("en-IN")}
                </p>

                <div className="flex gap-2">
                  {(seller as any).status !== "active" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => approveSeller({ shopId: (seller as any).id, status: "active" })}
                    >
                      Approve
                    </Button>
                  )}
                  {(seller as any).status !== "suspended" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => approveSeller({ shopId: (seller as any).id, status: "suspended" })}
                    >
                      Suspend
                    </Button>
                  )}
                  {(seller as any).status === "suspended" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approveSeller({ shopId: (seller as any).id, status: "active" })}
                    >
                      Reactivate
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
