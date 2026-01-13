import { useEffect, useState } from 'react';
import { supabase, type Customer } from '../lib/supabase';
import { Users, Mail, Phone, MapPin, Zap, Loader2, Search, User } from 'lucide-react';

type CustomerWithTimeline = Customer & {
  timelineStage: string;
  salesRepName?: string;
};

type CustomerListProps = {
  refreshTrigger: number;
  onSelectCustomer: (customer: Customer) => void;
  searchQuery?: string;
  statusFilter?: string;
};

export default function CustomerList({ refreshTrigger, onSelectCustomer, searchQuery = '', statusFilter = 'all' }: CustomerListProps) {
  const [customers, setCustomers] = useState<CustomerWithTimeline[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();

    const customersSubscription = supabase
      .channel('customers_list_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
        },
        () => {
          fetchCustomers();
        }
      )
      .subscribe();

    const timelinesSubscription = supabase
      .channel('project_timeline_list_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_timeline',
        },
        () => {
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      customersSubscription.unsubscribe();
      timelinesSubscription.unsubscribe();
    };
  }, [refreshTrigger]);

  useEffect(() => {
    let filtered = customers;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((customer) => {
        return (
          customer.customer_id?.toLowerCase().includes(query) ||
          customer.full_name.toLowerCase().includes(query) ||
          customer.email.toLowerCase().includes(query) ||
          customer.phone_number.toLowerCase().includes(query) ||
          customer.installation_address.toLowerCase().includes(query)
        );
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((customer) => {
        const stage = customer.timelineStage.toLowerCase();
        switch (statusFilter) {
          case 'pending':
            return stage.includes('new lead') || stage.includes('pending');
          case 'site_survey':
            return stage.includes('survey');
          case 'engineering':
            return stage.includes('engineering');
          case 'permits':
            return stage.includes('permit') || stage.includes('utility');
          case 'installation':
            return stage.includes('installation') || stage.includes('inspection');
          case 'completed':
            return stage.includes('activated') || stage.includes('pto approved');
          default:
            return true;
        }
      });
    }

    setFilteredCustomers(filtered);
  }, [searchQuery, statusFilter, customers]);

  const getTimelineStage = (timeline: any): string => {
    if (!timeline) return 'New Lead';

    if (timeline.system_activated_date) return 'System Activated';
    if (timeline.pto_approved_date) return 'PTO Approved';
    if (timeline.pto_submitted_date) return 'PTO Submitted';
    if (timeline.service_completed_date) return 'Service Complete';
    if (timeline.city_inspection_status === 'passed') return 'Inspection Passed';
    if (timeline.city_inspection_date) return 'Inspection Scheduled';
    if (timeline.installation_completed_date) return 'Installation Complete';
    if (timeline.installation_scheduled_date) return 'Installation Scheduled';
    if (timeline.material_ordered_date) return 'Materials Ordered';
    if (timeline.city_permits_approved_date) return 'Permits Approved';
    if (timeline.city_permits_submitted_date) return 'Permits Submitted';
    if (timeline.utility_application_approved_date) return 'Utility Approved';
    if (timeline.utility_application_submitted_date) return 'Utility Submitted';
    if (timeline.engineering_plans_received_date) return 'Engineering Complete';
    if (timeline.site_survey_completed_date && timeline.engineering_status === 'pending') return 'Survey Complete - Pending Engineering';
    if (timeline.site_survey_completed_date) return 'Survey Complete';
    if (timeline.site_survey_scheduled_date) return 'Survey Scheduled';

    return 'New Lead';
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data: customersData, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const customerIds = customersData?.map(c => c.id) || [];

      const { data: timelinesData } = await supabase
        .from('project_timeline')
        .select('*')
        .in('customer_id', customerIds);

      const salesRepIds = customersData
        ?.map(c => c.sales_rep_id)
        .filter((id): id is string => id !== null && id !== undefined) || [];

      const { data: salesRepsData } = await supabase
        .from('app_users')
        .select('id, full_name')
        .in('id', salesRepIds);

      const customersWithTimeline = (customersData || []).map(customer => {
        const timeline = timelinesData?.find(t => t.customer_id === customer.id);
        const salesRep = salesRepsData?.find(rep => rep.id === customer.sales_rep_id);
        return {
          ...customer,
          timelineStage: getTimelineStage(timeline),
          salesRepName: salesRep?.full_name || 'Not assigned',
        };
      });

      setCustomers(customersWithTimeline);
      setFilteredCustomers(customersWithTimeline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No customers yet</h3>
        <p className="text-gray-500">Add your first customer to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-500">Try adjusting your search terms or filters.</p>
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-500 mb-2">
            {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredCustomers.map((customer) => (
        <div
          key={customer.id}
          onClick={() => onSelectCustomer(customer)}
          className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-all cursor-pointer hover:border-orange-300"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                  {customer.customer_id}
                </span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-0.5">
                {customer.full_name}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {customer.timelineStage}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 mb-2">
            <div className="flex items-start gap-3 text-gray-600">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{customer.installation_address}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{customer.email}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Phone className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{customer.phone_number}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">
                <span className="font-medium">Sales Rep:</span> {customer.salesRepName}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-900">System Details</span>
            </div>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-gray-500">System Size:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {customer.system_size_kw} kW
                </span>
              </div>
              <div>
                <span className="text-gray-500">Panels:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {customer.panel_quantity}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Wattage:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {customer.panel_wattage}W
                </span>
              </div>
              <div>
                <span className="text-gray-500">Panel Brand:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {customer.panel_brand}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Inverter:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {customer.inverter_option}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Racking:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {customer.racking_type}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              Added {new Date(customer.created_at).toLocaleDateString()} at{' '}
              {new Date(customer.created_at).toLocaleTimeString()}
            </span>
          </div>
        </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
