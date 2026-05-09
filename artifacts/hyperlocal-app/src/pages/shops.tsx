import { useState } from "react";
import { Link } from "wouter";
import { useListShops, useListCategories } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, Clock, SlidersHorizontal, X, ChevronDown } from "lucide-react";

type SortOption = "default" | "rating" | "name";
type StatusFilter = "all" | "open" | "closed";

export function ShopsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories } = useListCategories();
  const { data: rawShops, isLoading } = useListShops({
    search: search || undefined,
    category: selectedCategory,
    limit: 50,
  });

  // Client-side filter + sort
  const shops = rawShops
    ?.filter((shop) => {
      if (statusFilter === "open") return shop.isOpen === true;
      if (statusFilter === "closed") return shop.isOpen === false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

  const hasActiveFilters = statusFilter !== "all" || sortBy !== "default";
  const activeCount = (statusFilter !== "all" ? 1 : 0) + (sortBy !== "default" ? 1 : 0);

  function clearFilters() {
    setStatusFilter("all");
    setSortBy("default");
  }

  return (
    <div>
      {/* Search bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search shops..."
            className="pl-10 rounded-full bg-muted border-none h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center border transition-colors relative ${
            hasActiveFilters
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-muted/50 rounded-xl p-3 mb-3 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Filters & Sort</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-primary font-medium hover:underline">
                Clear all
              </button>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Shop Status</p>
            <div className="flex gap-2">
              {(["all", "open", "closed"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground bg-white hover:border-primary"
                  }`}
                >
                  {s === "all" ? "All" : s === "open" ? "Open Now" : "Closed"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Sort By</p>
            <div className="flex gap-2">
              {([
                { value: "default", label: "Default" },
                { value: "rating", label: "Top Rated" },
                { value: "name", label: "A–Z" },
              ] as { value: SortOption; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    sortBy === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground bg-white hover:border-primary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        <button
          onClick={() => setSelectedCategory(undefined)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !selectedCategory
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-foreground hover:border-primary"
          }`}
        >
          All
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.slug === selectedCategory ? undefined : cat.slug)}
            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              selectedCategory === cat.slug
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-foreground hover:border-primary"
            }`}
          >
            <span>{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Results header */}
      {!isLoading && shops && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">
            {shops.length} {shops.length === 1 ? "shop" : "shops"} found
            {search ? ` for "${search}"` : ""}
            {selectedCategory ? ` in ${categories?.find((c) => c.slug === selectedCategory)?.name ?? selectedCategory}` : ""}
          </p>
        </div>
      )}

      {/* Shop list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : shops?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No shops found</p>
          <p className="text-sm mt-1">Try a different search, category, or filter</p>
          {(search || selectedCategory || hasActiveFilters) && (
            <button
              onClick={() => { setSearch(""); setSelectedCategory(undefined); clearFilters(); }}
              className="mt-4 text-sm text-primary font-medium hover:underline"
            >
              Clear all filters
            </button>
          )}
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
                        <div className="min-w-0">
                          <h3 className="font-semibold line-clamp-1">{shop.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{shop.categoryName}</p>
                        </div>
                        <Badge
                          variant={shop.isOpen ? "default" : "secondary"}
                          className={`text-[10px] shrink-0 ${shop.isOpen ? "bg-green-100 text-green-700 border-green-200" : ""}`}
                        >
                          {shop.isOpen ? "Open" : "Closed"}
                        </Badge>
                      </div>
                      {shop.address && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{shop.address}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        {shop.rating && (
                          <span className="flex items-center gap-0.5 font-medium text-amber-600">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            {Number(shop.rating).toFixed(1)}
                            {shop.reviewCount ? (
                              <span className="text-muted-foreground font-normal ml-0.5">({shop.reviewCount})</span>
                            ) : null}
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
