import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Loader2, DollarSign, CreditCard, MapPin, Zap, Battery } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type PaymentMethod = 'check' | 'direct_deposit';

type PaymentData = {
  payment_method: PaymentMethod | null;
  check_address: string;
  bank_name: string;
  account_name: string;
  routing_number: string;
  account_number: string;
  account_number_confirm: string;
};

type UserData = {
  id: string;
  role: string;
  hourly_rate: number;
  is_salary: boolean;
  battery_pay_rates: Record<string, number>;
  per_watt_rate: number;
  role_category: string;
};

type SalesCommission = {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_number?: string;
  total_commission: number;
  m1_payment_amount: number;
  m1_payment_status: 'pending' | 'eligible' | 'paid';
  m1_eligibility_date: string | null;
  m1_paid_date: string | null;
  m1_payroll_period_end: string | null;
  m2_payment_amount: number;
  m2_payment_status: 'pending' | 'eligible' | 'paid';
  m2_paid_date: string | null;
  m2_payroll_period_end: string | null;
  sales_manager_override_amount: number | null;
  manager_override_payment_status: 'pending' | 'eligible' | 'paid';
  manager_override_paid_date: string | null;
  manager_override_payroll_period_end: string | null;
};

export default function PaymentPreferences() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<PaymentData>({
    payment_method: null,
    check_address: '',
    bank_name: '',
    account_name: '',
    routing_number: '',
    account_number: '',
    account_number_confirm: '',
  });
  const [userData, setUserData] = useState<UserData | null>(null);
  const [totalHours, setTotalHours] = useState(0);
  const [batteryPay, setBatteryPay] = useState(0);
  const [perWattPay, setPerWattPay] = useState(0);
  const [commissions, setCommissions] = useState<SalesCommission[]>([]);
  const [totalCommissionPay, setTotalCommissionPay] = useState(0);

  useEffect(() => {
    if (!authLoading && user) {
      loadPaymentPreferences();
      loadPayCalculations();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user]);

  const loadPaymentPreferences = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, payment_method, check_address, bank_name, account_name, routing_number')
        .eq('email', user.email)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData(prev => ({
          ...prev,
          payment_method: data.payment_method,
          check_address: data.check_address || '',
          bank_name: data.bank_name || '',
          account_name: data.account_name || '',
          routing_number: data.routing_number || '',
        }));
      }
    } catch (err) {
      console.error('Error loading payment preferences:', err);
      setError('Failed to load payment preferences');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPayPeriodStart = (): Date => {
    const referenceDate = new Date('2024-12-14');
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
    const periodsSince = Math.floor(daysDiff / 14);
    const periodStart = new Date(referenceDate);
    periodStart.setDate(periodStart.getDate() + (periodsSince * 14));
    return periodStart;
  };

  const getCurrentPayPeriodEnd = (): Date => {
    const start = getCurrentPayPeriodStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    return end;
  };

  const loadPayCalculations = async () => {
    if (!user?.email) {
      return;
    }

    try {
      const { data: userDataResult, error: userError } = await supabase
        .from('app_users')
        .select('id, role, hourly_rate, is_salary, battery_pay_rates, per_watt_rate, full_name, role_category')
        .eq('email', user.email)
        .maybeSingle();

      if (userError) throw userError;
      if (!userDataResult) return;

      setUserData(userDataResult as UserData);

      const periodStart = getCurrentPayPeriodStart();
      const periodEnd = getCurrentPayPeriodEnd();
      periodEnd.setHours(23, 59, 59, 999);

      const startDate = periodStart.toISOString();
      const endDate = periodEnd.toISOString();

      const { data: timeEntries, error: timeError } = await supabase
        .from('time_clock')
        .select('total_hours')
        .eq('user_id', userDataResult.id)
        .gte('clock_in_time', startDate)
        .lte('clock_in_time', endDate)
        .not('clock_out_time', 'is', null);

      if (timeError) throw timeError;

      const hours = timeEntries?.reduce((sum, entry) => sum + (entry.total_hours || 0), 0) || 0;
      setTotalHours(hours);

      const { data: completedInstallations, error: installError } = await supabase
        .from('scheduling')
        .select(`
          id,
          customers!inner (
            system_size_kw,
            battery_quantity,
            is_active
          )
        `)
        .eq('ticket_type', 'installation')
        .eq('customers.is_active', true)
        .eq('pv_installer_id', userDataResult.id)
        .not('closed_at', 'is', null)
        .gte('closed_at', startDate)
        .lte('closed_at', endDate);

      if (installError) throw installError;

      if (completedInstallations && completedInstallations.length > 0) {
        let totalBatteryPay = 0;
        let totalPerWattPay = 0;

        completedInstallations.forEach((installation: any) => {
          const customer = installation.customers;
          if (!customer) return;

          const systemSizeKw = customer.system_size_kw || 0;
          const batteryQty = customer.battery_quantity || 0;
          const watts = systemSizeKw;

          if (batteryQty > 0 && userDataResult.battery_pay_rates) {
            const rates = userDataResult.battery_pay_rates;
            const batteryRate = rates[batteryQty.toString()] || rates['4+'] || 0;
            totalBatteryPay += batteryRate;
          } else if (watts > 0 && userDataResult.per_watt_rate) {
            totalPerWattPay += watts * userDataResult.per_watt_rate;
          }
        });

        setBatteryPay(totalBatteryPay);
        setPerWattPay(totalPerWattPay);
      }

      if (userDataResult.role === 'sales_rep' || userDataResult.role === 'sales_manager') {
        const endDateStr = endDate.split('T')[0];

        const { data: commissionsData, error: commissionsError } = await supabase
          .from('sales_commissions')
          .select(`
            *,
            customers!inner (
              customer_id,
              full_name,
              is_active
            )
          `)
          .eq('customers.is_active', true)
          .or(
            userDataResult.role === 'sales_rep'
              ? `and(sales_rep_id.eq.${userDataResult.id},or(m1_payroll_period_end.eq.${endDateStr},m2_payroll_period_end.eq.${endDateStr}))`
              : `and(sales_manager_id.eq.${userDataResult.id},manager_override_payroll_period_end.eq.${endDateStr})`
          );

        if (commissionsError) throw commissionsError;

        const parsedCommissions = (commissionsData || []).map((comm: any) => ({
          ...comm,
          customer_name: comm.customers?.full_name || 'Unknown Customer',
          customer_number: comm.customers?.customer_id || '',
          total_commission: parseFloat(comm.total_commission) || 0,
          m1_payment_amount: parseFloat(comm.m1_payment_amount) || 0,
          m2_payment_amount: parseFloat(comm.m2_payment_amount) || 0,
          sales_manager_override_amount: comm.sales_manager_override_amount ? parseFloat(comm.sales_manager_override_amount) : null,
          m1_eligibility_date: comm.m1_eligibility_date || null,
          m1_payroll_period_end: comm.m1_payroll_period_end || null,
          m2_payroll_period_end: comm.m2_payroll_period_end || null,
          manager_override_payroll_period_end: comm.manager_override_payroll_period_end || null,
        }));

        setCommissions(parsedCommissions);

        let totalCommission = 0;
        parsedCommissions.forEach((comm: SalesCommission) => {
          if (userDataResult.role === 'sales_rep') {
            if (comm.m1_payment_status === 'paid' && comm.m1_payroll_period_end === endDateStr) {
              totalCommission += comm.m1_payment_amount;
            }
            if (comm.m2_payment_status === 'paid' && comm.m2_payroll_period_end === endDateStr) {
              totalCommission += comm.m2_payment_amount;
            }
          } else if (userDataResult.role === 'sales_manager' && comm.sales_manager_override_amount) {
            if (comm.manager_override_payment_status === 'paid' && comm.manager_override_payroll_period_end === endDateStr) {
              totalCommission += comm.sales_manager_override_amount;
            }
          }
        });

        setTotalCommissionPay(totalCommission);
      }
    } catch (err) {
      console.error('Error loading pay calculations:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (!user?.email) {
      setError('User not found. Please refresh the page.');
      return;
    }

    if (!formData.payment_method) {
      setError('Please select a payment method');
      return;
    }

    if (formData.payment_method === 'check' && !formData.check_address.trim()) {
      setError('Please enter a mailing address for check payments');
      return;
    }

    if (formData.payment_method === 'direct_deposit') {
      if (!formData.bank_name.trim() || !formData.account_name.trim() || !formData.routing_number.trim()) {
        setError('Please fill in all bank information fields');
        return;
      }

      if (!formData.account_number.trim() || !formData.account_number_confirm.trim()) {
        setError('Please enter your account number twice');
        return;
      }

      if (formData.account_number !== formData.account_number_confirm) {
        setError('Account numbers do not match');
        return;
      }

      if (formData.routing_number.length !== 9) {
        setError('Routing number must be 9 digits');
        return;
      }
    }

    setSaving(true);

    try {
      const updateData: any = {
        payment_method: formData.payment_method,
      };

      if (formData.payment_method === 'check') {
        updateData.check_address = formData.check_address;
        updateData.bank_name = null;
        updateData.account_name = null;
        updateData.routing_number = null;
        updateData.account_number_encrypted = null;
      } else {
        updateData.check_address = null;
        updateData.bank_name = formData.bank_name;
        updateData.account_name = formData.account_name;
        updateData.routing_number = formData.routing_number;
        updateData.account_number_encrypted = formData.account_number;
      }

      const { error: updateError } = await supabase
        .from('app_users')
        .update(updateData)
        .eq('email', user.email);

      if (updateError) throw updateError;

      setSuccess(true);
      setFormData(prev => ({
        ...prev,
        account_number: '',
        account_number_confirm: '',
      }));

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving payment preferences:', err);
      setError('Failed to save payment preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-gray-600">Unable to load user data. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  const isSalesRole = userData?.role === 'sales_rep' || userData?.role === 'sales_manager';
  const totalHourlyPay = userData && !userData.is_salary && !isSalesRole ? totalHours * userData.hourly_rate : 0;
  const estimatedCheck = totalHourlyPay + batteryPay + perWattPay + totalCommissionPay;

  return (
    <div className="space-y-6">
      {userData && isSalesRole && (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border-2 border-blue-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
            <DollarSign className="w-6 h-6 text-blue-600" />
            Current Pay Period Earnings - {userData.role === 'sales_rep' ? 'Sales Commissions' : 'Manager Overrides'}
          </h2>

          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-sm font-medium text-gray-600 mb-1">
                {userData.role === 'sales_rep' ? 'Total Commissions' : 'Total Override Payments'}
              </p>
              <p className="text-2xl font-bold text-blue-600">
                ${totalCommissionPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {commissions.length} payment{commissions.length !== 1 ? 's' : ''} in this period
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 text-white mb-6">
            <p className="text-sm font-medium mb-1">Total Pay Period Earnings</p>
            <p className="text-3xl font-bold">
              ${estimatedCheck.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs opacity-90 mt-1">
              Commission payments for current pay period
            </p>
          </div>

          {commissions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Commission Payment Details</h3>
              {commissions.map((comm) => (
                <div key={comm.id} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                  <div className="border-b border-gray-200 pb-3">
                    <p className="text-base font-bold text-gray-900 mb-1">
                      {comm.customer_name}
                    </p>
                    {comm.customer_number && (
                      <p className="text-xs text-gray-500 mb-2">{comm.customer_number}</p>
                    )}
                    <p className="text-sm font-semibold text-blue-600">
                      Total Commission: ${comm.total_commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900">M1 Payment</p>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          comm.m1_payment_status === 'paid' ? 'bg-green-600 text-white' :
                          comm.m1_payment_status === 'eligible' ? 'bg-yellow-500 text-white' :
                          'bg-gray-400 text-white'
                        }`}>
                          {comm.m1_payment_status.charAt(0).toUpperCase() + comm.m1_payment_status.slice(1)}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 mb-2">
                        ${comm.m1_payment_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="space-y-1 text-xs text-gray-600">
                        {comm.m1_eligibility_date && (
                          <p>
                            <span className="font-medium">Approved:</span> {new Date(comm.m1_eligibility_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                        {comm.m1_payroll_period_end && comm.m1_payment_status !== 'pending' && (
                          <p>
                            <span className="font-medium">{comm.m1_payment_status === 'paid' ? 'Paid on:' : 'Pay date:'}</span> {new Date(comm.m1_payroll_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                        {comm.m1_payment_status === 'pending' && (
                          <p className="text-gray-500 italic">Waiting for site survey completion</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900">M2 Payment</p>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          comm.m2_payment_status === 'paid' ? 'bg-green-600 text-white' :
                          comm.m2_payment_status === 'eligible' ? 'bg-yellow-500 text-white' :
                          'bg-gray-400 text-white'
                        }`}>
                          {comm.m2_payment_status.charAt(0).toUpperCase() + comm.m2_payment_status.slice(1)}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 mb-2">
                        ${comm.m2_payment_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="space-y-1 text-xs text-gray-600">
                        {comm.m2_payment_status === 'eligible' && (
                          <p>
                            <span className="font-medium">Approved:</span> Installation completed
                          </p>
                        )}
                        {comm.m2_payroll_period_end && comm.m2_payment_status !== 'pending' && (
                          <p>
                            <span className="font-medium">{comm.m2_payment_status === 'paid' ? 'Paid on:' : 'Pay date:'}</span> {new Date(comm.m2_payroll_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                        {comm.m2_payment_status === 'pending' && (
                          <p className="text-gray-500 italic">Waiting for installation completion</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {userData && !isSalesRole && !userData.is_salary && (
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border-2 border-orange-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
            <DollarSign className="w-6 h-6 text-orange-600" />
            Current Pay Period Earnings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <p className="text-sm font-medium text-gray-600 mb-1">Hourly Pay</p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalHourlyPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totalHours.toFixed(2)} hrs @ ${userData.hourly_rate.toFixed(2)}/hr
              </p>
            </div>

            {(userData.role === 'battery_tech' ||
              userData.role === 'journeyman_electrician' ||
              userData.role === 'master_electrician' ||
              userData.role === 'apprentice_electrician' ||
              userData.role === 'residential_wireman' ||
              userData.role === 'service_tech') && (
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Battery className="w-4 h-4" />
                  Battery Pay
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ${batteryPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Based on completed installations
                </p>
              </div>
            )}

            {userData.per_watt_rate > 0 && (
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  Per-Watt Pay
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  ${perWattPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  @ ${userData.per_watt_rate}/watt
                </p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg p-4 text-white">
            <p className="text-sm font-medium mb-1">Total Pay Period Earnings</p>
            <p className="text-3xl font-bold">
              ${estimatedCheck.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs opacity-90 mt-1">
              Includes all pay components for current pay period
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-orange-600" />
            Payment Preferences
          </h2>
          <p className="text-sm text-gray-600 mt-1">Set up how you would like to receive payment</p>
        </div>

        {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">
          Payment preferences saved successfully
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method *
          </label>
          <select
            name="payment_method"
            value={formData.payment_method || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Select payment method</option>
            <option value="check">Check</option>
            <option value="direct_deposit">Direct Deposit</option>
          </select>
        </div>

        {formData.payment_method === 'check' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900">Mailing Address</h3>
                <p className="text-xs text-blue-700 mt-1">Enter the address where you want your checks mailed</p>
              </div>
            </div>

            <textarea
              name="check_address"
              value={formData.check_address}
              onChange={handleChange}
              rows={3}
              placeholder="123 Main St, City, State ZIP"
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {formData.payment_method === 'direct_deposit' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-green-900">Bank Information</h3>
                <p className="text-xs text-green-700 mt-1">Your account information is encrypted and secure</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name *
                </label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  placeholder="e.g., Chase, Bank of America"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  name="account_name"
                  value={formData.account_name}
                  onChange={handleChange}
                  placeholder="Full name on account"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Routing Number *
                </label>
                <input
                  type="text"
                  name="routing_number"
                  value={formData.routing_number}
                  onChange={handleChange}
                  placeholder="9-digit routing number"
                  maxLength={9}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="password"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleChange}
                  placeholder="Enter account number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Account Number *
                </label>
                <input
                  type="password"
                  name="account_number_confirm"
                  value={formData.account_number_confirm}
                  onChange={handleChange}
                  placeholder="Re-enter account number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !formData.payment_method}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Payment Preferences
            </>
          )}
        </button>
        </div>
      </div>
    </div>
  );
}
