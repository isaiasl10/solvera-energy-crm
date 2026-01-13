import { useState, useEffect } from 'react';
import { Edit2, Save, X, Loader2, CheckCircle, Circle, DollarSign, AlertTriangle, Clock } from 'lucide-react';
import { supabase, type Customer, type CustomerFinancing, type FinancingProduct, type Financier } from '../lib/supabase';

type FinancingSectionProps = {
  customer: Customer;
};

type ProjectTimeline = {
  permit_status: string;
  utility_status: string;
  city_permits_approved_date: string | null;
  utility_application_approved_date: string | null;
};

export default function FinancingSection({ customer }: FinancingSectionProps) {
  const [financing, setFinancing] = useState<CustomerFinancing | null>(null);
  const [products, setProducts] = useState<FinancingProduct[]>([]);
  const [timeline, setTimeline] = useState<ProjectTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    contract_type: 'CASH' as 'CASH' | 'LOAN' | 'LEASE' | 'PPA',
    financing_product_id: '',
    deposit_amount: 2000,
    pre_install_payment_amount: 0,
    final_payment_amount: 1000,
  });

  useEffect(() => {
    loadData();
  }, [customer.id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [financingResult, productsResult, timelineResult] = await Promise.all([
      supabase
        .from('customer_financing')
        .select('*, financing_product:financing_products(*, financier:financiers(*))')
        .eq('customer_id', customer.id)
        .maybeSingle(),
      supabase
        .from('financing_products')
        .select('*, financier:financiers(*)')
        .eq('active', true)
        .order('product_name'),
      supabase
        .from('project_timeline')
        .select('permit_status, utility_status, city_permits_approved_date, utility_application_approved_date')
        .eq('customer_id', customer.id)
        .maybeSingle(),
    ]);

    if (financingResult.error) {
      setError(financingResult.error.message);
    } else {
      setFinancing(financingResult.data);
      if (financingResult.data) {
        setFormData({
          contract_type: financingResult.data.contract_type,
          financing_product_id: financingResult.data.financing_product_id || '',
          deposit_amount: financingResult.data.deposit_amount,
          pre_install_payment_amount: financingResult.data.pre_install_payment_amount,
          final_payment_amount: financingResult.data.final_payment_amount,
        });
      }
    }

    if (productsResult.error) {
      setError(productsResult.error.message);
    } else {
      setProducts(productsResult.data || []);
    }

    if (timelineResult.error) {
      console.error('Error loading timeline:', timelineResult.error);
    } else {
      setTimeline(timelineResult.data);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const contractPrice = customer.contract_price || 0;
    const preInstallAmount = formData.contract_type === 'CASH'
      ? contractPrice - formData.deposit_amount - formData.final_payment_amount
      : 0;

    const dataToSave = {
      customer_id: customer.id,
      contract_type: formData.contract_type,
      financing_product_id: formData.contract_type !== 'CASH' ? formData.financing_product_id || null : null,
      deposit_amount: formData.contract_type === 'CASH' ? formData.deposit_amount : 0,
      deposit_received: financing?.deposit_received || false,
      deposit_received_date: financing?.deposit_received_date || null,
      pre_install_payment_amount: preInstallAmount,
      pre_install_payment_received: financing?.pre_install_payment_received || false,
      pre_install_payment_received_date: financing?.pre_install_payment_received_date || null,
      final_payment_amount: formData.contract_type === 'CASH' ? formData.final_payment_amount : 0,
      final_payment_received: financing?.final_payment_received || false,
      final_payment_received_date: financing?.final_payment_received_date || null,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (financing) {
      result = await supabase
        .from('customer_financing')
        .update(dataToSave)
        .eq('id', financing.id);
    } else {
      result = await supabase
        .from('customer_financing')
        .insert([dataToSave]);
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setEditing(false);
      loadData();
    }

    setSaving(false);
  };

  const handlePaymentStatusToggle = async (field: 'deposit' | 'pre_install' | 'final') => {
    if (!financing) return;

    setSaving(true);
    setError(null);

    const updates: Partial<CustomerFinancing> = {
      updated_at: new Date().toISOString(),
    };

    if (field === 'deposit') {
      updates.deposit_received = !financing.deposit_received;
      updates.deposit_received_date = !financing.deposit_received ? new Date().toISOString() : null;
    } else if (field === 'pre_install') {
      updates.pre_install_payment_received = !financing.pre_install_payment_received;
      updates.pre_install_payment_received_date = !financing.pre_install_payment_received ? new Date().toISOString() : null;
    } else {
      updates.final_payment_received = !financing.final_payment_received;
      updates.final_payment_received_date = !financing.final_payment_received ? new Date().toISOString() : null;
    }

    const { error: err } = await supabase
      .from('customer_financing')
      .update(updates)
      .eq('id', financing.id);

    if (err) {
      setError(err.message);
    } else {
      loadData();
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const isPreInstallPaymentEligible = () => {
    if (!timeline) return false;
    return timeline.permit_status === 'approved' && timeline.utility_status === 'approved';
  };

  const filteredProducts = products.filter(p => p.product_type === formData.contract_type);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Contract & Financing</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract Type
            </label>
            <select
              value={formData.contract_type}
              onChange={(e) => setFormData({
                ...formData,
                contract_type: e.target.value as 'CASH' | 'LOAN' | 'LEASE' | 'PPA',
                financing_product_id: '',
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="CASH">CASH</option>
              <option value="LOAN">LOAN</option>
              <option value="LEASE">LEASE</option>
              <option value="PPA">PPA</option>
            </select>
          </div>

          {formData.contract_type === 'CASH' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deposit Amount (Default: $2,000)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.deposit_amount}
                  onChange={(e) => setFormData({ ...formData, deposit_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Required before scheduling site survey</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Payment Amount (Default: $1,000)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.final_payment_amount}
                  onChange={(e) => setFormData({ ...formData, final_payment_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Due after inspection completion</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-gray-700">
                  <strong>Pre-Install Payment:</strong> ${((customer.contract_price || 0) - formData.deposit_amount - formData.final_payment_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">Calculated automatically (Contract Price - Deposit - Final Payment)</p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Financing Product
              </label>
              <select
                value={formData.financing_product_id}
                onChange={(e) => setFormData({ ...formData, financing_product_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a product</option>
                {filteredProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.financier?.name} - {product.product_name} ({product.term_months} months @ {product.apr}%)
                  </option>
                ))}
              </select>
              {filteredProducts.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No {formData.contract_type} products available. Add them in Administration.</p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                if (financing) {
                  setFormData({
                    contract_type: financing.contract_type,
                    financing_product_id: financing.financing_product_id || '',
                    deposit_amount: financing.deposit_amount,
                    pre_install_payment_amount: financing.pre_install_payment_amount,
                    final_payment_amount: financing.final_payment_amount,
                  });
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {!financing ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                No financing information configured. Click "Edit" to set up contract type and payment terms.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Contract Type</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600">{financing.contract_type}</p>
                {financing.contract_type !== 'CASH' && financing.financing_product && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-700">
                      <strong>Financier:</strong> {financing.financing_product.financier?.name}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Product:</strong> {financing.financing_product.product_name}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Terms:</strong> {financing.financing_product.term_months} months @ {financing.financing_product.apr}% APR
                    </p>
                  </div>
                )}
              </div>

              {financing.contract_type === 'CASH' && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Payment Schedule</h3>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">1. Deposit</h4>
                          {financing.deposit_received && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                              Received
                            </span>
                          )}
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          ${financing.deposit_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Required before site survey</p>
                        {financing.deposit_received && financing.deposit_received_date && (
                          <p className="text-xs text-gray-500">
                            Received: {new Date(financing.deposit_received_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handlePaymentStatusToggle('deposit')}
                        disabled={saving}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                          financing.deposit_received
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {financing.deposit_received ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Received
                          </>
                        ) : (
                          <>
                            <Circle className="w-4 h-4" />
                            Mark Received
                          </>
                        )}
                      </button>
                    </div>

                    <div className={`flex items-start justify-between p-3 rounded-lg ${
                      isPreInstallPaymentEligible() && !financing.pre_install_payment_received
                        ? 'bg-amber-50 border-2 border-amber-400'
                        : 'bg-gray-50'
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">2. Pre-Install Payment</h4>
                          {financing.pre_install_payment_received ? (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                              Received
                            </span>
                          ) : isPreInstallPaymentEligible() ? (
                            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Payment Due Now
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Awaiting Approvals
                            </span>
                          )}
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          ${financing.pre_install_payment_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {financing.pre_install_payment_received ? (
                            'Received and confirmed'
                          ) : isPreInstallPaymentEligible() ? (
                            'Due: Permits & utility approved - Collect before scheduling installation'
                          ) : (
                            'Will be due when permits and utility are approved'
                          )}
                        </p>
                        {financing.pre_install_payment_received && financing.pre_install_payment_received_date && (
                          <p className="text-xs text-gray-500">
                            Received: {new Date(financing.pre_install_payment_received_date).toLocaleDateString()}
                          </p>
                        )}
                        {!financing.pre_install_payment_received && timeline && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              {timeline.permit_status === 'approved' ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-3 h-3" />
                                  Permits Approved
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Circle className="w-3 h-3" />
                                  Permits: {timeline.permit_status || 'Pending'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              {timeline.utility_status === 'approved' ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-3 h-3" />
                                  Utility Approved
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Circle className="w-3 h-3" />
                                  Utility: {timeline.utility_status || 'Pending'}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handlePaymentStatusToggle('pre_install')}
                        disabled={saving}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                          financing.pre_install_payment_received
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {financing.pre_install_payment_received ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Received
                          </>
                        ) : (
                          <>
                            <Circle className="w-4 h-4" />
                            Mark Received
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">3. Final Payment</h4>
                          {financing.final_payment_received && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                              Received
                            </span>
                          )}
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          ${financing.final_payment_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">After inspection completion (PTO)</p>
                        {financing.final_payment_received && financing.final_payment_received_date && (
                          <p className="text-xs text-gray-500">
                            Received: {new Date(financing.final_payment_received_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handlePaymentStatusToggle('final')}
                        disabled={saving}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                          financing.final_payment_received
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {financing.final_payment_received ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Received
                          </>
                        ) : (
                          <>
                            <Circle className="w-4 h-4" />
                            Mark Received
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total Contract Price:</span>
                        <span className="text-xl font-bold text-blue-600">
                          ${(customer.contract_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
