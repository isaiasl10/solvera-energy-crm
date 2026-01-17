import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Loader2, AlertCircle } from "lucide-react";
import ServiceJobDetail from "./ServiceJobDetail";
import DetachResetJobDetail from "./DetachResetJobDetail";

interface SubcontractJobDetailProps {
  jobId: string;
  onClose?: () => void;
  onUpdate?: () => void;
}

/**
 * IMPORTANT:
 * - Subcontracting Intake reads from `customers` (job_source=subcontract).
 * - contractors table does NOT have `name`, only `company_name`.
 * - Use maybeSingle() to avoid "Cannot coerce the result..." when 0 rows return (RLS / filters).
 */
export default function SubcontractJobDetail({
  jobId,
  onClose,
  onUpdate,
}: SubcontractJobDetailProps) {
  const [job, setJob] = useState<any | null>(null);
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

      // ✅ Read the exact same source as your Intake list: customers
      // ✅ Keep subcontract scope
      const { data, error: fetchError } = await supabase
        .from("customers")
        .select(
          `
          *,
          contractor:contractors(
            company_name,
            default_new_install_ppw,
            default_detach_reset_price_per_panel,
            default_service_rate
          )
        `
        )
        .eq("id", jobId)
        .eq("job_source", "subcontract")
        .maybeSingle(); // ✅ prevents PGRST116/406 when 0 rows

      if (fetchError) throw fetchError;

      if (!data) {
        // 0 rows: either not found, not subcontract, inactive filtering elsewhere, or RLS blocked
        setJob(null);
        setError(
          "Job not found (or access blocked). If this job exists, check customers.job_source='subcontract' and RLS policies."
        );
        return;
      }

      setJob(data);
    } catch (err: any) {
      console.error("Error fetching job:", err);
      setError(err?.message || "Failed to fetch job");
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: Record<string, any>) => {
    if (!job) return;

    try {
      // ✅ Update the same record in customers
      const { error: updateError } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", job.id)
        .eq("job_source", "subcontract");

      if (updateError) throw updateError;

      await fetchJob();
      onUpdate?.();
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
        <p className="text-red-600 text-center max-w-xl px-6">
          {error || "Job not found"}
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  // Your intake writes job_type to customers
  const jobType = job.job_type;

  // Keep your existing detail components without changing layout.
  // They will receive the same job object, just sourced from customers.
  if (jobType === "service") {
    return <ServiceJobDetail job={job} onUpdate={handleUpdate} />;
  }

  if (jobType === "detach_reset") {
    return <DetachResetJobDetail job={job} onUpdate={handleUpdate} />;
  }

  if (jobType === "new_install") {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          New Install Subcontract Job
        </h2>
        <p className="text-gray-600 mb-4">
          {(job.subcontract_customer_name || job.customer_name || "-")} -{" "}
          {(job.installation_address || job.address || "-")}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Size
            </label>
            <p className="text-gray-900">
              {job.system_size_kw ? `${job.system_size_kw} kW` : "-"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gross Amount
            </label>
            <p className="text-gray-900">
              {typeof job.gross_revenue === "number"
                ? `$${job.gross_revenue.toFixed(2)}`
                : typeof job.gross_amount === "number"
                ? `$${job.gross_amount.toFixed(2)}`
                : "-"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Net Revenue
            </label>
            <p className="text-gray-900 font-semibold">
              {typeof job.net_revenue === "number"
                ? `$${job.net_revenue.toFixed(2)}`
                : "-"}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-red-600">Unknown job type: {String(jobType)}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Go Back
        </button>
      )}
    </div>
  );
}
