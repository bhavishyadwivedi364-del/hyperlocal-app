import { useListAdminUsers } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";

export function AdminUsers() {
  const { data: users, isLoading } = useListAdminUsers({ limit: 100 });

  const roleColors: Record<string, string> = {
    customer: "bg-blue-100 text-blue-700",
    seller: "bg-purple-100 text-purple-700",
    admin: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">{users?.length ?? 0} registered users</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : !users || users.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-medium text-muted-foreground">No users yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const initials = ((user as any).name ?? "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <Card key={(user as any).id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={(user as any).profileImageUrl ?? undefined} />
                      <AvatarFallback className="text-sm font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm line-clamp-1">{(user as any).name ?? "Unnamed User"}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${roleColors[(user as any).role] ?? ""}`}>
                          {(user as any).role}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{(user as any).email ?? "No email"}</p>
                      {(user as any).city && <p className="text-xs text-muted-foreground">{(user as any).city}</p>}
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {new Date((user as any).createdAt).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
