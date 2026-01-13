import { useState, useEffect } from 'react';
import { User, DollarSign, Clock, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PaymentPreferences from './PaymentPreferences';
import TimeClock from './TimeClock';
import SalesManagerDashboard from './SalesManagerDashboard';
import PayrollPeriodView from './PayrollPeriodView';

export default function EmployeeProfileView() {
  const [activeTab, setActiveTab] = useState<'payment' | 'timeclock' | 'overrides' | 'payroll'>('payment');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleCategory, setRoleCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('app_users')
        .select('role, role_category')
        .eq('email', user.email)
        .maybeSingle();

      if (error) throw error;
      setUserRole(data?.role || null);
      setRoleCategory(data?.role_category || null);

      if (data?.role === 'sales_manager') {
        setActiveTab('overrides');
      } else if (data?.role_category === 'field_tech') {
        setActiveTab('payroll');
      }
    } catch (err) {
      console.error('Failed to fetch user role:', err);
    }
  };

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-7 h-7 text-orange-600" />
          My Profile
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {userRole === 'sales_manager'
            ? 'Manage your team, commissions, and preferences'
            : roleCategory === 'field_tech'
            ? 'View your payroll, track time, and manage payment preferences'
            : 'Manage your payment preferences and time tracking'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {userRole === 'sales_manager' && (
              <button
                onClick={() => setActiveTab('overrides')}
                className={`
                  flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === 'overrides'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <TrendingUp className="w-4 h-4" />
                Overrides & Commission
              </button>
            )}
            {roleCategory === 'field_tech' && (
              <button
                onClick={() => setActiveTab('payroll')}
                className={`
                  flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === 'payroll'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Calendar className="w-4 h-4" />
                Payroll Periods
              </button>
            )}
            <button
              onClick={() => setActiveTab('payment')}
              className={`
                flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors
                ${
                  activeTab === 'payment'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <DollarSign className="w-4 h-4" />
              Payment Preferences
            </button>
            {userRole !== 'sales_rep' && userRole !== 'sales_manager' && (
              <button
                onClick={() => setActiveTab('timeclock')}
                className={`
                  flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === 'timeclock'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Clock className="w-4 h-4" />
                Time Clock
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overrides' && userRole === 'sales_manager' && <SalesManagerDashboard />}
          {activeTab === 'payroll' && roleCategory === 'field_tech' && <PayrollPeriodView />}
          {activeTab === 'payment' && <PaymentPreferences />}
          {activeTab === 'timeclock' && <TimeClock />}
        </div>
      </div>
    </div>
  );
}
