import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { loadGoogleMaps } from '../lib/loadGoogleMaps';
import { Building2, Plus, X, Pencil, Trash2, DollarSign, Mail, Phone, MapPin } from 'lucide-react';

interface Adder {
  name: string;
  amount: number;
}

interface Contractor {
  id: string;
  company_name: string;
  address: string | null;
  phone_number: string | null;
  email: string | null;
  ppw: number | null;
  adders: Adder[];
  notes: string | null;
  created_at: string;
}

interface ContractorFormData {
  company_name: string;
  address: string;
  phone_number: string;
  email: string;
  ppw: string;
  notes: string;
}

export default function ContractorManagement() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adders, setAdders] = useState<Adder[]>([]);
  const [newAdderName, setNewAdderName] = useState('');
  const [newAdderAmount, setNewAdderAmount] = useState('');
  const [formData, setFormData] = useState<ContractorFormData>({
    company_name: '',
    address: '',
    phone_number: '',
    email: '',
    ppw: '',
    notes: '',
  });

  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    loadContractors();
  }, []);

  useEffect(() => {
    if (showModal && addressInputRef.current) {
      initializeAutocomplete();
    }
  }, [showModal]);

  const initializeAutocomplete = async () => {
    try {
      const google = await loadGoogleMaps();

      if (addressInputRef.current && !autocompleteRef.current) {
        autocompleteRef.current = new google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address'],
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

  const loadContractors = async () => {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .order('company_name');

      if (error) throw error;
      setContractors(data || []);
    } catch (error) {
      console.error('Error loading contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (contractor?: Contractor) => {
    if (contractor) {
      setEditingContractor(contractor);
      setFormData({
        company_name: contractor.company_name,
        address: contractor.address || '',
        phone_number: contractor.phone_number || '',
        email: contractor.email || '',
        ppw: contractor.ppw?.toString() || '',
        notes: contractor.notes || '',
      });
      setAdders(contractor.adders || []);
    } else {
      setEditingContractor(null);
      setFormData({
        company_name: '',
        address: '',
        phone_number: '',
        email: '',
        ppw: '',
        notes: '',
      });
      setAdders([]);
    }
    setNewAdderName('');
    setNewAdderAmount('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingContractor(null);
    setFormData({
      company_name: '',
      address: '',
      phone_number: '',
      email: '',
      ppw: '',
      notes: '',
    });
    setAdders([]);
    setNewAdderName('');
    setNewAdderAmount('');
  };

  const handleAddAdder = () => {
    if (newAdderName.trim() && newAdderAmount) {
      setAdders([...adders, { name: newAdderName.trim(), amount: parseFloat(newAdderAmount) }]);
      setNewAdderName('');
      setNewAdderAmount('');
    }
  };

  const handleRemoveAdder = (index: number) => {
    setAdders(adders.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const contractorData = {
        company_name: formData.company_name,
        address: formData.address || null,
        phone_number: formData.phone_number || null,
        email: formData.email || null,
        ppw: formData.ppw ? parseFloat(formData.ppw) : null,
        adders: adders,
        notes: formData.notes || null,
      };

      if (editingContractor) {
        const { error } = await supabase
          .from('contractors')
          .update(contractorData)
          .eq('id', editingContractor.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contractors')
          .insert([contractorData]);

        if (error) throw error;
      }

      await loadContractors();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving contractor:', error);
      alert(`Error saving contractor: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, companyName: string) => {
    if (!confirm(`Are you sure you want to delete ${companyName}? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contractors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadContractors();
    } catch (error: any) {
      console.error('Error deleting contractor:', error);
      alert(`Error deleting contractor: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Loading contractors...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>
            Contractor Management
          </h1>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            Manage subcontractor profiles, payment terms, and contact information
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={20} />
          Add Contractor
        </button>
      </div>

      {contractors.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px 32px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '2px dashed #e5e7eb',
        }}>
          <Building2 size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
            No contractors yet
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            Add your first contractor to get started
          </p>
          <button
            onClick={() => handleOpenModal()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Add Contractor
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
          {contractors.map(contractor => (
            <div
              key={contractor.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    backgroundColor: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Building2 size={24} style={{ color: '#2563eb' }} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
                    {contractor.company_name}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleOpenModal(contractor)}
                    style={{
                      padding: '6px',
                      backgroundColor: '#f3f4f6',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Pencil size={16} style={{ color: '#6b7280' }} />
                  </button>
                  <button
                    onClick={() => handleDelete(contractor.id, contractor.company_name)}
                    style={{
                      padding: '6px',
                      backgroundColor: '#fee2e2',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={16} style={{ color: '#dc2626' }} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {contractor.ppw && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={16} style={{ color: '#6b7280' }} />
                    <span style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600 }}>
                      ${contractor.ppw.toFixed(2)}/W
                    </span>
                  </div>
                )}
                {contractor.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={16} style={{ color: '#6b7280' }} />
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>{contractor.email}</span>
                  </div>
                )}
                {contractor.phone_number && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={16} style={{ color: '#6b7280' }} />
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>{contractor.phone_number}</span>
                  </div>
                )}
                {contractor.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} style={{ color: '#6b7280' }} />
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>{contractor.address}</span>
                  </div>
                )}
              </div>

              {contractor.adders && contractor.adders.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>
                    Pays for Adders:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {contractor.adders.map((adder, index) => (
                      <span
                        key={index}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}
                      >
                        {adder.name}: ${adder.amount.toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {contractor.notes && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
                    {contractor.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a' }}>
                {editingContractor ? 'Edit Contractor' : 'Add New Contractor'}
              </h2>
              <button
                onClick={handleCloseModal}
                style={{
                  padding: '8px',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
                    Price Per Watt ($/W)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.ppw}
                    onChange={(e) => setFormData({ ...formData, ppw: e.target.value })}
                    placeholder="0.30"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
                    Adders
                  </label>

                  {adders.length > 0 && (
                    <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {adders.map((adder, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '6px',
                        }}>
                          <span style={{ fontSize: '14px', color: '#1a1a1a' }}>
                            {adder.name}: ${adder.amount.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdder(index)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Adder name (e.g. FSU)"
                      value={newAdderName}
                      onChange={(e) => setNewAdderName(e.target.value)}
                      style={{
                        flex: 2,
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={newAdderAmount}
                      onChange={(e) => setNewAdderAmount(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddAdder}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
                    Billing Address
                  </label>
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#f3f4f6',
                    color: '#1a1a1a',
                    border: 'none',
                    borderRadius: '8px',
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
                    flex: 1,
                    padding: '12px',
                    backgroundColor: submitting ? '#9ca3af' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : editingContractor ? 'Update Contractor' : 'Add Contractor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
