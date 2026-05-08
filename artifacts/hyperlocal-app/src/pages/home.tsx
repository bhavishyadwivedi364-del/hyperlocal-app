import { useState } from "react";
import {
  useListCategories,
  useListShops,
  useListProducts,
  useAddToCart,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import {
  Search, Star, Clock, ChevronRight, ShoppingCart, Plus,
  ShoppingBag, Pill, UtensilsCrossed, Smartphone, Leaf, Store, Zap,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, any> = {
  ShoppingCart, Pill, UtensilsCrossed, Smartphone, Leaf, Store, ShoppingBag, Zap,
};

const BANNERS = [
  { bg: "from-orange-500 to-red-500", title: "Fresh Groceries", subtitle: "Delivered in 30 mins", icon: "🛒" },
  { bg: "from-green-500 to-teal-500", title: "Medicines", subtitle: "From trusted pharmacies", icon: "💊" },
  { bg: "from-purple-500 to-indigo-500", title: "Hot Food", subtitle: "Order from local restaurants", icon: "🍱" },
];

function ImagePlaceholder({ name, color = "#f97316", size = "full" }: { name: string; color?: string; size?: string }) {
  return (
    <div
      className={`w-${size} h-full flex items-center justify-center text-white font-bold text-2xl`}
      style={{ backgroundColor: color + "30", color }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function Home() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [bannerIdx, setBannerIdx] = useState(0);

  const { data: categories } = useListCategories();
  const { data: shops } = useListShops({ limit: 6 });
  const { data: featured } = useListProducts({ isFeatured: true, limit: 10 } as any);

  const { mutate: addToCart } = useAddToCart({
    mutation: {
      onSuccess: () => toast({ title: "Added to cart!" }),
      onError: () => toast({ title: "Please login to add items", variant: "destructive" }),
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) setLocation(`/shops?search=${encodeURIComponent(search)}`);
  };

  const banner = BANNERS[bannerIdx];

  return (
    <div className="bg-gray-50">
      {/* Hero Banner */}
      <div className={`bg-gradient-to-r ${banner.bg} p-5 text-white relative overflow-hidden`}>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-6xl opacity-20">{banner.icon}</div>
        <p className="text-xs font-medium uppercase tracking-wider opacity-80 mb-1">Today's Pick</p>
        <h2 className="text-xl font-bold">{banner.title}</h2>
        <p className="text-sm opacity-90 mt-0.5">{banner.subtitle}</p>
        {/* Dots */}
        <div className="flex gap-1.5 mt-3">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setBannerIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === bannerIdx ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 -mt-4 relative z-10">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl bg-white shadow-md border-0 text-sm"
          />
        </form>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base text-foreground">{t("categories")}</h2>
            <Link href="/shops" className="text-xs font-semibold text-primary flex items-center">
              {t("seeAll")} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {categories?.slice(0, 8).map((cat) => {
              const Icon = CATEGORY_ICONS[cat.icon] || Store;
              return (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{ backgroundColor: cat.color + "20" }}
                  >
                    <Icon className="h-6 w-6" style={{ color: cat.color }} />
                  </div>
                  <span className="text-[10px] text-center font-medium text-foreground leading-tight line-clamp-2">
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Featured Products */}
        {featured && featured.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base">{t("featuredProducts")}</h2>
              <Link href="/shops" className="text-xs font-semibold text-primary flex items-center">
                {t("seeAll")} <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {featured.map((product) => {
                const discount = product.mrp && product.mrp > product.price
                  ? Math.round((1 - product.price / product.mrp) * 100)
                  : null;
                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    className="shrink-0 w-36 bg-white rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="h-28 bg-gray-100 overflow-hidden relative">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-orange-50">
                          <ShoppingBag className="h-10 w-10 text-orange-200" />
                        </div>
                      )}
                      {discount && (
                        <Badge className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 bg-green-500 hover:bg-green-500">
                          {discount}% OFF
                        </Badge>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-semibold line-clamp-2 leading-tight">{product.name}</p>
                      {product.unit && <p className="text-[10px] text-muted-foreground mt-0.5">{product.unit}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <span className="text-sm font-bold text-foreground">₹{product.price}</span>
                          {product.mrp && product.mrp > product.price && (
                            <span className="text-[10px] text-muted-foreground line-through ml-1">₹{product.mrp}</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            addToCart({ productId: product.id, quantity: 1 });
                          }}
                          className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Nearby Shops */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base">{t("nearbyShops")}</h2>
            <Link href="/shops" className="text-xs font-semibold text-primary flex items-center">
              {t("seeAll")} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {shops?.map((shop) => (
              <Link
                key={shop.id}
                href={`/shop/${shop.id}`}
                className="flex gap-3 bg-white rounded-xl p-3 border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                  {shop.imageUrl ? (
                    <img src={shop.imageUrl} alt={shop.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-orange-50">
                      <Store className="h-8 w-8 text-orange-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-1">{shop.name}</h3>
                    <Badge
                      variant={shop.isOpen ? "default" : "secondary"}
                      className="text-[10px] shrink-0 px-1.5 py-0.5"
                    >
                      {shop.isOpen ? t("openNow") : t("closed")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{shop.categoryName}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {shop.rating && (
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                        <Star className="h-3 w-3 fill-current" />
                        {Number(shop.rating).toFixed(1)}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {shop.deliveryTime || "30 mins"}
                    </span>
                    {shop.minimumOrder && (
                      <span className="text-xs text-muted-foreground">
                        Min ₹{shop.minimumOrder}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}

            {(!shops || shops.length === 0) && (
              <div className="text-center py-8">
                <Store className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No shops available yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Become a Seller CTA */}
        <section className="bg-gradient-to-r from-primary to-orange-600 rounded-2xl p-4 text-white mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base">{t("becomeSeller")}</h3>
              <p className="text-xs opacity-90 mt-0.5">Register your shop and start selling today</p>
            </div>
            <Link href="/profile">
              <Button variant="secondary" size="sm" className="shrink-0 font-semibold">
                Start Now <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
