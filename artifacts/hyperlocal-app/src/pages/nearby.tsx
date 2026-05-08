import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { MapPin, Star, Clock, Navigation, Store } from "lucide-react";

interface NearbyShop {
  id: number;
  name: string;
  categoryName: string | null;
  address: string | null;
  imageUrl: string | null;
  rating: number | null;
  deliveryTime: string | null;
  isOpen: boolean | null;
  minimumOrder: number | null;
  distanceKm: number | null;
}

export function NearbyShopsPage() {
  const { t } = useI18n();
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(10);

  const fetchNearbyShops = async (lat: number, lng: number, r: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shops?lat=${lat}&lng=${lng}&radius=${r}&limit=20`);
      if (!res.ok) throw new Error("Failed to load shops");
      const data = await res.json();
      setShops(data);
    } catch {
      setError("Failed to load nearby shops");
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        setLocating(false);
        fetchNearbyShops(lat, lng, radius);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) setError("Location access denied. Please enable location permission.");
        else setError("Could not get your location. Try again.");
      },
      { timeout: 10000 },
    );
  };

  // Try to get location on mount
  useEffect(() => {
    getLocation();
  }, []);

  const handleRadiusChange = (r: number) => {
    setRadius(r);
    if (coords) fetchNearbyShops(coords.lat, coords.lng, r);
  };

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="bg-primary text-primary-foreground px-4 py-3">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {t("nearbyShopsTitle")}
        </h1>
        {coords && (
          <p className="text-xs text-primary-foreground/80 mt-0.5">
            GPS location found · Showing within {radius}km
          </p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Location Status */}
        {!coords && !locating && (
          <div className="bg-white rounded-2xl border p-6 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <h2 className="font-semibold mb-1">{t("enableLocation")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Allow location access to find shops near you
            </p>
            <Button onClick={getLocation} className="gap-2">
              <Navigation className="h-4 w-4" />
              Find Shops Near Me
            </Button>
          </div>
        )}

        {locating && (
          <div className="bg-white rounded-2xl border p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin mb-3" />
            <p className="text-sm font-medium">{t("locating")}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-sm text-red-700 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={getLocation}>Try Again</Button>
          </div>
        )}

        {/* Radius filter */}
        {coords && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Radius:</span>
            {[2, 5, 10, 20].map((r) => (
              <button
                key={r}
                onClick={() => handleRadiusChange(r)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${radius === r ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-muted-foreground"}`}
              >
                {r}km
              </button>
            ))}
          </div>
        )}

        {/* Shops List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border p-3 flex gap-3 animate-pulse">
                <div className="w-20 h-20 bg-gray-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : coords && shops.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="font-semibold">{t("noShopsNearby")}</h3>
            <p className="text-sm text-muted-foreground mt-1">Try increasing the search radius</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shops.map((shop) => (
              <Link
                key={shop.id}
                href={`/shop/${shop.id}`}
                className="flex gap-3 bg-white rounded-2xl p-3 border border-border shadow-sm hover:shadow-md transition-shadow"
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
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-semibold text-sm">{shop.name}</h3>
                    <Badge
                      variant={shop.isOpen ? "default" : "secondary"}
                      className="text-[10px] shrink-0 px-1.5 py-0"
                    >
                      {shop.isOpen ? t("openNow") : t("closed")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{shop.categoryName}</p>
                  {shop.address && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {shop.address}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {shop.distanceKm !== null && (
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-primary">
                        <Navigation className="h-3 w-3" />
                        {shop.distanceKm < 1
                          ? `${Math.round(shop.distanceKm * 1000)}m`
                          : `${shop.distanceKm.toFixed(1)}km`}
                      </span>
                    )}
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
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
