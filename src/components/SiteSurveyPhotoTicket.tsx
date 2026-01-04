import { useState, useEffect, useRef } from 'react';
import { X, Camera, CheckCircle, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type SiteSurveyPhotoTicketProps = {
  ticketId: string;
  onClose: () => void;
};

type PhotoItem = {
  id: string;
  label: string;
  isChecked: boolean;
  photos: string[];
};

const HOME_EXTERIOR_PHOTOS = [
  'Front of Home',
  'East Side of Home',
  'West Side of Home',
  'Back of Home',
];

const MAIN_PANEL_PHOTOS = [
  'Main Panel Location Step Back',
  'Main Panel Deadfront ON',
  'Main Panel Deadfront OFF',
  'Main Breaker',
  'All Breakers',
  'Main Panel Bus Rating Labels',
  'Main Panel Ground Bar',
  'Main Panel Neutral Bar',
];

const METER_PHOTOS = [
  'Meter Step Back',
  'Meter Close Up',
  'Meter Height Measurement',
];

const ATTIC_PHOTOS = [
  'Attic Photos (Surroundings)',
  'Rafter Measurements',
  'Attic Pre-Existing Damages',
];

const ROOF_PHOTOS = [
  'Roof Close Up',
  'Roof Photos (All Arrays)',
  'Tilt Measurement Photos (All Arrays)',
  'Roof Measurements Photos (All Arrays)',
];

export default function SiteSurveyPhotoTicket({ ticketId, onClose }: SiteSurveyPhotoTicketProps) {
  const [homeExteriorPhotos, setHomeExteriorPhotos] = useState<PhotoItem[]>([]);
  const [mainPanelPhotos, setMainPanelPhotos] = useState<PhotoItem[]>([]);
  const [meterPhotos, setMeterPhotos] = useState<PhotoItem[]>([]);
  const [atticPhotos, setAtticPhotos] = useState<PhotoItem[]>([]);
  const [roofPhotos, setRoofPhotos] = useState<PhotoItem[]>([]);
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
        .from('site_survey_photos')
        .select('*')
        .eq('ticket_id', ticketId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      const checkedPhotos = new Set(data?.checked_photos || []);
      const photoUrls = data?.photo_urls || {};

      setHomeExteriorPhotos(HOME_EXTERIOR_PHOTOS.map((label, idx) => ({
        id: `home_exterior_${idx}`,
        label,
        isChecked: checkedPhotos.has(`home_exterior_${idx}`),
        photos: photoUrls[`home_exterior_${idx}`] || [],
      })));

      setMainPanelPhotos(MAIN_PANEL_PHOTOS.map((label, idx) => ({
        id: `main_panel_${idx}`,
        label,
        isChecked: checkedPhotos.has(`main_panel_${idx}`),
        photos: photoUrls[`main_panel_${idx}`] || [],
      })));

      setMeterPhotos(METER_PHOTOS.map((label, idx) => ({
        id: `meter_${idx}`,
        label,
        isChecked: checkedPhotos.has(`meter_${idx}`),
        photos: photoUrls[`meter_${idx}`] || [],
      })));

      setAtticPhotos(ATTIC_PHOTOS.map((label, idx) => ({
        id: `attic_${idx}`,
        label,
        isChecked: checkedPhotos.has(`attic_${idx}`),
        photos: photoUrls[`attic_${idx}`] || [],
      })));

      setRoofPhotos(ROOF_PHOTOS.map((label, idx) => ({
        id: `roof_${idx}`,
        label,
        isChecked: checkedPhotos.has(`roof_${idx}`),
        photos: photoUrls[`roof_${idx}`] || [],
      })));
    } catch (err) {
      console.error('Error loading photo status:', err);
      initializePhotos();
    } finally {
      setLoading(false);
    }
  };

  const initializePhotos = () => {
    setHomeExteriorPhotos(HOME_EXTERIOR_PHOTOS.map((label, idx) => ({
      id: `home_exterior_${idx}`,
      label,
      isChecked: false,
      photos: [],
    })));

    setMainPanelPhotos(MAIN_PANEL_PHOTOS.map((label, idx) => ({
      id: `main_panel_${idx}`,
      label,
      isChecked: false,
      photos: [],
    })));

    setMeterPhotos(METER_PHOTOS.map((label, idx) => ({
      id: `meter_${idx}`,
      label,
      isChecked: false,
      photos: [],
    })));

    setAtticPhotos(ATTIC_PHOTOS.map((label, idx) => ({
      id: `attic_${idx}`,
      label,
      isChecked: false,
      photos: [],
    })));

    setRoofPhotos(ROOF_PHOTOS.map((label, idx) => ({
      id: `roof_${idx}`,
      label,
      isChecked: false,
      photos: [],
    })));
  };

  const saveToDatabase = async () => {
    try {
      const allCheckedPhotos = [
        ...homeExteriorPhotos.filter(p => p.isChecked).map(p => p.id),
        ...mainPanelPhotos.filter(p => p.isChecked).map(p => p.id),
        ...meterPhotos.filter(p => p.isChecked).map(p => p.id),
        ...atticPhotos.filter(p => p.isChecked).map(p => p.id),
        ...roofPhotos.filter(p => p.isChecked).map(p => p.id),
      ];

      const allPhotoUrls: { [key: string]: string[] } = {};
      [...homeExteriorPhotos, ...mainPanelPhotos, ...meterPhotos, ...atticPhotos, ...roofPhotos].forEach(photo => {
        if (photo.photos.length > 0) {
          allPhotoUrls[photo.id] = photo.photos;
        }
      });

      const { error } = await supabase
        .from('site_survey_photos')
        .upsert({
          ticket_id: ticketId,
          checked_photos: allCheckedPhotos,
          photo_urls: allPhotoUrls,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'ticket_id'
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error saving photo status:', err);
    }
  };

  const handlePhotoUpload = async (section: string, photoId: string, file: File) => {
    try {
      setUploading(photoId);

      const fileExt = file.name.split('.').pop();
      const fileName = `${ticketId}/${photoId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('site-survey-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-survey-photos')
        .getPublicUrl(fileName);

      switch (section) {
        case 'home_exterior':
          setHomeExteriorPhotos(prev =>
            prev.map(p => p.id === photoId ? { ...p, photos: [...p.photos, publicUrl], isChecked: true } : p)
          );
          break;
        case 'main_panel':
          setMainPanelPhotos(prev =>
            prev.map(p => p.id === photoId ? { ...p, photos: [...p.photos, publicUrl], isChecked: true } : p)
          );
          break;
        case 'meter':
          setMeterPhotos(prev =>
            prev.map(p => p.id === photoId ? { ...p, photos: [...p.photos, publicUrl], isChecked: true } : p)
          );
          break;
        case 'attic':
          setAtticPhotos(prev =>
            prev.map(p => p.id === photoId ? { ...p, photos: [...p.photos, publicUrl], isChecked: true } : p)
          );
          break;
        case 'roof':
          setRoofPhotos(prev =>
            prev.map(p => p.id === photoId ? { ...p, photos: [...p.photos, publicUrl], isChecked: true } : p)
          );
          break;
      }

      setTimeout(saveToDatabase, 100);
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleDeletePhoto = async (section: string, photoId: string, photoUrl: string, index: number) => {
    try {
      const fileName = photoUrl.split('/site-survey-photos/')[1];
      if (fileName) {
        await supabase.storage
          .from('site-survey-photos')
          .remove([fileName]);
      }

      const updatePhotos = (prev: PhotoItem[]) =>
        prev.map(p => {
          if (p.id === photoId) {
            const newPhotos = p.photos.filter((_, i) => i !== index);
            return { ...p, photos: newPhotos, isChecked: newPhotos.length > 0 };
          }
          return p;
        });

      switch (section) {
        case 'home_exterior':
          setHomeExteriorPhotos(updatePhotos);
          break;
        case 'main_panel':
          setMainPanelPhotos(updatePhotos);
          break;
        case 'meter':
          setMeterPhotos(updatePhotos);
          break;
        case 'attic':
          setAtticPhotos(updatePhotos);
          break;
        case 'roof':
          setRoofPhotos(updatePhotos);
          break;
      }

      setTimeout(saveToDatabase, 100);
    } catch (err) {
      console.error('Error deleting photo:', err);
    }
  };

  const handleClose = () => {
    saveToDatabase();
    onClose();
  };

  const renderPhotoSection = (photos: PhotoItem[], section: string, title: string) => {
    const completed = photos.filter(p => p.isChecked).length;

    return (
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-3 sticky top-0 bg-white py-2 border-b border-gray-200">
          {title} ({completed}/{photos.length})
        </h3>
        <div className="space-y-3">
          {photos.map((photo) => (
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
                        onClick={() => handleDeletePhoto(section, photo.id, url, idx)}
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
                    if (file) handlePhotoUpload(section, photo.id, file);
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
                    if (file) handlePhotoUpload(section, photo.id, file);
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
    );
  };

  const homeExteriorCompleted = homeExteriorPhotos.filter(p => p.isChecked).length;
  const mainPanelCompleted = mainPanelPhotos.filter(p => p.isChecked).length;
  const meterCompleted = meterPhotos.filter(p => p.isChecked).length;
  const atticCompleted = atticPhotos.filter(p => p.isChecked).length;
  const roofCompleted = roofPhotos.filter(p => p.isChecked).length;
  const totalCompleted = homeExteriorCompleted + mainPanelCompleted + meterCompleted + atticCompleted + roofCompleted;
  const totalPhotos = homeExteriorPhotos.length + mainPanelPhotos.length + meterPhotos.length + atticPhotos.length + roofPhotos.length;
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
            <h2 className="text-xl font-bold text-gray-900">Site Survey Photo Checklist</h2>
            <p className="text-sm text-gray-600">Track all required site survey photos</p>
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
            {renderPhotoSection(homeExteriorPhotos, 'home_exterior', 'Home Exterior')}
            {renderPhotoSection(mainPanelPhotos, 'main_panel', 'Main Panel')}
            {renderPhotoSection(meterPhotos, 'meter', 'Meter')}
            {renderPhotoSection(atticPhotos, 'attic', 'Attic')}
            {renderPhotoSection(roofPhotos, 'roof', 'Roof')}
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
