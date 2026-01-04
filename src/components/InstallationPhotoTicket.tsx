import { useState, useEffect, useRef } from 'react';
import { X, Camera, CheckCircle, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type InstallationPhotoTicketProps = {
  ticketId: string;
  onClose: () => void;
};

type PhotoItem = {
  id: string;
  label: string;
  isChecked: boolean;
  photos: string[];
};

const ROOFTOP_PHOTOS = [
  'ROOF TOP',
  'Drill Hole W/Sealant',
  'CLOSE UP: ATTACHMENTS',
  'all racking with opti/micro mounts (per array)',
  'Full bonding path (all arrays)',
  'module serial number (side of panel)',
  'module model number (back of panel)',
  'opti/micro serial number labels',
  'opti/micro labels',
  'opti/micro sticker map',
  'tilt measurements (per array)',
  'each array showing panels installed',
  'under array (s) wire management (per array)',
  'j-box open and closed(per array)',
  'attic run/rooftop conduit run(s)',
];

const ELECTRICAL_BASE_PHOTOS = [
  'Inverter/Combiner Labels',
];

const SOLAREDGE_PHOTOS = [
  'RGM Serial Number (Inside Lower Section of Inverter or from RGM Box)',
  'Inverter - No Face Plate',
  'Cell Card and Antenna',
  'Consump. Trans. (Pointing toward the Utility)',
  'Conduit: Side of House (Pull Back)',
  'BOS Pull back / Elec. Equip.',
  'MSP Open - Deadfront ON',
  'MSP - Deadfront OFF',
  'New Sub Panel(s)',
  'New Sub Panel Buss Rating (Label)',
  'Combiner Sub Panels (Multiple inverters, IQ Comb., Lrg Sub-panels, etc)',
  'Solar Tie-In (Tap/PV Breaker)',
  'Equipment Grounding Conductor (EGC) Path: (Ufer, Ground Rods X2)',
  'cold water bond',
  'AC Disconnect Open & Closed (Wiring Completed)',
  'Inverter Production Screenshots',
  'SolarEdge SetApp Screenshot (Show all optimizers paired, with cellular "S_OK")',
  'Meter Open & Closed',
  'IEEE Grid Setting Screenshot',
];

const ENPHASE_PHOTOS = [
  'photo of Combiner Panel Serial Number',
  'Combiner Panel (No Cover)',
  'Cell Kit',
  'Consump. Trans. (Pointing toward the Utility)',
  'Conduit: Side of House (Pull Back)',
  'BOS Pull back / Elec. Equip.',
  'MSP Open - Deadfront ON',
  'MSP - Deadfront OFF',
  'MSP Bus Rating Labels',
  'New Sub Panel(s) Deadfront ON',
  'New Sub Panel(s) Deadfront OFF',
  'New Sub Panel Buss Rating (Label)',
  'Solar Tie-In (Tap/PV Breaker)',
  'Line Side/Load Side Tap',
  'Production Meter Open/Closed',
  'AC Disconnect Open & Closed (Wiring Completed)',
  'Production Labels',
  'all disconnect labels',
  'all sticker labels',
  'Equipment Grounding Conductor (EGC) Path: (Ufer, Ground Rods X2)',
  'cold water bond',
  'Combiner Production Screenshots',
  'Meter Open & Closed',
  'IEEE Grid Setting Screenshot',
];

export default function InstallationPhotoTicket({ ticketId, onClose }: InstallationPhotoTicketProps) {
  const [rooftopPhotos, setRooftopPhotos] = useState<PhotoItem[]>([]);
  const [electricalPhotos, setElectricalPhotos] = useState<PhotoItem[]>([]);
  const [inverterType, setInverterType] = useState('solaredge');
  const [inverterSerialNumber, setInverterSerialNumber] = useState('');
  const [rgmSerialNumber, setRgmSerialNumber] = useState('');
  const [combinerSerialNumber, setCombinerSerialNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    loadPhotoStatus();
  }, [ticketId]);

  const loadPhotoStatus = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('installation_photos')
        .select('*')
        .eq('ticket_id', ticketId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      const checkedPhotos = new Set(data?.checked_photos || []);
      const photoUrls = data?.photo_urls || {};

      setRooftopPhotos(ROOFTOP_PHOTOS.map((label, idx) => ({
        id: `rooftop_${idx}`,
        label,
        isChecked: checkedPhotos.has(`rooftop_${idx}`),
        photos: photoUrls[`rooftop_${idx}`] || [],
      })));

      const electricalList = [
        ...ELECTRICAL_BASE_PHOTOS,
        ...(inverterType === 'solaredge' ? SOLAREDGE_PHOTOS : inverterType === 'enphase' ? ENPHASE_PHOTOS : [])
      ];
      setElectricalPhotos(electricalList.map((label, idx) => ({
        id: `electrical_${idx}`,
        label,
        isChecked: checkedPhotos.has(`electrical_${idx}`),
        photos: photoUrls[`electrical_${idx}`] || [],
      })));

      setInverterType(data?.inverter_type || 'solaredge');
      setInverterSerialNumber(data?.inverter_serial_number || '');
      setRgmSerialNumber(data?.rgm_serial_number || '');
      setCombinerSerialNumber(data?.combiner_serial_number || '');
    } catch (err) {
      console.error('Error loading photo status:', err);
      initializePhotos();
    } finally {
      setLoading(false);
    }
  };

  const initializePhotos = () => {
    setRooftopPhotos(ROOFTOP_PHOTOS.map((label, idx) => ({
      id: `rooftop_${idx}`,
      label,
      isChecked: false,
      photos: [],
    })));

    const electricalList = [
      ...ELECTRICAL_BASE_PHOTOS,
      ...(inverterType === 'solaredge' ? SOLAREDGE_PHOTOS : inverterType === 'enphase' ? ENPHASE_PHOTOS : [])
    ];
    setElectricalPhotos(electricalList.map((label, idx) => ({
      id: `electrical_${idx}`,
      label,
      isChecked: false,
      photos: [],
    })));
  };

  useEffect(() => {
    const electricalList = [
      ...ELECTRICAL_BASE_PHOTOS,
      ...(inverterType === 'solaredge' ? SOLAREDGE_PHOTOS : inverterType === 'enphase' ? ENPHASE_PHOTOS : [])
    ];
    setElectricalPhotos(prev => {
      const checkedIds = new Set(prev.filter(p => p.isChecked).map(p => p.id));
      const photoMap = Object.fromEntries(prev.map(p => [p.id, p.photos]));
      return electricalList.map((label, idx) => ({
        id: `electrical_${idx}`,
        label,
        isChecked: checkedIds.has(`electrical_${idx}`),
        photos: photoMap[`electrical_${idx}`] || [],
      }));
    });
  }, [inverterType]);

  const saveToDatabase = async () => {
    try {
      const allCheckedPhotos = [
        ...rooftopPhotos.filter(p => p.isChecked).map(p => p.id),
        ...electricalPhotos.filter(p => p.isChecked).map(p => p.id),
      ];

      const allPhotoUrls: { [key: string]: string[] } = {};
      [...rooftopPhotos, ...electricalPhotos].forEach(photo => {
        if (photo.photos.length > 0) {
          allPhotoUrls[photo.id] = photo.photos;
        }
      });

      const { error } = await supabase
        .from('installation_photos')
        .upsert({
          ticket_id: ticketId,
          checked_photos: allCheckedPhotos,
          photo_urls: allPhotoUrls,
          inverter_type: inverterType,
          inverter_serial_number: inverterSerialNumber,
          rgm_serial_number: rgmSerialNumber,
          combiner_serial_number: combinerSerialNumber,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'ticket_id'
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error saving photo status:', err);
    }
  };

  const handlePhotoUpload = async (section: 'rooftop' | 'electrical', photoId: string, file: File) => {
    try {
      setUploading(photoId);

      const fileExt = file.name.split('.').pop();
      const fileName = `${ticketId}/${photoId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('installation-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('installation-photos')
        .getPublicUrl(fileName);

      if (section === 'rooftop') {
        setRooftopPhotos(prev =>
          prev.map(p => p.id === photoId ? { ...p, photos: [...p.photos, publicUrl], isChecked: true } : p)
        );
      } else {
        setElectricalPhotos(prev =>
          prev.map(p => p.id === photoId ? { ...p, photos: [...p.photos, publicUrl], isChecked: true } : p)
        );
      }

      setTimeout(saveToDatabase, 100);
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleDeletePhoto = async (section: 'rooftop' | 'electrical', photoId: string, photoUrl: string, index: number) => {
    try {
      const fileName = photoUrl.split('/installation-photos/')[1];
      if (fileName) {
        await supabase.storage
          .from('installation-photos')
          .remove([fileName]);
      }

      if (section === 'rooftop') {
        setRooftopPhotos(prev =>
          prev.map(p => {
            if (p.id === photoId) {
              const newPhotos = p.photos.filter((_, i) => i !== index);
              return { ...p, photos: newPhotos, isChecked: newPhotos.length > 0 };
            }
            return p;
          })
        );
      } else {
        setElectricalPhotos(prev =>
          prev.map(p => {
            if (p.id === photoId) {
              const newPhotos = p.photos.filter((_, i) => i !== index);
              return { ...p, photos: newPhotos, isChecked: newPhotos.length > 0 };
            }
            return p;
          })
        );
      }

      setTimeout(saveToDatabase, 100);
    } catch (err) {
      console.error('Error deleting photo:', err);
    }
  };

  const togglePhoto = (section: 'rooftop' | 'electrical', photoId: string) => {
    if (section === 'rooftop') {
      setRooftopPhotos(prev =>
        prev.map(p => p.id === photoId ? { ...p, isChecked: !p.isChecked } : p)
      );
    } else {
      setElectricalPhotos(prev =>
        prev.map(p => p.id === photoId ? { ...p, isChecked: !p.isChecked } : p)
      );
    }
    setTimeout(saveToDatabase, 100);
  };

  const handleClose = () => {
    saveToDatabase();
    onClose();
  };

  const rooftopCompleted = rooftopPhotos.filter(p => p.isChecked).length;
  const electricalCompleted = electricalPhotos.filter(p => p.isChecked).length;
  const totalCompleted = rooftopCompleted + electricalCompleted;
  const totalPhotos = rooftopPhotos.length + electricalPhotos.length;
  const progress = totalPhotos > 0 ? (totalCompleted / totalPhotos) * 100 : 0;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Installation Photo Checklist</h2>
            <p className="text-sm text-gray-600">Track all required installation photos</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 bg-orange-50 border-b border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {totalCompleted} of {totalPhotos} photos
            </span>
            <span className="text-sm font-bold text-orange-600">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 sticky top-0 bg-white py-2 border-b border-gray-200">
                ROOF TOP ({rooftopCompleted}/{rooftopPhotos.length})
              </h3>
              <div className="space-y-3">
                {rooftopPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      photo.isChecked
                        ? 'bg-green-50 border-green-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`flex-shrink-0 mt-0.5 ${photo.isChecked ? 'text-green-600' : 'text-gray-400'}`}>
                        {photo.isChecked ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Camera className="w-5 h-5" />
                        )}
                      </div>
                      <div className={`font-medium flex-1 ${photo.isChecked ? 'text-green-900' : 'text-gray-900'}`}>
                        {photo.label}
                      </div>
                    </div>

                    {photo.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2 ml-8">
                        {photo.photos.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={url}
                              alt={`${photo.label} ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded border border-gray-300"
                            />
                            <button
                              onClick={() => handleDeletePhoto('rooftop', photo.id, url, idx)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 ml-8">
                      <input
                        ref={(el) => fileInputRefs.current[`${photo.id}_camera`] = el}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload('rooftop', photo.id, file);
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRefs.current[`${photo.id}_camera`]?.click()}
                        disabled={uploading === photo.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4" />
                        {uploading === photo.id ? 'Uploading...' : 'Camera'}
                      </button>

                      <input
                        ref={(el) => fileInputRefs.current[`${photo.id}_library`] = el}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload('rooftop', photo.id, file);
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRefs.current[`${photo.id}_library`]?.click()}
                        disabled={uploading === photo.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Library
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 sticky top-0 bg-white py-2 border-b border-gray-200">
                Electrical ({electricalCompleted}/{electricalPhotos.length})
              </h3>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inverter Type
                  </label>
                  <select
                    value={inverterType}
                    onChange={(e) => {
                      setInverterType(e.target.value);
                      saveToDatabase();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="solaredge">SolarEdge</option>
                    <option value="enphase">Enphase</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inverter/Combiner Serial Number *
                  </label>
                  <input
                    type="text"
                    value={inverterSerialNumber}
                    onChange={(e) => setInverterSerialNumber(e.target.value)}
                    onBlur={saveToDatabase}
                    placeholder="Enter serial number..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {inverterType === 'solaredge' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RGM Serial Number *
                    </label>
                    <input
                      type="text"
                      value={rgmSerialNumber}
                      onChange={(e) => setRgmSerialNumber(e.target.value)}
                      onBlur={saveToDatabase}
                      placeholder="Enter RGM serial number..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                )}

                {inverterType === 'enphase' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Combiner Panel Serial Number *
                    </label>
                    <input
                      type="text"
                      value={combinerSerialNumber}
                      onChange={(e) => setCombinerSerialNumber(e.target.value)}
                      onBlur={saveToDatabase}
                      placeholder="Enter combiner panel serial number..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {electricalPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      photo.isChecked
                        ? 'bg-green-50 border-green-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`flex-shrink-0 mt-0.5 ${photo.isChecked ? 'text-green-600' : 'text-gray-400'}`}>
                        {photo.isChecked ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Camera className="w-5 h-5" />
                        )}
                      </div>
                      <div className={`font-medium flex-1 ${photo.isChecked ? 'text-green-900' : 'text-gray-900'}`}>
                        {photo.label}
                      </div>
                    </div>

                    {photo.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2 ml-8">
                        {photo.photos.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={url}
                              alt={`${photo.label} ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded border border-gray-300"
                            />
                            <button
                              onClick={() => handleDeletePhoto('electrical', photo.id, url, idx)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 ml-8">
                      <input
                        ref={(el) => fileInputRefs.current[`${photo.id}_camera`] = el}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload('electrical', photo.id, file);
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRefs.current[`${photo.id}_camera`]?.click()}
                        disabled={uploading === photo.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4" />
                        {uploading === photo.id ? 'Uploading...' : 'Camera'}
                      </button>

                      <input
                        ref={(el) => fileInputRefs.current[`${photo.id}_library`] = el}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload('electrical', photo.id, file);
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRefs.current[`${photo.id}_library`]?.click()}
                        disabled={uploading === photo.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Library
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
