import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, FileText, DollarSign, CreditCard, Package, FileCheck, Users, ArrowRight } from 'lucide-react';
import { supabase, type Customer } from '../lib/supabase';
import CustomerProject from './CustomerProject';
import { useAuth } from '../contexts/AuthContext';

type QueueType =
  | 'new_project'
  | 'site_survey'
  | 'engineering'
  | 'utility_permits'
  | 'ready_to_order'
  | 'coordinate_install'
  | 'install_scheduled'
  | 'ready_inspection'
  | 'pending_pto'
  | 'pending_activation'
  | 'system_activated';

type ProjectTimeline = {
  id: string;
  customer_id: string;
  new_project_status: string;
  customer_details_verified: boolean;
  system_pricing_verified: boolean;
  financing_verified: boolean;
  contract_id_verified: boolean;
  adders_verified: boolean;
  solar_contract_uploaded: boolean;
  utility_bill_uploaded: boolean;
  customer_id_uploaded: boolean;
  approved_for_site_survey: boolean;
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
  material_quote_received: boolean;
  customer_delivery_confirmed: boolean;
  activation_method: string;
  activation_completed_date: string | null;
  installation_scheduled_date: string | null;
  material_ordered_date: string | null;
};

type CustomerWithTimeline = Customer & {
  timeline: ProjectTimeline | null;
};

interface QueueDetailViewProps {
  queueType: QueueType;
}

const queueConfig: Record<QueueType, { title: string; description: string }> = {
  new_project: {
    title: 'New Project Queue',
    description: 'Projects requiring verification before moving to site survey'
  },
  site_survey: {
    title: 'Site Survey Queue',
    description: 'Pending schedule, scheduled, or awaiting completion'
  },
  engineering: {
    title: 'Engineering Queue',
    description: 'Site survey completed, pending engineering plans'
  },
  utility_permits: {
    title: 'Utility & Permits Application Queue',
    description: 'Engineering complete, processing utility and city permits'
  },
  coordinate_install: {
    title: 'Coordinate Installation',
    description: 'Permits approved, working with customer to schedule installation date'
  },
  ready_to_order: {
    title: 'Ready to Order Material',
    description: 'Installation date confirmed, ready to order material'
  },
  install_scheduled: {
    title: 'Installation Scheduled',
    description: 'Material ordered with delivery date, installation scheduled'
  },
  ready_inspection: {
    title: 'Ready for City Inspection',
    description: 'Installation completed, awaiting city inspection'
  },
  pending_pto: {
    title: 'Pending PTO',
    description: 'Inspection passed, awaiting permission to operate'
  },
  pending_activation: {
    title: 'Pending Activation',
    description: 'PTO approved, awaiting system activation'
  },
  system_activated: {
    title: 'System Activated',
    description: 'System is active and operational'
  },
};

export default function QueueDetailView({ queueType }: QueueDetailViewProps) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerWithTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userAppId, setUserAppId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, [user]);

  useEffect(() => {
    if (userAppId !== null) {
      loadCustomers();
    }
  }, [queueType, refreshTrigger, userAppId]);

  const loadUserData = async () => {
    if (!user?.email) return;

    try {
      const { data } = await supabase
        .from('app_users')
        .select('id, role')
        .eq('email', user.email)
        .maybeSingle();

      if (data) {
        setUserAppId(data.id);
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      let customersQuery = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (userRole === 'sales_rep' && userAppId) {
        customersQuery = customersQuery.eq('sales_rep_id', userAppId);
      }

      const { data: customersData, error: customersError } = await customersQuery;

      if (customersError) throw customersError;

      const { data: timelinesData, error: timelinesError } = await supabase
        .from('project_timeline')
        .select('*');

      if (timelinesError) throw timelinesError;

      const customersWithTimeline: CustomerWithTimeline[] = (customersData || []).map(customer => ({
        ...customer,
        timeline: timelinesData?.find(t => t.customer_id === customer.id) || null
      }));

      const filteredCustomers = customersWithTimeline.filter(customer => {
        const queue = getCustomerQueue(customer.timeline);
        return queue === queueType;
      });

      setCustomers(filteredCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerQueue = (timeline: ProjectTimeline | null): QueueType => {
    if (!timeline || !timeline.approved_for_site_survey) return 'new_project';
    if (timeline.activation_completed_date || timeline.system_activated_date) return 'system_activated';
    if (timeline.pto_approved_date && timeline.activation_method === 'pending') return 'pending_activation';
    if (timeline.pto_submitted_date || timeline.inspection_status === 'passed') return 'pending_pto';
    if (timeline.inspection_status === 'ready' || timeline.installation_status === 'completed') return 'ready_inspection';
    if (timeline.material_ordered_date) return 'install_scheduled';
    if (timeline.installation_scheduled_date) return 'ready_to_order';
    if (timeline.permit_status === 'approved' && timeline.utility_status === 'approved') return 'coordinate_install';
    if (timeline.engineering_status === 'completed') return 'utility_permits';
    if (timeline.site_survey_status === 'completed') return 'engineering';
    return 'site_survey';
  };

  const handleUpdateTimeline = async (customerId: string, updates: Partial<ProjectTimeline>) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      if (customer.timeline?.id) {
        const { error } = await supabase
          .from('project_timeline')
          .update(updates)
          .eq('id', customer.timeline.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_timeline')
          .insert([{ customer_id: customerId, ...updates }]);

        if (error) throw error;
      }

      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error updating timeline:', error);
      alert('Failed to update');
    }
  };

  const handleApproveForSiteSurvey = async (customer: CustomerWithTimeline) => {
    if (!customer.timeline) return;

    const allVerified =
      customer.timeline.customer_details_verified &&
      customer.timeline.system_pricing_verified &&
      customer.timeline.financing_verified &&
      customer.timeline.contract_id_verified &&
      customer.timeline.adders_verified &&
      customer.timeline.solar_contract_uploaded &&
      customer.timeline.utility_bill_uploaded &&
      customer.timeline.customer_id_uploaded;

    if (!allVerified) {
      alert('Please complete all verification items before approving for site survey.');
      return;
    }

    await handleUpdateTimeline(customer.id, {
      approved_for_site_survey: true,
      site_survey_status: 'pending_schedule'
    });
  };

  if (selectedCustomer) {
    return (
      <CustomerProject
        customer={selectedCustomer}
        onBack={() => {
          setSelectedCustomer(null);
          setRefreshTrigger(prev => prev + 1);
        }}
      />
    );
  }

  const config = queueConfig[queueType];

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-3 py-2">
        <h2 className="text-base font-bold text-gray-900">{config.title}</h2>
        <p className="text-xs text-gray-500">{config.description}</p>
        <p className="text-xs text-gray-600 mt-1">{customers.length} project{customers.length !== 1 ? 's' : ''} in queue</p>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
              <span className="text-sm text-gray-600">Loading projects...</span>
            </div>
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-500">No projects in this queue</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map(customer => (
              <div key={customer.id} className="bg-white rounded shadow-sm border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                        {customer.customer_id}
                      </span>
                      <button
                        onClick={() => setSelectedCustomer(customer)}
                        className="text-sm font-semibold text-gray-900 hover:text-orange-600 transition-colors"
                      >
                        {customer.full_name}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">{customer.address}</p>
                    <p className="text-xs text-gray-500">System: {customer.system_size_kw} kW</p>
                  </div>

                  <button
                    onClick={() => setSelectedCustomer(customer)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors whitespace-nowrap"
                  >
                    View Details
                  </button>
                </div>

                {queueType === 'new_project' && customer.timeline && (
                  <NewProjectVerification
                    customer={customer}
                    onUpdate={handleUpdateTimeline}
                    onApprove={handleApproveForSiteSurvey}
                  />
                )}

                {queueType === 'ready_to_order' && customer.timeline && (
                  <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={customer.timeline.material_quote_received}
                        onChange={(e) => handleUpdateTimeline(customer.id, { material_quote_received: e.target.checked })}
                        className="rounded text-orange-600"
                      />
                      <span className={customer.timeline.material_quote_received ? 'text-green-600 font-medium' : 'text-gray-600'}>
                        Material Quote Received
                      </span>
                      {customer.timeline.material_quote_received && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={customer.timeline.customer_delivery_confirmed}
                        onChange={(e) => handleUpdateTimeline(customer.id, { customer_delivery_confirmed: e.target.checked })}
                        className="rounded text-orange-600"
                      />
                      <span className={customer.timeline.customer_delivery_confirmed ? 'text-green-600 font-medium' : 'text-gray-600'}>
                        Customer Delivery Confirmed
                      </span>
                      {customer.timeline.customer_delivery_confirmed && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                    </label>
                  </div>
                )}

                {queueType === 'pending_activation' && customer.timeline && (
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateTimeline(customer.id, { activation_method: 'tech_dispatch' })}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <Users className="w-3 h-3" />
                        Schedule Tech Dispatch
                      </button>
                      <button
                        onClick={() => handleUpdateTimeline(customer.id, {
                          activation_method: 'remote',
                          activation_completed_date: new Date().toISOString()
                        })}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Activate Remotely
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type NewProjectVerificationProps = {
  customer: CustomerWithTimeline;
  onUpdate: (customerId: string, updates: Partial<ProjectTimeline>) => void;
  onApprove: (customer: CustomerWithTimeline) => void;
};

function NewProjectVerification({ customer, onUpdate, onApprove }: NewProjectVerificationProps) {
  const timeline = customer.timeline!;

  const verificationItems = [
    {
      key: 'customer_details_verified' as const,
      label: 'Customer Details Complete',
      description: 'All customer information filled out',
      icon: Users,
      checked: timeline.customer_details_verified
    },
    {
      key: 'system_pricing_verified' as const,
      label: 'System Size & Pricing Verified',
      description: 'System size and contract price verified',
      icon: DollarSign,
      checked: timeline.system_pricing_verified
    },
    {
      key: 'financing_verified' as const,
      label: 'Financing Verified',
      description: 'Contract price matches financing details',
      icon: CreditCard,
      checked: timeline.financing_verified
    },
    {
      key: 'contract_id_verified' as const,
      label: 'Contract ID Verified',
      description: 'Contract matches customer ID',
      icon: FileCheck,
      checked: timeline.contract_id_verified
    },
    {
      key: 'adders_verified' as const,
      label: 'Adders Verified',
      description: 'Adders from contract properly added to system',
      icon: Package,
      checked: timeline.adders_verified
    },
    {
      key: 'solar_contract_uploaded' as const,
      label: 'Solar Contract Uploaded',
      description: 'Solar contract document in system',
      icon: FileText,
      checked: timeline.solar_contract_uploaded
    },
    {
      key: 'utility_bill_uploaded' as const,
      label: 'Utility Bill Uploaded',
      description: 'Utility bill document in system',
      icon: FileText,
      checked: timeline.utility_bill_uploaded
    },
    {
      key: 'customer_id_uploaded' as const,
      label: 'Customer ID Uploaded',
      description: 'Customer ID document in system',
      icon: FileText,
      checked: timeline.customer_id_uploaded
    },
  ];

  const allVerified = verificationItems.every(item => item.checked);
  const completedCount = verificationItems.filter(item => item.checked).length;

  return (
    <div className="border-t border-gray-200 pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-900">Project Verification</h3>
        <span className="text-xs text-gray-500">
          {completedCount} of {verificationItems.length} completed
        </span>
      </div>

      <div className="space-y-1 mb-3">
        {verificationItems.map((item) => {
          const Icon = item.icon;
          return (
            <label key={item.key} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => onUpdate(customer.id, { [item.key]: e.target.checked })}
                className="mt-0.5 rounded text-orange-600"
              />
              <Icon className={`w-3 h-3 mt-0.5 ${item.checked ? 'text-green-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                <div className={`font-medium ${item.checked ? 'text-green-600' : 'text-gray-700'}`}>
                  {item.label}
                  {item.checked && <CheckCircle2 className="w-3 h-3 inline ml-1" />}
                </div>
                <div className="text-gray-500">{item.description}</div>
              </div>
            </label>
          );
        })}
      </div>

      {allVerified ? (
        <button
          onClick={() => onApprove(customer)}
          className="w-full px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve for Site Survey
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertCircle className="w-4 h-4" />
          Complete all verifications to approve for site survey
        </div>
      )}
    </div>
  );
}
