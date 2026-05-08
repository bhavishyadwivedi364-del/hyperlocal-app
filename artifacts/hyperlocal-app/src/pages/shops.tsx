import { useState } from "react";
import { Link } from "wouter";
import { useListShops, useListCategories } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, Clock } from "lucide-react";

export function ShopsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const { data: categories } = useListCategories();
  const { data: shops, isLoading } = useListShops({
    search: search || undefined,
    category: selectedCategory,
    limit: 50,
  });

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Browse Shops</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search shops..."
          className="pl-10 rounded-full bg-muted border-none h-11"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        <button
          onClick={() => setSelectedCategory(undefined)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !selectedCategory ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:border-primary"
          }`}
        >
          All
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              selectedCategory === cat.slug ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:border-primary"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : shops?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No shops found</p>
          <p className="text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shops?.map((shop) => (
            <Link key={shop.id} href={`/shop/${shop.id}`}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-0">
                  <div className="flex gap-3 p-3">
                    <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden shrink-0">
                      {shop.imageUrl ? (
                        <img src={shop.imageUrl} alt={shop.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-2xl">
                          {shop.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold line-clamp-1">{shop.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{shop.categoryName}</p>
                        </div>
                        <Badge variant={shop.isOpen ? "default" : "secondary"} className="text-xs shrink-0">
                          {shop.isOpen ? "Open" : "Closed"}
                        </Badge>
                      </div>
                      {shop.address && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{shop.address}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        {shop.rating && (
                          <span className="flex items-center gap-0.5 font-medium text-amber-600">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            {Number(shop.rating).toFixed(1)}
                          </span>
                        )}
                        {shop.deliveryTime && (
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {shop.deliveryTime}
                          </span>
                        )}
                        {shop.minimumOrder && (
                          <span className="text-muted-foreground">Min. ₹{shop.minimumOrder}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
