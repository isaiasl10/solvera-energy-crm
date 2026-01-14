import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, Edit2, X, DollarSign } from 'lucide-react';
import { supabase, type Customer } from '../lib/supabase';
import DocumentsSection from './DocumentsSection';
import ProjectTimeline from './ProjectTimeline';
import ProjectChat from './ProjectChat';
import { useAuth } from '../contexts/AuthContext';

type SalesManagerProjectViewProps = {
  customer: Customer;
  onBack: () => void;
};

type Tab = 'details' | 'documents' | 'timeline' | 'chat';

export default function SalesManagerProjectView({ customer: initialCustomer, onBack }: SalesManagerProjectViewProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [customer, setCustomer] = useState(initialCustomer);
  const [formData, setFormData] = useState(initialCustomer);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ppwRedline, setPpwRedline] = useState<number>(0);

  const tabs = [
    { id: 'details' as Tab, label: 'System Details' },
    { id: 'documents' as Tab, label: 'Documents' },
    { id: 'timeline' as Tab, label: 'Timeline' },
    { id: 'chat' as Tab, label: 'Chat' },
  ];

  useEffect(() => {
    const fetchSalesManagerPPW = async () => {
      if (user?.email) {
        const { data, error } = await supabase
          .from('app_users')
          .select('ppw_redline')
          .eq('email', user.email)
          .eq('role', 'sales_manager')
          .maybeSingle();

        if (!error && data) {
          setPpwRedline(data.ppw_redline || 0);
        }
      }
    };
    fetchSalesManagerPPW();
  }, [user]);

  useEffect(() => {
    const subscription = supabase
      .channel('customer_changes_sales_mgr')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers',
          filter: `id=eq.${customer.id}`,
        },
        (payload) => {
          const updated = payload.new as Customer;
          setCustomer(updated);
          setFormData(updated);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [customer.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleEdit = () => {
    setFormData(customer);
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setFormData(customer);
    setIsEditing(false);
    setError(null);
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    setError(null);

    try {
      const updateData = {
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number,
        installation_address: formData.installation_address,
        signature_date: formData.signature_date || null,
        system_size_kw: typeof formData.system_size_kw === 'string'
          ? parseFloat(formData.system_size_kw)
          : formData.system_size_kw,
        contract_price: formData.contract_price
          ? (typeof formData.contract_price === 'string' ? parseFloat(formData.contract_price) : formData.contract_price)
          : null,
        panel_quantity: typeof formData.panel_quantity === 'string'
          ? parseInt(formData.panel_quantity)
          : formData.panel_quantity,
        panel_brand: formData.panel_brand,
        panel_wattage: typeof formData.panel_wattage === 'string'
          ? parseInt(formData.panel_wattage)
          : formData.panel_wattage,
        inverter_option: formData.inverter_option,
        racking_type: formData.racking_type,
        roof_type: formData.roof_type || null,
        battery_brand: formData.battery_brand || null,
        battery_quantity: formData.battery_quantity
          ? (typeof formData.battery_quantity === 'string' ? parseInt(formData.battery_quantity) : formData.battery_quantity)
          : 0,
        utility_company: formData.utility_company || null,
        utility_app_id: formData.utility_app_id || null,
        hoa_name: formData.hoa_name || null,
        hoa_management_company: formData.hoa_management_company || null,
      };

      const { data: updatedData, error: updateError } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customer.id)
        .select()
        .maybeSingle();

      if (updateError) throw updateError;

      if (updatedData) {
        setCustomer(updatedData);
        setFormData(updatedData);
      }

      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving details:', err);
      setError('Failed to save details');
    } finally {
      setSaving(false);
    }
  };

  const baseEpcCost = customer.system_size_kw ? customer.system_size_kw * ppwRedline * 1000 : 0;

  const batteryKwPerUnit: Record<string, number> = {
    'Sonnen': 20,
    'Duracell': 10,
    'Enphase': 5,
    'EP Cube': 3.3,
  };

  const batteryBrand = formData.battery_brand || '';
  const batteryQuantity = formData.battery_quantity || 0;
  const kwPerUnit = batteryKwPerUnit[batteryBrand] || 0;
  const totalBatteryKw = kwPerUnit * batteryQuantity;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Customers
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{customer.full_name}</h1>
              <p className="text-xs text-gray-500">Customer ID: {customer.customer_id}</p>
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm">
                Changes saved successfully
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

        {activeTab === 'details' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Customer Information</h2>
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDetails}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{customer.full_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{customer.email || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone_number"
                      value={formData.phone_number || ''}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{customer.phone_number || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Installation Address
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="installation_address"
                      value={formData.installation_address}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{customer.installation_address}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Signature Date
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="signature_date"
                      value={formData.signature_date || ''}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {customer.signature_date
                        ? new Date(customer.signature_date).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4">System Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    System Size (kW)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      name="system_size_kw"
                      value={formData.system_size_kw}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 font-semibold">{customer.system_size_kw} kW</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Contract Price
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      name="contract_price"
                      value={formData.contract_price || ''}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 font-semibold">
                      {customer.contract_price
                        ? `$${Number(customer.contract_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Base EPC Cost
                  </label>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-gray-900 font-bold">
                      ${baseEpcCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    PPW: ${ppwRedline.toFixed(4)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Panel Quantity
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="panel_quantity"
                      value={formData.panel_quantity}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{customer.panel_quantity}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Panel Brand
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="panel_brand"
                      value={formData.panel_brand}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{customer.panel_brand}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Panel Wattage
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="panel_wattage"
                      value={formData.panel_wattage}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{customer.panel_wattage}W</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Inverter Option
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="inverter_option"
                      value={formData.inverter_option}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{customer.inverter_option}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Racking Type
                  </label>
                  {isEditing ? (
                    <select
                      name="racking_type"
                      value={formData.racking_type}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="IronRidge XR-10">IronRidge XR-10</option>
                      <option value="IronRidge XR-100">IronRidge XR-100</option>
                      <option value="IronRidge XR-1000">IronRidge XR-1000</option>
                      <option value="Unirac">Unirac</option>
                      <option value="SnapNrack">SnapNrack</option>
                      <option value="QuickMount">QuickMount</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900">{customer.racking_type}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Roof Type
                  </label>
                  {isEditing ? (
                    <select
                      name="roof_type"
                      value={formData.roof_type || ''}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="">Select roof type</option>
                      <option value="Composition Shingle">Composition Shingle</option>
                      <option value="Tile">Tile</option>
                      <option value="Metal">Metal</option>
                      <option value="TPO">TPO</option>
                      <option value="Tar and Gravel">Tar and Gravel</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900">{customer.roof_type || 'Not specified'}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Battery Storage</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Battery Brand
                    </label>
                    {isEditing ? (
                      <select
                        name="battery_brand"
                        value={formData.battery_brand || ''}
                        onChange={handleChange}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="">No Battery</option>
                        <option value="Sonnen">Sonnen (20kW each)</option>
                        <option value="Duracell">Duracell (10kW each)</option>
                        <option value="Enphase">Enphase (5kW each)</option>
                        <option value="EP Cube">EP Cube (3.3kW each)</option>
                      </select>
                    ) : (
                      <p className="text-sm text-gray-900">{customer.battery_brand || 'No Battery'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Battery Quantity
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="battery_quantity"
                        value={formData.battery_quantity || 0}
                        onChange={handleChange}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{customer.battery_quantity || 0}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Total Battery Capacity
                    </label>
                    <p className="text-sm text-gray-900 font-bold">
                      {totalBatteryKw > 0 ? `${totalBatteryKw.toFixed(1)} kW` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Utility & HOA Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Utility Company
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="utility_company"
                        value={formData.utility_company || ''}
                        onChange={handleChange}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{customer.utility_company || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Utility App ID
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="utility_app_id"
                        value={formData.utility_app_id || ''}
                        onChange={handleChange}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{customer.utility_app_id || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      HOA Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="hoa_name"
                        value={formData.hoa_name || ''}
                        onChange={handleChange}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{customer.hoa_name || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      HOA Management Company
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="hoa_management_company"
                        value={formData.hoa_management_company || ''}
                        onChange={handleChange}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{customer.hoa_management_company || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentsSection customerId={customer.id} allowedTypes={['customer_documents']} />
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Timeline is view-only for Sales Managers. Contact operations to update project status.
              </p>
            </div>
            <ProjectTimeline customer={customer} />
          </div>
        )}

        {activeTab === 'chat' && (
          <ProjectChat customer={customer} />
        )}
        </div>
      </div>
    </div>
  );
}
