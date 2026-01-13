import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, TrendingUp, Users, Loader2, AlertCircle, Calendar } from 'lucide-react';

type SalesRep = {
  id: string;
  full_name: string;
  email: string;
  ppw_redline: number;
  photo_url: string | null;
  custom_id: string | null;
};

type Customer = {
  id: string;
  customer_name: string;
  system_size_kw: number;
  sales_rep_id: string;
  sales_rep_name: string;
  epc_gross_total: number;
  created_at: string;
};

type RepOverride = {
  rep: SalesRep;
  override_per_watt: number;
  total_customers: number;
  total_system_size: number;
  total_override_amount: number;
};

type PayrollPeriod = {
  start_date: Date;
  end_date: Date;
  total_m1_overrides: number;
  total_m2_overrides: number;
  total_m1_own_sales: number;
  total_m2_own_sales: number;
  total_earnings: number;
  override_details: Array<{
    customer_name: string;
    sales_rep_name: string;
    m1_override: number;
    m2_override: number;
    m1_paid: boolean;
    m2_paid: boolean;
  }>;
  own_sales_details: Array<{
    customer_name: string;
    m1_commission: number;
    m2_commission: number;
    m1_paid: boolean;
    m2_paid: boolean;
  }>;
};

type CommissionDetail = {
  customer_id: string;
  customer_name: string;
  sales_rep_id: string;
  sales_rep_name: string;
  system_size_kw: number;
  override_per_watt: number;
  total_override_amount: number;
  sales_rep_ppw: number;
  manager_ppw: number;
  m1_override: number;
  m2_override: number;
  m1_status: string;
  m2_status: string;
  m1_paid_date: string | null;
  m2_paid_date: string | null;
  signature_date: string;
};

export default function SalesManagerDashboard() {
  const [managerInfo, setManagerInfo] = useState<{ ppw_redline: number; full_name: string; id: string } | null>(null);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [repOverrides, setRepOverrides] = useState<RepOverride[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [commissionDetails, setCommissionDetails] = useState<CommissionDetail[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'commissions' | 'payroll'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getPayrollPeriods = () => {
    const periods: Array<{ start_date: Date; end_date: Date }> = [];
    const today = new Date();

    for (let i = 0; i < 6; i++) {
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() - (i * 14));
      endDate.setHours(23, 59, 59, 999);

      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 13);
      startDate.setHours(0, 0, 0, 0);

      periods.push({ start_date: startDate, end_date: endDate });
    }

    return periods;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      const { data: manager, error: managerError } = await supabase
        .from('app_users')
        .select('id, ppw_redline, full_name')
        .eq('email', user.email)
        .maybeSingle();

      if (managerError) throw managerError;
      if (!manager || !manager.ppw_redline) {
        setError('Manager PPW redline not configured. Please contact your administrator.');
        return;
      }

      setManagerInfo(manager);

      await Promise.all([
        fetchTeamOverrides(user.email, manager),
        fetchPayrollData(manager.id),
        fetchCommissionDetails(manager.id, manager.ppw_redline)
      ]);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamOverrides = async (email: string, manager: { id: string; ppw_redline: number; full_name: string }) => {
    const { data: reps, error: repsError } = await supabase
      .from('app_users')
      .select('id, full_name, email, ppw_redline, photo_url, custom_id')
      .eq('role', 'sales_rep')
      .eq('reporting_manager_id', manager.id)
      .eq('status', 'active')
      .order('full_name', { ascending: true });

    if (repsError) throw repsError;

    const validReps = (reps || []).filter(rep => rep.ppw_redline && rep.ppw_redline > 0);
    setSalesReps(validReps);

    const overridePromises = validReps.map(async (rep) => {
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, full_name, system_size_kw, contract_price, created_at')
        .eq('sales_rep_id', rep.id);

      if (customersError) throw customersError;

      const totalSystemSize = (customers || []).reduce((sum, c) => sum + (Number(c.system_size_kw) || 0), 0);
      const overridePerWatt = (rep.ppw_redline || 0) - (manager.ppw_redline || 0);
      const totalOverrideAmount = totalSystemSize * 1000 * overridePerWatt;

      return {
        rep,
        override_per_watt: overridePerWatt,
        total_customers: customers?.length || 0,
        total_system_size: totalSystemSize,
        total_override_amount: totalOverrideAmount,
      };
    });

    const overrides = await Promise.all(overridePromises);
    setRepOverrides(overrides);
  };

  const fetchPayrollData = async (managerId: string) => {
    const periods = getPayrollPeriods();
    const periodData: PayrollPeriod[] = [];

    for (const period of periods) {
      const periodEndStr = period.end_date.toISOString().split('T')[0];

      const { data: commissions, error: commissionsError } = await supabase
        .from('sales_commissions')
        .select(`
          id,
          sales_rep_id,
          sales_manager_id,
          sales_manager_override_amount,
          total_commission,
          m1_payment_amount,
          m1_payment_status,
          m1_paid_date,
          m1_payroll_period_end,
          m2_payment_amount,
          m2_payment_status,
          m2_paid_date,
          m2_payroll_period_end,
          customer_id
        `)
        .or(`sales_manager_id.eq.${managerId},sales_rep_id.eq.${managerId}`)
        .or(`m1_payroll_period_end.eq.${periodEndStr},m2_payroll_period_end.eq.${periodEndStr}`);

      if (commissionsError) throw commissionsError;

      let totalM1Overrides = 0;
      let totalM2Overrides = 0;
      let totalM1OwnSales = 0;
      let totalM2OwnSales = 0;
      const overrideDetails: Array<{ customer_name: string; sales_rep_name: string; m1_override: number; m2_override: number; m1_paid: boolean; m2_paid: boolean }> = [];
      const ownSalesDetails: Array<{ customer_name: string; m1_commission: number; m2_commission: number; m1_paid: boolean; m2_paid: boolean }> = [];

      if (commissions && commissions.length > 0) {
        const customerIds = [...new Set(commissions.map(c => c.customer_id))];
        const repIds = [...new Set(commissions.map(c => c.sales_rep_id).filter(id => id !== managerId))];

        const { data: customers } = await supabase
          .from('customers')
          .select('id, full_name')
          .in('id', customerIds);

        const { data: reps } = await supabase
          .from('app_users')
          .select('id, full_name')
          .in('id', repIds);

        const customerMap = new Map(customers?.map(c => [c.id, c.full_name]) || []);
        const repMap = new Map(reps?.map(r => [r.id, r.full_name]) || []);

        for (const commission of commissions) {
          const customerName = customerMap.get(commission.customer_id) || 'Unknown';
          const isOwnSale = commission.sales_rep_id === managerId;
          const isManagerOverride = commission.sales_manager_id === managerId && !isOwnSale;

          const m1PaidInPeriod = commission.m1_payroll_period_end === periodEndStr && commission.m1_payment_status === 'paid';
          const m2PaidInPeriod = commission.m2_payroll_period_end === periodEndStr && commission.m2_payment_status === 'paid';

          if (isOwnSale) {
            if (m1PaidInPeriod) {
              totalM1OwnSales += commission.m1_payment_amount;
            }
            if (m2PaidInPeriod) {
              totalM2OwnSales += commission.m2_payment_amount;
            }

            if (m1PaidInPeriod || m2PaidInPeriod) {
              ownSalesDetails.push({
                customer_name: customerName,
                m1_commission: commission.m1_payment_amount,
                m2_commission: commission.m2_payment_amount,
                m1_paid: m1PaidInPeriod,
                m2_paid: m2PaidInPeriod
              });
            }
          } else if (isManagerOverride && commission.sales_manager_override_amount) {
            const overrideAmount = commission.sales_manager_override_amount;
            const m1Override = (commission.m1_payment_amount / commission.total_commission) * overrideAmount;
            const m2Override = (commission.m2_payment_amount / commission.total_commission) * overrideAmount;

            if (m1PaidInPeriod) {
              totalM1Overrides += m1Override;
            }
            if (m2PaidInPeriod) {
              totalM2Overrides += m2Override;
            }

            if (m1PaidInPeriod || m2PaidInPeriod) {
              overrideDetails.push({
                customer_name: customerName,
                sales_rep_name: repMap.get(commission.sales_rep_id) || 'Unknown Rep',
                m1_override: m1Override,
                m2_override: m2Override,
                m1_paid: m1PaidInPeriod,
                m2_paid: m2PaidInPeriod
              });
            }
          }
        }
      }

      periodData.push({
        start_date: period.start_date,
        end_date: period.end_date,
        total_m1_overrides: totalM1Overrides,
        total_m2_overrides: totalM2Overrides,
        total_m1_own_sales: totalM1OwnSales,
        total_m2_own_sales: totalM2OwnSales,
        total_earnings: totalM1Overrides + totalM2Overrides + totalM1OwnSales + totalM2OwnSales,
        override_details: overrideDetails,
        own_sales_details: ownSalesDetails
      });
    }

    setPayrollPeriods(periodData);
  };

  const fetchCommissionDetails = async (managerId: string, managerPpw: number) => {
    const { data: commissions, error: commissionsError } = await supabase
      .from('sales_commissions')
      .select(`
        id,
        customer_id,
        sales_rep_id,
        sales_manager_override_amount,
        total_commission,
        m1_payment_amount,
        m1_payment_status,
        m1_paid_date,
        m2_payment_amount,
        m2_payment_status,
        m2_paid_date,
        signature_date
      `)
      .eq('sales_manager_id', managerId)
      .order('signature_date', { ascending: false });

    if (commissionsError) throw commissionsError;

    if (!commissions || commissions.length === 0) {
      setCommissionDetails([]);
      return;
    }

    const customerIds = [...new Set(commissions.map(c => c.customer_id))];
    const repIds = [...new Set(commissions.map(c => c.sales_rep_id))];

    const { data: customers } = await supabase
      .from('customers')
      .select('id, full_name, system_size_kw')
      .in('id', customerIds);

    const { data: reps } = await supabase
      .from('app_users')
      .select('id, full_name, ppw_redline')
      .in('id', repIds);

    const customerMap = new Map(customers?.map(c => [c.id, {
      name: c.full_name,
      system_size_kw: Number(c.system_size_kw) || 0
    }]) || []);

    const repMap = new Map(reps?.map(r => [r.id, {
      name: r.full_name,
      ppw: r.ppw_redline || 0
    }]) || []);

    const details: CommissionDetail[] = commissions.map(commission => {
      const customer = customerMap.get(commission.customer_id);
      const rep = repMap.get(commission.sales_rep_id);

      const systemSizeKw = customer?.system_size_kw || 0;
      const repPpw = rep?.ppw || 0;
      const overridePerWatt = repPpw - managerPpw;
      const totalOverride = commission.sales_manager_override_amount || 0;

      const m1Override = totalOverride > 0 && commission.total_commission > 0
        ? (commission.m1_payment_amount / commission.total_commission) * totalOverride
        : 0;
      const m2Override = totalOverride > 0 && commission.total_commission > 0
        ? (commission.m2_payment_amount / commission.total_commission) * totalOverride
        : 0;

      return {
        customer_id: commission.customer_id,
        customer_name: customer?.name || 'Unknown',
        sales_rep_id: commission.sales_rep_id,
        sales_rep_name: rep?.name || 'Unknown',
        system_size_kw: systemSizeKw,
        override_per_watt: overridePerWatt,
        total_override_amount: totalOverride,
        sales_rep_ppw: repPpw,
        manager_ppw: managerPpw,
        m1_override: m1Override,
        m2_override: m2Override,
        m1_status: commission.m1_payment_status,
        m2_status: commission.m2_payment_status,
        m1_paid_date: commission.m1_paid_date,
        m2_paid_date: commission.m2_paid_date,
        signature_date: commission.signature_date
      };
    });

    setCommissionDetails(details);
  };

  const totalOverrides = repOverrides.reduce((sum, ro) => sum + ro.total_override_amount, 0);
  const totalCustomers = repOverrides.reduce((sum, ro) => sum + ro.total_customers, 0);
  const totalSystemSize = repOverrides.reduce((sum, ro) => sum + ro.total_system_size, 0);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-red-900">Error</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (selectedPeriod) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setSelectedPeriod(null)}
              className="text-sm text-blue-600 hover:text-blue-700 mb-2"
            >
              ← Back to all periods
            </button>
            <h3 className="text-lg font-semibold text-gray-900">
              Pay Period: {formatDate(selectedPeriod.start_date)} - {formatDate(selectedPeriod.end_date)}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(selectedPeriod.total_earnings)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs text-green-700 mb-1">M1 Overrides</p>
            <p className="text-xl font-bold text-green-900">
              {formatCurrency(selectedPeriod.total_m1_overrides)}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-700 mb-1">M2 Overrides</p>
            <p className="text-xl font-bold text-blue-900">
              {formatCurrency(selectedPeriod.total_m2_overrides)}
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-xs text-orange-700 mb-1">M1 Own Sales</p>
            <p className="text-xl font-bold text-orange-900">
              {formatCurrency(selectedPeriod.total_m1_own_sales)}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-xs text-purple-700 mb-1">M2 Own Sales</p>
            <p className="text-xl font-bold text-purple-900">
              {formatCurrency(selectedPeriod.total_m2_own_sales)}
            </p>
          </div>
        </div>

        {selectedPeriod.override_details.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Override Commissions</h4>
            <div className="space-y-2">
              {selectedPeriod.override_details.map((detail, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                  <div>
                    <p className="font-medium text-gray-900">{detail.customer_name}</p>
                    <p className="text-xs text-gray-600">Rep: {detail.sales_rep_name}</p>
                  </div>
                  <div className="text-right">
                    {detail.m1_paid && (
                      <p className="text-xs text-green-700">M1: {formatCurrency(detail.m1_override)}</p>
                    )}
                    {detail.m2_paid && (
                      <p className="text-xs text-blue-700">M2: {formatCurrency(detail.m2_override)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedPeriod.own_sales_details.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Own Sales Commissions</h4>
            <div className="space-y-2">
              {selectedPeriod.own_sales_details.map((detail, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                  <p className="font-medium text-gray-900">{detail.customer_name}</p>
                  <div className="text-right">
                    {detail.m1_paid && (
                      <p className="text-xs text-orange-700">M1: {formatCurrency(detail.m1_commission)}</p>
                    )}
                    {detail.m2_paid && (
                      <p className="text-xs text-purple-700">M2: {formatCurrency(detail.m2_commission)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Sales Manager Dashboard</h2>
        <p className="text-blue-100">Track your team's performance and commission overrides</p>
        {managerInfo && (
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <DollarSign className="w-5 h-5" />
            <span className="font-semibold">Your PPW Redline: ${managerInfo.ppw_redline.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Team Overview
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'commissions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Commission Details
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'payroll'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Payroll Periods
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Overrides</p>
                  <p className="text-2xl font-bold text-gray-900">${totalOverrides.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total System Size</p>
                  <p className="text-2xl font-bold text-gray-900">{totalSystemSize.toFixed(2)} kW</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Sales Rep Overrides</h3>
          <p className="text-sm text-gray-600 mt-1">
            Commission overrides from your sales representatives
          </p>
        </div>

        <div className="p-4">
          {repOverrides.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No sales representatives assigned to you yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {repOverrides.map(({ rep, override_per_watt, total_customers, total_system_size, total_override_amount }) => (
                <div
                  key={rep.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {rep.photo_url ? (
                      <img
                        src={rep.photo_url}
                        alt={rep.full_name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{rep.full_name}</h4>
                          {rep.custom_id && (
                            <p className="text-xs text-gray-500">ID: {rep.custom_id}</p>
                          )}
                          <p className="text-sm text-gray-600">{rep.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Rep PPW</p>
                          <p className="text-lg font-bold text-blue-600">${rep.ppw_redline.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Override/Watt</p>
                          <p className={`text-sm font-semibold ${override_per_watt >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${Math.abs(override_per_watt).toFixed(4)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Customers</p>
                          <p className="text-sm font-semibold text-gray-900">{total_customers}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">System Size</p>
                          <p className="text-sm font-semibold text-gray-900">{total_system_size.toFixed(2)} kW</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total Override</p>
                          <p className={`text-sm font-semibold ${total_override_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${Math.abs(total_override_amount).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {override_per_watt < 0 && (
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-xs text-yellow-800">
                            This rep's PPW is lower than yours, resulting in a negative override
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">How Overrides Work</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Override Calculation:</strong> (Sales Rep PPW - Your PPW) × Total System Size</p>
              <p className="text-xs text-blue-700 mt-2">
                Example: If your PPW is $2.40 and your sales rep's PPW is $2.50, you earn $0.10 per watt in overrides.
                For a 10,000W system, that's $1,000 in override commissions.
              </p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'commissions' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Commission Details</h3>
            <p className="text-sm text-gray-600">All customers from your sales reps with override calculations</p>
          </div>

          {commissionDetails.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No commission data available</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sales Rep</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">System Size</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Rep PPW</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Your PPW</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Override/Watt</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total Override</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">M1 Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">M2 Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">M1 Override</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">M2 Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {commissionDetails.map((detail) => (
                      <tr key={detail.customer_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{detail.customer_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{detail.sales_rep_name}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {detail.system_size_kw.toFixed(2)} kW
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          ${detail.sales_rep_ppw.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          ${detail.manager_ppw.toFixed(4)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-semibold ${
                          detail.override_per_watt >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${Math.abs(detail.override_per_watt).toFixed(4)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-bold ${
                          detail.total_override_amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(detail.total_override_amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            detail.m1_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : detail.m1_status === 'eligible'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {detail.m1_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            detail.m2_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : detail.m2_status === 'eligible'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {detail.m2_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-700 font-medium">
                          {formatCurrency(detail.m1_override)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-blue-700 font-medium">
                          {formatCurrency(detail.m2_override)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                        Totals:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">
                        {formatCurrency(commissionDetails.reduce((sum, d) => sum + d.total_override_amount, 0))}
                      </td>
                      <td colSpan={2}></td>
                      <td className="px-4 py-3 text-sm font-bold text-green-700 text-right">
                        {formatCurrency(commissionDetails.reduce((sum, d) => sum + d.m1_override, 0))}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-blue-700 text-right">
                        {formatCurrency(commissionDetails.reduce((sum, d) => sum + d.m2_override, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Understanding Override Commissions</h4>
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>Total Override:</strong> The total override amount you earn from this customer based on your sales rep's PPW vs your PPW.</p>
              <p><strong>M1 Override:</strong> The portion of your override paid at Milestone 1 (typically after signature + 3 days).</p>
              <p><strong>M2 Override:</strong> The portion of your override paid at Milestone 2 (typically after installation completion).</p>
              <p className="text-xs text-blue-700 mt-2">
                These override amounts are automatically added to your payroll periods when the milestones are marked as paid.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Payroll Periods</h3>
            <p className="text-sm text-gray-600">View your earnings by pay period (overrides + own sales)</p>
          </div>

          <div className="space-y-2">
            {payrollPeriods.map((period, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedPeriod(period)}
                className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(period.start_date)} - {formatDate(period.end_date)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {period.override_details.length + period.own_sales_details.length} payment{(period.override_details.length + period.own_sales_details.length) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(period.total_earnings)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {(period.total_m1_overrides + period.total_m2_overrides) > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Overrides: {formatCurrency(period.total_m1_overrides + period.total_m2_overrides)}
                        </span>
                      )}
                      {(period.total_m1_own_sales + period.total_m2_own_sales) > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                          Sales: {formatCurrency(period.total_m1_own_sales + period.total_m2_own_sales)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {payrollPeriods.length === 0 && (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No payroll data available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
