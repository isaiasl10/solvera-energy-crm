import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Calendar, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react';
import TicketDetailModal from './TicketDetailModal';
import { useAuth } from '../contexts/AuthContext';

type Ticket = {
  id: string;
  customer_id: string;
  appointment_date: string;
  appointment_time: string;
  ticket_type: string;
  status: string;
  assigned_to: string;
  address: string;
  customer_name: string;
};

type ViewMode = 'day' | 'week' | 'month';

export default function FieldTechView() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [userFullName, setUserFullName] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  useEffect(() => {
    if (userFullName) {
      loadTickets();
    }
  }, [userFullName, currentDate, viewMode]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('full_name')
        .eq('email', user.email)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserFullName(data.full_name);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  };

  const loadTickets = async () => {
    if (!userFullName) return;

    try {
      let startDate = new Date(currentDate);
      let endDate = new Date(currentDate);

      if (viewMode === 'day') {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (viewMode === 'week') {
        const dayOfWeek = startDate.getDay();
        const diff = startDate.getDate() - dayOfWeek;
        startDate = new Date(startDate.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (viewMode === 'month') {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('scheduling')
        .select(`
          id,
          customer_id,
          scheduled_date,
          time_window_start,
          time_window_end,
          ticket_type,
          ticket_status,
          assigned_technicians,
          customers!inner (
            address,
            full_name
          )
        `)
        .in('ticket_status', ['open', 'scheduled', 'in_progress'])
        .gte('scheduled_date', startDateStr)
        .lte('scheduled_date', endDateStr)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      const normalizeNameForComparison = (name: string) => {
        return name.toLowerCase().replace(/[\s\-_]/g, '');
      };

      const userNameNormalized = normalizeNameForComparison(userFullName);

      const filteredData = (data || []).filter((ticket: any) => {
        return ticket.assigned_technicians?.some((tech: string) => {
          const techNormalized = normalizeNameForComparison(tech);
          return techNormalized === userNameNormalized;
        });
      });

      const formattedTickets = filteredData.map((ticket: any) => ({
        id: ticket.id,
        customer_id: ticket.customer_id,
        appointment_date: ticket.scheduled_date,
        appointment_time: ticket.time_window_start ? `${ticket.time_window_start.slice(0, 5)} - ${ticket.time_window_end.slice(0, 5)}` : '',
        ticket_type: ticket.ticket_type,
        status: ticket.ticket_status,
        assigned_to: ticket.assigned_technicians?.join(', ') || '',
        address: ticket.customers.address,
        customer_name: ticket.customers.full_name,
      }));

      setTickets(formattedTickets);
    } catch (err) {
      console.error('Error loading tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-orange-100 text-orange-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTicketTypeColor = (type: string) => {
    switch (type) {
      case 'site_survey':
        return 'bg-purple-100 text-purple-800';
      case 'installation':
        return 'bg-orange-100 text-orange-800';
      case 'inspection':
        return 'bg-blue-100 text-blue-800';
      case 'service':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRangeText = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (viewMode === 'week') {
      const startDate = new Date(currentDate);
      const dayOfWeek = startDate.getDay();
      const diff = startDate.getDate() - dayOfWeek;
      startDate.setDate(diff);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 bg-gray-50 pt-16 lg:pt-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Schedule</h1>
        <p className="text-xs sm:text-sm text-gray-600">View and manage your assigned work orders</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={navigatePrevious}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="text-center min-w-[240px]">
              <h2 className="text-lg font-semibold text-gray-900">{getDateRangeText()}</h2>
            </div>
            <button
              onClick={navigateNext}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={goToToday}
              className="ml-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {tickets.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No tickets scheduled for this period</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => handleTicketClick(ticket)}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTicketTypeColor(ticket.ticket_type)}`}>
                  {ticket.ticket_type.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ticket.customer_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <p className="text-sm text-gray-600">{ticket.address}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {new Date(ticket.appointment_date).toLocaleDateString()} at {ticket.appointment_time}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && selectedTicket && (
        <TicketDetailModal
          ticketId={selectedTicket.id}
          onClose={() => {
            setShowModal(false);
            setSelectedTicket(null);
            loadTickets();
          }}
          onUpdate={loadTickets}
        />
      )}
    </div>
  );
}
