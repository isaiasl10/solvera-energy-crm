import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, Calendar, Clock, User, CheckCircle2, Edit2, X, DollarSign, TrendingUp } from 'lucide-react';
import { supabase, type Customer, type CustomAdder, calculateAdderCost, fetchActiveAdders } from '../lib/supabase';
import DocumentsSection from './DocumentsSection';
import ProjectTimeline from './ProjectTimeline';
import ProjectChat from './ProjectChat';
import { useAuth } from '../contexts/AuthContext';

type SalesRepProjectViewProps = {
  customer: Customer;
  onBack: () => void;
};

type Tab = 'details' | 'adders' | 'commission' | 'documents' | 'timeline' | 'chat';

type AdderKey = 'adder_steep_roof' | 'adder_metal_roof' | 'adder_tile_roof' | 'adder_small_system' | 'adder_fsu' | 'adder_mpu' | 'adder_critter_guard';

type SiteSurveyScheduling = {
  tech_id: string;
  scheduled_date: string;
  time_window: string;
};

export default function SalesRepProjectView({ customer: initialCustomer, onBack }: SalesRepProjectViewProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [customer, setCustomer] = useState(initialCustomer);
  const [formData, setFormData] = useState(initialCustomer);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [adders, setAdders] = useState<CustomAdder[]>([]);
  const [addersLoading, setAddersLoading] = useState(true);
  const [adderState, setAdderState] = useState<Record<AdderKey, boolean>>({
    adder_steep_roof: customer.adder_steep_roof || false,
    adder_metal_roof: customer.adder_metal_roof || false,
    adder_tile_roof: customer.adder_tile_roof || false,
    adder_small_system: customer.adder_small_system || false,
    adder_fsu: customer.adder_fsu || false,
    adder_mpu: customer.adder_mpu || false,
    adder_critter_guard: customer.adder_critter_guard || false,
  });
  const [showSiteSurveyModal, setShowSiteSurveyModal] = useState(false);
  const [availableTechs, setAvailableTechs] = useState<any[]>([]);
  const [siteSurveyForm, setSiteSurveyForm] = useState<SiteSurveyScheduling>({
    tech_id: '',
    scheduled_date: '',
    time_window: '',
  });
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [ppwRedline, setPpwRedline] = useState<number>(0);

  const tabs = [
    { id: 'details' as Tab, label: 'System Details' },
    { id: 'adders' as Tab, label: 'Adders' },
    { id: 'commission' as Tab, label: 'Commission' },
    { id: 'documents' as Tab, label: 'Documents' },
    { id: 'timeline' as Tab, label: 'Timeline' },
    { id: 'chat' as Tab, label: 'Chat' },
  ];

  useEffect(() => {
    const loadAdders = async () => {
      setAddersLoading(true);
      const fetchedAdders = await fetchActiveAdders();
      setAdders(fetchedAdders);
      setAddersLoading(false);
    };
    loadAdders();
  }, []);

  useEffect(() => {
    const fetchSalesRepPPW = async () => {
      if (user?.email) {
        const { data, error } = await supabase
          .from('app_users')
          .select('ppw_redline')
          .eq('email', user.email)
          .eq('role', 'sales_rep')
          .maybeSingle();

        if (!error && data) {
          setPpwRedline(data.ppw_redline || 0);
        }
      }
    };
    fetchSalesRepPPW();
  }, [user]);

  useEffect(() => {
    const subscription = supabase
      .channel('customer_changes_sales')
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
          setAdderState({
            adder_steep_roof: updated.adder_steep_roof || false,
            adder_metal_roof: updated.adder_metal_roof || false,
            adder_tile_roof: updated.adder_tile_roof || false,
            adder_small_system: updated.adder_small_system || false,
            adder_fsu: updated.adder_fsu || false,
            adder_mpu: updated.adder_mpu || false,
            adder_critter_guard: updated.adder_critter_guard || false,
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [customer.id]);

  const getAdderFieldKey = (adderName: string): AdderKey | null => {
    const nameMap: Record<string, AdderKey> = {
      'Steep Roof': 'adder_steep_roof',
      'Metal Roof': 'adder_metal_roof',
      'Tile Roof': 'adder_tile_roof',
      'Small System Adder': 'adder_small_system',
      'FSU': 'adder_fsu',
      'MPU': 'adder_mpu',
      'Critter Guard': 'adder_critter_guard',
    };
    return nameMap[adderName] || null;
  };

  const calculateTotalAdders = () => {
    let total = 0;
    const systemSize = customer.system_size_kw;
    const panelQty = customer.panel_quantity;

    adders.forEach((adder) => {
      const fieldKey = getAdderFieldKey(adder.name);
      if (fieldKey && adderState[fieldKey]) {
        total += calculateAdderCost(adder, systemSize, panelQty);
      }
    });

    return total;
  };

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
        installation_address: formData.address,
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

      const { error: updateError } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customer.id);

      if (updateError) throw updateError;

      setCustomer(prev => ({ ...prev, ...updateData }));
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

  const handleAdderToggle = (adderKey: AdderKey) => {
    setAdderState(prev => ({
      ...prev,
      [adderKey]: !prev[adderKey],
    }));
  };

  const handleSaveAdders = async () => {
    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('customers')
        .update(adderState)
        .eq('id', customer.id);

      if (updateError) throw updateError;

      setCustomer(prev => ({ ...prev, ...adderState }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving adders:', err);
      setError('Failed to save adders');
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleSiteSurvey = async () => {
    setShowSiteSurveyModal(true);
    setSchedulingLoading(true);

    try {
      const { data: techs, error: techError } = await supabase
        .from('app_users')
        .select('id, full_name, role')
        .in('role', ['service_tech', 'journeyman_electrician', 'master_electrician', 'residential_wireman'])
        .order('full_name');

      if (techError) throw techError;
      setAvailableTechs(techs || []);
    } catch (err) {
      console.error('Error loading technicians:', err);
      setError('Failed to load available technicians');
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleSaveSiteSurvey = async () => {
    if (!siteSurveyForm.tech_id || !siteSurveyForm.scheduled_date || !siteSurveyForm.time_window) {
      setError('Please fill in all scheduling fields');
      return;
    }

    setSchedulingLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('scheduling')
        .insert({
          customer_id: customer.id,
          ticket_type: 'site_survey',
          assigned_to: siteSurveyForm.tech_id,
          scheduled_date: siteSurveyForm.scheduled_date,
          time_window: siteSurveyForm.time_window,
          status: 'scheduled',
          created_by: user?.email || 'sales_rep',
        });

      if (insertError) throw insertError;

      const { error: timelineError } = await supabase
        .from('project_timeline')
        .upsert({
          customer_id: customer.id,
          site_survey_status: 'scheduled',
        }, {
          onConflict: 'customer_id',
        });

      if (timelineError) throw timelineError;

      setShowSiteSurveyModal(false);
      setSiteSurveyForm({
        tech_id: '',
        scheduled_date: '',
        time_window: '',
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error scheduling site survey:', err);
      setError('Failed to schedule site survey');
    } finally {
      setSchedulingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{customer.full_name}</h1>
                <p className="text-sm text-gray-500">{customer.installation_address}</p>
              </div>
            </div>
            <button
              onClick={handleScheduleSiteSurvey}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Schedule Site Survey
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            Changes saved successfully
          </div>
        )}

        {activeTab === 'details' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">System Details</h2>
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDetails}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.full_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.email || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.phone_number || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.installation_address}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Signature Date</label>
                    {isEditing ? (
                      <input
                        type="date"
                        name="signature_date"
                        value={formData.signature_date || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.signature_date || 'Not set'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">System Size (kW)</label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        name="system_size_kw"
                        value={formData.system_size_kw}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.system_size_kw} kW</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract Price</label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        name="contract_price"
                        value={formData.contract_price || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">
                        {customer.contract_price ? `$${fmt(customer.contract_price, { maximumFractionDigits: 0 })}` : 'N/A'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Panel Quantity</label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="panel_quantity"
                        value={formData.panel_quantity}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.panel_quantity}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Panel Brand</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="panel_brand"
                        value={formData.panel_brand || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.panel_brand || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Panel Wattage</label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="panel_wattage"
                        value={formData.panel_wattage || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.panel_wattage ? `${customer.panel_wattage}W` : 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inverter Option</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="inverter_option"
                        value={formData.inverter_option || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.inverter_option || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Racking Type</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="racking_type"
                        value={formData.racking_type || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.racking_type || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Roof Type</label>
                    {isEditing ? (
                      <select
                        name="roof_type"
                        value={formData.roof_type || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select roof type</option>
                        <option value="Composition Shingle">Composition Shingle</option>
                        <option value="Metal">Metal</option>
                        <option value="Tile">Tile</option>
                        <option value="Flat">Flat</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{customer.roof_type || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Battery Brand</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="battery_brand"
                        value={formData.battery_brand || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.battery_brand || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Battery Quantity</label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="battery_quantity"
                        value={formData.battery_quantity || 0}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.battery_quantity || 0}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Utility & HOA</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Utility Company</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="utility_company"
                        value={formData.utility_company || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.utility_company || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Utility Application ID</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="utility_app_id"
                        value={formData.utility_app_id || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.utility_app_id || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HOA Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="hoa_name"
                        value={formData.hoa_name || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.hoa_name || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HOA Management Company</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="hoa_management_company"
                        value={formData.hoa_management_company || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{customer.hoa_management_company || 'N/A'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'adders' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Adders</h2>
              <button
                onClick={handleSaveAdders}
                disabled={saving || addersLoading}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Adders
              </button>
            </div>

            {addersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {adders.map((adder) => {
                  const fieldKey = getAdderFieldKey(adder.name);
                  if (!fieldKey) return null;

                  const isSelected = adderState[fieldKey];
                  const cost = calculateAdderCost(adder, customer.system_size_kw, customer.panel_quantity);

                  return (
                    <div
                      key={adder.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleAdderToggle(fieldKey)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'border-orange-600 bg-orange-600' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{adder.name}</p>
                            <p className="text-sm text-gray-500">
                              {adder.calculation_type === 'per_kw' && `$${adder.cost_amount}/kW`}
                              {adder.calculation_type === 'per_panel' && `$${adder.cost_amount}/panel`}
                              {adder.calculation_type === 'flat_rate' && 'Flat rate'}
                            </p>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          ${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  );
                })}

                <div className="border-t-2 border-gray-300 pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-900">Total Adders</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${calculateTotalAdders().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'commission' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Commission Breakdown</h2>
            </div>

            {!customer.contract_price ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-sm text-yellow-800">
                  Contract price not yet entered. Commission will be calculated once contract price is available.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Commission Formula</h3>
                  <p className="text-sm text-blue-800">
                    Contract Price - (PPW Redline × System Size) = Total Commission
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <p className="text-sm text-gray-600">Contract Price</p>
                      <p className="text-xs text-gray-500">Total project value</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      ${customer.contract_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <p className="text-sm text-gray-600">System Size</p>
                      <p className="text-xs text-gray-500">Total system capacity in watts</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {fmt(customer.system_size_kw * 1000, { maximumFractionDigits: 0 })} W
                    </p>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <p className="text-sm text-gray-600">Your PPW Redline</p>
                      <p className="text-xs text-gray-500">Minimum price per watt</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      ${ppwRedline.toFixed(4)}/W
                    </p>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-200 bg-red-50 px-3 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-red-900">Company Base Cost</p>
                      <p className="text-xs text-red-700">PPW Redline × System Size (W)</p>
                    </div>
                    <p className="text-xl font-bold text-red-900">
                      ${(ppwRedline * customer.system_size_kw * 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="border-t-4 border-green-500 pt-6 mt-6 bg-green-50 p-6 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-green-900 mb-1">Your Total Commission</p>
                        <p className="text-sm text-green-700">
                          ${customer.contract_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${(ppwRedline * customer.system_size_kw * 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <p className="text-3xl font-bold text-green-900">
                        ${(customer.contract_price - (ppwRedline * customer.system_size_kw * 1000)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">Commission as % of Contract</p>
                      <p className="text-lg font-bold text-green-600">
                        {((customer.contract_price - (ppwRedline * customer.system_size_kw * 1000)) / customer.contract_price * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-300">
                      <p className="text-sm font-medium text-gray-700">Actual PPW Sold</p>
                      <p className="text-lg font-bold text-gray-900">
                        ${(customer.contract_price / (customer.system_size_kw * 1000)).toFixed(4)}/W
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentsSection customerId={customer.id} />
        )}

        {activeTab === 'timeline' && (
          <ProjectTimeline customerId={customer.id} />
        )}

        {activeTab === 'chat' && (
          <ProjectChat customerId={customer.id} />
        )}
      </div>

      {showSiteSurveyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Schedule Site Survey</h3>

            {schedulingLoading && !siteSurveyForm.tech_id ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Technician
                  </label>
                  <select
                    value={siteSurveyForm.tech_id}
                    onChange={(e) => setSiteSurveyForm(prev => ({ ...prev, tech_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select technician</option>
                    {availableTechs.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.full_name} ({tech.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={siteSurveyForm.scheduled_date}
                    onChange={(e) => setSiteSurveyForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Time Window
                  </label>
                  <select
                    value={siteSurveyForm.time_window}
                    onChange={(e) => setSiteSurveyForm(prev => ({ ...prev, time_window: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select time window</option>
                    <option value="8:00 AM - 12:00 PM">8:00 AM - 12:00 PM</option>
                    <option value="12:00 PM - 4:00 PM">12:00 PM - 4:00 PM</option>
                    <option value="4:00 PM - 8:00 PM">4:00 PM - 8:00 PM</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowSiteSurveyModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSiteSurvey}
                    disabled={schedulingLoading}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {schedulingLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Schedule'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
