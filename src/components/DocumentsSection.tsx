import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Folder, Camera, Upload, Image } from 'lucide-react';
import DocumentUpload from './DocumentUpload';
import { supabase } from '../lib/supabase';

interface DocumentsSectionProps {
  customerId: string;
}

type PhotoTicket = {
  ticket_id: string;
  photo_urls: Record<string, string[]>;
  inverter_type: string;
  inverter_serial_number: string;
  rgm_serial_number: string;
  combiner_serial_number: string;
  created_at: string;
};

export default function DocumentsSection({ customerId }: DocumentsSectionProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    customer: false,
    permits: false,
    receipts: false,
    installation: false,
    siteSurvey: false,
  });
  const [installationTickets, setInstallationTickets] = useState<PhotoTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<PhotoTicket | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInstallationPhotos();
  }, [customerId]);

  const loadInstallationPhotos = async () => {
    try {
      setLoading(true);

      const { data: schedulingData, error: schedError } = await supabase
        .from('scheduling')
        .select('ticket_id')
        .eq('customer_id', customerId)
        .eq('work_type', 'installation');

      if (schedError) throw schedError;

      const ticketIds = schedulingData?.map(s => s.ticket_id) || [];

      if (ticketIds.length === 0) {
        setInstallationTickets([]);
        return;
      }

      const { data: photosData, error: photosError } = await supabase
        .from('installation_photos')
        .select('*')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;

      setInstallationTickets(photosData || []);
    } catch (err) {
      console.error('Error loading installation photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = async (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));

    if (folderId === 'installation' && !expandedFolders[folderId]) {
      await loadInstallationPhotos();
    }
  };

  const getPhotoLabel = (photoId: string): string => {
    const labels: Record<string, string> = {
      'rooftop_0': 'ROOF TOP',
      'rooftop_1': 'Drill Hole W/Sealant',
      'rooftop_2': 'Flashing',
      'rooftop_3': 'Lag bolt & Washer',
      'rooftop_4': 'Full Array',
      'rooftop_5': 'Conduit Entry',
      'electrical_0': 'Main Service Panel',
      'electrical_1': 'Inverter',
      'electrical_2': 'Breakers',
      'electrical_3': 'Wire Management',
      'electrical_4': 'AC Disconnect',
      'electrical_5': 'Production Meter',
      'electrical_6': 'Meter Open & Closed',
      'electrical_7': 'IEEE Grid Setting Screenshot',
    };
    return labels[photoId] || photoId;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleFolder('customer')}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
        >
          {expandedFolders.customer ? (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}
          <Folder className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Customer Documents</h3>
        </button>

        {expandedFolders.customer && (
          <div className="p-6 pt-0 space-y-6 border-t border-gray-100">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Customer Contract</h4>
              <DocumentUpload
                customerId={customerId}
                documentType="contract"
                label="Upload Contract"
              />
            </div>

            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Utility Bill</h4>
              <DocumentUpload
                customerId={customerId}
                documentType="utility_bill"
                label="Upload Utility Bill"
              />
            </div>

            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Identification</h4>
              <div className="space-y-6 pl-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-600 mb-3">Passport</h5>
                  <DocumentUpload
                    customerId={customerId}
                    documentType="identification"
                    identificationType="passport"
                    label="Upload Passport"
                  />
                </div>

                <div className="border-t pt-6">
                  <h5 className="text-sm font-medium text-gray-600 mb-3">Driver's License</h5>
                  <div className="space-y-4">
                    <DocumentUpload
                      customerId={customerId}
                      documentType="identification"
                      identificationType="drivers_license_front"
                      label="Front"
                    />
                    <DocumentUpload
                      customerId={customerId}
                      documentType="identification"
                      identificationType="drivers_license_back"
                      label="Back"
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h5 className="text-sm font-medium text-gray-600 mb-3">State ID</h5>
                  <div className="space-y-4">
                    <DocumentUpload
                      customerId={customerId}
                      documentType="identification"
                      identificationType="state_id_front"
                      label="Front"
                    />
                    <DocumentUpload
                      customerId={customerId}
                      documentType="identification"
                      identificationType="state_id_back"
                      label="Back"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleFolder('permits')}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
        >
          {expandedFolders.permits ? (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}
          <Folder className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Permits & Plans</h3>
        </button>

        {expandedFolders.permits && (
          <div className="p-6 pt-0 space-y-6 border-t border-gray-100">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">City Approved Permit</h4>
              <DocumentUpload
                customerId={customerId}
                documentType="city_approved_permit"
                label="Upload City Approved Permit"
              />
            </div>

            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">City Approved Plan Set</h4>
              <DocumentUpload
                customerId={customerId}
                documentType="city_approved_plan_set"
                label="Upload Plan Set"
              />
            </div>

            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">City Approved Engineer Letter</h4>
              <DocumentUpload
                customerId={customerId}
                documentType="city_approved_eng_letter"
                label="Upload Engineer Letter"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleFolder('receipts')}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
        >
          {expandedFolders.receipts ? (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}
          <Folder className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Receipts</h3>
        </button>

        {expandedFolders.receipts && (
          <div className="p-6 pt-0 border-t border-gray-100">
            <DocumentUpload
              customerId={customerId}
              documentType="receipts"
              label="Upload Receipts"
              showMultipleOptions
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleFolder('installation')}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
        >
          {expandedFolders.installation ? (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}
          <Camera className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Installation Photos</h3>
          {installationTickets.length > 0 && (
            <span className="ml-auto text-sm text-gray-500">
              {installationTickets.length} {installationTickets.length === 1 ? 'ticket' : 'tickets'}
            </span>
          )}
        </button>

        {expandedFolders.installation && (
          <div className="p-6 pt-0 border-t border-gray-100">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading photos...</div>
            ) : installationTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No installation photos available yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {installationTickets.map((ticket) => (
                  <div key={ticket.ticket_id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">Ticket #{ticket.ticket_id}</h4>
                        <p className="text-xs text-gray-500">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedTicket(selectedTicket?.ticket_id === ticket.ticket_id ? null : ticket)}
                        className="px-3 py-1.5 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-xs"
                      >
                        {selectedTicket?.ticket_id === ticket.ticket_id ? 'Hide' : 'View'}
                      </button>
                    </div>

                    {selectedTicket?.ticket_id === ticket.ticket_id && (
                      <div className="mt-3 space-y-3 border-t pt-3">
                        <div className="bg-gray-50 rounded p-2">
                          <h5 className="text-xs font-medium text-gray-700 mb-1">Inverter Info</h5>
                          <div className="text-xs space-y-0.5 text-gray-600">
                            <p>Type: {ticket.inverter_type === 'solaredge' ? 'SolarEdge' : ticket.inverter_type === 'enphase' ? 'Enphase' : 'Other'}</p>
                            {ticket.inverter_serial_number && (
                              <p>Serial: {ticket.inverter_serial_number}</p>
                            )}
                            {ticket.rgm_serial_number && (
                              <p>RGM: {ticket.rgm_serial_number}</p>
                            )}
                            {ticket.combiner_serial_number && (
                              <p>Combiner: {ticket.combiner_serial_number}</p>
                            )}
                          </div>
                        </div>

                        {Object.entries(ticket.photo_urls).map(([photoId, urls]) => (
                          <div key={photoId} className="border-t pt-2">
                            <h5 className="text-xs font-medium text-gray-700 mb-2">{getPhotoLabel(photoId)}</h5>
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                              {urls.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative group aspect-square"
                                >
                                  <img
                                    src={url}
                                    alt={`${getPhotoLabel(photoId)} ${idx + 1}`}
                                    className="w-full h-full object-cover rounded border border-gray-300 hover:border-orange-500 transition-colors"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded flex items-center justify-center">
                                    <Upload className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleFolder('siteSurvey')}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
        >
          {expandedFolders.siteSurvey ? (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}
          <Camera className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Site Survey Photos</h3>
        </button>

        {expandedFolders.siteSurvey && (
          <div className="p-6 pt-0 border-t border-gray-100">
            <div className="text-center py-8 text-gray-500">
              <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No site survey photos available yet</p>
              <p className="text-sm mt-2">Coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
