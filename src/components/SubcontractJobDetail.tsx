import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Plus, Trash2, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';

interface SubcontractJob {
  id: string;
  contractor_name: string;
  subcontract_customer_name: string;
  address: string;
  system_size_kw: number;
  panel_quantity: number;
  install_date: string | null;
  ppw: number;
  gross_revenue: number;
  net_revenue: number;
  total_labor: number;
  expenses: number;
  subcontract_status: string;
  subcontract_adders: any[];
  invoice_number: string;
  invoice_generated_at: string | null;
}

interface Adder {
  id: string;
  name: string;
  amount: number;
}

interface SubcontractJobDetailProps {
  jobId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function SubcontractJobDetail({ jobId, onClose, onUpdate }: SubcontractJobDetailProps) {
  const [job, setJob] = useState<SubcontractJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'invoice'>('details');

  const [formData, setFormData] = useState({
    system_size_kw: '',
    panel_quantity: '',
    install_date: '',
    ppw: '',
    total_labor: '',
    expenses: '',
    subcontract_status: 'install_scheduled',
  });

  const [adders, setAdders] = useState<Adder[]>([]);
  const [newAdder, setNewAdder] = useState({ name: '', amount: '' });

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', jobId)
        .eq('job_source', 'subcontract')
        .single();

      if (error) throw error;

      setJob(data);
      setFormData({
        system_size_kw: data.system_size_kw?.toString() || '',
        panel_quantity: data.panel_quantity?.toString() || '',
        install_date: data.install_date || '',
        ppw: data.ppw?.toString() || '',
        total_labor: data.total_labor?.toString() || '',
        expenses: data.expenses?.toString() || '',
        subcontract_status: data.subcontract_status || 'install_scheduled',
      });

      const existingAdders = data.subcontract_adders || [];
      setAdders(existingAdders.map((a: any, i: number) => ({ ...a, id: `adder-${i}` })));
    } catch (error) {
      console.error('Error loading job:', error);
      alert('Error loading job details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const addersToSave = adders.map(({ name, amount }) => ({ name, amount }));

      const { error } = await supabase
        .from('customers')
        .update({
          system_size_kw: formData.system_size_kw ? parseFloat(formData.system_size_kw) : null,
          panel_quantity: formData.panel_quantity ? parseInt(formData.panel_quantity) : null,
          install_date: formData.install_date || null,
          ppw: formData.ppw ? parseFloat(formData.ppw) : null,
          total_labor: formData.total_labor ? parseFloat(formData.total_labor) : null,
          expenses: formData.expenses ? parseFloat(formData.expenses) : null,
          subcontract_status: formData.subcontract_status,
          subcontract_adders: addersToSave,
        })
        .eq('id', jobId);

      if (error) throw error;

      await loadJob();
      onUpdate();
      alert('Job updated successfully');
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Error saving job details');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdder = () => {
    if (!newAdder.name || !newAdder.amount) {
      alert('Please enter both name and amount for the adder');
      return;
    }

    setAdders([...adders, {
      id: `adder-${Date.now()}`,
      name: newAdder.name,
      amount: parseFloat(newAdder.amount),
    }]);
    setNewAdder({ name: '', amount: '' });
  };

  const handleRemoveAdder = (id: string) => {
    setAdders(adders.filter(a => a.id !== id));
  };

  const calculateGrossRevenue = () => {
    const systemSize = parseFloat(formData.system_size_kw) || 0;
    const ppw = parseFloat(formData.ppw) || 0;
    return systemSize * ppw * 1000;
  };

  const calculateAddersTotal = () => {
    return adders.reduce((sum, adder) => sum + adder.amount, 0);
  };

  const calculateNetRevenue = () => {
    const gross = calculateGrossRevenue();
    const labor = parseFloat(formData.total_labor) || 0;
    const expenses = parseFloat(formData.expenses) || 0;
    const addersTotal = calculateAddersTotal();
    return gross - labor - expenses - addersTotal;
  };

  const generateInvoicePDF = () => {
    if (!job) return;

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('SOLVERA ENERGY', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text('INVOICE', 105, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Invoice #: ${job.invoice_number || 'N/A'}`, 20, 50);
    doc.text(`Date: ${job.invoice_generated_at ? new Date(job.invoice_generated_at).toLocaleDateString() : new Date().toLocaleDateString()}`, 20, 57);

    doc.setFontSize(12);
    doc.text('Bill To:', 20, 70);
    doc.setFontSize(10);
    doc.text(job.subcontract_customer_name || 'N/A', 20, 77);
    doc.text(job.address || '', 20, 84);

    doc.setFontSize(12);
    doc.text('Job Details:', 20, 100);
    doc.setFontSize(10);
    doc.text(`Contractor: ${job.contractor_name}`, 20, 107);
    doc.text(`System Size: ${job.system_size_kw || 0} kW`, 20, 114);
    doc.text(`Panel Quantity: ${job.panel_quantity || 0}`, 20, 121);
    doc.text(`Install Date: ${job.install_date ? new Date(job.install_date).toLocaleDateString() : 'N/A'}`, 20, 128);

    let yPos = 145;
    doc.setFontSize(12);
    doc.text('Financial Summary:', 20, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.text(`System Price (${job.ppw || 0} $/W):`, 20, yPos);
    doc.text(`$${(job.gross_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });
    yPos += 7;

    if (adders.length > 0) {
      doc.text('Adders:', 20, yPos);
      yPos += 7;
      adders.forEach(adder => {
        doc.text(`  - ${adder.name}:`, 25, yPos);
        doc.text(`$${adder.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });
        yPos += 7;
      });
    }

    doc.text(`Labor:`, 20, yPos);
    doc.text(`-$${(job.total_labor || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });
    yPos += 7;

    doc.text(`Expenses:`, 20, yPos);
    doc.text(`-$${(job.expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });
    yPos += 10;

    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 7;

    doc.setFontSize(12);
    doc.text('Net Revenue:', 20, yPos);
    doc.text(`$${(job.net_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });

    doc.save(`invoice-${job.invoice_number}.pdf`);
  };

  if (loading) {
    return (
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
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
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
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a' }}>
              Subcontract Job Details
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
              {job.contractor_name} - {job.subcontract_customer_name}
            </p>
          </div>
          <button
            onClick={onClose}
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

        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'details' ? '#f97316' : 'transparent',
              color: activeTab === 'details' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Job Details
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'invoice' ? '#f97316' : 'transparent',
              color: activeTab === 'invoice' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={16} />
            Invoice
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {activeTab === 'details' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
              }}>
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
                    value={formData.system_size_kw}
                    onChange={(e) => setFormData({ ...formData, system_size_kw: e.target.value })}
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
                    Panel Quantity *
                  </label>
                  <input
                    type="number"
                    value={formData.panel_quantity}
                    onChange={(e) => setFormData({ ...formData, panel_quantity: e.target.value })}
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
                    Install Date
                  </label>
                  <input
                    type="date"
                    value={formData.install_date}
                    onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
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
                    Status
                  </label>
                  <select
                    value={formData.subcontract_status}
                    onChange={(e) => setFormData({ ...formData, subcontract_status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    <option value="install_scheduled">Install Scheduled</option>
                    <option value="install_complete">Install Complete</option>
                    <option value="install_complete_pending_payment">Install Complete - Pending Payment</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    PPW ($/Watt) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.ppw}
                    onChange={(e) => setFormData({ ...formData, ppw: e.target.value })}
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
                    Gross Revenue (Auto-calculated)
                  </label>
                  <div style={{
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: '#f9fafb',
                    color: '#059669',
                    fontWeight: 600,
                  }}>
                    ${calculateGrossRevenue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Total Labor ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_labor}
                    onChange={(e) => setFormData({ ...formData, total_labor: e.target.value })}
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
                    Expenses ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.expenses}
                    onChange={(e) => setFormData({ ...formData, expenses: e.target.value })}
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
              </div>

              <div style={{
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                  Adders
                </h3>

                {adders.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    {adders.map(adder => (
                      <div key={adder.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'white',
                        borderRadius: '6px',
                        marginBottom: '8px',
                      }}>
                        <span style={{ fontSize: '14px', color: '#1a1a1a' }}>{adder.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#059669' }}>
                            ${adder.amount.toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleRemoveAdder(adder.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#ef4444',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Adder name"
                    value={newAdder.name}
                    onChange={(e) => setNewAdder({ ...newAdder, name: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={newAdder.amount}
                    onChange={(e) => setNewAdder({ ...newAdder, amount: e.target.value })}
                    style={{
                      width: '120px',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleAddAdder}
                    style={{
                      padding: '8px 12px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#dbeafe',
                borderRadius: '8px',
                border: '1px solid #93c5fd',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#1e40af' }}>Gross Revenue:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>
                    ${calculateGrossRevenue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#1e40af' }}>Less: Labor</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                    -${(parseFloat(formData.total_labor) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#1e40af' }}>Less: Expenses</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                    -${(parseFloat(formData.expenses) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', color: '#1e40af' }}>Less: Adders</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                    -${calculateAddersTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{
                  borderTop: '2px solid #3b82f6',
                  paddingTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e40af' }}>Net Revenue:</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>
                    ${calculateNetRevenue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                padding: '24px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', textAlign: 'center' }}>
                  SOLVERA ENERGY
                </h3>

                <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>INVOICE</h4>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Invoice #: {job.invoice_number}
                  </p>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Date: {job.invoice_generated_at ? new Date(job.invoice_generated_at).toLocaleDateString() : new Date().toLocaleDateString()}
                  </p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Bill To:</h4>
                  <p style={{ fontSize: '14px', color: '#1a1a1a' }}>{job.subcontract_customer_name}</p>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>{job.address}</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Job Details:</h4>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>Contractor: {job.contractor_name}</p>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>System Size: {job.system_size_kw} kW</p>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>Panel Quantity: {job.panel_quantity}</p>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Install Date: {job.install_date ? new Date(job.install_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Financial Summary:</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px' }}>System Price ({job.ppw} $/W):</span>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>
                      ${(job.gross_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {adders.length > 0 && adders.map(adder => (
                    <div key={adder.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', paddingLeft: '12px' }}>- {adder.name}:</span>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>
                        ${adder.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px' }}>Labor:</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                      -${(job.total_labor || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '14px' }}>Expenses:</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                      -${(job.expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{
                    borderTop: '2px solid #1a1a1a',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: '16px', fontWeight: 700 }}>Net Revenue:</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>
                      ${(job.net_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={generateInvoicePDF}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Download size={20} />
                Download Invoice PDF
              </button>
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
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
            Close
          </button>
          {activeTab === 'details' && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: saving ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
