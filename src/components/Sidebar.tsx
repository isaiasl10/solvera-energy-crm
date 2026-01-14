import { useState, useEffect } from 'react';
import { Calendar, Users, Settings, ChevronDown, ChevronRight, UserCog, LogOut, User, Eye, Layers, X, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export type ViewType = 'calendar' | 'customers' | 'proposals' | 'createProposal' | 'user-management' | 'employee-profile' | 'sales-manager-dashboard' | 'role-previews' | 'admin-analytics' | 'admin-custom-adders' | 'admin-inverters' | 'admin-optimizers' | 'admin-batteries' | 'admin-racking' | 'admin-panels' | 'admin-financing' | 'admin-payroll' | 'queue-new-project' | 'queue-site-survey' | 'queue-engineering' | 'queue-utility-permits' | 'queue-ready-to-order' | 'queue-coordinate-install' | 'queue-install-scheduled' | 'queue-ready-inspection' | 'queue-pending-pto' | 'queue-pending-activation' | 'queue-system-activated' | 'queue-service-tickets';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ currentView, onViewChange, isMobileOpen, onMobileClose }: SidebarProps) {
  const { isAdmin, isManagement, logout, user } = useAuth();
  const isAdminView = currentView.startsWith('admin-');
  const isQueueView = currentView.startsWith('queue-');
  const [adminExpanded, setAdminExpanded] = useState(isAdminView);
  const [queuesExpanded, setQueuesExpanded] = useState(isQueueView);
  const [queueCounts, setQueueCounts] = useState<Record<string, number>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userAppId, setUserAppId] = useState<string | null>(null);

  const handleViewChange = (view: ViewType) => {
    onViewChange(view);
    onMobileClose();
  };

  useEffect(() => {
    if (isAdminView) {
      setAdminExpanded(true);
    }
  }, [isAdminView]);

  useEffect(() => {
    if (isQueueView) {
      setQueuesExpanded(true);
    }
  }, [isQueueView]);

  useEffect(() => {
    loadUserData();
  }, [user]);

  useEffect(() => {
    if (userAppId !== null) {
      loadQueueCounts();
    }

    const subscription = supabase
      .channel('queue_counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_timeline' }, () => {
        loadQueueCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduling' }, () => {
        loadQueueCounts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userAppId, userRole]);

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

  const loadQueueCounts = async () => {
    try {
      let customersQuery = supabase.from('customers').select('id');

      if (userRole === 'sales_rep' && userAppId) {
        customersQuery = customersQuery.eq('sales_rep_id', userAppId);
      }

      const { data: customers } = await customersQuery;
      const { data: timelines } = await supabase.from('project_timeline').select('*');

      const counts: Record<string, number> = {
        'new_project': 0,
        'site_survey': 0,
        'engineering': 0,
        'utility_permits': 0,
        'ready_to_order': 0,
        'coordinate_install': 0,
        'install_scheduled': 0,
        'ready_inspection': 0,
        'pending_pto': 0,
        'pending_activation': 0,
        'system_activated': 0,
        'service_tickets': 0,
      };

      customers?.forEach(customer => {
        const timeline = timelines?.find(t => t.customer_id === customer.id);
        const queue = getCustomerQueue(timeline);
        counts[queue]++;
      });

      const { data: serviceTickets } = await supabase
        .from('scheduling')
        .select('*')
        .eq('ticket_type', 'service')
        .in('ticket_status', ['open', 'in_progress', 'scheduled'])
        .eq('is_active', true);

      counts['service_tickets'] = serviceTickets?.length || 0;

      setQueueCounts(counts);
    } catch (error) {
      console.error('Error loading queue counts:', error);
    }
  };

  const getCustomerQueue = (timeline: any): string => {
    if (!timeline || !timeline.approved_for_site_survey) return 'new_project';
    if (timeline.activation_completed_date || timeline.system_activated_date) return 'system_activated';
    if (timeline.pto_approved_date) return 'pending_activation';
    if (timeline.pto_submitted_date || timeline.inspection_status === 'passed') return 'pending_pto';
    if (timeline.inspection_status === 'ready' || timeline.installation_status === 'completed') return 'ready_inspection';
    if (timeline.material_ordered_date) return 'install_scheduled';
    if (timeline.installation_scheduled_date) return 'ready_to_order';
    if (timeline.permit_status === 'approved' && timeline.utility_status === 'approved') return 'coordinate_install';
    if (timeline.engineering_status === 'completed') return 'utility_permits';
    if (timeline.site_survey_status === 'completed') return 'engineering';
    return 'site_survey';
  };

  const queueItems = [
    { id: 'queue-new-project' as ViewType, label: 'New Project Queue', key: 'new_project' },
    { id: 'queue-site-survey' as ViewType, label: 'Site Survey', key: 'site_survey' },
    { id: 'queue-engineering' as ViewType, label: 'Engineering', key: 'engineering' },
    { id: 'queue-utility-permits' as ViewType, label: 'Utility & Permits', key: 'utility_permits' },
    { id: 'queue-ready-to-order' as ViewType, label: 'Ready to Order Material', key: 'ready_to_order' },
    { id: 'queue-coordinate-install' as ViewType, label: 'Coordinate Installation', key: 'coordinate_install' },
    { id: 'queue-install-scheduled' as ViewType, label: 'Installation Scheduled', key: 'install_scheduled' },
    { id: 'queue-ready-inspection' as ViewType, label: 'Ready for Inspection', key: 'ready_inspection' },
    { id: 'queue-pending-pto' as ViewType, label: 'Pending PTO', key: 'pending_pto' },
    { id: 'queue-pending-activation' as ViewType, label: 'Pending Activation', key: 'pending_activation' },
    { id: 'queue-system-activated' as ViewType, label: 'System Activated', key: 'system_activated' },
    { id: 'queue-service-tickets' as ViewType, label: 'Service Tickets', key: 'service_tickets' },
  ];

  const adminSubItems = [
    { id: 'admin-analytics' as ViewType, label: 'Analytics' },
    { id: 'admin-payroll' as ViewType, label: 'Payroll' },
    { id: 'admin-custom-adders' as ViewType, label: 'Custom Adders' },
    { id: 'admin-financing' as ViewType, label: 'Financing' },
    { id: 'admin-inverters' as ViewType, label: 'Inverters' },
    { id: 'admin-optimizers' as ViewType, label: 'Optimizers' },
    { id: 'admin-batteries' as ViewType, label: 'Batteries' },
    { id: 'admin-racking' as ViewType, label: 'Racking' },
    { id: 'admin-panels' as ViewType, label: 'Panels' },
  ];

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <div className={`
        w-48 bg-gray-900 text-white h-[100dvh] lg:h-screen flex flex-col
        fixed lg:static inset-y-0 left-0 z-50
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-2 py-2 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <img
            src="/solvera_energy_logo_redesign.png"
            alt="Solvera Energy"
            className="w-full h-auto object-contain"
          />
          <button
            onClick={onMobileClose}
            className="lg:hidden text-gray-400 hover:text-white ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      <nav className="flex-1 p-2 overflow-y-auto min-h-0">
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => handleViewChange('calendar')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                currentView === 'calendar'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="font-medium">Calendar</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => handleViewChange('customers')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                currentView === 'customers'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="font-medium">Customers</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => handleViewChange('proposals')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                currentView === 'proposals'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="font-medium">Proposals</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setQueuesExpanded(!queuesExpanded)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                isQueueView
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="font-medium">Queues</span>
              {queuesExpanded ? (
                <ChevronDown className="w-3 h-3 ml-auto" />
              ) : (
                <ChevronRight className="w-3 h-3 ml-auto" />
              )}
            </button>
            {queuesExpanded && (
              <ul className="mt-1 ml-3 space-y-1">
                {queueItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleViewChange(item.id)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors text-xs flex items-center justify-between ${
                        currentView === item.id
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {queueCounts[item.key] > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-orange-600 text-white rounded-full text-[10px] font-bold">
                          {queueCounts[item.key]}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
          {userRole === 'sales_manager' && (
            <li>
              <button
                onClick={() => handleViewChange('sales-manager-dashboard')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  currentView === 'sales-manager-dashboard'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="font-medium">Sales Manager Dashboard</span>
              </button>
            </li>
          )}
          {!isAdmin && !isManagement && (
            <li>
              <button
                onClick={() => handleViewChange('employee-profile')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  currentView === 'employee-profile'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="font-medium">My Profile</span>
              </button>
            </li>
          )}
          {(isAdmin || isManagement) && (
            <li>
              <button
                onClick={() => handleViewChange('user-management')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  currentView === 'user-management'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <UserCog className="w-4 h-4" />
                <span className="font-medium">User Logins</span>
              </button>
            </li>
          )}
          {isAdmin && (
            <>
              <li>
                <button
                  onClick={() => handleViewChange('role-previews')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    currentView === 'role-previews'
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span className="font-medium">Role Previews</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setAdminExpanded(!adminExpanded)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    isAdminView
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-medium">Administration</span>
                  {adminExpanded ? (
                    <ChevronDown className="w-3 h-3 ml-auto" />
                  ) : (
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  )}
                </button>
                {adminExpanded && (
                  <ul className="mt-1 ml-3 space-y-1">
                    {adminSubItems.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => handleViewChange(item.id)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors text-xs ${
                            currentView === item.id
                              ? 'bg-orange-500 text-white'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            </>
          )}
        </ul>
      </nav>

      <div className="p-2 border-t border-gray-700 flex-shrink-0">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm text-gray-300 hover:bg-gray-800"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
    </>
  );
}
