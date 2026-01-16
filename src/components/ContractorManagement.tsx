import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Plus, X, Pencil, Trash2, DollarSign, Mail, Phone, MapPin } from 'lucide-react';

interface Contractor {
  id: string;
  company_name: string;
  address: string | null;
  phone_number: string | null;
  email: string | null;
  ppw: number | null;
  adders: string[];
  notes: string | null;
  created_at: string;
}

interface ContractorFormData {
  company_name: string;
  address: string;
  phone_number: string;
  email: string;
  ppw: string;
  adders: string[];
  notes: string;
}

const AVAILABLE_ADDERS = ['FSU', 'MBE', 'Battery', 'EV Charger', 'Main Panel Upgrade'];

export default function ContractorManagement() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContractorFormData>({
    company_name: '',
    address: '',
    phone_number: '',
    email: '',
    ppw: '',
    adders: [],
    notes: '',
  });

  useEffect(() => {
    loadContractors();
  }, []);

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
        adders: contractor.adders || [],
        notes: contractor.notes || '',
      });
    } else {
      setEditingContractor(null);
      setFormData({
        company_name: '',
        address: '',
        phone_number: '',
        email: '',
        ppw: '',
        adders: [],
        notes: '',
      });
    }
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
      adders: [],
      notes: '',
    });
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
        adders: formData.adders,
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

  const toggleAdder = (adder: string) => {
    setFormData(prev => ({
      ...prev,
      adders: prev.adders.includes(adder)
        ? prev.adders.filter(a => a !== adder)
        : [...prev.adders, adder],
    }));
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
                    {contractor.adders.map(adder => (
                      <span
                        key={adder}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}
                      >
                        {adder}
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
                    Price Per Watt ($)
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
                    Adders Contractor Pays For
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {AVAILABLE_ADDERS.map(adder => (
                      <button
                        key={adder}
                        type="button"
                        onClick={() => toggleAdder(adder)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: formData.adders.includes(adder) ? '#2563eb' : '#f3f4f6',
                          color: formData.adders.includes(adder) ? 'white' : '#6b7280',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {adder}
                      </button>
                    ))}
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
