import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Calendar, Clock, TrendingUp, User, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type TimeClockEntry = {
  id: string;
  user_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  total_hours: number | null;
};

type AppUser = {
  id: string;
  full_name: string;
  custom_id: string;
  hourly_rate: number;
  is_salary: boolean;
  role_category: string;
  per_watt_rate: number;
  battery_pay_rates: Record<string, number> | null;
};

type SalesCommission = {
  id: string;
  customer_id: string;
  sales_rep_id: string;
  sales_manager_id: string | null;
  total_commission: number;
  sales_manager_override_amount: number | null;
  m1_payment_amount: number;
  m1_payment_status: 'pending' | 'eligible' | 'paid';
  m1_paid_date: string | null;
  m1_payroll_period_end: string | null;
  m2_payment_amount: number;
  m2_payment_status: 'pending' | 'eligible' | 'paid';
  m2_paid_date: string | null;
  m2_payroll_period_end: string | null;
  manager_override_payment_status: 'pending' | 'eligible' | 'paid';
  manager_override_eligibility_date: string | null;
  manager_override_paid_date: string | null;
  manager_override_payroll_period_end: string | null;
};

type PayrollCalculation = {
  user: AppUser;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  perWattPay: number;
  batteryPay: number;
  commissionPay: number;
  totalPay: number;
  installationCount: number;
  totalWatts: number;
  totalBatteries: number;
  commissions: SalesCommission[];
  weeklyBreakdown: {
    weekNumber: number;
    weekStart: string;
    weekEnd: string;
    hours: number;
    regularHours: number;
    overtimeHours: number;
  }[];
};

export default function Payroll() {
  const [payrollData, setPayrollData] = useState<PayrollCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriodStart, setSelectedPeriodStart] = useState<Date>(getCurrentPayPeriodStart());
  const [selectedPeriodEnd, setSelectedPeriodEnd] = useState<Date>(getCurrentPayPeriodEnd());
  const [approvingPayment, setApprovingPayment] = useState<string | null>(null);

  function getCurrentPayPeriodStart(): Date {
    const referenceDate = new Date('2024-12-14');
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
    const periodsSince = Math.floor(daysDiff / 14);
    const periodStart = new Date(referenceDate);
    periodStart.setDate(periodStart.getDate() + (periodsSince * 14));
    return periodStart;
  }

  function getCurrentPayPeriodEnd(): Date {
    const start = getCurrentPayPeriodStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    return end;
  }

  function getPayDate(periodEnd: Date): Date {
    const payDate = new Date(periodEnd);
    payDate.setDate(payDate.getDate() + 6);
    while (payDate.getDay() !== 5) {
      payDate.setDate(payDate.getDate() + 1);
    }
    return payDate;
  }

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  const fetchPayrollData = useCallback(async () => {
    try {
      setLoading(true);

      const startDate = selectedPeriodStart.toISOString();
      const endDate = new Date(selectedPeriodEnd);
      endDate.setHours(23, 59, 59, 999);
      const endDateStr = endDate.toISOString();

      const [usersResult, timeClockResult, installationsResult, commissionsResult] = await Promise.all([
        supabase
          .from('app_users')
          .select('id, full_name, custom_id, hourly_rate, is_salary, role_category, per_watt_rate, battery_pay_rates')
          .order('full_name'),
        supabase
          .from('time_clock')
          .select('*')
          .gte('clock_in_time', startDate)
          .lte('clock_in_time', endDateStr)
          .not('clock_out_time', 'is', null),
        supabase
          .from('scheduling')
          .select(`
            id,
            pv_installer_id,
            closed_at,
            ticket_type,
            customers!inner (
              system_size_kw,
              battery_quantity,
              is_active
            )
          `)
          .eq('ticket_type', 'installation')
          .eq('customers.is_active', true)
          .not('closed_at', 'is', null)
          .gte('closed_at', startDate)
          .lte('closed_at', endDateStr),
        supabase
          .from('sales_commissions')
          .select(`
            *,
            customers!inner (
              is_active
            )
          `)
          .eq('customers.is_active', true)
          .or(`m1_payroll_period_end.eq.${endDateStr.split('T')[0]},m2_payroll_period_end.eq.${endDateStr.split('T')[0]}`)
      ]);

      if (usersResult.error) throw usersResult.error;
      if (timeClockResult.error) throw timeClockResult.error;
      if (installationsResult.error) throw installationsResult.error;
      if (commissionsResult.error) throw commissionsResult.error;

      const users = usersResult.data as AppUser[];
      const timeEntries = timeClockResult.data as TimeClockEntry[];
      const installations = installationsResult.data as any[];
      const rawCommissions = commissionsResult.data || [];

      const allCommissions: SalesCommission[] = rawCommissions.map((comm: any) => ({
        ...comm,
        total_commission: parseFloat(comm.total_commission) || 0,
        sales_manager_override_amount: comm.sales_manager_override_amount
          ? parseFloat(comm.sales_manager_override_amount)
          : null,
        m1_payment_amount: parseFloat(comm.m1_payment_amount) || 0,
        m2_payment_amount: parseFloat(comm.m2_payment_amount) || 0,
        manager_override_payment_status: comm.manager_override_payment_status || 'pending',
        manager_override_eligibility_date: comm.manager_override_eligibility_date || null,
        manager_override_paid_date: comm.manager_override_paid_date || null,
        manager_override_payroll_period_end: comm.manager_override_payroll_period_end || null,
      }));

      const calculations: PayrollCalculation[] = users.map(user => {
        const userEntries = timeEntries.filter(entry => entry.user_id === user.id);

        const weeklyData = new Map<string, { hours: number; weekStart: Date; weekEnd: Date }>();

        userEntries.forEach(entry => {
          if (!entry.total_hours) return;

          const entryDate = new Date(entry.clock_in_time);
          const weekStart = getWeekStart(entryDate);
          const weekKey = weekStart.toISOString();

          if (!weeklyData.has(weekKey)) {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weeklyData.set(weekKey, { hours: 0, weekStart, weekEnd });
          }

          const week = weeklyData.get(weekKey)!;
          week.hours += entry.total_hours;
        });

        let totalRegularHours = 0;
        let totalOvertimeHours = 0;
        const weeklyBreakdown = Array.from(weeklyData.entries()).map(([_, week], index) => {
          const regularHours = Math.min(week.hours, 40);
          const overtimeHours = Math.max(0, week.hours - 40);

          totalRegularHours += regularHours;
          totalOvertimeHours += overtimeHours;

          return {
            weekNumber: index + 1,
            weekStart: week.weekStart.toLocaleDateString(),
            weekEnd: week.weekEnd.toLocaleDateString(),
            hours: week.hours,
            regularHours,
            overtimeHours
          };
        });

        const regularPay = totalRegularHours * (user.hourly_rate || 0);
        const overtimePay = totalOvertimeHours * (user.hourly_rate || 0) * 1.5;

        const userInstallations = installations.filter(inst => inst.pv_installer_id === user.id);

        let perWattPay = 0;
        let batteryPay = 0;
        let totalWatts = 0;
        let totalBatteries = 0;

        userInstallations.forEach(inst => {
          const systemSizeKw = inst.customers?.system_size_kw || 0;
          const batteryQty = inst.customers?.battery_quantity || 0;

          const watts = systemSizeKw;
          totalWatts += watts;

          if (batteryQty > 0 && user.battery_pay_rates) {
            const batteryRate = user.battery_pay_rates[batteryQty.toString()] || user.battery_pay_rates['4+'] || 0;
            batteryPay += batteryRate;
            totalBatteries += batteryQty;
          } else if (user.per_watt_rate && watts > 0) {
            perWattPay += watts * user.per_watt_rate;
          }
        });

        const userCommissions = allCommissions.filter(comm => {
          const periodEnd = endDateStr.split('T')[0];

          const m1InPeriod = (comm.m1_payment_status === 'eligible' || comm.m1_payment_status === 'paid') &&
                            comm.m1_payroll_period_end === periodEnd &&
                            comm.sales_rep_id === user.id;

          const m2InPeriod = (comm.m2_payment_status === 'eligible' || comm.m2_payment_status === 'paid') &&
                            comm.m2_payroll_period_end === periodEnd &&
                            comm.sales_rep_id === user.id;

          const managerOverrideInPeriod = (comm.manager_override_payment_status === 'eligible' || comm.manager_override_payment_status === 'paid') &&
                            comm.manager_override_payroll_period_end === periodEnd &&
                            comm.sales_manager_id === user.id;

          return m1InPeriod || m2InPeriod || managerOverrideInPeriod;
        });

        let commissionPay = 0;
        const periodEnd = endDateStr.split('T')[0];

        userCommissions.forEach(comm => {
          if (comm.sales_rep_id === user.id) {
            if (comm.m1_payment_status === 'paid' && comm.m1_payroll_period_end === periodEnd) {
              commissionPay += comm.m1_payment_amount;
            }
            if (comm.m2_payment_status === 'paid' && comm.m2_payroll_period_end === periodEnd) {
              commissionPay += comm.m2_payment_amount;
            }
          }

          if (comm.sales_manager_id === user.id && comm.sales_manager_override_amount) {
            if (comm.manager_override_payment_status === 'paid' && comm.manager_override_payroll_period_end === periodEnd) {
              commissionPay += comm.sales_manager_override_amount;
            }
          }
        });

        const totalPay = regularPay + overtimePay + perWattPay + batteryPay + commissionPay;

        return {
          user,
          regularHours: totalRegularHours,
          overtimeHours: totalOvertimeHours,
          regularPay,
          overtimePay,
          perWattPay,
          batteryPay,
          commissionPay,
          totalPay,
          installationCount: userInstallations.length,
          totalWatts,
          totalBatteries,
          commissions: userCommissions,
          weeklyBreakdown
        };
      });

      calculations.sort((a, b) => b.totalPay - a.totalPay);
      setPayrollData(calculations);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodStart, selectedPeriodEnd]);

  useEffect(() => {
    fetchPayrollData();

    const subscription = supabase
      .channel('payroll_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_commissions',
        },
        () => {
          fetchPayrollData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchPayrollData]);

  const handlePreviousPeriod = () => {
    const newStart = new Date(selectedPeriodStart);
    newStart.setDate(newStart.getDate() - 14);
    const newEnd = new Date(selectedPeriodEnd);
    newEnd.setDate(newEnd.getDate() - 14);
    setSelectedPeriodStart(newStart);
    setSelectedPeriodEnd(newEnd);
  };

  const handleNextPeriod = () => {
    const newStart = new Date(selectedPeriodStart);
    newStart.setDate(newStart.getDate() + 14);
    const newEnd = new Date(selectedPeriodEnd);
    newEnd.setDate(newEnd.getDate() + 14);
    setSelectedPeriodStart(newStart);
    setSelectedPeriodEnd(newEnd);
  };

  const handleCurrentPeriod = () => {
    setSelectedPeriodStart(getCurrentPayPeriodStart());
    setSelectedPeriodEnd(getCurrentPayPeriodEnd());
  };

  const approvePayment = async (commissionId: string, paymentType: 'm1' | 'm2' | 'manager_override') => {
    const key = `${commissionId}-${paymentType}`;
    try {
      setApprovingPayment(key);

      const updates: any = {};
      if (paymentType === 'm1') {
        updates.m1_payment_status = 'paid';
        updates.m1_paid_date = new Date().toISOString().split('T')[0];
      } else if (paymentType === 'm2') {
        updates.m2_payment_status = 'paid';
        updates.m2_paid_date = new Date().toISOString().split('T')[0];
      } else if (paymentType === 'manager_override') {
        updates.manager_override_payment_status = 'paid';
        updates.manager_override_paid_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('sales_commissions')
        .update(updates)
        .eq('id', commissionId);

      if (error) throw error;

      await fetchPayrollData();
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('Failed to approve payment. Please try again.');
    } finally {
      setApprovingPayment(null);
    }
  };

  const totalPayrollAmount = payrollData.reduce((sum, calc) => sum + calc.totalPay, 0);
  const totalRegularHours = payrollData.reduce((sum, calc) => sum + calc.regularHours, 0);
  const totalOvertimeHours = payrollData.reduce((sum, calc) => sum + calc.overtimeHours, 0);
  const payDate = getPayDate(selectedPeriodEnd);

  if (loading) {
    return (
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading payroll data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600 mt-1">Calculate and manage employee payroll for bi-weekly pay periods</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pay Period</h2>
              <p className="text-sm text-gray-600">
                {selectedPeriodStart.toLocaleDateString()} - {selectedPeriodEnd.toLocaleDateString()}
              </p>
              <p className="text-sm text-green-600 font-medium mt-1">
                Pay Date: {payDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePreviousPeriod}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Previous Period
              </button>
              <button
                onClick={handleCurrentPeriod}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Current Period
              </button>
              <button
                onClick={handleNextPeriod}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Next Period
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Payroll</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    ${totalPayrollAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-sky-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Regular Hours</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {totalRegularHours.toFixed(1)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Overtime Hours</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">
                    {totalOvertimeHours.toFixed(1)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-amber-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Employees</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {payrollData.length}
                  </p>
                </div>
                <User className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Reg Hrs</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">OT Hrs</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Hourly Pay</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Per Watt</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Battery</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Commission</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Pay</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payrollData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                      No payroll data for this period
                    </td>
                  </tr>
                ) : (
                  payrollData.map((calc) => (
                    <PayrollRow
                      key={calc.user.id}
                      calculation={calc}
                      onApprovePayment={approvePayment}
                      approvingPayment={approvingPayment}
                    />
                  ))
                )}
              </tbody>
              {payrollData.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr className="font-semibold">
                    <td colSpan={3} className="px-6 py-4 text-sm text-gray-900">
                      TOTAL
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {totalRegularHours.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {totalOvertimeHours.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      ${(payrollData.reduce((sum, calc) => sum + calc.regularPay + calc.overtimePay, 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      ${payrollData.reduce((sum, calc) => sum + calc.perWattPay, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      ${payrollData.reduce((sum, calc) => sum + calc.batteryPay, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      ${payrollData.reduce((sum, calc) => sum + calc.commissionPay, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 text-right">
                      ${totalPayrollAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function PayrollRow({
  calculation,
  onApprovePayment,
  approvingPayment
}: {
  calculation: PayrollCalculation;
  onApprovePayment: (commissionId: string, paymentType: 'm1' | 'm2' | 'manager_override') => Promise<void>;
  approvingPayment: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const { user, regularHours, overtimeHours, regularPay, overtimePay, perWattPay, batteryPay, commissionPay, totalPay, installationCount, totalWatts, totalBatteries, commissions, weeklyBreakdown } = calculation;

  const getRoleBadgeColor = (category: string) => {
    switch (category) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'management': return 'bg-blue-100 text-blue-800';
      case 'field_tech': return 'bg-green-100 text-green-800';
      case 'employee': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4">
          <div className="text-sm font-medium text-gray-900">
            {user.full_name}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-600">{user.custom_id}</div>
        </td>
        <td className="px-6 py-4">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role_category)}`}>
            {getRoleLabel(user.role_category)}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="text-sm text-gray-900">{regularHours.toFixed(1)}</div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="text-sm text-amber-600 font-medium">{overtimeHours.toFixed(1)}</div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="text-sm text-gray-900">${(regularPay + overtimePay).toFixed(2)}</div>
          {(regularHours > 0 || overtimeHours > 0) && (
            <div className="text-xs text-gray-500">{(regularHours + overtimeHours).toFixed(1)} hrs</div>
          )}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="text-sm text-gray-900">${perWattPay.toFixed(2)}</div>
          {installationCount > 0 && (
            <div className="text-xs text-gray-500">{(totalWatts / 1000).toFixed(1)}kW</div>
          )}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="text-sm text-gray-900">${batteryPay.toFixed(2)}</div>
          {totalBatteries > 0 && (
            <div className="text-xs text-gray-500">{totalBatteries} units</div>
          )}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="text-sm text-gray-900">${commissionPay.toFixed(2)}</div>
          {commissions.length > 0 && (
            <div className="text-xs text-gray-500">{commissions.length} payment{commissions.length !== 1 ? 's' : ''}</div>
          )}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="text-sm font-semibold text-green-600">${totalPay.toFixed(2)}</div>
        </td>
        <td className="px-6 py-4 text-center">
          {(weeklyBreakdown.length > 0 || installationCount > 0 || commissions.length > 0) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              {expanded ? 'Hide' : 'Show'}
            </button>
          )}
        </td>
      </tr>
      {expanded && (weeklyBreakdown.length > 0 || installationCount > 0 || commissions.length > 0) && (
        <tr>
          <td colSpan={11} className="px-6 py-4 bg-gray-50">
            <div className="grid grid-cols-1 gap-4">
              {weeklyBreakdown.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Hourly Time Breakdown</h4>
                  {weeklyBreakdown.map((week) => (
                    <div key={week.weekNumber} className="flex items-center justify-between text-xs bg-white p-3 rounded border border-gray-200">
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-gray-900">Week {week.weekNumber}</span>
                        <span className="text-gray-600">{week.weekStart} - {week.weekEnd}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div>
                          <span className="text-gray-600">Total: </span>
                          <span className="font-medium text-gray-900">{week.hours.toFixed(1)} hrs</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Regular: </span>
                          <span className="font-medium text-gray-900">{week.regularHours.toFixed(1)} hrs</span>
                        </div>
                        {week.overtimeHours > 0 && (
                          <div>
                            <span className="text-amber-600">Overtime: </span>
                            <span className="font-medium text-amber-600">{week.overtimeHours.toFixed(1)} hrs</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {installationCount > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Production Pay Summary</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <div className="text-xs text-gray-600">Installations Completed</div>
                      <div className="text-lg font-bold text-gray-900">{installationCount}</div>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <div className="text-xs text-gray-600">Total System Size</div>
                      <div className="text-lg font-bold text-gray-900">{(totalWatts / 1000).toFixed(1)} kW</div>
                      <div className="text-xs text-green-600 font-medium">${perWattPay.toFixed(2)}</div>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <div className="text-xs text-gray-600">Batteries Installed</div>
                      <div className="text-lg font-bold text-gray-900">{totalBatteries} units</div>
                      <div className="text-xs text-green-600 font-medium">${batteryPay.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}

              {commissions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Sales Commissions</h4>
                  {commissions.map((comm, idx) => {
                    const isSalesRep = comm.sales_rep_id === user.id;
                    const isSalesManager = comm.sales_manager_id === user.id;
                    const m1InPeriod = comm.m1_payroll_period_end && isSalesRep;
                    const m2InPeriod = comm.m2_payroll_period_end && isSalesRep;
                    const managerOverrideInPeriod = comm.manager_override_payroll_period_end && isSalesManager;
                    const m1Status = comm.m1_payment_status;
                    const m2Status = comm.m2_payment_status;

                    return (
                      <div key={comm.id} className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium text-gray-900">
                            Sale #{idx + 1}{isSalesRep && ` - Total Commission: $${comm.total_commission.toFixed(2)}`}
                          </div>
                        </div>
                        <div className="space-y-3">
                          {m1InPeriod && (
                            <div className={`p-3 rounded border ${
                              m1Status === 'paid' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                            }`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="text-xs font-medium text-gray-700">M1 Payment</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {m1Status === 'paid'
                                      ? `Paid: ${new Date(comm.m1_paid_date!).toLocaleDateString()}`
                                      : m1Status === 'eligible'
                                      ? 'Eligible - Ready to Pay'
                                      : 'Pending'
                                    }
                                  </div>
                                  <div className={`text-lg font-bold mt-1 ${
                                    m1Status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                                  }`}>
                                    ${comm.m1_payment_amount.toFixed(2)}
                                  </div>
                                </div>
                                {m1Status === 'eligible' && (
                                  <button
                                    onClick={() => onApprovePayment(comm.id, 'm1')}
                                    disabled={approvingPayment === `${comm.id}-m1`}
                                    className="ml-3 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {approvingPayment === `${comm.id}-m1` ? 'Approving...' : 'Approve Payment'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                          {m2InPeriod && (
                            <div className={`p-3 rounded border ${
                              m2Status === 'paid' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                            }`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="text-xs font-medium text-gray-700">M2 Payment</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {m2Status === 'paid'
                                      ? `Paid: ${new Date(comm.m2_paid_date!).toLocaleDateString()}`
                                      : m2Status === 'eligible'
                                      ? 'Eligible - Ready to Pay'
                                      : 'Pending'
                                    }
                                  </div>
                                  <div className={`text-lg font-bold mt-1 ${
                                    m2Status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                                  }`}>
                                    ${comm.m2_payment_amount.toFixed(2)}
                                  </div>
                                </div>
                                {m2Status === 'eligible' && (
                                  <button
                                    onClick={() => onApprovePayment(comm.id, 'm2')}
                                    disabled={approvingPayment === `${comm.id}-m2`}
                                    className="ml-3 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {approvingPayment === `${comm.id}-m2` ? 'Approving...' : 'Approve Payment'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {managerOverrideInPeriod && comm.sales_manager_override_amount && comm.sales_manager_override_amount > 0 && (
                          <div className={`p-3 rounded border mt-3 ${
                            comm.manager_override_payment_status === 'paid' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-xs font-medium text-gray-700">Manager Override Payment</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {comm.manager_override_payment_status === 'paid'
                                    ? `Approved: ${new Date(comm.manager_override_paid_date!).toLocaleDateString()}`
                                    : comm.manager_override_payment_status === 'eligible'
                                    ? 'Eligible - Ready to Pay'
                                    : 'Pending'
                                  }
                                </div>
                                <div className={`text-lg font-bold mt-1 ${
                                  comm.manager_override_payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                                }`}>
                                  ${comm.sales_manager_override_amount.toFixed(2)}
                                </div>
                              </div>
                              {comm.manager_override_payment_status === 'eligible' && (
                                <button
                                  onClick={() => onApprovePayment(comm.id, 'manager_override')}
                                  disabled={approvingPayment === `${comm.id}-manager_override`}
                                  className="ml-3 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {approvingPayment === `${comm.id}-manager_override` ? 'Approving...' : 'Approve Payment'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
