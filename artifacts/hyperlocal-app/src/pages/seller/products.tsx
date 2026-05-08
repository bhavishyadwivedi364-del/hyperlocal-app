import { useState } from "react";
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
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductForm {
  name: string;
  price: string;
  mrp: string;
  description: string;
  unit: string;
  imageUrl: string;
  categoryId: string;
  stockQuantity: string;
  inStock: boolean;
}

const emptyForm: ProductForm = {
  name: "", price: "", mrp: "", description: "", unit: "",
  imageUrl: "", categoryId: "", stockQuantity: "", inStock: true,
};

export function SellerProducts() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const { data: products, isLoading } = useListSellerProducts();
  const { data: categories } = useListCategories();

  const { mutate: createProduct, isPending: creating } = useCreateSellerProduct({
    mutation: {
      onSuccess: () => { toast({ title: "Product created" }); setOpen(false); setForm(emptyForm); },
      onError: () => toast({ title: "Failed to create product", variant: "destructive" }),
    },
  });

  const { mutate: updateProduct, isPending: updating } = useUpdateSellerProduct({
    mutation: {
      onSuccess: () => { toast({ title: "Product updated" }); setOpen(false); setEditId(null); setForm(emptyForm); },
      onError: () => toast({ title: "Failed to update product", variant: "destructive" }),
    },
  });

  const { mutate: deleteProduct } = useDeleteSellerProduct({
    mutation: {
      onSuccess: () => toast({ title: "Product deleted" }),
      onError: () => toast({ title: "Failed to delete product", variant: "destructive" }),
    },
  });

  function openCreate() { setEditId(null); setForm(emptyForm); setOpen(true); }
  function openEdit(p: typeof products extends (infer T)[] | undefined ? T : never) {
    if (!p) return;
    setEditId((p as any).id);
    setForm({
      name: (p as any).name ?? "", price: String((p as any).price ?? ""),
      mrp: String((p as any).mrp ?? ""), description: (p as any).description ?? "",
      unit: (p as any).unit ?? "", imageUrl: (p as any).imageUrl ?? "",
      categoryId: String((p as any).categoryId ?? ""),
      stockQuantity: String((p as any).stockQuantity ?? ""),
      inStock: (p as any).inStock ?? true,
    });
    setOpen(true);
  }

  function handleSubmit() {
    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      mrp: form.mrp ? parseFloat(form.mrp) : undefined,
      description: form.description || undefined,
      unit: form.unit || undefined,
      imageUrl: form.imageUrl || undefined,
      categoryId: parseInt(form.categoryId, 10),
      stockQuantity: form.stockQuantity ? parseInt(form.stockQuantity, 10) : undefined,
      inStock: form.inStock,
    };
    if (editId) {
      updateProduct({ productId: editId, ...payload });
    } else {
      createProduct(payload);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">{products?.length ?? 0} products in your inventory</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
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
        <div className="space-y-3">
          {products.map((product) => (
            <div key={(product as any).id} className="flex items-center gap-3 p-4 bg-card border rounded-xl">
              <div className="w-14 h-14 bg-muted rounded-lg overflow-hidden shrink-0">
                {(product as any).imageUrl ? (
                  <img src={(product as any).imageUrl} alt={(product as any).name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground/30">
                    {(product as any).name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm line-clamp-1">{(product as any).name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold">₹{(product as any).price}</span>
                  {(product as any).unit && <span className="text-xs text-muted-foreground">{(product as any).unit}</span>}
                </div>
                <Badge variant={(product as any).inStock ? "default" : "destructive"} className="text-xs mt-1">
                  {(product as any).inStock ? "In Stock" : "Out of Stock"}
                </Badge>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(product)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteProduct((product as any).id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (₹) *</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>MRP (₹)</Label>
                <Input type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
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
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 resize-none" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unit (e.g. 1 kg, 500ml)</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Stock Quantity</Label>
                <Input type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="mt-1.5" placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.inStock} onCheckedChange={(v) => setForm({ ...form, inStock: v })} />
              <Label>In Stock</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={creating || updating || !form.name || !form.price || !form.categoryId}>
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
