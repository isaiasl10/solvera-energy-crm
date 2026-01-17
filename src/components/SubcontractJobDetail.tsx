import React, { useEffect, useState } from 'react';
import { SubcontractJob } from '../hooks/useSubcontractJobs';
import { supabase } from '../lib/supabase';
import ServiceJobDetail from './ServiceJobDetail';
import DetachResetJobDetail from './DetachResetJobDetail';
import { Loader2, AlertCircle } from 'lucide-react';

interface SubcontractJobDetailProps {
  jobId: string;
  onClose?: () => void;
  onUpdate?: () => void;
}

export default function SubcontractJobDetail({ jobId, onClose, onUpdate }: SubcontractJobDetailProps) {
  const [job, setJob] = useState<SubcontractJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('subcontract_jobs')
        .select(`
          *,
          contractor:contractors(name, company_name)
        `)
        .eq('id', jobId)
        .single();

      if (fetchError) throw fetchError;

      setJob(data);
    } catch (err) {
      console.error('Error fetching job:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch job');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: Partial<SubcontractJob>) => {
    if (!job) return;

    try {
      const { error: updateError } = await supabase
        .from('subcontract_jobs')
        .update(updates)
        .eq('id', job.id);

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
        <p className="text-red-600">{error || 'Job not found'}</p>
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

  if (job.job_type === 'service') {
    return <ServiceJobDetail job={job} onUpdate={handleUpdate} />;
  }

  if (job.job_type === 'detach_reset') {
    return <DetachResetJobDetail job={job} onUpdate={handleUpdate} />;
  }

  if (job.job_type === 'new_install') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">New Install Subcontract Job</h2>
        <p className="text-gray-600 mb-4">
          {job.customer_name} - {job.address}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Size
            </label>
            <p className="text-gray-900">{job.system_size_kw} kW</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gross Amount
            </label>
            <p className="text-gray-900">${job.gross_amount.toFixed(2)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Net Revenue
            </label>
            <p className="text-gray-900 font-semibold">${job.net_revenue.toFixed(2)}</p>
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
      <p className="text-red-600">Unknown job type: {job.job_type}</p>
    </div>
  );
}
