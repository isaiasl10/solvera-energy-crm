import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Calendar, User, MapPin, Zap, DollarSign, FileText, X } from 'lucide-react';

interface SubcontractJob {
  id: string;
  address: string;
  system_size_kw: number;
  contractor_name: string;
  contractor_job_ref: string;
  subcontract_rate: number;
  subcontract_notes: string;
  created_at: string;
  updated_at: string;
}

interface SchedulingInfo {
  id: string;
  scheduled_date: string | null;
  assigned_technicians: string[];
  status: string;
  appointment_type: string;
}

export default function SubcontractingIntake() {
  const [jobs, setJobs] = useState<SubcontractJob[]>([]);
  const [schedulingInfo, setSchedulingInfo] = useState<Record<string, SchedulingInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    system_size_kw: '',
    contractor_name: '',
    contractor_job_ref: '',
    subcontract_rate: '',
    subcontract_notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSubcontractJobs();
  }, []);

  const loadSubcontractJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('job_source', 'subcontract')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setJobs(data || []);

      if (data && data.length > 0) {
        const customerIds = data.map(j => j.id);
        const { data: schedData, error: schedError } = await supabase
          .from('scheduling')
          .select('*')
          .in('customer_id', customerIds);

        if (!schedError && schedData) {
          const schedByCustomer: Record<string, SchedulingInfo[]> = {};
          schedData.forEach(sched => {
            if (!schedByCustomer[sched.customer_id]) {
              schedByCustomer[sched.customer_id] = [];
            }
            schedByCustomer[sched.customer_id].push(sched);
          });
          setSchedulingInfo(schedByCustomer);
        }
      }
    } catch (error) {
      console.error('Error loading subcontract jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([
          {
            job_source: 'subcontract',
            address: formData.address,
            system_size_kw: parseFloat(formData.system_size_kw),
            contractor_name: formData.contractor_name,
            contractor_job_ref: formData.contractor_job_ref,
            subcontract_rate: formData.subcontract_rate ? parseFloat(formData.subcontract_rate) : null,
            subcontract_notes: formData.subcontract_notes,
            full_name: `Subcontract - ${formData.contractor_name}`,
            phone: '',
            email: '',
          },
        ])
        .select();

      if (error) throw error;

      setShowAddModal(false);
      setFormData({
        address: '',
        system_size_kw: '',
        contractor_name: '',
        contractor_job_ref: '',
        subcontract_rate: '',
        subcontract_notes: '',
      });
      loadSubcontractJobs();
    } catch (error) {
      console.error('Error creating subcontract job:', error);
      alert('Error creating subcontract job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const searchLower = searchTerm.toLowerCase();
    return (
      job.address?.toLowerCase().includes(searchLower) ||
      job.contractor_name?.toLowerCase().includes(searchLower) ||
      job.contractor_job_ref?.toLowerCase().includes(searchLower)
    );
  });

  const getJobStatus = (jobId: string): string => {
    const schedules = schedulingInfo[jobId] || [];
    if (schedules.length === 0) return 'Not Scheduled';

    const hasCompleted = schedules.some(s => s.status === 'completed');
    if (hasCompleted) return 'Completed';

    const hasPending = schedules.some(s => s.status === 'pending' || s.status === 'confirmed');
    if (hasPending) return 'Scheduled';

    return 'Not Scheduled';
  };

  const getNextScheduledDate = (jobId: string): string | null => {
    const schedules = schedulingInfo[jobId] || [];
    const upcoming = schedules
      .filter(s => s.scheduled_date && s.status !== 'completed' && s.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime());

    return upcoming.length > 0 ? upcoming[0].scheduled_date : null;
  };

  const getAssignedTechs = (jobId: string): string[] => {
    const schedules = schedulingInfo[jobId] || [];
    const allTechs = new Set<string>();
    schedules.forEach(s => {
      s.assigned_technicians?.forEach(tech => allTechs.add(tech));
    });
    return Array.from(allTechs);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        gap: '16px',
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: '4px',
          }}>
            Subcontracting Jobs Intake
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Manage jobs from external contractors - isolated from internal pipeline
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
          }}
        >
          <Plus size={20} />
          Add Subcontract Job
        </button>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        padding: '12px 16px',
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
      }}>
        <Search size={20} color="#6b7280" />
        <input
          type="text"
          placeholder="Search by address, contractor name, or job reference..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            color: '#1a1a1a',
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#666' }}>
          Loading subcontract jobs...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {searchTerm ? 'No jobs match your search.' : 'No subcontract jobs yet. Click "Add Subcontract Job" to get started.'}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Badge
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Address
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  System Size
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Contractor
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Job Ref
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Rate
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Scheduled Date
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Assigned Techs
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => {
                const status = getJobStatus(job.id);
                const nextDate = getNextScheduledDate(job.id);
                const techs = getAssignedTechs(job.id);

                return (
                  <tr key={job.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 700,
                        borderRadius: '4px',
                        letterSpacing: '0.5px',
                      }}>
                        SUBCONTRACT
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={16} color="#6b7280" />
                        <span style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 500 }}>
                          {job.address}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={16} color="#f59e0b" />
                        <span style={{ fontSize: '14px', color: '#1a1a1a' }}>
                          {job.system_size_kw} kW
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#1a1a1a', fontWeight: 500 }}>
                      {job.contractor_name}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                      {job.contractor_job_ref || '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {job.subcontract_rate ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <DollarSign size={14} color="#10b981" />
                          <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 600 }}>
                            {job.subcontract_rate.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        background: status === 'Completed' ? '#d1fae5' : status === 'Scheduled' ? '#dbeafe' : '#f3f4f6',
                        color: status === 'Completed' ? '#065f46' : status === 'Scheduled' ? '#1e40af' : '#6b7280',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '4px',
                      }}>
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {nextDate ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} color="#6b7280" />
                          <span style={{ fontSize: '14px', color: '#1a1a1a' }}>
                            {new Date(nextDate).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {techs.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <User size={14} color="#6b7280" />
                          <span style={{ fontSize: '14px', color: '#1a1a1a' }}>
                            {techs.join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a' }}>
                Add Subcontract Job
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6b7280',
                }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main St, City, State ZIP"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    System Size (kW) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.system_size_kw}
                    onChange={(e) => setFormData({ ...formData, system_size_kw: e.target.value })}
                    placeholder="8.0"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Contractor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contractor_name}
                    onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
                    placeholder="ABC Solar Inc."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Contractor Job Reference
                  </label>
                  <input
                    type="text"
                    value={formData.contractor_job_ref}
                    onChange={(e) => setFormData({ ...formData, contractor_job_ref: e.target.value })}
                    placeholder="JOB-2024-001"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Subcontract Rate ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.subcontract_rate}
                    onChange={(e) => setFormData({ ...formData, subcontract_rate: e.target.value })}
                    placeholder="2500.00"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Notes
                  </label>
                  <textarea
                    value={formData.subcontract_notes}
                    onChange={(e) => setFormData({ ...formData, subcontract_notes: e.target.value })}
                    placeholder="Additional notes about this subcontract job..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '24px',
                justifyContent: 'flex-end',
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    color: '#374151',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
