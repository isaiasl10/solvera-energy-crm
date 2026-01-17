import React, { useState, useEffect } from 'react';
import { SubcontractJob } from '../hooks/useSubcontractJobs';
import { supabase } from '../lib/supabase';
import { Calendar, DollarSign, FileText, Image, Save, CheckCircle } from 'lucide-react';
import ServicePhotoTicket from './ServicePhotoTicket';
import InvoicePDF from './InvoicePDF';
import { InvoiceData } from '../lib/invoiceGenerator';

interface ServiceJobDetailProps {
  job: SubcontractJob;
  onUpdate: (updates: Partial<SubcontractJob>) => Promise<void>;
}

const SERVICE_STATUSES = [
  'pending',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
];

export default function ServiceJobDetail({ job, onUpdate }: ServiceJobDetailProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'invoice'>('details');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    workflow_status: job.workflow_status,
    scheduled_date: job.scheduled_date || '',
    labor_cost: job.labor_cost || 0,
    material_cost: job.material_cost || 0,
    gross_amount: job.gross_amount || 0,
    notes: job.notes || '',
  });
  const [scheduling, setScheduling] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchScheduling();
  }, [job.id]);

  const fetchScheduling = async () => {
    const { data } = await supabase
      .from('scheduling')
      .select('*')
      .eq('subcontract_job_id', job.id)
      .eq('appointment_type', 'service')
      .maybeSingle();

    setScheduling(data);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(formData);
      setEditing(false);
    } catch (error) {
      console.error('Error updating job:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentUpdate = async (field: string, value: any) => {
    await onUpdate({ [field]: value });
  };

  const invoiceData: InvoiceData | null = job.invoice_number
    ? {
        invoiceNumber: job.invoice_number,
        invoiceDate: job.invoice_sent_date || job.created_at,
        dueDate: job.invoice_sent_date
          ? new Date(new Date(job.invoice_sent_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
        billFrom: {
          name: 'Solvera Energy',
          address: '123 Solar St, City, ST 12345',
          phone: '(555) 123-4567',
          email: 'billing@solvera.com',
        },
        billTo: {
          name: job.customer_name,
          address: job.address,
          phone: job.phone_number,
          email: job.email,
        },
        lineItems: [
          {
            description: 'Service Labor',
            amount: job.labor_cost,
          },
          {
            description: 'Materials',
            amount: job.material_cost,
          },
        ],
        subtotal: job.gross_amount,
        total: job.gross_amount,
        notes: job.notes,
        paymentInfo: job.invoice_paid_date
          ? {
              method: job.payment_type,
              checkNumber: job.check_number,
              paidDate: job.invoice_paid_date,
            }
          : undefined,
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Job</h2>
          <p className="text-sm text-gray-600">{job.customer_name} - {job.address}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            job.workflow_status === 'completed' ? 'bg-green-100 text-green-800' :
            job.workflow_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            job.workflow_status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {job.workflow_status}
          </span>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Details
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'photos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Image className="w-4 h-4 inline mr-2" />
            Photos
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'invoice'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Invoice
          </button>
        </nav>
      </div>

      {activeTab === 'details' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Job Details</h3>
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editing ? (
                <>
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </>
              ) : (
                'Edit'
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow Status
              </label>
              {editing ? (
                <select
                  value={formData.workflow_status}
                  onChange={(e) => setFormData({ ...formData, workflow_status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {SERVICE_STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-900">{job.workflow_status}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Date
              </label>
              {editing ? (
                <input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              ) : (
                <p className="text-gray-900">{job.scheduled_date || 'Not scheduled'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Labor Cost
              </label>
              {editing ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.labor_cost}
                  onChange={(e) => setFormData({ ...formData, labor_cost: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              ) : (
                <p className="text-gray-900">${job.labor_cost.toFixed(2)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material Cost
              </label>
              {editing ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.material_cost}
                  onChange={(e) => setFormData({ ...formData, material_cost: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              ) : (
                <p className="text-gray-900">${job.material_cost.toFixed(2)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gross Amount
              </label>
              {editing ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.gross_amount}
                  onChange={(e) => setFormData({ ...formData, gross_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              ) : (
                <p className="text-gray-900">${job.gross_amount.toFixed(2)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Net Revenue
              </label>
              <p className="text-gray-900 font-semibold">${job.net_revenue.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            {editing ? (
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            ) : (
              <p className="text-gray-900 whitespace-pre-wrap">{job.notes || 'No notes'}</p>
            )}
          </div>

          <div className="border-t pt-6">
            <h4 className="font-semibold text-gray-900 mb-4">Payment Tracking</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Sent Date
                </label>
                <input
                  type="datetime-local"
                  value={job.invoice_sent_date ? new Date(job.invoice_sent_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handlePaymentUpdate('invoice_sent_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Paid Date
                </label>
                <input
                  type="datetime-local"
                  value={job.invoice_paid_date ? new Date(job.invoice_paid_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handlePaymentUpdate('invoice_paid_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Type
                </label>
                <select
                  value={job.payment_type || ''}
                  onChange={(e) => handlePaymentUpdate('payment_type', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select...</option>
                  <option value="CHECK">CHECK</option>
                  <option value="ACH">ACH</option>
                  <option value="WIRE">WIRE</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Number
                </label>
                <input
                  type="text"
                  value={job.check_number || ''}
                  onChange={(e) => handlePaymentUpdate('check_number', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'photos' && scheduling && (
        <div className="bg-white rounded-lg shadow p-6">
          <ServicePhotoTicket ticketId={scheduling.id} />
        </div>
      )}

      {activeTab === 'invoice' && (
        <div className="bg-white rounded-lg shadow p-6">
          {invoiceData ? (
            <InvoicePDF invoiceData={invoiceData} />
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No invoice generated yet</p>
              <button
                onClick={() => handlePaymentUpdate('invoice_number', `SVC-${Date.now()}`)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generate Invoice
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
