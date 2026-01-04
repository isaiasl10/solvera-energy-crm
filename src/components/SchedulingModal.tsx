import { useState, useEffect } from 'react';
import { X, Loader2, FileText, Phone, Mail, Zap } from 'lucide-react';
import { supabase, type Customer, type SchedulingAppointment } from '../lib/supabase';

type SchedulingModalProps = {
  customer: Customer;
  appointmentType: 'site_survey' | 'installation' | 'inspection';
  existingAppointment: SchedulingAppointment | null;
  onClose: () => void;
};

const TIME_WINDOWS = [
  { label: '8:00AM - 10:00AM', start: '08:00:00', end: '10:00:00' },
  { label: '10:00AM - 12:00PM', start: '10:00:00', end: '12:00:00' },
  { label: '12:00PM - 2:00PM', start: '12:00:00', end: '14:00:00' },
  { label: '2:00PM - 4:00PM', start: '14:00:00', end: '16:00:00' },
  { label: '4:00PM - 6:00PM', start: '16:00:00', end: '18:00:00' },
];

const CITY_INSPECTION_TIME_WINDOW = {
  label: '7:30AM - 3:30PM',
  start: '07:30:00',
  end: '15:30:00',
};

export default function SchedulingModal({
  customer,
  appointmentType,
  existingAppointment,
  onClose,
}: SchedulingModalProps) {
  const [scheduledDate, setScheduledDate] = useState('');
  const [timeWindow, setTimeWindow] = useState('');
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [availableTechnicians, setAvailableTechnicians] = useState<Array<{ id: string; name: string; role_category?: string }>>([]);
  const [ticketType, setTicketType] = useState('service');
  const [problemCode, setProblemCode] = useState('panels_not_reporting');
  const [ticketStatus, setTicketStatus] = useState('open');
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTechnicians();
  }, []);

  useEffect(() => {
    if (existingAppointment && availableTechnicians.length > 0) {
      setScheduledDate(existingAppointment.scheduled_date || '');
      setTechnicians(existingAppointment.assigned_technicians || []);
      setTicketType(existingAppointment.ticket_type || 'service');
      setProblemCode(existingAppointment.problem_code || 'panels_not_reporting');
      setTicketStatus(existingAppointment.ticket_status || 'open');
      setPriority(existingAppointment.priority || 'normal');
      setNotes(existingAppointment.notes || '');
      setIsActive(existingAppointment.is_active ?? true);

      const techNames = existingAppointment.assigned_technicians || [];
      const techIds = availableTechnicians
        .filter(tech => techNames.includes(tech.name))
        .map(tech => tech.id);
      setSelectedTechnicianIds(techIds);

      if (existingAppointment.time_window_start && existingAppointment.time_window_end) {
        const allWindows = [...TIME_WINDOWS, CITY_INSPECTION_TIME_WINDOW];
        const window = allWindows.find(
          (tw) => tw.start === existingAppointment.time_window_start && tw.end === existingAppointment.time_window_end
        );
        if (window) {
          setTimeWindow(`${window.start}|${window.end}`);
        }
      }
    }
  }, [existingAppointment, appointmentType, availableTechnicians]);

  const fetchTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, full_name, role, role_category')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;

      setAvailableTechnicians(data?.map(user => ({
        id: user.id,
        name: user.full_name,
        role_category: user.role_category
      })) || []);
    } catch (err) {
      console.error('Error fetching technicians:', err);
    }
  };

  useEffect(() => {
    const codes = getAvailableProblemCodes();
    const validCodes = codes.map(c => c.value);
    if (!validCodes.includes(problemCode)) {
      setProblemCode(codes[0]?.value || 'general');
    }
  }, [ticketType]);

  const getTitle = () => {
    const typeLabel = ticketType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return `${typeLabel} Ticket`;
  };

  const getAvailableProblemCodes = () => {
    if (ticketType === 'installation') {
      return [
        { value: 'new_install', label: 'New Install' },
        { value: 'pv_only', label: 'PV Only' },
        { value: 'finish_panel_lay', label: 'Finish Panel Lay' },
        { value: 'electrical_pv', label: 'Electrical + PV' },
        { value: 'electrical_only', label: 'Electrical Only' },
        { value: 'electrical_battery_only', label: 'Electrical Battery Only' },
        { value: 'battery_pv', label: 'Battery + PV' },
        { value: 'electrical_mid_rough_pv', label: 'Electrical + Mid Rough PV' },
      ];
    }

    if (ticketType === 'service') {
      return [
        { value: 'panels_not_reporting', label: 'Panels Not Reporting' },
        { value: 'roof_leak', label: 'Roof Leak' },
        { value: 'commission_system', label: 'Commission System' },
        { value: 'inspection_failed', label: 'Inspection Failed' },
        { value: 'detach_panels', label: 'Detach Panels' },
        { value: 'reset_panels', label: 'Reset Panels' },
      ];
    }

    if (ticketType === 'inspection') {
      return [
        { value: 'city_inspection', label: 'City Inspection' },
        { value: 'site_survey', label: 'Site Survey' },
      ];
    }

    return [
      { value: 'general', label: 'General' },
      { value: 'electrical', label: 'Electrical' },
      { value: 'structural', label: 'Structural' },
      { value: 'equipment', label: 'Equipment' },
      { value: 'permitting', label: 'Permitting' },
      { value: 'customer_request', label: 'Customer Request' },
      { value: 'warranty', label: 'Warranty' },
      { value: 'emergency', label: 'Emergency' },
    ];
  };

  const getAvailableTimeWindows = () => {
    if (problemCode === 'city_inspection') {
      return [CITY_INSPECTION_TIME_WINDOW];
    }
    return TIME_WINDOWS;
  };

  const handleSave = async () => {
    if (!ticketType) {
      setError('Please select a ticket type');
      return;
    }

    if (!problemCode) {
      setError('Please select a problem code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let timeStart = null;
      let timeEnd = null;

      if (timeWindow) {
        const [start, end] = timeWindow.split('|');
        timeStart = start;
        timeEnd = end;
      }

      const fieldTechIds = selectedTechnicianIds.filter(techId => {
        const tech = availableTechnicians.find(t => t.id === techId);
        return tech?.role_category === 'field_tech';
      });

      const appointmentData: any = {
        customer_id: customer.id,
        appointment_type: appointmentType,
        scheduled_date: scheduledDate || null,
        time_window_start: timeStart,
        time_window_end: timeEnd,
        assigned_technicians: technicians,
        status: 'pending',
        ticket_type: ticketType,
        problem_code: problemCode,
        ticket_status: ticketStatus,
        priority: priority,
        notes: notes || null,
        is_active: isActive,
      };

      if (ticketType === 'installation' && fieldTechIds.length > 0) {
        appointmentData.pv_installer_id = fieldTechIds[0];
      }

      if (existingAppointment) {
        const { error: updateError } = await supabase
          .from('scheduling')
          .update(appointmentData)
          .eq('id', existingAppointment.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('scheduling')
          .insert([appointmentData]);

        if (insertError) throw insertError;
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{getTitle()}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Ticket Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs">Customer</span>
                <p className="font-medium text-gray-900">{customer.full_name}</p>
              </div>

              <div>
                <span className="text-gray-500 text-xs flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Phone
                </span>
                <p className="font-medium text-gray-900">{customer.phone}</p>
              </div>

              <div>
                <span className="text-gray-500 text-xs flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Email
                </span>
                <p className="font-medium text-gray-900 truncate">{customer.email}</p>
              </div>

              <div>
                <span className="text-gray-500 text-xs flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  System Specs
                </span>
                <p className="font-medium text-gray-900">
                  {(customer.system_size_kw / 1000).toFixed(2)} kW • {customer.panel_quantity} Panels
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ticketType" className="block text-xs font-medium text-gray-700 mb-1">
                  Ticket Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="ticketType"
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="service">Service</option>
                  <option value="installation">Installation</option>
                  <option value="inspection">Inspection</option>
                </select>
              </div>

              <div>
                <label htmlFor="problemCode" className="block text-xs font-medium text-gray-700 mb-1">
                  Problem Code <span className="text-red-500">*</span>
                </label>
                <select
                  id="problemCode"
                  value={problemCode}
                  onChange={(e) => setProblemCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {getAvailableProblemCodes().map((code) => (
                    <option key={code.value} value={code.value}>
                      {code.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ticketStatus" className="block text-xs font-medium text-gray-700 mb-1">
                  Ticket Status
                </label>
                <select
                  id="ticketStatus"
                  value={ticketStatus}
                  onChange={(e) => setTicketStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
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
                <label htmlFor="priority" className="block text-xs font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label htmlFor="scheduledDate" className="block text-xs font-medium text-gray-700 mb-1">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  id="scheduledDate"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="timeWindow" className="block text-xs font-medium text-gray-700 mb-1">
                  Time Window
                </label>
                <select
                  id="timeWindow"
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {getAvailableTimeWindows().map((tw) => (
                    <option key={tw.label} value={`${tw.start}|${tw.end}`}>
                      {tw.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="technicians" className="block text-xs font-medium text-gray-700 mb-1">
                Assigned Technicians
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded p-2 bg-white">
                {availableTechnicians.length === 0 ? (
                  <p className="text-xs text-gray-500">No technicians available</p>
                ) : (
                  availableTechnicians.map((tech) => (
                    <label key={tech.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedTechnicianIds.includes(tech.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTechnicians([...technicians, tech.name]);
                            setSelectedTechnicianIds([...selectedTechnicianIds, tech.id]);
                          } else {
                            setTechnicians(technicians.filter(t => t !== tech.name));
                            setSelectedTechnicianIds(selectedTechnicianIds.filter(id => id !== tech.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{tech.name}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Select one or more technicians</p>
            </div>

            <div>
              <label htmlFor="notes" className="block text-xs font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about this ticket..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-xs font-medium text-gray-700">
                Active Ticket
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Ticket'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
