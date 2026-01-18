import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
}

interface Appointment {
  id: string;
  customer_id: string;
  type: 'scheduled_install' | 'site_survey' | 'inspection' | 'service_ticket';
  title: string;
  description: string;
  scheduled_date: string;
  technician_name: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in_progress';
}

interface AppointmentModalProps {
  appointment: Appointment | null;
  defaultDate: Date | null;
  onClose: () => void;
  onSave: () => void;
}

type SubcontractUrlContext = {
  source: 'subcontract';
  jobId: string;
  jobType: 'new_install' | 'detach_reset' | 'service' | string;
};

function readSubcontractUrlContext(): SubcontractUrlContext | null {
  const params = new URLSearchParams(window.location.search);
  const source = params.get('source');
  const jobId = params.get('jobId');
  const jobType = params.get('jobType') || 'new_install';
  if (source === 'subcontract' && jobId) return { source: 'subcontract', jobId, jobType };
  return null;
}

function clearSubcontractUrlParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete('source');
  url.searchParams.delete('jobId');
  url.searchParams.delete('jobType');
  window.history.replaceState({}, '', url.pathname + url.search);
}

export default function AppointmentModal({ appointment, defaultDate, onClose, onSave }: AppointmentModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    type: 'scheduled_install' as const,
    title: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    technician_name: '',
    status: 'scheduled' as const,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Detect subcontract scheduling context from URL (no UI change)
  const [subcontractCtx, setSubcontractCtx] = useState<SubcontractUrlContext | null>(null);

  // Cache subcontract job display info (for auto-title/description only)
  const [subJobLabel, setSubJobLabel] = useState<{ customer_name?: string | null; address?: string | null } | null>(null);

  useEffect(() => {
    const ctx = readSubcontractUrlContext();
    setSubcontractCtx(ctx);
  }, []);

  useEffect(() => {
    fetchCustomers();

    // Normal edit existing appointment
    if (appointment) {
      const date = new Date(appointment.scheduled_date);
      setFormData({
        customer_id: appointment.customer_id,
        type: appointment.type,
        title: appointment.title,
        description: appointment.description,
        scheduled_date: date.toISOString().split('T')[0],
        scheduled_time: date.toTimeString().slice(0, 5),
        technician_name: appointment.technician_name,
        status: appointment.status,
      });
      return;
    }

    // New appointment defaults
    if (defaultDate) {
      setFormData(prev => ({
        ...prev,
        scheduled_date: defaultDate.toISOString().split('T')[0],
        scheduled_time: '09:00',
      }));
    }
  }, [appointment, defaultDate]);

  // ✅ If subcontract context, auto-load subcontract job and prefill title/description
  useEffect(() => {
    if (!subcontractCtx?.jobId) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('subcontract_jobs')
          .select('id, job_type, customer_name, address')
          .eq('id', subcontractCtx.jobId)
          .maybeSingle();

        if (error) {
          console.error('Error loading subcontract job for scheduling:', error);
          return;
        }
        if (!data) return;

        setSubJobLabel({ customer_name: data.customer_name, address: data.address });

        // Prefill title/description but DO NOT change UI layout
        const jt = (data.job_type || subcontractCtx.jobType || 'new_install') as string;
        const title =
          jt === 'detach_reset'
            ? 'Subcontract Detach & Reset'
            : jt === 'service'
            ? 'Subcontract Service'
            : 'Subcontract New Install';

        const descParts = [
          `Subcontract Job: ${data.id}`,
          data.customer_name ? `Customer: ${data.customer_name}` : null,
          data.address ? `Address: ${data.address}` : null,
        ].filter(Boolean);

        setFormData(prev => ({
          ...prev,
          // Keep type as scheduled_install so it stays consistent with your existing modal
          type: 'scheduled_install',
          title: prev.title || title,
          description: prev.description || descParts.join('\n'),
        }));
      } catch (e) {
        console.error('Unexpected error loading subcontract job:', e);
      }
    })();
  }, [subcontractCtx?.jobId]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const isSubcontract = !!subcontractCtx?.jobId;

      // ✅ Subcontract scheduling: only require date + time (NO customer required)
      if (isSubcontract) {
        if (!formData.scheduled_date || !formData.scheduled_time) {
          throw new Error('Please fill in Date and Time');
        }

        const scheduledDateTime = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);
        const jt = (subcontractCtx?.jobType || 'new_install') as string;

        // Decide which field to set based on job type
        const payload: any = {};
        if (jt === 'detach_reset') {
          payload.detach_date = scheduledDateTime.toISOString();
          // keep reset_date untouched (handled in job detail)
          payload.workflow_status = 'detach_scheduled';
        } else {
          payload.scheduled_date = scheduledDateTime.toISOString();
          payload.workflow_status = 'install_scheduled';
        }

        // Store quick scheduling note (no schema changes)
        // Append to notes rather than overwriting if possible
        const { data: existing } = await supabase
          .from('subcontract_jobs')
          .select('notes')
          .eq('id', subcontractCtx!.jobId)
          .maybeSingle();

        const existingNotes = (existing?.notes || '').toString();
        const extra = [
          `Scheduled via Calendar`,
          `When: ${formData.scheduled_date} ${formData.scheduled_time}`,
          formData.technician_name ? `Tech: ${formData.technician_name}` : null,
        ].filter(Boolean).join(' | ');

        payload.notes = existingNotes
          ? `${existingNotes}\n${extra}`
          : extra;

        const { error: updateErr } = await supabase
          .from('subcontract_jobs')
          .update(payload)
          .eq('id', subcontractCtx!.jobId);

        if (updateErr) throw updateErr;

        // ✅ IMPORTANT: remove URL params so modal does NOT auto-open again
        clearSubcontractUrlParams();

        onSave();
        return;
      }

      // ✅ Normal CRM appointment flow (existing behavior)
      if (!formData.customer_id || !formData.title || !formData.scheduled_date || !formData.scheduled_time) {
        throw new Error('Please fill in all required fields');
      }

      const scheduledDateTime = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);

      const appointmentData = {
        customer_id: formData.customer_id,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        scheduled_date: scheduledDateTime.toISOString(),
        technician_name: formData.technician_name,
        status: formData.status,
      };

      if (appointment) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointment.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('appointments')
          .insert(appointmentData);

        if (insertError) throw insertError;
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    // ✅ If subcontract context, delete means "unschedule" the subcontract job date
    if (subcontractCtx?.jobId) {
      if (!confirm('Are you sure you want to remove this subcontract schedule?')) return;

      setLoading(true);
      setError(null);
      try {
        const jt = (subcontractCtx?.jobType || 'new_install') as string;
        const payload: any = jt === 'detach_reset'
          ? { detach_date: null }
          : { scheduled_date: null };

        const { error } = await supabase
          .from('subcontract_jobs')
          .update(payload)
          .eq('id', subcontractCtx.jobId);

        if (error) throw error;

        clearSubcontractUrlParams();
        onSave();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove schedule');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Normal appointment delete
    if (!appointment) return;
    if (!confirm('Are you sure you want to delete this appointment?')) return;

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointment.id);

      if (deleteError) throw deleteError;
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // If opened from subcontract context, clean URL params so it doesn’t reopen
    if (subcontractCtx?.jobId) clearSubcontractUrlParams();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {appointment ? 'Edit Appointment' : 'New Appointment'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* NOTE: No design changes. Same layout. Same fields.
              Subcontract mode just relaxes validation + saves to subcontract_jobs. */}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Customer *
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={!subcontractCtx?.jobId}
            >
              <option value="">
                {subcontractCtx?.jobId ? 'Not required for subcontract scheduling' : 'Select a customer'}
              </option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.first_name} {customer.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="scheduled_install">Scheduled Install</option>
              <option value="site_survey">Site Survey</option>
              <option value="inspection">Inspection</option>
              <option value="service_ticket">Service Ticket</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Solar Panel Installation"
              required={!subcontractCtx?.jobId ? true : false}
            />
            {subcontractCtx?.jobId && subJobLabel?.customer_name && (
              <div className="mt-1 text-[11px] text-gray-500">
                Scheduling for subcontract job: {subJobLabel.customer_name}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Additional details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Time *
              </label>
              <input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Technician
            </label>
            <input
              type="text"
              value={formData.technician_name}
              onChange={(e) => setFormData({ ...formData, technician_name: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Technician name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-gray-200">
            {(appointment || subcontractCtx?.jobId) && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <div className={`flex gap-2 ${!appointment ? 'w-full justify-end' : ''}`}>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
