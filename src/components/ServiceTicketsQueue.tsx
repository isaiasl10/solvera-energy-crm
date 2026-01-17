import { useState, useEffect } from 'react';
import { AlertCircle, Wrench, Calendar, User, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { supabase, type Customer } from '../lib/supabase';
import CustomerProject from './CustomerProject';

type ServiceTicket = {
  id: string;
  customer_id: string;
  ticket_type: string;
  ticket_status: string;
  problem_code: string;
  priority: string;
  notes: string | null;
  scheduled_date: string | null;
  assigned_technician: string | null;
  resolution_description: string | null;
  created_at: string;
};

type TicketWithCustomer = ServiceTicket & {
  customer: Customer | null;
};

export default function ServiceTicketsQueue() {
  const [tickets, setTickets] = useState<TicketWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadTickets();
  }, [refreshTrigger]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('scheduling')
        .select('*')
        .eq('ticket_type', 'service')
        .in('ticket_status', ['open', 'in_progress', 'scheduled', 'completed'])
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true);

      if (customersError) throw customersError;

      const ticketsWithCustomer: TicketWithCustomer[] = (ticketsData || []).map(ticket => ({
        ...ticket,
        customer: customersData?.find(c => c.id === ticket.customer_id) || null
      }));

      setTickets(ticketsWithCustomer);
    } catch (error) {
      console.error('Error loading service tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicket = async (ticketId: string, updates: Partial<ServiceTicket>) => {
    try {
      const { error } = await supabase
        .from('scheduling')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('Failed to update ticket');
    }
  };

  const handleCompleteTicket = async (ticketId: string, customerId: string) => {
    try {
      const { error: ticketError } = await supabase
        .from('scheduling')
        .update({
          ticket_status: 'completed',
          closed_at: new Date().toISOString(),
          close_reason: 'Service Complete'
        })
        .eq('id', ticketId);

      if (ticketError) throw ticketError;

      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket?.notes?.includes('System activation')) {
        const { data: timeline } = await supabase
          .from('project_timeline')
          .select('*')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (timeline) {
          const { error: timelineError } = await supabase
            .from('project_timeline')
            .update({
              activation_completed_date: new Date().toISOString(),
              system_activated_date: new Date().toISOString()
            })
            .eq('id', timeline.id);

          if (timelineError) throw timelineError;
        }
      }

      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error completing ticket:', error);
      alert('Failed to complete ticket');
    }
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'normal': return 'text-blue-600 bg-blue-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-50';
      case 'in_progress': return 'text-orange-600 bg-orange-50';
      case 'scheduled': return 'text-green-600 bg-green-50';
      case 'completed': return 'text-emerald-700 bg-emerald-100 font-semibold';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Service Tickets</h2>
        <p className="text-sm text-gray-500">Active service tickets for post-activation issues</p>
        <p className="text-sm text-gray-700 font-medium mt-2">{tickets.length} active ticket{tickets.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {loading ? (
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
              <span className="text-sm text-gray-600">Loading tickets...</span>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-500">No active service tickets</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => ticket.customer && setSelectedCustomer(ticket.customer)}
                className="bg-white rounded shadow-sm border border-gray-200 p-3 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Wrench className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-semibold text-gray-900">
                        {ticket.customer?.full_name || 'Unknown Customer'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                    </div>
                    {ticket.customer && (
                      <>
                        <p className="text-xs text-gray-600">{ticket.customer.installation_address}</p>
                        <p className="text-xs text-gray-500">ID: {ticket.customer.customer_id}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1 border-t border-gray-200 pt-2 mt-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 text-xs">
                    <AlertCircle className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600">Problem:</span>
                    <span className="font-medium text-gray-900">{ticket.problem_code.replace('_', ' ')}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-1.5 py-0.5 font-medium rounded ${getStatusColor(ticket.ticket_status)}`}>
                      {ticket.ticket_status.replace('_', ' ')}
                    </span>
                  </div>

                  {ticket.scheduled_date && (
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600">Scheduled:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(ticket.scheduled_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {ticket.notes && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2">
                      {ticket.notes}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <button
                      onClick={() => handleUpdateTicket(ticket.id, { ticket_status: 'in_progress' })}
                      className="px-4 py-2.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed min-h-[44px] font-medium"
                      disabled={ticket.ticket_status === 'in_progress'}
                    >
                      Start Work
                    </button>
                    <button
                      onClick={() => handleCompleteTicket(ticket.id, ticket.customer_id)}
                      className="px-4 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 min-h-[44px] font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Complete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
