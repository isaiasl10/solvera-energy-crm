import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Filter } from 'lucide-react';
import { supabase, type SchedulingAppointment, type Customer } from '../lib/supabase';
import SchedulingModal from './SchedulingModal';
import TicketDetailModal from './TicketDetailModal';

type SchedulingSectionProps = {
  customer: Customer;
};

type TicketType = 'service' | 'installation' | 'inspection' | 'maintenance' | 'repair' | 'follow_up' | 'consultation';
type ProblemCode = 'general' | 'electrical' | 'structural' | 'equipment' | 'permitting' | 'inspection_failed' | 'customer_request' | 'warranty' | 'emergency';
type TicketStatus = 'open' | 'in_progress' | 'on_hold' | 'pending_parts' | 'pending_customer' | 'scheduled' | 'completed' | 'cancelled' | 'closed';
type Priority = 'low' | 'normal' | 'high' | 'urgent';

export default function SchedulingSection({ customer }: SchedulingSectionProps) {
  const [tickets, setTickets] = useState<SchedulingAppointment[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SchedulingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SchedulingAppointment | null>(null);
  const [detailModalTicketId, setDetailModalTicketId] = useState<string | null>(null);

  const [filterTicketType, setFilterTicketType] = useState<string>('all');
  const [filterProblemCode, setFilterProblemCode] = useState<string>('all');
  const [filterTicketStatus, setFilterTicketStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    fetchTickets();

    const channelName = `scheduling_${customer.id}_${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduling',
          filter: `customer_id=eq.${customer.id}`,
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [customer.id]);

  useEffect(() => {
    applyFilters();
  }, [tickets, filterTicketType, filterProblemCode, filterTicketStatus, filterPriority, showActiveOnly]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scheduling')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tickets];

    if (showActiveOnly) {
      filtered = filtered.filter(t => t.is_active);
    }

    if (filterTicketType !== 'all') {
      filtered = filtered.filter(t => t.ticket_type === filterTicketType);
    }

    if (filterProblemCode !== 'all') {
      filtered = filtered.filter(t => t.problem_code === filterProblemCode);
    }

    if (filterTicketStatus !== 'all') {
      filtered = filtered.filter(t => t.ticket_status === filterTicketStatus);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }

    setFilteredTickets(filtered);
  };

  const handleNewTicket = () => {
    setSelectedTicket(null);
    setModalOpen(true);
  };

  const handleEditTicket = (ticket: SchedulingAppointment) => {
    setSelectedTicket(ticket);
    setModalOpen(true);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;

    try {
      const { error } = await supabase
        .from('scheduling')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
      await fetchTickets();
    } catch (err) {
      console.error('Error deleting ticket:', err);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedTicket(null);
    fetchTickets();
  };

  const handleViewTicket = (ticket: SchedulingAppointment) => {
    setDetailModalTicketId(ticket.id);
  };

  const handleCloseDetailModal = () => {
    setDetailModalTicketId(null);
    fetchTickets();
  };

  const formatLabel = (value: string) => {
    return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'on_hold':
      case 'pending_parts':
      case 'pending_customer':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'open':
      default:
        return 'bg-orange-100 text-orange-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Ticket Filters</h3>
          </div>
          <button
            onClick={handleNewTicket}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ticket Type <span className="text-red-500">*</span>
            </label>
            <select
              value={filterTicketType}
              onChange={(e) => setFilterTicketType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="service">Service</option>
              <option value="installation">Installation</option>
              <option value="inspection">Inspection</option>
              <option value="maintenance">Maintenance</option>
              <option value="repair">Repair</option>
              <option value="follow_up">Follow-up</option>
              <option value="consultation">Consultation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Problem Code <span className="text-red-500">*</span>
            </label>
            <select
              value={filterProblemCode}
              onChange={(e) => setFilterProblemCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Codes</option>
              <option value="general">General</option>
              <option value="electrical">Electrical</option>
              <option value="structural">Structural</option>
              <option value="equipment">Equipment</option>
              <option value="permitting">Permitting</option>
              <option value="inspection_failed">Inspection Failed</option>
              <option value="customer_request">Customer Request</option>
              <option value="warranty">Warranty</option>
              <option value="emergency">Emergency</option>
              <option value="city_inspection">City Inspection</option>
              <option value="site_survey">Site Survey</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ticket Status</label>
            <select
              value={filterTicketStatus}
              onChange={(e) => setFilterTicketStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="pending_parts">Pending Parts</option>
              <option value="pending_customer">Pending Customer</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="showActive"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="showActive" className="text-sm font-medium text-gray-700">
            Show Active Only
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Tickets ({filteredTickets.length})
          </h3>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tickets found. Click "New Ticket" to create one.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleViewTicket(ticket)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority || 'normal')}`}>
                        {formatLabel(ticket.priority || 'normal')}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.ticket_status || 'open')}`}>
                        {formatLabel(ticket.ticket_status || 'open')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {ticket.scheduled_date ? ticket.scheduled_date : 'Not Scheduled'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <span className="ml-2 font-medium text-gray-900">{formatLabel(ticket.ticket_type || 'service')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Problem:</span>
                        <span className="ml-2 font-medium text-gray-900">{formatLabel(ticket.problem_code || 'general')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Assigned:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {ticket.assigned_technicians && ticket.assigned_technicians.length > 0
                            ? ticket.assigned_technicians.join(', ')
                            : 'Unassigned'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {ticket.created_at.split('T')[0]}
                        </span>
                      </div>
                    </div>
                    {ticket.notes && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Notes:</span> {ticket.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTicket(ticket);
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                      title="Edit Ticket"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTicket(ticket.id);
                      }}
                      className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                      title="Delete Ticket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <SchedulingModal
          customer={customer}
          appointmentType="site_survey"
          existingAppointment={selectedTicket}
          onClose={handleModalClose}
        />
      )}

      {detailModalTicketId && (
        <TicketDetailModal
          ticketId={detailModalTicketId}
          onClose={handleCloseDetailModal}
          onUpdate={fetchTickets}
        />
      )}
    </div>
  );
}
