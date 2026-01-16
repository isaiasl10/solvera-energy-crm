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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-xl w-full max-w-full sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Subcontract Job Details
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {job.contractor_name} - {job.subcontract_customer_name}
            </p>
          </div>
        </div>

        <div className="flex gap-2 p-3 sm:p-4 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
              activeTab === 'details'
                ? 'bg-orange-600 text-white'
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}
          >
            Job Details
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors min-h-[44px] flex items-center gap-2 ${
              activeTab === 'invoice'
                ? 'bg-orange-600 text-white'
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText size={16} />
            Invoice
          </button>
          <button
            onClick={() => setActiveTab('scheduling')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
              activeTab === 'scheduling'
                ? 'bg-orange-600 text-white'
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}
          >
            Scheduling
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {activeTab === 'details' ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    System Size (kW) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.system_size_kw}
                    onChange={(e) => setFormData({ ...formData, system_size_kw: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Panel Quantity *
                  </label>
                  <input
                    type="number"
                    value={formData.panel_quantity}
                    onChange={(e) => setFormData({ ...formData, panel_quantity: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Install Date
                  </label>
                  <input
                    type="date"
                    value={formData.install_date}
                    onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
                    onBlur={async (e) => {
                      if (e.target.value !== job?.install_date) {
                        try {
                          const { error } = await supabase
                            .from('customers')
                            .update({ install_date: e.target.value || null })
                            .eq('id', jobId);

                          if (error) throw error;
                          await loadJob();
                          onUpdate();
                        } catch (error) {
                          console.error('Error saving install date:', error);
                        }
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="install_scheduled">Install Scheduled</option>
                    <option value="pending_completion">Pending Completion</option>
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

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-base font-semibold mb-3">
                  Adders
                </h3>

                {adders.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {adders.map(adder => (
                      <div key={adder.id} className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                        <span className="text-sm text-gray-900">{adder.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-green-600">
                            ${adder.amount.toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleRemoveAdder(adder.id)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Adder name"
                    value={newAdder.name}
                    onChange={(e) => setNewAdder({ ...newAdder, name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <select
                    value={newAdder.type}
                    onChange={(e) => setNewAdder({ ...newAdder, type: e.target.value as 'fixed' | 'per_watt' | 'per_panel' })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                  >
                    <option value="fixed">Fixed Amount</option>
                    <option value="per_watt">Per kW</option>
                    <option value="per_panel">Per Panel</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={newAdder.type === 'fixed' ? 'Amount' : newAdder.type === 'per_watt' ? '$/kW' : '$/panel'}
                    value={newAdder.amount}
                    onChange={(e) => setNewAdder({ ...newAdder, amount: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddAdder}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-blue-900">System Price:</span>
                  <span className="text-sm font-semibold text-blue-900">
                    ${calculateGrossRevenue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-blue-900">Plus: Adders</span>
                  <span className="text-sm font-semibold text-green-600">
                    +${calculateAddersTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-blue-900">Less: Labor</span>
                  <span className="text-sm font-semibold text-red-600">
                    -${(parseFloat(formData.total_labor) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-blue-900">Less: Expenses</span>
                  <span className="text-sm font-semibold text-red-600">
                    -${(parseFloat(formData.expenses) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t-2 border-blue-500 pt-3 flex justify-between items-center">
                  <span className="text-base font-bold text-blue-900">Net Revenue:</span>
                  <span className="text-base font-bold text-green-600">
                    ${calculateNetRevenue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ) : activeTab === 'invoice' ? (
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <img
                      src="/solvera_energy_logo_redesign.png"
                      alt="Solvera Energy Logo"
                      className="max-w-[150px] sm:max-w-[200px] h-auto brightness-0 invert"
                    />
                  </div>
                  <div className="text-left sm:text-right">
                    <h4 className="text-2xl sm:text-3xl font-bold mb-2 text-white">INVOICE</h4>
                    <p className="text-sm text-white text-opacity-90 my-1">
                      <strong>Invoice #:</strong> {job.invoice_number}
                    </p>
                    <p className="text-sm text-white text-opacity-90 my-1">
                      <strong>Date:</strong> {job.invoice_generated_at ? new Date(job.invoice_generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-8">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
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

        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3 justify-between">
          <button
            onClick={handleDelete}
            className="px-4 py-2.5 border border-red-600 bg-white text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Delete Job</span>
            <span className="sm:hidden">Delete</span>
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              Close
            </button>
            {activeTab === 'details' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 sm:flex-none px-4 py-2.5 border-none rounded-lg text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 min-h-[44px] ${
                  saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                }`}
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
