import { useParams, Link } from "wouter";
import { useListCategories, useListShops, useListProducts } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Star, Clock } from "lucide-react";

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: categories } = useListCategories();
  const category = categories?.find((c) => c.slug === slug);

  const { data: shops, isLoading: shopsLoading } = useListShops(
    { category: slug, limit: 20 },
    { query: { enabled: !!slug } }
  );

  const { data: products, isLoading: productsLoading } = useListProducts(
    { categoryId: category?.id, limit: 20 },
    { query: { enabled: !!category?.id } }
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{category?.name ?? slug}</h1>
      </div>

      <section className="mb-8">
        <h2 className="font-semibold text-base mb-3 text-muted-foreground uppercase tracking-wide text-xs">Shops</h2>
        {shopsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : shops?.length === 0 ? (
          <p className="text-muted-foreground text-sm">No shops in this category yet.</p>
        ) : (
          <div className="space-y-3">
            {shops?.map((shop) => (
              <Link key={shop.id} href={`/shop/${shop.id}`}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
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
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-sm line-clamp-1">{shop.name}</h3>
                          <Badge variant={shop.isOpen ? "default" : "secondary"} className="text-xs ml-2 shrink-0">
                            {shop.isOpen ? "Open" : "Closed"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{shop.address}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs">
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
      </section>

      <section>
        <h2 className="font-semibold text-base mb-3 text-muted-foreground uppercase tracking-wide text-xs">Products</h2>
        {productsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
          </div>
        ) : products?.length === 0 ? (
          <p className="text-muted-foreground text-sm">No products in this category yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products?.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                  <div className="aspect-square bg-muted overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground/30">
                        {product.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-semibold text-sm line-clamp-2 leading-tight">{product.name}</p>
                    {product.unit && <p className="text-xs text-muted-foreground mt-0.5">{product.unit}</p>}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="font-bold text-sm">₹{product.price}</span>
                      {product.mrp && product.mrp > product.price && (
                        <span className="text-xs text-muted-foreground line-through">₹{product.mrp}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
