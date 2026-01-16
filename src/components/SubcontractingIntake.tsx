import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { loadGoogleMaps } from '../lib/loadGoogleMaps';
import { Plus, Search, X } from 'lucide-react';
import SubcontractJobDetail from './SubcontractJobDetail';

interface SubcontractJob {
  id: string;
  contractor_name: string;
  subcontract_customer_name: string;
  address: string;
  system_size_kw: number;
  gross_revenue: number;
  net_revenue: number;
  subcontract_status: string;
  invoice_number: string;
  created_at: string;
}

export default function SubcontractingIntake() {
  const [jobs, setJobs] = useState<SubcontractJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contractor_name: '',
    customer_name: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    loadSubcontractJobs();
  }, []);

  useEffect(() => {
    if (showAddModal && addressInputRef.current) {
      initializeAutocomplete();
    }
  }, [showAddModal]);

  const initializeAutocomplete = async () => {
    try {
      const google = await loadGoogleMaps();

      if (addressInputRef.current && !autocompleteRef.current) {
        autocompleteRef.current = new google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            types: ['address'],
            componentRestrictions: { country: 'us' },
          }
        );

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (place && place.formatted_address) {
            setFormData(prev => ({ ...prev, address: place.formatted_address || '' }));
          }
        });
      }
    } catch (error: any) {
      console.error('Error initializing Google Maps autocomplete:', error);
      if (error?.message?.includes('API key')) {
        console.warn('Google Maps API key is not configured. Address autocomplete will not be available.');
      }
    }
  };

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
            contractor_name: formData.contractor_name,
            subcontract_customer_name: formData.customer_name,
            installation_address: formData.address,
            full_name: formData.customer_name,
            system_size_kw: 0,
            subcontract_status: 'install_scheduled',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      setShowAddModal(false);
      setFormData({
        contractor_name: '',
        customer_name: '',
        address: '',
      });

      await loadSubcontractJobs();

      if (data) {
        setSelectedJobId(data.id);
      }
    } catch (error: any) {
      console.error('Error creating subcontract job:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Error creating subcontract job: ${errorMessage}\n\nPlease check the console for more details.`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const searchLower = searchTerm.toLowerCase();
    return (
      job.installation_address?.toLowerCase().includes(searchLower) ||
      job.contractor_name?.toLowerCase().includes(searchLower) ||
      job.subcontract_customer_name?.toLowerCase().includes(searchLower) ||
      job.invoice_number?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'install_complete':
        return { bg: '#d1fae5', color: '#065f46' };
      case 'install_complete_pending_payment':
        return { bg: '#fef3c7', color: '#92400e' };
      default:
        return { bg: '#dbeafe', color: '#1e40af' };
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
          placeholder="Search by contractor, customer, address, or invoice number..."
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
                  Invoice #
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Contractor
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Customer
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Address
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  System Size
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Gross Revenue
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Net Revenue
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => {
                const statusStyle = getStatusColor(job.subcontract_status || 'install_scheduled');

                return (
                  <tr
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '16px', fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>
                      {job.invoice_number || '-'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#1a1a1a', fontWeight: 500 }}>
                      {job.contractor_name}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#1a1a1a' }}>
                      {job.subcontract_customer_name || '-'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                      {job.installation_address}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#1a1a1a' }}>
                      {job.system_size_kw ? `${job.system_size_kw} kW` : '-'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#059669', fontWeight: 600 }}>
                      {job.gross_revenue ? `$${job.gross_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#10b981', fontWeight: 700 }}>
                      {job.net_revenue ? `$${job.net_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '4px',
                      }}>
                        {formatStatus(job.subcontract_status || 'install_scheduled')}
                      </span>
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
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '20px',
                padding: '12px',
                background: '#f0f9ff',
                borderRadius: '6px',
                border: '1px solid #bae6fd',
              }}>
                Enter the basic information to create the job. You'll be able to add financial details, system specifications, and generate invoices in the next step.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="John Smith"
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
                    Address *
                  </label>
                  <input
                    ref={addressInputRef}
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Start typing address..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  <p style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginTop: '6px',
                    fontStyle: 'italic',
                  }}>
                    Start typing to see address suggestions
                  </p>
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

      {selectedJobId && (
        <SubcontractJobDetail
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onUpdate={loadSubcontractJobs}
        />
      )}
    </div>
  );
}
