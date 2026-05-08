import { useState, useEffect } from "react";
import { useGetSellerShop, useUpdateSellerShop, useCreateSellerShop, useListCategories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SellerShopProfile() {
  const { toast } = useToast();
  const { data: shop, isLoading } = useGetSellerShop();
  const { data: categories } = useListCategories();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [minimumOrder, setMinimumOrder] = useState("");
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
      setDeliveryTime(shop.deliveryTime ?? "");
      setMinimumOrder(shop.minimumOrder ? String(shop.minimumOrder) : "");
      setIsOpen(shop.isOpen ?? true);
    }
  }, [shop]);

  const { mutate: updateShop, isPending: updating } = useUpdateSellerShop({
    mutation: {
      onSuccess: () => toast({ title: "Shop updated successfully" }),
      onError: () => toast({ title: "Failed to update shop", variant: "destructive" }),
    },
  });

  const { mutate: createShop, isPending: creating } = useCreateSellerShop({
    mutation: {
      onSuccess: () => toast({ title: "Shop created! Awaiting admin approval." }),
      onError: () => toast({ title: "Failed to create shop", variant: "destructive" }),
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  function handleSubmit() {
    const payload = {
      name,
      description: description || undefined,
      categoryId: parseInt(categoryId, 10),
      address: address || undefined,
      city: city || undefined,
      phone: phone || undefined,
      imageUrl: imageUrl || undefined,
      deliveryTime: deliveryTime || undefined,
      minimumOrder: minimumOrder ? parseFloat(minimumOrder) : undefined,
      isOpen,
    };
    if (shop) {
      updateShop(payload);
    } else {
      createShop(payload);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{shop ? "Shop Profile" : "Create Your Shop"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {shop ? "Manage your shop information" : "Set up your shop to start selling"}
          </p>
        </div>
        {shop && (
          <Badge variant={shop.status === "active" ? "default" : shop.status === "pending" ? "secondary" : "destructive"} className="capitalize">
            {shop.status}
          </Badge>
        )}
      </div>

      {!shop && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <Store className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">Fill in the details below to register your shop. It will be reviewed by our team before going live.</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label>Shop Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sharma Grocery Store" className="mt-1.5" />
        </div>
        <div>
          <Label>Category *</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell customers about your shop..." className="mt-1.5 resize-none" rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Patna" className="mt-1.5" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="mt-1.5" />
          </div>
        </div>
        <div>
          <Label>Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop address" className="mt-1.5" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Delivery Time</Label>
            <Input value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} placeholder="e.g. 30-45 mins" className="mt-1.5" />
          </div>
          <div>
            <Label>Minimum Order (₹)</Label>
            <Input type="number" value={minimumOrder} onChange={(e) => setMinimumOrder(e.target.value)} placeholder="e.g. 100" className="mt-1.5" />
          </div>
        </div>
        <div>
          <Label>Shop Image URL</Label>
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="mt-1.5" />
        </div>
        {shop && (
          <div className="flex items-center gap-3 p-4 border rounded-xl">
            <Switch checked={isOpen} onCheckedChange={setIsOpen} />
            <div>
              <p className="font-medium text-sm">Shop is {isOpen ? "Open" : "Closed"}</p>
              <p className="text-xs text-muted-foreground">Toggle to control whether customers can order</p>
            </div>
          </div>
        )}
        <Button
          className="w-full"
          disabled={!name || !categoryId || updating || creating}
          onClick={handleSubmit}
        >
          {shop ? (updating ? "Saving..." : "Save Changes") : (creating ? "Creating..." : "Create Shop")}
        </Button>
      </div>
    </div>
  );
}
