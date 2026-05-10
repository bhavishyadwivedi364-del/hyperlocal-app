import { useParams, Link } from "wouter";
import { useGetShop, useListProducts, useAddToCart } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Star, Clock, Plus, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const shopId = parseInt(id, 10);
  const { toast } = useToast();

  const { data: shop, isLoading: shopLoading } = useGetShop(shopId, { query: { enabled: !!shopId } });
  const { data: products, isLoading: productsLoading } = useListProducts(
    { shopId, limit: 50 },
    { query: { enabled: !!shopId } }
  );

  const { mutate: addToCart, isPending } = useAddToCart({
    mutation: {
      onSuccess: () => toast({ title: "Added to cart" }),
      onError: () => toast({ title: "Failed to add", variant: "destructive" }),
    },
  });

  if (shopLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Shop not found</p>
        <Link href="/shops" className="text-primary text-sm mt-2 block">Browse shops</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href="/shops" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="font-medium text-sm truncate">{shop.name}</span>
      </div>

      <div className="bg-muted rounded-2xl overflow-hidden h-44 mb-4">
        {shop.imageUrl ? (
          <img src={shop.imageUrl} alt={shop.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-muted-foreground/20">
            {shop.name.charAt(0)}
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-bold">{shop.name}</h1>
          <Badge variant={shop.isOpen ? "default" : "secondary"}>
            {shop.isOpen ? "Open" : "Closed"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm mb-3">{shop.description}</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {shop.rating && (
            <span className="flex items-center gap-1 font-medium text-amber-600">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              {Number(shop.rating).toFixed(1)} ({shop.reviewCount} reviews)
            </span>
          )}
          {shop.deliveryTime && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {shop.deliveryTime}
            </span>
          )}
        </div>
        {shop.address && <p className="text-xs text-muted-foreground mt-2">{shop.address}</p>}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">Products</h2>
        <Link href="/cart">
          <Button variant="outline" size="sm" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            View Cart
          </Button>
        </Link>
      </div>

      {productsLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52 w-full rounded-xl" />)}
        </div>
      ) : products?.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No products available yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products?.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <Link href={`/product/${product.id}`}>
                <div className="aspect-square bg-muted overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground/20">
                      {product.name.charAt(0)}
                    </div>
                  )}
                </div>
              </Link>
              <CardContent className="p-3">
                <Link href={`/product/${product.id}`}>
                  <p className="font-medium text-sm line-clamp-2 leading-tight mb-0.5">{product.name}</p>
                  {product.unit && <p className="text-xs text-muted-foreground">{product.unit}</p>}
                </Link>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <span className="font-bold text-sm">₹{product.price}</span>
                    {product.mrp && product.mrp > product.price && (
                      <span className="text-xs text-muted-foreground line-through ml-1">₹{product.mrp}</span>
                    )}
                  </div>
                  <Button
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    disabled={!product.inStock || isPending}
                    onClick={() => addToCart({ data: { productId: product.id, quantity: 1 } })}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {!product.inStock && <p className="text-xs text-destructive mt-1">Out of stock</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
