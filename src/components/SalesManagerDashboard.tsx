import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, TrendingUp, Users, Loader2, AlertCircle } from 'lucide-react';

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
  system_size_w: number;
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

export default function SalesManagerDashboard() {
  const [managerInfo, setManagerInfo] = useState<{ ppw_redline: number; full_name: string } | null>(null);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [repOverrides, setRepOverrides] = useState<RepOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
        .select('ppw_redline, full_name')
        .eq('email', user.email)
        .maybeSingle();

      if (managerError) throw managerError;
      if (!manager || !manager.ppw_redline) {
        setError('Manager PPW redline not configured. Please contact your administrator.');
        return;
      }

      setManagerInfo(manager);

      const { data: reps, error: repsError } = await supabase
        .from('app_users')
        .select('id, full_name, email, ppw_redline, photo_url, custom_id')
        .eq('role', 'sales_rep')
        .eq('reporting_manager_id', (await supabase
          .from('app_users')
          .select('id')
          .eq('email', user.email)
          .maybeSingle()).data?.id)
        .eq('status', 'active')
        .order('full_name', { ascending: true });

      if (repsError) throw repsError;

      const validReps = (reps || []).filter(rep => rep.ppw_redline && rep.ppw_redline > 0);
      setSalesReps(validReps);

      const overridePromises = validReps.map(async (rep) => {
        const { data: customers, error: customersError } = await supabase
          .from('customers')
          .select('id, customer_name, system_size_w, epc_gross_total, created_at')
          .eq('sales_rep_id', rep.id);

        if (customersError) throw customersError;

        const totalSystemSize = (customers || []).reduce((sum, c) => sum + (c.system_size_w || 0), 0);
        const overridePerWatt = (rep.ppw_redline || 0) - (manager.ppw_redline || 0);
        const totalOverrideAmount = totalSystemSize * overridePerWatt;

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
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const totalOverrides = repOverrides.reduce((sum, ro) => sum + ro.total_override_amount, 0);
  const totalCustomers = repOverrides.reduce((sum, ro) => sum + ro.total_customers, 0);
  const totalSystemSize = repOverrides.reduce((sum, ro) => sum + ro.total_system_size, 0);

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
              <p className="text-2xl font-bold text-gray-900">{(totalSystemSize / 1000).toFixed(2)} kW</p>
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
                          <p className="text-sm font-semibold text-gray-900">{(total_system_size / 1000).toFixed(2)} kW</p>
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
    </div>
  );
}
