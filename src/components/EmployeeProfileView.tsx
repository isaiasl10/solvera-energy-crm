import { useState, useEffect } from 'react';
import { User, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PaymentPreferences from './PaymentPreferences';
import TimeClock from './TimeClock';
import SalesManagerDashboard from './SalesManagerDashboard';

export default function EmployeeProfileView() {
  const [activeTab, setActiveTab] = useState<'payment' | 'timeclock' | 'overrides'>('payment');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('app_users')
        .select('role')
        .eq('email', user.email)
        .maybeSingle();

      if (error) throw error;
      setUserRole(data?.role || null);

      if (data?.role === 'sales_manager') {
        setActiveTab('overrides');
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
          {activeTab === 'payment' && <PaymentPreferences />}
          {activeTab === 'timeclock' && <TimeClock />}
        </div>
      </div>
    </div>
  );
}
