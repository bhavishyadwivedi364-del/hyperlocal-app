import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCheck, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

type KycStatus = "pending" | "approved" | "rejected";

interface KycRecord {
  id: number;
  userId: string;
  documentType: string;
  documentImageUrl: string;
  documentNumber: string | null;
  status: KycStatus;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

async function fetchAllKyc(status?: string): Promise<KycRecord[]> {
  const url = status ? `/api/admin/kyc?status=${status}` : "/api/admin/kyc";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch KYC submissions");
  return res.json();
}

const statusFilters: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export function AdminKycPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({});

  const { data: submissions = [], isLoading } = useQuery<KycRecord[]>({
    queryKey: ["/api/admin/kyc", statusFilter],
    queryFn: () => fetchAllKyc(statusFilter || undefined),
  });

  const { mutate: approveKyc, isPending: approving } = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/kyc/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "KYC approved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      setExpandedId(null);
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const { mutate: rejectKyc, isPending: rejecting } = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const res = await fetch(`/api/admin/kyc/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "KYC rejected" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      setExpandedId(null);
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-primary" />
              KYC Review
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Review and approve seller identity documents</p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white border-border text-foreground hover:border-primary/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No KYC submissions {statusFilter ? `with status "${statusFilter}"` : ""}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((kyc) => {
              const isExpanded = expandedId === kyc.id;
              const notes = rejectNotes[kyc.id] ?? "";

              return (
                <div key={kyc.id} className="bg-white rounded-2xl border overflow-hidden">
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : kyc.id)}
                  >
                    {/* Status icon */}
                    {kyc.status === "pending" && <Clock className="h-5 w-5 text-amber-500 shrink-0" />}
                    {kyc.status === "approved" && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
                    {kyc.status === "rejected" && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm capitalize">
                          {kyc.documentType.replace("_", " ")}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          kyc.status === "pending" ? "bg-amber-100 text-amber-700"
                            : kyc.status === "approved" ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {kyc.status.charAt(0).toUpperCase() + kyc.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        User: {kyc.userId.slice(0, 16)}...
                        {kyc.documentNumber && <> &nbsp;·&nbsp; Doc No: {kyc.documentNumber}</>}
                        &nbsp;·&nbsp; {new Date(kyc.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>

                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>

                  {isExpanded && (
                    <div className="border-t p-4 space-y-4">
                      {/* Document Image */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Document Image</p>
                        <div className="relative">
                          <img
                            src={kyc.documentImageUrl}
                            alt="KYC document"
                            className="w-full max-h-64 object-contain rounded-xl border bg-gray-50"
                          />
                          <a
                            href={kyc.documentImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Admin notes for rejected */}
                      {kyc.status === "rejected" && kyc.adminNotes && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                          <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                          <p className="text-sm text-red-700">{kyc.adminNotes}</p>
                        </div>
                      )}

                      {/* Actions — only for pending */}
                      {kyc.status === "pending" && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              disabled={approving || rejecting}
                              onClick={() => approveKyc(kyc.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1.5" />
                              Approve
                            </Button>
                          </div>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="text-xs text-muted-foreground mb-1 block">Rejection reason (required)</label>
                              <input
                                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                placeholder="e.g. Document is blurry, please reupload..."
                                value={notes}
                                onChange={(e) => setRejectNotes({ ...rejectNotes, [kyc.id]: e.target.value })}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={notes.length < 5 || approving || rejecting}
                              onClick={() => rejectKyc({ id: kyc.id, notes })}
                            >
                              <XCircle className="h-4 w-4 mr-1.5" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
