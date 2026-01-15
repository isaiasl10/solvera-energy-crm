import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import CustomerForm from './CustomerForm';
import CustomerList from './CustomerList';
import CustomerProject from './CustomerProject';
import { supabase, type Customer } from '../lib/supabase';

interface CustomerQueueProps {
  initialCustomerId?: string | null;
  initialTab?: string | null;
  onCustomerChange?: () => void;
  onTabChange?: (tab: string) => void;
}

export default function CustomerQueue({ initialCustomerId, initialTab, onCustomerChange, onTabChange }: CustomerQueueProps = {}) {
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (initialCustomerId) {
      fetchCustomer(initialCustomerId);
    }
  }, [initialCustomerId]);

  const fetchCustomer = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedCustomer(data);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
    }
  };

  const handleSuccess = () => {
    setShowForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleBackToList = () => {
    setSelectedCustomer(null);
    setRefreshTrigger(prev => prev + 1);
    if (onCustomerChange) {
      onCustomerChange();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setRefreshTrigger(prev => prev + 1);
  };

  if (selectedCustomer) {
    return (
      <CustomerProject
        customer={selectedCustomer}
        onBack={handleBackToList}
        initialTab={initialTab as any}
        onTabChange={onTabChange}
      />
    );
  }

  const showResults = searchQuery.trim().length > 0 || statusFilter !== 'all';

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-bold text-gray-900">Customer Projects Queue</h2>
            <p className="text-xs text-gray-500">Search and manage customer information</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-orange-600 text-white font-medium rounded hover:bg-orange-700 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            {showForm ? 'Cancel' : 'Add Customer'}
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer ID, name, email, phone, or address..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="site_survey">Site Survey</option>
              <option value="engineering">Engineering</option>
              <option value="permits">Permits</option>
              <option value="installation">Installation</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </form>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-2">
          {showForm && (
            <div className="bg-white rounded shadow-sm border border-gray-200 p-3">
              <h2 className="text-sm font-bold text-gray-900 mb-2">Add New Customer</h2>
              <CustomerForm onSuccess={handleSuccess} />
            </div>
          )}

          {!showResults ? (
            <div className="bg-white rounded shadow-sm border border-gray-200 p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-1">Search for Customers</h3>
              <p className="text-sm text-gray-500">
                Enter a customer ID, name, email, phone, or address to find customers
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Or use the filter to browse by status
              </p>
            </div>
          ) : (
            <div className="bg-white rounded shadow-sm border border-gray-200 p-3">
              <h2 className="text-sm font-bold text-gray-900 mb-2">Search Results</h2>
              <CustomerList
                refreshTrigger={refreshTrigger}
                onSelectCustomer={handleSelectCustomer}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
