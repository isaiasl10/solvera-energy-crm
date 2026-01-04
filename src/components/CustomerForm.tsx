import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type FormData = {
  full_name: string;
  address: string;
  phone: string;
  email: string;
  signature_date: string;
  system_size_kw: string;
  panel_quantity: string;
  panel_brand: string;
  panel_wattage: string;
  inverter_option: string;
  racking_type: string;
  contract_price: string;
  roof_type: string;
  utility_company: string;
  utility_app_id: string;
  hoa_name: string;
  hoa_email: string;
  hoa_phone: string;
};

const initialFormData: FormData = {
  full_name: '',
  address: '',
  phone: '',
  email: '',
  signature_date: '',
  system_size_kw: '',
  panel_quantity: '',
  panel_brand: '',
  panel_wattage: '',
  inverter_option: '',
  racking_type: '',
  contract_price: '',
  roof_type: '',
  utility_company: '',
  utility_app_id: '',
  hoa_name: '',
  hoa_email: '',
  hoa_phone: '',
};

type CustomerFormProps = {
  onSuccess: () => void;
};

export default function CustomerForm({ onSuccess }: CustomerFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user?.email) return;

    try {
      const { data } = await supabase
        .from('app_users')
        .select('id, role')
        .eq('email', user.email)
        .maybeSingle();

      if (data) {
        setUserRole(data.role);
        setUserId(data.id);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const customerData: any = {
        full_name: formData.full_name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        signature_date: formData.signature_date || null,
        system_size_kw: parseFloat(formData.system_size_kw),
        panel_quantity: parseInt(formData.panel_quantity),
        panel_brand: formData.panel_brand,
        panel_wattage: parseInt(formData.panel_wattage),
        inverter_option: formData.inverter_option,
        racking_type: formData.racking_type,
        contract_price: formData.contract_price ? parseFloat(formData.contract_price) : null,
        roof_type: formData.roof_type || null,
        utility_company: formData.utility_company || null,
        utility_app_id: formData.utility_app_id || null,
        hoa_name: formData.hoa_name || null,
        hoa_email: formData.hoa_email || null,
        hoa_phone: formData.hoa_phone || null,
      };

      if (userRole === 'sales_rep' && userId) {
        customerData.sales_rep_id = userId;
      }

      const { error: insertError } = await supabase
        .from('customers')
        .insert([customerData]);

      if (insertError) throw insertError;

      setFormData(initialFormData);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="full_name" className="block text-xs font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            required
            value={formData.full_name}
            onChange={handleChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-xs font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <label htmlFor="signature_date" className="block text-xs font-medium text-gray-700 mb-1">
            Signature Date
          </label>
          <input
            type="date"
            id="signature_date"
            name="signature_date"
            value={formData.signature_date}
            onChange={handleChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="address" className="block text-xs font-medium text-gray-700 mb-1">
            Installation Address *
          </label>
          <input
            type="text"
            id="address"
            name="address"
            required
            value={formData.address}
            onChange={handleChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="123 Main St, City, State 12345"
          />
        </div>

        <div>
          <label htmlFor="system_size_kw" className="block text-xs font-medium text-gray-700 mb-1">
            System Size (kW) *
          </label>
          <input
            type="number"
            step="0.01"
            id="system_size_kw"
            name="system_size_kw"
            required
            value={formData.system_size_kw}
            onChange={handleChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="10.5"
          />
        </div>

        <div>
          <label htmlFor="panel_quantity" className="block text-xs font-medium text-gray-700 mb-1">
            Panel Quantity *
          </label>
          <input
            type="number"
            id="panel_quantity"
            name="panel_quantity"
            required
            value={formData.panel_quantity}
            onChange={handleChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="24"
          />
        </div>

        <div>
          <label htmlFor="panel_brand" className="block text-xs font-medium text-gray-700 mb-1">
            Panel Brand *
          </label>
          <select
            id="panel_brand"
            name="panel_brand"
            required
            value={formData.panel_brand}
            onChange={handleChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Brand</option>
            <option value="SunPower">SunPower</option>
            <option value="LG">LG</option>
            <option value="Canadian Solar">Canadian Solar</option>
            <option value="Panasonic">Panasonic</option>
            <option value="REC">REC</option>
            <option value="Q CELLS">Q CELLS</option>
            <option value="Jinko Solar">Jinko Solar</option>
            <option value="Trina Solar">Trina Solar</option>
            <option value="LONGi">LONGi</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="panel_wattage" className="block text-xs font-medium text-gray-700 mb-1">
            Panel Wattage (W) *
          </label>
          <input
            type="number"
            id="panel_wattage"
            name="panel_wattage"
            required
            value={formData.panel_wattage}
            onChange={handleChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="400"
          />
        </div>

        <div>
          <label htmlFor="inverter_option" className="block text-xs font-medium text-gray-700 mb-1">
            Inverter Option *
          </label>
          <select
            id="inverter_option"
            name="inverter_option"
            required
            value={formData.inverter_option}
            onChange={handleChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Inverter</option>
            <option value="Enphase IQ8+">Enphase IQ8+</option>
            <option value="Enphase IQ8M">Enphase IQ8M</option>
            <option value="SolarEdge HD-Wave">SolarEdge HD-Wave</option>
            <option value="SolarEdge Optimizers">SolarEdge Optimizers</option>
            <option value="Tesla Inverter">Tesla Inverter</option>
            <option value="SMA Sunny Boy">SMA Sunny Boy</option>
            <option value="Fronius Primo">Fronius Primo</option>
            <option value="Generac PWRcell">Generac PWRcell</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="racking_type" className="block text-xs font-medium text-gray-700 mb-1">
            Racking Type *
          </label>
          <select
            id="racking_type"
            name="racking_type"
            required
            value={formData.racking_type}
            onChange={handleChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Racking</option>
            <option value="IronRidge XR Rail">IronRidge XR Rail</option>
            <option value="IronRidge Flush Mount">IronRidge Flush Mount</option>
            <option value="Unirac SolarMount">Unirac SolarMount</option>
            <option value="Snapnrack">Snapnrack</option>
            <option value="Quick Mount PV">Quick Mount PV</option>
            <option value="Ecofasten Rock-It">Ecofasten Rock-It</option>
            <option value="Ground Mount">Ground Mount</option>
            <option value="Ballasted Roof Mount">Ballasted Roof Mount</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="contract_price" className="block text-xs font-medium text-gray-700 mb-1">
            Contract Price ($) *
          </label>
          <input
            type="number"
            step="0.01"
            id="contract_price"
            name="contract_price"
            required
            value={formData.contract_price}
            onChange={handleChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="25000.00"
          />
        </div>

        <div>
          <label htmlFor="roof_type" className="block text-xs font-medium text-gray-700 mb-1">
            Roof Type *
          </label>
          <select
            id="roof_type"
            name="roof_type"
            required
            value={formData.roof_type}
            onChange={handleChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Roof Type</option>
            <option value="Asphalt Shingle">Asphalt Shingle</option>
            <option value="Tile">Tile</option>
            <option value="Metal">Metal</option>
            <option value="Flat">Flat</option>
            <option value="Tar and Gravel">Tar and Gravel</option>
            <option value="Wood Shake">Wood Shake</option>
            <option value="Composite">Composite</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3 mt-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Utility Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="utility_company" className="block text-xs font-medium text-gray-700 mb-1">
              Utility Company
            </label>
            <input
              type="text"
              id="utility_company"
              name="utility_company"
              value={formData.utility_company}
              onChange={handleChange}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., PG&E, SDG&E"
            />
          </div>

          <div>
            <label htmlFor="utility_app_id" className="block text-xs font-medium text-gray-700 mb-1">
              Utility App ID
            </label>
            <input
              type="text"
              id="utility_app_id"
              name="utility_app_id"
              value={formData.utility_app_id}
              onChange={handleChange}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="If applicable"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3 mt-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">HOA Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="hoa_name" className="block text-xs font-medium text-gray-700 mb-1">
              HOA Name
            </label>
            <input
              type="text"
              id="hoa_name"
              name="hoa_name"
              value={formData.hoa_name}
              onChange={handleChange}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Homeowners Association"
            />
          </div>

          <div>
            <label htmlFor="hoa_email" className="block text-xs font-medium text-gray-700 mb-1">
              HOA Email
            </label>
            <input
              type="email"
              id="hoa_email"
              name="hoa_email"
              value={formData.hoa_email}
              onChange={handleChange}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="hoa@example.com"
            />
          </div>

          <div>
            <label htmlFor="hoa_phone" className="block text-xs font-medium text-gray-700 mb-1">
              HOA Phone Number
            </label>
            <input
              type="tel"
              id="hoa_phone"
              name="hoa_phone"
              value={formData.hoa_phone}
              onChange={handleChange}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Customer
            </>
          )}
        </button>
      </div>
    </form>
  );
}
