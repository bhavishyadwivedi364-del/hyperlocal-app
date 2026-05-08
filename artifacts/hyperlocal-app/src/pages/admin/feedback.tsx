import { useListAdminFeedback } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Star } from "lucide-react";

const typeColors: Record<string, string> = {
  product_review: "bg-blue-100 text-blue-700",
  shop_review: "bg-purple-100 text-purple-700",
  general: "bg-gray-100 text-gray-700",
  complaint: "bg-red-100 text-red-700",
};

export function AdminFeedback() {
  const { data: feedback, isLoading } = useListAdminFeedback();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feedback & Reviews</h1>
        <p className="text-muted-foreground text-sm mt-1">{feedback?.length ?? 0} entries</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : !feedback || feedback.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-medium text-muted-foreground">No feedback yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...feedback].reverse().map((fb) => (
            <Card key={(fb as any).id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-bold">
                      {((fb as any).userName ?? "A")[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{(fb as any).userName ?? "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">{new Date((fb as any).createdAt).toLocaleDateString("en-IN")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-amber-500" />
                      <span className="text-xs font-semibold">{(fb as any).rating}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${typeColors[(fb as any).type] ?? ""}`}>
                      {(fb as any).type?.replace("_", " ")}
                    </span>
                  </div>
                </div>
                {(fb as any).comment && (
                  <p className="text-sm text-muted-foreground">{(fb as any).comment}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
