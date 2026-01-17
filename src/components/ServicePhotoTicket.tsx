import { useState, useEffect, useRef } from 'react';
import { X, Camera, CheckCircle, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ServicePhotoTicketProps = {
  ticketId: string;
  onClose: () => void;
};

type PhotoItem = {
  id: string;
  label: string;
  isChecked: boolean;
  photos: string[];
};

const SERVICE_PHOTOS = [
  'Photos of the Services Completed',
];

export default function ServicePhotoTicket({ ticketId, onClose }: ServicePhotoTicketProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
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
        .from('service_photos')
        .select('*')
        .eq('ticket_id', ticketId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      const checkedPhotos = new Set(data?.checked_photos || []);
      const photoUrls = data?.photo_urls || {};

      setPhotos(SERVICE_PHOTOS.map((label, idx) => ({
        id: `service_${idx}`,
        label,
        isChecked: checkedPhotos.has(`service_${idx}`),
        photos: photoUrls[`service_${idx}`] || [],
      })));
    } catch (err) {
      console.error('Error loading photo status:', err);
      initializePhotos();
    } finally {
      setLoading(false);
    }
  };

  const initializePhotos = () => {
    setPhotos(SERVICE_PHOTOS.map((label, idx) => ({
      id: `service_${idx}`,
      label,
      isChecked: false,
      photos: [],
    })));
  };

  const saveToDatabase = async () => {
    try {
      const allCheckedPhotos = photos.filter(p => p.isChecked).map(p => p.id);

      const allPhotoUrls: { [key: string]: string[] } = {};
      photos.forEach(photo => {
        if (photo.photos.length > 0) {
          allPhotoUrls[photo.id] = photo.photos;
        }
      });

      const { error } = await supabase
        .from('service_photos')
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

  const handlePhotoUpload = async (photoId: string, file: File) => {
    try {
      setUploading(photoId);

      const fileExt = file.name.split('.').pop();
      const fileName = `${ticketId}/${photoId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('service-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('service-photos')
        .getPublicUrl(fileName);

      setPhotos(prev =>
        prev.map(p => p.id === photoId ? { ...p, photos: [...p.photos, publicUrl], isChecked: true } : p)
      );

      setTimeout(saveToDatabase, 100);
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    try {
      const fileName = photoUrl.split('/service-photos/')[1];
      if (fileName) {
        await supabase.storage.from('service-photos').remove([fileName]);
      }

      setPhotos(prev =>
        prev.map(p => p.id === photoId ? { ...p, photos: p.photos.filter(url => url !== photoUrl) } : p)
      );

      setTimeout(saveToDatabase, 100);
    } catch (err) {
      console.error('Error deleting photo:', err);
    }
  };

  const handleFileSelect = (photoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(photoId, file);
    }
  };

  const handleCheckboxChange = (photoId: string) => {
    setPhotos(prev =>
      prev.map(p => p.id === photoId ? { ...p, isChecked: !p.isChecked } : p)
    );
    setTimeout(saveToDatabase, 100);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Service Photo Ticket</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Photos</h3>
              <div className="space-y-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={photo.isChecked}
                        onChange={() => handleCheckboxChange(photo.id)}
                        className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <label className="font-medium text-gray-900">{photo.label}</label>
                        {photo.isChecked && (
                          <CheckCircle className="inline-block ml-2 w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRefs.current[photo.id]?.click()}
                        disabled={uploading === photo.id}
                        className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {uploading === photo.id ? (
                          'Uploading...'
                        ) : (
                          <>
                            <Camera className="w-4 h-4" />
                            Add Photo
                          </>
                        )}
                      </button>
                      <input
                        ref={el => fileInputRefs.current[photo.id] = el}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileSelect(photo.id, e)}
                        className="hidden"
                      />
                    </div>

                    {photo.photos.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                        {photo.photos.map((photoUrl, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={photoUrl}
                              alt={`${photo.label} ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => handleDeletePhoto(photo.id, photoUrl)}
                              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
