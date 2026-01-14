import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Calendar, MapPin, User } from 'lucide-react';
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

export default function FieldTechView() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [userFullName, setUserFullName] = useState<string>('');

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  useEffect(() => {
    if (userFullName) {
      loadTickets();
    }
  }, [userFullName]);

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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Tickets</h1>
        <p className="text-xs sm:text-sm text-gray-600">View and manage your assigned work orders</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {tickets.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No tickets assigned</p>
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
