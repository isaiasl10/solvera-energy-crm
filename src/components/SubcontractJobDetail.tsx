import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ServiceJobDetail from "./ServiceJobDetail";
import DetachResetJobDetail from "./DetachResetJobDetail";
import { Loader2, AlertCircle } from "lucide-react";

interface SubcontractJobDetailProps {
  jobId: string;
  onClose?: () => void;
  onUpdate?: () => void;
}

type JobType = "new_install" | "detach_reset" | "service";

type SubcontractJobRow = {
  id: string;
  contractor_id: string | null;
  job_type: JobType | string | null;

  customer_name: string | null;
  address: string | null;

  // new install
  system_size_kw: number | string | null;
  gross_amount: number | string | null;

  // detach/reset
  panel_qty: number | string | null;
  price_per_panel: number | string | null;

  // shared
  labor_cost: number | string | null;
  material_cost: number | string | null;
  net_revenue: number | string | null;
  workflow_status: string | null;

  invoice_number: string | null;

  created_at: string | null;
  updated_at: string | null;

  contractor?: {
    company_name?: string | null;
    ppw?: number | string | null;
    default_detach_reset_price_per_panel?: number | string | null;
  } | null;
};

const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function SubcontractJobDetail({ jobId, onClose, onUpdate }: SubcontractJobDetailProps) {
  const [job, setJob] = useState<SubcontractJobRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ FIX: Read from subcontract_jobs (not customers)
      const { data, error: fetchError } = await supabase
        .from("subcontract_jobs")
        .select(
          `
          *,
          contractor:contractors(
            company_name,
            ppw,
            default_detach_reset_price_per_panel
          )
        `
        )
        .eq("id", jobId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setJob(null);
        setError("Job not found (0 rows). This is usually RLS blocking access to that record.");
        return;
      }

      setJob(data as SubcontractJobRow);
    } catch (err: any) {
      console.error("Error fetching job:", err);
      setError(err?.message || "Failed to fetch job");
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: Partial<SubcontractJobRow>) => {
    if (!job) return;

    try {
      const { error: updateError } = await supabase
        .from("subcontract_jobs")
        .update(updates)
        .eq("id", job.id);

      if (updateError) throw updateError;

      await fetchJob();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Error updating job:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-600 text-center px-6">{error || "Job not found"}</p>
        {onClose && (
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            Go Back
          </button>
        )}
      </div>
    );
  }

  const jobType = (job.job_type || "new_install") as JobType;

  // ✅ Adapt to what your EXISTING detail components already expect (NO UI changes inside them)
  const adapted: any = {
    ...job,
    job_type: jobType,

    // names expected by older UI components
    customer_name: job.customer_name || "",
    address: job.address || "",

    // normalize numeric fields so invoice math/UI doesn’t crash
    system_size_kw: toNum(job.system_size_kw),
    panel_qty: toNum(job.panel_qty),
    price_per_panel: toNum(job.price_per_panel),
    gross_amount: toNum(job.gross_amount),
    labor_cost: toNum(job.labor_cost) ?? 0,
    material_cost: toNum(job.material_cost) ?? 0,
    net_revenue: toNum(job.net_revenue) ?? toNum(job.gross_amount) ?? 0,

    workflow_status: job.workflow_status || "pending",

    contractor: {
      company_name: job.contractor?.company_name || "",
      ppw: toNum(job.contractor?.ppw),
      default_detach_reset_price_per_panel: toNum(job.contractor?.default_detach_reset_price_per_panel),
    },
  };

  if (jobType === "service") {
    return <ServiceJobDetail job={adapted} onUpdate={handleUpdate as any} />;
  }

  if (jobType === "detach_reset") {
    return <DetachResetJobDetail job={adapted} onUpdate={handleUpdate as any} />;
  }

  // ✅ For new_install: still render your existing “service-like” detail UI
  // so you keep the editable/invoice/scheduling behavior (without redesign).
  return <ServiceJobDetail job={adapted} onUpdate={handleUpdate as any} />;
}
