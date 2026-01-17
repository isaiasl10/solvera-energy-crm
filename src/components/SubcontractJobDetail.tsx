import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ServiceJobDetail from './ServiceJobDetail';
import DetachResetJobDetail from './DetachResetJobDetail';
import { Loader2, AlertCircle } from 'lucide-react';

interface SubcontractJobDetailProps {
  jobId: string;
  onClose?: () => void;
  onUpdate?: () => void;
}

type JobType = 'new_install' | 'detach_reset' | 'service';

type CustomerSubcontractRow = {
  id: string;

  job_source: string | null;
  job_type: JobType | string | null;

  contractor_id: string | null;
  contractor_name: string | null;

  subcontract_customer_name: string | null;
  installation_address: string | null;

  // new install
  system_size_kw: number | null;
  ppw: number | null;
  gross_revenue: number | null;

  // detach/reset
  panel_qty: number | null;
  price_per_panel: number | null;
  gross_amount: number | null;

  // shared
  net_revenue: number | null;
  subcontract_status: string | null;
  detach_reset_status: string | null;

  invoice_number: string | null;

  created_at: string;
  updated_at: string;

  contractor?: {
    company_name?: string | null;
  } | null;
};

export default function SubcontractJobDetail({ jobId, onClose, onUpdate }: SubcontractJobDetailProps) {
  const [job, setJob] = useState<CustomerSubcontractRow | null>(null);
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

      // IMPORTANT: we read from customers because Intake creates subcontract jobs there
      const { data, error: fetchError } = await supabase
        .from('customers')
        .select(
          `
          *,
          contractor:contractors(
            company_name
          )
        `
        )
        .eq('id', jobId)
        .eq('job_source', 'subcontract')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setJob(null);
        setError('Job not found (0 rows). This is usually RLS blocking access to that record.');
        return;
      }

      setJob(data as CustomerSubcontractRow);
    } catch (err) {
      console.error('Error fetching job:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch job');
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: Partial<CustomerSubcontractRow>) => {
    if (!job) return;

    try {
      const { error: updateError } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', job.id)
        .eq('job_source', 'subcontract');

      if (updateError) throw updateError;

      await fetchJob();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error updating job:', err);
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
        <p className="text-red-600 text-center px-6">{error || 'Job not found'}</p>
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

  const jobType = (job.job_type || 'new_install') as JobType;

  // We adapt the row into the shape your existing detail components expect
  // WITHOUT changing their UI.
  const adapted: any = {
    ...job,
    job_type: jobType,
    customer_name: job.subcontract_customer_name || '',
    address: job.installation_address || '',
    gross_amount: job.gross_amount ?? job.gross_revenue ?? 0,
    net_revenue: job.net_revenue ?? 0,
    workflow_status: job.subcontract_status || job.detach_reset_status || 'pending',
    contractor: { company_name: job.contractor?.company_name || job.contractor_name || '' },
  };

  if (jobType === 'service') {
    return <ServiceJobDetail job={adapted} onUpdate={handleUpdate as any} />;
  }

  if (jobType === 'detach_reset') {
    return <DetachResetJobDetail job={adapted} onUpdate={handleUpdate as any} />;
  }

  // new_install fallback
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">New Install Subcontract Job</h2>
      <p className="text-gray-600 mb-4">
        {adapted.customer_name} - {adapted.address}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">System Size</label>
          <p className="text-gray-900">
            {job.system_size_kw != null ? `${job.system_size_kw} kW` : '-'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gross Amount</label>
          <p className="text-gray-900">
            {job.gross_revenue != null ? `$${Number(job.gross_revenue).toFixed(2)}` : '-'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Net Revenue</label>
          <p className="text-gray-900 font-semibold">
            {job.net_revenue != null ? `$${Number(job.net_revenue).toFixed(2)}` : '-'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contractor</label>
          <p className="text-gray-900">
            {job.contractor?.company_name || job.contractor_name || '-'}
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
