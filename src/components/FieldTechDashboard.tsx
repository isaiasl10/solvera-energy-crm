import { useState } from 'react';
import { Briefcase, User, LogOut, Menu, X } from 'lucide-react';
import FieldTechView from './FieldTechView';
import EmployeeProfileView from './EmployeeProfileView';
import { useAuth } from '../contexts/AuthContext';

export default function FieldTechDashboard() {
  const { logout } = useAuth();
  const [activeView, setActiveView] = useState<'tickets' | 'profile'>('tickets');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-orange-600 text-white p-2 rounded-lg shadow-lg"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`fixed lg:static inset-y-0 left-0 w-64 bg-gray-900 text-white flex flex-col z-40 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="px-2 py-2 border-b border-gray-700">
          <img
            src="/solvera_energy_logo_redesign.png"
            alt="Solvera Energy"
            className="w-full h-auto object-contain"
          />
        </div>

        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => {
                  setActiveView('tickets');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  activeView === 'tickets'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span className="font-medium">My Tickets</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setActiveView('profile');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  activeView === 'profile'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="font-medium">My Profile</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-2 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm text-gray-300 hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto lg:ml-0">
        {activeView === 'tickets' && <FieldTechView />}
        {activeView === 'profile' && <EmployeeProfileView />}
      </div>
    </div>
  );
}
