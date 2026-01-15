import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar, { type ViewType } from './components/Sidebar';
import Calendar from './components/Calendar';
import CustomerQueue from './components/CustomerQueue';
import QueueDetailView from './components/QueueDetailView';
import ServiceTicketsQueue from './components/ServiceTicketsQueue';
import UserManagement from './components/UserManagement';
import Proposals from './components/Proposals';
import CreateProposal from './components/CreateProposal';
import CustomerPricing from './components/CustomerPricing';
import Analytics from './components/admin/Analytics';
import Payroll from './components/admin/Payroll';
import CustomAdders from './components/admin/CustomAdders';
import FinancingManagement from './components/admin/FinancingManagement';
import Inverters from './components/admin/Inverters';
import Optimizers from './components/admin/Optimizers';
import Batteries from './components/admin/Batteries';
import Racking from './components/admin/Racking';
import Panels from './components/admin/Panels';
import FieldTechDashboard from './components/FieldTechDashboard';
import SalesManagerDashboard from './components/SalesManagerDashboard';
import EmployeeProfileView from './components/EmployeeProfileView';
import RolePreviews from './components/RolePreviews';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import FirstLoginPasswordReset from './components/FirstLoginPasswordReset';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user, loading, requiresPasswordReset, refreshUser, isAdmin, isManagement, isSalesManager } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const saved = localStorage.getItem('currentView');
    return (saved as ViewType) || 'calendar';
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(() => {
    return localStorage.getItem('selectedCustomerId') || null;
  });
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    if (selectedCustomerId) {
      localStorage.setItem('selectedCustomerId', selectedCustomerId);
    } else {
      localStorage.removeItem('selectedCustomerId');
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    if (!user) return;

    const savedView = localStorage.getItem('currentView');

    if (isAdmin) {
      if (!savedView || savedView === 'sales-manager-dashboard') {
        setCurrentView('administration');
      }
    } else if (isSalesManager) {
      if (!savedView) {
        setCurrentView('sales-manager-dashboard');
      }
    }
  }, [user, isAdmin, isSalesManager]);

  const handleViewCustomerProject = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setCurrentView('customers');
  };

  const handleOpenCreateProposal = (proposalId: string) => {
    setActiveProposalId(proposalId);
    setCurrentView('createProposal');
  };

  const handleOpenCustomerPricing = (proposalId: string) => {
    setActiveProposalId(proposalId);
    setCurrentView('customerPricing');
  };

  if (currentPath === '/reset-password') {
    return <ResetPassword />;
  }

  if (!user) {
    return <Login loading={loading} />;
  }

  if (requiresPasswordReset) {
    return <FirstLoginPasswordReset onSuccess={refreshUser} />;
  }

  if (user?.role_category === 'field_tech') {
    return <FieldTechDashboard />;
  }

  const renderView = () => {
    if (currentView === 'employee-profile') {
      return <EmployeeProfileView />;
    }

    if (currentView === 'sales-manager-dashboard') {
      if (!isSalesManager) {
        setCurrentView('calendar');
        return <Calendar onViewCustomerProject={handleViewCustomerProject} />;
      }
      return <SalesManagerDashboard />;
    }

    if (currentView === 'role-previews') {
      if (!isAdmin) {
        setCurrentView('calendar');
        return <Calendar onViewCustomerProject={handleViewCustomerProject} />;
      }
      return <RolePreviews />;
    }

    switch (currentView) {
      case 'calendar':
        return <Calendar onViewCustomerProject={handleViewCustomerProject} />;
      case 'customers':
        return <CustomerQueue initialCustomerId={selectedCustomerId} onCustomerChange={() => setSelectedCustomerId(null)} />;
      case 'proposals':
        return <Proposals onOpenCreateProposal={handleOpenCreateProposal} onOpenCustomerPricing={handleOpenCustomerPricing} />;
      case 'createProposal':
        return <CreateProposal proposalId={activeProposalId || ''} onBack={() => setCurrentView('proposals')} />;
      case 'customerPricing':
        return <CustomerPricing proposalId={activeProposalId} onBack={() => setCurrentView('proposals')} />;
      case 'user-management':
        if (!isAdmin && !isManagement) {
          setCurrentView('calendar');
          return <Calendar onViewCustomerProject={handleViewCustomerProject} />;
        }
        return <UserManagement />;
      case 'admin-analytics':
        if (!isAdmin) {
          setCurrentView('calendar');
          return <Calendar onViewCustomerProject={handleViewCustomerProject} />;
        }
        return <Analytics />;
      case 'admin-payroll':
        if (!isAdmin) {
          setCurrentView('calendar');
          return <Calendar onViewCustomerProject={handleViewCustomerProject} />;
        }
        return <Payroll />;
      case 'admin-custom-adders':
        if (!isAdmin) {
          setCurrentView('calendar');
          return <Calendar onViewCustomerProject={handleViewCustomerProject} />;
        }
        return <CustomAdders />;
      case 'admin-financing':
        if (!isAdmin) {
          setCurrentView('calendar');
          return <Calendar onViewCustomerProject={handleViewCustomerProject} />;
        }
        return <FinancingManagement />;
      case 'admin-inverters':
        if (!isAdmin) {
          setCurrentView('calendar');
          return <Calendar onViewCustomerProject={handleViewCustomerProject} />;
        }
        return <Inverters />;
      case 'admin-optimizers':
        if (!isAdmin) {
          setCurrentView('calendar');
          return <Calendar onViewCustomerProject={handleViewCustomerProject} />;
        }
        return <Optimizers />;
      case 'admin-batteries':
        if (!isAdmin) {
          setCurrentView('calendar');
          return <Calendar onViewCustomerProject={handleViewCustomerProject} />;
        }
        return <Batteries />;
      case 'admin-racking':
        if (!isAdmin) {
          setCurrentView('calendar');
          return <Calendar onViewCustomerProject={handleViewCustomerProject} />;
        }
        return <Racking />;
      case 'admin-panels':
        if (!isAdmin) {
          setCurrentView('calendar');
          return <Calendar onViewCustomerProject={handleViewCustomerProject} />;
        }
        return <Panels />;
      case 'queue-new-project':
        return <QueueDetailView queueType="new_project" />;
      case 'queue-site-survey':
        return <QueueDetailView queueType="site_survey" />;
      case 'queue-engineering':
        return <QueueDetailView queueType="engineering" />;
      case 'queue-utility-permits':
        return <QueueDetailView queueType="utility_permits" />;
      case 'queue-ready-to-order':
        return <QueueDetailView queueType="ready_to_order" />;
      case 'queue-coordinate-install':
        return <QueueDetailView queueType="coordinate_install" />;
      case 'queue-install-scheduled':
        return <QueueDetailView queueType="install_scheduled" />;
      case 'queue-ready-inspection':
        return <QueueDetailView queueType="ready_inspection" />;
      case 'queue-pending-pto':
        return <QueueDetailView queueType="pending_pto" />;
      case 'queue-pending-activation':
        return <QueueDetailView queueType="pending_activation" />;
      case 'queue-system-activated':
        return <QueueDetailView queueType="system_activated" />;
      case 'queue-service-tickets':
        return <ServiceTicketsQueue />;
      default:
        return <Calendar />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden bg-gray-900 text-white p-4 flex items-center gap-3">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="text-white hover:text-orange-500 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <img
            src="/solvera_energy_logo_redesign.png"
            alt="Solvera Energy"
            className="h-8 object-contain"
          />
        </div>
        {renderView()}
      </div>
    </div>
  );
}

export default App;
