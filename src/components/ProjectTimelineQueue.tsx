import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Package,
  Calendar,
  FileCheck,
  Zap,
  Home,
  Users,
  ClipboardCheck
} from 'lucide-react';
import CustomerProject from './CustomerProject';
import { supabase, type Customer } from '../lib/supabase';

type ProjectTimeline = {
  id: string;
  customer_id: string;
  site_survey_status: string;
  engineering_status: string;
  utility_status: string;
  permit_status: string;
  installation_status: string;
  material_order_status: string;
  inspection_status: string;
  pto_submitted_date: string | null;
  pto_approved_date: string | null;
  system_activated_date: string | null;
  activation_method: string;
  activation_completed_date: string | null;
  approved_for_site_survey: boolean;
  installation_scheduled_date: string | null;
  material_ordered_date: string | null;
};

type CustomerWithTimeline = Customer & {
  timeline: ProjectTimeline | null;
};

type QueueStage =
  | 'new_project'
  | 'site_survey'
  | 'engineering'
  | 'utility_permits'
  | 'coordinate_installation'
  | 'ready_to_order_material'
  | 'installation_scheduled'
  | 'ready_for_inspection'
  | 'pending_pto'
  | 'pending_activation'
  | 'system_activated';

const getCustomerQueue = (customer: CustomerWithTimeline): QueueStage => {
  const timeline = customer.timeline;

  if (!timeline || !timeline.approved_for_site_survey) return 'new_project';

  if (timeline.activation_completed_date || timeline.system_activated_date) return 'system_activated';
  if (timeline.pto_approved_date && timeline.activation_method === 'pending') return 'pending_activation';
  if (timeline.pto_submitted_date) return 'pending_pto';
  if (timeline.inspection_status === 'passed') return 'pending_pto';
  if (timeline.inspection_status === 'ready' || timeline.installation_status === 'completed') return 'ready_for_inspection';
  if (timeline.material_ordered_date) return 'installation_scheduled';
  if (timeline.installation_scheduled_date) return 'ready_to_order_material';
  if (timeline.permit_status === 'approved' && timeline.utility_status === 'approved') return 'coordinate_installation';
  if (timeline.engineering_status === 'completed') return 'utility_permits';
  if (timeline.site_survey_status === 'completed') return 'engineering';

  return 'site_survey';
};

const queueConfig = {
  new_project: {
    title: 'New Project Verification Queue',
    icon: ClipboardCheck,
    color: 'gray',
    description: 'Awaiting approval to proceed to site survey'
  },
  site_survey: {
    title: 'Site Survey Queue',
    icon: Home,
    color: 'blue',
    description: 'Pending schedule, scheduled, or awaiting completion'
  },
  engineering: {
    title: 'Engineering Queue',
    icon: FileCheck,
    color: 'violet',
    description: 'Site survey completed, pending engineering plans'
  },
  utility_permits: {
    title: 'Utility & Permits Application Queue',
    icon: FileCheck,
    color: 'indigo',
    description: 'Engineering complete, processing utility and city permits'
  },
  coordinate_installation: {
    title: 'Coordinate Installation',
    icon: Users,
    color: 'purple',
    description: 'Permits approved, working with customer to schedule installation date'
  },
  ready_to_order_material: {
    title: 'Ready to Order Material',
    icon: Package,
    color: 'amber',
    description: 'Installation date confirmed, ready to order material'
  },
  installation_scheduled: {
    title: 'Installation Scheduled',
    icon: Calendar,
    color: 'orange',
    description: 'Material ordered with delivery date, installation scheduled'
  },
  ready_for_inspection: {
    title: 'Ready for City Inspection',
    icon: FileCheck,
    color: 'teal',
    description: 'Installation completed, awaiting city inspection'
  },
  pending_pto: {
    title: 'Pending PTO',
    icon: Zap,
    color: 'yellow',
    description: 'Inspection passed, awaiting permission to operate'
  },
  pending_activation: {
    title: 'Pending Activation',
    icon: Zap,
    color: 'green',
    description: 'PTO approved, awaiting system activation'
  },
  system_activated: {
    title: 'System Activated',
    icon: CheckCircle2,
    color: 'emerald',
    description: 'System is active and operational'
  },
};

export default function ProjectTimelineQueue() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<CustomerWithTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQueues, setExpandedQueues] = useState<Set<QueueStage>>(new Set([
    'new_project',
    'site_survey',
    'engineering',
    'utility_permits',
    'coordinate_installation',
    'ready_to_order_material',
    'installation_scheduled',
    'ready_for_inspection',
    'pending_pto',
    'pending_activation'
  ]));

  useEffect(() => {
    loadCustomersWithTimeline();

    const channelName = `queue_updates_${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_timeline' }, () => {
        loadCustomersWithTimeline();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        loadCustomersWithTimeline();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const loadCustomersWithTimeline = async () => {
    setLoading(true);
    try {
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;

      const { data: timelinesData, error: timelinesError } = await supabase
        .from('project_timeline')
        .select('*');

      if (timelinesError) throw timelinesError;

      const customersWithTimeline: CustomerWithTimeline[] = (customersData || []).map(customer => ({
        ...customer,
        timeline: timelinesData?.find(t => t.customer_id === customer.id) || null
      }));

      setCustomers(customersWithTimeline);
    } catch (error) {
      console.error('Error loading customers with timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleBackToList = () => {
    setSelectedCustomer(null);
    loadCustomersWithTimeline();
  };

  const toggleQueue = (queue: QueueStage) => {
    setExpandedQueues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(queue)) {
        newSet.delete(queue);
      } else {
        newSet.add(queue);
      }
      return newSet;
    });
  };

  if (selectedCustomer) {
    return <CustomerProject customer={selectedCustomer} onBack={handleBackToList} />;
  }

  const queuedCustomers: Record<QueueStage, CustomerWithTimeline[]> = {
    new_project: [],
    site_survey: [],
    engineering: [],
    utility_permits: [],
    coordinate_installation: [],
    ready_to_order_material: [],
    installation_scheduled: [],
    ready_for_inspection: [],
    pending_pto: [],
    pending_activation: [],
    system_activated: [],
  };

  customers.forEach(customer => {
    const queue = getCustomerQueue(customer);
    queuedCustomers[queue].push(customer);
  });

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Project Timeline Overview</h2>
            <p className="text-xs text-gray-500">All customer projects organized by stage</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-2">
          {loading ? (
            <div className="bg-white rounded shadow-sm border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                <span className="text-sm text-gray-600">Loading customers...</span>
              </div>
            </div>
          ) : (
            Object.entries(queueConfig).map(([queueKey, config]) => {
              const queue = queueKey as QueueStage;
              const queueCustomers = queuedCustomers[queue];
              const isExpanded = expandedQueues.has(queue);
              const Icon = config.icon;

              return (
                <div key={queue} className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleQueue(queue)}
                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 text-${config.color}-600`} />
                      <div className="text-left">
                        <h3 className="text-sm font-semibold text-gray-900">{config.title}</h3>
                        <p className="text-xs text-gray-500">{config.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
                        {queueCustomers.length}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {queueCustomers.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-gray-500">
                          No customers in this queue
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {queueCustomers.map(customer => (
                            <div
                              key={customer.id}
                              onClick={() => handleSelectCustomer(customer)}
                              className="px-3 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                      {customer.customer_id}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900 truncate">
                                      {customer.full_name}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 truncate">{customer.installation_address}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
