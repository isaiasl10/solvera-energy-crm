import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Plus, Trash2, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import SchedulingSection from './SchedulingSection';

interface ContractorInfo {
  company_name: string;
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
  contractors?: ContractorInfo;
}

interface Adder {
  id: string;
  name: string;
  amount: number;
  type?: 'fixed' | 'per_watt' | 'per_panel';
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
  const [activeTab, setActiveTab] = useState<'details' | 'invoice' | 'scheduling'>('details');

  const [formData, setFormData] = useState({
    system_size_kw: '',
    panel_quantity: '',
    install_date: '',
    ppw: '',
    total_labor: '',
    expenses: '',
    subcontract_status: 'install_scheduled',
    invoice_sent_date: '',
    invoice_paid_date: '',
    payment_type: '',
    check_number: '',
  });

  const [adders, setAdders] = useState<Adder[]>([]);
  const [newAdder, setNewAdder] = useState({ name: '', amount: '', type: 'fixed' as 'fixed' | 'per_watt' | 'per_panel' });

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          contractors:contractor_id (
            company_name,
            address,
            phone_number,
            email
          )
        `)
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
        invoice_sent_date: data.invoice_sent_date || '',
        invoice_paid_date: data.invoice_paid_date || '',
        payment_type: data.payment_type || '',
        check_number: data.check_number || '',
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
          invoice_sent_date: formData.invoice_sent_date || null,
          invoice_paid_date: formData.invoice_paid_date || null,
          payment_type: formData.payment_type || null,
          check_number: formData.check_number || null,
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

  const handleDelete = async () => {
    const customerName = job?.subcontract_customer_name || 'this job';
    if (!confirm(`Are you sure you want to delete ${customerName}? This will remove the job from the system and cannot be undone.`)) {
      return;
    }

    try {
      await supabase
        .from('scheduling')
        .update({ is_active: false })
        .eq('customer_id', jobId);

      const { error } = await supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', jobId);

      if (error) throw error;

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Error deleting job');
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
      type: newAdder.type,
    }]);
    setNewAdder({ name: '', amount: '', type: 'fixed' });
  };

  const handleRemoveAdder = (id: string) => {
    setAdders(adders.filter(a => a.id !== id));
  };

  const calculateGrossRevenue = () => {
    const systemSize = parseFloat(formData.system_size_kw) || 0;
    const ppw = parseFloat(formData.ppw) || 0;
    return systemSize * ppw;
  };

  const calculateAddersTotal = () => {
    const systemSize = parseFloat(formData.system_size_kw) || 0;
    const panelQty = parseFloat(formData.panel_quantity) || 0;
    return adders.reduce((sum, adder) => {
      if (adder.type === 'per_watt') {
        return sum + (adder.amount * systemSize);
      } else if (adder.type === 'per_panel') {
        return sum + (adder.amount * panelQty);
      }
      return sum + adder.amount;
    }, 0);
  };

  const calculateNetRevenue = () => {
    const gross = calculateGrossRevenue();
    const labor = parseFloat(formData.total_labor) || 0;
    const expenses = parseFloat(formData.expenses) || 0;
    const addersTotal = calculateAddersTotal();
    return gross + addersTotal - labor - expenses;
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
    const contractorInfo = job.contractors as ContractorInfo;
    doc.text(contractorInfo?.company_name || job.contractor_name || 'N/A', 20, 77);
    if (contractorInfo?.address) {
      doc.text(contractorInfo.address, 20, 84);
    }
    if (contractorInfo?.phone_number) {
      doc.text(contractorInfo.phone_number, 20, contractorInfo?.address ? 91 : 84);
    }

    doc.setFontSize(12);
    doc.text('Job Details:', 20, 110);
    doc.setFontSize(10);
    doc.text(`Customer: ${job.subcontract_customer_name || 'N/A'}`, 20, 117);
    doc.text(`Address: ${job.installation_address || 'N/A'}`, 20, 124);
    doc.text(`System Size: ${job.system_size_kw || 0} kW`, 20, 131);
    doc.text(`Panel Quantity: ${job.panel_quantity || 0}`, 20, 138);
    doc.text(`Install Date: ${job.install_date ? new Date(job.install_date).toLocaleDateString() : 'N/A'}`, 20, 145);

    let yPos = 162;
    doc.setFontSize(12);
    doc.text('Invoice Total:', 20, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.text(`System Price (${job.ppw || 0} $/kW):`, 20, yPos);
    doc.text(`$${(job.gross_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });
    yPos += 7;

    if (adders.length > 0) {
      const systemSizeKw = job.system_size_kw || 0;
      const panelQty = job.panel_quantity || 0;
      adders.forEach(adder => {
        let adderAmount = adder.amount;
        if (adder.type === 'per_watt') {
          adderAmount = adder.amount * systemSizeKw;
        } else if (adder.type === 'per_panel') {
          adderAmount = adder.amount * panelQty;
        }
        doc.text(`  - ${adder.name}:`, 20, yPos);
        doc.text(`$${adderAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });
        yPos += 7;
      });
    }

    yPos += 3;

    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 7;

    const totalAmount = (job.gross_revenue || 0) + adders.reduce((sum, a) => sum + a.amount, 0);
    doc.setFontSize(12);
    doc.text('Total Amount:', 20, yPos);
    doc.text(`$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });

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
          <button
            onClick={() => setActiveTab('scheduling')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'scheduling' ? '#f97316' : 'transparent',
              color: activeTab === 'scheduling' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Scheduling
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
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      const updates: any = { subcontract_status: newStatus };

                      if (newStatus === 'invoice_sent' && !formData.invoice_sent_date) {
                        updates.invoice_sent_date = new Date().toISOString().split('T')[0];
                      }
                      if (newStatus === 'invoice_paid' && !formData.invoice_paid_date) {
                        updates.invoice_paid_date = new Date().toISOString().split('T')[0];
                      }

                      setFormData({ ...formData, ...updates });
                    }}
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
                    <option value="invoice_sent">Invoice Sent</option>
                    <option value="invoice_paid">Invoice Paid</option>
                  </select>
                </div>

                {(formData.subcontract_status === 'invoice_sent' || formData.subcontract_status === 'invoice_paid') && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '8px',
                    }}>
                      Invoice Sent Date
                    </label>
                    <input
                      type="date"
                      value={formData.invoice_sent_date}
                      onChange={(e) => setFormData({ ...formData, invoice_sent_date: e.target.value })}
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
                )}

                {formData.subcontract_status === 'invoice_paid' && (
                  <>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#374151',
                        marginBottom: '8px',
                      }}>
                        Invoice Paid Date
                      </label>
                      <input
                        type="date"
                        value={formData.invoice_paid_date}
                        onChange={(e) => setFormData({ ...formData, invoice_paid_date: e.target.value })}
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
                        Payment Type
                      </label>
                      <select
                        value={formData.payment_type}
                        onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      >
                        <option value="">Select Payment Type</option>
                        <option value="CHECK">Check</option>
                        <option value="ACH">ACH</option>
                        <option value="WIRE">Wire</option>
                      </select>
                    </div>

                    {formData.payment_type === 'CHECK' && (
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#374151',
                          marginBottom: '8px',
                        }}>
                          Check Number
                        </label>
                        <input
                          type="text"
                          value={formData.check_number}
                          onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                          placeholder="Enter check number"
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
                    )}
                  </>
                )}

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Price ($/kW) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.ppw}
                    onChange={(e) => setFormData({ ...formData, ppw: e.target.value })}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        setFormData({ ...formData, ppw: value.toFixed(2) });
                      }
                    }}
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

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Adder name (e.g. Tile, Critter Guard)"
                    value={newAdder.name}
                    onChange={(e) => setNewAdder({ ...newAdder, name: e.target.value })}
                    style={{
                      flex: '1 1 150px',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  <select
                    value={newAdder.type}
                    onChange={(e) => setNewAdder({ ...newAdder, type: e.target.value as 'fixed' | 'per_watt' | 'per_panel' })}
                    style={{
                      flex: '0 0 130px',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="fixed">Fixed Amount</option>
                    <option value="per_watt">Per kW</option>
                    <option value="per_panel">Per Panel</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={newAdder.type === 'fixed' ? 'Amount' : newAdder.type === 'per_watt' ? '$/kW (e.g. 100)' : '$/panel (e.g. 50)'}
                    value={newAdder.amount}
                    onChange={(e) => setNewAdder({ ...newAdder, amount: e.target.value })}
                    style={{
                      flex: '0 0 140px',
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
                  <span style={{ fontSize: '14px', color: '#1e40af' }}>System Price:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>
                    ${calculateGrossRevenue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#1e40af' }}>Plus: Adders</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#059669' }}>
                    +${calculateAddersTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#1e40af' }}>Less: Labor</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                    -${(parseFloat(formData.total_labor) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', color: '#1e40af' }}>Less: Expenses</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                    -${(parseFloat(formData.expenses) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          ) : activeTab === 'invoice' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                overflow: 'hidden',
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  padding: '32px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <img
                      src="/solvera_energy_logo_redesign.png"
                      alt="Solvera Energy Logo"
                      style={{
                        maxWidth: '200px',
                        height: 'auto',
                        filter: 'brightness(0) invert(1)',
                      }}
                    />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h4 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: 'white' }}>INVOICE</h4>
                    <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', margin: '4px 0' }}>
                      <strong>Invoice #:</strong> {job.invoice_number}
                    </p>
                    <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', margin: '4px 0' }}>
                      <strong>Date:</strong> {job.invoice_generated_at ? new Date(job.invoice_generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div style={{ padding: '32px' }}>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '32px',
                  marginBottom: '32px',
                }}>
                  <div style={{
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bill To:</h4>
                    {(() => {
                      const contractorInfo = job.contractors as ContractorInfo;
                      return (
                        <>
                          <p style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
                            {contractorInfo?.company_name || job.contractor_name}
                          </p>
                          {contractorInfo?.address && (
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>{contractorInfo.address}</p>
                          )}
                          {contractorInfo?.phone_number && (
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>{contractorInfo.phone_number}</p>
                          )}
                          {contractorInfo?.email && (
                            <p style={{ fontSize: '13px', color: '#6b7280' }}>{contractorInfo.email}</p>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div style={{
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Details:</h4>
                    <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.6' }}>
                      <p style={{ marginBottom: '2px' }}><strong>Customer:</strong> {job.subcontract_customer_name}</p>
                      <p style={{ marginBottom: '2px' }}><strong>Address:</strong> {job.installation_address}</p>
                      <p style={{ marginBottom: '2px' }}><strong>System Size:</strong> {job.system_size_kw} kW</p>
                      <p style={{ marginBottom: '2px' }}><strong>Panels:</strong> {job.panel_quantity}</p>
                      <p><strong>Install Date:</strong> {job.install_date ? new Date(job.install_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div style={{
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    background: '#f97316',
                    color: 'white',
                    padding: '12px 20px',
                    fontSize: '16px',
                    fontWeight: 700,
                  }}>
                    INVOICE SUMMARY
                  </div>
                  <div style={{ padding: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
                          <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '16px 0', fontSize: '14px', color: '#1a1a1a' }}>
                            System Installation ({job.system_size_kw} kW @ ${job.ppw}/kW)
                          </td>
                          <td style={{ textAlign: 'right', padding: '16px 0', fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
                            ${(job.gross_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        {adders.length > 0 && adders.map(adder => {
                          const systemSizeKw = parseFloat(formData.system_size_kw) || 0;
                          const panelQty = parseFloat(formData.panel_quantity) || 0;
                          let adderAmount = adder.amount;
                          let description = adder.name;
                          if (adder.type === 'per_watt') {
                            adderAmount = adder.amount * systemSizeKw;
                            description = `${adder.name} ($${adder.amount.toFixed(2)}/kW × ${systemSizeKw} kW)`;
                          } else if (adder.type === 'per_panel') {
                            adderAmount = adder.amount * panelQty;
                            description = `${adder.name} ($${adder.amount.toFixed(2)}/panel × ${panelQty} panels)`;
                          }
                          return (
                            <tr key={adder.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '16px 0 16px 20px', fontSize: '14px', color: '#6b7280' }}>
                                {description}
                              </td>
                              <td style={{ textAlign: 'right', padding: '16px 0', fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
                                ${adderAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div style={{
                      marginTop: '20px',
                      paddingTop: '20px',
                      borderTop: '3px solid #f97316',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a' }}>TOTAL AMOUNT DUE:</span>
                      <span style={{ fontSize: '24px', fontWeight: 700, color: '#f97316' }}>
                        ${((job.gross_revenue || 0) + adders.reduce((sum, a) => sum + a.amount, 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            </div>
          </div>
          ) : (
            <div>
              <SchedulingSection customer={job} />
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={handleDelete}
            style={{
              padding: '10px 20px',
              border: '1px solid #dc2626',
              background: 'white',
              color: '#dc2626',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Trash2 size={16} />
            Delete Job
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
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
    </div>
  );
}
