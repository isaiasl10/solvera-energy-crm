import { useState, useEffect } from 'react';
import { X, MapPin, Phone, Mail, Truck, Home, PlayCircle, ClipboardList, LogOut, CheckCircle, FileText, Download, FolderOpen } from 'lucide-react';
import { supabase, type SchedulingAppointment, type Customer, type Document, type SiteSurveyPhotos } from '../lib/supabase';
import InstallationPhotoTicket from './InstallationPhotoTicket';
import SiteSurveyPhotoTicket from './SiteSurveyPhotoTicket';
import InspectionPhotoTicket from './InspectionPhotoTicket';

type TicketDetailModalProps = {
  ticketId: string;
  onClose: () => void;
  onUpdate?: () => void;
  onViewProject?: () => void;
};

type ActiveTab = 'customer' | 'equipment' | 'adders';
type SubTab = 'ticket' | 'plan_set' | 'permit' | 'eng_letter' | 'site_survey';

export default function TicketDetailModal({ ticketId, onClose, onUpdate, onViewProject }: TicketDetailModalProps) {
  const [ticket, setTicket] = useState<SchedulingAppointment | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('customer');
  const [subTab, setSubTab] = useState<SubTab>('ticket');
  const [workPerformed, setWorkPerformed] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [showMapOptions, setShowMapOptions] = useState(false);
  const [showPhotoTicket, setShowPhotoTicket] = useState(false);
  const [showCloseDropdown, setShowCloseDropdown] = useState(false);
  const [planSetDocs, setPlanSetDocs] = useState<Document[]>([]);
  const [permitDocs, setPermitDocs] = useState<Document[]>([]);
  const [engLetterDocs, setEngLetterDocs] = useState<Document[]>([]);
  const [siteSurveyPhotos, setSiteSurveyPhotos] = useState<SiteSurveyPhotos | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchTicketDetails();
    fetchUserRole();
  }, [ticketId]);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData, error } = await supabase
          .from('app_users')
          .select('role, role_category')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && userData) {
          setUserRole(userData.role_category || userData.role);
        }
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  };

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);

      const { data: ticketData, error: ticketError } = await supabase
        .from('scheduling')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', ticketData.customer_id)
        .single();

      if (customerError) throw customerError;

      setTicket(ticketData);
      setCustomer(customerData);
      setWorkPerformed(ticketData.work_performed || '');
      setCloseReason(ticketData.close_reason || '');

      const { data: planSetData } = await supabase
        .from('documents')
        .select('*')
        .eq('customer_id', ticketData.customer_id)
        .eq('document_type', 'city_approved_plan_set')
        .order('uploaded_at', { ascending: false });
      setPlanSetDocs(planSetData || []);

      const { data: permitData } = await supabase
        .from('documents')
        .select('*')
        .eq('customer_id', ticketData.customer_id)
        .eq('document_type', 'city_approved_permit')
        .order('uploaded_at', { ascending: false });
      setPermitDocs(permitData || []);

      const { data: engLetterData } = await supabase
        .from('documents')
        .select('*')
        .eq('customer_id', ticketData.customer_id)
        .eq('document_type', 'city_approved_eng_letter')
        .order('uploaded_at', { ascending: false });
      setEngLetterDocs(engLetterData || []);

      const { data: siteSurveyData } = await supabase
        .from('site_survey_photos')
        .select('*')
        .eq('ticket_id', ticketId)
        .maybeSingle();
      setSiteSurveyPhotos(siteSurveyData);
    } catch (err) {
      console.error('Error fetching ticket details:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProgressStep = async (field: string, value: any) => {
    if (!ticket) return;

    try {
      setSaving(true);

      if (field === 'arrived_at' && value !== null) {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: activeClockEntry } = await supabase
            .from('time_clock')
            .select('id')
            .eq('user_id', user.id)
            .not('clocked_in_at', 'is', null)
            .is('clocked_out_at', null)
            .maybeSingle();

          if (activeClockEntry) {
            await supabase
              .from('time_clock')
              .update({ clocked_out_at: new Date().toISOString() })
              .eq('id', activeClockEntry.id);
          }
        }
      }

      const { error } = await supabase
        .from('scheduling')
        .update({ [field]: value })
        .eq('id', ticketId);

      if (error) throw error;

      await fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error updating progress:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleProgressClick = (step: string) => {
    const now = new Date().toISOString();

    console.log('handleProgressClick:', step, 'ticket_type:', ticket?.ticket_type);

    switch (step) {
      case 'in_transit':
        if (!ticket?.in_transit_at) {
          setShowMapOptions(true);
        } else {
          updateProgressStep('in_transit_at', null);
        }
        break;
      case 'arrived':
        updateProgressStep('arrived_at', ticket?.arrived_at ? null : now);
        break;
      case 'begin':
        if (ticket?.begin_ticket_at) {
          updateProgressStep('begin_ticket_at', null);
        } else if (
          ticket.ticket_type === 'installation' ||
          ticket.ticket_type === 'inspection'
        ) {
          console.log('Opening photo ticket modal for:', ticket.ticket_type, ticket.problem_code);
          setShowPhotoTicket(true);
        } else {
          console.log('Setting begin_ticket_at timestamp for:', ticket.ticket_type);
          updateProgressStep('begin_ticket_at', now);
        }
        break;
      case 'departing':
        if (!workPerformed.trim()) {
          alert('Please add a description of work performed before departing the site.');
          return;
        }
        updateProgressStep('departing_at', ticket?.departing_at ? null : now);
        break;
      case 'closed':
        if (ticket?.closed_at) {
          updateProgressStep('closed_at', null);
          updateProgressStep('close_reason', null);
        } else {
          setShowCloseDropdown(true);
        }
        break;
    }
  };

  const openMap = (type: 'apple' | 'google') => {
    if (!customer?.address) return;

    const encodedAddress = encodeURIComponent(customer.address);
    const url = type === 'apple'
      ? `maps://maps.apple.com/?q=${encodedAddress}`
      : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

    window.open(url, '_blank');
    setShowMapOptions(false);

    const now = new Date().toISOString();
    updateProgressStep('in_transit_at', now);
  };

  const saveWorkPerformed = async () => {
    if (!ticket) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('scheduling')
        .update({ work_performed: workPerformed })
        .eq('id', ticketId);

      if (error) throw error;

      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error saving work performed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseTicket = async (reason: string) => {
    if (!ticket) return;

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();

      const updateData: any = {
        closed_at: now,
        close_reason: reason
      };

      if (ticket.ticket_type === 'installation' && user) {
        updateData.pv_installer_id = user.id;
      }

      const { error } = await supabase
        .from('scheduling')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      if (ticket.ticket_type === 'inspection' && customer) {
        let inspectionStatus = null;

        if (reason === 'Inspection Passed') {
          inspectionStatus = 'passed';
        } else if (reason === 'Inspection Failed') {
          inspectionStatus = 'failed';
        }

        if (inspectionStatus) {
          const timelineUpdate: any = {
            city_inspection_date: now,
            city_inspection_status: inspectionStatus,
            inspection_status: inspectionStatus
          };

          const { error: timelineError } = await supabase
            .from('project_timeline')
            .update(timelineUpdate)
            .eq('customer_id', customer.id);

          if (timelineError) {
            console.error('Error updating project timeline:', timelineError);
          }
        }
      }

      setShowCloseDropdown(false);
      await fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error closing ticket:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoTicketClose = async () => {
    setShowPhotoTicket(false);

    if (!ticket?.begin_ticket_at) {
      const now = new Date().toISOString();
      await updateProgressStep('begin_ticket_at', now);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      month: 'numeric',
      day: 'numeric',
      year: '2-digit'
    });
  };

  const formatTimeRange = (date: string | null, startTime: string | null, endTime: string | null) => {
    if (!date) return '';

    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    if (startTime && endTime) {
      const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
      };

      return `${dateStr}, ${formatTime(startTime)}- ${formatTime(endTime)}`;
    }

    return dateStr;
  };

  const formatLabel = (value: string) => {
    return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getDocumentUrl = (document: Document) => {
    const { data } = supabase.storage
      .from('customer-documents')
      .getPublicUrl(document.file_path);
    return data.publicUrl;
  };

  const downloadDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('customer-documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
    }
  };

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  const isPdfFile = (mimeType: string) => {
    return mimeType === 'application/pdf';
  };

  const renderDocumentSection = (documents: Document[], title: string) => {
    if (documents.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          No {title.toLowerCase()} documents found
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {documents.map((doc) => {
          const url = getDocumentUrl(doc);
          return (
            <div
              key={doc.id}
              className="bg-white border border-gray-300 rounded-lg overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {doc.file_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => downloadDocument(doc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
              <div className="p-3">
                {isImageFile(doc.mime_type) ? (
                  <img
                    src={url}
                    alt={doc.file_name}
                    className="w-full h-auto rounded border border-gray-200"
                  />
                ) : isPdfFile(doc.mime_type) ? (
                  <iframe
                    src={url}
                    className="w-full h-[600px] rounded border border-gray-200"
                    title={doc.file_name}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">Preview not available for this file type</p>
                    <p className="text-xs mt-1">Click Download to view the file</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSiteSurveyPhotos = () => {
    if (!siteSurveyPhotos || Object.keys(siteSurveyPhotos.photo_urls).length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          No site survey photos found
        </div>
      );
    }

    const allPhotos: Array<{ url: string; label: string }> = [];
    Object.entries(siteSurveyPhotos.photo_urls).forEach(([key, urls]) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      urls.forEach((url) => {
        allPhotos.push({ url, label });
      });
    });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {allPhotos.map((photo, idx) => (
            <div key={idx} className="space-y-1">
              <img
                src={photo.url}
                alt={photo.label}
                className="w-full h-48 object-cover rounded-lg border border-gray-300"
              />
              <div className="text-xs text-gray-600 px-1">{photo.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading || !ticket || !customer) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-h-[90vh] flex flex-col" style={{ maxWidth: '329px' }}>
        <div className="flex-shrink-0 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('customer')}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeTab === 'customer'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Customer
              </button>
              <button
                onClick={() => setActiveTab('equipment')}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeTab === 'equipment'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Equipment
              </button>
              <button
                onClick={() => setActiveTab('adders')}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeTab === 'adders'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Adders
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {activeTab === 'customer' && (
            <div className="p-3 bg-gray-50">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="w-3 h-3 rounded" />
                    <h2 className="text-lg font-bold text-gray-900">
                      {customer.full_name} (#{customer.customer_id})
                    </h2>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <input type="checkbox" className="w-3 h-3 rounded mt-0.5" />
                  <div className="flex items-center gap-2 text-orange-500 flex-1">
                    <span className="text-sm">{customer.address}</span>
                    <button className="p-1.5 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors">
                      <MapPin className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700 text-sm">
                  <div className="flex items-center gap-1.5">
                    <input type="checkbox" className="w-3 h-3 rounded" />
                    <Phone className="w-3 h-3 text-orange-500" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-orange-500" />
                    <span className="text-xs">{customer.email}</span>
                  </div>
                </div>

                <div className="text-xs font-medium text-gray-900">
                  {formatTimeRange(ticket.scheduled_date, ticket.time_window_start, ticket.time_window_end)}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-gray-900 text-white rounded p-1.5 text-center">
                    <div className="text-xs text-gray-400">Panels</div>
                    <div className="text-sm font-bold text-orange-500">{customer.panel_quantity}</div>
                  </div>
                  <div className="bg-gray-900 text-white rounded p-1.5 text-center">
                    <div className="text-xs text-gray-400">Size (kW)</div>
                    <div className="text-sm font-bold text-orange-500">{(customer.system_size_kw / 1000).toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-900 text-white rounded p-1.5 text-center">
                    <div className="text-xs text-gray-400">Roof</div>
                    <div className="text-sm font-bold text-orange-500">{customer.roof_type || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            {activeTab === 'customer' && (
            <>
              <div className="flex gap-2 mb-3 border-b border-gray-200 pb-2 overflow-x-auto">
                {['ticket', 'plan_set', 'permit', 'eng_letter', 'site_survey'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSubTab(tab as SubTab)}
                    className={`px-3 py-1.5 rounded-t text-sm font-medium transition-colors whitespace-nowrap ${
                      subTab === tab
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {formatLabel(tab)}
                  </button>
                ))}
              </div>

              {subTab === 'ticket' && (
                <div className="space-y-3">
                  <div className="bg-gray-900 text-white rounded-lg p-2.5">
                    <h3 className="text-base font-bold mb-1.5">{formatLabel(ticket.ticket_type || 'service')}</h3>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs text-gray-400">Assigned:</span>
                      <span className="text-sm font-medium">
                        {ticket.assigned_technicians && ticket.assigned_technicians.length > 0
                          ? ticket.assigned_technicians.join('/')
                          : 'Unassigned'}
                      </span>
                    </div>
                    {ticket.notes && (
                      <div className="text-xs whitespace-pre-wrap">{ticket.notes}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div
                      onClick={() => handleProgressClick('in_transit')}
                      className={`flex items-center justify-between p-2 rounded border-2 cursor-pointer transition-colors ${
                        ticket.in_transit_at
                          ? 'bg-green-50 border-green-500'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Truck className={`w-4 h-4 ${ticket.in_transit_at ? 'text-green-600' : 'text-gray-400'}`} />
                        <div>
                          <div className="text-sm font-medium">1. In Transit to Site</div>
                        </div>
                      </div>
                      {ticket.in_transit_at && (
                        <div className="text-xs font-medium text-green-600">
                          {formatDateTime(ticket.in_transit_at)}
                        </div>
                      )}
                    </div>

                    <div
                      onClick={() => handleProgressClick('arrived')}
                      className={`flex items-center justify-between p-2 rounded border-2 cursor-pointer transition-colors ${
                        ticket.arrived_at
                          ? 'bg-green-50 border-green-500'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Home className={`w-4 h-4 ${ticket.arrived_at ? 'text-green-600' : 'text-gray-400'}`} />
                        <div>
                          <div className="text-sm font-medium">2. Arrived on Site</div>
                        </div>
                      </div>
                      {ticket.arrived_at && (
                        <div className="text-xs font-medium text-green-600">
                          {formatDateTime(ticket.arrived_at)}
                        </div>
                      )}
                    </div>

                    <div
                      onClick={() => handleProgressClick('begin')}
                      className={`flex items-center justify-between p-2 rounded border-2 cursor-pointer transition-colors ${
                        ticket.begin_ticket_at
                          ? 'bg-green-50 border-green-500'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <PlayCircle className={`w-4 h-4 ${ticket.begin_ticket_at ? 'text-green-600' : 'text-gray-400'}`} />
                        <div className="text-sm font-medium">3. Begin Ticket</div>
                      </div>
                      {ticket.begin_ticket_at && (
                        <div className="text-xs font-medium text-green-600">
                          {formatDateTime(ticket.begin_ticket_at)}
                        </div>
                      )}
                    </div>

                    <div className="p-2 rounded border-2 border-gray-300 bg-white">
                      <div className="flex items-center gap-2 mb-1.5">
                        <ClipboardList className="w-4 h-4 text-gray-600" />
                        <div className="text-sm font-medium">4. Work Performed *</div>
                      </div>
                      <textarea
                        value={workPerformed}
                        onChange={(e) => setWorkPerformed(e.target.value)}
                        onBlur={saveWorkPerformed}
                        placeholder="Describe the work performed..."
                        rows={3}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div
                      onClick={() => handleProgressClick('departing')}
                      className={`flex items-center justify-between p-2 rounded border-2 cursor-pointer transition-colors ${
                        ticket.departing_at
                          ? 'bg-green-50 border-green-500'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <LogOut className={`w-4 h-4 ${ticket.departing_at ? 'text-green-600' : 'text-gray-400'}`} />
                        <div>
                          <div className="text-sm font-medium">5. Departing Site</div>
                        </div>
                      </div>
                      {ticket.departing_at && (
                        <div className="text-xs font-medium text-green-600">
                          {formatDateTime(ticket.departing_at)}
                        </div>
                      )}
                    </div>

                    <div
                      onClick={() => handleProgressClick('closed')}
                      className={`flex items-center justify-between p-2 rounded border-2 cursor-pointer transition-colors ${
                        ticket.closed_at
                          ? 'bg-green-50 border-green-500'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 ${ticket.closed_at ? 'text-green-600' : 'text-gray-400'}`} />
                        <div>
                          <div className="text-sm font-medium">6. Close Ticket</div>
                          {ticket.close_reason && (
                            <div className="text-xs text-gray-600">{ticket.close_reason}</div>
                          )}
                        </div>
                      </div>
                      {ticket.closed_at && (
                        <div className="text-xs font-medium text-green-600">
                          {formatDateTime(ticket.closed_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {subTab === 'plan_set' && renderDocumentSection(planSetDocs, 'Plan Set')}

              {subTab === 'permit' && renderDocumentSection(permitDocs, 'Permit')}

              {subTab === 'eng_letter' && renderDocumentSection(engLetterDocs, 'Engineer Letter')}

              {subTab === 'site_survey' && renderSiteSurveyPhotos()}
            </>
          )}

          {activeTab === 'equipment' && (
            <div className="p-3">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Panel Brand</div>
                    <div className="text-sm font-medium">{customer.panel_brand}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Panel Wattage</div>
                    <div className="text-sm font-medium">{customer.panel_wattage}W</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Inverter</div>
                    <div className="text-sm font-medium">{customer.inverter_option}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Racking</div>
                    <div className="text-sm font-medium">{customer.racking_type}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'adders' && (
            <div className="p-3">
              <div className="space-y-1">
                {customer.adder_steep_roof && <div className="text-sm">✓ Steep Roof</div>}
                {customer.adder_metal_roof && <div className="text-sm">✓ Metal Roof</div>}
                {customer.adder_tile_roof && <div className="text-sm">✓ Tile Roof</div>}
                {customer.adder_small_system && <div className="text-sm">✓ Small System</div>}
                {customer.adder_fsu && <div className="text-sm">✓ FSU</div>}
                {customer.adder_mpu && <div className="text-sm">✓ MPU</div>}
                {customer.adder_critter_guard && <div className="text-sm">✓ Critter Guard</div>}
                {!customer.adder_steep_roof && !customer.adder_metal_roof && !customer.adder_tile_roof &&
                 !customer.adder_small_system && !customer.adder_fsu && !customer.adder_mpu &&
                 !customer.adder_critter_guard && (
                  <div className="text-sm text-gray-500">No adders selected</div>
                )}
              </div>
            </div>
          )}
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3 flex items-center justify-between">
          {onViewProject ? (
            <button
              onClick={onViewProject}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <FolderOpen className="w-4 h-4" />
              Project
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
            <button
              onClick={async () => {
                if (ticket) {
                  setSaving(true);
                  try {
                    await supabase
                      .from('scheduling')
                      .update({
                        work_performed: workPerformed,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', ticketId);
                    if (onUpdate) onUpdate();
                    onClose();
                  } catch (err) {
                    console.error('Error saving ticket:', err);
                  } finally {
                    setSaving(false);
                  }
                }
              }}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {showMapOptions && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-4">Choose Map App</h3>
            <div className="space-y-3">
              <button
                onClick={() => openMap('apple')}
                className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Apple Maps
              </button>
              <button
                onClick={() => openMap('google')}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Google Maps
              </button>
              <button
                onClick={() => setShowMapOptions(false)}
                className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPhotoTicket && ticket.ticket_type === 'installation' && (
        <InstallationPhotoTicket
          ticketId={ticketId}
          onClose={handlePhotoTicketClose}
        />
      )}

      {showPhotoTicket && ticket.ticket_type === 'inspection' && ticket.problem_code === 'site_survey' && (
        <SiteSurveyPhotoTicket
          ticketId={ticketId}
          onClose={handlePhotoTicketClose}
        />
      )}

      {showPhotoTicket && ticket.ticket_type === 'inspection' && ticket.problem_code !== 'site_survey' && (
        <InspectionPhotoTicket
          ticketId={ticketId}
          onClose={handlePhotoTicketClose}
        />
      )}

      {showCloseDropdown && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-4">Close Ticket - Select Reason</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleCloseTicket('Install Complete')}
                className="w-full px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium text-left"
              >
                Install Complete
              </button>
              <button
                onClick={() => handleCloseTicket('Service Complete')}
                className="w-full px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium text-left"
              >
                Service Complete
              </button>
              <button
                onClick={() => handleCloseTicket('Site Survey Complete')}
                className="w-full px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium text-left"
              >
                Site Survey Complete
              </button>
              <button
                onClick={() => handleCloseTicket('Inspection Passed')}
                className="w-full px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium text-left"
              >
                Inspection Passed
              </button>
              <button
                onClick={() => handleCloseTicket('Inspection Failed')}
                className="w-full px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium text-left"
              >
                Inspection Failed
              </button>
              <button
                onClick={() => handleCloseTicket('Additional Day Required')}
                className="w-full px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium text-left"
              >
                Additional Day Required
              </button>
              <button
                onClick={() => handleCloseTicket('Weather Re-Schedule')}
                className="w-full px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium text-left"
              >
                Weather Re-Schedule
              </button>
              <button
                onClick={() => handleCloseTicket('Customer Re-Schedule')}
                className="w-full px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium text-left"
              >
                Customer Re-Schedule
              </button>
              <button
                onClick={() => handleCloseTicket('Company Re-Schedule')}
                className="w-full px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium text-left"
              >
                Company Re-Schedule
              </button>
              <button
                onClick={() => setShowCloseDropdown(false)}
                className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
