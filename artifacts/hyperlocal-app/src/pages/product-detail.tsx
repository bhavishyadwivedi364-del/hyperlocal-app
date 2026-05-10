import { useParams, Link } from "wouter";
import { useGetProduct, useAddToCart, useGetProductFeedback } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Star, ShoppingCart, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id, 10);
  const { toast } = useToast();
  const [qty, setQty] = useState(1);

  const { data: product, isLoading } = useGetProduct(productId, { query: { enabled: !!productId } });
  const { data: feedback } = useGetProductFeedback(productId, { query: { enabled: !!productId } });

  const { mutate: addToCart, isPending } = useAddToCart({
    mutation: {
      onSuccess: () => toast({ title: `${qty} item(s) added to cart` }),
      onError: () => toast({ title: "Failed to add to cart", variant: "destructive" }),
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Product not found</p>
        <Link href="/" className="text-primary text-sm mt-2 block">Go home</Link>
      </div>
    );
  }

  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => history.back()} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-medium text-sm truncate">{product.name}</span>
      </div>

      <div className="bg-muted rounded-2xl overflow-hidden h-64 mb-6">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl font-bold text-muted-foreground/20">
            {product.name.charAt(0)}
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-xl font-bold leading-tight flex-1 mr-2">{product.name}</h1>
          <Badge variant={product.inStock ? "default" : "destructive"}>
            {product.inStock ? "In Stock" : "Out of Stock"}
          </Badge>
        </div>

        {product.unit && <p className="text-sm text-muted-foreground mb-2">{product.unit}</p>}

        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl font-bold">₹{product.price}</span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-base text-muted-foreground line-through">₹{product.mrp}</span>
          )}
          {discount && (
            <Badge variant="secondary" className="text-green-700 bg-green-50">
              {discount}% off
            </Badge>
          )}
        </div>

        {product.rating && (
          <div className="flex items-center gap-1 mb-3 text-sm">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            <span className="font-medium">{Number(product.rating).toFixed(1)}</span>
            <span className="text-muted-foreground">({product.reviewCount} reviews)</span>
          </div>
        )}

        {product.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
        )}

        {product.shopName && (
          <div className="mt-3">
            <Link href={`/shop/${product.shopId}`} className="text-sm text-primary font-medium hover:underline">
              Sold by {product.shopName}
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-3 bg-muted rounded-full px-1 py-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full"
            onClick={() => setQty(Math.max(1, qty - 1))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="font-semibold w-6 text-center">{qty}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full"
            onClick={() => setQty(qty + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Button
          className="flex-1 gap-2"
          disabled={!product.inStock || isPending}
          onClick={() => addToCart({ data: { productId: product.id, quantity: qty } })}
        >
          <ShoppingCart className="h-4 w-4" />
          Add to Cart — ₹{(product.price * qty).toFixed(2)}
        </Button>
      </div>

      {feedback && feedback.length > 0 && (
        <div>
          <h2 className="font-bold text-base mb-3">Reviews</h2>
          <div className="space-y-3">
            {feedback.slice(0, 5).map((review) => (
              <div key={review.id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{review.userName || "Anonymous"}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < review.rating ? "fill-amber-500 text-amber-500" : "text-muted"}`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
