import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export type JobType = "new_install" | "detach_reset" | "service";

export interface SubcontractJob {
  id: string;
  contractor_id: string;
  job_type: JobType;
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

  contractor?: {
    name: string;
    company_name?: string | null;
    default_new_install_ppw?: number | null;
    default_detach_reset_price_per_panel?: number | null;
    default_service_rate?: number | null;
  };
}

type ApiResult<T> = { data: T | null; error: string | null };

export function useSubcontractJobs() {
  const [jobs, setJobs] = useState<SubcontractJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("subcontract_jobs")
        .select(
          `
          *,
          contractor:contractors(
            name,
            company_name,
            default_new_install_ppw,
            default_detach_reset_price_per_panel,
            default_service_rate
          )
        `
        )
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setJobs((data as SubcontractJob[]) || []);
    } catch (err) {
      console.error("Error fetching subcontract jobs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch subcontract jobs");
    } finally {
      setLoading(false);
    }
  };

  const createJob = async (jobData: Partial<SubcontractJob>): Promise<ApiResult<SubcontractJob>> => {
    try {
      // Hard safety: never allow accidental deletes/unsafe operations
      // (this function only inserts)
      const { data, error: createError } = await supabase
        .from("subcontract_jobs")
        .insert([jobData])
        .select(
          `
          *,
          contractor:contractors(
            name,
            company_name,
            default_new_install_ppw,
            default_detach_reset_price_per_panel,
            default_service_rate
          )
        `
        )
        .single();

      if (createError) throw createError;

      await fetchJobs();
      return { data: data as SubcontractJob, error: null };
    } catch (err) {
      console.error("Error creating subcontract job:", err);
      return {
        data: null,
        error: err instanceof Error ? err.message : "Failed to create subcontract job",
      };
    }
  };

  const updateJob = async (
    jobId: string,
    updates: Partial<SubcontractJob>
  ): Promise<ApiResult<SubcontractJob>> => {
    if (!jobId) return { data: null, error: "Missing job id for update" };

    try {
      const { data, error: updateError } = await supabase
        .from("subcontract_jobs")
        .update(updates)
        .eq("id", jobId)
        .select(
          `
          *,
          contractor:contractors(
            name,
            company_name,
            default_new_install_ppw,
            default_detach_reset_price_per_panel,
            default_service_rate
          )
        `
        )
        .single();

      if (updateError) throw updateError;

      await fetchJobs();
      return { data: data as SubcontractJob, error: null };
    } catch (err) {
      console.error("Error updating subcontract job:", err);
      return {
        data: null,
        error: err instanceof Error ? err.message : "Failed to update subcontract job",
      };
    }
  };

  const deleteJob = async (jobId: string): Promise<ApiResult<null>> => {
    // ✅ hard safety: never allow delete without a valid id
    if (!jobId || typeof jobId !== "string") {
      return { data: null, error: "Missing job id for delete" };
    }

    try {
      const { error: deleteError } = await supabase
        .from("subcontract_jobs")
        .delete()
        .eq("id", jobId);

      if (deleteError) throw deleteError;

      await fetchJobs();
      return { data: null, error: null };
    } catch (err) {
      console.error("Error deleting subcontract job:", err);
      return {
        data: null,
        error: err instanceof Error ? err.message : "Failed to delete subcontract job",
      };
    }
  };

  const getJobById = async (jobId: string): Promise<ApiResult<SubcontractJob>> => {
    if (!jobId) return { data: null, error: "Missing job id" };

    try {
      const { data, error: fetchError } = await supabase
        .from("subcontract_jobs")
        .select(
          `
          *,
          contractor:contractors(
            name,
            company_name,
            default_new_install_ppw,
            default_detach_reset_price_per_panel,
            default_service_rate
          )
        `
        )
        .eq("id", jobId)
        .single();

      if (fetchError) throw fetchError;

      return { data: data as SubcontractJob, error: null };
    } catch (err) {
      console.error("Error fetching subcontract job:", err);
      return {
        data: null,
        error: err instanceof Error ? err.message : "Failed to fetch subcontract job",
      };
    }
  };

  const helpers = useMemo(() => {
    const getJobsByType = (jobType: JobType) => jobs.filter((j) => j.job_type === jobType);
    const getJobsByContractor = (contractorId: string) => jobs.filter((j) => j.contractor_id === contractorId);
    return { getJobsByType, getJobsByContractor };
  }, [jobs]);

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    jobs,
    loading,
    error,
    fetchJobs,
    createJob,
    updateJob,
    deleteJob,
    getJobById,
    ...helpers,
  };
}
