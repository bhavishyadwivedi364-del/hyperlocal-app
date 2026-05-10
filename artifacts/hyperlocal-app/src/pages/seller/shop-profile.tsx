import { useState, useEffect, useRef } from "react";
import { useGetSellerShop, useUpdateSellerShop, useCreateSellerShop, useListCategories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, Upload, X, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

async function uploadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result as string;
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        if (!res.ok) { const err = await res.json(); reject(new Error(err.error)); return; }
        const { url } = await res.json();
        resolve(url);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function SellerShopProfile() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { data: shop, isLoading, error } = useGetSellerShop({ query: { retry: false } });
  const { data: categories } = useListCategories();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("30-45 mins");
  const [minimumOrder, setMinimumOrder] = useState("");
  const [deliveryCharge, setDeliveryCharge] = useState("0");
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (shop) {
      setName(shop.name ?? "");
      setDescription(shop.description ?? "");
      setCategoryId(String(shop.categoryId ?? ""));
      setAddress(shop.address ?? "");
      setCity(shop.city ?? "");
      setPhone(shop.phone ?? "");
      setImageUrl(shop.imageUrl ?? "");
      setDeliveryTime(shop.deliveryTime ?? "30-45 mins");
      setMinimumOrder(shop.minimumOrder ? String(shop.minimumOrder) : "");
      setIsOpen(shop.isOpen ?? true);
    }
  }, [shop]);

  const { mutate: updateShop, isPending: updating } = useUpdateSellerShop({
    mutation: {
      onSuccess: () => toast({ title: "Shop updated!" }),
      onError: () => toast({ title: "Failed to update shop", variant: "destructive" }),
    },
  });

  const { mutate: createShop, isPending: creating } = useCreateSellerShop({
    mutation: {
      onSuccess: () => toast({ title: "Shop registered! Awaiting admin approval." }),
      onError: () => toast({ title: "Failed to create shop", variant: "destructive" }),
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Image must be under 5MB", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setImageUrl(url);
      toast({ title: "Image uploaded!" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 space-y-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  }

  function handleSubmit() {
    if (!name || !categoryId) {
      toast({ title: "Shop name and category are required", variant: "destructive" });
      return;
    }
    const payload = {
      name, description: description || undefined,
      categoryId: parseInt(categoryId, 10),
      address: address || undefined, city: city || undefined, phone: phone || undefined,
      imageUrl: imageUrl || undefined, deliveryTime: deliveryTime || undefined,
      minimumOrder: minimumOrder ? parseFloat(minimumOrder) : undefined,
      isOpen,
    };
    if (shop) updateShop({ data: payload });
    else createShop({ data: payload });
  }

  const shopExists = !!shop && !error;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{shopExists ? t("myShop") : t("registerShop")}</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            {shopExists ? "Manage your shop information" : "Set up your shop to start selling"}
          </p>
        </div>
        {shopExists && (
          <Badge
            variant={shop.status === "active" ? "default" : shop.status === "pending" ? "secondary" : "destructive"}
            className="capitalize"
          >
            {shop.status}
          </Badge>
        )}
      </div>

      {!shopExists && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <Store className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Register Your Shop</p>
            <p className="text-xs text-amber-700 mt-0.5">Fill in the details to register. Admin will review and approve your shop.</p>
          </div>
        </div>
      )}

      {shopExists && shop.status === "pending" && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Clock className="h-4 w-4 text-blue-600 shrink-0" />
          <p className="text-xs text-blue-700">{t("shopPending")}</p>
        </div>
      )}

      {shopExists && shop.status === "active" && (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-xs text-green-700">Your shop is live and accepting orders!</p>
        </div>
      )}

      {/* Shop Image */}
      <div className="bg-white rounded-xl border p-4">
        <Label className="text-xs text-muted-foreground mb-2 block">Shop Image</Label>
        <div className="flex gap-3 items-start">
          <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt="Shop" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-orange-50">
                <Store className="h-10 w-10 text-orange-200" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Upload Photo"}
            </Button>
            <Input
              placeholder="Or paste image URL..."
              value={imageUrl.startsWith("/api/") ? "" : imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="h-9 text-xs"
            />
            {imageUrl && (
              <button onClick={() => setImageUrl("")} className="text-xs text-red-500 flex items-center gap-1">
                <X className="h-3 w-3" /> Remove image
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Basic Information</h3>
        <div>
          <Label className="text-xs">{t("shopName")} *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sharma Grocery Store" className="mt-1 h-10" />
        </div>
        <div>
          <Label className="text-xs">{t("shopCategory")} *</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{t("shopDescription")}</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell customers about your shop..." className="mt-1 resize-none text-sm" rows={2} />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Location & Contact</h3>
        <div>
          <Label className="text-xs">{t("shopAddress")}</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop address" className="mt-1 h-10" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">{t("city")}</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="mt-1 h-10" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." className="mt-1 h-10" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Delivery Settings</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Delivery Time</Label>
            <Input value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} placeholder="30-45 mins" className="mt-1 h-10" />
          </div>
          <div>
            <Label className="text-xs">Min. Order (₹)</Label>
            <Input type="number" value={minimumOrder} onChange={(e) => setMinimumOrder(e.target.value)} placeholder="100" className="mt-1 h-10" />
          </div>
        </div>
        <div>
          <Label className="text-xs">{t("gstNumber")}</Label>
          <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="27AAAAA0000A1Z5" className="mt-1 h-10" />
        </div>
        {shopExists && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Switch checked={isOpen} onCheckedChange={setIsOpen} />
            <div>
              <p className="text-sm font-medium">Shop is {isOpen ? "Open" : "Closed"}</p>
              <p className="text-xs text-muted-foreground">Customers {isOpen ? "can" : "cannot"} place orders</p>
            </div>
          </div>
        )}
      </div>

      <Button
        className="w-full h-12 font-semibold"
        disabled={!name || !categoryId || updating || creating}
        onClick={handleSubmit}
      >
        {shopExists
          ? (updating ? "Saving..." : "Save Changes")
          : (creating ? "Registering..." : t("registerShop"))}
      </Button>
    </div>
  );
}
