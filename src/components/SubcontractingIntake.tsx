import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { loadGoogleMaps } from '../lib/loadGoogleMaps';
import { Plus, Search, X } from 'lucide-react';
import SubcontractJobDetail from './SubcontractJobDetail';

interface Contractor {
  id: string;
  company_name: string;
  ppw: number | null;
  adders: string[];
  address: string | null;
  phone_number: string | null;
  email: string | null;
}

interface SubcontractJob {
  id: string;
  contractor_id: string;
  contractor_name: string;
  subcontract_customer_name: string;
  installation_address: string;
  system_size_kw: number;
  ppw: number;
  gross_revenue: number;
  net_revenue: number;
  subcontract_status: string;
  invoice_number: string;
  created_at: string;
}

export default function SubcontractingIntake() {
  const [jobs, setJobs] = useState<SubcontractJob[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contractor_id: '',
    customer_name: '',
    address: '',
  });
  const [selectedAdders, setSelectedAdders] = useState<{name: string; amount: number}[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    loadSubcontractJobs();
    loadContractors();
  }, []);

  useEffect(() => {
    const channelName = `subcontracting_${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: 'job_source=eq.subcontract',
        },
        () => {
          loadSubcontractJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const loadContractors = async () => {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('id, company_name, ppw, adders, address, phone_number, email')
        .order('company_name');

      if (error) throw error;
      setContractors(data || []);
    } catch (error) {
      console.error('Error loading contractors:', error);
    }
  };

  useEffect(() => {
    if (showAddModal && addressInputRef.current) {
      initializeAutocomplete();
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [showAddModal]);

  const initializeAutocomplete = async () => {
    try {
      const google = await loadGoogleMaps();

      if (addressInputRef.current) {
        if (autocompleteRef.current) {
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }

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
        .eq('is_active', true)
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

    if (!formData.contractor_id) {
      alert('Please select a contractor');
      return;
    }

    setSubmitting(true);

    try {
      const selectedContractor = contractors.find(c => c.id === formData.contractor_id);
      if (!selectedContractor) {
        throw new Error('Selected contractor not found');
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([
          {
            job_source: 'subcontract',
            contractor_id: formData.contractor_id,
            contractor_name: selectedContractor.company_name,
            subcontract_customer_name: formData.customer_name,
            installation_address: formData.address,
            full_name: formData.customer_name,
            system_size_kw: 0,
            ppw: selectedContractor.ppw || 0,
            subcontract_status: 'install_scheduled',
            subcontract_adders: selectedAdders,
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
        contractor_id: '',
        customer_name: '',
        address: '',
      });
      setSelectedAdders([]);

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
      case 'pending_completion':
        return { bg: '#fde68a', color: '#78350f' };
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Subcontracting Jobs Intake
          </h1>
          <p className="text-sm text-gray-600">
            Manage jobs from external contractors - isolated from internal pipeline
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="min-h-[44px] flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all"
        >
          <Plus size={20} />
          <span className="whitespace-nowrap">Add Subcontract Job</span>
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 sm:mb-6 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg">
        <Search size={20} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search by contractor, customer, address, or invoice number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border-none outline-none text-sm text-gray-900 placeholder-gray-400"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-600">
          Loading subcontract jobs...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            {searchTerm ? 'No jobs match your search.' : 'No subcontract jobs yet. Click "Add Subcontract Job" to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Invoice #
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Contractor
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Customer
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Address
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    System Size
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Gross Revenue
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Net Revenue
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
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
                      className="border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-900 font-semibold">
                        {job.invoice_number || '-'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-900 font-medium">
                        {job.contractor_name}
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-900">
                        {job.subcontract_customer_name || '-'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-600">
                        {job.installation_address}
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-900">
                        {job.system_size_kw ? `${job.system_size_kw} kW` : '-'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-emerald-600 font-semibold">
                        {job.gross_revenue ? `$${job.gross_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-green-600 font-bold">
                        {job.net_revenue ? `$${job.net_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4">
                        <span
                          className="inline-block px-2 py-1 text-xs font-semibold rounded"
                          style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                        >
                          {formatStatus(job.subcontract_status || 'install_scheduled')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedAdders([]);
                }}
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
                    Select Contractor *
                  </label>
                  {contractors.length === 0 ? (
                    <div style={{
                      padding: '10px 12px',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#92400e',
                    }}>
                      No contractors available. Please add a contractor first.
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.contractor_id}
                      onChange={(e) => {
                        setFormData({ ...formData, contractor_id: e.target.value });
                        setSelectedAdders([]);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: 'white',
                      }}
                    >
                      <option value="">Select a contractor...</option>
                      {contractors.map(contractor => (
                        <option key={contractor.id} value={contractor.id}>
                          {contractor.company_name} {contractor.ppw ? `($${contractor.ppw.toFixed(2)}/kW)` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {formData.contractor_id && contractors.find(c => c.id === formData.contractor_id)?.adders?.length > 0 && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '8px',
                    }}>
                      Select Adders (Optional)
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {contractors.find(c => c.id === formData.contractor_id)?.adders.map((adder, index) => (
                        <label key={index} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          backgroundColor: selectedAdders.find(a => a.name === adder.name) ? '#dbeafe' : '#f3f4f6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}>
                          <input
                            type="checkbox"
                            checked={selectedAdders.some(a => a.name === adder.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAdders([...selectedAdders, adder]);
                              } else {
                                setSelectedAdders(selectedAdders.filter(a => a.name !== adder.name));
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', color: '#1a1a1a' }}>
                            {adder.name}: ${adder.amount.toFixed(2)}{adder.type === 'per_watt' ? '/kW' : adder.type === 'per_panel' ? '/panel' : ''}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

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
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedAdders([]);
                  }}
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
