import { useState, useEffect } from 'react';
import { Calendar, DollarSign, Clock, Battery, Zap, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type TimeClockEntry = {
  id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  total_hours: number | null;
  customer_id: string | null;
};

type PayrollPeriod = {
  start_date: Date;
  end_date: Date;
  total_hourly_earnings: number;
  total_battery_earnings: number;
  total_battery_earnings_estimated: number;
  total_per_watt_earnings: number;
  total_per_watt_earnings_estimated: number;
  total_hours: number;
  total_earnings: number;
  total_earnings_estimated: number;
  time_entries: TimeClockEntry[];
  battery_jobs: Array<{
    customer_name: string;
    battery_quantity: number;
    battery_pay: number;
    is_completed: boolean;
  }>;
  per_watt_jobs: Array<{
    customer_name: string;
    system_size: number;
    per_watt_pay: number;
    is_completed: boolean;
  }>;
};

type UserPaymentInfo = {
  hourly_rate: number;
  battery_pay_rates: Record<string, number>;
  per_watt_rate: number;
};

export default function PayrollPeriodView() {
  const { user } = useAuth();
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPaymentInfo, setUserPaymentInfo] = useState<UserPaymentInfo | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);

  useEffect(() => {
    loadPayrollData();
  }, [user]);

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

  const loadPayrollData = async () => {
    try {
      if (!user) return;

      const { data: appUser, error: userError } = await supabase
        .from('app_users')
        .select('id, hourly_rate, battery_pay_rates, per_watt_rate')
        .eq('email', user.email)
        .maybeSingle();

      if (userError) throw userError;
      if (!appUser) return;

      setUserPaymentInfo({
        hourly_rate: appUser.hourly_rate || 0,
        battery_pay_rates: appUser.battery_pay_rates || {},
        per_watt_rate: appUser.per_watt_rate || 0
      });

      const periods = getPayrollPeriods();
      const periodData: PayrollPeriod[] = [];

      for (const period of periods) {
        const { data: timeEntries, error: timeError } = await supabase
          .from('time_clock')
          .select('id, clock_in_time, clock_out_time, total_hours, customer_id')
          .eq('user_id', appUser.id)
          .gte('clock_in_time', period.start_date.toISOString())
          .lte('clock_in_time', period.end_date.toISOString())
          .order('clock_in_time', { ascending: false });

        if (timeError) throw timeError;

        const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.total_hours || 0), 0) || 0;
        const hourlyEarnings = totalHours * (appUser.hourly_rate || 0);

        const batteryJobs: Array<{ customer_name: string; battery_quantity: number; battery_pay: number; is_completed: boolean }> = [];
        const perWattJobs: Array<{ customer_name: string; system_size: number; per_watt_pay: number; is_completed: boolean }> = [];
        let totalBatteryEarnings = 0;
        let totalBatteryEarningsEstimated = 0;
        let totalPerWattEarnings = 0;
        let totalPerWattEarningsEstimated = 0;

        const { data: allInstalls, error: installsError } = await supabase
          .from('scheduling')
          .select(`
            id,
            customer_id,
            closed_at,
            scheduled_date,
            ticket_status,
            customers!inner (
              id,
              full_name,
              battery_quantity,
              system_size_kw
            )
          `)
          .eq('pv_installer_id', appUser.id)
          .eq('ticket_type', 'installation')
          .in('ticket_status', ['scheduled', 'in_progress', 'completed'])
          .gte('scheduled_date', period.start_date.toISOString().split('T')[0])
          .lte('scheduled_date', period.end_date.toISOString().split('T')[0]);

        if (installsError) {
          console.error('Error loading installs:', installsError);
        }

        allInstalls?.forEach(install => {
          const customer = Array.isArray(install.customers) ? install.customers[0] : install.customers;
          if (!customer) return;

          const isCompleted = install.closed_at !== null;

          if (customer.battery_quantity && customer.battery_quantity > 0) {
            const batteryKey = Math.min(customer.battery_quantity, 4).toString();
            const batteryPay = (appUser.battery_pay_rates?.[batteryKey] as number) || 0;

            if (batteryPay > 0) {
              batteryJobs.push({
                customer_name: customer.full_name,
                battery_quantity: customer.battery_quantity,
                battery_pay: batteryPay,
                is_completed: isCompleted
              });

              if (isCompleted) {
                totalBatteryEarnings += batteryPay;
              } else {
                totalBatteryEarningsEstimated += batteryPay;
              }
            }
          }

          if (customer.system_size_kw && appUser.per_watt_rate > 0) {
            const systemWatts = customer.system_size_kw * 1000;
            const perWattPay = systemWatts * appUser.per_watt_rate;

            if (perWattPay > 0) {
              perWattJobs.push({
                customer_name: customer.full_name,
                system_size: customer.system_size_kw,
                per_watt_pay: perWattPay,
                is_completed: isCompleted
              });

              if (isCompleted) {
                totalPerWattEarnings += perWattPay;
              } else {
                totalPerWattEarningsEstimated += perWattPay;
              }
            }
          }
        });

        periodData.push({
          start_date: period.start_date,
          end_date: period.end_date,
          total_hours: totalHours,
          total_hourly_earnings: hourlyEarnings,
          total_battery_earnings: totalBatteryEarnings,
          total_battery_earnings_estimated: totalBatteryEarningsEstimated,
          total_per_watt_earnings: totalPerWattEarnings,
          total_per_watt_earnings_estimated: totalPerWattEarningsEstimated,
          total_earnings: hourlyEarnings + totalBatteryEarnings + totalPerWattEarnings,
          total_earnings_estimated: hourlyEarnings + totalBatteryEarnings + totalPerWattEarnings + totalBatteryEarningsEstimated + totalPerWattEarningsEstimated,
          time_entries: timeEntries || [],
          battery_jobs: batteryJobs,
          per_watt_jobs: perWattJobs
        });
      }

      setPayrollPeriods(periodData);
    } catch (err) {
      console.error('Failed to load payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading payroll data...</p>
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
              className="text-sm text-orange-600 hover:text-orange-700 mb-2"
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
            {selectedPeriod.total_earnings_estimated > selectedPeriod.total_earnings && (
              <p className="text-sm text-gray-500 flex items-center justify-end gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                With estimates: {formatCurrency(selectedPeriod.total_earnings_estimated)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Hourly Pay</span>
            </div>
            <p className="text-xl font-bold text-blue-900">
              {formatCurrency(selectedPeriod.total_hourly_earnings)}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {selectedPeriod.total_hours.toFixed(2)} hours @ {formatCurrency(userPaymentInfo?.hourly_rate || 0)}/hr
            </p>
          </div>

          {(selectedPeriod.total_battery_earnings > 0 || selectedPeriod.total_battery_earnings_estimated > 0) && (
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Battery className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Battery Pay</span>
              </div>
              <p className="text-xl font-bold text-purple-900">
                {formatCurrency(selectedPeriod.total_battery_earnings)}
              </p>
              {selectedPeriod.total_battery_earnings_estimated > 0 && (
                <p className="text-xs text-purple-600 mt-1">
                  + {formatCurrency(selectedPeriod.total_battery_earnings_estimated)} estimated
                </p>
              )}
              <p className="text-xs text-purple-700 mt-1">
                {selectedPeriod.battery_jobs.length} installation{selectedPeriod.battery_jobs.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {(selectedPeriod.total_per_watt_earnings > 0 || selectedPeriod.total_per_watt_earnings_estimated > 0) && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Per Watt Pay</span>
              </div>
              <p className="text-xl font-bold text-yellow-900">
                {formatCurrency(selectedPeriod.total_per_watt_earnings)}
              </p>
              {selectedPeriod.total_per_watt_earnings_estimated > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  + {formatCurrency(selectedPeriod.total_per_watt_earnings_estimated)} estimated
                </p>
              )}
              <p className="text-xs text-yellow-700 mt-1">
                {formatCurrency(userPaymentInfo?.per_watt_rate || 0)}/watt
              </p>
            </div>
          )}
        </div>

        {selectedPeriod.battery_jobs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Battery className="w-4 h-4 text-purple-600" />
              Battery Installations
            </h4>
            <div className="space-y-2">
              {selectedPeriod.battery_jobs.map((job, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{job.customer_name}</p>
                      {!job.is_completed && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Estimated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{job.battery_quantity} batteries</p>
                  </div>
                  <p className={`font-semibold ${job.is_completed ? 'text-purple-900' : 'text-gray-500'}`}>
                    {formatCurrency(job.battery_pay)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedPeriod.per_watt_jobs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              Per Watt Installations
            </h4>
            <div className="space-y-2">
              {selectedPeriod.per_watt_jobs.map((job, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{job.customer_name}</p>
                      {!job.is_completed && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Estimated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{job.system_size} kW system</p>
                  </div>
                  <p className={`font-semibold ${job.is_completed ? 'text-yellow-900' : 'text-gray-500'}`}>
                    {formatCurrency(job.per_watt_pay)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Time Entries ({selectedPeriod.time_entries.length})
          </h4>
          <div className="space-y-2">
            {selectedPeriod.time_entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(entry.clock_in_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </p>
                  <p className="text-xs text-gray-600">
                    {new Date(entry.clock_in_time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                    {entry.clock_out_time && (
                      <> - {new Date(entry.clock_out_time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-900">
                    {entry.total_hours?.toFixed(2) || '0.00'} hrs
                  </p>
                  <p className="text-xs text-gray-600">
                    {formatCurrency((entry.total_hours || 0) * (userPaymentInfo?.hourly_rate || 0))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Payroll Periods</h3>
        <p className="text-sm text-gray-600">View your earnings by pay period</p>
      </div>

      {userPaymentInfo && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-orange-900 mb-2">Your Pay Rates</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-orange-700">Hourly Rate:</p>
              <p className="font-semibold text-orange-900">{formatCurrency(userPaymentInfo.hourly_rate)}/hr</p>
            </div>
            {userPaymentInfo.per_watt_rate > 0 && (
              <div>
                <p className="text-orange-700">Per Watt Rate:</p>
                <p className="font-semibold text-orange-900">{formatCurrency(userPaymentInfo.per_watt_rate)}/watt</p>
              </div>
            )}
            {Object.keys(userPaymentInfo.battery_pay_rates).length > 0 && (
              <div className="col-span-2">
                <p className="text-orange-700 mb-1">Battery Pay Rates:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(userPaymentInfo.battery_pay_rates).map(([qty, pay]) => (
                    <span key={qty} className="bg-white px-2 py-1 rounded text-xs font-medium text-orange-900">
                      {qty} battery: {formatCurrency(pay as number)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {payrollPeriods.map((period, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedPeriod(period)}
            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(period.start_date)} - {formatDate(period.end_date)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {period.total_hours.toFixed(2)} hours worked
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(period.total_earnings)}
                </p>
                {period.total_earnings_estimated > period.total_earnings && (
                  <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                    <AlertCircle className="w-3 h-3" />
                    + {formatCurrency(period.total_earnings_estimated - period.total_earnings)} est.
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap justify-end">
                  {period.total_hourly_earnings > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      Hourly: {formatCurrency(period.total_hourly_earnings)}
                    </span>
                  )}
                  {period.total_battery_earnings > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      Battery: {formatCurrency(period.total_battery_earnings)}
                    </span>
                  )}
                  {period.total_battery_earnings_estimated > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      +{formatCurrency(period.total_battery_earnings_estimated)} est.
                    </span>
                  )}
                  {period.total_per_watt_earnings > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                      PPW: {formatCurrency(period.total_per_watt_earnings)}
                    </span>
                  )}
                  {period.total_per_watt_earnings_estimated > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      +{formatCurrency(period.total_per_watt_earnings_estimated)} est.
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
  );
}
