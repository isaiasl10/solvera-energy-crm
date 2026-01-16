import { useEffect, useState } from 'react';
import { TrendingUp, Calendar, DollarSign, Zap, Package, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type TimeRange = 'monthly' | 'annual';

type MetricData = {
  period: string;
  panelsInstalled: number;
  totalKw: number;
  grossRevenue: number;
  netRevenue: number;
  bomCost: number;
  permitEngineeringCost: number;
  projectCount: number;
  avgDaysToInstall: number | null;
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, selectedYear]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select(`
          id,
          created_at,
          signature_date,
          panel_quantity,
          system_size_kw,
          contract_price,
          bom_cost,
          permit_engineering_cost,
          job_source,
          gross_revenue,
          net_revenue
        `)
        .eq('is_active', true);

      if (customersError) throw customersError;

      const { data: timelines, error: timelinesError } = await supabase
        .from('project_timeline')
        .select('customer_id, installation_completed_date');

      if (timelinesError) throw timelinesError;

      const timelineMap = new Map(
        timelines?.map(t => [t.customer_id, t.installation_completed_date]) || []
      );

      const years = new Set<number>();
      const groupedData = new Map<string, MetricData>();

      customers?.forEach(customer => {
        const signatureDate = customer.signature_date
          ? new Date(customer.signature_date)
          : new Date(customer.created_at);

        const year = signatureDate.getFullYear();
        const month = signatureDate.getMonth() + 1;

        years.add(year);

        if (timeRange === 'annual') {
          if (year !== selectedYear) return;
        } else {
          if (year !== selectedYear) return;
        }

        const periodKey = timeRange === 'annual'
          ? year.toString()
          : `${year}-${month.toString().padStart(2, '0')}`;

        const periodLabel = timeRange === 'annual'
          ? year.toString()
          : new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        if (!groupedData.has(periodKey)) {
          groupedData.set(periodKey, {
            period: periodLabel,
            panelsInstalled: 0,
            totalKw: 0,
            grossRevenue: 0,
            netRevenue: 0,
            bomCost: 0,
            permitEngineeringCost: 0,
            projectCount: 0,
            avgDaysToInstall: null,
          });
        }

        const metric = groupedData.get(periodKey)!;
        metric.panelsInstalled += customer.panel_quantity || 0;
        metric.totalKw += parseFloat(customer.system_size_kw?.toString() || '0');

        if (customer.job_source === 'subcontract') {
          metric.grossRevenue += parseFloat(customer.gross_revenue?.toString() || '0');
          metric.netRevenue += parseFloat(customer.net_revenue?.toString() || '0');
        } else {
          metric.grossRevenue += parseFloat(customer.contract_price?.toString() || '0');
          metric.bomCost += parseFloat(customer.bom_cost?.toString() || '0');
          metric.permitEngineeringCost += parseFloat(customer.permit_engineering_cost?.toString() || '0');
          metric.netRevenue += metric.grossRevenue - metric.bomCost - metric.permitEngineeringCost;
        }

        metric.projectCount += 1;

        const installDate = timelineMap.get(customer.id);
        if (customer.signature_date && installDate) {
          const signDate = new Date(customer.signature_date);
          const completionDate = new Date(installDate);
          const daysDiff = Math.floor((completionDate.getTime() - signDate.getTime()) / (1000 * 60 * 60 * 24));

          if (metric.avgDaysToInstall === null) {
            metric.avgDaysToInstall = daysDiff;
          } else {
            metric.avgDaysToInstall = (metric.avgDaysToInstall + daysDiff) / 2;
          }
        }
      });

      const sortedYears = Array.from(years).sort((a, b) => b - a);
      setAvailableYears(sortedYears);

      const sortedMetrics = Array.from(groupedData.values()).sort((a, b) => {
        if (timeRange === 'annual') {
          return b.period.localeCompare(a.period);
        }
        return b.period.localeCompare(a.period);
      });

      setMetrics(sortedMetrics);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const totals = metrics.reduce(
    (acc, metric) => ({
      panelsInstalled: acc.panelsInstalled + metric.panelsInstalled,
      totalKw: acc.totalKw + metric.totalKw,
      grossRevenue: acc.grossRevenue + metric.grossRevenue,
      netRevenue: acc.netRevenue + metric.netRevenue,
      bomCost: acc.bomCost + metric.bomCost,
      permitEngineeringCost: acc.permitEngineeringCost + metric.permitEngineeringCost,
      projectCount: acc.projectCount + metric.projectCount,
    }),
    {
      panelsInstalled: 0,
      totalKw: 0,
      grossRevenue: 0,
      netRevenue: 0,
      bomCost: 0,
      permitEngineeringCost: 0,
      projectCount: 0,
    }
  );

  const avgDaysToInstall = metrics
    .filter(m => m.avgDaysToInstall !== null)
    .reduce((sum, m, _, arr) => sum + (m.avgDaysToInstall || 0) / arr.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics & Reports</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">View comprehensive project and financial metrics</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="min-h-[44px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTimeRange('monthly')}
                className={`min-h-[44px] flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  timeRange === 'monthly'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setTimeRange('annual')}
                className={`min-h-[44px] flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  timeRange === 'annual'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Panels</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totals.panelsInstalled)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total kW</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totals.totalKw)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Gross Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totals.grossRevenue)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Net Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totals.netRevenue)}</p>
              </div>
              <div className="p-3 bg-teal-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">BOM Cost</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totals.bomCost)}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Permit & Engineering</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totals.permitEngineeringCost)}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Days to Install</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {avgDaysToInstall > 0 ? Math.round(avgDaysToInstall) : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-slate-100 rounded-lg">
                <Clock className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totals.projectCount}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              {timeRange === 'monthly' ? 'Monthly Breakdown' : 'Annual Summary'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Period
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Projects
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Panels
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Total kW
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Gross Revenue
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    BOM Cost
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Permit & Eng
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Net Revenue
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Avg Days
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500">
                      No data available for the selected period
                    </td>
                  </tr>
                ) : (
                  metrics.map((metric, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {metric.period}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {metric.projectCount}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatNumber(metric.panelsInstalled)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatNumber(metric.totalKw)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-right font-medium text-emerald-600">
                        {formatCurrency(metric.grossRevenue)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-right text-orange-600">
                        {formatCurrency(metric.bomCost)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-right text-amber-600">
                        {formatCurrency(metric.permitEngineeringCost)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-right font-medium text-teal-600">
                        {formatCurrency(metric.netRevenue)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {metric.avgDaysToInstall !== null ? Math.round(metric.avgDaysToInstall) : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
