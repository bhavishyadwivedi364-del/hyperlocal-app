import { useState, useRef } from "react";
import { SellerLayout } from "@/components/seller-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCheck, Upload, Clock, CheckCircle2, XCircle, AlertCircle, ImageIcon } from "lucide-react";

type DocType = "aadhaar" | "pan" | "shop_license";
type KycStatus = "pending" | "approved" | "rejected";

interface KycRecord {
  id: number;
  userId: string;
  documentType: DocType;
  documentImageUrl: string;
  documentNumber: string | null;
  status: KycStatus;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const DOC_OPTIONS: { value: DocType; label: string; desc: string }[] = [
  { value: "aadhaar", label: "Aadhaar Card", desc: "12-digit government identity card" },
  { value: "pan", label: "PAN Card", desc: "Income Tax permanent account number" },
  { value: "shop_license", label: "Shop / GST License", desc: "Shop & Establishment Act or GST certificate" },
];

async function fetchKyc(): Promise<KycRecord | null> {
  const res = await fetch("/api/kyc");
  if (!res.ok) throw new Error("Failed to fetch KYC status");
  return res.json();
}

async function uploadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      if (!res.ok) reject(new Error("Upload failed"));
      const data = await res.json();
      resolve(data.url);
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsDataURL(file);
  });
}

export function SellerKycPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [docType, setDocType] = useState<DocType>("aadhaar");
  const [docNumber, setDocNumber] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: kyc, isLoading } = useQuery<KycRecord | null>({
    queryKey: ["/api/kyc"],
    queryFn: fetchKyc,
    retry: false,
  });

  const { mutate: submitKyc, isPending } = useMutation({
    mutationFn: async () => {
      if (!imageUrl) throw new Error("Please upload a document image");
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType: docType, documentImageUrl: imageUrl, documentNumber: docNumber || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      return data;
    },
    onSuccess: () => {
      toast({ title: "KYC submitted successfully!", description: "Our team will review your documents within 24 hours." });
      queryClient.invalidateQueries({ queryKey: ["/api/kyc"] });
      setImageUrl(null);
      setImagePreview(null);
      setDocNumber("");
    },
    onError: (err: any) => {
      toast({ title: err.message || "Submission failed", variant: "destructive" });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
      const url = await uploadImage(file);
      setImageUrl(url);
      toast({ title: "Document uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </SellerLayout>
    );
  }

  const canResubmit = !kyc || kyc.status === "rejected";

  return (
    <SellerLayout>
      <div className="max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" />
            KYC Verification
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Verify your identity to start selling on NearKart. Required for shop approval.
          </p>
        </div>

        {/* Status Banner */}
        {kyc && (
          <div className={`rounded-2xl p-4 mb-6 flex items-start gap-3 ${
            kyc.status === "approved"
              ? "bg-green-50 border border-green-200"
              : kyc.status === "pending"
              ? "bg-amber-50 border border-amber-200"
              : "bg-red-50 border border-red-200"
          }`}>
            {kyc.status === "approved" && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />}
            {kyc.status === "pending" && <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
            {kyc.status === "rejected" && <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
            <div>
              <p className={`font-semibold text-sm ${
                kyc.status === "approved" ? "text-green-800"
                  : kyc.status === "pending" ? "text-amber-800"
                  : "text-red-800"
              }`}>
                {kyc.status === "approved" ? "KYC Verified"
                  : kyc.status === "pending" ? "Under Review"
                  : "KYC Rejected"}
              </p>
              <p className={`text-xs mt-0.5 ${
                kyc.status === "approved" ? "text-green-700"
                  : kyc.status === "pending" ? "text-amber-700"
                  : "text-red-700"
              }`}>
                {kyc.status === "approved" && "Your identity has been verified. You can now sell on NearKart."}
                {kyc.status === "pending" && "Our team is reviewing your documents. This usually takes 24 hours."}
                {kyc.status === "rejected" && (kyc.adminNotes || "Your submission was rejected. Please resubmit with valid documents.")}
              </p>
              {kyc.status !== "rejected" && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Document: <span className="font-medium capitalize">{kyc.documentType.replace("_", " ")}</span>
                  {kyc.documentNumber && <> &nbsp;·&nbsp; No: {kyc.documentNumber}</>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submission Form */}
        {canResubmit && (
          <div className="bg-white rounded-2xl border p-6 space-y-5">
            {kyc?.status === "rejected" && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Please resubmit with correct and valid documents.
              </div>
            )}

            {/* Document Type */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Document Type</Label>
              <div className="space-y-2">
                {DOC_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDocType(opt.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                      docType === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      docType === opt.value ? "border-primary" : "border-muted-foreground/40"
                    }`}>
                      {docType === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Number */}
            <div>
              <Label htmlFor="docNum" className="text-sm font-semibold mb-1 block">
                Document Number <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="docNum"
                placeholder={docType === "aadhaar" ? "1234 5678 9012" : docType === "pan" ? "ABCDE1234F" : "License / GST number"}
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
                className="h-10"
              />
            </div>

            {/* Document Image Upload */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Document Image *</Label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={imagePreview} alt="Document preview" className="w-full h-48 object-cover" />
                  <button
                    onClick={() => { setImagePreview(null); setImageUrl(null); }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-36 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  {uploading ? (
                    <div className="text-sm text-muted-foreground animate-pulse">Uploading...</div>
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload document photo</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG up to 5MB</p>
                    </>
                  )}
                </button>
              )}
            </div>

            <Button
              onClick={() => submitKyc()}
              disabled={!imageUrl || isPending || uploading}
              className="w-full h-11 font-semibold"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isPending ? "Submitting..." : "Submit for Verification"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your documents are stored securely and used only for identity verification.
            </p>
          </div>
        )}

        {!canResubmit && kyc?.status === "approved" && (
          <div className="bg-white rounded-2xl border p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="font-bold text-lg">Fully Verified</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Your account is verified and in good standing. You can sell on NearKart.
            </p>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
