import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SubcontractJob {
  id: string;
  contractor_id: string;
  job_type: 'new_install' | 'detach_reset' | 'service';
  customer_name: string;
  address: string;
  phone_number?: string;
  email?: string;
  system_size_kw?: number;
  panel_qty?: number;
  price_per_panel?: number;
  gross_amount: number;
  labor_cost: number;
  material_cost: number;
  net_revenue: number;
  workflow_status: string;
  scheduled_date?: string;
  detach_date?: string;
  reset_date?: string;
  invoice_number?: string;
  invoice_sent_date?: string;
  invoice_paid_date?: string;
  payment_type?: 'CHECK' | 'ACH' | 'WIRE';
  check_number?: string;
  notes?: string;
  contractor_job_ref?: string;
  created_at: string;
  updated_at: string;
  contractor?: {
    name: string;
    company_name?: string;
  };
}

export function useSubcontractJobs() {
  const [jobs, setJobs] = useState<SubcontractJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('subcontract_jobs')
        .select(`
          *,
          contractor:contractors(name, company_name)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setJobs(data || []);
    } catch (err) {
      console.error('Error fetching subcontract jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subcontract jobs');
    } finally {
      setLoading(false);
    }
  };

  const createJob = async (jobData: Partial<SubcontractJob>) => {
    try {
      const { data, error: createError } = await supabase
        .from('subcontract_jobs')
        .insert([jobData])
        .select()
        .single();

      if (createError) throw createError;

      await fetchJobs();
      return { data, error: null };
    } catch (err) {
      console.error('Error creating subcontract job:', err);
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to create subcontract job'
      };
    }
  };

  const updateJob = async (jobId: string, updates: Partial<SubcontractJob>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('subcontract_jobs')
        .update(updates)
        .eq('id', jobId)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchJobs();
      return { data, error: null };
    } catch (err) {
      console.error('Error updating subcontract job:', err);
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to update subcontract job'
      };
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('subcontract_jobs')
        .delete()
        .eq('id', jobId);

      if (deleteError) throw deleteError;

      await fetchJobs();
      return { error: null };
    } catch (err) {
      console.error('Error deleting subcontract job:', err);
      return {
        error: err instanceof Error ? err.message : 'Failed to delete subcontract job'
      };
    }
  };

  const getJobById = async (jobId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('subcontract_jobs')
        .select(`
          *,
          contractor:contractors(name, company_name, default_new_install_ppw, default_detach_reset_price_per_panel, default_service_rate)
        `)
        .eq('id', jobId)
        .single();

      if (fetchError) throw fetchError;

      return { data, error: null };
    } catch (err) {
      console.error('Error fetching subcontract job:', err);
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch subcontract job'
      };
    }
  };

  const getJobsByType = (jobType: 'new_install' | 'detach_reset' | 'service') => {
    return jobs.filter(job => job.job_type === jobType);
  };

  const getJobsByContractor = (contractorId: string) => {
    return jobs.filter(job => job.contractor_id === contractorId);
  };

  useEffect(() => {
    fetchJobs();
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
    getJobsByType,
    getJobsByContractor,
  };
}
