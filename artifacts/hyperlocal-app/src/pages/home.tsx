import { useListCategories, useListShops } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link } from "wouter";

export function Home() {
  const { data: categories } = useListCategories();
  const { data: shops } = useListShops({ limit: 4 });

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input 
          placeholder="Search for 'Atta', 'Paracetamol'..." 
          className="pl-10 rounded-full bg-gray-100 border-none h-12"
        />
      </div>

      <section>
        <h2 className="font-bold text-lg mb-4">Categories</h2>
        <div className="grid grid-cols-4 gap-4">
          {categories?.map(category => (
            <Link key={category.id} href={`/category/${category.slug}`} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-xl">
                {/* Fallback icon if no category icon */}
                {category.name.charAt(0)}
              </div>
              <span className="text-xs text-center font-medium line-clamp-1">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">Shops Near You</h2>
          <Link href="/shops" className="text-sm font-semibold text-primary">See all</Link>
        </div>
        <div className="space-y-4">
          {shops?.map(shop => (
            <Link key={shop.id} href={`/shop/${shop.id}`} className="flex gap-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                {shop.imageUrl ? (
                  <img src={shop.imageUrl} alt={shop.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-xl">
                    {shop.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{shop.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-1">{shop.categoryName}</p>
                <div className="flex items-center gap-1 mt-1 text-sm">
                  <span className="font-medium text-orange-500">★ {shop.rating?.toFixed(1) || 'New'}</span>
                  <span className="text-gray-400">• {shop.deliveryTime || '30 mins'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
