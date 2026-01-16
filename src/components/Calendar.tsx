import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Filter, X, Plus } from 'lucide-react';
import { supabase, type SchedulingAppointment, type Customer } from '../lib/supabase';
import AppointmentModal from './AppointmentModal';
import TicketDetailModal from './TicketDetailModal';
import { useAuth } from '../contexts/AuthContext';

interface Appointment {
  id: string;
  customer_id: string;
  type: 'scheduled_install' | 'site_survey' | 'inspection' | 'service_ticket' | 'scheduling_ticket';
  title: string;
  description: string;
  scheduled_date: string;
  technician_name: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in_progress';
  customer?: {
    first_name: string;
    last_name: string;
  };
  isSchedulingTicket?: boolean;
  closed_at?: string | null;
}

const typeColors = {
  scheduled_install: 'bg-orange-100 text-orange-800 border-orange-300',
  site_survey: 'bg-green-100 text-green-800 border-green-300',
  inspection: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  service_ticket: 'bg-red-100 text-red-800 border-red-300',
  scheduling_ticket: 'bg-orange-100 text-orange-800 border-orange-300',
};

const typeLabels = {
  scheduled_install: 'Install',
  site_survey: 'Survey',
  inspection: 'Inspection',
  service_ticket: 'Service',
  scheduling_ticket: 'Ticket',
};

interface CalendarProps {
  onViewCustomerProject?: (customerId: string) => void;
}

export default function Calendar({ onViewCustomerProject }: CalendarProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showTicketDetailModal, setShowTicketDetailModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userAppId, setUserAppId] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, [user]);

  useEffect(() => {
    if (userAppId !== null) {
      fetchAppointments();
    }
  }, [currentDate, userAppId]);

  useEffect(() => {
    if (userAppId === null) return;

    const channelName = `calendar_${userAppId}_${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduling',
        },
        () => {
          fetchAppointments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userAppId, currentDate]);

  const loadUserData = async () => {
    if (!user?.email) return;

    try {
      const { data } = await supabase
        .from('app_users')
        .select('id, role')
        .eq('email', user.email)
        .maybeSingle();

      if (data) {
        setUserAppId(data.id);
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [appointments, searchTerm, selectedTypes, selectedTechnician]);

  const fetchAppointments = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();

      const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      let salesRepCustomerIds: string[] = [];
      if (userRole === 'sales_rep' && userAppId) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('id')
          .eq('sales_rep_id', userAppId)
          .eq('is_active', true);

        salesRepCustomerIds = customerData?.map(c => c.id) || [];
      }

      let appointmentsQuery = supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(full_name, job_source, address)
        `)
        .gte('scheduled_date', startDateStr)
        .lte('scheduled_date', endDateStr);

      if (userRole === 'sales_rep' && salesRepCustomerIds.length > 0) {
        appointmentsQuery = appointmentsQuery.in('customer_id', salesRepCustomerIds);
      }

      const { data: appointmentsData, error: appointmentsError } = await appointmentsQuery.order('scheduled_date');

      if (appointmentsError) throw appointmentsError;

      const formattedAppointments = (appointmentsData || []).map(apt => {
        const customer = Array.isArray(apt.customer) ? apt.customer[0] : apt.customer;
        return {
          ...apt,
          customer: customer ? {
            first_name: customer.full_name?.split(' ')[0] || '',
            last_name: customer.full_name?.split(' ').slice(1).join(' ') || '',
          } : undefined,
          isSchedulingTicket: false,
          job_source: customer?.job_source || 'internal',
          address: customer?.address || '',
        };
      });

      let schedulingQuery = supabase
        .from('scheduling')
        .select(`
          *,
          customer:customers(full_name, job_source, address)
        `)
        .not('scheduled_date', 'is', null)
        .gte('scheduled_date', startDateStr)
        .lte('scheduled_date', endDateStr)
        .eq('is_active', true);

      if (userRole === 'sales_rep') {
        if (salesRepCustomerIds.length > 0) {
          schedulingQuery = schedulingQuery
            .in('customer_id', salesRepCustomerIds)
            .eq('ticket_type', 'installation');
        }
      }

      const { data: schedulingData, error: schedulingError } = await schedulingQuery.order('scheduled_date');

      if (schedulingError) {
        console.error('Error fetching scheduling tickets:', schedulingError);
      }

      const formattedScheduling = (schedulingData || []).map(ticket => {
        const customer = Array.isArray(ticket.customer) ? ticket.customer[0] : ticket.customer;
        const ticketType = ticket.ticket_type || 'service';
        const formatLabel = (value: string) => value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

        return {
          id: ticket.id,
          customer_id: ticket.customer_id,
          type: 'scheduling_ticket' as const,
          title: formatLabel(ticketType),
          description: ticket.notes || '',
          scheduled_date: ticket.scheduled_date || '',
          technician_name: ticket.assigned_technicians?.join(', ') || 'Unassigned',
          status: ticket.ticket_status || 'scheduled',
          customer: customer ? {
            first_name: customer.full_name?.split(' ')[0] || '',
            last_name: customer.full_name?.split(' ').slice(1).join(' ') || '',
          } : undefined,
          isSchedulingTicket: true,
          closed_at: ticket.closed_at || null,
          job_source: customer?.job_source || 'internal',
          address: customer?.address || '',
        };
      });

      const allAppointments = [...formattedAppointments, ...formattedScheduling];
      setAppointments(allAppointments);

      const uniqueTechs = Array.from(new Set(allAppointments.map(a => a.technician_name).filter(Boolean)));
      setTechnicians(uniqueTechs);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...appointments];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(apt =>
        apt.title.toLowerCase().includes(term) ||
        apt.description.toLowerCase().includes(term) ||
        apt.technician_name.toLowerCase().includes(term) ||
        (apt.customer && `${apt.customer.first_name} ${apt.customer.last_name}`.toLowerCase().includes(term))
      );
    }

    if (selectedTypes.length > 0) {
      filtered = filtered.filter(apt => selectedTypes.includes(apt.type));
    }

    if (selectedTechnician) {
      filtered = filtered.filter(apt => apt.technician_name === selectedTechnician);
    }

    setFilteredAppointments(filtered);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getAppointmentsForDay = (date: Date | null) => {
    if (!date) return [];

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return filteredAppointments.filter(apt => {
      if (!apt.scheduled_date) return false;
      const aptDate = apt.scheduled_date.split('T')[0];
      return aptDate === dateStr;
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTypes([]);
    setSelectedTechnician('');
  };

  const handleDayClick = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      setSelectedAppointment(null);
      setShowAppointmentModal(true);
    }
  };

  const handleAppointmentClick = (apt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    if (apt.isSchedulingTicket) {
      setSelectedTicketId(apt.id);
      setSelectedCustomerId(apt.customer_id);
      setShowTicketDetailModal(true);
    } else {
      setSelectedAppointment(apt);
      setSelectedDate(null);
      setShowAppointmentModal(true);
    }
  };

  const handleViewProject = () => {
    if (selectedCustomerId && onViewCustomerProject) {
      onViewCustomerProject(selectedCustomerId);
      setShowTicketDetailModal(false);
      setSelectedTicketId(null);
      setSelectedCustomerId(null);
    }
  };

  const days = getDaysInMonth();
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const hasActiveFilters = searchTerm || selectedTypes.length > 0 || selectedTechnician;

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-900">Schedule Calendar</h2>
          <button
            onClick={() => {
              setSelectedDate(new Date());
              setSelectedAppointment(null);
              setShowAppointmentModal(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search appointments..."
              className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && <span className="bg-white text-orange-600 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">!</span>}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Appointment Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(typeLabels).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => toggleTypeFilter(type)}
                      className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                        selectedTypes.includes(type)
                          ? typeColors[type as keyof typeof typeColors]
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Technician
                </label>
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">All Technicians</option>
                  {technicians.map(tech => (
                    <option key={tech} value={tech}>{tech}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
            <button
              onClick={previousMonth}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{monthYear}</h3>
              <button
                onClick={today}
                className="px-2 py-1 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Today
              </button>
            </div>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-1.5 text-center text-xs font-semibold text-gray-700 bg-gray-50">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((date, index) => {
              const dayAppointments = getAppointmentsForDay(date);
              const isToday = date &&
                date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(date)}
                  className={`min-h-24 p-1 border-r border-b border-gray-200 ${
                    !date ? 'bg-gray-50' : 'bg-white hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  {date && (
                    <>
                      <div className={`text-xs font-medium mb-1 ${
                        isToday ? 'bg-orange-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-gray-900'
                      }`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayAppointments.slice(0, 5).map(apt => {
                          const isClosed = apt.closed_at !== null && apt.closed_at !== undefined;
                          const isSubcontract = (apt as any).job_source === 'subcontract';
                          const colorClass = isClosed
                            ? 'bg-green-100 text-green-800 border-green-400'
                            : isSubcontract
                            ? 'bg-orange-100 text-orange-800 border-orange-400'
                            : typeColors[apt.type];

                          return (
                            <div
                              key={apt.id}
                              onClick={(e) => handleAppointmentClick(apt, e)}
                              className={`text-[10px] p-0.5 rounded border truncate ${colorClass} hover:shadow-md transition-all cursor-pointer`}
                            >
                              <div className="flex items-center gap-0.5">
                                {isSubcontract && (
                                  <span className="text-[8px] font-bold bg-orange-600 text-white px-1 rounded">SUB</span>
                                )}
                                <div className="font-medium truncate leading-tight flex-1">{apt.title}</div>
                              </div>
                              {apt.technician_name && (
                                <div className="truncate opacity-75 leading-tight">{apt.technician_name.split(' - ')[0]}</div>
                              )}
                            </div>
                          );
                        })}
                        {dayAppointments.length > 5 && (
                          <div className="text-[10px] text-gray-600 font-medium">
                            +{dayAppointments.length - 5}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAppointmentModal && (
        <AppointmentModal
          appointment={selectedAppointment}
          defaultDate={selectedDate}
          onClose={() => {
            setShowAppointmentModal(false);
            setSelectedAppointment(null);
            setSelectedDate(null);
          }}
          onSave={() => {
            fetchAppointments();
            setShowAppointmentModal(false);
            setSelectedAppointment(null);
            setSelectedDate(null);
          }}
        />
      )}

      {showTicketDetailModal && selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => {
            setShowTicketDetailModal(false);
            setSelectedTicketId(null);
            setSelectedCustomerId(null);
          }}
          onUpdate={() => {
            fetchAppointments();
          }}
          onViewProject={handleViewProject}
        />
      )}
    </div>
  );
}
