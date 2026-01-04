import { useState } from 'react';
import { Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FieldTechDashboard from './FieldTechDashboard';
import Calendar from './Calendar';
import CustomerQueue from './CustomerQueue';
import Sidebar from './Sidebar';
import { type ViewType } from './Sidebar';

type RoleCategory = 'admin' | 'management' | 'employee' | 'field_tech' | 'sales_rep';

export default function RolePreviews() {
  const { user, setMockUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleCategory>('admin');
  const [adminView, setAdminView] = useState<ViewType>('calendar');
  const [originalUser] = useState(user);

  const roles: { value: RoleCategory; label: string; description: string }[] = [
    { value: 'admin', label: 'Admin', description: 'Full system access with administrative controls' },
    { value: 'management', label: 'Management', description: 'CRM access with admin features' },
    { value: 'employee', label: 'Employee', description: 'CRM access with limited permissions' },
    { value: 'sales_rep', label: 'Sales Rep', description: 'Limited CRM access for sales activities' },
    { value: 'field_tech', label: 'Field Tech', description: 'Ticket-based workflow portal' },
  ];

  const handleRoleChange = (role: RoleCategory) => {
    setSelectedRole(role);
    setMockUser(role);
    setAdminView('calendar');
  };

  const handleRestoreUser = () => {
    if (originalUser) {
      setMockUser(originalUser.role_category);
    }
  };

  const renderRoleView = () => {
    if (selectedRole === 'field_tech') {
      return (
        <div className="flex-1 overflow-hidden">
          <FieldTechDashboard />
        </div>
      );
    }

    return (
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentView={adminView} onViewChange={setAdminView} />
        <div className="flex-1 overflow-auto">
          {adminView === 'calendar' && <Calendar onViewCustomerProject={() => {}} />}
          {adminView === 'customers' && <CustomerQueue initialCustomerId={null} onCustomerChange={() => {}} />}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Role View Previews</h1>
            <p className="text-sm text-gray-600 mt-1">Preview what different user roles see in the system</p>
          </div>
          <button
            onClick={handleRestoreUser}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Restore My View
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {roles.map((role) => (
            <button
              key={role.value}
              onClick={() => handleRoleChange(role.value)}
              className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all ${
                selectedRole === role.value
                  ? 'bg-orange-50 border-orange-500 shadow-sm'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Eye className={`w-5 h-5 ${selectedRole === role.value ? 'text-orange-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className={`text-sm font-semibold ${selectedRole === role.value ? 'text-orange-900' : 'text-gray-700'}`}>
                    {role.label}
                  </div>
                  <div className={`text-xs ${selectedRole === role.value ? 'text-orange-600' : 'text-gray-500'}`}>
                    {role.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gray-100">
        <div className="h-full border-4 border-dashed border-gray-300 m-4 rounded-lg overflow-hidden bg-white shadow-inner">
          {renderRoleView()}
        </div>
      </div>
    </div>
  );
}
