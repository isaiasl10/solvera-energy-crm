import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Loader2, AlertCircle } from "lucide-react";

type PaymentType = "CHECK" | "ACH" | "WIRE";

type SubcontractCustomerRow = {
  id: string;

  // core
  job_source?: string | null;
  job_type?: "new_install" | "detach_reset" | "service" | string | null;

  contractor_id?: string | null;
  contractor_name?: string | null;

  subcontract_customer_name?: string | null;
  installation_address?: string | null;

  // finance / numbers used in your table
  system_size_kw?: number | null;
  ppw?: number | null;

  gross_revenue?: number | null;
  net_revenue?: number | null;

  // detach/reset
  panel_qty?: number | null;
  price_per_panel?: number | null;
  gross_amount?: number | null;

  // statuses
  subcontract_status?: string | null;
  detach_reset_status?: string | null;

  // invoicing
  invoice_number?: string | null;
  invoice_sent_date?: string | null;
  invoice_paid_date?: string | null;
  payment_type?: PaymentType | null;
  check_number?: string | null;

  // misc
  notes?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

interface Props {
  jobId: string;
  onClose?: () => void;
  onUpdate?: () => void;
}

export default function SubcontractJobDetail({ jobId, onClose, onUpdate }: Props) {
  const [job, setJob] = useState<SubcontractCustomerRow | null>(null);
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

      // IMPORTANT: Your original subcontracting design uses `customers`
      // and stores contractor_name on the customer row.
      const { data, error: fetchError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", jobId)
        .single();

      if (fetchError) throw fetchError;

      // Optional safety: ensure it's actually a subcontract record
      if (data?.job_source && data.job_source !== "subcontract") {
        throw new Error("This record is not a subcontract job.");
      }

      setJob(data as SubcontractCustomerRow);
    } catch (err: any) {
      console.error("Error fetching job:", err);
      setError(err?.message || "Failed to fetch job");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: Partial<SubcontractCustomerRow>) => {
    if (!jobId) return;

    try {
      const { error: updateError } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", jobId);

      if (updateError) throw updateError;

      await fetchJob();
      onUpdate?.();
    } catch (err: any) {
      console.error("Error updating job:", err);
      alert(err?.message || "Failed to update job");
    }
  };

  const money = (n?: number | null) =>
    typeof n === "number"
      ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "-";

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
        <p className="text-red-600">{error || "Job not found"}</p>
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

  const jobType = job.job_type || "new_install";
  const status =
    jobType === "detach_reset"
      ? job.detach_reset_status || job.subcontract_status || "-"
      : job.subcontract_status || "-";

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Subcontract Job Detail
          </h2>
          <p className="text-gray-600 mt-1">
            {job.subcontract_customer_name || "-"} • {job.installation_address || "-"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Contractor: <span className="font-medium text-gray-800">{job.contractor_name || "-"}</span>
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Go Back
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div>
          <div className="text-sm font-medium text-gray-700">Job Type</div>
          <div className="text-gray-900">{jobType}</div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700">Status</div>
          <div className="text-gray-900">{status}</div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700">Invoice #</div>
          <div className="text-gray-900">{job.invoice_number || "-"}</div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700">Net Revenue</div>
          <div className="text-gray-900 font-semibold">{money(job.net_revenue)}</div>
        </div>

        {jobType === "new_install" && (
          <>
            <div>
              <div className="text-sm font-medium text-gray-700">System Size</div>
              <div className="text-gray-900">
                {typeof job.system_size_kw === "number" ? `${job.system_size_kw} kW` : "-"}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">Gross Revenue</div>
              <div className="text-gray-900">{money(job.gross_revenue)}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">PPW</div>
              <div className="text-gray-900">
                {typeof job.ppw === "number" ? `$${job.ppw.toFixed(2)}` : "-"}
              </div>
            </div>
          </>
        )}

        {jobType === "detach_reset" && (
          <>
            <div>
              <div className="text-sm font-medium text-gray-700">Panel Qty</div>
              <div className="text-gray-900">
                {typeof job.panel_qty === "number" ? `${job.panel_qty}` : "-"}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">Price / Panel</div>
              <div className="text-gray-900">{money(job.price_per_panel)}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">Gross Amount</div>
              <div className="text-gray-900">{money(job.gross_amount)}</div>
            </div>
          </>
        )}
      </div>

      {/* Example update hook (optional) */}
      {/* <button onClick={() => handleUpdate({ subcontract_status: "install_complete" })}>Mark Complete</button> */}
    </div>
  );
}
