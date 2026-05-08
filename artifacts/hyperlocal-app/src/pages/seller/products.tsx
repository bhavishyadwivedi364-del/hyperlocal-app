import { useState, useRef } from "react";
import {
  useListSellerProducts,
  useCreateSellerProduct,
  useUpdateSellerProduct,
  useDeleteSellerProduct,
  useListCategories,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Package, Upload, X, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

interface ProductForm {
  name: string; price: string; mrp: string; description: string;
  unit: string; imageUrl: string; categoryId: string;
  stockQuantity: string; inStock: boolean; hsn: string; gstPercent: string;
}

const emptyForm: ProductForm = {
  name: "", price: "", mrp: "", description: "", unit: "",
  imageUrl: "", categoryId: "", stockQuantity: "", inStock: true,
  hsn: "", gstPercent: "5",
};

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
        if (!res.ok) {
          const err = await res.json();
          reject(new Error(err.error || "Upload failed"));
          return;
        }
        const { url } = await res.json();
        resolve(url);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function SellerProducts() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading } = useListSellerProducts();
  const { data: categories } = useListCategories();

  const { mutate: createProduct, isPending: creating } = useCreateSellerProduct({
    mutation: {
      onSuccess: () => { toast({ title: "Product added!" }); setOpen(false); setForm(emptyForm); },
      onError: () => toast({ title: "Failed to add product", variant: "destructive" }),
    },
  });

  const { mutate: updateProduct, isPending: updating } = useUpdateSellerProduct({
    mutation: {
      onSuccess: () => { toast({ title: "Product updated!" }); setOpen(false); setEditId(null); setForm(emptyForm); },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    },
  });

  const { mutate: deleteProduct } = useDeleteSellerProduct({
    mutation: {
      onSuccess: () => toast({ title: "Product removed" }),
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  function openCreate() { setEditId(null); setForm(emptyForm); setOpen(true); }
  function openEdit(p: any) {
    setEditId(p.id);
    setForm({
      name: p.name ?? "", price: String(p.price ?? ""), mrp: String(p.mrp ?? ""),
      description: p.description ?? "", unit: p.unit ?? "", imageUrl: p.imageUrl ?? "",
      categoryId: String(p.categoryId ?? ""), stockQuantity: String(p.stockQuantity ?? ""),
      inStock: p.inStock ?? true, hsn: p.hsn ?? "", gstPercent: String(p.gstPercent ?? "5"),
    });
    setOpen(true);
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Image must be under 5MB", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
      toast({ title: "Image uploaded!" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  function handleSubmit() {
    if (!form.name || !form.price || !form.categoryId) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name, price: parseFloat(form.price),
      mrp: form.mrp ? parseFloat(form.mrp) : undefined,
      description: form.description || undefined, unit: form.unit || undefined,
      imageUrl: form.imageUrl || undefined, categoryId: parseInt(form.categoryId, 10),
      stockQuantity: form.stockQuantity ? parseInt(form.stockQuantity, 10) : undefined,
      inStock: form.inStock,
    };
    if (editId) updateProduct({ productId: editId, ...payload });
    else createProduct(payload);
  }

  const inStockCount = products?.filter((p: any) => p.inStock).length ?? 0;
  const outOfStockCount = (products?.length ?? 0) - inStockCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("myProducts")}</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            {inStockCount} in stock · {outOfStockCount} out of stock
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t("addProduct")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : !products || products.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-medium text-muted-foreground">No products yet</p>
          <Button onClick={openCreate} className="mt-4 gap-2" variant="outline">
            <Plus className="h-4 w-4" />
            Add your first product
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {(products as any[]).map((product) => (
            <div key={product.id} className="flex items-center gap-3 p-3 bg-white border rounded-xl shadow-sm">
              <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-50">
                    <Package className="h-6 w-6 text-orange-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm line-clamp-1">{product.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold text-primary">₹{product.price}</span>
                  {product.mrp && product.mrp > product.price && (
                    <span className="text-xs text-muted-foreground line-through">₹{product.mrp}</span>
                  )}
                  {product.unit && <span className="text-xs text-muted-foreground">· {product.unit}</span>}
                </div>
                <Badge variant={product.inStock ? "default" : "destructive"} className="text-[10px] mt-1 px-1.5 py-0">
                  {product.inStock ? t("inStock") : t("outOfStock")}
                </Badge>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(product)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                  onClick={() => deleteProduct(product.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? t("editProduct") : t("addProduct")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Image Upload */}
            <div>
              <Label className="text-xs text-muted-foreground">{t("uploadImage")}</Label>
              <div className="mt-1.5 flex gap-2">
                {form.imageUrl ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border shrink-0">
                    <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                      className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span className="text-[10px]">Upload</span>
                      </>
                    )}
                  </button>
                )}
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="Or paste image URL..."
                    value={form.imageUrl.startsWith("/api/") ? "" : form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Max 5MB · JPG, PNG, WebP</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            <div>
              <Label className="text-xs">{t("productName")} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 h-9" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{t("price")} (₹) *</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">{t("mrp")} (₹)</Label>
                <Input type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="mt-1 h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger className="mt-1 h-9">
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
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 resize-none text-sm" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Unit (e.g. 1kg)</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Stock Qty</Label>
                <Input type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} className="mt-1 h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">HSN Code</Label>
                <Input value={form.hsn} onChange={(e) => setForm({ ...form, hsn: e.target.value })} className="mt-1 h-9" placeholder="e.g. 1904" />
              </div>
              <div>
                <Label className="text-xs">GST %</Label>
                <Select value={form.gstPercent} onValueChange={(v) => setForm({ ...form, gstPercent: v })}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["0", "5", "12", "18", "28"].map((g) => (
                      <SelectItem key={g} value={g}>{g}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Switch checked={form.inStock} onCheckedChange={(v) => setForm({ ...form, inStock: v })} />
              <Label className="text-sm">{form.inStock ? t("inStock") : t("outOfStock")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={creating || updating || uploading}>
              {editId ? "Update" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
