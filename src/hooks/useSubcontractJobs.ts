import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

export interface ContractorLite {
  company_name: string;
  default_new_install_ppw?: number | null;
  default_detach_reset_price_per_panel?: number | null;
  default_service_rate?: number | null;
}

export interface SubcontractJob {
  id: string;
  contractor_id: string;
  job_type: "new_install" | "detach_reset" | "service";
  customer_name: string;
  address: string;

  phone_number?: string | null;
  email?: string | null;

  system_size_kw?: number | null;
  panel_qty?: number | null;
  price_per_panel?: number | null;

  gross_amount: number;
  labor_cost: number;
  material_cost: number;
  net_revenue: number;

  workflow_status: string;

  scheduled_date?: string | null;
  detach_date?: string | null;
  reset_date?: string | null;

  invoice_number?: string | null;
  invoice_sent_date?: string | null;
  invoice_paid_date?: string | null;
  payment_type?: "CHECK" | "ACH" | "WIRE" | null;
  check_number?: string | null;

  notes?: string | null;
  contractor_job_ref?: string | null;

  created_at: string;
  updated_at: string;

  // IMPORTANT: contractors table does NOT have "name" column.
  contractor?: ContractorLite | null;
}

const CONTRACTOR_SELECT = `
  company_name,
  default_new_install_ppw,
  default_detach_reset_price_per_panel,
  default_service_rate
`;

export function useSubcontractJobs() {
  const [jobs, setJobs] = useState<SubcontractJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("subcontract_jobs")
        .select(
          `
          *,
          contractor:contractors(${CONTRACTOR_SELECT})
        `
        )
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setJobs((data as SubcontractJob[]) || []);
    } catch (err: any) {
      console.error("Error fetching subcontract jobs:", err);
      setError(err?.message || "Failed to fetch subcontract jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  const createJob = async (jobData: Partial<SubcontractJob>) => {
    try {
      const { data, error: createError } = await supabase
        .from("subcontract_jobs")
        .insert([jobData])
        .select(
          `
          *,
          contractor:contractors(${CONTRACTOR_SELECT})
        `
        )
        .single();

      if (createError) throw createError;

      await fetchJobs();
      return { data: data as SubcontractJob, error: null };
    } catch (err: any) {
      console.error("Error creating subcontract job:", err);
      return { data: null, error: err?.message || "Failed to create subcontract job" };
    }
  };

  const updateJob = async (jobId: string, updates: Partial<SubcontractJob>) => {
    try {
      if (!jobId) return { data: null, error: "Missing job id for update" };

      const { data, error: updateError } = await supabase
        .from("subcontract_jobs")
        .update(updates)
        .eq("id", jobId)
        .select(
          `
          *,
          contractor:contractors(${CONTRACTOR_SELECT})
        `
        )
        .single();

      if (updateError) throw updateError;

      await fetchJobs();
      return { data: data as SubcontractJob, error: null };
    } catch (err: any) {
      console.error("Error updating subcontract job:", err);
      return { data: null, error: err?.message || "Failed to update subcontract job" };
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      // SAFETY: never delete without an id filter
      if (!jobId || typeof jobId !== "string") {
        return { error: "Missing job id for delete" };
      }

      const { error: deleteError } = await supabase
        .from("subcontract_jobs")
        .delete()
        .eq("id", jobId);

      if (deleteError) throw deleteError;

      await fetchJobs();
      return { error: null };
    } catch (err: any) {
      console.error("Error deleting subcontract job:", err);
      return { error: err?.message || "Failed to delete subcontract job" };
    }
  };

  const getJobById = async (jobId: string) => {
    try {
      if (!jobId) return { data: null, error: "Missing job id" };

      const { data, error: fetchError } = await supabase
        .from("subcontract_jobs")
        .select(
          `
          *,
          contractor:contractors(${CONTRACTOR_SELECT})
        `
        )
        .eq("id", jobId)
        .single();

      if (fetchError) throw fetchError;

      return { data: data as SubcontractJob, error: null };
    } catch (err: any) {
      console.error("Error fetching subcontract job:", err);
      return { data: null, error: err?.message || "Failed to fetch subcontract job" };
    }
  };

  const getJobsByType = (jobType: SubcontractJob["job_type"]) =>
    jobs.filter((j) => j.job_type === jobType);

  const getJobsByContractor = (contractorId: string) =>
    jobs.filter((j) => j.contractor_id === contractorId);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    loading,
    error,
    fetchJobs,
    createJob,
    updateJob,
    deleteJob,
    getJobById,
    getJobsByType,
    getJobsByContractor,
  };
}
